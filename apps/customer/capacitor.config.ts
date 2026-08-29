import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor wraps the built web app (dist/) into a native Android shell so
 * GitHub Actions can produce an installable APK. `appName` is the Arabic label
 * shown under the launcher icon.
 */

// Pointing the app at a plain-http API (a machine on the same Wi-Fi, before
// there is a hosted one) needs two things Android otherwise refuses:
//   · the app must serve itself over http too — a page on https calling http is
//     mixed content and the WebView drops it silently;
//   · cleartext traffic must be allowed at all, which Android blocks by default.
// Both are switched on only for an http API, so a real https deployment is
// unaffected. `http://localhost` still counts as a secure origin in Chromium,
// so geolocation keeps working.
const apiBase = process.env.VITE_API_BASE ?? '';
const insecureApi = apiBase.startsWith('http://');

const config: CapacitorConfig = {
  appId: 'com.sprintgo.customer',
  appName: 'سبرينت جو',
  webDir: 'dist',
  android: {
    backgroundColor: '#F8FAFC',
  },
  ...(insecureApi ? { server: { androidScheme: 'http', cleartext: true } } : {}),
};

export default config;
