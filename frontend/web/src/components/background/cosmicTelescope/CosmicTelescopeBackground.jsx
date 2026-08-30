import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { usePlayerOptional } from "../../../context/PlayerContext";
import { useBackgroundRig } from "../shared/useBackgroundRig";

const TAU = Math.PI * 2;
const DEBUG_GRAVITY_LENS = false;
const WAVE_EVENT_COUNT = 5;

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothExp = (current, target, lambda, delta) => current + (target - current) * (1 - Math.exp(-lambda * delta));
const smoothChannel = (current, target, attack, release, delta) => smoothExp(current, target, target > current ? attack : release, delta);
const hash01 = (index, offset = 0) => {
  const value = Math.sin((index + 1) * 12.9898 + offset * 78.233) * 43758.5453123;
  return value - Math.floor(value);
};

const FLOW_GLSL = `
const float PI = 3.141592653589793;

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
    p = rot2(0.41) * p * 2.02 + vec2(17.0, 9.0);
    amplitude *= 0.52;
  }
  return value;
}

float ridge2(vec2 p) {
  float n = fbm2(p);
  return 1.0 - abs(n * 2.0 - 1.0);
}

vec2 noiseVec2(vec2 p) {
  return vec2(
    fbm2(p + vec2(13.4, 7.7)),
    fbm2(p + vec2(-11.3, 19.1))
  ) * 2.0 - 1.0;
}

vec2 lensVector(vec2 uv, vec2 center, float aspect) {
  vec2 q = uv - center;
  q.x *= aspect;
  return q;
}

float waveField(vec2 uv, vec2 center, float aspect, vec4 waveEvents[${WAVE_EVENT_COUNT}]) {
  vec2 q = lensVector(uv, center, aspect);
  float total = 0.0;
  for (int i = 0; i < ${WAVE_EVENT_COUNT}; i++) {
    vec4 event = waveEvents[i];
    if (event.w <= 0.0001) {
      continue;
    }
    vec2 dq = q - event.xy;
    float dist = length(dq);
    float ring = sin((dist - event.z) * 42.0) * exp(-abs(dist - event.z) * 18.0);
    total += ring * event.w;
  }
  return total;
}

vec2 lensDeflection(
  vec2 uv,
  vec2 center,
  float aspect,
  float mass,
  float strength,
  float shear,
  float shearAngle,
  float ellipticity,
  float anisotropy,
  float depthFactor,
  float wave,
  vec4 secondaryA,
  vec4 secondaryB
) {
  vec2 q = lensVector(uv, center, aspect);
  float r = max(length(q), 0.02);
  vec2 dir = q / r;
  vec2 tangent = vec2(-dir.y, dir.x);
  float ellipse = 1.0 + cos(atan(q.y, q.x) * 2.0 + ellipticity) * anisotropy;
  float radial = -(mass * strength * depthFactor * ellipse) / (r + 0.10);

  vec2 shearAxis = vec2(cos(shearAngle), sin(shearAngle));
  vec2 shearPerp = vec2(-shearAxis.y, shearAxis.x);
  float shearProjection = dot(q, shearAxis) - dot(q, shearPerp);
  vec2 shearVec = shearPerp * shearProjection * shear * 0.28;

  float noisePhase = fbm2(q * 6.2 + vec2(ellipticity * 0.13, shearAngle * 0.11));
  vec2 noiseVec = tangent * (noisePhase - 0.5) * 0.05 * strength;
  vec2 waveVec = dir * wave * 0.12;

  vec2 deflect = (dir * radial + shearVec + noiseVec + waveVec) / vec2(aspect, 1.0);

  vec4 secondaries[2];
  secondaries[0] = secondaryA;
  secondaries[1] = secondaryB;
  for (int i = 0; i < 2; i++) {
    vec4 s = secondaries[i];
    if (s.z <= 0.0001) {
      continue;
    }
    vec2 sq = lensVector(uv, s.xy, aspect);
    float sr = max(length(sq), 0.02);
    vec2 sdir = sq / sr;
    deflect += (sdir * (-(s.z * depthFactor) / (sr + s.w))) / vec2(aspect, 1.0);
  }

  return deflect;
}

vec3 starTemperature(float temperature) {
  vec3 deepRed = vec3(0.72, 0.46, 0.34);
  vec3 amber = vec3(0.92, 0.78, 0.54);
  vec3 warmWhite = vec3(0.98, 0.94, 0.84);
  vec3 blueWhite = vec3(0.82, 0.9, 1.0);
  vec3 cold = vec3(0.68, 0.86, 1.0);

  vec3 color = mix(deepRed, amber, smoothstep(0.0, 0.24, temperature));
  color = mix(color, warmWhite, smoothstep(0.18, 0.5, temperature));
  color = mix(color, blueWhite, smoothstep(0.46, 0.82, temperature));
  color = mix(color, cold, smoothstep(0.72, 1.0, temperature));
  return color;
}
`;

