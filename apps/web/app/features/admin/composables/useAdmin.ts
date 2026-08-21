import type {
  ApiSuccess,
  CourierDailyReportRow,
  CreateStoreDto,
  CreateZoneDto,
  DriverSettlementRow,
  ErrandPricingDto,
  StoreListingType,
  UpsertProductDto,
  VehicleType,
  ZoneAdminRow,
} from '@sprintgo/shared';
import { extractApiError, useApi } from '~/composables/useApi';

export interface AdminStoreRow {
  id: string;
  name: string;
  slug: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  listingType: StoreListingType;
  productLimit: number | null;
  minOrderTotal: number;
  prepTimeMins: number;
  contactPhone: string;
  addressText: string;
  serviceType: { nameAr: string; slug: string };
  owner: { name: string | null; phone: string };
  _count: { products: number };
}

export interface AdminStoreDetail extends AdminStoreRow {
  lat: string | null;
  lng: string | null;
  isAcceptingOrders: boolean;
  managerPermissions?: string[];
  zones: { id: string; deliveryFee: number; etaMins: number | null; zone: { nameAr: string } }[];
}

export interface AdminProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isAvailable: boolean;
  categoryId: string | null;
  sortOrder: number;
}

export interface AdminDriver {
  id: string;
  name: string | null;
  phone: string;
  status: string;
  isAvailable: boolean;
  totalDeliveries: number;
  vehicleType: VehicleType;
}

/** Errand pricing + platform commission. Fees in piastres; commissionPercent 0–100; remittanceLimit 0 = بلا حد. */
export interface ErrandPricing {
  baseFee: number;
  perKmFee: number;
  minFee: number;
  commissionPercent: number;
  remittanceLimit: number;
  /** نقل: percent of the normal fee per vehicle (100 = same as a motorcycle) */
  vehicleMultipliers: Record<VehicleType, number>;
}

export function useAdmin() {
  const api = useApi();
  const wrap = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      throw extractApiError(err);
    }
  };

  // stores
  const listStores = (status?: string) =>
    api<ApiSuccess<AdminStoreRow[]>>('/admin/stores', { query: status ? { status } : {} }).then((r) => r.data);
  const getStore = (id: string) =>
    api<ApiSuccess<AdminStoreDetail>>(`/admin/stores/${id}`).then((r) => r.data);
  const createStore = (dto: CreateStoreDto) =>
    wrap(() => api<ApiSuccess<{ store: AdminStoreRow; ownerPhone: string }>>('/admin/stores', { method: 'POST', body: dto }).then((r) => r.data));
  const updateStore = (id: string, body: Record<string, unknown>) =>
    wrap(() => api(`/admin/stores/${id}`, { method: 'PATCH', body }));
  const setStoreStatus = (id: string, action: 'suspend' | 'activate') =>
    wrap(() => api(`/admin/stores/${id}/${action}`, { method: 'POST', body: {} }));

  // a store's products (drill-in)
  const listProducts = (storeId: string) =>
    api<ApiSuccess<AdminProduct[]>>(`/admin/stores/${storeId}/products`).then((r) => r.data);
  const createProduct = (storeId: string, dto: UpsertProductDto) =>
    wrap(() => api(`/admin/stores/${storeId}/products`, { method: 'POST', body: dto }));
  const setProductAvailability = (storeId: string, pid: string, isAvailable: boolean) =>
    wrap(() => api(`/admin/stores/${storeId}/products/${pid}/availability`, { method: 'PATCH', body: { isAvailable } }));
  const deleteProduct = (storeId: string, pid: string) =>
    wrap(() => api(`/admin/stores/${storeId}/products/${pid}`, { method: 'DELETE' }));

  // drivers
  const listDrivers = () => api<ApiSuccess<AdminDriver[]>>('/admin/drivers').then((r) => r.data);
  const createDriver = (body: { name: string; phone: string; vehicleType: VehicleType }) =>
    wrap(() => api<ApiSuccess<AdminDriver>>('/admin/drivers', { method: 'POST', body }).then((r) => r.data));
  /** Change what an existing courier drives — نقل jobs only reach the matching vehicle. */
  const setDriverVehicle = (id: string, vehicleType: VehicleType) =>
    wrap(() => api(`/admin/drivers/${id}/vehicle`, { method: 'PATCH', body: { vehicleType } }));

  // driver settlements — balance owed to the platform, cash hand-ins, suspend / reactivate
  const driverSettlements = () =>
    api<ApiSuccess<DriverSettlementRow[]>>('/admin/drivers/settlements').then((r) => r.data);
  // one courier's daily report — last 7 days by default, or a whole month with `month=YYYY-MM`
  const driverReport = (id: string, month?: string) =>
    api<ApiSuccess<CourierDailyReportRow[]>>(`/admin/drivers/${id}/report`, { query: month ? { month } : {} }).then((r) => r.data);
  const recordRemittance = (id: string, amount: number, note?: string) =>
    wrap(() =>
      api(`/admin/drivers/${id}/remittances`, { method: 'POST', body: note ? { amount, note } : { amount } }),
    );
  const blockDriver = (id: string) =>
    wrap(() => api(`/admin/drivers/${id}/block`, { method: 'POST', body: {} }));
  const activateDriver = (id: string) =>
    wrap(() => api(`/admin/drivers/${id}/activate`, { method: 'POST', body: {} }));

  // errand pricing + platform commission (الإعدادات)
  const getErrandPricing = () =>
    api<ApiSuccess<ErrandPricing>>('/admin/errand-pricing').then((r) => r.data);
  const updateErrandPricing = (dto: ErrandPricingDto) =>
    wrap(() => api('/admin/errand-pricing', { method: 'PATCH', body: dto }));

  // zones (delivery areas)
  const listZones = () => api<ApiSuccess<ZoneAdminRow[]>>('/admin/zones').then((r) => r.data);
  const createZone = (dto: CreateZoneDto) =>
    wrap(() => api('/admin/zones', { method: 'POST', body: dto }));
  const setZoneActive = (id: string, active: boolean) =>
    wrap(() => api(`/admin/zones/${id}/${active ? 'activate' : 'deactivate'}`, { method: 'POST', body: {} }));

  return {
    listStores,
    getStore,
    createStore,
    updateStore,
    setStoreStatus,
    listProducts,
    createProduct,
    setProductAvailability,
    deleteProduct,
    listDrivers,
    createDriver,
    setDriverVehicle,
    driverSettlements,
    driverReport,
    recordRemittance,
    blockDriver,
    activateDriver,
    getErrandPricing,
    updateErrandPricing,
    listZones,
    createZone,
    setZoneActive,
  };
}
