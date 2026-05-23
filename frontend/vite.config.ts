import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

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

