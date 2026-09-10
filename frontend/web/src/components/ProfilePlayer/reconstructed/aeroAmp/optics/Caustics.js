// FASE 15.5 — ICE CAUSTICS, and the ambient light source those caustics (and
// the material's Fresnel reflection) are catching. Two things live in this
// one file on purpose: the caustic GLSL, and the small procedural "sky" the
// ice reflects — both are "what light is doing around/inside the ice," as
// opposed to RefractionShader.js which is "what the ice's surface does to
// light passing through it."
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// GLSL — slow, low-amplitude, organic. Two FBM taps drifting at different
// speeds and directions so it never reads as a looping texture. Explicitly
// NOT a magic-crystal glow: amplitude is tuned low (see how it's used in
// RefractionShader.js — added as a fraction of a fraction, never a base
// color) and it only ever adds warmth/light, never a hue shift.
// ---------------------------------------------------------------------------
export const glslCaustics = /* glsl */ `
  float iceCaustics(vec3 p, float t, float intensity) {
    float slow = iceFbm(p * 0.55 + vec3(0.0, 0.0, t * 0.045));
    float fast = iceFbm(p * 1.6 + vec3(t * 0.07, t * -0.05, 0.0));
    float c = slow * 0.6 + fast * 0.4;
    c = smoothstep(0.42, 0.92, c);
    return c * intensity;
  }

  // A handful of fixed, sparse "sun through ice" rays rather than a uniform
  // shimmer — real caustic light concentrates into thin bright threads, it
  // doesn't glow evenly. Cheap: just three offset FBM samples along a
  // near-vertical axis, thresholded hard.
  float iceCausticRays(vec3 p, float t, float intensity) {
    float r = 0.0;
    r += smoothstep(0.88, 0.99, iceFbm(p * 3.0 + vec3(0.3, t * 0.02, 0.0)));
    r += smoothstep(0.88, 0.99, iceFbm(p * 3.4 + vec3(-0.7, t * 0.018, 1.3)));
    r += smoothstep(0.90, 0.99, iceFbm(p * 2.6 + vec3(1.4, t * 0.022, -0.6)));
    return clamp(r, 0.0, 1.0) * intensity;
  }
`;

// ---------------------------------------------------------------------------
// Procedural reflection environment — INDUSTRIAL DESIGN FINAL PASS COLOR
// SYSTEM. Replaces Fase 16's four-stop palette with this brief's own exact
// values: Glass White #FFFFFF, Aqua #5DEBFF, Deep Ocean #063B66. This
// brief's palette gives one dark stop rather than two, so depthOcean and
// shadowNavy both resolve to #063B66 here — still never pure black/gray,
// still a believable product-photography lighting rig rather than a
// skybox: KEY (white, upper-left, tight) / FILL (aqua, lateral, broader,
// softer) / AMBIENT (deep ocean, low, diffuse) — see CrystalRenderer.jsx's
// actual THREE.js lights for the same three-point scheme applied to direct
// lighting, not just this reflection map. No HDR asset — one small canvas,
// drawn once, cached.
// ---------------------------------------------------------------------------
const PALETTE_HEX = {
  keyWhite: '#FFFFFF',
  crystalCyan: '#5DEBFF',
  depthOcean: '#063B66',
  shadowNavy: '#063B66'
};

let cachedEnv = null;

export function buildIceEnvironmentTexture() {
  if (cachedEnv) return cachedEnv;

  const width = 256;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Base vertical gradient, the four palette colors in order top to
  // bottom: ice-white key light -> crystal cyan (dominant, owns the
  // equator where most reflection rays land) -> ocean-blue depth ->
  // navy shadow floor. No black, no gray, no petrol blue anywhere.
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, PALETTE_HEX.keyWhite);
  sky.addColorStop(0.18, '#cdf6ff');
  sky.addColorStop(0.36, PALETTE_HEX.crystalCyan);
  sky.addColorStop(0.62, PALETTE_HEX.depthOcean);
  sky.addColorStop(1, PALETTE_HEX.shadowNavy);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // KEY LIGHT — white, cold, upper-LEFT (per the brief's explicit
  // "blanco frío superior izquierda"), tight enough to read as a
  // directional highlight rather than a wash.
  const key = ctx.createRadialGradient(width * 0.32, height * 0.05, 1, width * 0.32, height * 0.05, width * 0.3);
  key.addColorStop(0, 'rgba(255,255,255,0.4)');
  key.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = key;
  ctx.fillRect(0, 0, width, height);

  // FILL LIGHT — aqua, lateral (right side), broader and softer than the
  // key, exactly as "FILL LIGHT: cyan lateral" asks.
  const fill = ctx.createRadialGradient(width * 0.86, height * 0.42, 1, width * 0.86, height * 0.42, width * 0.3);
  fill.addColorStop(0, 'rgba(93,235,255,0.4)');
  fill.addColorStop(1, 'rgba(93,235,255,0)');
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, width, height);

  // AMBIENT — soft deep-ocean blue rising from the bottom, low contribution.
  const ambient = ctx.createLinearGradient(0, height * 0.7, 0, height);
  ambient.addColorStop(0, 'rgba(6,59,102,0)');
  ambient.addColorStop(1, 'rgba(6,59,102,0.3)');
  ctx.fillStyle = ambient;
  ctx.fillRect(0, height * 0.7, width, height * 0.3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedEnv = texture;
  return texture;
}
