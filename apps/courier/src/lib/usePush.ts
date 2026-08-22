import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';

/** Remembered so logout can tell the backend to stop pushing to this phone. */
let currentToken: string | null = null;

const register = (token: string) =>
  api('/push/device', { method: 'POST', body: { token, platform: 'ANDROID' } });

/** Stop this phone receiving the signed-out courier's alerts. Best-effort. */
export async function unregisterPush(): Promise<void> {
  if (!currentToken) return;
  try {
    await api('/push/device/unregister', { method: 'POST', body: { token: currentToken } });
  } catch {
    /* best-effort */
  }
}

/**
 * Native push for the packaged APK. This matters more here than anywhere else:
 * an offer expires in 30 seconds, and until now a courier only saw it while the
 * app was open and polling. A no-op on the web build.
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
        if (perm.receive !== 'granted' || !alive) return;

        await PushNotifications.addListener('registration', (t) => {
          currentToken = t.value;
          void register(t.value).catch(() => {});
        });
        await PushNotifications.addListener('registrationError', () => {
          /* usually a missing google-services.json — nothing the courier can act on */
        });
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          // a new offer goes straight to the countdown screen; anything else to the task
          const type = action.notification.data?.type;
          navigate(type === 'delivery.offer' ? '/offer' : '/active');
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
        /* push is an enhancement — polling still finds the offer */
      }
    };
    void setup();

    return () => {
      alive = false;
      void PushNotifications.removeAllListeners().catch(() => {});
    };
  }, [signedIn, navigate]);
}
