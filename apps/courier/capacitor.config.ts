import type { CapacitorConfig } from '@capacitor/cli';

/** Wraps the built courier web app into a native Android shell for APK builds. */

// See apps/customer/capacitor.config.ts — an http API needs the app to serve
// itself over http (mixed content) and needs cleartext allowed. Only for http.
const apiBase = process.env.VITE_API_BASE ?? '';
const insecureApi = apiBase.startsWith('http://');

const config: CapacitorConfig = {
  appId: 'com.sprintgo.courier',
  appName: 'سبرينت جو كابتن',
  webDir: 'dist',
  android: {
    backgroundColor: '#F8FAFC',
  },
  ...(insecureApi ? { server: { androidScheme: 'http', cleartext: true } } : {}),
};

export default config;
