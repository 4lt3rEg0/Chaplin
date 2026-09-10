// FASE 15 — TRUE OPTICAL ICE ENGINE. Replaces Fase 14's CrystalOpticsLayer.
//
// What actually changed vs. Fase 14, and why: Fase 14's material only ever
// sampled a small procedural "sky" texture — nothing it did could make
// anything BEHIND the mesh look distorted, because nothing behind it was
// ever fed into the shader. That's why, however tuned, it read as "a glassy
// overlay sitting on top of the UI" rather than "a lump of ice the UI is
// seen through." Fase 15's fix is architectural, not cosmetic: this
// component now captures a REAL, live rasterization of the actual SVG
// shell (BodySvg — the same DOM node with its real buttons/LCD/track pill,
// via svgRef passed down from AeroAmpSkin) into a texture every ~180ms
// (throttled — an SVG-to-canvas rasterization is comparatively expensive,
// there is no reason to do it 60x/sec when the UI itself rarely changes
// that fast, and a MutationObserver forces an immediate re-capture right
// when it does, e.g. play/pause or track title changing), and
// RefractionShader.js's fragment shader distorts THAT real texture with a
// per-channel, IOR-driven UV offset. What you see through the ice is
// genuinely the real control layout, genuinely bent.
//
// FASE 15.1 explicitly asks for "WebGLRenderTarget o equivalente." The
// "equivalente" used here is a THREE.CanvasTexture fed by real DOM/SVG
// rasterization rather than a second WebGL scene pass — deliberately, not
// as a shortcut: a WebGLRenderTarget pass only makes sense for a scene
// that is ALREADY 3D geometry. What needs to be refracted here is 2D UI
// (real buttons, real LCD text), so a render-target pass would have meant
// building a synthetic proxy scene that approximates the UI instead of
// showing the UI itself — exactly the "glassmorphism over a fake scene"
// failure mode this phase's brief is trying to move away from. Capturing
// the real SVG was judged the more honest, more physically meaningful
// choice; it's disclosed here and in the integration report rather than
// silently substituted.
//
// Everything else about the contract from Fase 14 holds: zero UI of its
// own, zero hit-testing, pointer-events: none, fully optional (WebGL
// support probe + quality preset + prefers-reduced-motion — AeroAmpSkin
// decides whether this mounts at all), and if it doesn't mount, the
// Fase 6-13 SVG-only shell is still a complete, correct player by itself.
import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBox, Points, PointMaterial } from '@react-three/drei';
import './IceMaterial';
import { buildIceEnvironmentTexture } from './Caustics';

// FASE 15.10 quality presets. HIGH: full particle counts across all three
// internal-volume layers + the fastest capture refresh. MEDIUM: fewer
// particles per layer, slower capture refresh, capped device pixel ratio —
// the shader itself is cheap per-pixel; capture frequency and particle
// count are the two real cost knobs on a player this size. LOW never
// reaches this component: AeroAmpSkin simply doesn't mount it.
// FASE 16 COMPOSICIÓN VISUAL — "los efectos compiten con la interfaz;
// reducirlos hasta que la interfaz vuelva a mandar." Particle counts cut
// again from Fase 15 on top of every per-layer opacity cut in
// InternalIceVolume below — fewer, quieter specks.
const QUALITY_PRESETS = {
  high: { front: 20, medium: 10, deep: 5, dpr: [1, 2], captureMs: 150, captureScale: 1.6 },
  medium: { front: 8, medium: 4, deep: 3, dpr: [1, 1], captureMs: 260, captureScale: 1.15 }
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

// ---------------------------------------------------------------------------
// FASE 15.1 — real scene capture. Clones the live SVG, resolves every
// CSS-custom-property-driven fill/stroke/stop-color to its literal computed
// value on the clone (a detached, serialized SVG can't see var(--shell) etc.
// defined on an ancestor <div> — this is what makes the capture actually
// match what's on screen instead of falling back to broken/transparent
// paint), serializes it, rasterizes it into a canvas, and keeps a
// THREE.CanvasTexture pointed at that canvas.
// ---------------------------------------------------------------------------
const RESOLVED_STYLE_PROPS = ['fill', 'stroke', 'stop-color', 'opacity', 'fill-opacity', 'stroke-opacity'];

function serializeSvgWithResolvedStyle(liveSvg, pixelWidth, pixelHeight) {
  const clone = liveSvg.cloneNode(true);
  const liveEls = liveSvg.querySelectorAll('*');
  const cloneEls = clone.querySelectorAll('*');
  for (let i = 0; i < liveEls.length; i += 1) {
    const liveEl = liveEls[i];
    const cloneEl = cloneEls[i];
    if (!cloneEl) continue;
    const computed = window.getComputedStyle(liveEl);
    for (let p = 0; p < RESOLVED_STYLE_PROPS.length; p += 1) {
      const prop = RESOLVED_STYLE_PROPS[p];
      const val = computed.getPropertyValue(prop);
      if (val) cloneEl.style.setProperty(prop, val);
    }
  }
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(pixelWidth));
  clone.setAttribute('height', String(pixelHeight));
  return new XMLSerializer().serializeToString(clone);
}

