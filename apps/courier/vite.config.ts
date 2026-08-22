import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Dev proxies /api to the NestJS backend; the packaged APK uses VITE_API_BASE.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5176,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      // the realtime socket sits beside /api on the same backend
      '/socket.io': { target: 'http://localhost:4000', changeOrigin: true, ws: true },
    },
  },
  build: { outDir: 'dist', sourcemap: false },
});
