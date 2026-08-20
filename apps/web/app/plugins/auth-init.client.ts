import { useAuthStore } from '~/features/auth/stores/auth.store';

/** Restore the session on app start — non-blocking, guests stay guests. */
export default defineNuxtPlugin(() => {
  const auth = useAuthStore();
  void auth.fetchMe();
});
