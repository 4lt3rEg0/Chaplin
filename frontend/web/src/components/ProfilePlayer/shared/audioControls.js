// Generic, non-visual helpers shared by every skin — pure math/DOM utilities,
// never anatomy. Each skin still builds its own bespoke SVG/CSS composition;
// this only avoids re-deriving the same drag math and mm:ss formatting eleven
// times. Nothing here draws a shape, picks a color, or implies a silhouette.
import { useCallback, useRef } from 'react';

export const fmtTime = (value) => {
  if (!Number.isFinite(value)) return '00:00';
  const safe = Math.max(0, Math.floor(value));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// setPointerCapture can throw (NotFoundError) if the pointer id it's given
// is no longer active — a real race with fast pointerup/cancel sequences.
// Every drag handler wants the capture attempt to never abort the rest of
// the handler (the value the user just clicked/dragged to must still apply
// even if capture fails).
export function safeSetPointerCapture(el, pointerId) {
  try {
    el.setPointerCapture?.(pointerId);
  } catch {
    // ignore — dragging still works without capture, just won't track
    // past the element's own bounds
  }
}

// Vertical-drag-to-value: dragging up increases, dragging down decreases.
export function useVerticalDrag(value, onChange, sensitivity = 120) {
  const draggingRef = useRef(false);
  const startRef = useRef({ y: 0, value: 0 });

  const onPointerDown = useCallback((e) => {
    draggingRef.current = true;
    startRef.current = { y: e.clientY, value };
    safeSetPointerCapture(e.currentTarget, e.pointerId);
  }, [value]);

  const onPointerMove = useCallback((e) => {
    if (!draggingRef.current) return;
    const deltaY = startRef.current.y - e.clientY;
    const next = Math.max(0, Math.min(1, startRef.current.value + deltaY / sensitivity));
    onChange(next);
  }, [onChange, sensitivity]);

  const onPointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}

// Ratio [0,1] of a clientX position across a ref'd element's width — the
// shared math behind every clickable horizontal seek strip.
export function ratioFromClientX(ref, clientX) {
  const el = ref.current;
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  if (!rect.width) return 0;
  return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
}

// Ratio [0,1] of an angle around a circular control's center — shared math
// behind rotary dials/gauges. 0 at `startDeg` (measured clockwise from 12
// o'clock), 1 at `startDeg + sweepDeg`.
export function ratioFromAngle(ref, clientX, clientY, startDeg = -130, sweepDeg = 260) {
  const el = ref.current;
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let deg = (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI + 90;
  if (deg < startDeg) deg += 360;
  const ratio = (deg - startDeg) / sweepDeg;
  return Math.max(0, Math.min(1, ratio));
}

// requestAnimationFrame loop that respects prefers-reduced-motion — skins
// use this for continuous visual state (needle sway, core pulse) instead of
// re-implementing the reduced-motion check and rAF teardown each time.
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
