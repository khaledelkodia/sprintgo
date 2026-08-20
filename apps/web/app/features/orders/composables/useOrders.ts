import type { ApiSuccess, OrderCardView, OrderView, PlaceOrderDto } from '@sprintgo/shared';
import { extractApiError, useApi } from '~/composables/useApi';

export function useOrders() {
  const api = useApi();

  async function place(dto: PlaceOrderDto, idempotencyKey: string): Promise<OrderView> {
    try {
      const res = await api<ApiSuccess<OrderView>>('/orders', {
        method: 'POST',
        body: dto,
        headers: { 'Idempotency-Key': idempotencyKey },
      });
      return res.data;
    } catch (err) {
      throw extractApiError(err);
    }
  }

  function list() {
    return api<ApiSuccess<OrderCardView[]>>('/orders').then((r) => r.data);
  }

  function get(id: string) {
    return api<ApiSuccess<OrderView>>(`/orders/${id}`).then((r) => r.data);
  }

  async function cancel(id: string, reason?: string): Promise<OrderView> {
    try {
      const res = await api<ApiSuccess<OrderView>>(`/orders/${id}/cancel`, {
        method: 'POST',
        body: { reason },
      });
      return res.data;
    } catch (err) {
      throw extractApiError(err);
    }
  }

  return { place, list, get, cancel };
}
