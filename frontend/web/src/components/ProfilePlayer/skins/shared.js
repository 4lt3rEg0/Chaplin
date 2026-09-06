// Generic, non-visual helpers shared by every skin — pure math/DOM utilities,
// never anatomy. Each skin still builds its own styled-components and layout;
// this only avoids re-deriving the same drag math and mm:ss formatting 11 times.
import { useCallback, useRef } from 'react';

export const fmtTime = (value) => {
  if (!Number.isFinite(value)) return '00:00';
  const safe = Math.max(0, Math.floor(value));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// Vertical-drag-to-value: dragging up increases, dragging down decreases.
// `sensitivity` is pixels-of-drag needed to cross the full [0,1] range /2.4-ish feel.
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

// setPointerCapture can throw (NotFoundError) if the pointer id it's given
// is no longer active — a real (if rare) race with fast pointerup/cancel
// sequences, not just a test artifact. Every drag handler below wants the
// capture attempt to never abort the rest of the handler (the value the
// user just clicked/dragged to must still apply even if capture fails).
export function safeSetPointerCapture(el, pointerId) {
  try {
    el.setPointerCapture?.(pointerId);
  } catch {
    // ignore — dragging still works without capture, just won't track
    // past the element's own bounds
  }
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
// behind rotary dials/gauges (VELOCITY COCKPIT, LIFE//SIGN, AETHER//ENGINE).
// 0 at `startDeg` (measured clockwise from 12 o'clock), 1 at `startDeg + sweepDeg`.
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
