import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import webpush from 'web-push';
import type { DevicePlatform, RegisterDeviceDto } from '@sprintgo/shared';
import type { PushSubscriptionDto } from '@sprintgo/shared';
import { env } from '../../core/config/env';
import { PrismaService } from '../../core/prisma/prisma.service';
import { FcmService } from './fcm.service';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Push to every device a user has: browsers via Web Push (VAPID), the Android
 * apps via FCM. Each transport is independently optional — a deployment with
 * neither configured still runs, it just delivers nothing.
 */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger('Push');
  private enabled = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcm: FcmService,
  ) {}

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

  /**
   * Remember a phone's FCM token. Keyed by the token itself, so re-installing or
   * signing in as someone else moves the device to the new owner instead of
   * leaving the old user receiving someone else's notifications.
   */
  async registerDevice(userId: string, dto: RegisterDeviceDto): Promise<void> {
    await this.prisma.deviceToken.upsert({
      where: { token: dto.token },
      update: { userId, platform: dto.platform as DevicePlatform, lastUsedAt: new Date() },
      create: { userId, token: dto.token, platform: dto.platform as DevicePlatform, lastUsedAt: new Date() },
    });
  }

  /** Called on logout — the phone should stop getting the previous user's alerts. */
  async unregisterDevice(token: string): Promise<void> {
    await this.prisma.deviceToken.deleteMany({ where: { token } });
  }

  /** Fire-and-forget push to every device a user has (browsers + phones). */
  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    await Promise.all([this.sendWebPush(userId, payload), this.sendFcm(userId, payload)]);
  }

  /** Phones, via FCM. Tokens FCM reports as dead are pruned so they stop costing calls. */
  private async sendFcm(userId: string, payload: PushPayload): Promise<void> {
    if (!this.fcm.enabled) return;
    const devices = await this.prisma.deviceToken.findMany({
      where: { userId, platform: { in: ['ANDROID', 'IOS'] } },
      select: { token: true },
    });
    if (devices.length === 0) return;

    const results = await this.fcm.send(
      devices.map((d) => d.token),
      { title: payload.title, body: payload.body, data: payload.data },
    );
    const dead = results.filter((r) => r.gone).map((r) => r.token);
    if (dead.length) {
      await this.prisma.deviceToken.deleteMany({ where: { token: { in: dead } } }).catch(() => undefined);
      this.logger.log(`pruned ${dead.length} dead device token(s)`);
    }
  }

  /** Browsers, via Web Push; prunes dead endpoints (404/410). */
  private async sendWebPush(userId: string, payload: PushPayload): Promise<void> {
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
