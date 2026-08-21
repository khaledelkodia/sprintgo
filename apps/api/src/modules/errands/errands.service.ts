import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ServiceType } from '@prisma/client';
import { distanceKm, RT_EVENTS, rtRooms, serviceTypeConfigSchema, vehicleMeta } from '@sprintgo/shared';
import type {
  AddressSnapshot,
  CreateDeliveryRequestDto,
  CreateErrandDto,
  ErrandQuoteDto,
  ErrandQuoteView,
  OrderView,
  VehicleType,
} from '@sprintgo/shared';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { DeliveryService } from '../delivery/delivery.service';
import { DomainException } from '../../common/errors/domain.exception';
import { ORDER_DETAIL_INCLUDE, toOrderView } from '../orders/order.mapper';
import { generateOrderCode } from '../orders/order-code';
import { resolveOwnedStore } from '../merchant/merchant.helpers';

interface ErrandOrderInput {
  customerId: string;
  storeId: string | null;
  serviceTypeId: string;
  zoneId: string;
  deliveryFee: number;
  platformCommission: number;
  total: number;
  addressSnapshot: AddressSnapshot;
  vehicleType: VehicleType | null;
  errand: Prisma.ErrandDetailCreateWithoutOrderInput;
}

interface Point {
  lat: number | Prisma.Decimal | null;
  lng: number | Prisma.Decimal | null;
}
const num = (v: number | Prisma.Decimal | null | undefined): number | null =>
  v == null ? null : typeof v === 'number' ? v : Number(v);

/**
 * How much of the normal fee this vehicle costs, in percent. Falls back to the
 * catalog default when the admin has not priced it yet (100 = motorcycle).
 */
const vehicleMultiplier = (
  table: Partial<Record<VehicleType, number>> | undefined,
  v: VehicleType | null | undefined,
): number => {
  const type = v ?? 'MOTORCYCLE';
  return table?.[type] ?? vehicleMeta(type).defaultMultiplier;
};

