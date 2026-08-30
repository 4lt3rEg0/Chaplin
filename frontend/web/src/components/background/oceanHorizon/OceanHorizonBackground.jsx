import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { usePlayerOptional } from "../../../context/PlayerContext";
import { useBackgroundRig } from "../shared/useBackgroundRig";

const DEBUG_AUDIO_VISUALS = false;
const SHOCKWAVE_COUNT = 6;

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothExp = (current, target, lambda, delta) => current + (target - current) * (1 - Math.exp(-lambda * delta));
const smoothChannel = (current, target, attack, release, delta) => smoothExp(current, target, target > current ? attack : release, delta);

const FLOW_GLSL = `
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

mat2 rot2(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash21(i + vec2(0.0, 0.0));
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm2(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += noise2(p) * amplitude;
    p = rot2(0.38) * p * 2.03 + vec2(17.0, 9.0);
    amplitude *= 0.52;
  }
  return value;
}

vec2 noiseVec2(vec2 p) {
  return vec2(
    fbm2(p + vec2(13.4, 7.7)),
    fbm2(p + vec2(-11.3, 19.1))
  ) * 2.0 - 1.0;
}
`;

const SKY_VERTEX = `
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const SKY_FRAGMENT = `
uniform float uTime;
uniform float uRms;
uniform float uMid;
uniform float uAir;
uniform float uCentroid;
uniform float uAspect;
uniform float uEclipseBias;

varying vec2 vUv;
varying vec3 vWorldPosition;

${FLOW_GLSL}

void main() {
  vec2 uv = vUv;
  vec2 centered = uv * 2.0 - 1.0;
  centered.x *= uAspect;

  float t = uTime;
  float horizon = smoothstep(0.12, 0.62, uv.y);
  float zenith = smoothstep(0.40, 0.98, uv.y);

  vec3 deep = vec3(0.008, 0.014, 0.03);
  vec3 mid = vec3(0.018, 0.038, 0.085);
  vec3 upper = vec3(0.028, 0.056, 0.11);
  vec3 color = mix(deep, mid, horizon);
  color = mix(color, upper, zenith * 0.72);

  vec2 hazeUv = vec2(centered.x * 0.35 + uEclipseBias * 0.12, uv.y * 1.15);
  float lowCloud = fbm2(hazeUv * 1.35 + vec2(t * 0.005, -t * 0.011));
  float aurora = fbm2((hazeUv + vec2(0.0, t * 0.008)) * vec2(0.9, 2.7));
  float interference = sin(centered.x * 2.6 + aurora * 2.1 + t * 0.08) * 0.5 + 0.5;

  float horizonGlow = exp(-pow((uv.y - 0.46) * 8.5, 2.0));
  float lateralGlow = exp(-pow((uv.x - (0.58 + uEclipseBias * 0.06)) * 3.1, 2.0));
  vec3 glowColor = mix(vec3(0.13, 0.26, 0.38), vec3(0.34, 0.22, 0.16), smoothstep(0.58, 1.0, uCentroid));

  color += glowColor * horizonGlow * lateralGlow * (0.24 + uRms * 0.16);
  color += vec3(0.04, 0.07, 0.11) * lowCloud * smoothstep(0.34, 0.82, uv.y) * 0.18;
  color += vec3(0.025, 0.055, 0.10) * interference * smoothstep(0.26, 0.72, uv.y) * (0.04 + uAir * 0.03);

  float vignette = smoothstep(1.55, 0.18, length(centered));
  color *= 0.78 + vignette * 0.22;

  gl_FragColor = vec4(color, 1.0);
}
`;

const ECLIPSE_VERTEX = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const ECLIPSE_FRAGMENT = `
uniform float uTime;
uniform float uSub;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uAir;
uniform float uKick;
uniform float uRms;
uniform float uAspect;

varying vec2 vUv;

