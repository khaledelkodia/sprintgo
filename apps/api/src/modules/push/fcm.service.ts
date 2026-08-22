import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { JWT } from 'google-auth-library';
import { env } from '../../core/config/env';

export interface FcmMessage {
  title: string;
  body: string;
  /** Extra keys the app reads on tap. FCM only carries strings, so values are stringified. */
  data?: Record<string, unknown>;
}

/** Per-token outcome so the caller can prune tokens that will never work again. */
export interface FcmSendResult {
  token: string;
  ok: boolean;
  gone: boolean;
}

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

/**
 * Firebase Cloud Messaging (HTTP v1) — the only way to reach the Android apps
 * while they are closed. Authenticated with a service account; google-auth-library
 * mints and caches the access token, so we never hand-roll OAuth.
 *
 * Silently inert without credentials: the platform must run fine on a machine
 * that has no Firebase project (dev, CI, a fresh clone).
 */
@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger('FCM');
  private client: JWT | null = null;

  onModuleInit(): void {
    const { FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY } = env;
    if (!FCM_PROJECT_ID || !FCM_CLIENT_EMAIL || !FCM_PRIVATE_KEY) {
      this.logger.warn('FCM disabled — set FCM_PROJECT_ID / FCM_CLIENT_EMAIL / FCM_PRIVATE_KEY to enable');
      return;
    }
    this.client = new JWT({
      email: FCM_CLIENT_EMAIL,
      // .env files carry the key with literal \n — turn them back into newlines
      key: FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: [SCOPE],
    });
    this.logger.log(`FCM enabled (project ${FCM_PROJECT_ID})`);
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  /** Send one message per token. Never throws — push is best-effort by design. */
  async send(tokens: string[], msg: FcmMessage): Promise<FcmSendResult[]> {
    if (!this.client || tokens.length === 0) return [];
    const url = `https://fcm.googleapis.com/v1/projects/${env.FCM_PROJECT_ID}/messages:send`;
    // FCM data values must be strings
    const data: Record<string, string> = {};
    for (const [k, v] of Object.entries(msg.data ?? {})) {
      if (v !== undefined && v !== null) data[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }

    return Promise.all(
      tokens.map(async (token): Promise<FcmSendResult> => {
        try {
          await this.client!.request({
            url,
            method: 'POST',
            data: {
              message: {
                token,
                notification: { title: msg.title, body: msg.body },
                data,
                android: {
                  priority: 'HIGH',
                  // the channel the apps create on boot — without it Android 8+
                  // drops the notification into a silent default channel
                  notification: { channel_id: 'sprintgo', sound: 'default' },
                },
              },
            },
          });
          return { token, ok: true, gone: false };
        } catch (err) {
          const status = (err as { response?: { status?: number } }).response?.status;
          // 404 = the app was uninstalled or the token rotated; 400 = malformed token
          const gone = status === 404 || status === 400;
          if (!gone) this.logger.warn(`FCM send failed (${status ?? 'network'})`);
          return { token, ok: false, gone };
        }
      }),
    );
  }
}
