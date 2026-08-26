import { env } from './env';

/**
 * Origins allowed to call the API and open a realtime socket.
 *
 * The packaged Android apps are not served from our domain — Capacitor runs the
 * bundle from `http(s)://localhost` (and `capacitor://localhost` on iOS), so
 * those are always permitted. Anything else (a deployed dashboard, a staging
 * host) is opt-in through CORS_ORIGINS.
 *
 * This is not the security boundary: every socket and every protected route
 * still needs a valid token. CORS only decides which browsers may try.
 */
const APP_ORIGINS = [
  'http://localhost',
  'https://localhost',
  'capacitor://localhost',
  'ionic://localhost',
];

export function corsOrigins(): (string | RegExp)[] {
  const extra = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const origins: (string | RegExp)[] = [...APP_ORIGINS, ...extra];
  if (env.NODE_ENV !== 'production') {
    // dev servers: the Nuxt dashboard and both Vite apps, on any port
    origins.push(/^http:\/\/localhost:\d+$/);
    // and the same machine reached over the LAN, so a phone on the same Wi-Fi
    // can hit the API directly (private ranges only, dev only)
    origins.push(/^http:\/\/(?:10|127)\.\d+\.\d+\.\d+(?::\d+)?$/);
    origins.push(/^http:\/\/192\.168\.\d+\.\d+(?::\d+)?$/);
    origins.push(/^http:\/\/172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+(?::\d+)?$/);
  }
  return origins;
}