const FIELD_VERTEX = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FIELD_FRAGMENT = `
uniform float uTime;
uniform float uAspect;
uniform vec2 uLensCenter;
uniform float uLensMass;
uniform float uLensStrength;
uniform float uShear;
uniform float uShearAngle;
uniform float uEllipticity;
uniform float uAnisotropy;
uniform float uLowMid;
uniform float uHighMid;
uniform float uRms;
uniform float uCentroid;
uniform float uFluxArc;
uniform float uOpticalEcho;
uniform vec4 uWaveEvents[${WAVE_EVENT_COUNT}];
uniform vec4 uSecondaryA;
uniform vec4 uSecondaryB;

varying vec2 vUv;

${FLOW_GLSL}

void main() {
  vec2 uv = vUv;
  float wave = waveField(uv, uLensCenter, uAspect, uWaveEvents);
  vec2 deflect = lensDeflection(
    uv,
    uLensCenter,
    uAspect,
    uLensMass,
    uLensStrength,
    uShear,
    uShearAngle,
    uEllipticity,
    uAnisotropy,
    1.0,
    wave,
    uSecondaryA,
    uSecondaryB
  );
  vec2 sampleUv = uv + deflect * 0.9;
  vec2 centered = sampleUv * 2.0 - 1.0;
  centered.x *= uAspect;

  vec3 color = mix(vec3(0.0, 0.003, 0.012), vec3(0.01, 0.02, 0.05), smoothstep(-0.8, 0.95, centered.y));

  vec2 warp = noiseVec2(centered * 0.55 + vec2(uTime * 0.004, -uTime * 0.006));
  vec2 q = centered * vec2(0.72, 1.0) + warp * (0.10 + uLowMid * 0.08);
  float ridge = ridge2(q * (1.1 + uHighMid * 0.22));
  float ridge2b = ridge2(q * 2.25 - vec2(uTime * 0.003, 0.0));
  float web = smoothstep(0.54, 0.9, ridge * 0.7 + ridge2b * 0.3);
  float voids = fbm2(q * 0.52 - vec2(0.0, uTime * 0.002));
  float cosmicDust = smoothstep(0.5, 0.92, voids) * smoothstep(0.10, 0.82, web);

  vec2 lensQ = lensVector(uv, uLensCenter, uAspect);
  float lensR = length(lensQ);
  float ring = exp(-abs(lensR - (0.15 + uLensStrength * 0.08)) * (18.0 - uHighMid * 4.0));
  float anisotropicArc = 0.42 + 0.58 * abs(dot(normalize(lensQ + 1e-4), vec2(cos(uShearAngle), sin(uShearAngle))));
  float arcs = ring * (0.22 + uLensStrength * 0.46 + uFluxArc * 0.2) * (0.48 + web * 0.52) * anisotropicArc;
  float photonEdge = exp(-abs(lensR - 0.115) * 42.0) * (0.12 + uLensStrength * 0.3);
  float gravityVoid = exp(-lensR * lensR * 105.0);

  vec3 filamentColor = mix(vec3(0.04, 0.06, 0.09), vec3(0.09, 0.13, 0.20), smoothstep(0.3, 0.9, uCentroid));
  vec3 arcColor = mix(vec3(0.64, 0.54, 0.42), vec3(0.58, 0.74, 0.96), smoothstep(0.32, 0.88, uCentroid));

  color += filamentColor * cosmicDust * (0.08 + uLowMid * 0.10 + uRms * 0.08);
  color += arcColor * arcs;
  color += mix(vec3(0.72, 0.48, 0.26), vec3(0.5, 0.72, 1.0), uCentroid) * photonEdge;
  color += arcColor * ring * uOpticalEcho * 0.08;
  color *= 1.0 - gravityVoid * 0.78;

  float aperture = smoothstep(1.28, 0.18, length(centered));
  color *= 0.76 + aperture * 0.24;

  gl_FragColor = vec4(color, 1.0);
}
`;

