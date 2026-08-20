import { z } from 'zod';

/** Drop-off is either a saved address OR a typed destination (مشوار — ADR-010). */
const dropoffSchema = z
  .object({
    addressId: z.string().min(1).optional(),
    zoneId: z.string().min(1).optional(),
    street: z.string().trim().max(120).optional(),
    building: z.string().trim().max(40).optional(),
    landmark: z.string().trim().max(120).optional(),
    recipientName: z.string().trim().max(60).optional(),
    recipientPhone: z.string().trim().max(20).optional(),
    // the customer's GPS — powers fair distance-based pricing
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  })
  .strict()
  .refine((d) => d.addressId || (d.zoneId && d.street), {
    message: 'اختار عنوان محفوظ أو اكتب المكان اللي نوصّله',
  });

export const createErrandSchema = z
  .object({
    instructions: z.string().trim().min(3, 'اكتب المطلوب بالظبط').max(500),
    /** Optional named shop to buy from ("هات موز من محل كذا"). Sets the pickup location. */
    sourceStoreId: z.string().min(1).optional(),
    pickupText: z.string().trim().max(200).optional(),
    pickupZoneId: z.string().min(1).optional(),
    dropoff: dropoffSchema,
    purchaseBudget: z.number().int().positive().optional(),
  })
  .strict();
export type CreateErrandDto = z.infer<typeof createErrandSchema>;

/** Live price preview for an errand before the customer confirms (GET query → coerce). */
export const errandQuoteSchema = z
  .object({
    sourceStoreId: z.string().min(1).optional(),
    zoneId: z.string().min(1),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  })
  .strict();
export type ErrandQuoteDto = z.infer<typeof errandQuoteSchema>;

/** Admin logs a courier's cash hand-in. */
export const recordRemittanceSchema = z
  .object({
    amount: z.number().int().positive('اكتب مبلغ صحيح'),
    note: z.string().trim().max(200).optional(),
  })
  .strict();
export type RecordRemittanceDto = z.infer<typeof recordRemittanceSchema>;

/** Admin edits the errand pricing + platform commission (all piastres; percent 0–100). */
export const errandPricingSchema = z
  .object({
    baseFee: z.number().int().positive().optional(),
    perKmFee: z.number().int().min(0).optional(),
    minFee: z.number().int().min(0).optional(),
    commissionPercent: z.number().min(0).max(100).optional(),
    remittanceLimit: z.number().int().min(0).optional(),
  })
  .strict();
export type ErrandPricingDto = z.infer<typeof errandPricingSchema>;
