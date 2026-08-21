import type {
  CreateErrandDto,
  ErrandQuoteView,
  OrderCardView,
  OrderView,
  VehicleType,
  ZoneView,
} from '@sprintgo/shared';
import { api } from './api';

/** Delivery zones for the errand pickup/dropoff selectors. */
export const getZones = () => api<ZoneView[]>('/zones');

/** Live delivery-fee preview for an errand (distance-based). */
export const getErrandQuote = (params: {
  zoneId: string;
  sourceStoreId?: string;
  lat?: number;
  lng?: number;
  pickupLat?: number;
  pickupLng?: number;
  vehicleType?: VehicleType;
}) =>
  api<ErrandQuoteView>('/errands/quote', { query: params });

/** Create a customer errand (مشوار). Returns the created order — the backend
 *  immediately auto-offers it to the nearest available courier. */
export const createErrand = (dto: CreateErrandDto) => api<OrderView>('/errands', { method: 'POST', body: dto });

/** Full order for the tracking screen (status, timeline, courier). */
export const getOrder = (id: string) => api<OrderView>(`/orders/${id}`);

/** The customer's orders (current + past). */
export const listMyOrders = () => api<OrderCardView[]>('/orders');

/** Cancel a placed order (before a courier is on the way). */
export const cancelOrder = (id: string) => api(`/orders/${id}/cancel`, { method: 'POST', body: {} });
