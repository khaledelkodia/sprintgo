import type { ApiSuccess } from '@sprintgo/shared';
import { useApi } from '~/composables/useApi';

/** VAPID public key (base64url) → Uint8Array for pushManager.subscribe. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export type PushResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'disabled' | 'denied' | 'error' };

/** Web Push enrolment for the current device. */
export function usePush() {
  const api = useApi();

  const supported = () =>
    import.meta.client &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const permission = (): NotificationPermission =>
    supported() ? Notification.permission : 'default';

  async function enable(): Promise<PushResult> {
    if (!supported()) return { ok: false, reason: 'unsupported' };
    try {
      const key = (await api<ApiSuccess<{ publicKey: string | null }>>('/push/public-key')).data.publicKey;
      if (!key) return { ok: false, reason: 'disabled' };

      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return { ok: false, reason: 'denied' };

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // runtime value is a valid Uint8Array; cast past the strict BufferSource generic
        applicationServerKey: urlBase64ToUint8Array(key) as unknown as BufferSource,
      });
      await api('/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON() } });
      return { ok: true };
    } catch {
      return { ok: false, reason: 'error' };
    }
  }

  async function isEnrolled(): Promise<boolean> {
    if (!supported() || Notification.permission !== 'granted') return false;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return !!sub;
  }

  return { supported, permission, enable, isEnrolled };
}
