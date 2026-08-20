import 'dotenv/config';
import { FlowType, PrismaClient, Role } from '@prisma/client';
import { MERCHANT_PERMISSION_KEYS, serviceTypeConfigSchema } from '@sprintgo/shared';
import { hashPassword } from '../src/modules/auth/password';

const prisma = new PrismaClient();

async function seedZones() {
  // Damietta market. lat/lng are the zone centroids — pickup fallback for errands.
  // The super admin can add more zones from the dashboard (/admin/zones).
  const zones = [
    { city: 'دمياط', nameAr: 'دمياط', nameEn: 'Damietta', lat: 31.4165, lng: 31.8133 },
    { city: 'دمياط', nameAr: 'دمياط الجديدة', nameEn: 'New Damietta', lat: 31.4441, lng: 31.6558 },
    { city: 'دمياط', nameAr: 'رأس البر', nameEn: 'Ras El Bar', lat: 31.4972, lng: 31.8419 },
  ];
  const rows = [];
  for (const z of zones) {
    rows.push(
      await prisma.zone.upsert({
        where: { city_nameAr: { city: z.city, nameAr: z.nameAr } },
        update: { nameEn: z.nameEn, lat: z.lat, lng: z.lng, isActive: true },
        create: z,
      }),
    );
  }
  // hide any legacy zones (old Cairo seed) so the customer only sees Damietta
  await prisma.zone.updateMany({
    where: { nameAr: { notIn: zones.map((z) => z.nameAr) } },
    data: { isActive: false },
  });
  return rows;
}

async function seedServiceTypes() {
  const defs = [
    {
      slug: 'restaurants',
      nameAr: 'مطاعم',
      nameEn: 'Restaurants',
      icon: 'utensils',
      flowType: FlowType.DELIVERY,
      sortOrder: 1,
      config: {
        ordering: { fulfillment: ['DELIVERY', 'PICKUP'] },
        catalog: { hasOptionGroups: true, layout: 'list' },
        ui: { icon: 'utensils' },
      },
    },
    {
      slug: 'supermarket',
      nameAr: 'سوبر ماركت',
      nameEn: 'Supermarket',
      icon: 'cart',
      flowType: FlowType.DELIVERY,
      sortOrder: 2,
      config: {
        catalog: { hasOptionGroups: false, layout: 'grid' },
        ui: { icon: 'cart' },
      },
    },
    {
      slug: 'pharmacy',
      nameAr: 'صيدليات',
      nameEn: 'Pharmacies',
      icon: 'pill',
      flowType: FlowType.DELIVERY,
      sortOrder: 3,
      config: {
        ordering: { requiresAttachment: { enabled: true, labelAr: 'صورة الروشتة (لو فيه)' } },
        catalog: { hasOptionGroups: false, layout: 'list' },
        ui: { icon: 'pill' },
      },
    },
    {
      slug: 'produce',
      nameAr: 'خضار وفاكهة',
      nameEn: 'Fruits & Vegetables',
      icon: 'leaf',
      flowType: FlowType.DELIVERY,
      sortOrder: 4,
      config: {
        catalog: { hasOptionGroups: false, layout: 'grid' },
        ui: { icon: 'leaf' },
      },
    },
    {
      slug: 'errands',
      nameAr: 'مشوار',
      nameEn: 'Errands',
      icon: 'bike',
      flowType: FlowType.ERRAND,
      sortOrder: 5,
      config: {
        errand: {
          baseFee: 1000, // 10ج رسوم أساسية
          perKmFee: 500, // 5ج لكل كيلومتر
          minFee: 1500, // الحد الأدنى 15ج
          commissionPercent: 15, // الإدارة تاخد 15% من رسوم التوصيل
          remittanceLimit: 20000, // يتقفل المندوب لو المطلوب توريده وصل 200ج
          maxPurchaseBudget: 200_000,
        },
        ui: { icon: 'bike' },
      },
    },
  ];

  const rows = [];
  for (const st of defs) {
    // an invalid vertical config must never enter the system
    serviceTypeConfigSchema.parse(st.config);
    rows.push(
      await prisma.serviceType.upsert({
        where: { slug: st.slug },
        update: { nameAr: st.nameAr, nameEn: st.nameEn, icon: st.icon, config: st.config, sortOrder: st.sortOrder },
        create: st,
      }),
    );
  }
  return rows;
}

