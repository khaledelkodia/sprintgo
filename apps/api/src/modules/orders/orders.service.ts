import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Address, Zone } from '@prisma/client';
import type {
  AddressSnapshot,
  OrderView,
  PageMeta,
  PlaceOrderDto,
} from '@sprintgo/shared';
import { RT_EVENTS, rtRooms, serviceTypeConfigSchema } from '@sprintgo/shared';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DomainException } from '../../common/errors/domain.exception';
import { PricingService } from './pricing.service';
import type { PricedCart } from './pricing.service';
import { generateOrderCode } from './order-code';
import {
  ORDER_CARD_INCLUDE,
  ORDER_DETAIL_INCLUDE,
  toOrderCardView,
  toOrderView,
} from './order.mapper';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
  ) {}

  async place(userId: string, dto: PlaceOrderDto, idempotencyKey?: string): Promise<OrderView> {
    if (idempotencyKey) {
      const existing = await this.prisma.order.findUnique({
        where: { idempotencyKey },
        include: ORDER_DETAIL_INCLUDE,
      });
      if (existing) {
        if (existing.customerId !== userId) {
          throw new DomainException('IDEMPOTENCY_CONFLICT', 'في تعارض في الطلب — جرب تاني');
        }
        return toOrderView(existing); // safe replay of the original result
      }
    }

    const cart = await this.pricing.priceCart(dto.storeId, dto.items);

    if (cart.subtotal < cart.store.minOrderTotal) {
      throw new DomainException('MIN_ORDER_NOT_MET', 'الطلب أقل من الحد الأدنى للمحل', {
        minOrderTotal: cart.store.minOrderTotal,
        subtotal: cart.subtotal,
      });
    }

    const { deliveryFee, zoneId, snapshot } = await this.resolveFulfillment(userId, dto, cart);
    const total = cart.subtotal + deliveryFee - 0;

    // client total is a checksum, never an input (ADR-007)
    if (dto.clientTotal !== total) {
      throw new DomainException('PRICE_CHANGED', 'اتغيرت أسعار بعض الأصناف، راجع طلبك', {
        subtotal: cart.subtotal,
        deliveryFee,
        total,
      });
    }

    const platformCommission = await this.platformCommission(deliveryFee);
    try {
      const order = await this.createOrder(userId, dto, cart, {
        deliveryFee,
        platformCommission,
        zoneId,
        snapshot,
        total,
        idempotencyKey,
      });
      this.logger.log(`order ${order.code} placed by ${userId} (${total} piasters)`);

      // ping the store's board (+ its sound) that a new order landed
      this.realtime.emit(rtRooms.store(cart.store.id), RT_EVENTS.orderNew, {
        orderId: order.id,
        code: order.code,
        total: order.total,
        itemsCount: order.items.length,
        placedAt: order.placedAt.toISOString(),
      });
      await this.notifications.create({
        userId: cart.store.ownerId,
        type: 'order.new',
        title: 'طلب جديد',
        body: `وصلك طلب جديد ${order.code}`,
        data: { orderId: order.id },
      });
      return toOrderView(order);
    } catch (err) {
      // concurrent double-submit with the same key: the loser replays the winner
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && idempotencyKey) {
        const winner = await this.prisma.order.findUnique({
          where: { idempotencyKey },
          include: ORDER_DETAIL_INCLUDE,
        });
        if (winner) return toOrderView(winner);
      }
      throw err;
    }
  }

  private async resolveFulfillment(
    userId: string,
    dto: PlaceOrderDto,
    cart: PricedCart,
  ): Promise<{ deliveryFee: number; zoneId: string | null; snapshot: AddressSnapshot | null }> {
    if (dto.fulfillmentType === 'PICKUP') {
      return { deliveryFee: 0, zoneId: null, snapshot: null };
    }

    if (!dto.addressId) {
      throw new DomainException('VALIDATION_ERROR', 'اختار عنوان التوصيل');
    }
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, userId, deletedAt: null },
      include: { zone: true },
    });
    if (!address) throw new DomainException('NOT_FOUND', 'العنوان مش موجود');

    const storeZone = await this.prisma.storeZone.findUnique({
      where: { storeId_zoneId: { storeId: cart.store.id, zoneId: address.zoneId } },
    });
    if (!storeZone) {
      throw new DomainException('STORE_CLOSED', 'للأسف المحل ده مبيوصلش لمنطقتك');
    }

    return { deliveryFee: storeZone.deliveryFee, zoneId: address.zoneId, snapshot: snapshotOf(address) };
  }

  /** Platform's cut of a delivery fee — commission % lives on the errand service type config. */
  private async platformCommission(deliveryFee: number): Promise<number> {
    const st = await this.prisma.serviceType.findFirst({
      where: { flowType: 'ERRAND', isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    const cfg = st ? serviceTypeConfigSchema.parse(st.config) : null;
    return Math.round((deliveryFee * (cfg?.errand?.commissionPercent ?? 0)) / 100);
  }

  private async createOrder(
    userId: string,
    dto: PlaceOrderDto,
    cart: PricedCart,
    computed: {
      deliveryFee: number;
      platformCommission: number;
      zoneId: string | null;
      snapshot: AddressSnapshot | null;
      total: number;
      idempotencyKey?: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const code = await generateOrderCode(tx);

      return tx.order.create({
        data: {
          code,
          idempotencyKey: computed.idempotencyKey,
          customerId: userId,
          storeId: cart.store.id,
          serviceTypeId: cart.store.serviceTypeId,
          zoneId: computed.zoneId,
          fulfillmentType: dto.fulfillmentType,
          paymentMethod: dto.paymentMethod,
          customerNotes: dto.customerNotes,
          addressSnapshot: computed.snapshot === null ? Prisma.JsonNull : (computed.snapshot as object),
          subtotal: cart.subtotal,
          deliveryFee: computed.deliveryFee,
          platformCommission: computed.platformCommission,
          discount: 0,
          total: computed.total,
          estimatedReadyAt: new Date(Date.now() + cart.store.prepTimeMins * 60_000),
          items: {
            create: cart.items.map((i) => ({
              productId: i.productId,
              name: i.name,
              unitPrice: i.unitPrice,
              quantity: i.quantity,
              lineTotal: i.lineTotal,
              options: i.options as object[],
              notes: i.notes,
            })),
          },
          statusEvents: {
            create: { toStatus: 'PLACED', actorId: userId, actorRole: 'CUSTOMER' },
          },
        },
        include: ORDER_DETAIL_INCLUDE,
      });
    });
  }

  async list(userId: string, page: number, limit: number): Promise<{ data: unknown[]; meta: PageMeta }> {
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId: userId },
        include: ORDER_CARD_INCLUDE,
        orderBy: { placedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where: { customerId: userId } }),
    ]);
    return {
      data: rows.map(toOrderCardView),
      meta: { page, limit, total, hasNext: page * limit < total },
    };
  }

  async getOwned(userId: string, id: string): Promise<OrderView> {
    const order = await this.prisma.order.findFirst({
      where: { id, customerId: userId },
      include: ORDER_DETAIL_INCLUDE,
    });
    if (!order) throw new DomainException('NOT_FOUND', 'الطلب مش موجود');
    return toOrderView(order);
  }

  async cancelOwned(userId: string, id: string, reason?: string): Promise<OrderView> {
    const order = await this.prisma.order.findFirst({ where: { id, customerId: userId } });
    if (!order) throw new DomainException('NOT_FOUND', 'الطلب مش موجود');
    if (order.status !== 'PLACED') {
      throw new DomainException('ORDER_INVALID_TRANSITION', 'الطلب بدأ يتجهّز — مش هينفع يتلغي دلوقتي');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.orderStatusEvent.create({
        data: {
          orderId: id,
          fromStatus: 'PLACED',
          toStatus: 'CANCELLED',
          actorId: userId,
          actorRole: 'CUSTOMER',
          note: reason,
        },
      });
      return tx.order.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason, cancelledByRole: 'CUSTOMER' },
        include: ORDER_DETAIL_INCLUDE,
      });
    });
    return toOrderView(updated);
  }
}

function snapshotOf(address: Address & { zone: Zone }): AddressSnapshot {
  return {
    label: address.label,
    zoneName: address.zone.nameAr,
    street: address.street,
    building: address.building,
    floor: address.floor,
    apartment: address.apartment,
    landmark: address.landmark,
    contactPhone: address.contactPhone,
    // the saved pin travels with the order so the courier can open the map
    lat: address.lat == null ? null : Number(address.lat),
    lng: address.lng == null ? null : Number(address.lng),
  };
}
