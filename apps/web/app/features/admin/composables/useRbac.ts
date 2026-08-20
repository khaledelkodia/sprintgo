import type {
  ApiSuccess,
  AppRoleView,
  CreateRoleDto,
  CreateStaffDto,
  PermissionGroupView,
  StaffView,
  UpdateRoleDto,
} from '@sprintgo/shared';
import { extractApiError, useApi } from '~/composables/useApi';

export function useRbac() {
  const api = useApi();
  const wrap = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      throw extractApiError(err);
    }
  };

  // permission catalog + roles
  const permissionCatalog = () =>
    api<ApiSuccess<PermissionGroupView[]>>('/admin/permissions').then((r) => r.data);
  const listRoles = () => api<ApiSuccess<AppRoleView[]>>('/admin/roles').then((r) => r.data);
  const createRole = (dto: CreateRoleDto) =>
    wrap(() => api<ApiSuccess<AppRoleView>>('/admin/roles', { method: 'POST', body: dto }).then((r) => r.data));
  const updateRole = (id: string, dto: UpdateRoleDto) =>
    wrap(() => api<ApiSuccess<AppRoleView>>(`/admin/roles/${id}`, { method: 'PATCH', body: dto }).then((r) => r.data));
  const deleteRole = (id: string) =>
    wrap(() => api(`/admin/roles/${id}`, { method: 'DELETE' }));

  // staff
  const listStaff = () => api<ApiSuccess<StaffView[]>>('/admin/staff').then((r) => r.data);
  const createStaff = (dto: CreateStaffDto) =>
    wrap(() => api<ApiSuccess<{ id: string; phone: string; name: string | null }>>('/admin/staff', { method: 'POST', body: dto }).then((r) => r.data));
  const setStaffRoles = (id: string, roleIds: string[]) =>
    wrap(() => api<ApiSuccess<StaffView>>(`/admin/staff/${id}/roles`, { method: 'PATCH', body: { roleIds } }).then((r) => r.data));
  const setStaffStatus = (id: string, action: 'suspend' | 'activate') =>
    wrap(() => api<ApiSuccess<StaffView>>(`/admin/staff/${id}/${action}`, { method: 'POST', body: {} }).then((r) => r.data));

  return {
    permissionCatalog,
    listRoles,
    createRole,
    updateRole,
    deleteRole,
    listStaff,
    createStaff,
    setStaffRoles,
    setStaffStatus,
  };
}
