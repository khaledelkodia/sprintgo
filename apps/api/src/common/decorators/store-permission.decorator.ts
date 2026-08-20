import { SetMetadata } from '@nestjs/common';
import type { MerchantPermissionKey } from '@sprintgo/shared';

export const STORE_PERMISSION_KEY = 'sg:store-permission';

/**
 * Store-dashboard gate: the handler runs only if the merchant's owned store
 * grants this capability (`Store.managerPermissions`). An empty grant means
 * "all" — grandfathers stores created before permissions existed. Pair with
 * `@Roles('MERCHANT')` + `MerchantPermissionsGuard`.
 */
export const RequireStorePermission = (permission: MerchantPermissionKey) =>
  SetMetadata(STORE_PERMISSION_KEY, permission);
