import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Enabled in dev too so "Add to Home Screen" can be tested locally,
      // not just after a production build.
      devOptions: { enabled: true },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Krunchy Brunchy OMS',
        short_name: 'Krunchy Brunchy',
        description: 'Internal admin-only order & customer management system for Krunchy Brunchy.',
        start_url: '/orders',
        display: 'standalone',
        background_color: '#FAF6F0',
        theme_color: '#FF5A09',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache only the static app shell (JS/CSS/fonts/icons).
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Never let the service worker serve `/api/*` from cache — this is a
        // live admin tool for orders/revenue; a stale cached response here
        // would show wrong financial data. Requests just pass through to
        // the network untouched, same as if there were no service worker.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/[^/]+\/api\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],

  // ─── Dev Server ────────────────────────────────────────────────────────────
  server: {
    port: 5173,
    host: true, // bind 0.0.0.0 so Docker can forward the port
  },

  // ─── Production Build ──────────────────────────────────────────────────────
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,           // flip to true if you need to debug prod bundles
    chunkSizeWarningLimit: 1000, // warn above 1 MB chunks

    rollupOptions: {
      output: {
        // Split large third-party libraries into their own cacheable chunks
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@mui') || id.includes('node_modules/@emotion') || id.includes('node_modules/@mui/x-data-grid')) {
            return 'vendor-mui';
          }
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts';
          }
        },
      },
    },
  },

  // ─── Preview Server (vite preview / npm run serve) ─────────────────────────
  preview: {
    port: 4173,
    host: true,
  },
})

