import { defineStore } from 'pinia';
import type { ApiSuccess, NotificationView } from '@sprintgo/shared';
import { useApi } from '~/composables/useApi';
import { useRealtime } from '~/composables/useRealtime';

/**
 * Reactive notification state shared by the bell badge + the list page.
 * The unread count updates live via the notification:new socket hint.
 */
export const useNotificationsStore = defineStore('notifications', () => {
  const api = useApi();
  const items = ref<NotificationView[]>([]);
  const unread = ref(0);
  let bound = false;

  async function fetchUnread() {
    try {
      const res = await api<ApiSuccess<{ count: number }>>('/notifications/unread-count');
      unread.value = res.data.count;
    } catch {
      /* non-critical */
    }
  }

  async function fetchList() {
    const res = await api<ApiSuccess<NotificationView[]>>('/notifications');
    items.value = res.data;
  }

  async function markRead(id: string) {
    const item = items.value.find((n) => n.id === id);
    if (item && !item.read) {
      item.read = true;
      unread.value = Math.max(0, unread.value - 1);
    }
    try {
      await api(`/notifications/${id}/read`, { method: 'POST' });
    } catch {
      /* optimistic — server will reconcile on next fetch */
    }
  }

  async function markAllRead() {
    items.value.forEach((n) => (n.read = true));
    unread.value = 0;
    try {
      await api('/notifications/read-all', { method: 'POST' });
    } catch {
      /* optimistic */
    }
  }

  /** Subscribe once to live notifications (called after login). */
  function bindRealtime(onToast?: (n: NotificationView) => void) {
    if (bound) return;
    bound = true;
    useRealtime().on('notification:new', (payload) => {
      const n = payload as NotificationView;
      items.value = [n, ...items.value];
      unread.value += 1;
      onToast?.(n);
    });
  }

  function reset() {
    items.value = [];
    unread.value = 0;
  }

  return { items, unread, fetchUnread, fetchList, markRead, markAllRead, bindRealtime, reset };
});
