import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { distanceKm, RT_EVENTS, rtRooms, serviceTypeConfigSchema, travelEtaMins } from '@sprintgo/shared';
import type {
  AddressSnapshot,
  CourierDailyReportRow,
  CourierListItemView,
  CourierProfileView,
  CourierSuggestionView,
  CourierSummaryView,
  CourierTaskView,
  CourierWalletView,
  DispatchItemView,
  DriverSettlementRow,
  OrderView,
  VehicleType,
} from '@sprintgo/shared';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DomainException } from '../../common/errors/domain.exception';
import { TransitionsService } from '../orders/transitions.service';

const TASK_INCLUDE = {
  order: { include: { store: true, serviceType: true, errandDetail: { include: { pickupZone: true } } } },
} satisfies Prisma.DeliveryAssignmentInclude;

type TaskRow = Prisma.DeliveryAssignmentGetPayload<{ include: typeof TASK_INCLUDE }>;

const OFFER_TTL_SEC = 30; // how long a courier has to accept before it cascades

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);
  /** In-memory offer expiry timers (ephemeral by design; lost on restart). */
  private readonly offerTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly transitions: TransitionsService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Notify the assigned courier (+ store/order rooms) that a task landed. */
  private async announceAssignment(orderId: string, courierId: string): Promise<void> {
    const [courier, order] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: courierId }, select: { name: true } }),
      this.prisma.order.findUnique({ where: { id: orderId }, select: { storeId: true, customerId: true, code: true } }),
    ]);
    const rooms = [rtRooms.courier(courierId), rtRooms.order(orderId)];
    // the customer's own room too — "a courier is coming" should reach them whether
    // or not they happen to have the tracking screen open
    if (order?.customerId) rooms.push(rtRooms.user(order.customerId));
    if (order?.storeId) rooms.push(rtRooms.store(order.storeId));
    this.realtime.emitMany(rooms, RT_EVENTS.orderAssigned, {
      orderId,
      courierName: courier?.name ?? 'مندوب',
    });

    // durable notifications for the courier and the customer
    await this.notifications.create({
      userId: courierId,
      type: 'delivery.assigned',
      title: 'مهمة توصيل جديدة',
      body: `اتعيّنلك طلب ${order?.code ?? ''}`.trim(),
      data: { orderId },
    });
    if (order?.customerId) {
      await this.notifications.create({
        userId: order.customerId,
        type: 'order.courier_assigned',
        title: 'تم تعيين مندوب',
        body: `مندوبك ${courier?.name ?? ''} جاي لك`.trim(),
        data: { orderId },
      });
    }
  }

  // ─────────────── Dispatch (admin) ───────────────

  /** Orders that still need a courier: errands PLACED, catalog PREPARING/READY, no active assignment. */
  async dispatchQueue(): Promise<DispatchItemView[]> {
    const rows = await this.prisma.order.findMany({
      where: {
        status: { in: ['PLACED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] },
        fulfillmentType: 'DELIVERY',
      },
      include: {
        store: true,
        serviceType: true,
        zone: true,
        assignments: {
          where: { status: { in: ['OFFERED', 'ASSIGNED', 'PICKED_UP'] } },
          include: { courier: true },
        },
      },
      orderBy: { placedAt: 'asc' },
    });

    // errands are dispatchable from PLACED; catalog orders once the merchant accepts
    return rows
      .filter((o) => o.serviceType.flowType === 'ERRAND' || o.status !== 'PLACED')
      .map((o) => {
        const active = o.assignments[0];
        return {
          orderId: o.id,
          code: o.code,
          status: o.status,
          flowType: o.serviceType.flowType,
          storeName: o.store?.name ?? null,
          zoneName: o.zone?.nameAr ?? null,
          total: o.total,
          placedAt: o.placedAt.toISOString(),
          courier: active
            ? { id: active.courierId, name: active.courier.name, assignmentStatus: active.status }
            : null,
        };
      });
  }

  async listCouriers(availableOnly = false): Promise<CourierListItemView[]> {
    const couriers = await this.prisma.user.findMany({
      where: { roles: { has: 'COURIER' }, status: 'ACTIVE' },
      include: {
        courierProfile: true,
        deliveries: { where: { status: { in: ['ASSIGNED', 'PICKED_UP'] } }, select: { id: true } },
      },
    });
    return couriers
      .filter((c) => !availableOnly || c.courierProfile?.isAvailable)
      .map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        isAvailable: c.courierProfile?.isAvailable ?? false,
        vehicleType: c.courierProfile?.vehicleType ?? 'MOTORCYCLE',
        activeTasks: c.deliveries.length,
      }));

  }
  /**
   * What dispatch needs to know about an order: where the pickup is (store →
   * errand pin → pickup zone → dropoff zone) and which vehicle it requires.
   */
  private async dispatchContextFor(
    orderId: string,
  ): Promise<{ pickup: { lat: number; lng: number } | null; vehicleType: VehicleType | null }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: true, zone: true, errandDetail: { include: { pickupZone: true } } },
    });
    if (!order) return { pickup: null, vehicleType: null };
    const pick = (lat: Prisma.Decimal | null, lng: Prisma.Decimal | null) =>
      lat != null && lng != null ? { lat: Number(lat), lng: Number(lng) } : null;
    const pickup =
      pick(order.store?.lat ?? null, order.store?.lng ?? null) ??
      pick(order.errandDetail?.pickupLat ?? null, order.errandDetail?.pickupLng ?? null) ??
      pick(order.errandDetail?.pickupZone?.lat ?? null, order.errandDetail?.pickupZone?.lng ?? null) ??
      pick(order.zone?.lat ?? null, order.zone?.lng ?? null);
    return { pickup, vehicleType: order.vehicleType };
  }

  /**
   * Available couriers ranked by distance to the order's pickup (nearest first).
   * A نقل order (vehicleType set) only ever reaches couriers driving that exact
   * vehicle — a موتوسيكل can't carry a شقة, and the fare was priced for the truck.
   */
  async suggestCouriers(orderId: string): Promise<CourierSuggestionView[]> {
    const { pickup, vehicleType } = await this.dispatchContextFor(orderId);
    const couriers = await this.prisma.user.findMany({
      where: {
        roles: { has: 'COURIER' },
        status: 'ACTIVE',
        courierProfile: { isAvailable: true, ...(vehicleType ? { vehicleType } : {}) },
      },
      include: {
        courierProfile: true,
        deliveries: { where: { status: { in: ['ASSIGNED', 'PICKED_UP'] } }, select: { id: true } },
      },
    });

    const list: CourierSuggestionView[] = couriers.map((c) => {
      const p = c.courierProfile;
      let dist: number | null = null;
      let eta: number | null = null;
      if (pickup && p?.lat != null && p?.lng != null) {
        dist = Math.round(distanceKm(pickup.lat, pickup.lng, Number(p.lat), Number(p.lng)) * 10) / 10;
        eta = travelEtaMins(dist);
      }
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        activeTasks: c.deliveries.length,
        distanceKm: dist,
        etaMins: eta,
        vehicleType: p?.vehicleType ?? 'MOTORCYCLE',
      };
    });

    // located couriers first (nearest, then lightest load); un-located couriers last
    list.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return a.activeTasks - b.activeTasks;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm || a.activeTasks - b.activeTasks;
    });
    return list;
  }

  /** One-tap dispatch: assign the closest available courier. */
  async assignNearest(dispatcherId: string, orderId: string): Promise<{ courierId: string; courierName: string | null }> {
    const [best] = await this.suggestCouriers(orderId);
    if (!best) throw new DomainException('VALIDATION_ERROR', 'مفيش مندوب متاح دلوقتي');
    await this.assign(dispatcherId, orderId, best.id);
    return { courierId: best.id, courierName: best.name };
  }

  // ─────────────── Auto-offer (courier accepts/rejects) ───────────────

  /**
   * Offer the order to the nearest courier who hasn't already declined it.
   * On no-response within OFFER_TTL it expires and cascades to the next courier.
   * Manual dispatch stays available as a fallback if everyone declines.
   * Fire-and-forget: never throws into the caller's order flow.
   */
  async offerToNearest(orderId: string): Promise<void> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { store: true, serviceType: true, zone: true, errandDetail: true },
      });
      if (!order || ['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(order.status)) return;

      // an active/offered assignment already exists → nothing to do
      const active = await this.prisma.deliveryAssignment.findFirst({
        where: { orderId, status: { in: ['OFFERED', 'ASSIGNED', 'PICKED_UP'] } },
        select: { id: true },
      });
      if (active) return;

      // only a deliberate REJECT excludes a courier — an EXPIRED offer (they were away/slow)
      // gets another chance, so a single online courier never leaves the order stuck.
      const declined = await this.prisma.deliveryAssignment.findMany({
        where: { orderId, status: 'REJECTED' },
        select: { courierId: true },
      });
      const skip = new Set(declined.map((d) => d.courierId));
      const ranked = (await this.suggestCouriers(orderId)).filter((c) => !skip.has(c.id));
      const best = ranked[0];
      if (!best) {
        this.logger.log(`order ${order.code}: no courier to offer (falls back to manual dispatch)`);
        return;
      }

      const offeredAt = new Date();
      const expiresAt = new Date(offeredAt.getTime() + OFFER_TTL_SEC * 1000);
      let assignment;
      try {
        assignment = await this.prisma.deliveryAssignment.create({
          data: { orderId, courierId: best.id, status: 'OFFERED', offeredAt, expiresAt },
        });
      } catch (err) {
        // lost the race to another offer (partial unique index) — leave it be
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return;
        throw err;
      }

      const view = this.buildOfferView(order, best.distanceKm, best.etaMins, expiresAt);
      this.realtime.emit(rtRooms.courier(best.id), RT_EVENTS.orderOffer, view);
      await this.notifications.create({
        userId: best.id,
        type: 'delivery.offer',
        title: 'طلب توصيل جديد ليك',
        body: `عندك طلب ${order.code} — اقبله في ${OFFER_TTL_SEC} ثانية`,
        data: { orderId },
      });

      // in-memory expiry: re-offer to the next courier if unanswered
      const timer = setTimeout(() => void this.expireOffer(assignment.id, orderId), OFFER_TTL_SEC * 1000);
      this.offerTimers.set(assignment.id, timer);
    } catch (err) {
      this.logger.warn(`offerToNearest(${orderId}) failed: ${String(err)}`);
    }
  }

  private buildOfferView(
    order: Prisma.OrderGetPayload<{ include: { store: true; serviceType: true; zone: true; errandDetail: true } }>,
    distanceKm: number | null,
    etaMins: number | null,
    expiresAt: Date,
  ) {
    const isErrand = order.serviceType.flowType === 'ERRAND';
    const cash = isErrand ? (order.errandDetail?.codToCollect ?? 0) : order.paymentMethod === 'COD' ? order.total : 0;
    return {
      orderId: order.id,
      code: order.code,
      flowType: order.serviceType.flowType,
      storeName: order.store?.name ?? null,
      pickupText: order.store?.addressText ?? order.errandDetail?.pickupText ?? null,
      dropoffZone: order.zone?.nameAr ?? null,
      instructions: order.errandDetail?.instructions ?? null,
      deliveryFee: order.deliveryFee,
      cashToCollect: cash,
      distanceKm,
      etaMins,
      expiresAt: expiresAt.toISOString(),
      vehicleType: order.vehicleType,
    };
  }

  private clearTimer(assignmentId: string): void {
    const t = this.offerTimers.get(assignmentId);
    if (t) {
      clearTimeout(t);
      this.offerTimers.delete(assignmentId);
    }
  }

  async acceptOffer(courierId: string, orderId: string): Promise<void> {
    await this.assertCanWork(courierId); // blocked couriers can't take new work
    const offer = await this.prisma.deliveryAssignment.findFirst({
      where: { orderId, courierId, status: 'OFFERED' },
    });
    if (!offer) throw new DomainException('ORDER_INVALID_TRANSITION', 'العرض ده مبقاش متاح');
    this.clearTimer(offer.id);
    await this.prisma.deliveryAssignment.update({
      where: { id: offer.id },
      data: { status: 'ASSIGNED', respondedAt: new Date(), assignedAt: new Date() },
    });
    await this.announceAssignment(orderId, courierId);
  }

  async rejectOffer(courierId: string, orderId: string): Promise<void> {
    const offer = await this.prisma.deliveryAssignment.findFirst({
      where: { orderId, courierId, status: 'OFFERED' },
    });
    if (!offer) return; // already gone
    this.clearTimer(offer.id);
    await this.prisma.deliveryAssignment.update({
      where: { id: offer.id },
      data: { status: 'REJECTED', respondedAt: new Date() },
    });
    await this.offerToNearest(orderId); // cascade to the next courier
  }

  private async expireOffer(assignmentId: string, orderId: string): Promise<void> {
    this.offerTimers.delete(assignmentId);
    const offer = await this.prisma.deliveryAssignment.findFirst({
      where: { id: assignmentId, status: 'OFFERED' },
    });
    if (!offer) return; // already accepted/rejected
    await this.prisma.deliveryAssignment.update({
      where: { id: assignmentId },
      data: { status: 'EXPIRED', respondedAt: new Date() },
    });
    this.realtime.emit(rtRooms.courier(offer.courierId), RT_EVENTS.orderOfferRevoked, { orderId });
    await this.offerToNearest(orderId);
  }

  /** The courier's currently pending offer (so the app can render it after a reload). */
  async currentOffer(courierId: string): Promise<unknown | null> {
    const offer = await this.prisma.deliveryAssignment.findFirst({
      where: { courierId, status: 'OFFERED', expiresAt: { gt: new Date() } },
      orderBy: { offeredAt: 'desc' },
    });
    if (!offer) return null;
    const order = await this.prisma.order.findUnique({
      where: { id: offer.orderId },
      include: { store: true, serviceType: true, zone: true, errandDetail: true },
    });
    if (!order) return null;
    return this.buildOfferView(order, null, null, offer.expiresAt!);
  }

  async assign(dispatcherId: string, orderId: string, courierId: string): Promise<void> {
    await this.assertCourier(courierId);
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { id: true, status: true } });
    if (!order) throw new DomainException('NOT_FOUND', 'الطلب مش موجود');
    if (['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(order.status)) {
      throw new DomainException('ORDER_INVALID_TRANSITION', 'الطلب خلص خلاص');
    }

    // a manual assignment overrides any pending auto-offer
    await this.cancelPendingOffers(orderId);

    try {
      await this.prisma.deliveryAssignment.create({
        data: { orderId, courierId, assignedById: dispatcherId, status: 'ASSIGNED' },
      });
    } catch (err) {
      // the partial unique index guarantees at most one active courier per order
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new DomainException('ORDER_INVALID_TRANSITION', 'الطلب متعيّن لمندوب بالفعل — اعمل إعادة تعيين');
      }
      throw err;
    }
    await this.announceAssignment(orderId, courierId);
  }

  /** Cancel any live offer for an order (clears its timer) — used before manual assign. */
  private async cancelPendingOffers(orderId: string): Promise<void> {
    const offers = await this.prisma.deliveryAssignment.findMany({
      where: { orderId, status: 'OFFERED' },
      select: { id: true },
    });
    for (const o of offers) this.clearTimer(o.id);
    if (offers.length) {
      await this.prisma.deliveryAssignment.updateMany({
        where: { orderId, status: 'OFFERED' },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'تعيين يدوي' },
      });
    }
  }

  async reassign(dispatcherId: string, orderId: string, courierId: string, reason?: string): Promise<void> {
    await this.assertCourier(courierId);
    await this.cancelPendingOffers(orderId);
    await this.prisma.$transaction(async (tx) => {
      await tx.deliveryAssignment.updateMany({
        where: { orderId, status: { in: ['ASSIGNED', 'PICKED_UP'] } },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason ?? 'إعادة تعيين' },
      });
      await tx.deliveryAssignment.create({
        data: { orderId, courierId, assignedById: dispatcherId, status: 'ASSIGNED' },
      });
    });
    await this.announceAssignment(orderId, courierId);
  }

  private async assertCourier(courierId: string): Promise<void> {
    const courier = await this.prisma.user.findFirst({
      where: { id: courierId, roles: { has: 'COURIER' }, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!courier) throw new DomainException('VALIDATION_ERROR', 'المندوب ده مش متاح');
  }

  // ─────────────── Courier app ───────────────

  /** The courier's own registration row — what they drive and whether they are online. */
  async courierProfile(courierId: string): Promise<CourierProfileView> {
    const user = await this.prisma.user.findUnique({
      where: { id: courierId },
      select: { name: true, phone: true, courierProfile: true },
    });
    if (!user) throw new DomainException('NOT_FOUND', 'المندوب مش موجود');
    return {
      name: user.name,
      phone: user.phone,
      vehicleType: user.courierProfile?.vehicleType ?? 'MOTORCYCLE',
      isAvailable: user.courierProfile?.isAvailable ?? false,
    };
  }

  async setAvailability(courierId: string, isAvailable: boolean): Promise<{ isAvailable: boolean }> {
    if (isAvailable) await this.assertCanWork(courierId); // can't go online while blocked / owing dues
    await this.prisma.courierProfile.upsert({
      where: { userId: courierId },
      update: { isAvailable, lastSeenAt: new Date() },
      create: { userId: courierId, isAvailable },
    });
    // a courier coming online picks up orders that were waiting because nobody was available
    if (isAvailable) void this.reofferPending();
    return { isAvailable };
  }

  /**
   * (Re)offer any dispatchable order that currently has no live courier — e.g. it was
   * placed while everyone was offline, so the one-shot offer at creation found nobody.
   * Fire-and-forget; safe to call whenever a courier becomes available.
   */
  private async reofferPending(): Promise<void> {
    try {
      const orders = await this.prisma.order.findMany({
        where: {
          fulfillmentType: 'DELIVERY',
          status: { in: ['PLACED', 'PREPARING', 'READY'] },
          assignments: {
            none: {
              OR: [
                { status: { in: ['ASSIGNED', 'PICKED_UP'] } },
                { status: 'OFFERED', expiresAt: { gt: new Date() } },
              ],
            },
          },
        },
        include: { serviceType: true },
        orderBy: { placedAt: 'asc' },
        take: 20,
      });
      for (const o of orders) {
        // errands dispatch from PLACED; catalog orders once the merchant marks them ready
        if (o.serviceType.flowType === 'ERRAND' || o.status !== 'PLACED') {
          await this.offerToNearest(o.id);
        }
      }
    } catch (err) {
      this.logger.warn(`reofferPending failed: ${String(err)}`);
    }
  }

  /** Location heartbeat while available — feeds nearest-courier suggestions. */
  async heartbeat(courierId: string, lat: number, lng: number): Promise<void> {
    const now = new Date();
    await this.prisma.courierProfile.upsert({
      where: { userId: courierId },
      update: { lat, lng, lastLocationAt: now, lastSeenAt: now },
      create: { userId: courierId, lat, lng, lastLocationAt: now, lastSeenAt: now, isAvailable: true },
    });
  }

  async tasks(courierId: string): Promise<CourierTaskView[]> {
    const rows = await this.prisma.deliveryAssignment.findMany({
      where: { courierId, status: { in: ['ASSIGNED', 'PICKED_UP'] } },
      include: TASK_INCLUDE,
      orderBy: { assignedAt: 'asc' },
    });
    return rows.map((r) => this.toTaskView(r));
  }

  private toTaskView(r: TaskRow): CourierTaskView {
    const o = r.order;
    const snap = o.addressSnapshot as AddressSnapshot | null;
    const isErrand = o.serviceType.flowType === 'ERRAND';
    const cashToCollect = isErrand ? (o.errandDetail?.codToCollect ?? 0) : o.paymentMethod === 'COD' ? o.total : 0;

    return {
      orderId: o.id,
      code: o.code,
      status: o.status,
      assignmentStatus: r.status as 'ASSIGNED' | 'PICKED_UP',
      flowType: o.serviceType.flowType,
      pickup: o.store
        ? {
            name: o.store.name,
            phone: o.store.contactPhone,
            text: o.store.addressText,
            lat: o.store.lat == null ? null : Number(o.store.lat),
            lng: o.store.lng == null ? null : Number(o.store.lng),
          }
        : o.errandDetail
          ? {
              name: 'نقطة الاستلام',
              phone: '',
              text: o.errandDetail.pickupText,
              lat: o.errandDetail.pickupLat == null ? null : Number(o.errandDetail.pickupLat),
              lng: o.errandDetail.pickupLng == null ? null : Number(o.errandDetail.pickupLng),
            }
          : null,
      dropoff: snap
        ? {
            name: o.errandDetail?.recipientName ?? snap.label ?? 'المستلم',
            phone: o.errandDetail?.recipientPhone ?? snap.contactPhone ?? null,
            zoneName: snap.zoneName ?? '',
            street: snap.street ?? '',
            landmark: snap.landmark ?? null,
            lat: snap.lat ?? null,
            lng: snap.lng ?? null,
          }
        : null,
      cashToCollect,
      purchaseBudget: o.errandDetail?.purchaseBudget ?? null,
      instructions: o.errandDetail?.instructions ?? o.customerNotes,
      assignedAt: r.assignedAt.toISOString(),
      vehicleType: o.vehicleType,
    };
  }

  private async activeAssignmentOrThrow(courierId: string, orderId: string) {
    const assignment = await this.prisma.deliveryAssignment.findFirst({
      where: { orderId, courierId, status: { in: ['ASSIGNED', 'PICKED_UP'] } },
    });
    if (!assignment) throw new DomainException('FORBIDDEN', 'الطلب ده مش متعيّن ليك');
    return assignment;
  }

  async pickup(courierId: string, orderId: string): Promise<OrderView> {
    const assignment = await this.activeAssignmentOrThrow(courierId, orderId);
    await this.prisma.deliveryAssignment.update({
      where: { id: assignment.id },
      data: { status: 'PICKED_UP', pickedUpAt: new Date() },
    });
    return this.transitions.transition(orderId, 'OUT_FOR_DELIVERY', { id: courierId, role: 'COURIER' });
  }

  async delivered(courierId: string, orderId: string, cashCollected?: number): Promise<OrderView> {
    const assignment = await this.activeAssignmentOrThrow(courierId, orderId);
    await this.prisma.deliveryAssignment.update({
      where: { id: assignment.id },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });
    const note = cashCollected != null ? `حصّل ${cashCollected / 100} ج` : undefined;
    return this.transitions.transition(orderId, 'DELIVERED', { id: courierId, role: 'COURIER' }, { note });
  }

  /** Purchase errands: courier records what the goods actually cost (ADR-011). */
  async enterGoodsCost(courierId: string, orderId: string, actualGoodsCost: number): Promise<void> {
    await this.activeAssignmentOrThrow(courierId, orderId);
    const errand = await this.prisma.errandDetail.findUnique({ where: { orderId } });
    if (!errand) throw new DomainException('VALIDATION_ERROR', 'الطلب ده مش مشوار شراء');
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { deliveryFee: true } });
    const fee = errand.feePaidBy === 'RECIPIENT' ? (order?.deliveryFee ?? 0) : 0;
    await this.prisma.errandDetail.update({
      where: { orderId },
      data: { actualGoodsCost, codToCollect: actualGoodsCost + fee },
    });
    // mirror the real amount onto the order so the customer/admin see goods + delivery, not just the fee.
    // subtotal = what the courier paid for the goods; total = goods + delivery fee (collected at handover).
    await this.prisma.order.update({
      where: { id: orderId },
      data: { subtotal: actualGoodsCost, total: actualGoodsCost + (order?.deliveryFee ?? 0) },
    });
  }

  /** Kept for older consumers — delegates to the wallet so the numbers match everywhere. */
  async summaryToday(courierId: string): Promise<CourierSummaryView> {
    const w = await this.wallet(courierId);
    // feesToRemit is now the platform commission owed (remittance-aware), NOT the whole fee
    return { deliveries: w.deliveriesToday, cashInHand: w.cashInHand, feesToRemit: w.balanceDue };
  }

  // ─────────────── Wallet & settlement ───────────────

  /** Platform-wide settlement knobs live on the errand service type's config. */
  private async settlementConfig(): Promise<{ commissionPercent: number; remittanceLimit: number }> {
    const st = await this.prisma.serviceType.findFirst({
      where: { flowType: 'ERRAND', isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    const cfg = st ? serviceTypeConfigSchema.parse(st.config) : null;
    return {
      commissionPercent: cfg?.errand?.commissionPercent ?? 0,
      remittanceLimit: cfg?.errand?.remittanceLimit ?? 0,
    };
  }

  /**
   * What the courier must hand back to the platform for one delivered COD order:
   * cash they collected − goods they fronted − their own earnings (fee − commission).
   * Errand → equals the commission; catalog → equals goods + commission; prepaid → 0.
   */
  private orderRemitDue(o: {
    serviceType: { flowType: string };
    paymentMethod: string;
    deliveryFee: number;
    platformCommission: number;
    total: number;
    errandDetail: { codToCollect: number; actualGoodsCost: number | null } | null;
  }): { remitDue: number; earning: number; cashHeld: number } {
    const earning = o.deliveryFee - o.platformCommission;
    if (o.paymentMethod !== 'COD') return { remitDue: 0, earning, cashHeld: 0 };
    const isErrand = o.serviceType.flowType === 'ERRAND';
    const cashCollected = isErrand ? o.errandDetail?.codToCollect ?? 0 : o.total;
    const goodsFronted = isErrand ? o.errandDetail?.actualGoodsCost ?? 0 : 0;
    return { remitDue: cashCollected - goodsFronted - earning, earning, cashHeld: cashCollected - goodsFronted };
  }

  async wallet(courierId: string): Promise<CourierWalletView> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [delivered, agg, remittedTodayAgg, cfg, user] = await Promise.all([
      this.prisma.deliveryAssignment.findMany({
        where: { courierId, status: 'DELIVERED' },
        include: { order: { include: { errandDetail: true, serviceType: true } } },
      }),
      this.prisma.courierRemittance.aggregate({ where: { courierId }, _sum: { amount: true } }),
      this.prisma.courierRemittance.aggregate({ where: { courierId, createdAt: { gte: start } }, _sum: { amount: true } }),
      this.settlementConfig(),
      this.prisma.user.findUnique({ where: { id: courierId }, select: { status: true } }),
    ]);

    let balanceDue = 0;
    let cashHeld = 0;
    let deliveriesToday = 0;
    let earningsToday = 0;
    let duesToday = 0;
    for (const a of delivered) {
      const { remitDue, earning, cashHeld: held } = this.orderRemitDue(a.order);
      balanceDue += remitDue;
      cashHeld += held;
      if (a.deliveredAt && a.deliveredAt >= start) {
        deliveriesToday++;
        earningsToday += earning;
        duesToday += remitDue;
      }
    }
    const remitted = agg._sum.amount ?? 0;
    balanceDue -= remitted;
    cashHeld -= remitted;
    // today's dues net of what was already handed in today → resets to 0 each new day
    const dueToday = Math.max(0, duesToday - (remittedTodayAgg._sum.amount ?? 0));

    const suspended = user?.status === 'BLOCKED';
    const overLimit = cfg.remittanceLimit > 0 && balanceDue >= cfg.remittanceLimit;
    return {
      deliveriesToday,
      earningsToday,
      cashInHand: Math.max(0, cashHeld),
      dueToday,
      balanceDue: Math.max(0, balanceDue),
      remittanceLimit: cfg.remittanceLimit,
      isBlocked: suspended || overLimit,
      blockReason: suspended
        ? 'الإدارة أوقفت حسابك مؤقتًا — كلّمها من فضلك.'
        : overLimit
          ? 'وصلت للحد المسموح من فلوس الإدارة — ورّدها الأول عشان تكمّل شغل.'
          : null,
    };
  }

  /** Report window: a specific month (YYYY-MM) or, by default, the last 7 days. */
  reportRange(month?: string): { from: Date; to: Date } {
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number) as [number, number];
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) };
    }
    const to = new Date();
    to.setHours(24, 0, 0, 0); // start of tomorrow (include all of today)
    const from = new Date();
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  }

  /** Per-day breakdown of a courier's work for the daily report (week view / month filter). */
  async courierReport(courierId: string, month?: string): Promise<CourierDailyReportRow[]> {
    const { from, to } = this.reportRange(month);
    const [delivered, remittances] = await Promise.all([
      this.prisma.deliveryAssignment.findMany({
        where: { courierId, status: 'DELIVERED', deliveredAt: { gte: from, lt: to } },
        include: { order: { include: { errandDetail: true, serviceType: true } } },
      }),
      this.prisma.courierRemittance.findMany({
        where: { courierId, createdAt: { gte: from, lt: to } },
        select: { amount: true, createdAt: true },
      }),
    ]);

    const days = new Map<string, { deliveries: number; earnings: number; dues: number; remitted: number }>();
    const dayOf = (d: Date) => {
      // local calendar day (YYYY-MM-DD)
      const y = d.getFullYear();
      const m = `${d.getMonth() + 1}`.padStart(2, '0');
      const day = `${d.getDate()}`.padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const bucket = (key: string) => {
      let b = days.get(key);
      if (!b) days.set(key, (b = { deliveries: 0, earnings: 0, dues: 0, remitted: 0 }));
      return b;
    };

    for (const a of delivered) {
      if (!a.deliveredAt) continue;
      const { remitDue, earning } = this.orderRemitDue(a.order);
      const b = bucket(dayOf(a.deliveredAt));
      b.deliveries++;
      b.earnings += earning;
      b.dues += remitDue;
    }
    for (const r of remittances) bucket(dayOf(r.createdAt)).remitted += r.amount;

    return [...days.entries()]
      .map(([date, b]) => ({ date, ...b }))
      .sort((x, y) => (x.date < y.date ? 1 : -1)); // newest first
  }

  /** Throws when the courier can't take work (owes over the limit, or admin-suspended). */
  private async assertCanWork(courierId: string): Promise<void> {
    const w = await this.wallet(courierId);
    if (w.isBlocked) throw new DomainException('FORBIDDEN', w.blockReason ?? 'حسابك موقوف دلوقتي');
  }

  /** Admin settlement view: every courier with their standing balance + remittance history. */
  async driverSettlements(): Promise<DriverSettlementRow[]> {
    const couriers = await this.prisma.user.findMany({
      where: { roles: { has: 'COURIER' } },
      include: { courierProfile: true },
      orderBy: { createdAt: 'desc' },
    });

    const rows: DriverSettlementRow[] = [];
    for (const c of couriers) {
      const [delivered, agg] = await Promise.all([
        this.prisma.deliveryAssignment.findMany({
          where: { courierId: c.id, status: 'DELIVERED' },
          include: { order: { include: { errandDetail: true, serviceType: true } } },
        }),
        this.prisma.courierRemittance.aggregate({
          where: { courierId: c.id },
          _sum: { amount: true },
          _max: { createdAt: true },
        }),
      ]);
      let balanceDue = 0;
      let earnings = 0;
      for (const a of delivered) {
        const { remitDue, earning } = this.orderRemitDue(a.order);
        balanceDue += remitDue;
        earnings += earning;
      }
      const totalRemitted = agg._sum.amount ?? 0;
      rows.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        status: c.status,
        isAvailable: c.courierProfile?.isAvailable ?? false,
        vehicleType: c.courierProfile?.vehicleType ?? 'MOTORCYCLE',
        deliveries: delivered.length,
        earnings,
        balanceDue: Math.max(0, balanceDue - totalRemitted),
        totalRemitted,
        lastRemittanceAt: agg._max.createdAt ? agg._max.createdAt.toISOString() : null,
      });
    }
    return rows;
  }

  /** Admin logs a cash hand-in from a courier (settles their balance). */
  async recordRemittance(courierId: string, amount: number, recordedById: string, note?: string): Promise<void> {
    const courier = await this.prisma.user.findFirst({
      where: { id: courierId, roles: { has: 'COURIER' } },
      select: { id: true },
    });
    if (!courier) throw new DomainException('NOT_FOUND', 'المندوب ده مش موجود');
    await this.prisma.courierRemittance.create({ data: { courierId, amount, recordedById, note } });
  }
}
