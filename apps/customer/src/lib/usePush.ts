import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';

/** Remembered so logout can tell the backend to stop pushing to this phone. */
let currentToken: string | null = null;

/** Hand the phone's FCM token to the backend. */
const register = (token: string) =>
  api('/push/device', { method: 'POST', body: { token, platform: 'ANDROID' } });

/**
 * Stop this phone receiving the signed-out user's alerts. Best-effort: if it
 * fails the backend still moves the token on the next sign-in, because tokens
 * are keyed by the token itself, not the user.
 */
export async function unregisterPush(): Promise<void> {
  if (!currentToken) return;
  try {
    await api('/push/device/unregister', { method: 'POST', body: { token: currentToken } });
  } catch {
    /* best-effort */
  }
}

/**
 * Native push for the packaged APK. On the web this is a no-op — the browser
 * build has no FCM and must not prompt for anything.
 *
 * Runs once the user is signed in, because a token is only useful when we know
 * whose phone it is. Tapping a notification that carries an orderId opens that
 * order's tracking screen.
 */
export function usePush(signedIn: boolean): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!signedIn || !Capacitor.isNativePlatform()) return;
    let alive = true;

    const setup = async () => {
      try {
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
          perm = await PushNotifications.requestPermissions();
        }
        // a refusal is a legitimate answer — the in-app notification centre still works
        if (perm.receive !== 'granted' || !alive) return;

        await PushNotifications.addListener('registration', (t) => {
          currentToken = t.value;
          void register(t.value).catch(() => {});
        });
        await PushNotifications.addListener('registrationError', () => {
          /* usually a missing google-services.json — nothing the user can act on */
        });
        // tapped while the app was closed or in the background
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const orderId = action.notification.data?.orderId;
          if (typeof orderId === 'string' && orderId) navigate(`/track/${orderId}`);
        });

        // Android 8+ silences anything without a channel; the id matches what the
        // backend sends so alerts arrive with sound instead of quietly.
        if (Capacitor.getPlatform() === 'android') {
          await PushNotifications.createChannel({
            id: 'sprintgo',
            name: 'إشعارات سبرنت جو',
            importance: 5,
            visibility: 1,
            sound: 'default',
          }).catch(() => {});
        }

        await PushNotifications.register();
      } catch {
        /* push is an enhancement — never break the app over it */
      }
    };
    void setup();

    return () => {
      alive = false;
      void PushNotifications.removeAllListeners().catch(() => {});
    };
  }, [signedIn, navigate]);
}