const STAR_VERTEX = `
const float TAU = 6.28318530718;

uniform float uTime;
uniform float uAspect;
uniform vec2 uLensCenter;
uniform float uLensMass;
uniform float uLensStrength;
uniform float uShear;
uniform float uShearAngle;
uniform float uEllipticity;
uniform float uAnisotropy;
uniform float uTreble;
uniform float uAir;
uniform float uRms;
uniform float uCentroid;
uniform float uRevealDepth;
uniform float uFluxArc;
uniform float uOpticalEcho;
uniform float uBrightMode;
uniform vec4 uWaveEvents[${WAVE_EVENT_COUNT}];
uniform vec4 uSecondaryA;
uniform vec4 uSecondaryB;

attribute float aDepth;
attribute float aLuminosity;
attribute float aTemperature;
attribute float aSize;
attribute float aPhase;
attribute float aCluster;
attribute float aDrift;

varying float vAlpha;
varying float vTemperature;
varying float vLuminosity;
varying float vStretch;
varying float vAngle;
varying float vScintillation;
varying float vBrightMode;

${FLOW_GLSL}

void main() {
  vec3 pos = position;
  float depthFactor = clamp(aDepth, 0.0, 1.0);
  float twinkle = sin(uTime * (0.3 + aDrift * 0.8) + aPhase * TAU) * 0.5 + 0.5;
  float driftAmp = (1.0 - depthFactor) * (0.08 + uTreble * 0.08);
  pos.xy += noiseVec2(pos.xy * 0.08 + vec2(uTime * 0.02, -uTime * 0.017) + aPhase * 2.1) * driftAmp;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vec4 clip = projectionMatrix * mvPosition;
  vec2 uv = clip.xy / clip.w * 0.5 + 0.5;

  float wave = waveField(uv, uLensCenter, uAspect, uWaveEvents);
  vec2 deflect = lensDeflection(
    uv,
    uLensCenter,
    uAspect,
    uLensMass,
    uLensStrength,
    uShear,
    uShearAngle,
    uEllipticity,
    uAnisotropy,
    mix(0.35, 1.0, depthFactor),
    wave,
    uSecondaryA,
    uSecondaryB
  );

  vec2 lensQ = lensVector(uv, uLensCenter, uAspect);
  float lensMag = length(deflect) * 34.0;
  vec2 ndc = (uv + deflect) * 2.0 - 1.0;
  clip.xy = ndc * clip.w;
  gl_Position = clip;

  float distAtt = clamp(1.0 / max(1.0, -mvPosition.z * 0.065), 0.18, 1.8);
  float reveal = smoothstep(depthFactor - 0.18, depthFactor + 0.12, uRevealDepth);
  float haloBoost = mix(0.8, 1.5, uBrightMode);
  gl_PointSize = clamp((0.55 + aSize * 2.4 + aLuminosity * 3.2) * distAtt * haloBoost, 0.65, mix(4.6, 11.5, uBrightMode));

  float temp = clamp(mix(aTemperature, uCentroid, 0.22), 0.0, 1.0);
  vAlpha = clamp(reveal * (0.08 + aLuminosity * 0.92) * (0.82 + uRms * 0.28), 0.0, 1.0);
  vTemperature = temp;
  vLuminosity = aLuminosity;
  vStretch = clamp(lensMag * (0.2 + aLuminosity * 0.9) + wave * 0.6, 0.0, 2.4);
  vAngle = atan(lensQ.y, lensQ.x) + PI * 0.5 + uShearAngle * 0.18;
  vScintillation = clamp(twinkle * (uTreble * 0.6 + uAir * 0.24 + aLuminosity * 0.16), 0.0, 1.0);
  vBrightMode = uBrightMode;
}
`;

const STAR_FRAGMENT = `
varying float vAlpha;
varying float vTemperature;
varying float vLuminosity;
varying float vStretch;
varying float vAngle;
varying float vScintillation;
varying float vBrightMode;

${FLOW_GLSL}

vec2 rotate2(vec2 p, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

void main() {
  vec2 p = gl_PointCoord - 0.5;
  vec2 pr = rotate2(p, vAngle);
  pr.x *= 1.0 + vStretch * mix(1.1, 2.3, vBrightMode);

  float d = length(pr);
  if (d > 0.62) discard;

  vec3 color = starTemperature(vTemperature);
  float core = smoothstep(0.42, 0.02, d);
  float halo = smoothstep(0.56, 0.06, d) * (1.0 - smoothstep(0.22, 0.02, d));
  float spikes = 0.0;

  if (vBrightMode > 0.5 && vLuminosity > 0.52) {
    vec2 spikeCoord = rotate2(p, vAngle);
    float crossA = exp(-abs(spikeCoord.x) * 34.0) * exp(-abs(spikeCoord.y) * 3.5);
    float crossB = exp(-abs(spikeCoord.y) * 34.0) * exp(-abs(spikeCoord.x) * 3.5);
    spikes = (crossA + crossB) * smoothstep(0.38, 0.9, vLuminosity) * 0.18;
  }

  vec3 arcTint = mix(vec3(0.94, 0.82, 0.70), vec3(0.72, 0.86, 1.0), smoothstep(0.3, 0.9, vTemperature));
  vec3 finalColor = color * (core * 1.2 + halo * 0.35);
  finalColor += arcTint * halo * (vScintillation * 0.45 + vStretch * 0.08);
  finalColor += arcTint * spikes;

  float alpha = (core * 0.95 + halo * 0.28 + spikes * 0.85) * vAlpha;
  gl_FragColor = vec4(finalColor, alpha);
}
`;

