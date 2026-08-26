import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Capacitor serves the bundle from its own local origin. Vite's `crossorigin`
 * attribute puts the module script into CORS mode, which that server has no
 * reason to satisfy — and a script that fails to load is a blank app with no
 * error anywhere. Nothing here is cross-origin, so the attribute only costs us.
 */
const stripCrossorigin = {
  name: 'sprintgo:strip-crossorigin',
  // only our own bundle's tags — the font preconnect genuinely needs crossorigin
  transformIndexHtml: (html: string) =>
    html.replace(/<(?:script|link)\b[^>]*>/g, (tag) =>
      /(?:src|href)="\//.test(tag) ? tag.replace(/ crossorigin(?:="[^"]*")?/g, '') : tag,
    ),
};

// Dev server proxies /api to the NestJS backend so the app reuses the same
// contract as the web dashboard. In the packaged APK, VITE_API_BASE points at
// the hosted API instead (a phone can't reach localhost).
export default defineConfig({
  plugins: [react(), tailwindcss(), stripCrossorigin],
  server: {
    port: 5175,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      // the realtime socket sits beside /api on the same backend
      '/socket.io': { target: 'http://localhost:4000', changeOrigin: true, ws: true },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
