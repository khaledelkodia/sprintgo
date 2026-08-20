import { z } from 'zod';

// ── order actions on the merchant board ──
export const acceptOrderSchema = z
  .object({ estimatedReadyMins: z.number().int().min(1).max(180).optional() })
  .strict();
export type AcceptOrderDto = z.infer<typeof acceptOrderSchema>;

export const rejectOrderSchema = z
  .object({ reason: z.string().trim().min(1, 'اكتب سبب الرفض').max(200) })
  .strict();
export type RejectOrderDto = z.infer<typeof rejectOrderSchema>;

// ── store settings ──
export const updateStoreSchema = z
  .object({
    description: z.string().trim().max(300).optional(),
    logoUrl: z.string().trim().max(400).optional(),
    contactPhone: z.string().trim().max(20).optional(),
    prepTimeMins: z.number().int().min(1).max(180).optional(),
    minOrderTotal: z.number().int().min(0).optional(),
    isAcceptingOrders: z.boolean().optional(),
  })
  .strict();
export type UpdateStoreDto = z.infer<typeof updateStoreSchema>;

const workingHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  opensAt: z.string().regex(/^\d{2}:\d{2}$/),
  closesAt: z.string().regex(/^\d{2}:\d{2}$/),
});
export const setWorkingHoursSchema = z
  .object({ hours: z.array(workingHourSchema).max(21) })
  .strict();
export type SetWorkingHoursDto = z.infer<typeof setWorkingHoursSchema>;

// ── categories & products ──
export const upsertCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
export type UpsertCategoryDto = z.infer<typeof upsertCategorySchema>;

export const upsertProductSchema = z
  .object({
    categoryId: z.string().min(1).optional(),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(300).optional(),
    imageUrl: z.string().trim().max(400).optional(),
    price: z.number().int().min(0),
    isAvailable: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict();
export type UpsertProductDto = z.infer<typeof upsertProductSchema>;

export const toggleAvailabilitySchema = z.object({ isAvailable: z.boolean() }).strict();
export type ToggleAvailabilityDto = z.infer<typeof toggleAvailabilitySchema>;

// ── merchant "request a courier" for own phone orders (errand order, ADR-010) ──
export const createDeliveryRequestSchema = z
  .object({
    recipientName: z.string().trim().min(1, 'اكتب اسم المستلم').max(60),
    recipientPhone: z.string().trim().min(1, 'اكتب رقم المستلم').max(20),
    zoneId: z.string().min(1, 'اختار المنطقة'),
    street: z.string().trim().min(1, 'اكتب العنوان').max(120),
    landmark: z.string().trim().max(120).optional(),
    codToCollect: z.number().int().min(0).default(0),
    instructions: z.string().trim().max(300).optional(),
  })
  .strict();
export type CreateDeliveryRequestDto = z.infer<typeof createDeliveryRequestSchema>;
