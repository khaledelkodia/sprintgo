import type { AddressView, ApiSuccess, CreateAddressDto, UpdateAddressDto } from '@sprintgo/shared';
import { extractApiError, useApi } from '~/composables/useApi';

export function useAddresses() {
  const api = useApi();

  function list() {
    return api<ApiSuccess<AddressView[]>>('/addresses').then((r) => r.data);
  }

  async function create(dto: CreateAddressDto): Promise<AddressView> {
    try {
      const res = await api<ApiSuccess<AddressView>>('/addresses', { method: 'POST', body: dto });
      return res.data;
    } catch (err) {
      throw extractApiError(err);
    }
  }

  async function update(id: string, dto: UpdateAddressDto): Promise<AddressView> {
    try {
      const res = await api<ApiSuccess<AddressView>>(`/addresses/${id}`, { method: 'PATCH', body: dto });
      return res.data;
    } catch (err) {
      throw extractApiError(err);
    }
  }

  async function remove(id: string): Promise<void> {
    try {
      await api(`/addresses/${id}`, { method: 'DELETE' });
    } catch (err) {
      throw extractApiError(err);
    }
  }

  return { list, create, update, remove };
}