${FLOW_GLSL}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uAspect;
  float r = length(uv);
  float angle = atan(uv.y, uv.x);
  float t = uTime;

  float coronaNoise = fbm2(vec2(angle * 1.75, r * 6.5 + t * 0.03));
  float angular = fbm2(vec2(angle * 3.4 + t * 0.01, 4.0 + r * 3.0));
  float coronaRadius = 0.34 + coronaNoise * 0.055 + uSub * 0.015 + uBass * 0.018;
  float coronaWidth = 0.18 + uMid * 0.06;
  float coronaMask = smoothstep(coronaRadius + coronaWidth, coronaRadius - 0.02, r);
  coronaMask *= smoothstep(0.12, 0.36, r);

  float shaftNoise = fbm2(vec2(angle * 9.0 - t * 0.012, r * 2.8 + 3.1));
  float shafts = pow(max(0.0, angular * 0.75 + shaftNoise * 0.45), 4.0);
  shafts *= smoothstep(0.34, 0.86, r) * (1.0 - smoothstep(0.92, 1.28, r));

  float halo = exp(-pow((r - 0.46) * 5.8, 2.0));
  float diffraction = exp(-pow((r - 0.62) * 11.0, 2.0)) * (0.18 + uTreble * 0.16 + uAir * 0.08);
  float flash = uKick * exp(-pow((r - 0.37) * 10.0, 2.0)) * 0.24;

  vec3 warm = vec3(0.95, 0.68, 0.34);
  vec3 cool = vec3(0.42, 0.78, 0.96);
  vec3 color = mix(cool, warm, smoothstep(0.28, 0.84, coronaNoise + uRms * 0.1));
  color *= coronaMask * (0.45 + uRms * 0.35);
  color += warm * halo * (0.12 + uBass * 0.08);
  color += mix(cool, vec3(0.70, 0.46, 0.92), uTreble) * shafts * (0.03 + uAir * 0.04 + uKick * 0.03);
  color += warm * diffraction;
  color += vec3(1.0, 0.84, 0.58) * flash;

  float occluder = smoothstep(0.30, 0.27, r + coronaNoise * 0.01);
  color = mix(color, vec3(0.0), occluder);

  float alpha = clamp(max(halo * 0.32, coronaMask * 0.9) + shafts * 0.12 + diffraction * 0.16, 0.0, 1.0);
  alpha = max(alpha, occluder);

  gl_FragColor = vec4(color, alpha);
}
`;

const WATER_VERTEX = `
uniform float uTime;
uniform float uSub;
uniform float uBass;
uniform float uLowMid;
uniform float uMid;
uniform float uHighMid;
uniform float uTreble;
uniform float uAir;
uniform float uRms;
uniform float uCentroid;
uniform float uFlux;
uniform float uKick;
uniform float uSnare;
uniform float uHighTransient;
uniform float uDeformGain;
uniform float uMotionGain;
uniform vec3 uCameraPosition;
uniform vec4 uShockwaves[${SHOCKWAVE_COUNT}];
uniform float uDetailScale;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vDistance;
varying float vShock;
varying float vFoam;
varying float vDetailFade;
varying float vHeight;
varying vec2 vUv;

${FLOW_GLSL}

vec3 surfaceToLocal(vec2 surface, float height) {
  return vec3(surface.x, -surface.y, height);
}

vec3 gerstner(vec2 p, vec2 direction, float wavelength, float amplitude, float speed, float phaseOffset) {
  vec2 dir = normalize(direction);
  float k = 6.28318530718 / wavelength;
  float phase = dot(dir, p) * k + phaseOffset - uTime * speed * (0.72 + uMotionGain * 0.52);
  float steepness = clamp(0.6 / max(k * amplitude, 0.001), 0.0, 0.85);
  float c = cos(phase);
  float s = sin(phase);
  return vec3(dir.x * (steepness * amplitude * c), amplitude * s, dir.y * (steepness * amplitude * c));
}

float shockwaveField(vec2 p) {
  float total = 0.0;
  for (int i = 0; i < ${SHOCKWAVE_COUNT}; i++) {
    vec4 wave = uShockwaves[i];
    if (wave.w <= 0.0001) continue;
    float dist = length(p - wave.xy);
    float ring = sin((dist - wave.z) * 0.35) * exp(-abs(dist - wave.z) * 0.08);
    total += ring * wave.w;
  }
  return total;
}

