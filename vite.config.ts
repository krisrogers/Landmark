import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

const basePath = process.env.VITE_BASE_PATH || '/';
// PR preview deploys are served under /pr/<n>/. There we DON'T want a caching
// service worker (it hides fresh deploys); a self-destroying SW unregisters any
// previously installed one and clears its caches, so reloads always show latest.
const isPreview = basePath.includes('/pr/');

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      scope: basePath,
      registerType: 'autoUpdate',
      selfDestroying: isPreview,
      includeAssets: ['favicon.ico', 'icons/*.png', 'templates/*.json'],
      manifest: {
        name: 'Landmark',
        short_name: 'Landmark',
        description: 'Offline-first field notebook and land-planning system',
        theme_color: '#16a34a',
        background_color: '#f5f5f4',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,wasm}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*tile.*\.png$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    exclude: ['sql.js']
  },
  build: {
    target: 'es2020'
  }
});
