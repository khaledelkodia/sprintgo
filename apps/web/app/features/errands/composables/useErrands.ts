import type { ApiSuccess, CreateErrandDto, OrderView } from '@sprintgo/shared';
import { extractApiError, useApi } from '~/composables/useApi';

export function useErrands() {
  const api = useApi();

  async function create(dto: CreateErrandDto): Promise<OrderView> {
    try {
      const res = await api<ApiSuccess<OrderView>>('/errands', { method: 'POST', body: dto });
      return res.data;
    } catch (err) {
      throw extractApiError(err);
    }
  }

  return { create };
}
