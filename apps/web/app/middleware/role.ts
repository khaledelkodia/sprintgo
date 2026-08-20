import type { Role } from '@sprintgo/shared';
import { useAuthStore } from '~/features/auth/stores/auth.store';

/**
 * Role gate for staff areas. Pair with 'auth' (which runs first and ensures
 * the session is loaded): definePageMeta({ middleware: ['auth', 'role'], role: 'MERCHANT' }).
 */
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return;

  const auth = useAuthStore();
  const meta = to.meta.role as Role | Role[] | undefined;
  if (!meta) return;

  const required = Array.isArray(meta) ? meta : [meta];
  if (!auth.user || !auth.user.roles.some((r) => required.includes(r))) {
    return navigateTo('/');
  }
});
