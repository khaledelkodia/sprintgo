import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface StoreListFilter {
  serviceTypeSlug?: string;
  zoneId?: string;
  q?: string;
  skip: number;
  take: number;
}

/** All catalog Prisma access lives here (docs/architecture/10 §3). */
@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  serviceTypes() {
    return this.prisma.serviceType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  zones(city?: string) {
    return this.prisma.zone.findMany({
      where: { isActive: true, ...(city ? { city } : {}) },
      orderBy: { nameAr: 'asc' },
    });
  }

  /** Active pickup-point shops the customer can point an errand at ("هات من ..."). */
  errandSources() {
    return this.prisma.store.findMany({
      where: { status: 'ACTIVE', deletedAt: null, listingType: 'PICKUP_POINT' },
      include: { serviceType: true },
      orderBy: { name: 'asc' },
    });
  }

  async stores(filter: StoreListFilter) {
    const where = {
      status: 'ACTIVE' as const,
      deletedAt: null,
      listingType: 'CATALOG' as const, // only browsable stores show in the catalog list
      ...(filter.serviceTypeSlug ? { serviceType: { slug: filter.serviceTypeSlug } } : {}),
      ...(filter.zoneId ? { zones: { some: { zoneId: filter.zoneId } } } : {}),
      ...(filter.q ? { name: { contains: filter.q, mode: 'insensitive' as const } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.store.findMany({
        where,
        include: {
          serviceType: true,
          workingHours: true,
          zones: filter.zoneId ? { where: { zoneId: filter.zoneId } } : false,
        },
        orderBy: [{ isAcceptingOrders: 'desc' }, { ratingAvg: 'desc' }],
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.store.count({ where }),
    ]);

    return { rows, total };
  }

  storeBySlug(slug: string, zoneId?: string) {
    return this.prisma.store.findFirst({
      where: { slug, status: 'ACTIVE', deletedAt: null },
      include: {
        serviceType: true,
        workingHours: true,
        zones: zoneId ? { where: { zoneId } } : false,
        categories: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            products: {
              where: { deletedAt: null },
              orderBy: { sortOrder: 'asc' },
              include: {
                optionGroups: {
                  orderBy: { sortOrder: 'asc' },
                  include: { options: { orderBy: { sortOrder: 'asc' } } },
                },
              },
            },
          },
        },
      },
    });
  }
}
