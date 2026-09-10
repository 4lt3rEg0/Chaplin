import React from 'react';

/*
 * Reusable SVG material defs. These are geometry-free — they only ever
 * emit <linearGradient>/<radialGradient>/<filter> nodes inside a skin's own
 * <defs>. Every stop reads a CSS custom property (set on the skin's outer
 * Wrap from its resolved palette) via style={{ stopColor: 'var(--x)' }},
 * never a literal hex — that's what lets Default/Theme/Custom recolor the
 * material without flattening it to a solid tint. Nothing here draws a
 * shape or implies a silhouette; each skin still authors its own paths.
 */

// Polished chrome/metal band: light-dark-light-dark stops simulate the
// banded reflection real chrome shows, modulated by --tone (0..1, how much
// of the material's own color vs pure white/black highlight shows).
export function ChromeGradient({ id, colorVar, angle = 90 }) {
  const x2 = angle === 90 ? 0 : 1;
  const y2 = angle === 90 ? 1 : 0;
  return (
    <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
      <stop offset="0%" style={{ stopColor: `color-mix(in srgb, ${colorVar} 45%, #fff)` }} />
      <stop offset="22%" style={{ stopColor: `color-mix(in srgb, ${colorVar} 85%, #fff)` }} />
      <stop offset="38%" style={{ stopColor: `color-mix(in srgb, ${colorVar} 70%, #000)` }} />
      <stop offset="52%" style={{ stopColor: `color-mix(in srgb, ${colorVar} 92%, #fff)` }} />
      <stop offset="68%" style={{ stopColor: colorVar }} />
      <stop offset="84%" style={{ stopColor: `color-mix(in srgb, ${colorVar} 60%, #000)` }} />
      <stop offset="100%" style={{ stopColor: `color-mix(in srgb, ${colorVar} 80%, #fff)` }} />
    </linearGradient>
  );
}

// Convex chrome button (radial): bright hotspot near top-left, dark rim.
export function ChromeButtonGradient({ id, colorVar }) {
  return (
    <radialGradient id={id} cx="35%" cy="28%" r="75%">
      <stop offset="0%" style={{ stopColor: `color-mix(in srgb, ${colorVar} 30%, #fff)` }} />
      <stop offset="35%" style={{ stopColor: colorVar }} />
      <stop offset="80%" style={{ stopColor: `color-mix(in srgb, ${colorVar} 65%, #000)` }} />
      <stop offset="100%" style={{ stopColor: `color-mix(in srgb, ${colorVar} 40%, #000)` }} />
    </radialGradient>
  );
}

// Frosted/gel window body — translucent plastic or glass shell behind the
// whole device (Frutiger-Aero / Y2K gel look): light top, deeper bottom.
export function GelGradient({ id, colorVar }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" style={{ stopColor: `color-mix(in srgb, ${colorVar} 55%, #fff)` }} />
      <stop offset="45%" style={{ stopColor: colorVar }} />
      <stop offset="100%" style={{ stopColor: `color-mix(in srgb, ${colorVar} 70%, #000)` }} />
    </linearGradient>
  );
}

// Dark display glass (LCD/OLED backing) — near-black with a faint tint and
// a soft top-sheen, so real text/LEDs read as glowing against real glass.
export function DisplayGlassGradient({ id, colorVar }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" style={{ stopColor: `color-mix(in srgb, ${colorVar} 22%, #0a0e14)` }} />
      <stop offset="60%" style={{ stopColor: `color-mix(in srgb, ${colorVar} 10%, #04070c)` }} />
      <stop offset="100%" style={{ stopColor: `color-mix(in srgb, ${colorVar} 16%, #000)` }} />
    </linearGradient>
  );
}

// Brushed metal — fine directional grain via feTurbulence, tinted by the
// material color using feColorMatrix + feComponentTransfer, then composited
// as a low-opacity overlay on top of a ChromeGradient fill (never alone).
export function BrushedMetalFilter({ id, seed = 3 }) {
  return (
    <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9 0.02" numOctaves="2" seed={seed} result="grain" />
      <feColorMatrix in="grain" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.6 0.6 0.6 0 0" result="grainA" />
      <feComponentTransfer in="grainA">
        <feFuncA type="linear" slope="0.18" intercept="0" />
      </feComponentTransfer>
    </filter>
  );
}

// Glass panel highlight — a soft diagonal sheen used over any display or
// dome to sell "there is a transparent surface here", not just a flat tint.
export function GlassSheenGradient({ id, opacity = 0.28 }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#ffffff" stopOpacity={opacity} />
      <stop offset="18%" stopColor="#ffffff" stopOpacity={opacity * 0.3} />
      <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>
  );
}

// Soft specular highlight blob — the bright, out-of-focus glass/plastic
// reflection real glossy toy shells show near their "light source" corner.
// A highlight is inherently white regardless of the material's own hue, so
// unlike the gradients above this one is never palette-driven — only size
// (via the shape that uses it) and opacity are parametrized. Pair with a
// feGaussianBlur filter and `mixBlendMode: 'screen'` on the shape for the
// most convincing "light passing through curved plastic" result.
export function GlossHighlight({ id, opacity = 0.85 }) {
  return (
    <radialGradient id={id} cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#ffffff" stopOpacity={opacity} />
      <stop offset="45%" stopColor="#ffffff" stopOpacity={opacity * 0.35} />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </radialGradient>
  );
}

// Faint fractal grain to break up an otherwise-perfect vector fill — the
// small visual irregularity that reads as real injection-molded plastic
// instead of a flawless CSS div. Deliberately near-invisible (0.05 alpha
// slope): composite at low opacity over a shape, never used alone.
export function FrostGrainFilter({ id, seed = 4 }) {
  return (
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} result="grain" />
      <feColorMatrix in="grain" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.05 0" />
    </filter>
  );
}

// Procedural water/ocean tile — feTurbulence shaped into horizontal bands
// so liquid-themed skins get a real animated-capable texture instead of a
// raster photo of water baked into the asset.
export function OceanTextureFilter({ id, seed = 7 }) {
  return (
    <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves="3" seed={seed} result="waves" />
      <feColorMatrix in="waves" type="matrix" values="0 0 0 0 0  0 0 0 0 0.55  0 0 0 0 0.75  0 0 0 0.5 0" result="tinted" />
      <feComponentTransfer in="tinted">
        <feFuncA type="linear" slope="0.55" intercept="0" />
      </feComponentTransfer>
    </filter>
  );
}
