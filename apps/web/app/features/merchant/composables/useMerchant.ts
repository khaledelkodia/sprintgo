import type {
  ApiSuccess,
  MerchantOrderView,
  MerchantStatsView,
  OrderStatus,
} from '@sprintgo/shared';
import { extractApiError, useApi } from '~/composables/useApi';

export function useMerchant() {
  const api = useApi();

  function board(status?: OrderStatus) {
    return api<ApiSuccess<MerchantOrderView[]>>('/merchant/orders', {
      query: status ? { status } : {},
    }).then((r) => r.data);
  }

  async function action(id: string, verb: 'accept' | 'ready' | 'handover', body?: unknown) {
    try {
      await api(`/merchant/orders/${id}/${verb}`, { method: 'POST', body: body ?? {} });
    } catch (err) {
      throw extractApiError(err);
    }
  }

  async function reject(id: string, reason: string) {
    try {
      await api(`/merchant/orders/${id}/reject`, { method: 'POST', body: { reason } });
    } catch (err) {
      throw extractApiError(err);
    }
  }

  function stats() {
    return api<ApiSuccess<MerchantStatsView>>('/merchant/stats/today').then((r) => r.data);
  }

  return { board, action, reject, stats };
}
