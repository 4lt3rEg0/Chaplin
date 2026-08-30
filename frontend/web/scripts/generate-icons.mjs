// One-off icon generator for the PWA manifest — reuses the app's existing
// identity (🎭, dark navy background #060816, cyan accent #7af7ff) rather
// than inventing new branding. Run with: node scripts/generate-icons.mjs
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const iconHtml = (size, safeZonePct) => `
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  html, body { margin: 0; padding: 0; }
  .icon {
    width: ${size}px; height: ${size}px;
    background: radial-gradient(circle at 32% 28%, #10203a 0%, #060816 68%);
    display: flex; align-items: center; justify-content: center;
    position: relative;
  }
  .ring {
    position: absolute;
    inset: ${size * (1 - safeZonePct) / 2 + size * 0.05}px;
    border-radius: 50%;
    border: ${Math.max(2, size * 0.012)}px solid #7af7ff;
    box-shadow: 0 0 ${size * 0.08}px ${size * 0.008}px rgba(122,247,255,0.55), inset 0 0 ${size * 0.06}px rgba(122,247,255,0.25);
  }
  .mark {
    font-size: ${size * safeZonePct * 0.52}px;
    line-height: 1;
    filter: drop-shadow(0 0 ${size * 0.05}px rgba(122,247,255,0.65));
  }
</style></head><body>
  <div class="icon"><div class="ring"></div><div class="mark">🎭</div></div>
</body></html>`;

const targets = [
  { file: 'icon-192.png', size: 192, safeZonePct: 0.82 },
  { file: 'icon-512.png', size: 512, safeZonePct: 0.82 },
  // Maskable icons get masked to a shape (circle, squircle, ...) by the OS —
  // content must stay inside the inner ~80% "safe zone" or it gets clipped.
  { file: 'icon-maskable-512.png', size: 512, safeZonePct: 0.6 },
  { file: 'apple-touch-icon.png', size: 180, safeZonePct: 0.82 },
  { file: 'favicon-32.png', size: 32, safeZonePct: 0.82 }
];

const browser = await chromium.launch();
for (const t of targets) {
  const page = await browser.newPage({ viewport: { width: t.size, height: t.size } });
  await page.setContent(iconHtml(t.size, t.safeZonePct));
  await page.waitForTimeout(80); // let the emoji glyph paint
  const outPath = path.join(publicDir, t.file);
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: t.size, height: t.size } });
  console.log(`[OK] ${t.file} (${t.size}x${t.size})`);
  await page.close();
}
await browser.close();
