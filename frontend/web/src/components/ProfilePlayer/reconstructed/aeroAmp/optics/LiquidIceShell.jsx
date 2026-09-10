// LIQUID ICE SHELL — real 3D PBR shell replacing the SVG-reflection-overlay
// experiment (reverted: 2D painted highlights have no surface normal and no
// environment to sample, so they could only ever fake a highlight, never
// produce curved-glass reflection). This renders ONLY the physical shell —
// a real extruded mesh with MeshTransmissionMaterial — as its own transparent
// canvas, mounted BELOW BodySvg. It never captures, replaces, or dims the
// UI: BodySvg keeps drawing the LCD text/mascot/visualizer/buttons exactly
// as before, on top. This canvas contributes only optical detail showing
// through/around that UI, the way real glass reflects while the object
// behind/inside it stays fully legible.
//
// Explicitly NOT the old CrystalRenderer architecture: no svgRef capture, no
// crystalReady handoff. If this canvas fails to mount (WebGL unsupported) it
// simply doesn't render — the SVG shell underneath is a complete, correct
// player on its own, same contract every other optional optics layer here
// follows.
//
// PIPELINE BUG FOUND + FIXED (confirmed via the Test 1-5 series, not
// guessed): MeshTransmissionMaterial captures whatever is behind the mesh
// into an FBO every frame and refracts that. With gl alpha:true and nothing
// else in the scene, that capture was empty, collapsing the material's
// whole output alpha to ~0 — verified with real gl.readPixels() (not
// toDataURL, which has its own buffer-clear timing gotcha), not a visual
// guess. Fix: drei's own `background` prop, which MeshTransmissionMaterial
// temporarily swaps onto state.scene.background ONLY during its internal
// FBO pass, giving that capture something opaque to sample without ever
// touching the real (alpha:true) canvas output.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { MeshTransmissionMaterial, OrthographicCamera } from '@react-three/drei';
import { createAeroShellGeometry, AERO_SHELL_WORLD_WIDTH, AERO_SHELL_WORLD_HEIGHT, AERO_VIEWBOX_TO_WORLD } from './createAeroShellGeometry';
import AeroStudioEnvironment from './AeroStudioEnvironment';

function IceMesh({ quality }) {
  const geometry = useMemo(() => createAeroShellGeometry(), []);
  const transmissionBackground = useMemo(() => new THREE.Color('#70dfff'), []);

  return (
    // eslint-disable-next-line react/no-unknown-property
    <mesh geometry={geometry}>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <MeshTransmissionMaterial
        background={transmissionBackground}
        transmission={1}
        roughness={0.015}
        thickness={0.3}
        ior={1.333}
        attenuationColor="#23d7ff"
        attenuationDistance={1.1}
        clearcoat={1}
        clearcoatRoughness={0.005}
        chromaticAberration={0.01}
        anisotropicBlur={0.04}
        samples={quality === 'high' ? 8 : 5}
        resolution={quality === 'high' ? 512 : 256}
      />
    </mesh>
  );
}

// LCD GLASS — same pipeline as the main shell, sized/positioned to the
// EXACT "LCD glass surface" rect AeroAmpSkin.jsx draws (x=44, y=60,
// width=512, height=90 in the same 600x300 viewBox), converted through the
// same AERO_VIEWBOX_TO_WORLD scale createAeroShellGeometry.js uses — not a
// separately-guessed size/position. A thin flat panel, not a shell: real
// device screen glass is close to flat, and it sits slightly in FRONT of
// the main shell (z closer to camera) so the shell's own geometry never
// occludes it.
const LCD_VB = { x: 44, y: 60, w: 512, h: 90 };
const VIEWBOX_CENTER = { x: 300, y: 150 }; // 600x300 viewBox's own center
function lcdWorldTransform() {
  const cx = LCD_VB.x + LCD_VB.w / 2;
  const cy = LCD_VB.y + LCD_VB.h / 2;
  return {
    position: [
      (cx - VIEWBOX_CENTER.x) * AERO_VIEWBOX_TO_WORLD,
      -(cy - VIEWBOX_CENTER.y) * AERO_VIEWBOX_TO_WORLD,
      0.22,
    ],
    width: LCD_VB.w * AERO_VIEWBOX_TO_WORLD,
    height: LCD_VB.h * AERO_VIEWBOX_TO_WORLD,
  };
}

function LcdGlass({ quality }) {
  const { position, width, height } = useMemo(() => lcdWorldTransform(), []);
  // Warm beige/yellow background for THIS transmission buffer only — makes
  // the glass read as sitting over a Game Boy-style screen instead of
  // tinting it back toward blue/cyan (the main shell's own backer color).
  const transmissionBackground = useMemo(() => new THREE.Color('#f0e4b0'), []);

  return (
    // eslint-disable-next-line react/no-unknown-property
    <mesh position={position}>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <planeGeometry args={[width, height, 1, 1]} />
      {/* eslint-disable-next-line react/no-unknown-property */}
      <MeshTransmissionMaterial
        background={transmissionBackground}
        transmission={1}
        roughness={0.02}
        thickness={0.08}
        ior={1.45}
        attenuationColor="#f0e4b0"
        attenuationDistance={1.4}
        clearcoat={1}
        clearcoatRoughness={0.01}
        chromaticAberration={0.006}
        anisotropicBlur={0.03}
        samples={quality === 'high' ? 8 : 5}
        resolution={quality === 'high' ? 512 : 256}
      />
    </mesh>
  );
}

// Camera frustum mapped directly to the SAME 600x300 viewBox AeroAmpSkin's
// SVG uses (world width/height = viewBox 600x300 * createAeroShellGeometry's
// own 1/150 scale = 4 x 2), not a guessed zoom — so the 3D shell's footprint
// lands on the same pixels as the 2D "Outer silhouette" path underneath it.
const FRUSTUM_W = 4; // 600 * (1/150)
const FRUSTUM_H = 2; // 300 * (1/150)

export default function LiquidIceShell({ quality = 'high', style }) {
  return (
    <Canvas
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      dpr={[1, 1.5]}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...style }}
    >
      <OrthographicCamera
        makeDefault
        position={[0, 0, 5]}
        left={-FRUSTUM_W / 2}
        right={FRUSTUM_W / 2}
        top={FRUSTUM_H / 2}
        bottom={-FRUSTUM_H / 2}
        near={0.1}
        far={100}
      />
      <AeroStudioEnvironment />
      <IceMesh quality={quality} />
      <LcdGlass quality={quality} />
    </Canvas>
  );
}

export const AERO_LIQUID_SHELL_WORLD_SIZE = { width: AERO_SHELL_WORLD_WIDTH, height: AERO_SHELL_WORLD_HEIGHT };
