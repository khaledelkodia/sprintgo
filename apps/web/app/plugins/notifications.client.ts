import { useAuthStore } from '~/features/auth/stores/auth.store';
import { useNotificationsStore } from '~/features/notifications/stores/notifications.store';

/**
 * Once the session is restored, load the unread count and start listening for
 * live notifications (badge + toast). Re-runs when the user logs in/out.
 */
export default defineNuxtPlugin(() => {
  const auth = useAuthStore();
  const notifications = useNotificationsStore();
  const toast = useToast();

  watch(
    () => auth.isLoggedIn,
    (loggedIn) => {
      if (loggedIn) {
        notifications.fetchUnread();
        notifications.bindRealtime((n) => toast.info(n.title));
      } else {
        notifications.reset();
      }
    },
    { immediate: true },
  );
});
