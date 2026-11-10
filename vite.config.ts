import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';
import path from 'path';

const basePath = process.env.VITE_BASE_PATH || '/';

// Build identity, stamped into the bundle and shown as an on-screen badge so it
// is obvious which deploy is running after a refresh.
function commitSha(): string {
  const explicit = process.env.VITE_COMMIT_SHA || process.env.GITHUB_SHA;
  if (explicit) return explicit.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}
const buildId = commitSha();
const buildTime = new Date().toISOString();

export default defineConfig({
  base: basePath,
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [
    react(),
    VitePWA({
      scope: basePath,
      registerType: 'autoUpdate',
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
        // Exclude HTML from precache so navigations are served network-first
        // (always fresh online) rather than from a stale cached app shell.
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2,wasm}'],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // App shell / page navigations: fresh when online, cache as fallback.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 8 },
            },
          },
          {
            // JS/CSS/workers/fonts: serve cached fast, refresh in background.
            urlPattern: ({ request }) =>
              ['style', 'script', 'worker', 'font'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'assets' },
          },
          {
            // Basemap tiles (OSM + Esri satellite) — cache for offline use.
            urlPattern: ({ url }) =>
              url.hostname.includes('tile') || url.hostname.includes('arcgisonline'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: {
                maxEntries: 800,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
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
