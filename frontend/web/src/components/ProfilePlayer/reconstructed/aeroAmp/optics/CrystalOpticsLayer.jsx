// FASE 14.1 — WEBGL CRYSTAL LAYER
//
// A hybrid optical layer, not a replacement for the existing SVG shell.
// This component renders ONLY: refraction, reflection, internal caustics,
// and suspended microstructure (Fase 14.2-14.5). It renders no UI at
// all — no text, no buttons, no hit-testing — and sits as an absolutely
// positioned, pointer-events:none <Canvas> behind the real BodySvg/Overlay
// in AeroAmpSkin.jsx, so every hitbox, callback and accessibility
// attribute in the SVG/HTML layers above it is completely untouched.
//
// Mounting is entirely optional and reversible: AeroAmpSkin decides
// whether to render this at all (WebGL-support probe + quality preset +
// prefers-reduced-motion), and if it doesn't, the Fase 6-13 SVG-only
// shell is already a complete, correct player on its own.
import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBox, Points, PointMaterial } from '@react-three/drei';
import './IceCrystalMaterial';
import { buildIceEnvironmentTexture } from './environmentTexture';

// FASE 14.7 — quality presets. HIGH: full shader + env map + particle
// field. MEDIUM: same shader, far fewer particles and a capped device
// pixel ratio (the shader itself is cheap — per-pixel cost, not particle
// count, is what actually matters on a 460px-wide player). LOW never
// reaches this component at all: AeroAmpSkin simply doesn't mount it.
const QUALITY_PRESETS = {
  high: { particleCount: 46, dpr: [1, 2] },
  medium: { particleCount: 14, dpr: [1, 1] }
};

function supportsWebGL() {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

// The ice mesh itself — a rounded box roughly matching BodySvg's own
// chamfered silhouette (600x300 viewBox, mapped to a 3x1.5 unit plane so
// the aspect ratio matches exactly). All the actual optics live in
// IceCrystalMaterial / iceShader.js; this component's only job is to
// drive its uniforms from React props each frame, imperatively (no
// setState — same "no React churn at 60fps" rule the SVG VU bars and
// audio CSS vars already follow).
function IceVolume({ lightRef, audioLevelsRef }) {
  const materialRef = useRef(null);
  const envMap = useMemo(() => buildIceEnvironmentTexture(), []);

  useFrame((state) => {
    const mat = materialRef.current;
    if (!mat) return;
    const t = state.clock.getElapsedTime();
    mat.uTime = t;
    const l = lightRef.current;
    mat.uMouse.set(l.x, l.y);
    const a = audioLevelsRef.current;
    mat.uAudioBass = a.low;
    mat.uAudioMid = a.mid;
    mat.uAudioHigh = a.high;
  });

  return (
    <RoundedBox args={[3, 1.5, 0.36]} radius={0.14} smoothness={4}>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <iceCrystalMaterial ref={materialRef} uEnvMap={envMap} />
    </RoundedBox>
  );
}

// FASE 14.5 — INTERNAL MICROSTRUCTURE. Real 3D points at varied depth (z)
// give genuine parallax as the camera's perspective projects them — not a
// faked 2D drift like the SVG PlaneFrontal/PlaneMedio from Fase 9. Mid
// frequencies nudge the whole field very slightly; this is deliberately
// far more restrained than a "particle system," per the brief's own "no
// visualizador gamer RGB" rule.
function MicrostructureField({ count, audioLevelsRef }) {
  const pointsRef = useRef(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 2.7;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 1.3;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const a = audioLevelsRef.current;
    const t = state.clock.getElapsedTime();
    pts.rotation.y = Math.sin(t * 0.05) * 0.02 + a.mid * 0.03;
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3}>
      <PointMaterial
        transparent
        color="#eafcff"
        size={0.018}
        sizeAttenuation
        depthWrite={false}
        opacity={0.55}
      />
    </Points>
  );
}

function Rig({ lightRef }) {
  const { camera } = useThree();
  useFrame(() => {
    // A very small camera parallax tied to the same light/cursor position
    // used everywhere else — reinforces "3D object under a lamp" rather
    // than moving the light alone.
    const l = lightRef.current;
    camera.position.x = l.x * 0.15;
    camera.position.y = l.y * 0.1;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function CrystalOpticsLayer({ lightRef, audioLevelsRef, quality = 'high', style }) {
  const webglOk = useMemo(() => supportsWebGL(), []);
  if (!webglOk) return null;

  const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.medium;

  return (
    <Canvas
      dpr={preset.dpr}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 0, 3.4], fov: 32 }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', ...style }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[1, 2, 2]} intensity={0.8} color="#eafcff" />
      <directionalLight position={[-1.5, -1, 1]} intensity={0.25} color="#bda6ff" />
      <Rig lightRef={lightRef} />
      <IceVolume lightRef={lightRef} audioLevelsRef={audioLevelsRef} />
      <MicrostructureField count={preset.particleCount} audioLevelsRef={audioLevelsRef} />
    </Canvas>
  );
}
