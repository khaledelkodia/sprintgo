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
  // dev servers: the Nuxt dashboard and both Vite apps, on any port
  if (env.NODE_ENV !== 'production') origins.push(/^http:\/\/localhost:\d+$/);
  return origins;
}
