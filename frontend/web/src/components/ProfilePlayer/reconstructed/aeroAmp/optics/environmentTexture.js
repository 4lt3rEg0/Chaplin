// FASE 14.3 — ENVIRONMENT REFLECTION
//
// "No usar HDR pesado si no es necesario" — so instead of shipping an HDR
// asset (and a loader, and a fetch), this paints a tiny equirectangular
// gradient straight into a <canvas> at runtime: sky blue, a white toplight
// band, a cyan aurora sweep, and a faint lilac accent, exactly the palette
// the brief asked for. It's cheap (one 256x128 canvas, drawn once and
// cached) and it's a real environment the ice genuinely reflects/refracts
// via iceShader.js's dirToEquirect() sampling — not a static image glued
// onto the material.
import * as THREE from 'three';

let cached = null;

export function buildIceEnvironmentTexture() {
  if (cached) return cached;

  const width = 256;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Base sky: deep blue horizon-down, pale ice-blue up top (equirect v=0 is
  // "up" per dirToEquirect's 1.0 - theta/PI flip).
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#eaffff');
  sky.addColorStop(0.28, '#bdeeff');
  sky.addColorStop(0.6, '#3f8fc9');
  sky.addColorStop(1, '#0a2c4a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // White toplight — a soft bright band near the top, standing in for a
  // single overhead light source (Frutiger Aero's classic "light from
  // above" cue).
  const toplight = ctx.createRadialGradient(width * 0.5, height * 0.08, 2, width * 0.5, height * 0.08, width * 0.35);
  toplight.addColorStop(0, 'rgba(255,255,255,0.95)');
  toplight.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = toplight;
  ctx.fillRect(0, 0, width, height);

  // Cyan aurora sweep, roughly a third of the way down.
  const aurora = ctx.createLinearGradient(0, height * 0.28, width, height * 0.42);
  aurora.addColorStop(0, 'rgba(120,240,255,0)');
  aurora.addColorStop(0.5, 'rgba(120,240,255,0.55)');
  aurora.addColorStop(1, 'rgba(120,240,255,0)');
  ctx.fillStyle = aurora;
  ctx.fillRect(0, height * 0.22, width, height * 0.24);

  // Faint lilac accent low-right, a minimal touch per the brief.
  const lilac = ctx.createRadialGradient(width * 0.78, height * 0.72, 2, width * 0.78, height * 0.72, width * 0.22);
  lilac.addColorStop(0, 'rgba(190,160,255,0.35)');
  lilac.addColorStop(1, 'rgba(190,160,255,0)');
  ctx.fillStyle = lilac;
  ctx.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  cached = texture;
  return texture;
}
