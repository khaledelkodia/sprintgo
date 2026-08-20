import type {
  ApiSuccess,
  CourierOfferView,
  CourierSummaryView,
  CourierTaskView,
} from '@sprintgo/shared';
import { extractApiError, useApi } from '~/composables/useApi';

export function useCourier() {
  const api = useApi();

  function tasks() {
    return api<ApiSuccess<CourierTaskView[]>>('/courier/tasks').then((r) => r.data);
  }

  function currentOffer() {
    return api<ApiSuccess<CourierOfferView | null>>('/courier/offer').then((r) => r.data);
  }

  async function acceptOffer(orderId: string) {
    try {
      await api(`/courier/offer/${orderId}/accept`, { method: 'POST', body: {} });
    } catch (err) {
      throw extractApiError(err);
    }
  }

  async function rejectOffer(orderId: string) {
    try {
      await api(`/courier/offer/${orderId}/reject`, { method: 'POST', body: {} });
    } catch (err) {
      throw extractApiError(err);
    }
  }

  async function setAvailability(isAvailable: boolean) {
    try {
      await api('/courier/availability', { method: 'PATCH', body: { isAvailable } });
    } catch (err) {
      throw extractApiError(err);
    }
  }

  /** Location heartbeat while available (best-effort — never throws). */
  async function heartbeat(lat: number, lng: number) {
    try {
      await api('/courier/heartbeat', { method: 'PATCH', body: { lat, lng } });
    } catch {
      /* ignore */
    }
  }

  async function pickup(orderId: string) {
    try {
      await api(`/courier/tasks/${orderId}/pickup`, { method: 'POST', body: {} });
    } catch (err) {
      throw extractApiError(err);
    }
  }

  async function delivered(orderId: string, cashCollected?: number) {
    try {
      await api(`/courier/tasks/${orderId}/delivered`, { method: 'POST', body: { cashCollected } });
    } catch (err) {
      throw extractApiError(err);
    }
  }

  async function goodsCost(orderId: string, actualGoodsCost: number) {
    try {
      await api(`/courier/tasks/${orderId}/goods-cost`, { method: 'POST', body: { actualGoodsCost } });
    } catch (err) {
      throw extractApiError(err);
    }
  }

  function summary() {
    return api<ApiSuccess<CourierSummaryView>>('/courier/summary/today').then((r) => r.data);
  }

  return {
    tasks,
    currentOffer,
    acceptOffer,
    rejectOffer,
    setAvailability,
    heartbeat,
    pickup,
    delivered,
    goodsCost,
    summary,
  };
}
