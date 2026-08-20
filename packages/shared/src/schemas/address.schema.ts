import { z } from 'zod';

/** Only the 4 fields an elderly user must fill are required (docs/architecture/08 §5). */
export const createAddressSchema = z
  .object({
    label: z.string().trim().min(1, 'اكتب اسم للعنوان زي "البيت"').max(40),
    zoneId: z.string().min(1, 'اختار المنطقة'),
    street: z.string().trim().min(1, 'اكتب اسم الشارع').max(120),
    building: z.string().trim().max(40).optional(),
    floor: z.string().trim().max(20).optional(),
    apartment: z.string().trim().max(20).optional(),
    landmark: z.string().trim().max(120).optional(),
    contactPhone: z.string().trim().max(20).optional(),
    isDefault: z.boolean().optional(),
  })
  .strict();
export type CreateAddressDto = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = createAddressSchema.partial();
export type UpdateAddressDto = z.infer<typeof updateAddressSchema>;
