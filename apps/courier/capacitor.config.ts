import type { CapacitorConfig } from '@capacitor/cli';

/** Wraps the built courier web app into a native Android shell for APK builds. */
const config: CapacitorConfig = {
  appId: 'com.sprintgo.courier',
  appName: 'سبرينت جو كابتن',
  webDir: 'dist',
  android: {
    backgroundColor: '#F8FAFC',
  },
};

export default config;
