import { z } from 'zod';

// ── admin dispatch ──
export const assignCourierSchema = z.object({ courierId: z.string().min(1) }).strict();
export type AssignCourierDto = z.infer<typeof assignCourierSchema>;

export const reassignCourierSchema = z
  .object({ courierId: z.string().min(1), reason: z.string().trim().max(200).optional() })
  .strict();
export type ReassignCourierDto = z.infer<typeof reassignCourierSchema>;

// ── courier app ──
export const setAvailabilitySchema = z.object({ isAvailable: z.boolean() }).strict();
export type SetAvailabilityDto = z.infer<typeof setAvailabilitySchema>;

export const enterGoodsCostSchema = z
  .object({ actualGoodsCost: z.number().int().min(0) })
  .strict();
export type EnterGoodsCostDto = z.infer<typeof enterGoodsCostSchema>;

export const markDeliveredSchema = z
  .object({ cashCollected: z.number().int().min(0).optional() })
  .strict();
export type MarkDeliveredDto = z.infer<typeof markDeliveredSchema>;
