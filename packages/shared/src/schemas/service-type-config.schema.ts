import { z } from 'zod';
import { FULFILLMENT_TYPES } from '../enums';

/**
 * Per-vertical behavior switches (docs/architecture/07 §2).
 * Validated on every admin write AND at seed/boot — an invalid vertical
 * cannot enter the system.
 */
export const serviceTypeConfigSchema = z
  .object({
    ordering: z
      .object({
        fulfillment: z.array(z.enum(FULFILLMENT_TYPES)).min(1).default(['DELIVERY']),
        allowScheduling: z.boolean().default(false),
        allowItemNotes: z.boolean().default(true),
        requiresAttachment: z
          .object({
            enabled: z.boolean().default(false),
            labelAr: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
    catalog: z
      .object({
        hasOptionGroups: z.boolean().default(true),
        layout: z.enum(['grid', 'list']).default('list'),
        showCalories: z.boolean().default(false),
      })
      .optional(),
    errand: z
      .object({
        baseFee: z.number().int().positive(), // رسوم أساسية (piastres) — covers the courier's effort
        perKmFee: z.number().int().min(0).default(0), // سعر الكيلو — added per km of distance
        minFee: z.number().int().min(0).default(0), // الحد الأدنى للتوصيل
        commissionPercent: z.number().min(0).max(100).default(0), // نسبة الإدارة من رسوم التوصيل
        remittanceLimit: z.number().int().min(0).default(0), // يتقفل المندوب لو المطلوب توريده وصل للحد ده (0 = بلا حد)
        zoneFees: z.record(z.string(), z.number().int()).optional(), // fallback when coordinates are missing
        maxPurchaseBudget: z.number().int().default(200_000),
      })
      .optional(),
    ui: z
      .object({
        icon: z.string(),
        accentToken: z.string().optional(),
      })
      .optional(),
  })
  .strict();

export type ServiceTypeConfig = z.infer<typeof serviceTypeConfigSchema>;