async function seedUsers() {
  // Super admin can sign in with OTP (01000000001) OR password via /staff-login.
  const adminPassword = hashPassword('admin1234');
  const admin = await prisma.user.upsert({
    where: { phone: '+201000000001' },
    update: { roles: [Role.CUSTOMER, Role.ADMIN, Role.SUPER_ADMIN], passwordHash: adminPassword },
    create: {
      phone: '+201000000001',
      name: 'إدارة سبرنت جو',
      roles: [Role.CUSTOMER, Role.ADMIN, Role.SUPER_ADMIN],
      passwordHash: adminPassword,
    },
  });

  // merchant signs into the store dashboard with phone + password (via /staff-login)
  const merchantPassword = hashPassword('merchant123');
  const merchant = await prisma.user.upsert({
    where: { phone: '+201000000002' },
    update: { roles: [Role.CUSTOMER, Role.MERCHANT], passwordHash: merchantPassword },
    create: { phone: '+201000000002', name: 'عم حسن', roles: [Role.CUSTOMER, Role.MERCHANT], passwordHash: merchantPassword },
  });

  const courier = await prisma.user.upsert({
    where: { phone: '+201000000003' },
    update: { roles: [Role.CUSTOMER, Role.COURIER] },
    create: { phone: '+201000000003', name: 'أحمد المندوب', roles: [Role.CUSTOMER, Role.COURIER] },
  });
  // starting near Maadi so nearest-courier suggestions have data out of the box
  await prisma.courierProfile.upsert({
    where: { userId: courier.id },
    update: { isAvailable: true, lat: 29.9585, lng: 31.2605, lastLocationAt: new Date() },
    create: { userId: courier.id, isAvailable: true, lat: 29.9585, lng: 31.2605, lastLocationAt: new Date() },
  });

  // a second courier far away (Nasr City) so nearest-courier ranking is demonstrable
  const courier2 = await prisma.user.upsert({
    where: { phone: '+201000000004' },
    update: { roles: [Role.CUSTOMER, Role.COURIER] },
    create: { phone: '+201000000004', name: 'سعيد المندوب', roles: [Role.CUSTOMER, Role.COURIER] },
  });
  await prisma.courierProfile.upsert({
    where: { userId: courier2.id },
    update: { isAvailable: true, lat: 30.0511, lng: 31.3656, lastLocationAt: new Date() },
    create: { userId: courier2.id, isAvailable: true, lat: 30.0511, lng: 31.3656, lastLocationAt: new Date() },
  });

  return { admin, merchant, courier };
}

async function seedDemoStore(
  merchantId: string,
  serviceTypeId: string,
  zoneIds: string[],
) {
  const store = await prisma.store.upsert({
    where: { slug: 'burger-plus' },
    update: { status: 'ACTIVE', listingType: 'CATALOG', managerPermissions: [...MERCHANT_PERMISSION_KEYS] },
    create: {
      slug: 'burger-plus',
      name: 'برجر بلس',
      description: 'أحلى برجر في الحي',
      listingType: 'CATALOG',
      managerPermissions: [...MERCHANT_PERMISSION_KEYS], // demo owner has full store access
      serviceTypeId,
      ownerId: merchantId,
      contactPhone: '+201000000002',
      status: 'ACTIVE',
      addressText: 'شارع الجلاء، دمياط الجديدة',
      lat: 31.4441,
      lng: 31.6558,
      minOrderTotal: 5000,
      prepTimeMins: 20,
    },
  });

  // demo store is open 24/7 so it's always testable regardless of the tester's clock
  for (let day = 0; day <= 6; day++) {
    await prisma.workingHour.upsert({
      where: { storeId_dayOfWeek_opensAt: { storeId: store.id, dayOfWeek: day, opensAt: '00:00' } },
      update: { closesAt: '23:59' },
      create: { storeId: store.id, dayOfWeek: day, opensAt: '00:00', closesAt: '23:59' },
    });
  }

  for (const zoneId of zoneIds) {
    await prisma.storeZone.upsert({
      where: { storeId_zoneId: { storeId: store.id, zoneId } },
      update: {},
      create: { storeId: store.id, zoneId, deliveryFee: 2500, etaMins: 25 },
    });
  }

  // products: idempotent by "seed once" — safe for a demo catalog
  const existing = await prisma.product.count({ where: { storeId: store.id } });
  if (existing === 0) {
    const burgers = await prisma.menuCategory.create({
      data: { storeId: store.id, name: 'برجر', sortOrder: 1 },
    });
    const drinks = await prisma.menuCategory.create({
      data: { storeId: store.id, name: 'مشروبات', sortOrder: 2 },
    });

    const classic = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: burgers.id,
        name: 'برجر كلاسيك',
        description: 'لحم بقري 150 جرام مع جبنة شيدر',
        price: 9500,
        sortOrder: 1,
      },
    });
    await prisma.optionGroup.create({
      data: {
        productId: classic.id,
        name: 'الحجم',
        minSelect: 1,
        maxSelect: 1,
        options: {
          create: [
            { name: 'عادي', priceDelta: 0, sortOrder: 1 },
            { name: 'دبل', priceDelta: 4500, sortOrder: 2 },
          ],
        },
      },
    });
    await prisma.optionGroup.create({
      data: {
        productId: classic.id,
        name: 'إضافات',
        minSelect: 0,
        maxSelect: 3,
        options: {
          create: [
            { name: 'جبنة إضافية', priceDelta: 1000, sortOrder: 1 },
            { name: 'بيكون', priceDelta: 1500, sortOrder: 2 },
            { name: 'صوص حار', priceDelta: 0, sortOrder: 3 },
          ],
        },
      },
    });

    await prisma.product.createMany({
      data: [
        { storeId: store.id, categoryId: burgers.id, name: 'تشيكن برجر', price: 8500, sortOrder: 2 },
        { storeId: store.id, categoryId: drinks.id, name: 'كولا كانز', price: 2000, sortOrder: 1 },
        { storeId: store.id, categoryId: drinks.id, name: 'مية معدنية', price: 1000, sortOrder: 2 },
      ],
    });
  }

  return store;
}

