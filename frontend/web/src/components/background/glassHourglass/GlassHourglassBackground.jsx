import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { usePlayerOptional } from "../../../context/PlayerContext";
import { useBackgroundRig } from "../shared/useBackgroundRig";

const TAU = Math.PI * 2;
const DEBUG_HOURGLASS_PARTICLES = false;
const HALF_HEIGHT = 4.45;

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothExp = (current, target, lambda, delta) => current + (target - current) * (1 - Math.exp(-lambda * delta));
const smoothChannel = (current, target, attack, release, delta) => smoothExp(current, target, target > current ? attack : release, delta);
const smoothstep01 = (edge0, edge1, value) => {
  const t = clamp01((value - edge0) / Math.max(1e-5, edge1 - edge0));
  return t * t * (3 - 2 * t);
};

const hash01 = (index, offset = 0) => {
  const value = Math.sin((index + 1) * 12.9898 + offset * 78.233) * 43758.5453123;
  return value - Math.floor(value);
};

const radiusAtHeight = (y) => {
  const normalized = clamp01(Math.abs(y) / HALF_HEIGHT);
  const bulb = Math.pow(Math.max(0, Math.sin(normalized * Math.PI)), 0.78) * 2.12;
  const neckLift = (1 - smoothstep01(0, 0.2, normalized)) * 0.16;
  const asymmetry = y > 0 ? 1.02 : 0.97;
  return Math.max(0.12, (0.08 + bulb + neckLift) * asymmetry);
};

const FLOW_GLSL = `
const float PI = 3.141592653589793;
const float TAU = 6.283185307179586;

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
    p = rot2(0.42) * p * 2.03 + vec2(17.0, 9.0);
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

float radiusAtHeight(float y) {
  float normalized = clamp(abs(y) / ${HALF_HEIGHT.toFixed(2)}, 0.0, 1.0);
  float bulb = pow(max(0.0, sin(normalized * PI)), 0.78) * 2.12;
  float neckLift = (1.0 - smoothstep(0.0, 0.2, normalized)) * 0.16;
  float asymmetry = y > 0.0 ? 1.02 : 0.97;
  return max(0.12, (0.08 + bulb + neckLift) * asymmetry);
}

vec3 sampleEnvironment(vec3 dir, float centroidValue) {
  float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 deep = vec3(0.01, 0.012, 0.02);
  vec3 mid = vec3(0.02, 0.04, 0.07);
  vec3 zenith = vec3(0.05, 0.08, 0.11);
  vec3 color = mix(deep, mid, smoothstep(0.18, 0.64, h));
  color = mix(color, zenith, smoothstep(0.5, 0.98, h));
  vec3 warm = vec3(0.34, 0.25, 0.13);
  vec3 cool = vec3(0.18, 0.28, 0.36);
  color += mix(warm, cool, centroidValue) * exp(-pow((h - 0.48) * 8.5, 2.0)) * 0.22;
  return color;
}
`;

const ATMOS_VERTEX = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const ATMOS_FRAGMENT = `
uniform float uTime;
uniform float uRms;
uniform float uCentroid;
uniform float uEcho;
uniform float uAspect;

varying vec2 vUv;

${FLOW_GLSL}

void main() {
  vec2 uv = vUv;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= uAspect;

  vec3 base = mix(vec3(0.005, 0.006, 0.01), vec3(0.015, 0.018, 0.028), smoothstep(-0.6, 0.7, p.y));
  float centerGlow = exp(-dot(vec2(p.x * 0.65, p.y * 0.92), vec2(p.x * 0.65, p.y * 0.92)) * 1.8);
  float verticalGlow = exp(-pow((uv.y - 0.52) * 2.8, 2.0));
  float haze = fbm2(vec2(p.x * 1.4, p.y * 1.8) + vec2(uTime * 0.01, -uTime * 0.007));
  vec3 accent = mix(vec3(0.10, 0.07, 0.05), vec3(0.07, 0.11, 0.14), smoothstep(0.35, 0.88, uCentroid));

  vec3 color = base;
  color += accent * centerGlow * (0.16 + uRms * 0.12 + uEcho * 0.1);
  color += vec3(0.02, 0.03, 0.05) * verticalGlow * (0.14 + haze * 0.06);

  float vignette = smoothstep(1.75, 0.22, length(p));
  color *= 0.76 + vignette * 0.24;

  gl_FragColor = vec4(color, 1.0);
}
`;

const GLASS_VERTEX = `
uniform float uTime;
uniform float uSub;
uniform float uKickShock;
uniform float uRms;

varying vec3 vObjectPos;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

${FLOW_GLSL}

void main() {
  vec3 pos = position;
  float breath = sin(uTime * 0.19 + pos.y * 0.55) * (0.002 + uSub * 0.01);
  float shock = exp(-pow(pos.y * 1.8, 2.0)) * uKickShock * 0.012;
  vec3 normalOffset = normal * (breath + shock + uRms * 0.002);
  pos += normalOffset;

  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vObjectPos = pos;
  vWorldPos = worldPosition.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - worldPosition.xyz);

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const GLASS_FRAGMENT = `
uniform float uTime;
uniform float uSub;
uniform float uBass;
uniform float uLowMid;
uniform float uMid;
uniform float uTreble;
uniform float uAir;
uniform float uRms;
uniform float uCentroid;
uniform float uKickShock;
uniform float uSnareSlice;
uniform float uReverse;
uniform float uEcho;
uniform float uTrackProgress;
uniform float uGlassPass;