@Injectable()
export class ErrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly delivery: DeliveryService,
  ) {}

  private async errandServiceType(): Promise<ServiceType> {
    const st = await this.prisma.serviceType.findFirst({
      where: { flowType: 'ERRAND', isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (!st) throw new DomainException('NOT_FOUND', 'خدمة المشوار مش متاحة دلوقتي');
    return st;
  }

  /**
   * Fair distance-based errand fee. With a known pickup (a chosen shop) the
   * distance is shop→customer; without one, it's the customer's zone-centroid→
   * customer (a proxy for the local buy-and-deliver leg). Falls back to the
   * per-zone/base fee when no coordinates are available.
   */
  private priceErrand(
    st: ServiceType,
    zoneId: string,
    opts: {
      pickup?: Point | null;
      dropoff?: Point | null;
      zoneCentroid?: Point | null;
      vehicleType?: VehicleType | null;
    },
  ): { fee: number; distanceKm: number | null } {
    const cfg = serviceTypeConfigSchema.parse(st.config);
    const e = cfg.errand;
    const base = e?.baseFee ?? 3000;
    const perKm = e?.perKmFee ?? 0;
    const minFee = e?.minFee ?? 0;

    const drop = opts.dropoff;
    const dLat = num(drop?.lat ?? null);
    const dLng = num(drop?.lng ?? null);
    let dist: number | null = null;
    if (dLat != null && dLng != null) {
      const from = opts.pickup && num(opts.pickup.lat) != null ? opts.pickup : opts.zoneCentroid;
      const fLat = num(from?.lat ?? null);
      const fLng = num(from?.lng ?? null);
      if (fLat != null && fLng != null) dist = distanceKm(fLat, fLng, dLat, dLng);
    }

    const raw = dist != null ? base + Math.round(perKm * dist) : e?.zoneFees?.[zoneId] ?? base;
    // نقل: a bigger vehicle is a percentage of the normal fee — one formula, four price points
    const mult = vehicleMultiplier(e?.vehicleMultipliers, opts.vehicleType);
    const scale = (v: number) => Math.round((v * mult) / 100);
    return { fee: Math.max(scale(raw), scale(minFee)), distanceKm: dist };
  }

  /** The platform's cut of a delivery fee (piastres). */
  private commissionFor(st: ServiceType, deliveryFee: number): number {
    const cfg = serviceTypeConfigSchema.parse(st.config);
    return Math.round((deliveryFee * (cfg.errand?.commissionPercent ?? 0)) / 100);
  }

  /** Live price preview for the customer before they confirm. */
  async quote(dto: ErrandQuoteDto): Promise<ErrandQuoteView> {
    const st = await this.errandServiceType();
    const zone = await this.prisma.zone.findFirst({ where: { id: dto.zoneId, isActive: true } });
    if (!zone) throw new DomainException('VALIDATION_ERROR', 'المنطقة دي مش متاحة');
    let pickup: Point | null = null;
    if (dto.sourceStoreId) {
      pickup = await this.prisma.store.findFirst({
        where: { id: dto.sourceStoreId, status: 'ACTIVE', deletedAt: null },
        select: { lat: true, lng: true },
      });
    }
    // an explicit pickup pin wins over the shop lookup — it is the customer's own truth
    if (dto.pickupLat != null && dto.pickupLng != null) pickup = { lat: dto.pickupLat, lng: dto.pickupLng };
    const { fee, distanceKm: d } = this.priceErrand(st, dto.zoneId, {
      pickup,
      dropoff: { lat: dto.lat ?? null, lng: dto.lng ?? null },
      zoneCentroid: zone,
      vehicleType: dto.vehicleType ?? null,
    });
    return { deliveryFee: fee, distanceKm: d };
  }

  /** Customer errand (مشوار): fetch/deliver anything (ADR-010). */
  async createCustomerErrand(userId: string, dto: CreateErrandDto): Promise<OrderView> {
    const st = await this.errandServiceType();
    const cfg = serviceTypeConfigSchema.parse(st.config);

    let zoneId: string;
    let snapshot: AddressSnapshot;
    let recipientName: string | null = null;
    let recipientPhone: string | null = null;
    let zoneCentroid: Point | null = null;
    let dropLat: number | null = dto.dropoff.lat ?? null;
    let dropLng: number | null = dto.dropoff.lng ?? null;

    if (dto.dropoff.addressId) {
      const addr = await this.prisma.address.findFirst({
        where: { id: dto.dropoff.addressId, userId, deletedAt: null },
        include: { zone: true },
      });
      if (!addr) throw new DomainException('NOT_FOUND', 'العنوان مش موجود');
      zoneId = addr.zoneId;
      zoneCentroid = addr.zone;
      if (dropLat == null) {
        dropLat = num(addr.lat);
        dropLng = num(addr.lng);
      }
      snapshot = {
        label: addr.label,
        zoneName: addr.zone.nameAr,
        street: addr.street,
        building: addr.building,
        floor: addr.floor,
        apartment: addr.apartment,
        landmark: addr.landmark,
        contactPhone: addr.contactPhone,
        lat: dropLat,
        lng: dropLng,
      };
    } else {
      zoneId = dto.dropoff.zoneId!;
      const zone = await this.prisma.zone.findFirst({ where: { id: zoneId, isActive: true } });
      if (!zone) throw new DomainException('VALIDATION_ERROR', 'المنطقة دي مش متاحة');
      zoneCentroid = zone;
      recipientName = dto.dropoff.recipientName ?? null;
      recipientPhone = dto.dropoff.recipientPhone ?? null;
      snapshot = {
        label: recipientName ?? 'التوصيل',
        zoneName: zone.nameAr,
        street: dto.dropoff.street ?? '',
        building: dto.dropoff.building ?? null,
        floor: null,
        apartment: null,
        landmark: dto.dropoff.landmark ?? null,
        contactPhone: recipientPhone,
        lat: dropLat,
        lng: dropLng,
      };
    }

    if (dto.purchaseBudget && dto.purchaseBudget > (cfg.errand?.maxPurchaseBudget ?? 200_000)) {
      throw new DomainException('VALIDATION_ERROR', 'الميزانية أكبر من المسموح بيه');
    }

    // optional named source shop ("هات موز من محل كذا") → sets the pickup location
    let sourceStoreId: string | null = null;
    let pickupText = dto.pickupText;
    let pickup: Point | null = null;
    let pickupLat: number | null = dto.pickupLat ?? null;
    let pickupLng: number | null = dto.pickupLng ?? null;
    if (dto.sourceStoreId) {
      const store = await this.prisma.store.findFirst({
        where: { id: dto.sourceStoreId, status: 'ACTIVE', deletedAt: null },
        select: { id: true, name: true, lat: true, lng: true },
      });
      if (!store) throw new DomainException('VALIDATION_ERROR', 'المحل ده مش متاح دلوقتي');
      sourceStoreId = store.id;
      pickup = store;
      pickupText = pickupText ?? store.name; // show the shop as the pickup point
      if (pickupLat == null && store.lat != null && store.lng != null) {
        pickupLat = num(store.lat);
        pickupLng = num(store.lng);
      }
    }
    // a shared pickup pin prices the real leg (pin → customer), not the zone centroid
    if (pickup == null && pickupLat != null && pickupLng != null) pickup = { lat: pickupLat, lng: pickupLng };

    const { fee } = this.priceErrand(st, zoneId, {
      pickup,
      dropoff: { lat: dropLat, lng: dropLng },
      zoneCentroid,
      vehicleType: dto.vehicleType ?? null,
    });
    const commission = this.commissionFor(st, fee);
    return this.createErrandOrder({
      customerId: userId,
      storeId: sourceStoreId,
      serviceTypeId: st.id,
      zoneId,
      deliveryFee: fee,
      platformCommission: commission,
      total: fee,
      vehicleType: dto.vehicleType ?? null,
      addressSnapshot: snapshot,
      errand: {
        instructions: dto.instructions,
        pickupText,
        pickupZone: dto.pickupZoneId ? { connect: { id: dto.pickupZoneId } } : undefined,
        recipientName,
        recipientPhone,
        purchaseBudget: dto.purchaseBudget,
        pickupLat,
        pickupLng,
        codToCollect: fee, // goods cost added later when the courier enters it
        feePaidBy: 'RECIPIENT',
      },
    });
  }

  /** Merchant "request a courier" for the store's own phone orders. */
  async createDeliveryRequest(ownerId: string, dto: CreateDeliveryRequestDto): Promise<OrderView> {
    const store = await resolveOwnedStore(this.prisma, ownerId);
    const st = await this.errandServiceType();
    const zone = await this.prisma.zone.findFirst({ where: { id: dto.zoneId, isActive: true } });
    if (!zone) throw new DomainException('VALIDATION_ERROR', 'المنطقة دي مش متاحة');

    // no customer GPS here → price the store→zone leg
    const { fee } = this.priceErrand(st, dto.zoneId, { pickup: store, dropoff: zone, zoneCentroid: zone });
    const commission = this.commissionFor(st, fee);
    return this.createErrandOrder({
      customerId: ownerId, // the merchant user is the requester
      storeId: store.id, // pickup is the store
      serviceTypeId: st.id,
      zoneId: dto.zoneId,
      deliveryFee: fee,
      platformCommission: commission,
      total: dto.codToCollect + fee,
      vehicleType: null, // a store delivery request is always a normal مشوار
      addressSnapshot: {
        label: dto.recipientName,
        zoneName: zone.nameAr,
        street: dto.street,
        building: null,
        floor: null,
        apartment: null,
        landmark: dto.landmark ?? null,
        contactPhone: dto.recipientPhone,
        lat: null,
        lng: null,
      },
      errand: {
        instructions: dto.instructions ?? 'توصيل طلب المحل',
        recipientName: dto.recipientName,
        recipientPhone: dto.recipientPhone,
        codToCollect: dto.codToCollect + fee, // recipient pays goods + delivery
        feePaidBy: 'RECIPIENT',
      },
    });
  }

  private async createErrandOrder(input: ErrandOrderInput): Promise<OrderView> {
    const order = await this.prisma.$transaction(async (tx) => {
      const code = await generateOrderCode(tx);
      return tx.order.create({
        data: {
          code,
          customerId: input.customerId,
          storeId: input.storeId,
          serviceTypeId: input.serviceTypeId,
          vehicleType: input.vehicleType,
          zoneId: input.zoneId,
          fulfillmentType: 'DELIVERY',
          paymentMethod: 'COD',
          addressSnapshot: input.addressSnapshot as unknown as Prisma.InputJsonValue,
          subtotal: 0,
          deliveryFee: input.deliveryFee,
          platformCommission: input.platformCommission,
          total: input.total,
          errandDetail: { create: input.errand },
          statusEvents: { create: { toStatus: 'PLACED', actorId: input.customerId, actorRole: 'CUSTOMER' } },
        },
        include: ORDER_DETAIL_INCLUDE,
      });
    });

    // errands go straight to the dispatch queue; a merchant request also pings the store
    this.realtime.emit(rtRooms.admin, RT_EVENTS.orderNew, {
      orderId: order.id,
      code: order.code,
      total: order.total,
      itemsCount: 0,
      placedAt: order.placedAt.toISOString(),
    });
    if (input.storeId) {
      this.realtime.emit(rtRooms.store(input.storeId), RT_EVENTS.orderNew, {
        orderId: order.id,
        code: order.code,
        total: order.total,
        itemsCount: 0,
        placedAt: order.placedAt.toISOString(),
      });
    }
    // errands are immediately dispatchable → auto-offer to the nearest courier
    void this.delivery.offerToNearest(order.id);
    return toOrderView(order);
  }
}
