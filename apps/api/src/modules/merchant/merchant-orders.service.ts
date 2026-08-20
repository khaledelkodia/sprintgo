import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { statusLabel } from '@sprintgo/shared';
import type {
  AcceptOrderDto,
  MerchantOrderView,
  MerchantStatsView,
  OrderStatus,
  OrderView,
} from '@sprintgo/shared';
import { PrismaService } from '../../core/prisma/prisma.service';
import { DomainException } from '../../common/errors/domain.exception';
import { TransitionsService } from '../orders/transitions.service';
import { DeliveryService } from '../delivery/delivery.service';
import { resolveOwnedStore } from './merchant.helpers';

const BOARD_INCLUDE = {
  items: true,
  customer: true,
  serviceType: true,
  assignments: { where: { status: { in: ['ASSIGNED', 'PICKED_UP'] } as never } },
} satisfies Prisma.OrderInclude;

type BoardOrder = Prisma.OrderGetPayload<{ include: typeof BOARD_INCLUDE }>;

function toMerchantOrderView(o: BoardOrder): MerchantOrderView {
  return {
    id: o.id,
    code: o.code,
    status: o.status,
    statusLabel: statusLabel(o.serviceType.flowType, o.status),
    fulfillmentType: o.fulfillmentType,
    paymentMethod: o.paymentMethod,
    customerName: o.customer.name,
    customerPhone: o.customer.phone,
    addressSnapshot: (o.addressSnapshot as MerchantOrderView['addressSnapshot']) ?? null,
    customerNotes: o.customerNotes,
    items: o.items.map((i) => ({
      id: i.id,
      name: i.name,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
      options: (i.options as unknown as MerchantOrderView['items'][number]['options']) ?? [],
      notes: i.notes,
    })),
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
    placedAt: o.placedAt.toISOString(),
    estimatedReadyAt: o.estimatedReadyAt?.toISOString() ?? null,
    hasCourier: o.assignments.length > 0,
  };
}

@Injectable()
export class MerchantOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transitions: TransitionsService,
    private readonly delivery: DeliveryService,
  ) {}

  async board(ownerId: string, status?: OrderStatus): Promise<MerchantOrderView[]> {
    const store = await resolveOwnedStore(this.prisma, ownerId);
    const rows = await this.prisma.order.findMany({
      where: {
        storeId: store.id,
        status: status ?? { in: ['PLACED', 'PREPARING', 'READY'] },
      },
      include: BOARD_INCLUDE,
      orderBy: { placedAt: 'asc' },
    });
    return rows.map(toMerchantOrderView);
  }

  /** Ensure the order belongs to the merchant's store before any transition. */
  private async assertOwnership(ownerId: string, orderId: string): Promise<void> {
    const store = await resolveOwnedStore(this.prisma, ownerId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId: store.id },
      select: { id: true },
    });
    if (!order) throw new DomainException('NOT_FOUND', 'الطلب مش موجود');
  }

  async accept(ownerId: string, orderId: string, dto: AcceptOrderDto): Promise<OrderView> {
    await this.assertOwnership(ownerId, orderId);
    return this.transitions.transition(orderId, 'PREPARING', { id: ownerId, role: 'MERCHANT' }, dto);
  }

  async reject(ownerId: string, orderId: string, reason: string): Promise<OrderView> {
    await this.assertOwnership(ownerId, orderId);
    return this.transitions.transition(orderId, 'CANCELLED', { id: ownerId, role: 'MERCHANT' }, { note: reason });
  }

  async ready(ownerId: string, orderId: string): Promise<OrderView> {
    await this.assertOwnership(ownerId, orderId);
    const view = await this.transitions.transition(orderId, 'READY', { id: ownerId, role: 'MERCHANT' });
    // the order is now dispatchable → auto-offer to the nearest courier (fire-and-forget)
    void this.delivery.offerToNearest(orderId);
    return view;
  }

  /** Pickup orders ONLY: the merchant hands the order to the customer directly.
   *  Delivery orders are completed by the courier, never the merchant. */
  async handover(ownerId: string, orderId: string): Promise<OrderView> {
    const store = await resolveOwnedStore(this.prisma, ownerId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId: store.id },
      select: { id: true, fulfillmentType: true },
    });
    if (!order) throw new DomainException('NOT_FOUND', 'الطلب مش موجود');
    if (order.fulfillmentType !== 'PICKUP') {
      throw new DomainException('ORDER_INVALID_TRANSITION', 'ده طلب توصيل — المندوب هو اللي بيسلّمه');
    }
    return this.transitions.transition(orderId, 'COMPLETED', { id: ownerId, role: 'MERCHANT' });
  }

  async statsToday(ownerId: string): Promise<MerchantStatsView> {
    const store = await resolveOwnedStore(this.prisma, ownerId);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: { storeId: store.id, placedAt: { gte: start }, status: { not: 'CANCELLED' } },
      select: { total: true, acceptedAt: true, readyAt: true },
    });

    const revenue = orders.reduce((sum, o) => sum + o.total, 0);
    const prepPairs = orders.filter((o) => o.acceptedAt && o.readyAt);
    const avgPrepMins = prepPairs.length
      ? Math.round(
          prepPairs.reduce((s, o) => s + (o.readyAt!.getTime() - o.acceptedAt!.getTime()) / 60_000, 0) /
            prepPairs.length,
        )
      : 0;

    return { ordersCount: orders.length, revenue, avgPrepMins };
  }
}
