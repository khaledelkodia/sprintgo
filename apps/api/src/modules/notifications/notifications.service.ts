import { Injectable } from '@nestjs/common';
import type { Notification } from '@prisma/client';
import { RT_EVENTS, rtRooms } from '@sprintgo/shared';
import type { NotificationView, PageMeta } from '@sprintgo/shared';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { PushService } from '../push/push.service';
import { DomainException } from '../../common/errors/domain.exception';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

function toView(n: Notification): NotificationView {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    data: (n.data as Record<string, unknown> | null) ?? null,
    read: n.readAt !== null,
    createdAt: n.createdAt.toISOString(),
  };
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly push: PushService,
  ) {}

  /** Persist a notification, push a live socket hint, and fire a web push. */
  async create(input: CreateNotificationInput): Promise<void> {
    const n = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: (input.data ?? undefined) as never,
      },
    });
    this.realtime.emit(rtRooms.user(input.userId), RT_EVENTS.notificationNew, toView(n));
    // web push reaches the device even when the app is closed (best-effort)
    void this.push.sendToUser(input.userId, { title: n.title, body: n.body, data: { ...input.data, type: n.type } });
  }

  async list(userId: string, page: number, limit: number): Promise<{ data: NotificationView[]; meta: PageMeta }> {
    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return {
      data: rows.map(toView),
      meta: { page, limit, total, hasNext: page * limit < total },
    };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, id: string): Promise<void> {
    const n = await this.prisma.notification.findFirst({ where: { id, userId }, select: { id: true } });
    if (!n) throw new DomainException('NOT_FOUND', 'الإشعار مش موجود');
    await this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