varying vec3 vObjectPos;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

${FLOW_GLSL}

void main() {
  vec3 normal = normalize(vWorldNormal);
  vec3 viewDir = normalize(vViewDir);

  vec3 rimA = normalize(vec3(-0.35, 0.25, 1.0));
  vec3 rimB = normalize(vec3(0.62, 0.15, 0.72));
  vec3 rimC = normalize(vec3(0.15, -0.8, 0.55));
  vec3 reflected = reflect(-viewDir, normal);

  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.8);
  float thickness = pow(1.0 - abs(dot(normal, viewDir)), 1.3);
  float edge = smoothstep(0.18, 1.0, thickness);

  vec2 distort = noiseVec2(vObjectPos.xz * 0.85 + vec2(uTime * 0.03, -uTime * 0.028));
  vec3 reflectedA = normalize(reflected + vec3(distort * 0.05, 0.0));
  vec3 reflectedB = normalize(reflected + vec3(distort * 0.03, 0.01));
  vec3 reflectedC = normalize(reflected - vec3(distort * 0.025, 0.015));

  vec3 env = vec3(
    sampleEnvironment(reflectedA, uCentroid).r,
    sampleEnvironment(reflectedB, uCentroid).g,
    sampleEnvironment(reflectedC, uCentroid).b
  );

  float topCompression = exp(-pow((vObjectPos.y - 1.35) * 0.65, 2.0)) * (0.18 + uSub * 0.22);
  float neckCore = exp(-pow(vObjectPos.y * 2.4, 2.0)) * exp(-pow(length(vObjectPos.xz) / 0.42, 2.0));
  float lowerPile = exp(-pow((vObjectPos.y + 2.45) * 0.58, 2.0)) * (0.12 + uBass * 0.16 + uEcho * 0.08);
  float snareBand = exp(-pow((vObjectPos.y - mix(1.25, -1.15, clamp(uTrackProgress * 0.5 + 0.25, 0.0, 1.0))) * 1.4, 2.0)) * uSnareSlice;
  float kickBand = exp(-pow((vObjectPos.y - mix(2.8, -2.1, clamp(uKickShock, 0.0, 1.0))) * 1.1, 2.0)) * uKickShock;

  float caustic = fbm2(vObjectPos.xz * 1.45 + vec2(vObjectPos.y * 0.8, uTime * (0.08 + uMid * 0.07)));
  caustic = smoothstep(0.52, 0.95, caustic) * (0.06 + uTreble * 0.12 + uAir * 0.04);

  float rimLightA = pow(max(dot(normal, rimA), 0.0), 8.0) * (0.08 + edge * 0.15);
  float rimLightB = pow(max(dot(normal, rimB), 0.0), 12.0) * (0.05 + edge * 0.14);
  float rimLightC = pow(max(dot(normal, rimC), 0.0), 6.0) * 0.04;
  float shockRefract = exp(-pow(vObjectPos.y * 2.1, 2.0)) * uKickShock * 0.1;

  vec3 cold = vec3(0.58, 0.82, 0.98);
  vec3 violet = vec3(0.64, 0.56, 0.88);
  vec3 amber = vec3(0.92, 0.74, 0.42);
  vec3 tint = mix(amber, cold, smoothstep(0.28, 0.82, uCentroid));

  vec3 color = env * (0.26 + fresnel * 0.8 + shockRefract);
  color += cold * rimLightA;
  color += violet * rimLightB * (0.55 + uAir * 0.4);
  color += amber * rimLightC * (0.45 + uSub * 0.3);
  color += tint * neckCore * (0.18 + uRms * 0.16 + uKickShock * 0.22);
  color += amber * topCompression * 0.12;
  color += tint * lowerPile * 0.12;
  color += vec3(0.88, 0.92, 1.0) * caustic;
  color += cold * snareBand * 0.08;
  color += amber * kickBand * 0.12;
  color += mix(cold, amber, 0.35) * uReverse * exp(-pow((vObjectPos.y + 1.0) * 0.8, 2.0)) * 0.08;

  vec3 absorption = mix(vec3(0.0), vec3(0.004, 0.006, 0.01), 0.16 + uGlassPass * 0.12);
  color = max(color - absorption, 0.0);

  float alpha = 0.022 + fresnel * (0.15 + uGlassPass * 0.035) + edge * 0.065 + neckCore * 0.03 + caustic * 0.075;
  alpha += uReverse * 0.03 + uEcho * 0.03;
  alpha = clamp(alpha, 0.015, 0.18);

  gl_FragColor = vec4(color, alpha);
}
`;

const PARTICLE_VERTEX = `
uniform float uTime;
uniform float uTimeOffset;
uniform float uGhostMix;
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
uniform float uBeat;
uniform float uTrackProgress;
uniform float uKickShock;
uniform float uKickTravel;
uniform float uSnareSlice;
uniform float uSnareTravel;
uniform float uReverse;
uniform float uEcho;
uniform float uZeroG;
uniform float uAspect;
uniform float uDustMode;