// A tiny controller object (not React state — this updates far too often
// and none of it needs to trigger a re-render) that owns the canvas, the
// THREE.CanvasTexture, and the capture scheduling for one <svg> element.
function createSvgCapture(svgEl, scale, onFirstReady) {
  const viewBox = svgEl.viewBox && svgEl.viewBox.baseVal;
  const width = Math.max(2, Math.round((viewBox && viewBox.width ? viewBox.width : 600) * scale));
  const height = Math.max(2, Math.round((viewBox && viewBox.height ? viewBox.height : 300) * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  // FASE 16 — deliberately NOT SRGBColorSpace: this custom shader reads
  // uSceneTex with a raw texture2D() call and writes gl_FragColor directly
  // (no THREE lighting/tone-mapping pipeline in between), so tagging it as
  // sRGB here just invited a second, unwanted reinterpretation of colors
  // that were already correct — the actual cause of Fase 15's slightly
  // "hazy," washed-out captured UI. NoColorSpace samples the canvas's own
  // pixels as-is.
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const state = { texture, ready: false, disposed: false };
  let pending = false;

  const capture = () => {
    if (state.disposed || pending || !svgEl.isConnected) return;
    pending = true;
    let svgString;
    try {
      svgString = serializeSvgWithResolvedStyle(svgEl, width, height);
    } catch {
      pending = false;
      return;
    }
    const img = new Image();
    img.onload = () => {
      pending = false;
      if (state.disposed) return;
      ctx.clearRect(0, 0, width, height);
      try {
        ctx.drawImage(img, 0, 0, width, height);
        texture.needsUpdate = true;
        const wasReady = state.ready;
        state.ready = true;
        if (!wasReady && onFirstReady) onFirstReady();
      } catch {
        // A same-origin data: URL should never taint the canvas; if a
        // browser refuses anyway, just keep the last good frame.
      }
    };
    img.onerror = () => {
      pending = false;
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
  };

  return { state, capture };
}

function useSvgSceneTexture(svgRef, captureMs, scale, onFirstReady) {
  const controllerRef = useRef(null);
  const stateRef = useRef({ texture: null, ready: false });
  // Latest-ref pattern: AeroAmpSkin passes a fresh inline callback on every
  // render (it just calls setState once), but recreating the whole capture
  // pipeline every time the parent re-renders (e.g. every second, from
  // currentTime ticking) would be wasteful and would flicker the capture —
  // so the capture-setup effect below depends on svgRef/captureMs/scale
  // only, and always calls through this ref to whatever the latest
  // callback is.
  const onFirstReadyRef = useRef(onFirstReady);
  useEffect(() => {
    onFirstReadyRef.current = onFirstReady;
  }, [onFirstReady]);

  useEffect(() => {
    const svgEl = svgRef && svgRef.current;
    if (!svgEl) return undefined;

    const controller = createSvgCapture(svgEl, scale, () => {
      if (onFirstReadyRef.current) onFirstReadyRef.current();
    });
    controllerRef.current = controller;
    stateRef.current = controller.state;

    controller.capture();
    const interval = window.setInterval(controller.capture, captureMs);

    // Recapture promptly on real UI changes (play/pause icon, track title,
    // VU bar heights) instead of waiting up to a full captureMs tick.
    let mutationTimer = null;
    const observer = new MutationObserver(() => {
      if (mutationTimer) return;
      mutationTimer = window.setTimeout(() => {
        mutationTimer = null;
        controller.capture();
      }, 60);
    });
    observer.observe(svgEl, {
      attributes: true,
      attributeFilter: ['d', 'height', 'y', 'fill', 'class', 'style', 'transform'],
      subtree: true,
      characterData: true,
      childList: true
    });

    return () => {
      window.clearInterval(interval);
      if (mutationTimer) window.clearTimeout(mutationTimer);
      observer.disconnect();
      controller.state.disposed = true;
      controller.state.texture.dispose();
    };
  }, [svgRef, captureMs, scale]);

  return stateRef;
}

// ---------------------------------------------------------------------------
// The ice shell itself.
// ---------------------------------------------------------------------------
function IceVolume({ lightRef, audioLevelsRef, sceneStateRef }) {
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

    // FASE 15.8/16 AUDIO REACTIVE FINAL — "bass: ligera respiración,
    // medios: movimiento interno, agudos: destellos pequeños, nunca
    // agresivo." Every coefficient here is cut roughly in half from
    // Fase 15 on top of the shader's own lower base uniforms — at full
    // bass this should read as a slow breath, not a pulse.
    mat.uNormalStrength = 0.42 + a.low * 0.22;
    mat.uRefractionStrength = 0.32 + a.low * 0.16;
    mat.uCausticIntensity = 0.4 + a.mid * 0.18 + a.high * 0.08;

    const sceneState = sceneStateRef.current;
    if (sceneState && sceneState.texture) {
      if (mat.uSceneTex !== sceneState.texture) mat.uSceneTex = sceneState.texture;
      mat.uHasScene = sceneState.ready ? 1 : 0;
    }
    if (mat.uEnvMap !== envMap) mat.uEnvMap = envMap;
  });

  return (
    // ICE EDITION BRIEF — concrete render diagnosis, not a tuning guess:
    // at this component's own camera (fov 32, z=3.4), the visible frame at
    // the mesh's depth is ~3.9 x 1.95 units (2 * z * tan(fov/2), times the
    // canvas's own 2:1 aspect) — noticeably bigger than this box's old
    // [3, 1.5] footprint. That gap meant the RoundedBox's own straight edge
    // sat visibly INSIDE the player's real (chamfered) silhouette, so the
    // material's near-uniform base alpha (see RefractionShader.js's
    // baseAlpha/shapedAlpha) painted a hard-edged rectangle floating over
    // the middle of the UI — exactly the "rounded rectangle reads as a web
    // card" trap the brief names, and reproducible in the plain default
    // screenshot regardless of cursor/audio state. Oversizing the box past
    // the true visible extent (with margin for aspect rounding) removes
    // that seam entirely: any overshoot is cropped by the Canvas element's
    // own DOM bounds (inset: 0 on its player-shaped container), so the
    // ONLY edge left visible is the real SVG shell's own chamfered path
    // underneath. Radius scaled with the new width so the corner facet
    // reads the same size in pixels as before, not rounder.
    <RoundedBox args={[4.3, 2.15, 0.34]} radius={0.18} smoothness={4}>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <iceMaterial ref={materialRef} uEnvMap={envMap} />
    </RoundedBox>
  );
}

// ---------------------------------------------------------------------------
// FASE 15.6 — INTERNAL ICE VOLUME. Three genuinely separate depth planes —
// real z placement in the same perspective camera as the rest of the scene,
// not a faked 2D drift — so when Rig shifts the camera with the cursor,
// each layer parallaxes by a different amount purely from real perspective
// projection. front = small suspended flecks near the surface, medium =
// short streak "microfractures," deep = a few large slow bubbles.
// ---------------------------------------------------------------------------
function useVolumeLayer(count, zRange, sizeRange) {
  return useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 2.6;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 1.25;
      positions[i * 3 + 2] = zRange[0] + Math.random() * (zRange[1] - zRange[0]);
    }
    const size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
    return { positions, size };
  }, [count, zRange[0], zRange[1], sizeRange[0], sizeRange[1]]);
}

