import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor wraps the built web app (dist/) into a native Android shell so
 * GitHub Actions can produce an installable APK. `appName` is the Arabic label
 * shown under the launcher icon.
 */
const config: CapacitorConfig = {
  appId: 'com.sprintgo.customer',
  appName: 'سبرينت جو',
  webDir: 'dist',
  android: {
    backgroundColor: '#F8FAFC',
  },
};

export default config;
