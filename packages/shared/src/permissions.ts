/**
 * Fine-grained permission catalog — the single source of truth for RBAC.
 *
 * Permissions are CODE constants (not DB rows): each one maps to a guarded
 * capability in the API and a gated area in the dashboard. Roles (DB rows)
 * are just named *bundles* of these keys that the super admin distributes to
 * staff. Adding a capability = add a key here, guard the endpoint with it,
 * and it instantly becomes assignable in the roles UI (docs/architecture/05).
 *
 * Convention: `<area>.<action>`, all lowercase. Never rename a key once
 * shipped — assigned roles store the string; treat keys as a stable contract.
 */

/** Wildcard held only by SUPER_ADMIN — satisfies every permission check. */
export const WILDCARD_PERMISSION = '*' as const;

export const PERMISSIONS = [
  // ── المحلات ──
  { key: 'stores.view', group: 'المحلات', label: 'عرض المحلات' },
  { key: 'stores.create', group: 'المحلات', label: 'إضافة محل جديد' },
  { key: 'stores.edit', group: 'المحلات', label: 'تعديل بيانات المحل' },
  { key: 'stores.suspend', group: 'المحلات', label: 'إيقاف وتفعيل المحل' },
  { key: 'products.manage', group: 'المحلات', label: 'إدارة أصناف المحل' },
  // ── المناطق ──
  { key: 'zones.manage', group: 'المناطق', label: 'إضافة وتعديل المناطق' },
  // ── السواقين ──
  { key: 'drivers.view', group: 'السواقين', label: 'عرض السواقين' },
  { key: 'drivers.manage', group: 'السواقين', label: 'إضافة وتعديل السواقين' },
  // ── التوزيع ──
  { key: 'dispatch.view', group: 'التوزيع', label: 'عرض لوحة التوزيع' },
  { key: 'dispatch.assign', group: 'التوزيع', label: 'تعيين وإعادة تعيين السواقين' },
  // ── الفريق والصلاحيات ──
  { key: 'team.view', group: 'الفريق والصلاحيات', label: 'عرض أعضاء الفريق' },
  { key: 'team.manage', group: 'الفريق والصلاحيات', label: 'إضافة وتعديل أعضاء الفريق' },
  { key: 'roles.manage', group: 'الفريق والصلاحيات', label: 'إدارة الأدوار والصلاحيات' },
  // ── الإعدادات ──
  { key: 'pricing.manage', group: 'الإعدادات', label: 'تعديل التسعير والعمولة' },
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type PermissionKey = Permission['key'];

/** All valid permission keys — used to validate role definitions. */
export const PERMISSION_KEYS: readonly PermissionKey[] = PERMISSIONS.map((p) => p.key);

const PERMISSION_KEY_SET = new Set<string>(PERMISSION_KEYS);

/** True when `key` is a known permission (guards against stale/typo keys). */
export function isPermissionKey(key: string): key is PermissionKey {
  return PERMISSION_KEY_SET.has(key);
}

/**
 * Does a user holding `granted` satisfy `required`?
 * A `*` in the granted set (SUPER_ADMIN) satisfies everything.
 */
export function hasPermission(granted: readonly string[], required: PermissionKey): boolean {
  return granted.includes(WILDCARD_PERMISSION) || granted.includes(required);
}

/** Does the granted set include the wildcard (can do everything)? */
export function isSuperGrant(granted: readonly string[]): boolean {
  return granted.includes(WILDCARD_PERMISSION);
}

/** Ordered group labels as they should appear in the roles UI. */
export const PERMISSION_GROUPS: readonly string[] = [...new Set(PERMISSIONS.map((p) => p.group))];

/**
 * Store-dashboard capabilities — the toggles a super admin grants to a catalog
 * store's owner user (stored on `Store.managerPermissions`). Separate namespace
 * from the platform PERMISSIONS above: these gate the MERCHANT app, not the admin
 * dashboard. Same "never rename a shipped key" rule applies.
 */
export const MERCHANT_PERMISSIONS = [
  { key: 'merchant.orders', label: 'استقبال وإدارة الطلبات' },
  { key: 'merchant.products', label: 'إدارة المنيو والأصناف' },
  { key: 'merchant.settings', label: 'إعدادات المحل (فتح/قفل والبيانات)' },
  { key: 'merchant.reports', label: 'التقارير والمبيعات' },
] as const;

export type MerchantPermission = (typeof MERCHANT_PERMISSIONS)[number];
export type MerchantPermissionKey = MerchantPermission['key'];

export const MERCHANT_PERMISSION_KEYS: readonly MerchantPermissionKey[] = MERCHANT_PERMISSIONS.map((p) => p.key);

const MERCHANT_PERMISSION_KEY_SET = new Set<string>(MERCHANT_PERMISSION_KEYS);

/** True when `key` is a known merchant capability (drops typo/stale keys). */
export function isMerchantPermissionKey(key: string): key is MerchantPermissionKey {
  return MERCHANT_PERMISSION_KEY_SET.has(key);
}

/**
 * Does a store owner holding `granted` satisfy `required`?
 * An EMPTY grant means "all" — grandfathers stores created before permissions existed.
 */
export function hasMerchantPermission(granted: readonly string[], required: MerchantPermissionKey): boolean {
  return granted.length === 0 || granted.includes(required);
}

/** Normalize a raw grant to only valid keys (empty stays empty = all). */
export function sanitizeMerchantPermissions(keys: readonly string[]): MerchantPermissionKey[] {
  return keys.filter(isMerchantPermissionKey);
}
