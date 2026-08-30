import { useEffect, useMemo, useState } from "react";
import { useVortex } from "../../../context/VortexContext";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const FULL_VIEWPORT = {
  left: 0,
  top: 0,
  width: 1,
  height: 1,
  centerX: 0.5,
  centerY: 0.5,
  pixelLeft: 0,
  pixelTop: 0,
  pixelWidth: 0,
  pixelHeight: 0,
  stacked: true
};

const rectToJson = (rect) => ({
  left: rect.left,
  top: rect.top,
  right: rect.right,
  bottom: rect.bottom,
  width: rect.width,
  height: rect.height
});

const measureSafeArea = () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return FULL_VIEWPORT;
  }

  const viewportWidth = Math.max(1, window.innerWidth);
  const viewportHeight = Math.max(1, window.innerHeight);
  const shell = document.querySelector(".chaplin-page-shell");

  if (!shell || shell.children.length < 3) {
    return {
      ...FULL_VIEWPORT,
      pixelWidth: viewportWidth,
      pixelHeight: viewportHeight
    };
  }

  const [leftNode, centerNode, rightNode] = Array.from(shell.children);
  if (!leftNode || !centerNode || !rightNode) {
    return {
      ...FULL_VIEWPORT,
      pixelWidth: viewportWidth,
      pixelHeight: viewportHeight
    };
  }

  const left = rectToJson(leftNode.getBoundingClientRect());
  const center = rectToJson(centerNode.getBoundingClientRect());
  const right = rectToJson(rightNode.getBoundingClientRect());

  const stacked = Math.abs(left.top - center.top) > 48 || Math.abs(center.top - right.top) > 48;
  if (stacked) {
    return {
      ...FULL_VIEWPORT,
      pixelWidth: viewportWidth,
      pixelHeight: viewportHeight,
      stacked: true
    };
  }

  const pixelLeft = clamp(left.right, 0, viewportWidth);
  const pixelRight = clamp(right.left, pixelLeft + 1, viewportWidth);
  const pixelTop = 0;
  const pixelBottom = viewportHeight;
  const pixelWidth = Math.max(1, pixelRight - pixelLeft);
  const pixelHeight = Math.max(1, pixelBottom - pixelTop);

  return {
    left: pixelLeft / viewportWidth,
    top: pixelTop / viewportHeight,
    width: pixelWidth / viewportWidth,
    height: pixelHeight / viewportHeight,
    centerX: (pixelLeft + pixelWidth * 0.5) / viewportWidth,
    centerY: 0.5,
    pixelLeft,
    pixelTop,
    pixelWidth,
    pixelHeight,
    stacked: false
  };
};

export function useBackgroundRig() {
  const {
    reactivity,
    deformIntensity,
    motionIntensity,
    bassBoost,
    trebleBoost,
    animationEnabled
  } = useVortex();
  const [safeArea, setSafeArea] = useState(() => measureSafeArea());

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    let frame = 0;
    const scheduleMeasure = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setSafeArea(measureSafeArea());
      });
    };

    scheduleMeasure();

    const shell = document.querySelector(".chaplin-page-shell");
    const observers = [];

    if (typeof ResizeObserver !== "undefined") {
      const shellObserver = new ResizeObserver(() => scheduleMeasure());
      if (shell) {
        shellObserver.observe(shell);
        Array.from(shell.children).forEach((child) => shellObserver.observe(child));
      }
      observers.push(shellObserver);
    }

    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("orientationchange", scheduleMeasure);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      observers.forEach((observer) => observer.disconnect());
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("orientationchange", scheduleMeasure);
    };
  }, []);

  const tuning = useMemo(() => ({
    animationEnabled,
    reactivity: clamp(reactivity ?? 1, 0.5, 2),
    deformIntensity: clamp(deformIntensity ?? 1, 0.5, 2),
    motionIntensity: clamp(motionIntensity ?? 1, 0.5, 2),
    bassBoost: clamp(bassBoost ?? 1, 0, 2),
    trebleBoost: clamp(trebleBoost ?? 1, 0, 2)
  }), [animationEnabled, reactivity, deformIntensity, motionIntensity, bassBoost, trebleBoost]);

  return { safeArea, tuning };
}