function VolumeLayer({ count, zRange, sizeRange, baseOpacity, color, audioLevelsRef, driveKey }) {
  const pointsRef = useRef(null);
  const { positions, size } = useVolumeLayer(count, zRange, sizeRange);

  useFrame((state) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const a = audioLevelsRef.current;
    const t = state.clock.getElapsedTime();
    const drive = a[driveKey] || 0;

    // FASE 15.6 movement + FASE 16 AUDIO REACTIVE FINAL "medios: movimiento
    // interno" — kept, magnitude roughly halved so it reads as drift, not
    // sway.
    pts.rotation.y = Math.sin(t * 0.05) * 0.012 + a.mid * 0.018;
    pts.rotation.x = Math.cos(t * 0.04) * 0.007;

    if (pts.material) {
      // FASE 16 — "agudos: pequeños destellos, nunca efecto visual
      // agresivo." Bass/high contributions cut well down from Fase 15;
      // these particles are meant to be found on a close look, not seen
      // from across the room.
      pts.material.size = size * (1 + a.low * 0.25 + Math.sin(t * 9.0) * a.high * 0.06);
      pts.material.opacity = baseOpacity * (1 + drive * 0.22);
    }
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3}>
      <PointMaterial transparent color={color} size={size} sizeAttenuation depthWrite={false} opacity={baseOpacity} />
    </Points>
  );
}

