import { hasMerchantPermission } from '@sprintgo/shared';
import type { MerchantPermissionKey } from '@sprintgo/shared';
import { useMerchantManage } from './useMerchantManage';
import type { MerchantStore } from './useMerchantManage';

/**
 * Loads the logged-in merchant's store once per session and exposes a `can(key)`
 * gate over its `managerPermissions`. The store is cached in shared state so the
 * three merchant pages (board / menu / settings) don't each re-fetch `/merchant/store`.
 *
 * NOTE: an EMPTY `managerPermissions` array means "all" — it grandfathers stores
 * created before permissions existed. `hasMerchantPermission` encodes that rule,
 * so a full-access owner is never gated. This only HIDES UI the owner can't use;
 * the API still enforces every capability server-side.
 */
export function useMerchantPermissions() {
  const manage = useMerchantManage();
  const store = useState<MerchantStore | null>('merchant:store', () => null);
  const loading = useState<boolean>('merchant:store:loading', () => false);

  const permissions = computed<string[]>(() => store.value?.managerPermissions ?? []);
  /** True once the store has been fetched — gate rendering on this to avoid a flash. */
  const ready = computed(() => store.value !== null);

  /** Always fetch fresh; used by pages that also render the store (e.g. settings). */
  async function load(): Promise<MerchantStore> {
    loading.value = true;
    try {
      const fresh = await manage.getStore();
      store.value = fresh;
      return fresh;
    } finally {
      loading.value = false;
    }
  }

  /** Fetch once per session (cheap, cached). Fails open — the API still enforces. */
  async function ensure(): Promise<void> {
    if (store.value !== null || loading.value) return;
    try {
      await load();
    } catch {
      // leave the store null; can() stays permissive and the backend rejects anyway
    }
  }

  /** Is the current owner allowed to use `key`? Empty grant = full access. */
  function can(key: MerchantPermissionKey): boolean {
    return hasMerchantPermission(permissions.value, key);
  }

  return { store, permissions, ready, loading, load, ensure, can };
}
