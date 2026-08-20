import { useAuthStore } from '~/features/auth/stores/auth.store';

/**
 * Fine-grained gate for dashboard pages. Runs after 'auth' + 'role' and hides
 * pages the staff member lacks permission for (server still enforces every
 * request). Usage: definePageMeta({ middleware: ['auth', 'role', 'permission'],
 * role: ['ADMIN','SUPER_ADMIN'], permission: 'roles.manage' }).
 */
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return;

  const meta = to.meta.permission as string | string[] | undefined;
  if (!meta) return;

  const auth = useAuthStore();
  const required = Array.isArray(meta) ? meta : [meta];
  // Needs every listed permission (mirrors the server guard).
  if (!required.every((p) => auth.can(p))) {
    return navigateTo('/admin');
  }
});
