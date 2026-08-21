import { z } from 'zod';
import { VEHICLE_TYPES } from '../enums';
import { phoneInputSchema } from './auth.schema';

const storeZoneInput = z.object({
  zoneId: z.string().min(1),
  deliveryFee: z.number().int().min(0),
  etaMins: z.number().int().min(1).max(180).optional(),
});

const storeOwnerInput = z.object({
  name: z.string().trim().min(2, 'اكتب اسم صاحب المحل').max(60),
  phone: phoneInputSchema,
  password: z.string().min(6, 'الباسورد 6 حروف على الأقل').max(72),
});

/**
 * Super admin creates a store. A CATALOG store also gets an owner login
 * (phone + password) + delivery zones; a PICKUP_POINT is just a named place
 * (name + location) that shows up as an errand source — no owner, no zones.
 */
export const createStoreSchema = z
  .object({
    name: z.string().trim().min(2, 'اكتب اسم المحل').max(80),
    serviceTypeSlug: z.string().min(1, 'اختار نوع المحل'),
    listingType: z.enum(['PICKUP_POINT', 'CATALOG']).default('CATALOG'),
    contactPhone: phoneInputSchema,
    addressText: z.string().trim().min(2, 'اكتب عنوان المحل').max(200),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    minOrderTotal: z.number().int().min(0).default(0),
    prepTimeMins: z.number().int().min(1).max(180).default(20),
    productLimit: z.number().int().min(1).max(10_000).nullable().optional(),
    /** Store-dashboard capabilities granted to the owner (merchant permission keys). */
    managerPermissions: z.array(z.string()).optional(),
    zones: z.array(storeZoneInput).default([]),
    owner: storeOwnerInput.optional(),
  })
  .strict()
  .refine((d) => d.listingType !== 'CATALOG' || !!d.owner, {
    message: 'محل المنتجات لازم يكون له حساب صاحب محل',
    path: ['owner'],
  })
  .refine((d) => d.listingType !== 'CATALOG' || d.zones.length >= 1, {
    message: 'حدد منطقة توصيل واحدة على الأقل',
    path: ['zones'],
  });
export type CreateStoreDto = z.infer<typeof createStoreSchema>;

/** Super admin edits any store (drill-in management). */
export const adminUpdateStoreSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    contactPhone: phoneInputSchema.optional(),
    addressText: z.string().trim().min(2).max(200).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    minOrderTotal: z.number().int().min(0).optional(),
    prepTimeMins: z.number().int().min(1).max(180).optional(),
    productLimit: z.number().int().min(1).max(10_000).nullable().optional(),
    managerPermissions: z.array(z.string()).optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED']).optional(),
    isAcceptingOrders: z.boolean().optional(),
  })
  .strict();
export type AdminUpdateStoreDto = z.infer<typeof adminUpdateStoreSchema>;

/** Super admin onboards a driver (courier logs in via OTP; password optional). */
export const createDriverSchema = z
  .object({
    name: z.string().trim().min(2, 'اكتب اسم السائق').max(60),
    /** what they drive — dispatch only offers a نقل job to the right vehicle */
    vehicleType: z.enum(VEHICLE_TYPES).default('MOTORCYCLE'),
    phone: phoneInputSchema,
  })
  .strict();
export type CreateDriverDto = z.infer<typeof createDriverSchema>;

/** Super admin adds/edits a delivery zone (منطقة). lat/lng power errand fees + nearest-courier. */
export const createZoneSchema = z
  .object({
    nameAr: z.string().trim().min(2, 'اكتب اسم المنطقة').max(60),
    city: z.string().trim().min(2, 'اكتب المحافظة').max(60),
    nameEn: z.string().trim().max(60).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  })
  .strict();
export type CreateZoneDto = z.infer<typeof createZoneSchema>;

export const updateZoneSchema = z
  .object({
    nameAr: z.string().trim().min(2).max(60).optional(),
    city: z.string().trim().min(2).max(60).optional(),
    nameEn: z.string().trim().max(60).nullable().optional(),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
export type UpdateZoneDto = z.infer<typeof updateZoneSchema>;

/** Merchant / staff password login. */
export const passwordLoginSchema = z
  .object({
    phone: phoneInputSchema,
    password: z.string().min(1).max(72),
  })
  .strict();
export type PasswordLoginDto = z.infer<typeof passwordLoginSchema>;

/** Admin changes what an existing courier drives. */
export const updateDriverVehicleSchema = z.object({ vehicleType: z.enum(VEHICLE_TYPES) }).strict();
export type UpdateDriverVehicleDto = z.infer<typeof updateDriverVehicleSchema>;