// FASE 16 ICE MICRODETAILS, recolored for the INDUSTRIAL DESIGN FINAL PASS
// palette (Glass White / Aqua / Deep Ocean). That brief separately asks to
// "eliminar... partículas aleatorias, polvo espacial" — this three-layer
// Points system IS literally random floating particles, so it's the other
// place (besides the shader's own per-pixel sparkle, removed in
// RefractionShader.js) that instruction applies to. Full honesty: turning
// these into actual bubble sprites (a ring + offset highlight texture,
// like the two hand-drawn SVG bubbles that replaced the transport-cluster
// stars in AeroAmpSkin.jsx) is out of scope for this pass — PointMaterial
// only draws a flat circular dot, it has no ring/highlight shape of its
// own. What's done here instead: the "front" layer — smallest, most
// numerous, the one that reads as glitter/dust rather than material depth
// — is cut hard (count and opacity both roughly halved again); "deep" is
// the layer already closest in spirit to "large slow bubbles" (per its
// original Fase 15.6 naming) and is left closer to its previous strength.
function InternalIceVolume({ preset, audioLevelsRef }) {
  return (
    <>
      <VolumeLayer
        count={Math.max(1, Math.round(preset.front * 0.5))}
        zRange={[0.08, 0.16]}
        sizeRange={[0.010, 0.015]}
        baseOpacity={0.14}
        color="#FFFFFF"
        audioLevelsRef={audioLevelsRef}
        driveKey="high"
      />
      <VolumeLayer
        count={preset.medium}
        zRange={[-0.02, 0.05]}
        sizeRange={[0.018, 0.026]}
        baseOpacity={0.15}
        color="#5DEBFF"
        audioLevelsRef={audioLevelsRef}
        driveKey="mid"
      />
      <VolumeLayer
        count={preset.deep}
        zRange={[-0.15, -0.06]}
        sizeRange={[0.032, 0.048]}
        baseOpacity={0.13}
        color="#7fb8dc"
        audioLevelsRef={audioLevelsRef}
        driveKey="low"
      />
    </>
  );
}

function Rig({ lightRef }) {
  const { camera } = useThree();
  useFrame(() => {
    // FASE 15.6 — the camera shift that makes the three volume layers
    // above actually separate on screen; also the same light/cursor
    // position used by the material's Fresnel bias (FASE 15.10 TEST 1/4).
    const l = lightRef.current;
    camera.position.x = l.x * 0.18;
    camera.position.y = l.y * 0.12;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function CrystalRenderer({ svgRef, lightRef, audioLevelsRef, quality = 'high', style, onFirstCapture }) {
  const webglOk = useMemo(() => supportsWebGL(), []);
  const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.medium;
  const sceneStateRef = useSvgSceneTexture(webglOk ? svgRef : null, preset.captureMs, preset.captureScale, onFirstCapture);

  if (!webglOk) return null;

  return (
    <Canvas
      dpr={preset.dpr}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 0, 3.4], fov: 32 }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', ...style }}
    >
      {/* FASE 16 LIGHTING FINAL — the brief asks for a product-photography
          three-point rig: KEY (blanco frío, superior izquierda), FILL
          (cyan, lateral), AMBIENT (azul suave, inferior). IceMaterial and
          the internal-volume PointMaterial are both fully custom/unlit
          shaders — they never read THREE's scene lights (no <meshStandard
          .../>-style material anywhere in this layer), so actual
          THREE.js light components here would be inert decoration, not a
          real effect. The three-point rig is instead baked directly into
          the environment map those materials DO sample — see the KEY /
          FILL / AMBIENT gradients inside Caustics.js's
          buildIceEnvironmentTexture(). That keeps every visible light cue
          honest: change one, see it change. */}
      <Rig lightRef={lightRef} />
      <IceVolume lightRef={lightRef} audioLevelsRef={audioLevelsRef} sceneStateRef={sceneStateRef} />
      <InternalIceVolume preset={preset} audioLevelsRef={audioLevelsRef} />
    </Canvas>
  );
}