vec3 oceanDisplacement(vec2 p, float detailFade) {
  float macroAmp = 0.72 + pow(uSub, 1.35) * 1.55 + uRms * 0.28;
  float steepness = 0.72 + pow(uBass, 1.15) * 1.25;

  vec2 warp = noiseVec2(p * 0.012 + vec2(uTime * 0.018, -uTime * 0.014));
  warp += noiseVec2(p * 0.028 - vec2(uTime * 0.031, uTime * 0.022)) * 0.5;
  warp *= 1.8 + uLowMid * 5.2 + uRms * 1.1;

  vec2 q = p + warp;
  vec3 swell = gerstner(q, vec2(1.0, 0.14), 92.0, 0.92 * macroAmp, 0.18 + uSub * 0.10, 0.0);
  swell += gerstner(q, vec2(0.18, 1.0), 136.0, 0.84 * macroAmp, 0.12 + uSub * 0.08, 1.3);
  swell += gerstner(q, vec2(0.82, -0.26), 171.0, 0.66 * macroAmp, 0.09 + uSub * 0.06, 2.1);
  swell += gerstner(q, vec2(-0.58, 0.72), 61.0, 0.45 * macroAmp, 0.24 + uBass * 0.16, 0.8);

  float interference = sin(q.x * 0.024 + uTime * (0.10 + uMid * 0.10)) * sin(q.y * 0.019 - uTime * (0.08 + uMid * 0.12));
  float turbulence = (fbm2(q * 0.045 + vec2(uTime * 0.03, -uTime * 0.027)) - 0.5) * (0.95 + uMid * 1.25);
  float micro = (fbm2(q * (0.16 * uDetailScale) + vec2(-uTime * 0.09, uTime * 0.11)) - 0.5) * detailFade * (0.12 + uHighMid * 0.44 + uAir * 0.18);
  float shock = shockwaveField(p + warp * 0.28) * (0.35 + uKick * 0.85 + uRms * 0.15);

  vec3 disp = swell;
  disp.x += turbulence * 0.32 + interference * (0.18 + uMid * 0.22);
  disp.z += turbulence * 0.22 - interference * (0.16 + uMid * 0.14);
  disp.y += turbulence + interference * steepness * 0.36 + micro + shock;
  return disp;
}

