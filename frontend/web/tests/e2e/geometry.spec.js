// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Reusable layout-integrity audit — persists the kind of check Copilot's own
 * one-off DOM auditor did (text overflow, safe-area violations, control
 * overlap) as a real regression suite instead of a manual pass that leaves no
 * trace. Intentionally NOT a pixel/visual test: it only asserts structural
 * integrity (nothing clipped, nothing unreachable, nothing overlapping) so it
 * stays stable across Copilot's ongoing visual/theme work.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Array<{type: string, selector: string, text: string, rect: any}>>}
 */
async function auditGeometry(page) {
  return page.evaluate(() => {
    /** @type {Array<{type: string, selector: string, text: string, rect: any}>} */
    const violations = [];

    const describe = (el) => {
      const cls = typeof el.className === 'string' ? el.className.split(' ').filter(Boolean).slice(0, 2).join('.') : '';
      return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`;
    };

    // 1. Horizontal page overflow — the body must never require sideways scroll.
    const root = document.documentElement;
    if (root.scrollWidth > root.clientWidth + 1) {
      violations.push({
        type: 'horizontal-overflow',
        selector: 'html',
        text: '',
        rect: { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth }
      });
    }

    // 2. Internal text overflow — a leaf text node whose own box can't fit its
    // content (as opposed to a deliberately truncated/ellipsis element).
    const textLeaves = document.querySelectorAll('p, span, h1, h2, h3, h4, button, a, label, div');
    for (const el of textLeaves) {
      if (el.children.length > 0) continue; // only true leaves
      const text = (el.textContent || '').trim();
      if (!text) continue;
      const style = getComputedStyle(el);
      if (style.textOverflow === 'ellipsis' || style.overflow === 'hidden') continue; // intentional clipping
      if (el.scrollWidth > el.clientWidth + 2 && style.whiteSpace === 'nowrap') {
        violations.push({ type: 'text-overflow', selector: describe(el), text: text.slice(0, 60), rect: el.getBoundingClientRect().toJSON() });
      }
    }

    // 3. Critical control overlap — every visible, enabled button/input/link
    // must hit-test to itself (or a descendant), never to an unrelated
    // overlay sitting on top of it. A control near the bottom of a page can
    // legitimately require scrolling to clear a fixed bottom dock (that's the
    // normal, correct way a bottom dock is supposed to work — unlike a fixed
    // TOP panel, which must never require scrolling to reach content below
    // it), so only flag it if it's STILL covered after scrolling it into view.
    const isReachable = (el) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      return hit === el || el.contains(hit) || (hit && hit.contains(el));
    };

    const controls = document.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
    for (const el of controls) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue; // not actually visible
      if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) continue; // offscreen, not a viewport violation

      if (isReachable(el)) continue;

      el.scrollIntoView({ block: 'center' });
      if (isReachable(el)) continue; // reachable once scrolled to — not a bug

      violations.push({
        type: 'control-overlap',
        selector: describe(el),
        text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 60),
        rect: el.getBoundingClientRect().toJSON()
      });
    }

    // 4. Player/dock collision — the two known global fixed-position chrome
    // elements must never overlap each other.
    const playerPanel = document.querySelector('section'); // FloatingPlayerButton's <Panel>
    const dock = document.querySelector('[data-chaplin-mobile-dock], nav[class*="Dock"], footer');
    if (playerPanel && dock) {
      const a = playerPanel.getBoundingClientRect();
      const b = dock.getBoundingClientRect();
      const overlap = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      if (overlap) {
        violations.push({ type: 'player-dock-collision', selector: 'Panel × dock', text: '', rect: { player: a.toJSON(), dock: b.toJSON() } });
      }
    }

    return violations;
  });
}

// Representative matrix — not exhaustive. Mobile portrait/landscape + tablet +
// desktop + large desktop, on the two routes reachable without auth (and the
// two routes with a documented history of real layout bugs this session).
const VIEWPORTS = [
  { name: 'mobile-portrait', width: 390, height: 844 },
  { name: 'mobile-landscape', width: 844, height: 390 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'large-desktop', width: 1920, height: 1080 }
];

const ROUTES = ['/login', '/register'];

for (const route of ROUTES) {
  for (const viewport of VIEWPORTS) {
    test(`geometry: ${route} @ ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      const violations = await auditGeometry(page);

      if (violations.length > 0) {
        const report = violations.map(v =>
          `  [${v.type}] route=${route} viewport=${viewport.name} selector="${v.selector}" text="${v.text}"`
        ).join('\n');
        expect(violations, `Geometry violations found:\n${report}`).toEqual([]);
      }
    });
  }
}
