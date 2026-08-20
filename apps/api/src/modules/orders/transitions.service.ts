import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { OrderStatus, Role } from '@sprintgo/shared';
import { canTransition, RT_EVENTS, rtRooms, statusLabel } from '@sprintgo/shared';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DomainException } from '../../common/errors/domain.exception';
import { ORDER_DETAIL_INCLUDE, toOrderView } from './order.mapper';
import type { OrderView } from '@sprintgo/shared';

export interface TransitionActorCtx {
  id: string;
  role: Role;
}

/** Which order timestamp column a given status stamps. */
const STAMP: Partial<Record<OrderStatus, string>> = {
  PREPARING: 'acceptedAt',
  READY: 'readyAt',
  OUT_FOR_DELIVERY: 'dispatchedAt',
  DELIVERED: 'deliveredAt',
  COMPLETED: 'completedAt',
  CANCELLED: 'cancelledAt',
};

/**
 * The one place order status changes. Validates against the shared transition
 * map (flow-aware), writes an OrderStatusEvent, stamps the timestamp, and
 * settles COD payment on delivery (ADR-011). Used by merchant, courier, admin.
 */
@Injectable()
export class TransitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
  ) {}

  async transition(
    orderId: string,
    to: OrderStatus,
    actor: TransitionActorCtx,
    opts: { note?: string; estimatedReadyMins?: number } = {},
  ): Promise<OrderView> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { serviceType: true },
    });
    if (!order) throw new DomainException('NOT_FOUND', 'الطلب مش موجود');

    const flow = order.serviceType.flowType;
    if (!canTransition(flow, order.status, to, actor.role)) {
      throw new DomainException(
        'ORDER_INVALID_TRANSITION',
        'مش ممكن تعمل الخطوة دي على الطلب دلوقتي',
        { from: order.status, to },
      );
    }

    const now = new Date();
    const data: Prisma.OrderUpdateInput = { status: to };
    const stampField = STAMP[to];
    if (stampField) (data as Record<string, unknown>)[stampField] = now;

    if (to === 'CANCELLED') {
      data.cancelReason = opts.note;
      data.cancelledByRole = actor.role;
    }
    if (to === 'PREPARING' && opts.estimatedReadyMins) {
      data.estimatedReadyAt = new Date(now.getTime() + opts.estimatedReadyMins * 60_000);
    }
    // COD settles to PAID on delivery (ADR-011)
    if (to === 'DELIVERED' && order.paymentMethod === 'COD') {
      data.paymentStatus = 'PAID';
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.orderStatusEvent.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: to,
          actorId: actor.id,
          actorRole: actor.role,
          note: opts.note,
        },
      });
      return tx.order.update({ where: { id: orderId }, data, include: ORDER_DETAIL_INCLUDE });
    });

    // push a read-only hint to the customer + anyone tracking this order
    const rooms = [rtRooms.user(order.customerId), rtRooms.order(orderId)];
    const at = new Date().toISOString();
    if (to === 'CANCELLED') {
      this.realtime.emitMany(rooms, RT_EVENTS.orderCancelled, {
        orderId,
        byRole: actor.role,
        reason: opts.note,
      });
    }
    this.realtime.emitMany(rooms, RT_EVENTS.orderStatus, { orderId, status: to, at });

    // a durable notification for the customer, worded in their language
    const label = statusLabel(flow, to);
    await this.notifications.create({
      userId: order.customerId,
      type: 'order.status',
      title: label,
      body: `طلبك ${updated.code}`,
      data: { orderId },
    });

    return toOrderView(updated);
  }
}