attribute vec4 aSeed;
attribute float aPhase;
attribute float aRadius;
attribute float aAngle;
attribute float aSize;
attribute float aDrift;
attribute float aLayer;
attribute float aBias;

varying float vAlpha;
varying float vSpark;
varying float vWarm;
varying float vGhost;

${FLOW_GLSL}

float easeInOut(float t) {
  return t * t * (3.0 - 2.0 * t);
}

void main() {
  float t = uTime + uTimeOffset;
  float baseFlow = mix(0.10, 0.22, clamp(uBass * 0.7 + uRms * 0.3, 0.0, 1.0));
  float cycle = fract(aPhase + t * baseFlow * (0.84 + aDrift * 0.42) + aBias * 0.13);
  cycle += sin((t * 0.21 + aSeed.x * 7.1) * (0.8 + aSeed.y * 0.4)) * 0.006 * (0.3 + uLowMid * 0.7);
  cycle = fract(cycle);

  float upperEnd = 0.27;
  float funnelEnd = 0.43;
  float neckEnd = 0.63;
  float lowerEnd = 0.82;

  float y = 0.0;
  float radial = 0.0;
  float theta = aAngle;
  float stateGlow = 0.0;

  if (cycle < upperEnd) {
    float stage = easeInOut(clamp(cycle / upperEnd, 0.0, 1.0));
    float pressure = clamp(uSub * 0.7 + uKickShock * 0.6, 0.0, 1.0);
    y = mix(3.92 - aLayer * 0.2, 0.62, pow(stage, mix(1.7, 0.78, pressure)));
    float chamberR = radiusAtHeight(y) * (0.22 + aRadius * (0.72 + uLowMid * 0.18));
    float funnel = smoothstep(0.46, 1.0, stage);
    radial = mix(chamberR, chamberR * (0.16 + aRadius * 0.18), funnel);
    theta += t * (0.05 + uMid * 0.25) * (0.35 + aLayer * 0.9);
    stateGlow = 0.18 + funnel * 0.22;
  } else if (cycle < funnelEnd) {
    float stage = easeInOut(clamp((cycle - upperEnd) / (funnelEnd - upperEnd), 0.0, 1.0));
    y = mix(0.62, 0.06, pow(stage, 0.7));
    float chamberR = radiusAtHeight(y) * (0.18 + aRadius * 0.24);
    radial = mix(chamberR, 0.028 + aRadius * 0.085, smoothstep(0.15, 1.0, stage));
    theta += t * (0.08 + uMid * 0.35);
    stateGlow = 0.26;
  } else if (cycle < neckEnd) {
    float stage = clamp((cycle - funnelEnd) / (neckEnd - funnelEnd), 0.0, 1.0);
    y = mix(0.06, -0.94, pow(stage, 0.55));
    radial = 0.015 + aRadius * 0.08 + sin(t * 2.4 + aSeed.x * 12.0 + y * 7.0) * (0.004 + uTreble * 0.016);
    theta += sin(t * 0.9 + aSeed.y * 10.0) * (0.14 + uLowMid * 0.12);
    stateGlow = 0.55 + uBass * 0.28;
  } else if (cycle < lowerEnd) {
    float stage = easeInOut(clamp((cycle - neckEnd) / (lowerEnd - neckEnd), 0.0, 1.0));
    y = mix(-0.94, -3.38 + aLayer * 0.16, stage);
    float chamberR = radiusAtHeight(y) * (0.10 + aRadius * (0.74 + uLowMid * 0.1));
    radial = mix(0.05 + aRadius * 0.09, chamberR, smoothstep(0.05, 0.7, stage));
    theta += t * (0.03 + uMid * 0.16) * (0.2 + aLayer * 0.3);
    stateGlow = 0.22;
  } else {
    float stage = easeInOut(clamp((cycle - lowerEnd) / (1.0 - lowerEnd), 0.0, 1.0));
    float pileSurface = -3.96 + (1.0 - aRadius) * 1.42 + sin(aAngle * 3.0 + t * 0.06) * 0.10 * (0.5 + uMid * 0.5);
    y = mix(-2.55 + aLayer * 0.18, pileSurface, stage);
    float chamberR = radiusAtHeight(y) * (0.14 + aRadius * 0.86);
    radial = chamberR;
    theta += t * (0.02 + uMid * 0.12) * (0.25 + aLayer * 0.24);
    stateGlow = 0.16 + (1.0 - stage) * 0.08;
  }

  vec2 xz = vec2(cos(theta), sin(theta)) * radial;
  vec2 swirl = vec2(cos(t * 0.15 + aSeed.z * TAU), sin(t * 0.11 + aSeed.w * TAU));
  xz += swirl * (0.02 + uMid * 0.08) * (0.15 + aLayer * 0.85);

  float resonance = sin(length(xz) * (4.0 + uMid * 2.5) - t * (0.8 + uLowMid * 0.9) + aSeed.y * 6.0);
  xz += normalize(swirl + 1e-4) * resonance * (0.02 + uMid * 0.06) * (0.2 + aLayer * 0.8);

  float kickFrontY = mix(3.15, -2.45, clamp(uKickTravel, 0.0, 1.0));
  float kickField = exp(-pow((y - kickFrontY) * 0.95, 2.0)) * uKickShock;
  xz += normalize(xz + 1e-4) * kickField * (0.08 + aRadius * 0.26);
  y -= exp(-pow((y - 1.8) * 0.8, 2.0)) * uKickShock * (0.12 + (1.0 - aRadius) * 0.38);

  float snareY = mix(2.25, -2.1, clamp(uSnareTravel, 0.0, 1.0));
  float snareField = exp(-pow((y - snareY) * 1.35, 2.0)) * uSnareSlice;
  xz += vec2(cos(aAngle + PI * 0.5), sin(aAngle + PI * 0.5)) * snareField * (0.05 + aRadius * 0.16);

  float reverseMask = smoothstep(0.58, 0.98, cycle) * step(0.58, aBias) * uReverse;
  y += reverseMask * (0.55 + aLayer * 1.05) * (0.4 + sin(t * 1.1 + aSeed.x * 9.0) * 0.2);
  xz += swirl * reverseMask * 0.14;

  float suspension = smoothstep(0.15, 0.85, aLayer) * uZeroG * (0.6 + aBias * 0.4);
  y += suspension * sin(t * (0.45 + aSeed.y * 0.2) + aSeed.z * 12.0) * 0.7;
  xz += swirl * suspension * 0.2;

  float highBreakup = uHighMid * smoothstep(0.3, 0.9, aBias);
  xz += noiseVec2(xz * 0.9 + vec2(t * 0.12, -t * 0.09)) * highBreakup * 0.12;

  float cavity = radiusAtHeight(y) * 0.93;
  float xzLen = length(xz);
  if (xzLen > cavity) {
    xz *= cavity / max(0.001, xzLen);
  }

  vec3 pos = vec3(xz.x, y, xz.y);
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  float distAtt = clamp(1.0 / max(1.0, -mvPosition.z * 0.12), 0.24, 2.2);
  float energySize = mix(0.85, 1.55, uGhostMix) * (0.7 + uTreble * 0.18 + uAir * 0.22 + uDustMode * 0.42);
  gl_PointSize = clamp(aSize * 15.0 * distAtt * energySize, 0.9, mix(5.0, 7.4, uDustMode));
  gl_Position = projectionMatrix * mvPosition;

  float sparkle = pow(clamp(uTreble * 0.75 + uAir * 0.55 + uHighTransient * 0.45, 0.0, 1.0), mix(1.8, 1.2, uDustMode));
  float warmth = clamp(1.0 - uCentroid, 0.0, 1.0);
  float alpha = 0.28 + stateGlow * 0.38 + sparkle * 0.18;
  alpha *= mix(1.0, 0.42 + uEcho * 0.75, uGhostMix);
  alpha *= mix(1.0, 0.32 + uRms * 0.48, uDustMode);

  vAlpha = clamp(alpha, 0.03, 1.0);
  vSpark = sparkle;
  vWarm = warmth;
  vGhost = uGhostMix;
}
`;

const PARTICLE_FRAGMENT = `
varying float vAlpha;
varying float vSpark;
varying float vWarm;
varying float vGhost;

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);
  if (d > 0.5) discard;

  float core = smoothstep(0.48, 0.02, d);
  float ring = smoothstep(0.42, 0.18, d) * (1.0 - smoothstep(0.16, 0.04, d));

  vec3 bronze = vec3(0.29, 0.18, 0.08);
  vec3 amber = vec3(0.90, 0.74, 0.42);
  vec3 ivory = vec3(0.93, 0.88, 0.74);
  vec3 silver = vec3(0.74, 0.86, 0.96);
  vec3 violet = vec3(0.63, 0.55, 0.85);

  vec3 color = mix(bronze, amber, vWarm);
  color = mix(color, ivory, core * 0.38);
  color = mix(color, silver, vSpark * 0.48 + vGhost * 0.2);
  color += violet * ring * (0.08 + vGhost * 0.14);

  float alpha = (core * 0.92 + ring * 0.22) * vAlpha;
  gl_FragColor = vec4(color, alpha);
}
`;

export default function GlassHourglassBackground() {
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
    centroid: 0.26,
    flux: 0,
    kick: 0,
    snare: 0,
    highTransient: 0,
    active: false,
    updatedAt: 0
  });
  const visualizerStateRef = playerContext?.visualizerStateRef ?? fallbackVisualizerRef;

  const cameraRef = useRef(null);
  const outerGlassRef = useRef(null);
  const innerGlassRef = useRef(null);
  const corePointsRef = useRef(null);
  const echoPointsRef = useRef(null);
  const dustPointsRef = useRef(null);
  const atmosRef = useRef(null);

  const audioState = useRef({
    sub: 0,
    bass: 0,
    lowMid: 0,
    mid: 0,
    highMid: 0,
    treble: 0,
    air: 0,
    rms: 0,
    centroid: 0.26,
    flux: 0,
    kick: 0,
    snare: 0,
    highTransient: 0,
    beat: 0,
    pulse: 0,
    trackProgress: 0
  });
  const eventState = useRef({
    kickTravel: 0,
    kickShock: 0,
    snareTravel: 0,
    snareSlice: 0,
    reverse: 0,
    echo: 0,
    zeroG: 0,
    lastKick: 0,
    lastSnare: 0
  });
  const cameraState = useRef({
    x: 0.06,
    y: 0.2,
    z: 13.6,
    lookX: 0.08,
    lookY: 0.1,
    lookZ: 0.0,
    fov: 34.0,
    impulse: 0.0
  });

  const quality = useMemo(() => {
    if (typeof window === "undefined") {
      return { grains: 22000, dust: 2600, radialSegments: 88, profileSamples: 56, detailScale: 1.0, ghost: true };
    }

    const lowPower = window.innerWidth < 900 || (navigator.hardwareConcurrency || 8) <= 4;
    if (lowPower) {
      return { grains: 10000, dust: 1200, radialSegments: 56, profileSamples: 34, detailScale: 0.72, ghost: false };
    }

    if (window.devicePixelRatio > 1.5) {
      return { grains: 18000, dust: 1900, radialSegments: 72, profileSamples: 46, detailScale: 0.86, ghost: true };
    }

    return { grains: 30000, dust: 3200, radialSegments: 96, profileSamples: 64, detailScale: 1.0, ghost: true };
  }, []);

  const shellGeometry = useMemo(() => {
    const profile = [];
    for (let index = 0; index <= quality.profileSamples; index += 1) {
      const t = index / quality.profileSamples;
      const y = -HALF_HEIGHT + t * HALF_HEIGHT * 2;
      profile.push(new THREE.Vector2(radiusAtHeight(y), y));
    }
    return new THREE.LatheGeometry(profile, quality.radialSegments);
  }, [quality.profileSamples, quality.radialSegments]);

  const createParticleGeometry = (count, sizeMul = 1) => {
    const geometry = new THREE.BufferGeometry();
    const position = new Float32Array(count * 3);
    const aSeed = new Float32Array(count * 4);
    const aPhase = new Float32Array(count);
    const aRadius = new Float32Array(count);
    const aAngle = new Float32Array(count);
    const aSize = new Float32Array(count);
    const aDrift = new Float32Array(count);
    const aLayer = new Float32Array(count);
    const aBias = new Float32Array(count);

    for (let index = 0; index < count; index += 1) {
      const stride = index * 4;
      aSeed[stride] = hash01(index, 0.13);
      aSeed[stride + 1] = hash01(index, 0.37);
      aSeed[stride + 2] = hash01(index, 0.61);
      aSeed[stride + 3] = hash01(index, 0.89);
      aPhase[index] = hash01(index, 1.11);
      aRadius[index] = hash01(index, 1.57);
      aAngle[index] = hash01(index, 2.03) * TAU;
      aSize[index] = (0.38 + hash01(index, 2.89) * 1.02) * sizeMul;
      aDrift[index] = hash01(index, 3.47);
      aLayer[index] = hash01(index, 4.21);
      aBias[index] = hash01(index, 5.07);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(aSeed, 4));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(aPhase, 1));
    geometry.setAttribute("aRadius", new THREE.BufferAttribute(aRadius, 1));
    geometry.setAttribute("aAngle", new THREE.BufferAttribute(aAngle, 1));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));
    geometry.setAttribute("aDrift", new THREE.BufferAttribute(aDrift, 1));
    geometry.setAttribute("aLayer", new THREE.BufferAttribute(aLayer, 1));
    geometry.setAttribute("aBias", new THREE.BufferAttribute(aBias, 1));

    return geometry;
  };

  const coreGeometry = useMemo(() => createParticleGeometry(quality.grains, 1), [quality.grains]);
  const dustGeometry = useMemo(() => createParticleGeometry(quality.dust, 0.8), [quality.dust]);

  const buildParticleUniforms = (timeOffset, ghostMix, dustMode) => ({
    uTime: { value: 0 },
    uTimeOffset: { value: timeOffset },
    uGhostMix: { value: ghostMix },
    uSub: { value: 0 },
    uBass: { value: 0 },
    uLowMid: { value: 0 },
    uMid: { value: 0 },
    uHighMid: { value: 0 },
    uTreble: { value: 0 },
    uAir: { value: 0 },
    uRms: { value: 0 },
    uCentroid: { value: 0.26 },
    uFlux: { value: 0 },
    uKick: { value: 0 },
    uSnare: { value: 0 },
    uHighTransient: { value: 0 },
    uBeat: { value: 0 },
    uTrackProgress: { value: 0 },
    uKickShock: { value: 0 },
    uKickTravel: { value: 0 },
    uSnareSlice: { value: 0 },
    uSnareTravel: { value: 0 },
    uReverse: { value: 0 },
    uEcho: { value: 0 },
    uZeroG: { value: 0 },
    uAspect: { value: 1.0 },
    uDustMode: { value: dustMode }
  });

  const coreUniforms = useMemo(() => buildParticleUniforms(0, 0, 0), []);
  const echoUniforms = useMemo(() => buildParticleUniforms(-0.36, 1, 0), []);
  const dustUniforms = useMemo(() => buildParticleUniforms(-0.08, 0.14, 1), []);

  const glassOuterUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSub: { value: 0 },
      uBass: { value: 0 },
      uLowMid: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uAir: { value: 0 },
      uRms: { value: 0 },
      uCentroid: { value: 0.26 },
      uKickShock: { value: 0 },
      uSnareSlice: { value: 0 },
      uReverse: { value: 0 },
      uEcho: { value: 0 },
      uTrackProgress: { value: 0 },
      uGlassPass: { value: 0.0 }
    }),
    []
  );
  const glassInnerUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSub: { value: 0 },
      uBass: { value: 0 },
      uLowMid: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uAir: { value: 0 },
      uRms: { value: 0 },
      uCentroid: { value: 0.26 },
      uKickShock: { value: 0 },
      uSnareSlice: { value: 0 },
      uReverse: { value: 0 },
      uEcho: { value: 0 },
      uTrackProgress: { value: 0 },
      uGlassPass: { value: 1.0 }
    }),
    []
  );
  const atmosUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRms: { value: 0 },
      uCentroid: { value: 0.26 },
      uEcho: { value: 0 },
      uAspect: { value: 1.0 }
    }),
    []
  );

  useEffect(() => {
    return () => {
      shellGeometry.dispose();
      coreGeometry.dispose();
      dustGeometry.dispose();
      outerGlassRef.current?.material?.dispose?.();
      innerGlassRef.current?.material?.dispose?.();
      corePointsRef.current?.material?.dispose?.();
      echoPointsRef.current?.material?.dispose?.();
      dustPointsRef.current?.material?.dispose?.();
      atmosRef.current?.material?.dispose?.();
      atmosRef.current?.geometry?.dispose?.();
    };
  }, [coreGeometry, dustGeometry, shellGeometry]);

  useFrame((state, delta) => {
    const src = visualizerStateRef.current || {};
    const audioGain = tuning.reactivity;
    const bassGain = tuning.bassBoost;
    const trebleGain = tuning.trebleBoost;
    const motionGain = tuning.animationEnabled ? tuning.motionIntensity : 0;
    const deformGain = tuning.deformIntensity;
    const safeOffsetX = (safeArea.centerX - 0.5) * 2.1;
    const motionTime = state.clock.elapsedTime * (0.62 + motionGain * 0.72);
    const audio = audioState.current;
    audio.sub = smoothChannel(audio.sub, clamp01((src.sub ?? 0) * audioGain * bassGain), 8.5, 2.4, delta);
    audio.bass = smoothChannel(audio.bass, clamp01((src.bass ?? 0) * audioGain * bassGain), 9.8, 3.4, delta);
    audio.lowMid = smoothChannel(audio.lowMid, clamp01((src.lowMid ?? 0) * audioGain), 6.0, 2.6, delta);
    audio.mid = smoothChannel(audio.mid, clamp01((src.mid ?? 0) * audioGain), 4.0, 1.8, delta);
    audio.highMid = smoothChannel(audio.highMid, clamp01((src.highMid ?? 0) * audioGain * trebleGain), 8.0, 3.2, delta);
    audio.treble = smoothChannel(audio.treble, clamp01((src.treble ?? 0) * audioGain * trebleGain), 11.0, 5.0, delta);
    audio.air = smoothChannel(audio.air, clamp01((src.air ?? 0) * audioGain * trebleGain), 14.0, 6.0, delta);
    audio.rms = smoothChannel(audio.rms, clamp01(src.rms ?? 0), 4.2, 1.8, delta);
    audio.centroid = smoothChannel(audio.centroid, clamp01(src.centroid ?? 0.26), 1.8, 1.2, delta);
    audio.flux = smoothChannel(audio.flux, clamp01(src.flux ?? 0), 14.0, 5.0, delta);
    audio.kick = smoothChannel(audio.kick, clamp01((src.kick ?? 0) * audioGain * bassGain), 16.0, 4.6, delta);
    audio.snare = smoothChannel(audio.snare, clamp01(src.snare ?? 0), 15.0, 4.8, delta);
    audio.highTransient = smoothChannel(audio.highTransient, clamp01((src.highTransient ?? 0) * audioGain * trebleGain), 17.0, 6.2, delta);
    audio.beat = smoothChannel(audio.beat, clamp01(src.beat ?? 0), 11.0, 4.2, delta);
    audio.pulse = smoothChannel(audio.pulse, clamp01(src.pulse ?? 0), 4.5, 1.6, delta);
    audio.trackProgress = smoothChannel(audio.trackProgress, clamp01(src.trackProgress ?? 0), 1.2, 1.2, delta);

    const events = eventState.current;
    const kickAttack = Math.max(0, audio.kick - events.lastKick);
    const snareAttack = Math.max(0, audio.snare - events.lastSnare);
    events.lastKick = audio.kick;
    events.lastSnare = audio.snare;

    if (kickAttack > 0.03 && audio.kick > 0.12) {
      events.kickTravel = 0;
      events.kickShock = Math.max(events.kickShock, (0.22 + audio.kick * 0.64) * deformGain);
      events.echo = Math.max(events.echo, 0.18 + audio.kick * 0.34);
      cameraState.current.impulse = Math.max(cameraState.current.impulse, 0.05 + audio.kick * 0.18);
      if (audio.kick > 0.58 && audio.rms > 0.38) {
        events.reverse = Math.max(events.reverse, (0.18 + audio.kick * 0.38) * deformGain);
      }
    }

    if (snareAttack > 0.025 && audio.snare > 0.1) {
      events.snareTravel = 0;
      events.snareSlice = Math.max(events.snareSlice, (0.18 + audio.snare * 0.42) * deformGain);
      events.echo = Math.max(events.echo, 0.14 + audio.snare * 0.22);
    }

    events.kickTravel = Math.min(1, events.kickTravel + delta * (1.1 + audio.bass * 2.1));
    events.kickShock *= Math.exp(-delta * 2.1);
    events.snareTravel = Math.min(1, events.snareTravel + delta * (1.7 + audio.mid * 1.4));
    events.snareSlice *= Math.exp(-delta * 2.9);
    events.reverse *= Math.exp(-delta * 1.4);
    events.echo *= Math.exp(-delta * 0.72);

    const zeroGTarget = audio.rms < 0.11 && audio.bass < 0.12 && audio.kick < 0.05 ? 0.16 : 0;
    events.zeroG = smoothChannel(events.zeroG, zeroGTarget, 0.7, 1.25, delta);

    const time = motionTime;
    const aspect = state.size.width / Math.max(1, state.size.height);
    const portrait = aspect < 0.8 ? clamp01((0.8 - aspect) / 0.35) : 0;
    const ultraWide = aspect > 1.9 ? clamp01((aspect - 1.9) / 0.8) : 0;

    if (cameraRef.current) {
      const cam = cameraState.current;
      cam.impulse *= Math.exp(-delta * 7.4);
      const targetX = safeOffsetX + 0.06 + Math.sin(time * 0.041) * 0.18 + ultraWide * 0.28 - portrait * 0.12 + audio.mid * 0.06;
      const targetY = 0.18 + Math.sin(time * 0.033 + 1.1) * 0.12 + portrait * 0.18 - audio.sub * 0.05;
      const targetZ = 13.6 - audio.sub * 0.24 - audio.rms * 0.1 - cam.impulse + portrait * 2.4 + ultraWide * 0.25;
      const targetLookX = safeOffsetX * 0.86 + 0.06 + Math.sin(time * 0.018 + 0.7) * 0.04 + ultraWide * 0.05;
      const targetLookY = 0.08 + Math.sin(time * 0.021) * 0.05;
      const targetFov = 34.0 - audio.sub * 0.72 + portrait * 4.0 + ultraWide * 1.5;

      cam.x = smoothChannel(cam.x, targetX, 1.4, 1.0, delta);
      cam.y = smoothChannel(cam.y, targetY, 1.2, 1.0, delta);
      cam.z = smoothChannel(cam.z, targetZ, 2.8, 2.0, delta);
      cam.lookX = smoothChannel(cam.lookX, targetLookX, 1.1, 1.0, delta);
      cam.lookY = smoothChannel(cam.lookY, targetLookY, 1.1, 1.0, delta);
      cam.fov = smoothChannel(cam.fov, targetFov, 2.0, 2.0, delta);

      cameraRef.current.position.set(cam.x, cam.y, cam.z);
      cameraRef.current.lookAt(cam.lookX, cam.lookY, cam.lookZ);
      cameraRef.current.fov = cam.fov;
      cameraRef.current.updateProjectionMatrix();
    }

    const updateParticleUniforms = (uniforms) => {
      uniforms.uTime.value = time;
      uniforms.uSub.value = audio.sub;
      uniforms.uBass.value = audio.bass;
      uniforms.uLowMid.value = audio.lowMid;
      uniforms.uMid.value = audio.mid;
      uniforms.uHighMid.value = audio.highMid;
      uniforms.uTreble.value = audio.treble;
      uniforms.uAir.value = audio.air;
      uniforms.uRms.value = audio.rms;
      uniforms.uCentroid.value = audio.centroid;
      uniforms.uFlux.value = audio.flux;
      uniforms.uKick.value = audio.kick;
      uniforms.uSnare.value = audio.snare;
      uniforms.uHighTransient.value = audio.highTransient;
      uniforms.uBeat.value = audio.beat;
      uniforms.uTrackProgress.value = audio.trackProgress;
      uniforms.uKickShock.value = events.kickShock;
      uniforms.uKickTravel.value = events.kickTravel;
      uniforms.uSnareSlice.value = events.snareSlice;
      uniforms.uSnareTravel.value = events.snareTravel;
      uniforms.uReverse.value = events.reverse;
      uniforms.uEcho.value = events.echo;
      uniforms.uZeroG.value = events.zeroG;
      uniforms.uAspect.value = aspect;
    };

    updateParticleUniforms(coreUniforms);
    updateParticleUniforms(echoUniforms);
    updateParticleUniforms(dustUniforms);

    const updateGlassUniforms = (uniforms) => {
      uniforms.uTime.value = time;
      uniforms.uSub.value = audio.sub;
      uniforms.uBass.value = audio.bass;
      uniforms.uLowMid.value = audio.lowMid;
      uniforms.uMid.value = audio.mid;
      uniforms.uTreble.value = audio.treble;
      uniforms.uAir.value = audio.air;
      uniforms.uRms.value = audio.rms;
      uniforms.uCentroid.value = audio.centroid;
      uniforms.uKickShock.value = events.kickShock;
      uniforms.uSnareSlice.value = events.snareSlice;
      uniforms.uReverse.value = events.reverse;
      uniforms.uEcho.value = events.echo;
      uniforms.uTrackProgress.value = audio.trackProgress;
    };

    updateGlassUniforms(glassOuterUniforms);
    updateGlassUniforms(glassInnerUniforms);

    atmosUniforms.uTime.value = time;
    atmosUniforms.uRms.value = audio.rms;
    atmosUniforms.uCentroid.value = audio.centroid;
    atmosUniforms.uEcho.value = events.echo;
    atmosUniforms.uAspect.value = aspect;
  });

  return (
    <group>
      <color attach="background" args={["#020204"]} />
      <fog attach="fog" args={["#04050a", 22, 34]} />

      <PerspectiveCamera ref={cameraRef} makeDefault position={[0.06, 0.2, 13.6]} fov={34} />

      <ambientLight intensity={0.06} color="#cfd5e2" />
      <directionalLight position={[-2.8, 3.2, 6.4]} intensity={0.78} color="#e9f6ff" />
      <directionalLight position={[4.4, 1.8, 3.4]} intensity={0.55} color="#77d6ff" />
      <directionalLight position={[-3.2, -5.8, 2.0]} intensity={0.26} color="#ffbf7f" />

      <mesh ref={atmosRef} position={[0, 0.0, -8.5]} renderOrder={0}>
        <planeGeometry args={[22, 22, 1, 1]} />
        <shaderMaterial uniforms={atmosUniforms} vertexShader={ATMOS_VERTEX} fragmentShader={ATMOS_FRAGMENT} depthWrite={false} toneMapped={false} />
      </mesh>

      <points ref={echoPointsRef} geometry={coreGeometry} renderOrder={1} visible={quality.ghost}>
        <shaderMaterial
          uniforms={echoUniforms}
          vertexShader={PARTICLE_VERTEX}
          fragmentShader={PARTICLE_FRAGMENT}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      <points ref={corePointsRef} geometry={coreGeometry} renderOrder={2}>
        <shaderMaterial
          uniforms={coreUniforms}
          vertexShader={PARTICLE_VERTEX}
          fragmentShader={PARTICLE_FRAGMENT}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      <points ref={dustPointsRef} geometry={dustGeometry} renderOrder={3}>
        <shaderMaterial
          uniforms={dustUniforms}
          vertexShader={PARTICLE_VERTEX}
          fragmentShader={PARTICLE_FRAGMENT}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>

      <mesh ref={innerGlassRef} geometry={shellGeometry} renderOrder={4}>
        <shaderMaterial
          uniforms={glassInnerUniforms}
          vertexShader={GLASS_VERTEX}
          fragmentShader={GLASS_FRAGMENT}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      <mesh ref={outerGlassRef} geometry={shellGeometry} renderOrder={5}>
        <shaderMaterial
          uniforms={glassOuterUniforms}
          vertexShader={GLASS_VERTEX}
          fragmentShader={GLASS_FRAGMENT}
          transparent
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>

      {DEBUG_HOURGLASS_PARTICLES ? (
        <mesh position={[0, -5.8, 0]} renderOrder={6}>
          <ringGeometry args={[0.18, 0.26, 64]} />
          <meshBasicMaterial color="#33d5ff" transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
      ) : null}
    </group>
  );
}