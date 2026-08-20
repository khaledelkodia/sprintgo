import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import webpush from 'web-push';
import type { PushSubscriptionDto } from '@sprintgo/shared';
import { env } from '../../core/config/env';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Web Push (docs/architecture ROADMAP Phase 2). Delivers order events to a
 * device even when the app is closed. Disabled silently when no VAPID keys are
 * configured, so the rest of the app is unaffected.
 */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger('Push');
  private enabled = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
      this.enabled = true;
      this.logger.log('Web Push enabled');
    } else {
      this.logger.warn('Web Push disabled — set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY to enable');
    }
  }

  get publicKey(): string | null {
    return this.enabled ? (env.VAPID_PUBLIC_KEY ?? null) : null;
  }

  async subscribe(userId: string, sub: PushSubscriptionDto): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
  }

  async unsubscribe(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  /** Fire-and-forget push to all of a user's devices; prunes dead endpoints (404/410). */
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!this.enabled) return;
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(payload),
          );
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await this.prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
          } else {
            this.logger.warn(`push to ${userId} failed (${status ?? 'err'})`);
          }
        }
      }),
    );
  }
}
