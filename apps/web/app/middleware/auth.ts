import { useAuthStore } from '~/features/auth/stores/auth.store';

/**
 * Guard for pages that need a signed-in customer. Guest browsing stays open;
 * login is requested only when the user reaches a protected step (checkout).
 * Auth is cookie/client-resolved, so this runs on the client.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  const auth = useAuthStore();
  // A reload restores the user optimistically from storage — let them straight in
  // and let the background /me re-validate. Only block on the network for a truly
  // cold start (no cached user yet).
  if (!auth.isLoggedIn && !auth.initialized) await auth.fetchMe();

  if (!auth.isLoggedIn) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }
});
