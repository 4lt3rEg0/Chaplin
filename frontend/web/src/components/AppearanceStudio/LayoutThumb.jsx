import React from 'react';

// Small schematic wireframe per layout archetype — real geometry (rects/circles
// positioned to actually resemble that composition), not a blank labeled card.
const ARCHETYPE_SHAPES = {
  balanced: (a, b) => (
    <>
      <rect x="4" y="4" width="92" height="14" rx="2" fill={a} />
      <rect x="4" y="22" width="26" height="42" rx="2" fill={b} opacity="0.7" />
      <rect x="34" y="22" width="62" height="18" rx="2" fill={b} />
      <rect x="34" y="44" width="62" height="20" rx="2" fill={b} opacity="0.55" />
    </>
  ),
  peripheral: (a, b) => (
    <>
      <rect x="4" y="4" width="10" height="60" rx="2" fill={b} opacity="0.6" />
      <rect x="86" y="4" width="10" height="60" rx="2" fill={b} opacity="0.6" />
      <rect x="18" y="4" width="64" height="26" rx="2" fill={a} />
      <rect x="18" y="34" width="64" height="30" rx="2" fill={b} />
    </>
  ),
  showcase: (a, b) => (
    <>
      <rect x="4" y="4" width="92" height="34" rx="3" fill={a} />
      <rect x="4" y="42" width="27" height="22" rx="2" fill={b} />
      <rect x="36.5" y="42" width="27" height="22" rx="2" fill={b} opacity="0.75" />
      <rect x="69" y="42" width="27" height="22" rx="2" fill={b} opacity="0.5" />
    </>
  ),
  rack: (a, b) => (
    <>
      {[4, 18, 32, 46].map((y, i) => (
        <rect key={y} x="4" y={y} width="92" height="10" rx="2" fill={i % 2 ? b : a} opacity={i % 2 ? 0.6 : 1} />
      ))}
    </>
  ),
  floating: (a, b) => (
    <>
      <circle cx="20" cy="16" r="9" fill={a} />
      <rect x="42" y="8" width="30" height="18" rx="3" fill={b} opacity="0.7" />
      <rect x="10" y="38" width="22" height="20" rx="3" fill={b} opacity="0.55" />
      <rect x="52" y="34" width="34" height="24" rx="3" fill={a} opacity="0.85" />
    </>
  ),
  spread: (a, b) => (
    <>
      <rect x="4" y="4" width="44" height="60" rx="2" fill={a} />
      <rect x="52" y="4" width="44" height="60" rx="2" fill={b} opacity="0.7" />
    </>
  ),
  mosaic: (a, b) => (
    <>
      <rect x="4" y="4" width="40" height="26" rx="2" fill={a} />
      <rect x="46" y="4" width="46" height="14" rx="2" fill={b} />
      <rect x="46" y="20" width="22" height="24" rx="2" fill={b} opacity="0.6" />
      <rect x="70" y="20" width="22" height="24" rx="2" fill={a} opacity="0.7" />
      <rect x="4" y="34" width="40" height="30" rx="2" fill={b} opacity="0.5" />
      <rect x="46" y="46" width="46" height="18" rx="2" fill={a} opacity="0.6" />
    </>
  ),
  matrix: (a, b) => (
    <>
      {Array.from({ length: 4 }, (_, row) => Array.from({ length: 5 }, (_, col) => (
        <rect key={`${row}-${col}`} x={4 + col * 18.8} y={4 + row * 15} width="16" height="12" rx="1.5" fill={(row + col) % 2 ? b : a} opacity={(row + col) % 2 ? 0.6 : 0.95} />
      )))}
    </>
  ),
  flow: (a, b) => (
    <>
      <path d="M4 50 Q 25 10, 50 34 T 96 20" stroke={b} strokeWidth="10" fill="none" opacity="0.6" strokeLinecap="round" />
      <circle cx="14" cy="46" r="8" fill={a} />
      <circle cx="50" cy="30" r="10" fill={a} opacity="0.85" />
      <circle cx="86" cy="22" r="7" fill={b} />
    </>
  ),
  'hero-orbit': (a, b) => (
    <>
      <circle cx="50" cy="34" r="14" fill={a} />
      <circle cx="50" cy="34" r="26" stroke={b} strokeWidth="2" fill="none" opacity="0.7" />
      <circle cx="76" cy="34" r="4" fill={b} />
      <circle cx="24" cy="34" r="4" fill={b} />
      <circle cx="50" cy="8" r="4" fill={b} />
    </>
  ),
  gallery: (a, b) => (
    <>
      <rect x="26" y="14" width="48" height="40" rx="3" fill={a} />
      <rect x="40" y="58" width="20" height="4" rx="2" fill={b} opacity="0.6" />
    </>
  ),
  zones: (a, b) => (
    <>
      <rect x="4" y="4" width="44" height="28" rx="2" fill={a} />
      <rect x="52" y="4" width="40" height="28" rx="2" fill={b} opacity="0.7" />
      <rect x="4" y="36" width="40" height="28" rx="2" fill={b} opacity="0.55" />
      <rect x="48" y="36" width="44" height="28" rx="2" fill={a} opacity="0.8" />
    </>
  )
};

export default function LayoutThumb({ archetype, colorA = '#7ee8ff', colorB = '#ff8ad8' }) {
  const render = ARCHETYPE_SHAPES[archetype] || ARCHETYPE_SHAPES.balanced;
  return (
    <svg viewBox="0 0 100 68" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width="100" height="68" rx="4" fill="#05070b" />
      {render(colorA, colorB)}
    </svg>
  );
}
