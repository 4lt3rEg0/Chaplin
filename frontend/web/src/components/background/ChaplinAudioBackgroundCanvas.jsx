import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import {
  OceanHorizon,
  LiquidTornado,
  GlassHourglass,
  CosmicTelescope,
  EnergyGridFloor,
  NeuralWeb,
  AuroraSky,
  LiquidChromeWaves,
  RainfieldNeon,
  PlasmaSphere,
  DataTunnel,
  FractalBloom,
  NightVisionLandscape
} from "./index";

export { CHAPLIN_AUDIO_STYLE_SET } from "./audioStyleIds";

const STYLE_COMPONENTS = {
  oceanHorizon: OceanHorizon,
  liquidTornado: LiquidTornado,
  glassHourglass: GlassHourglass,
  cosmicTelescope: CosmicTelescope,
  energyGridFloor: EnergyGridFloor,
  neuralWeb: NeuralWeb,
  auroraSky: AuroraSky,
  liquidChromeWaves: LiquidChromeWaves,
  rainfieldNeon: RainfieldNeon,
  plasmaSphere: PlasmaSphere,
  dataTunnel: DataTunnel,
  fractalBloom: FractalBloom,
  nightVisionLandscape: NightVisionLandscape
};

export default function ChaplinAudioBackgroundCanvas({ styleId }) {
  const SelectedBackground = useMemo(() => STYLE_COMPONENTS[styleId] || DataTunnel, [styleId]);
  const [contextLost, setContextLost] = useState(false);
  const [mountKey, setMountKey] = useState(0);
  const canvasElRef = useRef(null);
  const listenerCleanupRef = useRef(null);
  const dpr = useMemo(() => {
    if (typeof window === "undefined") return [1, 1.5];
    const lowPower = window.innerWidth < 900 || (navigator.hardwareConcurrency || 8) <= 4;
    return lowPower ? [1, 1.25] : [1, 1.6];
  }, []);

  const handleCreated = useCallback(({ gl }) => {
    listenerCleanupRef.current?.();
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 0.62;
    gl.outputColorSpace = THREE.SRGBColorSpace;

    const canvasEl = gl.domElement;
    canvasElRef.current = canvasEl;

    const onContextLost = (event) => {
      // Prevent the browser's default (which would leave the context permanently dead)
      // so a `webglcontextrestored` event has a chance to fire.
      event.preventDefault();
      // eslint-disable-next-line no-console
      console.error("[Chaplin] WebGL context lost on background canvas.");
      setContextLost(true);
    };

    const onContextRestored = () => {
      // eslint-disable-next-line no-console
      console.warn("[Chaplin] WebGL context restored — remounting background.");
      setContextLost(false);
      // Force a clean remount of the visualizer tree rather than trying to
      // resume mid-state on top of freshly-recreated GPU resources.
      setMountKey((key) => key + 1);
    };

    canvasEl.addEventListener("webglcontextlost", onContextLost, false);
    canvasEl.addEventListener("webglcontextrestored", onContextRestored, false);
    listenerCleanupRef.current = () => {
      canvasEl.removeEventListener("webglcontextlost", onContextLost, false);
      canvasEl.removeEventListener("webglcontextrestored", onContextRestored, false);
      if (canvasElRef.current === canvasEl) canvasElRef.current = null;
    };
  }, []);

  useEffect(() => () => listenerCleanupRef.current?.(), []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none"
      }}
    >
      {contextLost ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 50% 30%, #141a24 0%, #05070b 70%)"
          }}
        />
      ) : (
        <Canvas
          key={mountKey}
          dpr={dpr}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          onCreated={handleCreated}
        >
          <SelectedBackground />
        </Canvas>
      )}
    </div>
  );
}