function buildClusterCenters() {
  const centers = [];
  for (let index = 0; index < 12; index += 1) {
    centers.push({
      x: (hash01(index, 0.12) - 0.5) * 190,
      y: (hash01(index, 0.36) - 0.5) * 120,
      z: -60 - hash01(index, 0.72) * 320,
      spread: 8 + hash01(index, 1.18) * 26
    });
  }
  return centers;
}

function createStarGeometry(count, options = {}) {
  const { bright = false } = options;
  const centers = buildClusterCenters();
  const geometry = new THREE.BufferGeometry();
  const position = new Float32Array(count * 3);
  const aDepth = new Float32Array(count);
  const aLuminosity = new Float32Array(count);
  const aTemperature = new Float32Array(count);
  const aSize = new Float32Array(count);
  const aPhase = new Float32Array(count);
  const aCluster = new Float32Array(count);
  const aDrift = new Float32Array(count);

  for (let index = 0; index < count; index += 1) {
    const seedA = hash01(index, 0.13);
    const seedB = hash01(index, 0.37);
    const seedC = hash01(index, 0.61);
    const seedD = hash01(index, 0.89);
    const depth = Math.pow(seedA, bright ? 0.78 : 1.45);
    const clusterMix = seedB;
    const clusterIndex = Math.floor(seedC * centers.length) % centers.length;
    const center = centers[clusterIndex];
    const stride = index * 3;

    let x;
    let y;
    let z;

    if (clusterMix > (bright ? 0.25 : 0.56)) {
      const spread = center.spread * (0.5 + seedD * 0.9);
      x = center.x + (hash01(index, 1.11) - 0.5) * spread;
      y = center.y + (hash01(index, 1.37) - 0.5) * spread * 0.7;
      z = center.z + (hash01(index, 1.63) - 0.5) * spread * 2.4;
    } else {
      const angle = seedC * TAU;
      const radius = Math.pow(seedD, 0.7) * (bright ? 110 : 180);
      x = Math.cos(angle) * radius * (0.4 + depth);
      y = (hash01(index, 1.91) - 0.5) * 120 * (0.35 + depth);
      z = -40 - depth * (bright ? 260 : 360);
    }

    const filamentBias = Math.sin(x * 0.03 + z * 0.006) * Math.cos(y * 0.05 - z * 0.003);
    y += filamentBias * (bright ? 4 : 10);

    position[stride] = x;
    position[stride + 1] = y;
    position[stride + 2] = z;
    aDepth[index] = clamp01(depth);
    aLuminosity[index] = bright ? Math.pow(hash01(index, 2.17), 0.38) : Math.pow(hash01(index, 2.17), 2.8);
    aTemperature[index] = hash01(index, 2.53);
    aSize[index] = bright ? 0.9 + hash01(index, 2.89) * 1.6 : 0.3 + hash01(index, 2.89) * 0.9;
    aPhase[index] = hash01(index, 3.21);
    aCluster[index] = clusterMix;
    aDrift[index] = hash01(index, 3.63);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("aDepth", new THREE.BufferAttribute(aDepth, 1));
  geometry.setAttribute("aLuminosity", new THREE.BufferAttribute(aLuminosity, 1));
  geometry.setAttribute("aTemperature", new THREE.BufferAttribute(aTemperature, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(aPhase, 1));
  geometry.setAttribute("aCluster", new THREE.BufferAttribute(aCluster, 1));
  geometry.setAttribute("aDrift", new THREE.BufferAttribute(aDrift, 1));
  return geometry;
}

export default function CosmicTelescopeBackground() {
  const playerContext = usePlayerOptional();
  const { safeArea, tuning } = useBackgroundRig();
  const fallbackVisualizerRef = useRef({
    bass: 0,
    mid: 0,
    treble: 0,
    pulse: 0,
    beat: 0,
    trackProgress: 0,
    sub: 0,
    lowMid: 0,
    highMid: 0,
    air: 0,
    rms: 0,
    centroid: 0.32,
    flux: 0,
    kick: 0,
    snare: 0,
    highTransient: 0,
    active: false,
    updatedAt: 0
  });
  const visualizerStateRef = playerContext?.visualizerStateRef ?? fallbackVisualizerRef;

  const cameraRef = useRef(null);
  const fieldRef = useRef(null);
  const dimStarsRef = useRef(null);
  const brightStarsRef = useRef(null);

  const audioState = useRef({
    sub: 0,
    bass: 0,
    lowMid: 0,
    mid: 0,
    highMid: 0,
    treble: 0,
    air: 0,
    rms: 0,
    centroid: 0.32,
    flux: 0,
    kick: 0,
    snare: 0,
    highTransient: 0,
    beat: 0,
    pulse: 0,
    trackProgress: 0
  });
  const lensState = useRef({
    centerX: 0.6,
    centerY: 0.47,
    mass: 0.09,
    strength: 0.12,
    shear: 0.02,
    shearAngle: 0.0,
    ellipticity: 0.0,
    anisotropy: 0.08,
    revealDepth: 0.34,
    fluxArc: 0,
    opticalEcho: 0,
    lastKick: 0,
    lastSnare: 0,
    waveCursor: 0
  });
  const cameraState = useRef({
    x: 1.2,
    y: -0.45,
    z: 27.0,
    lookX: 0.0,
    lookY: 0.0,
    lookZ: -160.0,
    fov: 38.0,
    impulse: 0.0
  });

  const quality = useMemo(() => {
    if (typeof window === "undefined") {
      return { dimStars: 42000, brightStars: 1100, waveCount: WAVE_EVENT_COUNT };
    }
    const lowPower = window.innerWidth < 900 || (navigator.hardwareConcurrency || 8) <= 4;
    if (lowPower) {
      return { dimStars: 22000, brightStars: 580, waveCount: WAVE_EVENT_COUNT };
    }
    if (window.devicePixelRatio > 1.5) {
      return { dimStars: 42000, brightStars: 1000, waveCount: WAVE_EVENT_COUNT };
    }
    return { dimStars: 72000, brightStars: 1800, waveCount: WAVE_EVENT_COUNT };
  }, []);

  const dimGeometry = useMemo(() => createStarGeometry(quality.dimStars, { bright: false }), [quality.dimStars]);
  const brightGeometry = useMemo(() => createStarGeometry(quality.brightStars, { bright: true }), [quality.brightStars]);

  const waveUniforms = useMemo(
    () => Array.from({ length: WAVE_EVENT_COUNT }, () => new THREE.Vector4(0, 0, 9999, 0)),
    []
  );
  const waveEventsRef = useRef(
    Array.from({ length: WAVE_EVENT_COUNT }, () => ({ x: 0, y: 0, radius: 9999, amplitude: 0, speed: 0, active: false }))
  );
  const secondaryA = useMemo(() => new THREE.Vector4(0.35, 0.52, 0, 0.16), []);
  const secondaryB = useMemo(() => new THREE.Vector4(0.72, 0.38, 0, 0.14), []);
  const lensCenter = useMemo(() => new THREE.Vector2(0.6, 0.47), []);

  const fieldUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: 1.6 },
      uLensCenter: { value: lensCenter },
      uLensMass: { value: 0.09 },
      uLensStrength: { value: 0.12 },
      uShear: { value: 0.02 },
      uShearAngle: { value: 0 },
      uEllipticity: { value: 0 },
      uAnisotropy: { value: 0.08 },
      uLowMid: { value: 0 },
      uHighMid: { value: 0 },
      uRms: { value: 0 },
      uCentroid: { value: 0.32 },
      uFluxArc: { value: 0 },
      uOpticalEcho: { value: 0 },
      uWaveEvents: { value: waveUniforms },
      uSecondaryA: { value: secondaryA },
      uSecondaryB: { value: secondaryB }
    }),
    [lensCenter, secondaryA, secondaryB, waveUniforms]
  );

  const buildStarUniforms = (brightMode) => ({
    uTime: { value: 0 },
    uAspect: { value: 1.6 },
    uLensCenter: { value: lensCenter },
    uLensMass: { value: 0.09 },
    uLensStrength: { value: 0.12 },
    uShear: { value: 0.02 },
    uShearAngle: { value: 0 },
    uEllipticity: { value: 0 },
    uAnisotropy: { value: 0.08 },
    uTreble: { value: 0 },
    uAir: { value: 0 },
    uRms: { value: 0 },
    uCentroid: { value: 0.32 },
    uRevealDepth: { value: 0.34 },
    uFluxArc: { value: 0 },
    uOpticalEcho: { value: 0 },
    uBrightMode: { value: brightMode },
    uWaveEvents: { value: waveUniforms },
    uSecondaryA: { value: secondaryA },
    uSecondaryB: { value: secondaryB }
  });

  const dimUniforms = useMemo(() => buildStarUniforms(0), [secondaryA, secondaryB, waveUniforms]);
  const brightUniforms = useMemo(() => buildStarUniforms(1), [secondaryA, secondaryB, waveUniforms]);

  useEffect(() => {
    return () => {
      dimGeometry.dispose();
      brightGeometry.dispose();
      fieldRef.current?.geometry?.dispose?.();
      fieldRef.current?.material?.dispose?.();
      dimStarsRef.current?.material?.dispose?.();
      brightStarsRef.current?.material?.dispose?.();
    };
  }, [brightGeometry, dimGeometry]);

  useFrame((state, delta) => {
    const src = visualizerStateRef.current || {};
    const audioGain = tuning.reactivity;
    const bassGain = tuning.bassBoost;
    const trebleGain = tuning.trebleBoost;
    const audio = audioState.current;
    audio.sub = smoothChannel(audio.sub, clamp01((src.sub ?? 0) * audioGain * bassGain), 6.5, 2.1, delta);
    audio.bass = smoothChannel(audio.bass, clamp01((src.bass ?? 0) * audioGain * bassGain), 8.2, 2.7, delta);
    audio.lowMid = smoothChannel(audio.lowMid, clamp01(src.lowMid ?? 0), 2.1, 0.8, delta);
    audio.mid = smoothChannel(audio.mid, clamp01(src.mid ?? 0), 4.0, 1.8, delta);
    audio.highMid = smoothChannel(audio.highMid, clamp01(src.highMid ?? 0), 5.6, 2.4, delta);
    audio.treble = smoothChannel(audio.treble, clamp01((src.treble ?? 0) * audioGain * trebleGain), 12.0, 6.0, delta);
    audio.air = smoothChannel(audio.air, clamp01((src.air ?? 0) * audioGain * trebleGain), 15.0, 7.0, delta);
    audio.rms = smoothChannel(audio.rms, clamp01(src.rms ?? 0), 3.4, 1.4, delta);
    audio.centroid = smoothChannel(audio.centroid, clamp01(src.centroid ?? 0.32), 0.7, 0.4, delta);
    audio.flux = smoothChannel(audio.flux, clamp01(src.flux ?? 0), 10.0, 4.0, delta);
    audio.kick = smoothChannel(audio.kick, clamp01(src.kick ?? 0), 16.0, 5.2, delta);
    audio.snare = smoothChannel(audio.snare, clamp01(src.snare ?? 0), 14.0, 5.0, delta);
    audio.highTransient = smoothChannel(audio.highTransient, clamp01(src.highTransient ?? 0), 18.0, 6.8, delta);
    audio.beat = smoothChannel(audio.beat, clamp01(src.beat ?? 0), 8.0, 3.0, delta);
    audio.pulse = smoothChannel(audio.pulse, clamp01(src.pulse ?? 0), 3.5, 1.6, delta);
    audio.trackProgress = smoothChannel(audio.trackProgress, clamp01(src.trackProgress ?? 0), 0.9, 0.9, delta);

    const aspect = state.size.width / Math.max(1, state.size.height);
    const portrait = aspect < 0.82 ? clamp01((0.82 - aspect) / 0.3) : 0;
    const ultraWide = aspect > 1.9 ? clamp01((aspect - 1.9) / 0.9) : 0;
    const time = state.clock.elapsedTime * (tuning.animationEnabled ? 0.55 + tuning.motionIntensity * 0.45 : 0);
    const lens = lensState.current;

    const kickAttack = Math.max(0, audio.kick - lens.lastKick);
    const snareAttack = Math.max(0, audio.snare - lens.lastSnare);
    lens.lastKick = audio.kick;
    lens.lastSnare = audio.snare;

    if (kickAttack > 0.03 && audio.kick > 0.11) {
      const idx = lens.waveCursor % WAVE_EVENT_COUNT;
      const event = waveEventsRef.current[idx];
      event.x = 0;
      event.y = 0;
      event.radius = 0.0;
      event.amplitude = 0.12 + audio.kick * 0.26 + audio.sub * 0.08 + audio.flux * 0.04;
      event.speed = 0.18 + audio.bass * 0.22;
      event.active = true;
      lens.waveCursor += 1;
      lens.opticalEcho = Math.max(lens.opticalEcho, 0.18 + audio.kick * 0.26);
      lens.fluxArc = Math.max(lens.fluxArc, 0.12 + audio.kick * 0.18);
      cameraState.current.impulse = Math.max(cameraState.current.impulse, 0.08 + audio.kick * 0.28);
    }

    if (snareAttack > 0.02 && audio.snare > 0.09) {
      lens.shear += 0.05 + audio.snare * 0.14;
      lens.shearAngle += 0.35 + audio.mid * 0.4;
      lens.opticalEcho = Math.max(lens.opticalEcho, 0.1 + audio.snare * 0.18);
    }

    lens.fluxArc *= Math.exp(-delta * 1.8);
    lens.opticalEcho *= Math.exp(-delta * 0.9);
    lens.shear = smoothChannel(lens.shear, 0.04 + audio.mid * 0.14, 2.0, 0.55, delta);
    lens.mass = smoothChannel(lens.mass, 0.08 + audio.sub * 0.24 + audio.rms * 0.04, 1.5, 0.45, delta);
    lens.strength = smoothChannel(lens.strength, 0.10 + audio.bass * 0.28 + audio.sub * 0.08, 2.6, 0.6, delta);
    lens.ellipticity = smoothChannel(lens.ellipticity, Math.sin(time * 0.06 + audio.trackProgress * 1.8) * 0.7, 0.4, 0.4, delta);
    lens.anisotropy = smoothChannel(lens.anisotropy, 0.07 + audio.highMid * 0.12 + ultraWide * 0.04, 1.0, 0.6, delta);
    lens.revealDepth = smoothChannel(lens.revealDepth, 0.26 + audio.rms * 0.56 + audio.lowMid * 0.12, 1.2, 0.45, delta);

    const baseCenterX = 0.53 + (safeArea.centerX - 0.5) * 0.55 + ultraWide * 0.05 - portrait * 0.05 + Math.sin(time * 0.015 + audio.trackProgress * 1.2) * 0.025;
    const baseCenterY = 0.47 + (safeArea.centerY - 0.5) * 0.4 + portrait * 0.05 + Math.sin(time * 0.012 + 1.7) * 0.02 - ultraWide * 0.02;
    lens.centerX = smoothChannel(lens.centerX, baseCenterX, 0.6, 0.6, delta);
    lens.centerY = smoothChannel(lens.centerY, baseCenterY, 0.6, 0.6, delta);
    lens.shearAngle = smoothChannel(lens.shearAngle, Math.sin(time * 0.019) * 0.45 + audio.mid * 0.35 + audio.trackProgress * 0.3, 0.9, 0.5, delta);

    secondaryA.set(0.32 + ultraWide * 0.12, 0.56 - portrait * 0.06, Math.max(0, (audio.rms - 0.34) * 0.08 + audio.highMid * 0.03), 0.18);
    secondaryB.set(0.74 - ultraWide * 0.05, 0.36 + portrait * 0.08, Math.max(0, (audio.rms - 0.42) * 0.06 + audio.flux * 0.04), 0.16);

    for (let index = 0; index < WAVE_EVENT_COUNT; index += 1) {
      const event = waveEventsRef.current[index];
      const uniform = waveUniforms[index];
      if (!event.active) {
        uniform.set(0, 0, 9999, 0);
        continue;
      }
      event.radius += event.speed * delta;
      event.amplitude *= Math.exp(-delta * 1.55);
      if (event.radius > 1.8 || event.amplitude < 0.002) {
        event.active = false;
        uniform.set(0, 0, 9999, 0);
        continue;
      }
      uniform.set(event.x, event.y, event.radius, event.amplitude);
    }

    if (cameraRef.current) {
      const cam = cameraState.current;
      cam.impulse *= Math.exp(-delta * 6.2);
      const targetX = 1.1 + Math.sin(time * 0.031 + Math.sin(time * 0.011) * 0.6) * 0.7 + ultraWide * 1.2 - portrait * 0.55 + audio.mid * 0.12;
      const targetY = -0.45 + Math.cos(time * 0.027 + 0.8) * 0.42 + portrait * 0.32;
      const targetZ = 27.0 - audio.sub * 0.65 - audio.rms * 0.22 - cam.impulse - portrait * 3.0 + ultraWide * 1.2;
      const targetLookX = Math.sin(time * 0.017) * 0.9 + (lens.centerX - 0.5) * 4.0;
      const targetLookY = Math.cos(time * 0.013 + 1.0) * 0.4 + (0.5 - lens.centerY) * 3.2;
      const targetFov = 38.0 - audio.rms * 0.35 - portrait * 5.0 + ultraWide * 1.5;

      cam.x = smoothChannel(cam.x, targetX, 0.9, 0.9, delta);
      cam.y = smoothChannel(cam.y, targetY, 0.8, 0.8, delta);
      cam.z = smoothChannel(cam.z, targetZ, 1.8, 1.2, delta);
      cam.lookX = smoothChannel(cam.lookX, targetLookX, 0.8, 0.8, delta);
      cam.lookY = smoothChannel(cam.lookY, targetLookY, 0.8, 0.8, delta);
      cam.fov = smoothChannel(cam.fov, targetFov, 1.2, 1.2, delta);

      cameraRef.current.position.set(cam.x, cam.y, cam.z);
      cameraRef.current.lookAt(cam.lookX, cam.lookY, cam.lookZ);
      cameraRef.current.fov = cam.fov;
      cameraRef.current.updateProjectionMatrix();
    }

    lensCenter.set(lens.centerX, lens.centerY);

    fieldUniforms.uTime.value = time;
    fieldUniforms.uAspect.value = aspect;
    fieldUniforms.uLensMass.value = lens.mass;
    fieldUniforms.uLensStrength.value = lens.strength;
    fieldUniforms.uShear.value = lens.shear;
    fieldUniforms.uShearAngle.value = lens.shearAngle;
    fieldUniforms.uEllipticity.value = lens.ellipticity;
    fieldUniforms.uAnisotropy.value = lens.anisotropy;
    fieldUniforms.uLowMid.value = audio.lowMid;
    fieldUniforms.uHighMid.value = audio.highMid;
    fieldUniforms.uRms.value = audio.rms;
    fieldUniforms.uCentroid.value = audio.centroid;
    fieldUniforms.uFluxArc.value = lens.fluxArc + audio.flux * 0.05;
    fieldUniforms.uOpticalEcho.value = lens.opticalEcho;

    const updateStarUniforms = (uniforms) => {
      uniforms.uTime.value = time;
      uniforms.uAspect.value = aspect;
      uniforms.uLensMass.value = lens.mass;
      uniforms.uLensStrength.value = lens.strength;
      uniforms.uShear.value = lens.shear;
      uniforms.uShearAngle.value = lens.shearAngle;
      uniforms.uEllipticity.value = lens.ellipticity;
      uniforms.uAnisotropy.value = lens.anisotropy;
      uniforms.uTreble.value = audio.treble;
      uniforms.uAir.value = audio.air;
      uniforms.uRms.value = audio.rms;
      uniforms.uCentroid.value = audio.centroid;
      uniforms.uRevealDepth.value = lens.revealDepth;
      uniforms.uFluxArc.value = lens.fluxArc + audio.flux * 0.05;
      uniforms.uOpticalEcho.value = lens.opticalEcho;
    };

    updateStarUniforms(dimUniforms);
    updateStarUniforms(brightUniforms);
  });

  return (
    <group>
      <color attach="background" args={["#000208"]} />
      <fog attach="fog" args={["#02040a", 80, 420]} />

      <PerspectiveCamera ref={cameraRef} makeDefault position={[1.2, -0.45, 27]} fov={38} />

      <mesh ref={fieldRef} position={[0, 0, -320]} renderOrder={0}>
        <planeGeometry args={[1200, 760, 1, 1]} />
        <shaderMaterial uniforms={fieldUniforms} vertexShader={FIELD_VERTEX} fragmentShader={FIELD_FRAGMENT} depthWrite={false} toneMapped={false} />
      </mesh>

      <points ref={dimStarsRef} geometry={dimGeometry} renderOrder={1}>
        <shaderMaterial
          uniforms={dimUniforms}
          vertexShader={STAR_VERTEX}
          fragmentShader={STAR_FRAGMENT}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
          toneMapped={false}
        />
      </points>

      <points ref={brightStarsRef} geometry={brightGeometry} renderOrder={2}>
        <shaderMaterial
          uniforms={brightUniforms}
          vertexShader={STAR_VERTEX}
          fragmentShader={STAR_FRAGMENT}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      {DEBUG_GRAVITY_LENS ? (
        <mesh position={[0, 0, -5]} renderOrder={3}>
          <ringGeometry args={[0.2, 0.22, 64]} />
          <meshBasicMaterial color="#66d8ff" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
    </group>
  );
}