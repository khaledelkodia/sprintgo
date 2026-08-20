import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '@sprintgo/shared';

export const PERMISSIONS_KEY = 'sg:permissions';

/**
 * Fine-grained gate — layer 2b, applied *after* RolesGuard confirms the caller
 * is staff. The handler runs only if the user holds EVERY listed permission
 * (SUPER_ADMIN's `*` satisfies all). Pair with `@Roles('ADMIN','SUPER_ADMIN')`.
 */
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
