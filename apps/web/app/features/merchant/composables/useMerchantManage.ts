import type { ApiSuccess, UpsertProductDto } from '@sprintgo/shared';
import { extractApiError, useApi } from '~/composables/useApi';

/** Raw merchant product row (management view — not the public ProductView). */
export interface MerchantProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isAvailable: boolean;
  categoryId: string | null;
  sortOrder: number;
}

export interface MerchantStore {
  id: string;
  name: string;
  isAcceptingOrders: boolean;
  prepTimeMins: number;
  minOrderTotal: number;
  contactPhone: string;
  description: string | null;
  /** Store-dashboard capabilities granted to this owner. EMPTY array = all (grandfathered). */
  managerPermissions?: string[];
}

export function useMerchantManage() {
  const api = useApi();

  function getStore() {
    return api<ApiSuccess<MerchantStore>>('/merchant/store').then((r) => r.data);
  }

  async function toggleAccepting(isAvailable: boolean) {
    try {
      await api('/merchant/store/accepting', { method: 'PATCH', body: { isAvailable } });
    } catch (err) {
      throw extractApiError(err);
    }
  }

  function listProducts() {
    return api<ApiSuccess<MerchantProduct[]>>('/merchant/products').then((r) => r.data);
  }

  async function setProductAvailability(id: string, isAvailable: boolean) {
    try {
      await api(`/merchant/products/${id}/availability`, { method: 'PATCH', body: { isAvailable } });
    } catch (err) {
      throw extractApiError(err);
    }
  }

  async function createProduct(dto: UpsertProductDto) {
    try {
      await api('/merchant/products', { method: 'POST', body: dto });
    } catch (err) {
      throw extractApiError(err);
    }
  }

  return { getStore, toggleAccepting, listProducts, setProductAvailability, createProduct };
}
