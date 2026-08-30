import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const vitePort = Number(process.env.VITE_PORT || 5173);
const strictPort = process.env.VITE_STRICT_PORT === 'true';
const viteHost = process.env.VITE_HOST || '127.0.0.1';
const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:8000';
const radioTarget = process.env.VITE_RADIO_TARGET || 'http://localhost:8001';

export default defineConfig({
  root: '.',
  plugins: [
    react(),
    VitePWA({
      // 'prompt' + no skipWaiting/clientsClaim below = a new service worker
      // installs and waits; it only takes control once every open tab has
      // been closed and reopened. That's deliberate — CHAPLIN MOBILE ALPHA
      // Prioridad 21 says never force a reload while music might be playing.
      registerType: 'prompt',
      manifestFilename: 'manifest.webmanifest',
      manifest: false, // manifest.webmanifest is hand-authored in public/ already
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      workbox: {
        // Only the actual app shell (JS/CSS/HTML/build-time images) gets
        // precached. Uploaded music and any private media live under
        // /media/* on the API origin, never touched by this glob.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/media\//],
        runtimeCaching: [
          {
            // Never cache API responses — always hit the network. Covers
            // both authenticated (/users/me, private playlists) and public
            // endpoints alike; simplicity over a hand-tuned per-route policy
            // for this alpha pass.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly'
          },
          {
            // Uploaded media (public or private) is never cached by the
            // service worker — the backend's own /media/{filename}
            // authorization check must run on every request.
            urlPattern: ({ url }) => url.pathname.startsWith('/media/'),
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ],
  server: {
    host: viteHost,
    port: vitePort,
    strictPort,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true
      },
      '/media': {
        target: apiTarget,
        changeOrigin: true
      },
      '/radio-api': {
        target: radioTarget,
        changeOrigin: true
      }
    }
  }
});
