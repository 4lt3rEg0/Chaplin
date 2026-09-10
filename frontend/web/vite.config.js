import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'node:fs';
import path from 'node:path';

const vitePort = Number(process.env.VITE_PORT || 5173);
const strictPort = process.env.VITE_STRICT_PORT === 'true';
const viteHost = process.env.VITE_HOST || '127.0.0.1';
const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:8000';
const radioTarget = process.env.VITE_RADIO_TARGET || 'http://localhost:8001';

const PLAYERS_ROOT = path.resolve(__dirname, 'src/assets/profilePlayers');

// Dev-only save backend for Skin Studio (/dev/skin-studio). Never built
// into production — only registered while `vite dev` is running — so it
// can write straight to disk with no auth of its own. Lets the editor
// really persist manifest.json (x/y/width/height/zIndex/etc, the exact
// shape BubblegumGlossSkin.jsx / render_from_manifest.py already read)
// instead of the "copy this from devtools console" pattern.
function skinStudioDevApi() {
  return {
    name: 'skin-studio-dev-api',
    configureServer(server) {
      server.middlewares.use('/__skin_studio', (req, res, next) => {
        const url = new URL(req.url, 'http://x');
        const send = (code, body) => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        };
        const safePlayerId = (id) => /^[a-z0-9-]+$/.test(id || '');

        try {
          if (url.pathname === '/players' && req.method === 'GET') {
            const dirs = fs.existsSync(PLAYERS_ROOT)
              ? fs.readdirSync(PLAYERS_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
              : [];
            return send(200, { players: dirs });
          }

          const playerId = url.searchParams.get('player');
          if (!safePlayerId(playerId)) return send(400, { error: 'invalid player id' });
          const playerDir = path.join(PLAYERS_ROOT, playerId);

          if (url.pathname === '/assets' && req.method === 'GET') {
            if (!fs.existsSync(playerDir)) return send(200, { assets: [] });
            const out = [];
            const walk = (dir, rel) => {
              for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                if (entry.name.startsWith('_') || entry.name === 'reconstruction-validation') continue;
                const full = path.join(dir, entry.name);
                const relPath = rel ? `${rel}/${entry.name}` : entry.name;
                if (entry.isDirectory()) walk(full, relPath);
                else if (/\.(png|webp|jpg|jpeg)$/i.test(entry.name)) out.push(relPath);
              }
            };
            walk(playerDir, '');
            return send(200, { assets: out.sort() });
          }

          if (url.pathname === '/manifest' && req.method === 'GET') {
            const manifestPath = path.join(playerDir, 'manifest.json');
            if (!fs.existsSync(manifestPath)) return send(200, { manifest: null });
            return send(200, { manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) });
          }

          if (url.pathname === '/manifest' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                fs.mkdirSync(playerDir, { recursive: true });
                fs.writeFileSync(path.join(playerDir, 'manifest.json'), JSON.stringify(parsed, null, 2) + '\n', 'utf-8');
                send(200, { ok: true });
              } catch (e) {
                send(500, { error: String(e) });
              }
            });
            return;
          }

          if (url.pathname === '/create_player' && req.method === 'POST') {
            fs.mkdirSync(playerDir, { recursive: true });
            for (const sub of ['shell', 'screen', 'controls', 'decoration']) {
              fs.mkdirSync(path.join(playerDir, sub), { recursive: true });
            }
            return send(200, { ok: true });
          }

          return next();
        } catch (e) {
          return send(500, { error: String(e) });
        }
      });
    }
  };
}

export default defineConfig({
  root: '.',
  plugins: [
    react(),
    skinStudioDevApi(),
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
    // Lets the dev server answer through the ngrok tunnel used for
    // out-of-home mobile testing (see tools/ngrok setup) - Vite 5+ rejects
    // any Host header not on this list as a DNS-rebinding protection.
    allowedHosts: ['sleet-graveness-pebble.ngrok-free.dev'],
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
