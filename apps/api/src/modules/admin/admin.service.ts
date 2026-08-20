import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { MERCHANT_PERMISSION_KEYS, sanitizeMerchantPermissions, serviceTypeConfigSchema } from '@sprintgo/shared';
import type {
  AdminUpdateStoreDto,
  CreateDriverDto,
  CreateStoreDto,
  CreateZoneDto,
  ErrandPricingDto,
  UpdateZoneDto,
} from '@sprintgo/shared';
import { PrismaService } from '../../core/prisma/prisma.service';
import { DomainException } from '../../common/errors/domain.exception';
import { assertProductLimit } from '../../common/product-limit';
import { hashPassword } from '../auth/password';
import type { UpsertProductDto } from '@sprintgo/shared';

function randomSlugSuffix(): string {
  // 6 url-safe chars — enough for a readable, collision-safe store slug
  return Math.abs(Date.now() ^ (Math.floor(performance.now() * 1000) || 1))
    .toString(36)
    .slice(-6);
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────── Stores ───────────────

  async createStore(actorId: string, dto: CreateStoreDto) {
    const serviceType = await this.prisma.serviceType.findUnique({ where: { slug: dto.serviceTypeSlug } });
    if (!serviceType) throw new DomainException('VALIDATION_ERROR', 'نوع المحل ده مش موجود');

    const isCatalog = dto.listingType === 'CATALOG';

    // zones only matter for catalog stores (they deliver); pickup points are just a place
    const zoneIds = dto.zones.map((z) => z.zoneId);
    if (zoneIds.length) {
      const zoneCount = await this.prisma.zone.count({ where: { id: { in: zoneIds }, isActive: true } });
      if (zoneCount !== zoneIds.length) throw new DomainException('VALIDATION_ERROR', 'فيه منطقة مش متاحة');
    }

    const slug = `${dto.serviceTypeSlug}-${randomSlugSuffix()}`;
    // catalog: use the granted keys, or default to full access when none picked. pickup point: none.
    const managerPermissions = isCatalog
      ? dto.managerPermissions?.length
        ? sanitizeMerchantPermissions(dto.managerPermissions)
        : [...MERCHANT_PERMISSION_KEYS]
      : [];

    try {
      return await this.prisma.$transaction(async (tx) => {
        // CATALOG stores get their own owner login; a PICKUP_POINT is platform-owned (the admin who added it)
        let ownerId = actorId;
        let ownerPhone: string | null = null;
        if (isCatalog && dto.owner) {
          const owner = await tx.user.upsert({
            where: { phone: dto.owner.phone },
            update: {
              name: dto.owner.name,
              passwordHash: hashPassword(dto.owner.password),
              roles: { set: [Role.CUSTOMER, Role.MERCHANT] },
            },
            create: {
              phone: dto.owner.phone,
              name: dto.owner.name,
              passwordHash: hashPassword(dto.owner.password),
              roles: [Role.CUSTOMER, Role.MERCHANT],
            },
          });
          ownerId = owner.id;
          ownerPhone = owner.phone;
        }

        const store = await tx.store.create({
          data: {
            name: dto.name,
            slug,
            serviceTypeId: serviceType.id,
            ownerId,
            listingType: dto.listingType,
            contactPhone: dto.contactPhone,
            addressText: dto.addressText,
            lat: dto.lat,
            lng: dto.lng,
            minOrderTotal: dto.minOrderTotal,
            prepTimeMins: dto.prepTimeMins,
            productLimit: isCatalog ? dto.productLimit ?? null : null,
            managerPermissions,
            status: 'ACTIVE',
            zones: {
              create: dto.zones.map((z) => ({ zoneId: z.zoneId, deliveryFee: z.deliveryFee, etaMins: z.etaMins })),
            },
          },
        });

        return { store, ownerPhone };
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new DomainException('VALIDATION_ERROR', 'فيه محل بنفس الاسم/الرابط — جرب اسم تاني');
      }
      throw err;
    }
  }

  async listStores(status?: string) {
    return this.prisma.store.findMany({
      where: { deletedAt: null, ...(status ? { status: status as never } : {}) },
      include: {
        serviceType: true,
        owner: { select: { name: true, phone: true } },
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStore(id: string) {
    const store = await this.prisma.store.findFirst({
      where: { id, deletedAt: null },
      include: {
        serviceType: true,
        owner: { select: { name: true, phone: true } },
        zones: { include: { zone: true } },
        workingHours: { orderBy: { dayOfWeek: 'asc' } },
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
    });
    if (!store) throw new DomainException('NOT_FOUND', 'المحل مش موجود');
    return store;
  }

  async updateStore(id: string, dto: AdminUpdateStoreDto) {
    await this.assertStore(id);
    const { managerPermissions, ...rest } = dto;
    const data: Prisma.StoreUpdateInput = { ...rest };
    if (managerPermissions) data.managerPermissions = sanitizeMerchantPermissions(managerPermissions);
    return this.prisma.store.update({ where: { id }, data });
  }

  async setStoreStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    await this.assertStore(id);
    return this.prisma.store.update({ where: { id }, data: { status } });
  }

  private async assertStore(id: string): Promise<void> {
    const store = await this.prisma.store.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!store) throw new DomainException('NOT_FOUND', 'المحل مش موجود');
  }

  // ─────────────── Drivers ───────────────

  async createDriver(dto: CreateDriverDto) {
    const driver = await this.prisma.user.upsert({
      where: { phone: dto.phone },
      update: { name: dto.name, roles: { set: [Role.CUSTOMER, Role.COURIER] } },
      create: { phone: dto.phone, name: dto.name, roles: [Role.CUSTOMER, Role.COURIER] },
    });
    await this.prisma.courierProfile.upsert({
      where: { userId: driver.id },
      update: {},
      create: { userId: driver.id, isAvailable: false },
    });
    return { id: driver.id, phone: driver.phone, name: driver.name };
  }

  /** Suspend / reactivate a courier (e.g. for not remitting). Suspending also forces them offline. */
  async setDriverStatus(id: string, status: 'ACTIVE' | 'BLOCKED') {
    const driver = await this.prisma.user.findFirst({
      where: { id, roles: { has: Role.COURIER } },
      select: { id: true },
    });
    if (!driver) throw new DomainException('NOT_FOUND', 'المندوب مش موجود');
    const user = await this.prisma.user.update({ where: { id }, data: { status } });
    if (status === 'BLOCKED') {
      await this.prisma.courierProfile.updateMany({ where: { userId: id }, data: { isAvailable: false } });
    }
    return { id: user.id, status: user.status };
  }

  // ─────────────── Errand pricing + commission (platform settings) ───────────────

  private async errandServiceTypeOrThrow() {
    const st = await this.prisma.serviceType.findFirst({
      where: { flowType: 'ERRAND', isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (!st) throw new DomainException('NOT_FOUND', 'خدمة المشوار مش متاحة');
    return st;
  }

  async getErrandPricing() {
    const st = await this.errandServiceTypeOrThrow();
    const cfg = serviceTypeConfigSchema.parse(st.config);
    const e = cfg.errand;
    return {
      baseFee: e?.baseFee ?? 0,
      perKmFee: e?.perKmFee ?? 0,
      minFee: e?.minFee ?? 0,
      commissionPercent: e?.commissionPercent ?? 0,
      remittanceLimit: e?.remittanceLimit ?? 0,
    };
  }

  async updateErrandPricing(dto: ErrandPricingDto) {
    const st = await this.errandServiceTypeOrThrow();
    const cfg = serviceTypeConfigSchema.parse(st.config);
    if (!cfg.errand) throw new DomainException('VALIDATION_ERROR', 'إعدادات المشوار ناقصة');
    const nextConfig = serviceTypeConfigSchema.parse({ ...cfg, errand: { ...cfg.errand, ...dto } });
    await this.prisma.serviceType.update({ where: { id: st.id }, data: { config: nextConfig as unknown as Prisma.InputJsonValue } });
    return this.getErrandPricing();
  }

  async listDrivers() {
    const drivers = await this.prisma.user.findMany({
      where: { roles: { has: Role.COURIER } },
      include: { courierProfile: true, _count: { select: { deliveries: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return drivers.map((d) => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      status: d.status,
      isAvailable: d.courierProfile?.isAvailable ?? false,
      totalDeliveries: d._count.deliveries,
    }));
  }

  // ─────────── Manage any store's products (drill-in) ───────────

  async listProducts(storeId: string) {
    await this.assertStore(storeId);
    return this.prisma.product.findMany({
      where: { storeId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createProduct(storeId: string, dto: UpsertProductDto) {
    await this.assertStore(storeId);
    await assertProductLimit(this.prisma, storeId);
    return this.prisma.product.create({ data: { storeId, ...dto } });
  }

  async updateProduct(storeId: string, productId: string, dto: UpsertProductDto) {
    await this.ownedProduct(storeId, productId);
    return this.prisma.product.update({ where: { id: productId }, data: dto });
  }

  async setProductAvailability(storeId: string, productId: string, isAvailable: boolean) {
    await this.ownedProduct(storeId, productId);
    return this.prisma.product.update({ where: { id: productId }, data: { isAvailable } });
  }

  async deleteProduct(storeId: string, productId: string) {
    await this.ownedProduct(storeId, productId);
    await this.prisma.product.update({ where: { id: productId }, data: { deletedAt: new Date() } });
  }

  private async ownedProduct(storeId: string, productId: string): Promise<void> {
    const p = await this.prisma.product.findFirst({
      where: { id: productId, storeId, deletedAt: null },
      select: { id: true },
    });
    if (!p) throw new DomainException('NOT_FOUND', 'الصنف مش موجود');
  }

  // ─────────────── Zones (delivery areas) ───────────────

  async listZones() {
    const zones = await this.prisma.zone.findMany({
      include: { _count: { select: { orders: true } } },
      orderBy: [{ isActive: 'desc' }, { nameAr: 'asc' }],
    });
    return zones.map((z) => ({
      id: z.id,
      city: z.city,
      nameAr: z.nameAr,
      nameEn: z.nameEn,
      lat: z.lat ? Number(z.lat) : null,
      lng: z.lng ? Number(z.lng) : null,
      isActive: z.isActive,
      ordersCount: z._count.orders,
    }));
  }

  async createZone(dto: CreateZoneDto) {
    try {
      return await this.prisma.zone.create({
        data: { city: dto.city, nameAr: dto.nameAr, nameEn: dto.nameEn ?? null, lat: dto.lat, lng: dto.lng },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new DomainException('VALIDATION_ERROR', 'فيه منطقة بنفس الاسم في نفس المحافظة');
      }
      throw err;
    }
  }

  async updateZone(id: string, dto: UpdateZoneDto) {
    await this.assertZone(id);
    return this.prisma.zone.update({ where: { id }, data: dto });
  }

  async setZoneActive(id: string, isActive: boolean) {
    await this.assertZone(id);
    return this.prisma.zone.update({ where: { id }, data: { isActive } });
  }

  private async assertZone(id: string): Promise<void> {
    const zone = await this.prisma.zone.findUnique({ where: { id }, select: { id: true } });
    if (!zone) throw new DomainException('NOT_FOUND', 'المنطقة مش موجودة');
  }
}
