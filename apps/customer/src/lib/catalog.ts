import type {
  AddressView,
  CreateAddressDto,
  ErrandSourceView,
  OrderView,
  PlaceOrderDto,
  StoreCardView,
  StoreDetailView,
} from '@sprintgo/shared';
import { api } from './api';

/** Shops the customer can point an errand at ("هات من ..."). */
export const getErrandSources = () => api<ErrandSourceView[]>('/errand-sources');

/** Browsable catalog stores (optionally filtered by service type / zone / search). */
export const getStores = (params?: { serviceType?: string; zoneId?: string; q?: string }) =>
  api<StoreCardView[]>('/stores', { query: params });

/** A store with its full menu (categories → products → option groups). */
export const getStore = (slug: string, zoneId?: string) =>
  api<StoreDetailView>(`/stores/${slug}`, { query: { zoneId } });

/** Place a catalog order (server re-prices — clientTotal is only drift detection). */
export const placeOrder = (dto: PlaceOrderDto) => api<OrderView>('/orders', { method: 'POST', body: dto });

/** The customer's saved delivery addresses. */
export const getAddresses = () => api<AddressView[]>('/addresses');
export const createAddress = (dto: CreateAddressDto) =>
  api<AddressView>('/addresses', { method: 'POST', body: dto });
