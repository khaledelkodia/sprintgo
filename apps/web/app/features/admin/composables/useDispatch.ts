import type {
  ApiSuccess,
  CourierListItemView,
  CourierSuggestionView,
  DispatchItemView,
} from '@sprintgo/shared';
import { extractApiError, useApi } from '~/composables/useApi';

export function useDispatch() {
  const api = useApi();

  function queue() {
    return api<ApiSuccess<DispatchItemView[]>>('/admin/dispatch/queue').then((r) => r.data);
  }

  function couriers(availableOnly = false) {
    return api<ApiSuccess<CourierListItemView[]>>('/admin/dispatch/couriers', {
      query: availableOnly ? { available: '1' } : {},
    }).then((r) => r.data);
  }

  function suggestions(orderId: string) {
    return api<ApiSuccess<CourierSuggestionView[]>>(
      `/admin/dispatch/orders/${orderId}/suggestions`,
    ).then((r) => r.data);
  }

  async function assignNearest(orderId: string) {
    try {
      const res = await api<ApiSuccess<{ courierId: string; courierName: string | null }>>(
        `/admin/dispatch/orders/${orderId}/assign-nearest`,
        { method: 'POST', body: {} },
      );
      return res.data;
    } catch (err) {
      throw extractApiError(err);
    }
  }

  async function assign(orderId: string, courierId: string) {
    try {
      await api(`/admin/dispatch/orders/${orderId}/assign`, { method: 'POST', body: { courierId } });
    } catch (err) {
      throw extractApiError(err);
    }
  }

  async function reassign(orderId: string, courierId: string, reason?: string) {
    try {
      await api(`/admin/dispatch/orders/${orderId}/reassign`, {
        method: 'POST',
        body: { courierId, reason },
      });
    } catch (err) {
      throw extractApiError(err);
    }
  }

  return { queue, couriers, suggestions, assignNearest, assign, reassign };
}
