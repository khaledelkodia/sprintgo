import type { NotificationView } from '@sprintgo/shared';
import { api } from './api';

/** The customer's notification centre (paged; the app shows the first page). */
export const listNotifications = () => api<NotificationView[]>('/notifications', { query: { limit: 50 } });
export const unreadCount = () => api<{ count: number }>('/notifications/unread-count');
export const markRead = (id: string) => api(`/notifications/${id}/read`, { method: 'POST', body: {} });
export const markAllRead = () => api('/notifications/read-all', { method: 'POST', body: {} });
