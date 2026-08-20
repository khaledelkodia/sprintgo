import { z } from 'zod';
import { normalizeEgyptianPhone } from '../phone';

/** Accepts human input, outputs canonical E.164 — or a friendly Arabic error. */
export const phoneInputSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const normalized = normalizeEgyptianPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'رقم الموبايل مش مظبوط — اتأكد إنه بيبدأ بـ 01 و11 رقم' });
      return z.NEVER;
    }
    return normalized;
  });

export const requestOtpSchema = z
  .object({
    phone: phoneInputSchema,
  })
  .strict();
export type RequestOtpDto = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z
  .object({
    phone: phoneInputSchema,
    code: z.string().trim().regex(/^\d{4}$/, 'الكود 4 أرقام'),
  })
  .strict();
export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(2, 'الاسم قصير أوي').max(60, 'الاسم طويل أوي').optional(),
    language: z.enum(['ar', 'en']).optional(),
  })
  .strict();
export type UpdateMeDto = z.infer<typeof updateMeSchema>;
