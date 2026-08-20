import type {
  MenuCategory,
  OptionGroup,
  Product,
  ProductOption,
  ServiceType,
  Store,
  StoreZone,
  WorkingHour,
  Zone,
} from '@prisma/client';
import { serviceTypeConfigSchema } from '@sprintgo/shared';
import type {
  ErrandSourceView,
  MenuCategoryView,
  OptionGroupView,
  ProductView,
  ServiceTypeView,
  StoreCardView,
  StoreDetailView,
  ZoneView,
} from '@sprintgo/shared';
import { isOpenNow } from './store-hours';

type StoreWithRels = Store & {
  serviceType: ServiceType;
  workingHours: WorkingHour[];
  zones?: StoreZone[] | false;
};

type StoreDetailRels = StoreWithRels & {
  categories: (MenuCategory & {
    products: (Product & { optionGroups: (OptionGroup & { options: ProductOption[] })[] })[];
  })[];
};

export function toServiceTypeView(st: ServiceType): ServiceTypeView {
  return {
    id: st.id,
    slug: st.slug,
    nameAr: st.nameAr,
    nameEn: st.nameEn,
    icon: st.icon,
    flowType: st.flowType,
    config: serviceTypeConfigSchema.parse(st.config),
    sortOrder: st.sortOrder,
  };
}

export function toZoneView(z: Zone): ZoneView {
  return { id: z.id, city: z.city, nameAr: z.nameAr, nameEn: z.nameEn };
}

function deliveryOf(store: StoreWithRels): StoreCardView['delivery'] {
  const zones = store.zones;
  if (!zones || zones.length === 0) return null;
  const sz = zones[0]!;
  return { fee: sz.deliveryFee, etaMins: sz.etaMins };
}

export function toErrandSourceView(store: Store & { serviceType: ServiceType }): ErrandSourceView {
  return {
    id: store.id,
    name: store.name,
    listingType: store.listingType,
    addressText: store.addressText,
    logoUrl: store.logoUrl,
    serviceType: { slug: store.serviceType.slug, nameAr: store.serviceType.nameAr },
  };
}

export function toStoreCardView(store: StoreWithRels): StoreCardView {
  return {
    id: store.id,
    slug: store.slug,
    name: store.name,
    listingType: store.listingType,
    logoUrl: store.logoUrl,
    coverUrl: store.coverUrl,
    ratingAvg: Number(store.ratingAvg),
    ratingCount: store.ratingCount,
    minOrderTotal: store.minOrderTotal,
    prepTimeMins: store.prepTimeMins,
    isAcceptingOrders: store.isAcceptingOrders,
    isOpenNow: isOpenNow(store.workingHours),
    serviceType: { slug: store.serviceType.slug, nameAr: store.serviceType.nameAr },
    delivery: deliveryOf(store),
  };
}

function toOptionGroupView(g: OptionGroup & { options: ProductOption[] }): OptionGroupView {
  return {
    id: g.id,
    name: g.name,
    minSelect: g.minSelect,
    maxSelect: g.maxSelect,
    options: g.options.map((o) => ({
      id: o.id,
      name: o.name,
      priceDelta: o.priceDelta,
      isAvailable: o.isAvailable,
    })),
  };
}

function toProductView(
  p: Product & { optionGroups: (OptionGroup & { options: ProductOption[] })[] },
): ProductView {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    price: p.price,
    isAvailable: p.isAvailable,
    optionGroups: p.optionGroups.map(toOptionGroupView),
  };
}

export function toStoreDetailView(store: StoreDetailRels): StoreDetailView {
  const categories: MenuCategoryView[] = store.categories.map((c) => ({
    id: c.id,
    name: c.name,
    products: c.products.map(toProductView),
  }));

  return {
    ...toStoreCardView(store),
    description: store.description,
    contactPhone: store.contactPhone,
    addressText: store.addressText,
    categories,
  };
}
