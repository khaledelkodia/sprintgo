import type { ApiSuccess, ServiceTypeView, StoreCardView, StoreDetailView } from '@sprintgo/shared';
import { useApi } from '~/composables/useApi';

/** Public catalog reads. Pages wrap these in useAsyncData for SSR + caching. */
export function useCatalog() {
  const api = useApi();

  function getServiceTypes() {
    return api<ApiSuccess<ServiceTypeView[]>>('/service-types').then((r) => r.data);
  }

  function getStores(params: { serviceType?: string; zoneId?: string; q?: string }) {
    return api<ApiSuccess<StoreCardView[]>>('/stores', { query: params }).then((r) => r.data);
  }

  function getStore(slug: string, zoneId?: string) {
    return api<ApiSuccess<StoreDetailView>>(`/stores/${slug}`, {
      query: zoneId ? { zoneId } : {},
    }).then((r) => r.data);
  }

  return { getServiceTypes, getStores, getStore };
}
