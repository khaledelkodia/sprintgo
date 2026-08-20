import type {
  CourierDailyReportRow,
  CourierOfferView,
  CourierSummaryView,
  CourierTaskView,
  CourierWalletView,
} from '@sprintgo/shared';
import { api } from './api';

/** Go online/offline for new offers. */
export const setAvailability = (isAvailable: boolean) =>
  api('/courier/availability', { method: 'PATCH', body: { isAvailable } });

/** The current delivery offered to this courier (null when none). */
export const getOffer = () => api<CourierOfferView | null>('/courier/offer');
export const acceptOffer = (orderId: string) => api(`/courier/offer/${orderId}/accept`, { method: 'POST', body: {} });
export const rejectOffer = (orderId: string) => api(`/courier/offer/${orderId}/reject`, { method: 'POST', body: {} });

/** The courier's active tasks (accepted, in progress). */
export const getTasks = () => api<CourierTaskView[]>('/courier/tasks');
export const pickupTask = (orderId: string) => api(`/courier/tasks/${orderId}/pickup`, { method: 'POST', body: {} });
export const enterGoodsCost = (orderId: string, actualGoodsCost: number) =>
  api(`/courier/tasks/${orderId}/goods-cost`, { method: 'POST', body: { actualGoodsCost } });
export const markDelivered = (orderId: string, cashCollected?: number) =>
  api(`/courier/tasks/${orderId}/delivered`, { method: 'POST', body: cashCollected != null ? { cashCollected } : {} });

/** Today's earnings summary. */
export const getSummary = () => api<CourierSummaryView>('/courier/summary/today');

/** Wallet: today's earnings + the standing balance owed to the platform (+ block state). */
export const getWallet = () => api<CourierWalletView>('/courier/wallet');

/** Daily report: last 7 days by default, or a specific month (YYYY-MM). */
export const getReport = (month?: string) =>
  api<CourierDailyReportRow[]>('/courier/report', { query: month ? { month } : undefined });
