import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2026-07-01',

  modules: ['@pinia/nuxt', '@vueuse/nuxt'],

  // Design-system primitives keep their `Sg*` name (no `Ui` dir-prefix);
  // feature components (features/**/components) are auto-imported by filename
  // so pages can compose them without manual imports.
  components: [
    { path: '~/components/ui', pathPrefix: false },
    { path: '~/features', pathPrefix: false, pattern: '**/components/**' },
    '~/components',
  ],

  css: ['~/assets/css/main.css'],

  vite: {
    // cast: the tailwind plugin ships its own vite types, which TS treats
    // as a different identity than nuxt's vite — runtime is unaffected
    plugins: [tailwindcss() as never],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'ar', dir: 'rtl' },
      title: 'سبرنت جو — لوحة التحكم',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#ffffff' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap',
        },
      ],
    },
  },

  runtimeConfig: {
    // server-side (SSR) calls the API directly — relative URLs don't resolve
    // through the dev proxy during internal server fetch
    apiBase: process.env.NUXT_API_BASE || 'http://localhost:4000/api/v1',
    public: {
      // client-side uses the same-origin proxy so httpOnly cookies flow (ADR-003)
      apiBase: '/api/v1',
    },
  },

  // Same-origin in dev too: the web app proxies /api → NestJS,
  // so httpOnly cookies work with zero CORS (ADR-003).
  nitro: {
    devProxy: {
      '/api': { target: 'http://localhost:4000/api', changeOrigin: false },
      // NOTE: the /socket.io ws devProxy was removed — Nitro's dev websocket
      // forwarding aborts mid-write (write ECONNABORTED) and crashes the whole
      // dev server. Realtime is disabled in dev (useRealtime skips the socket and
      // the app falls back to REST + polling); wire it via a real reverse proxy
      // for production instead.
    },
  },
});
