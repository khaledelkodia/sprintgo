import { z } from 'zod';
import { phoneInputSchema } from './auth.schema';
import { PERMISSION_KEYS } from '../permissions';

/** A permission key that must exist in the catalog. */
const permissionKey = z.enum(PERMISSION_KEYS as [string, ...string[]]);

/** Super admin defines a custom role = a named bundle of permissions. */
export const createRoleSchema = z
  .object({
    nameAr: z.string().trim().min(2, 'اكتب اسم الدور').max(40),
    description: z.string().trim().max(160).optional(),
    permissions: z.array(permissionKey).min(1, 'اختار صلاحية واحدة على الأقل'),
  })
  .strict();
export type CreateRoleDto = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z
  .object({
    nameAr: z.string().trim().min(2, 'اكتب اسم الدور').max(40).optional(),
    description: z.string().trim().max(160).nullable().optional(),
    permissions: z.array(permissionKey).min(1, 'اختار صلاحية واحدة على الأقل').optional(),
  })
  .strict();
export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;

/** Super admin onboards a staff member (dashboard login = phone + password). */
export const createStaffSchema = z
  .object({
    name: z.string().trim().min(2, 'اكتب اسم الموظف').max(60),
    phone: phoneInputSchema,
    password: z.string().min(6, 'الباسورد 6 حروف على الأقل').max(72),
    roleIds: z.array(z.string().min(1)).min(1, 'اختار دور واحد على الأقل'),
  })
  .strict();
export type CreateStaffDto = z.infer<typeof createStaffSchema>;

/** Re-assign which roles a staff member holds. */
export const updateStaffRolesSchema = z
  .object({
    roleIds: z.array(z.string().min(1)),
  })
  .strict();
export type UpdateStaffRolesDto = z.infer<typeof updateStaffRolesSchema>;