void main() {
  vUv = uv;
  vec2 basePlane = vec2(position.x, position.y);
  float detailFade = smoothstep(0.10, 0.84, uv.y);

  vec3 disp = oceanDisplacement(basePlane, detailFade);
  vec3 displaced = surfaceToLocal(vec2(basePlane.x + disp.x, basePlane.y + disp.z), disp.y);

  float stepSize = mix(1.55, 0.85, detailFade);
  vec2 sampleX = basePlane + vec2(stepSize, 0.0);
  vec2 sampleZ = basePlane + vec2(0.0, stepSize);
  vec3 dispX = oceanDisplacement(sampleX, detailFade);
  vec3 dispZ = oceanDisplacement(sampleZ, detailFade);

  vec3 worldX = surfaceToLocal(vec2(sampleX.x + dispX.x, sampleX.y + dispX.z), dispX.y);
  vec3 worldZ = surfaceToLocal(vec2(sampleZ.x + dispZ.x, sampleZ.y + dispZ.z), dispZ.y);
  vec3 objectNormal = normalize(cross(worldZ - displaced, worldX - displaced));

  float shock = shockwaveField(basePlane) * (0.3 + uKick * 0.9);
  float slope = 1.0 - clamp(dot(objectNormal, vec3(0.0, 1.0, 0.0)), 0.0, 1.0);

  vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
  vWorldPosition = worldPosition.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
  vViewDir = normalize(uCameraPosition - worldPosition.xyz);
  vDistance = distance(uCameraPosition, worldPosition.xyz);
  vShock = shock;
  vFoam = clamp(slope * 1.45 + shock * 0.65 + uHighTransient * 0.08, 0.0, 1.0);
  vDetailFade = detailFade;
  vHeight = displaced.y;

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const WATER_FRAGMENT = `
uniform float uTime;
uniform float uTreble;
uniform float uAir;
uniform float uRms;
uniform float uCentroid;
uniform float uKick;
uniform float uSnare;
uniform float uHighTransient;
uniform vec3 uEclipseWorld;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying float vDistance;
varying float vShock;
varying float vFoam;
varying float vDetailFade;
varying float vHeight;
varying vec2 vUv;

${FLOW_GLSL}

void main() {
  vec3 normal = normalize(vWorldNormal);
  vec3 viewDir = normalize(vViewDir);
  vec3 eclipseDir = normalize(uEclipseWorld - vWorldPosition);
  vec3 reflected = reflect(-viewDir, normal);
  vec3 halfVec = normalize(viewDir + eclipseDir);

  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.2);
  float ndl = max(dot(normal, eclipseDir), 0.0);
  float breakup = fbm2(vWorldPosition.xz * 0.016 + vec2(uTime * 0.02, -uTime * 0.015));
  float roughReflect = mix(20.0, 54.0, breakup * 0.65 + (1.0 - vDetailFade) * 0.35);
  float reflectionLobe = pow(max(dot(reflected, eclipseDir), 0.0), roughReflect);
  float specular = pow(max(dot(normal, halfVec), 0.0), mix(52.0, 138.0, vDetailFade));

  float distanceFog = smoothstep(72.0, 320.0, vDistance);
  float horizonMask = smoothstep(0.06, 0.62, 1.0 - vUv.y);
  float nearMask = smoothstep(0.12, 0.88, vUv.y);
  float crest = smoothstep(0.22, 1.85, vHeight + vShock * 0.6);

  vec3 deep = vec3(0.004, 0.012, 0.028);
  vec3 mid = vec3(0.012, 0.028, 0.056);
  vec3 underlight = mix(vec3(0.05, 0.18, 0.28), vec3(0.20, 0.16, 0.12), smoothstep(0.58, 1.0, uCentroid));
  vec3 color = mix(deep, mid, nearMask * 0.45 + ndl * 0.18);

  float reflectionBand = reflectionLobe * (0.22 + uRms * 0.34 + vShock * 0.22);
  float shockSpec = vShock * (0.14 + uKick * 0.46 + uSnare * 0.20);
  float sparkle = pow(max(0.0, breakup), 3.0) * (0.02 + uAir * 0.08 + uHighTransient * 0.05) * vDetailFade;
  float foam = smoothstep(0.34, 0.96, vFoam) * (0.06 + uTreble * 0.08 + vShock * 0.08);

  color += underlight * reflectionBand;
  color += vec3(0.68, 0.84, 0.94) * specular * (0.05 + uTreble * 0.14);
  color += vec3(0.95, 0.74, 0.40) * shockSpec;
  color += vec3(0.72, 0.86, 1.0) * sparkle;
  color += vec3(0.80, 0.88, 0.95) * foam;
  color += underlight * fresnel * (0.10 + horizonMask * 0.18);

  float horizonGlow = exp(-pow((vWorldPosition.y + 0.38) * 3.6, 2.0)) * horizonMask;
  color += mix(vec3(0.10, 0.21, 0.30), vec3(0.34, 0.23, 0.14), smoothstep(0.55, 1.0, uCentroid)) * horizonGlow * (0.24 + uRms * 0.10);

  vec3 fogColor = mix(vec3(0.028, 0.036, 0.06), vec3(0.18, 0.15, 0.16), horizonMask);
  color = mix(color, fogColor, distanceFog * 0.46);

  gl_FragColor = vec4(color, 1.0);
}
`;

export default function OceanHorizonBackground() {
  const playerContext = usePlayerOptional();
  const { tuning } = useBackgroundRig();
  const fallbackVisualizerRef = useRef({
    bass: 0,
    mid: 0,
    treble: 0,
    pulse: 0,
    beat: 0,
    trackProgress: 0,
    sub: 0,
    subSlow: 0,
    bassSlow: 0,
    lowMid: 0,
    lowMidSlow: 0,
    midSlow: 0,
    highMid: 0,
    highMidSlow: 0,
    air: 0,
    trebleSlow: 0,
    airSlow: 0,
    rms: 0,
    centroid: 0.28,
    flux: 0,
    kick: 0,
    snare: 0,
    highTransient: 0,
    active: false,
    updatedAt: 0
  });
  const visualizerStateRef = playerContext?.visualizerStateRef ?? fallbackVisualizerRef;

  const cameraRef = useRef(null);
  const waterRef = useRef(null);
  const skyRef = useRef(null);
  const eclipseRef = useRef(null);
  const debugRef = useRef(null);
  const lastKickRef = useRef(0);
  const shockCooldownRef = useRef(0);
  const nextShockIndexRef = useRef(0);

  const cameraState = useRef({
    x: 0.25,
    y: 3.1,
    z: 19.8,
    lookX: 2.4,
    lookY: -1.15,
    lookZ: -176,
    fov: 31.0,
    impulse: 0.0
  });

  const audioState = useRef({
    sub: 0,
    bass: 0,
    lowMid: 0,
    mid: 0,
    highMid: 0,
    treble: 0,
    air: 0,
    rms: 0,
    centroid: 0.28,
    flux: 0,
    kick: 0,
    snare: 0,
    highTransient: 0,
    beat: 0,
    pulse: 0,
    trackProgress: 0
  });

  const quality = useMemo(() => {
    if (typeof window === "undefined") {
      return { segmentsX: 160, segmentsY: 200, detailScale: 1.0 };
    }

    const lowPower = window.innerWidth < 900 || (navigator.hardwareConcurrency || 8) <= 4;
    if (lowPower) {
      return { segmentsX: 96, segmentsY: 128, detailScale: 0.8 };
    }

    if (window.devicePixelRatio > 1.5) {
      return { segmentsX: 144, segmentsY: 180, detailScale: 0.92 };
    }

    return { segmentsX: 196, segmentsY: 236, detailScale: 1.0 };
  }, []);

  const shockwaveUniforms = useMemo(
    () => Array.from({ length: SHOCKWAVE_COUNT }, () => new THREE.Vector4(0, -9999, 0, 0)),
    []
  );
  const shockwavesRef = useRef(
    Array.from({ length: SHOCKWAVE_COUNT }, () => ({ x: 0, z: -9999, radius: 0, amplitude: 0, speed: 0, active: false }))
  );
  const eclipseWorld = useMemo(() => new THREE.Vector3(16, 12, -205), []);

  const waterUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSub: { value: 0 },
      uBass: { value: 0 },
      uLowMid: { value: 0 },
      uMid: { value: 0 },
      uHighMid: { value: 0 },
      uTreble: { value: 0 },
      uAir: { value: 0 },
      uRms: { value: 0 },
      uCentroid: { value: 0.28 },
      uFlux: { value: 0 },
      uKick: { value: 0 },
      uSnare: { value: 0 },
      uHighTransient: { value: 0 },
      uDeformGain: { value: 1 },
      uMotionGain: { value: 1 },
      uCameraPosition: { value: new THREE.Vector3(0, 1.5, 16) },
      uEclipseWorld: { value: eclipseWorld },
      uShockwaves: { value: shockwaveUniforms },
      uDetailScale: { value: quality.detailScale }
    }),
    [eclipseWorld, quality.detailScale, shockwaveUniforms]
  );

  const skyUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRms: { value: 0 },
      uMid: { value: 0 },
      uAir: { value: 0 },
      uCentroid: { value: 0.28 },
      uAspect: { value: 1.6 },
      uEclipseBias: { value: 0.16 }
    }),
    []
  );

  const eclipseUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSub: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uAir: { value: 0 },
      uKick: { value: 0 },
      uRms: { value: 0 },
      uAspect: { value: 1.0 }
    }),
    []
  );

  useEffect(() => {
    return () => {
      waterRef.current?.geometry?.dispose?.();
      waterRef.current?.material?.dispose?.();
      skyRef.current?.geometry?.dispose?.();
      skyRef.current?.material?.dispose?.();
      eclipseRef.current?.geometry?.dispose?.();
      eclipseRef.current?.material?.dispose?.();
      debugRef.current?.geometry?.dispose?.();
      debugRef.current?.material?.dispose?.();
    };
  }, []);

  useFrame((state, delta) => {
    const src = visualizerStateRef.current || {};
    const audioGain = tuning.reactivity;
    const bassGain = tuning.bassBoost;
    const trebleGain = tuning.trebleBoost;
    const deformGain = tuning.deformIntensity;
    const motionGain = tuning.animationEnabled ? tuning.motionIntensity : 0;
    const driftTime = state.clock.elapsedTime * (0.72 + motionGain * 0.55);
    const audio = audioState.current;
    audio.sub = smoothChannel(audio.sub, clamp01((src.sub ?? 0) * audioGain * bassGain), 9.0, 2.6, delta);
    audio.bass = smoothChannel(audio.bass, clamp01((src.bass ?? 0) * audioGain * bassGain), 10.5, 3.0, delta);
    audio.lowMid = smoothChannel(audio.lowMid, clamp01((src.lowMid ?? 0) * audioGain), 7.0, 2.8, delta);
    audio.mid = smoothChannel(audio.mid, clamp01((src.mid ?? 0) * audioGain), 4.0, 2.0, delta);
    audio.highMid = smoothChannel(audio.highMid, clamp01((src.highMid ?? 0) * audioGain * trebleGain), 8.0, 2.7, delta);
    audio.treble = smoothChannel(audio.treble, clamp01((src.treble ?? 0) * audioGain * trebleGain), 10.0, 4.5, delta);
    audio.air = smoothChannel(audio.air, clamp01((src.air ?? 0) * audioGain * trebleGain), 14.0, 5.8, delta);
    audio.rms = smoothChannel(audio.rms, clamp01(src.rms ?? 0), 4.0, 1.6, delta);
    audio.centroid = smoothChannel(audio.centroid, clamp01(src.centroid ?? 0.28), 2.0, 1.2, delta);
    audio.flux = smoothChannel(audio.flux, clamp01(src.flux ?? 0), 14.0, 4.2, delta);
    audio.kick = smoothChannel(audio.kick, clamp01((src.kick ?? src.beat ?? 0) * audioGain * bassGain), 18.0, 5.0, delta);
    audio.snare = smoothChannel(audio.snare, clamp01(src.snare ?? 0), 15.0, 5.0, delta);
    audio.highTransient = smoothChannel(audio.highTransient, clamp01((src.highTransient ?? 0) * audioGain * trebleGain), 18.0, 6.4, delta);
    audio.beat = smoothChannel(audio.beat, clamp01(src.beat ?? 0), 13.0, 4.2, delta);
    audio.pulse = smoothChannel(audio.pulse, clamp01(src.pulse ?? 0), 4.5, 1.8, delta);
    audio.trackProgress = smoothChannel(audio.trackProgress, clamp01(src.trackProgress ?? 0), 2.0, 2.0, delta);

    const kickAttack = Math.max(0, audio.kick - lastKickRef.current);
    lastKickRef.current = audio.kick;
    shockCooldownRef.current = Math.max(0, shockCooldownRef.current - delta);

    if (kickAttack > 0.035 && audio.kick > 0.14 && shockCooldownRef.current <= 0) {
      const index = nextShockIndexRef.current % SHOCKWAVE_COUNT;
      const event = shockwavesRef.current[index];
      const t = driftTime;
      event.x = Math.sin(t * 0.37 + index * 1.81) * (12 + audio.mid * 18);
      event.z = -120 + Math.cos(t * 0.19 + index * 1.13) * 18;
      event.radius = 0;
      event.amplitude = (0.14 + audio.kick * 0.28) * deformGain;
      event.speed = (26 + audio.sub * 18 + audio.bass * 12) * (0.72 + motionGain * 0.52);
      event.active = true;
      nextShockIndexRef.current += 1;
      shockCooldownRef.current = 0.16;
      cameraState.current.impulse = Math.max(cameraState.current.impulse, 0.06 + audio.kick * 0.18);
    }

    for (let index = 0; index < SHOCKWAVE_COUNT; index += 1) {
      const event = shockwavesRef.current[index];
      const uniform = shockwaveUniforms[index];
      if (!event.active) {
        uniform.set(0, -9999, 0, 0);
        continue;
      }

      event.radius += event.speed * delta;
      event.amplitude *= Math.exp(-delta * 1.3);
      if (event.radius > 360 || event.amplitude < 0.015) {
        event.active = false;
        uniform.set(0, -9999, 0, 0);
        continue;
      }

      uniform.set(event.x, event.z, event.radius, event.amplitude);
    }

    const time = driftTime;
    const aspect = state.size.width / Math.max(1, state.size.height);
    const wide = clamp01((aspect - 1.0) / 1.3);
    const tall = clamp01((1.0 - aspect) / 0.45);
    const eclipseX = 8.6 + wide * 5.6 - tall * 2.4;
    const eclipseY = 10.7 - wide * 0.8 - tall * 1.1;
    const eclipseZ = -196;
    eclipseWorld.set(eclipseX, eclipseY, eclipseZ);

    if (eclipseRef.current) {
      eclipseRef.current.position.set(eclipseX, eclipseY, eclipseZ);
      eclipseRef.current.scale.setScalar(1 + audio.sub * 0.05 + audio.kick * 0.04);
    }

    if (cameraRef.current) {
      const cam = cameraState.current;
      cam.impulse *= Math.exp(-delta * 7.2);

      const targetX = 0.15 + Math.sin(time * 0.037) * 0.32 + Math.sin(time * 0.009 + 0.7) * 0.16 + audio.mid * 0.08;
      const targetY = 3.05 + Math.sin(time * 0.031 + 0.8) * 0.12 - audio.sub * 0.06;
      const targetZ = 19.8 - audio.sub * 0.18 - audio.rms * 0.12 - cam.impulse;
      const targetLookX = eclipseX * 0.12 + Math.sin(time * 0.014) * 0.4;
      const targetLookY = -1.18 + Math.sin(time * 0.024 + 1.2) * 0.05 + audio.kick * 0.02;
      const targetLookZ = -174 + Math.cos(time * 0.011) * 5.0;
      const targetFov = 31.0 - audio.sub * 0.25 - audio.rms * 0.1;

      cam.x = smoothChannel(cam.x, targetX, 1.9, 1.2, delta);
      cam.y = smoothChannel(cam.y, targetY, 1.7, 1.2, delta);
      cam.z = smoothChannel(cam.z, targetZ, 3.8, 2.2, delta);
      cam.lookX = smoothChannel(cam.lookX, targetLookX, 1.4, 1.0, delta);
      cam.lookY = smoothChannel(cam.lookY, targetLookY, 1.4, 1.0, delta);
      cam.lookZ = smoothChannel(cam.lookZ, targetLookZ, 1.3, 0.9, delta);
      cam.fov = smoothChannel(cam.fov, targetFov, 2.2, 2.2, delta);

      cameraRef.current.position.set(cam.x, cam.y, cam.z);
      cameraRef.current.fov = cam.fov;
      cameraRef.current.updateProjectionMatrix();
      cameraRef.current.lookAt(cam.lookX, cam.lookY, cam.lookZ);
      waterUniforms.uCameraPosition.value.copy(cameraRef.current.position);
    }

    waterUniforms.uTime.value = time;
    waterUniforms.uSub.value = audio.sub;
    waterUniforms.uBass.value = audio.bass;
    waterUniforms.uLowMid.value = audio.lowMid;
    waterUniforms.uMid.value = audio.mid;
    waterUniforms.uHighMid.value = audio.highMid;
    waterUniforms.uTreble.value = audio.treble;
    waterUniforms.uAir.value = audio.air;
    waterUniforms.uRms.value = audio.rms;
    waterUniforms.uCentroid.value = audio.centroid;
    waterUniforms.uFlux.value = audio.flux;
    waterUniforms.uKick.value = audio.kick;
    waterUniforms.uSnare.value = audio.snare;
    waterUniforms.uHighTransient.value = audio.highTransient;
    waterUniforms.uDeformGain.value = deformGain;
    waterUniforms.uMotionGain.value = motionGain;

    skyUniforms.uTime.value = time;
    skyUniforms.uRms.value = audio.rms;
    skyUniforms.uMid.value = audio.mid;
    skyUniforms.uAir.value = audio.air;
    skyUniforms.uCentroid.value = audio.centroid;
    skyUniforms.uAspect.value = aspect;
    skyUniforms.uEclipseBias.value = (eclipseX / 32) * 0.5 + 0.2;

    eclipseUniforms.uTime.value = time;
    eclipseUniforms.uSub.value = audio.sub;
    eclipseUniforms.uBass.value = audio.bass;
    eclipseUniforms.uMid.value = audio.mid;
    eclipseUniforms.uTreble.value = audio.treble;
    eclipseUniforms.uAir.value = audio.air;
    eclipseUniforms.uKick.value = audio.kick;
    eclipseUniforms.uRms.value = audio.rms;
    eclipseUniforms.uAspect.value = aspect;

    if (DEBUG_AUDIO_VISUALS && debugRef.current?.material?.uniforms) {
      debugRef.current.material.uniforms.uSub.value = audio.sub;
      debugRef.current.material.uniforms.uBass.value = audio.bass;
      debugRef.current.material.uniforms.uMid.value = audio.mid;
      debugRef.current.material.uniforms.uTreble.value = audio.treble;
      debugRef.current.material.uniforms.uKick.value = audio.kick;
      debugRef.current.material.uniforms.uCentroid.value = audio.centroid;
    }
  });

  return (
    <group>
      <color attach="background" args={["#02040b"]} />
      <fog attach="fog" args={["#03060d", 95, 360]} />

      <PerspectiveCamera ref={cameraRef} makeDefault fov={31} position={[0.25, 3.1, 19.8]} />

      <ambientLight intensity={0.08} color="#7ea1c5" />
      <directionalLight position={[14, 12, -20]} intensity={0.32} color="#a6daff" />
      <directionalLight position={[24, 20, -160]} intensity={1.35} color="#ffb66f" />
      <pointLight position={[16, 10, -185]} intensity={1.05} distance={240} color="#f4b46a" />

      <mesh ref={skyRef} position={[0, 34, -250]}>
        <planeGeometry args={[620, 320, 1, 1]} />
        <shaderMaterial
          uniforms={skyUniforms}
          vertexShader={SKY_VERTEX}
          fragmentShader={SKY_FRAGMENT}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh ref={eclipseRef} position={[8.6, 10.7, -196]}>
        <planeGeometry args={[90, 90, 1, 1]} />
        <shaderMaterial
          uniforms={eclipseUniforms}
          vertexShader={ECLIPSE_VERTEX}
          fragmentShader={ECLIPSE_FRAGMENT}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.15, -120]}>
        <planeGeometry args={[400, 460, quality.segmentsX, quality.segmentsY]} />
        <shaderMaterial uniforms={waterUniforms} vertexShader={WATER_VERTEX} fragmentShader={WATER_FRAGMENT} />
      </mesh>

      {DEBUG_AUDIO_VISUALS ? (
        <mesh ref={debugRef} position={[-6.8, 4.1, -12]}>
          <planeGeometry args={[4.2, 0.45, 1, 1]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            uniforms={{
              uSub: { value: 0 },
              uBass: { value: 0 },
              uMid: { value: 0 },
              uTreble: { value: 0 },
              uKick: { value: 0 },
              uCentroid: { value: 0 }
            }}
            vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
            fragmentShader={`uniform float uSub; uniform float uBass; uniform float uMid; uniform float uTreble; uniform float uKick; uniform float uCentroid; varying vec2 vUv; void main(){ float v = 0.0; v += step(vUv.x, 0.16) * step(1.0 - vUv.y, uSub); v += step(abs(vUv.x - 0.28), 0.08) * step(1.0 - vUv.y, uBass); v += step(abs(vUv.x - 0.46), 0.08) * step(1.0 - vUv.y, uMid); v += step(abs(vUv.x - 0.64), 0.08) * step(1.0 - vUv.y, uTreble); v += step(abs(vUv.x - 0.82), 0.08) * step(1.0 - vUv.y, uKick); vec3 color = mix(vec3(0.06, 0.08, 0.12), vec3(0.14 + uCentroid * 0.4, 0.5, 0.9), clamp(v, 0.0, 1.0)); gl_FragColor = vec4(color, 0.78); }`}
          />
        </mesh>
      ) : null}
    </group>
  );
}