/**
 * Pickup-point shops (نقطة استلام): just named places the customer can point an
 * errand at ("هات موز من بقالة العم سيد"). No catalog, no owner login — platform-owned.
 */
async function seedPickupPoints(adminId: string, serviceTypes: { slug: string; id: string }[]) {
  const supermarket = serviceTypes.find((s) => s.slug === 'supermarket');
  const pharmacy = serviceTypes.find((s) => s.slug === 'pharmacy');
  const points = [
    { slug: 'pickup-baqala-elsayed', name: 'بقالة العم سيد', serviceTypeId: supermarket?.id, addressText: 'شارع النيل، دمياط', lat: 31.4165, lng: 31.8133 },
    { slug: 'pickup-saydaliyat-elnour', name: 'صيدلية النور', serviceTypeId: pharmacy?.id, addressText: 'شارع الجيش، دمياط الجديدة', lat: 31.4441, lng: 31.6558 },
  ];
  for (const p of points) {
    if (!p.serviceTypeId) continue;
    await prisma.store.upsert({
      where: { slug: p.slug },
      update: { status: 'ACTIVE', listingType: 'PICKUP_POINT' },
      create: {
        slug: p.slug,
        name: p.name,
        listingType: 'PICKUP_POINT',
        serviceTypeId: p.serviceTypeId,
        ownerId: adminId, // pickup points are platform-owned (no merchant login)
        contactPhone: '+201000000001',
        status: 'ACTIVE',
        addressText: p.addressText,
        lat: p.lat,
        lng: p.lng,
      },
    });
  }
}

/**
 * Preset roles = ready-made starting bundles the super admin can assign or
 * tweak. Not system-locked (isSystem=false) so they stay fully editable.
 * Super admin itself needs no role row — Role.SUPER_ADMIN grants `*` in code.
 * `update: {}` keeps re-seeding non-destructive to any admin edits.
 */
async function seedRoles() {
  const presets = [
    {
      key: 'stores-manager',
      nameAr: 'مدير المحلات',
      description: 'إضافة وتعديل المحلات وأصنافها',
      permissions: ['stores.view', 'stores.create', 'stores.edit', 'stores.suspend', 'products.manage'],
    },
    {
      key: 'dispatch-supervisor',
      nameAr: 'مشرف التوزيع',
      description: 'توزيع الطلبات ومتابعة السواقين',
      permissions: ['dispatch.view', 'dispatch.assign', 'drivers.view'],
    },
    {
      key: 'drivers-manager',
      nameAr: 'مدير السواقين',
      description: 'إضافة وتعديل السواقين',
      permissions: ['drivers.view', 'drivers.manage'],
    },
  ];
  for (const p of presets) {
    await prisma.appRole.upsert({ where: { key: p.key }, update: {}, create: p });
  }
  return presets;
}

async function main() {
  console.log('🌱 Seeding SprintGo…');
  const zones = await seedZones();
  const serviceTypes = await seedServiceTypes();
  const { admin, merchant } = await seedUsers();
  const roles = await seedRoles();

  const restaurants = serviceTypes.find((s) => s.slug === 'restaurants');
  if (restaurants) {
    await seedDemoStore(
      merchant.id,
      restaurants.id,
      zones.map((z) => z.id),
    );
  }
  await seedPickupPoints(admin.id, serviceTypes);

  console.log(`✅ Seeded: ${zones.length} zones, ${serviceTypes.length} service types, ${roles.length} preset roles, demo users & store.`);
  console.log('   Dev logins (OTP printed in api console): customer=any 01x number,');
  console.log('   admin=01000000001, merchant=01000000002, courier=01000000003');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
