import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { usePlayerOptional } from "../../../context/PlayerContext";
import { useBackgroundRig } from "../shared/useBackgroundRig";

const TAU = Math.PI * 2;

const smoothDamp = (current, target, lambda, delta) => {
  const t = 1 - Math.exp(-lambda * delta);
  return current + (target - current) * t;
};

const hash01 = (index, offset = 0) => {
  const x = Math.sin((index + 1) * 12.9898 + offset * 78.233) * 43758.5453123;
  return x - Math.floor(x);
};

const FLOW_GLSL = `
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash31(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);

  float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));

  float nx00 = mix(n000, n100, u.x);
  float nx10 = mix(n010, n110, u.x);
  float nx01 = mix(n001, n101, u.x);
  float nx11 = mix(n011, n111, u.x);

  float nxy0 = mix(nx00, nx10, u.y);
  float nxy1 = mix(nx01, nx11, u.y);

  return mix(nxy0, nxy1, u.z);
}

float fbm3(vec3 p) {
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    value += noise3(p) * amp;
    p = p * 2.03 + vec3(13.7, 7.1, 5.9);
    amp *= 0.5;
  }
  return value;
}

vec3 noiseVec3(vec3 p) {
  return vec3(
    fbm3(p + vec3(0.0, 17.0, 31.0)),
    fbm3(p + vec3(11.0, 47.0, 3.0)),
    fbm3(p + vec3(23.0, 5.0, 19.0))
  ) * 2.0 - 1.0;
}

vec3 curlNoise(vec3 p) {
  float e = 0.11;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);

  vec3 p_x0 = noiseVec3(p - dx);
  vec3 p_x1 = noiseVec3(p + dx);
  vec3 p_y0 = noiseVec3(p - dy);
  vec3 p_y1 = noiseVec3(p + dy);
  vec3 p_z0 = noiseVec3(p - dz);
  vec3 p_z1 = noiseVec3(p + dz);

  float x = (p_y1.z - p_y0.z) - (p_z1.y - p_z0.y);
  float y = (p_z1.x - p_z0.x) - (p_x1.z - p_x0.z);
  float z = (p_x1.y - p_x0.y) - (p_y1.x - p_y0.x);

  return normalize(vec3(x, y, z) + 1e-5);
}

float radiusProfile(float yNorm, float t, float sub, float lowMid, float mid, float kickEnvelope) {
  float y = clamp(yNorm, 0.0, 1.0);
  float throatA = smoothstep(0.22, 0.52, y) * (1.0 - smoothstep(0.52, 0.78, y));
  float throatB = smoothstep(0.48, 0.74, y) * (1.0 - smoothstep(0.74, 0.96, y));
  float base = mix(0.52, 2.55, pow(y, 1.08));

  float lowWarp = fbm3(vec3(y * 1.6, t * 0.06, 0.0)) * 0.4;
  float asym = sin(y * 7.0 + t * 0.2) * 0.12 + sin(y * 15.0 - t * 0.11) * 0.08;
  float breath = sub * 0.35 - kickEnvelope * 0.22;
  float viscousWobble = lowMid * 0.25;

  float r = base * (0.92 + lowWarp * 0.18 + asym * 0.05 + breath);
  r -= throatA * (0.44 + lowMid * 0.25);
  r -= throatB * (0.24 + mid * 0.15);
  r += viscousWobble * sin(y * 10.0 + t * 0.35) * 0.1;

  return clamp(r, 0.24, 3.2);
}

vec3 axisPrecession(float t, float mid, float snare) {
  float amp = 0.14 + mid * 0.22;
  float px = sin(t * 0.16 + sin(t * 0.043) * 0.4) * amp;
  float pz = cos(t * 0.11 + sin(t * 0.037) * 0.35) * amp;
  pz += snare * 0.08 * sin(t * 3.1);
  return vec3(px, 0.0, pz);
}
`;

const PARTICLE_VERTEX = `
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

attribute vec4 aSeed;
attribute float aPhase;
attribute float aSize;
attribute float aBand;

varying float vAlpha;
varying float vBand;
varying float vEnergy;

${FLOW_GLSL}

void main() {
  float speedBase = mix(0.07, 0.31, aSeed.w);
  float yCycle = fract(aPhase + uTime * speedBase + uKick * 0.12);
  float yNorm = yCycle;
  float y = mix(-3.7, 3.7, yNorm);

  float rBase = radiusProfile(yNorm, uTime, uSub, uLowMid, uMid, uKick);
  float radialOffset = (aSeed.z - 0.5) * mix(0.5, 1.2, uRms);

  vec3 axis = axisPrecession(uTime, uMid, uSnare);

  float radialRatio = clamp((rBase + radialOffset) / 3.2, 0.0, 1.0);
  float coreSpeed = mix(2.9, 0.95, radialRatio);
  float heightSpeed = 0.65 + yNorm * 0.8;
  float audioRot = 1.0 + uBass * 2.0 + uKick * 1.5;
  float angular = coreSpeed * heightSpeed * audioRot;

  float theta = aSeed.x * 6.28318530718;
  theta += y * (1.5 + uLowMid * 0.8);
  theta += uTime * angular;

  vec3 p = vec3(cos(theta) * (rBase + radialOffset), y, sin(theta) * (rBase + radialOffset));

  vec3 q = p + noiseVec3(p * 0.34 + vec3(uTime * 0.08, 0.0, -uTime * 0.06)) * (0.22 + uMid * 0.16);
  vec3 q2 = q + noiseVec3(q * 0.72 - vec3(uTime * 0.12, -uTime * 0.04, uTime * 0.09)) * (0.13 + uHighMid * 0.12);

  vec3 tangent = normalize(vec3(-q2.z, 0.0, q2.x) + 1e-4);
  vec3 radialDir = normalize(vec3(q2.x, 0.0, q2.z) + 1e-4);
  float suction = -(0.08 + uSub * 0.22 + uRms * 0.12) * pow(clamp(1.0 - radialRatio, 0.0, 1.0), 1.5);
  float vertical = mix(0.2, 1.25, yNorm) + sin(y * 1.8 + uTime * 0.5) * 0.2;
  vec3 flow = tangent * (0.32 + uBass * 1.5);
  flow += radialDir * suction;
  flow += vec3(0.0, vertical * 0.42, 0.0);

  vec3 cn = curlNoise(q2 * (0.65 + uHighMid * 0.8) + vec3(uTime * 0.34));
  flow += cn * (0.08 + uTreble * 0.22 + uFlux * 0.12);

  vec3 pos = q2 + flow * (0.55 + aSeed.y * 0.35);
  pos += axis * (0.2 + yNorm * 0.9);

  float secVort = sin(uTime * (0.17 + aSeed.y * 0.08) + aSeed.x * 9.0) * 0.5 + 0.5;
  pos += vec3(
    sin(uTime * 0.21 + aSeed.z * 17.0) * 0.22,
    0.0,
    cos(uTime * 0.15 + aSeed.y * 13.0) * 0.22
  ) * secVort * (0.25 + uHighMid * 0.3);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  float distAtt = clamp(1.0 / max(1.0, -mvPosition.z * 0.11), 0.2, 2.4);
  float airBoost = mix(0.8, 1.9, aBand) * (0.55 + uAir * 1.6 + uHighTransient * 0.9);

  gl_PointSize = clamp(aSize * 25.0 * distAtt * airBoost, 0.9, 9.2);
  gl_Position = projectionMatrix * mvPosition;

  vBand = aBand;
  vEnergy = clamp(uRms * 0.65 + uTreble * 0.35, 0.0, 1.0);
  vAlpha = clamp(0.035 + aSeed.w * 0.19 + uAir * 0.22 + uKick * 0.08, 0.0, 0.56);
}
`;

const PARTICLE_FRAGMENT = `
varying float vAlpha;
varying float vBand;
varying float vEnergy;

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);
  if (d > 0.5) discard;

  float core = smoothstep(0.48, 0.03, d);
  float ring = smoothstep(0.42, 0.28, d) * (1.0 - smoothstep(0.28, 0.12, d));

  vec3 deep = vec3(0.02, 0.05, 0.12);
  vec3 cyan = vec3(0.25, 0.86, 1.0);
  vec3 violet = vec3(0.68, 0.58, 1.0);
  vec3 silver = vec3(0.84, 0.9, 0.98);

  vec3 color = mix(deep, cyan, vBand);
  color = mix(color, violet, pow(vBand, 2.0) * 0.45);
  color = mix(color, silver, vEnergy * 0.35 + ring * 0.35);

  float alpha = (core * 0.58 + ring * 0.24) * vAlpha;
  gl_FragColor = vec4(color, alpha);
}
`;

const RIBBON_VERTEX = `
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
uniform float uKick;
uniform float uSnare;
uniform float uFlux;

attribute float aSeed;
attribute float aPhase;
attribute float aWidth;
attribute float aDrift;

varying vec3 vNormalW;
varying vec3 vViewDirW;
varying float vEdge;
varying float vFlow;
varying float vRadius;

${FLOW_GLSL}

void main() {
  float v = uv.y;
  float y = mix(-3.8, 3.8, v);
  float yNorm = v;

  float baseRadius = radiusProfile(yNorm, uTime, uSub, uLowMid, uMid, uKick);
  float radialRatio = clamp(baseRadius / 3.2, 0.0, 1.0);

  float angular = mix(3.2, 1.1, radialRatio);
  angular *= 1.0 + uBass * 1.5 + uKick * 1.2;
  angular *= 0.8 + yNorm * 0.45;

  float torsion = sin(y * (1.8 + uLowMid * 2.2) - uTime * (1.4 + uKick * 3.8) + aSeed * 5.0);
  float snareWave = sin(y * 2.6 - uTime * 4.2 + aSeed * 11.0) * uSnare;

  float theta = aPhase;
  theta += y * (1.35 + uLowMid * 0.9 + snareWave * 0.28);
  theta += uTime * angular;
  theta += torsion * (0.22 + uHighMid * 0.35 + uKick * 0.25);

  vec3 center = vec3(cos(theta) * baseRadius, y, sin(theta) * baseRadius);

  vec3 axis = axisPrecession(uTime, uMid, uSnare);
  center += axis * (0.3 + yNorm * 1.1);

  vec3 warpQ = center + noiseVec3(center * 0.26 + vec3(uTime * 0.08)) * (0.26 + uMid * 0.2);
  vec3 warpQ2 = warpQ + noiseVec3(warpQ * 0.64 - vec3(uTime * 0.11, -uTime * 0.05, uTime * 0.07)) * (0.16 + uHighMid * 0.18);
  vec3 curl = curlNoise(warpQ2 * (0.6 + uTreble * 0.9) + vec3(uTime * 0.3));

  center = warpQ2 + curl * (0.11 + uTreble * 0.15 + uFlux * 0.1);
  center += vec3(
    sin(uTime * 0.19 + aDrift * 7.0) * 0.16,
    sin(uTime * 0.13 + aSeed * 4.0) * 0.05,
    cos(uTime * 0.17 + aDrift * 9.0) * 0.16
  ) * (0.35 + uMid * 0.4);

  float wProfile = smoothstep(0.02, 0.18, v) * (1.0 - smoothstep(0.84, 0.98, v));
  float ribbonWidth = aWidth * (0.7 + uLowMid * 0.75) * (0.85 + wProfile * 0.45);
  ribbonWidth *= 1.0 + uKick * 0.25 * exp(-pow(v - 0.2, 2.0) * 18.0);

  vec3 ahead = vec3(cos(theta + 0.04) * baseRadius, y + 0.05, sin(theta + 0.04) * baseRadius);
  vec3 tangent = normalize(ahead - vec3(cos(theta) * baseRadius, y, sin(theta) * baseRadius) + 1e-5);
  vec3 radial = normalize(vec3(center.x, 0.0, center.z) + 1e-5);
  vec3 binormal = normalize(cross(tangent, radial) + 1e-5);
  vec3 normal = normalize(cross(binormal, tangent) + 1e-5);

  float x = position.x;
  float feather = smoothstep(0.0, 0.5, abs(x));
  vec3 finalPos = center + binormal * (x * ribbonWidth) + normal * (position.y * 0.035);

  vec4 world = modelMatrix * vec4(finalPos, 1.0);
  vec4 view = viewMatrix * world;

  gl_Position = projectionMatrix * view;

  vEdge = feather;
  vFlow = clamp(0.35 + abs(torsion) * 0.5 + uTreble * 0.35, 0.0, 1.0);
  vRadius = radialRatio;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDirW = normalize(cameraPosition - world.xyz);
}
`;

const RIBBON_FRAGMENT = `
uniform float uCentroid;
uniform float uRms;
uniform float uKick;
uniform float uSnare;
uniform float uAir;

varying vec3 vNormalW;
varying vec3 vViewDirW;
varying float vEdge;
varying float vFlow;
varying float vRadius;

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(vViewDirW);

  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.8);
  float edgeMask = smoothstep(0.08, 0.9, vEdge);

  vec3 dark = vec3(0.02, 0.025, 0.045);
  vec3 cyan = vec3(0.16, 0.84, 1.0);
  vec3 violet = vec3(0.62, 0.56, 1.0);
  vec3 silver = vec3(0.86, 0.92, 0.98);

  float temp = clamp(uCentroid, 0.0, 1.0);
  vec3 base = mix(cyan, silver, smoothstep(0.35, 0.85, temp));
  base = mix(base, violet, smoothstep(0.72, 1.0, temp) * 0.3);

  float curvatureHighlight = edgeMask * (0.45 + vFlow * 0.5 + uAir * 0.35);
  float liquidAbsorption = mix(0.78, 0.45, vRadius);

  vec3 color = mix(dark, base, liquidAbsorption);
  color += cyan * fresnel * (0.45 + uRms * 0.35);
  color += silver * curvatureHighlight * (0.28 + uKick * 0.35 + uSnare * 0.2);
  color += violet * fresnel * (0.12 + uAir * 0.2);

  float alpha = 0.08 + fresnel * 0.34 + edgeMask * 0.22;
  alpha *= 0.65 + vFlow * 0.35;
  alpha = clamp(alpha, 0.05, 0.86);

  gl_FragColor = vec4(color, alpha);
}
`;

const CORE_VERTEX = `
uniform float uTime;
uniform float uSub;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uKick;
uniform float uSnare;

varying vec3 vNormalW;
varying vec3 vViewDirW;
varying float vDensity;

${FLOW_GLSL}

void main() {
  vec3 p = position;
  float n = fbm3(normal * (1.5 + uTreble * 1.3) + vec3(uTime * 0.25));
  float inhale = uSub * 0.32 - uKick * 0.22;
  float torsion = sin(position.y * 2.1 - uTime * (2.2 + uKick * 2.6)) * (0.1 + uSnare * 0.18);

  p += normal * ((n - 0.5) * (0.42 + uTreble * 0.32) + inhale + torsion);

  vec4 world = modelMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * viewMatrix * world;

  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDirW = normalize(cameraPosition - world.xyz);
  vDensity = clamp(0.45 + n * 0.45 + uBass * 0.25, 0.0, 1.0);
}
`;

const CORE_FRAGMENT = `
uniform float uCentroid;
uniform float uRms;
uniform float uTreble;
uniform float uAir;
uniform float uKick;

varying vec3 vNormalW;
varying vec3 vViewDirW;
varying float vDensity;

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(vViewDirW);

  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 4.2);
  float sparkle = pow(max(dot(reflect(-V, N), vec3(0.2, 0.9, 0.35)), 0.0), 28.0);

  vec3 darkChrome = vec3(0.025, 0.03, 0.05);
  vec3 cyan = vec3(0.14, 0.72, 0.92);
  vec3 silver = vec3(0.84, 0.88, 0.94);
  vec3 violet = vec3(0.52, 0.48, 0.88);

  vec3 tempColor = mix(cyan, silver, smoothstep(0.36, 0.88, uCentroid));
  tempColor = mix(tempColor, violet, smoothstep(0.75, 1.0, uCentroid) * 0.2);

  vec3 color = mix(darkChrome, tempColor, vDensity * (0.35 + uRms * 0.45));
  color += tempColor * fresnel * (0.44 + uTreble * 0.3);
  color += silver * sparkle * (0.2 + uAir * 0.4 + uKick * 0.35);

  float alpha = clamp(0.3 + vDensity * 0.35 + fresnel * 0.22, 0.2, 0.92);
  gl_FragColor = vec4(color, alpha);
}
`;

const SHELL_VERTEX = `
uniform float uTime;
uniform float uSub;
uniform float uLowMid;
uniform float uMid;
uniform float uKick;
uniform float uSnare;

varying vec3 vWorld;
varying vec3 vNormalW;
varying float vNoise;

${FLOW_GLSL}

void main() {
  vec3 p = position;
  float yNorm = clamp((p.y + 3.8) / 7.6, 0.0, 1.0);

  float r = radiusProfile(yNorm, uTime, uSub, uLowMid, uMid, uKick);
  float radial = length(p.xz);
  float scale = r / max(0.001, radial);
  p.xz *= scale;

  float twist = sin(p.y * (1.6 + uLowMid * 2.0) - uTime * (1.7 + uKick * 3.0) + p.x * 0.35);
  float snareBand = sin(p.y * 2.8 - uTime * 4.5) * uSnare;
  float angle = twist * (0.15 + uMid * 0.18) + snareBand * 0.08;

  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  p.xz = rot * p.xz;

  float membrane = fbm3(vec3(p.x * 0.45, p.y * 0.3, p.z * 0.45) + vec3(uTime * 0.12));
  p += normal * ((membrane - 0.5) * (0.16 + uMid * 0.09));

  vec4 world = modelMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * viewMatrix * world;

  vWorld = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vNoise = membrane;
}
`;

const SHELL_FRAGMENT = `
uniform float uTime;
uniform float uRms;
uniform float uTreble;
uniform float uCentroid;

varying vec3 vWorld;
varying vec3 vNormalW;
varying float vNoise;

${FLOW_GLSL}

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);

  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.1);
  float mask = smoothstep(0.43, 0.71, noise3(vWorld * 0.22 + vec3(0.0, uTime * 0.11, 0.0)) + vNoise * 0.3);

  vec3 deep = vec3(0.015, 0.02, 0.035);
  vec3 cyan = vec3(0.18, 0.68, 0.92);
  vec3 violet = vec3(0.45, 0.38, 0.78);
  vec3 silver = vec3(0.78, 0.84, 0.92);

  vec3 hue = mix(cyan, silver, smoothstep(0.35, 0.88, uCentroid));
  hue = mix(hue, violet, smoothstep(0.72, 1.0, uCentroid) * 0.22);

  vec3 color = mix(deep, hue, 0.26 + uRms * 0.4);
  color += hue * fresnel * (0.24 + uTreble * 0.32);

  float alpha = (0.03 + fresnel * 0.16 + mask * 0.08) * (0.72 + uTreble * 0.14);
  alpha = clamp(alpha, 0.015, 0.24);

  gl_FragColor = vec4(color, alpha);
}
`;

const HAZE_FRAGMENT = `
uniform float uTime;
uniform float uRms;
varying vec2 vUv;

${FLOW_GLSL}

void main() {
  vec2 uv = vUv * vec2(1.8, 1.1);
  float n = fbm3(vec3(uv * 2.2, uTime * 0.05));
  float grad = smoothstep(0.0, 0.85, 1.0 - vUv.y);
  float glow = smoothstep(0.42, 0.86, n) * (0.07 + uRms * 0.15);

  vec3 base = mix(vec3(0.01, 0.01, 0.03), vec3(0.02, 0.03, 0.08), grad);
  vec3 haze = vec3(0.08, 0.2, 0.36) * glow;

  gl_FragColor = vec4(base + haze, 1.0);
}
`;

export default function LiquidTornadoBackground() {
  const playerContext = usePlayerOptional();
  const { safeArea, tuning } = useBackgroundRig();
  const fallbackVisualizerRef = useRef({
    bass: 0,
    mid: 0,
    treble: 0,
    pulse: 0,
    beat: 0,
    sub: 0,
    lowMid: 0,
    highMid: 0,
    air: 0,
    rms: 0,
    centroid: 0,
    flux: 0,
    kick: 0,
    snare: 0,
    highTransient: 0,
    active: false,
    updatedAt: 0
  });
  const visualizerStateRef = playerContext?.visualizerStateRef ?? fallbackVisualizerRef;

  const cameraRef = useRef(null);
  const ribbonsRef = useRef(null);

  const audioState = useRef({
    sub: 0,
    bass: 0,
    lowMid: 0,
    mid: 0,
    highMid: 0,
    treble: 0,
    air: 0,
    rms: 0,
    centroid: 0,
    flux: 0,
    kick: 0,
    snare: 0,
    highTransient: 0
  });

  const cameraState = useRef({ x: 0.35, y: 0.35, z: 13.8, lookX: 0, lookY: 0.1, lookZ: 0 });

  const quality = useMemo(() => {
    if (typeof window === "undefined") {
      return { particles: 22000, ribbons: 84 };
    }

    const isMobile = window.innerWidth < 820 || (navigator.hardwareConcurrency || 8) <= 4;
    if (isMobile) {
      return { particles: 9000, ribbons: 42 };
    }

    if (window.devicePixelRatio > 1.5) {
      return { particles: 18000, ribbons: 64 };
    }

    return { particles: 26000, ribbons: 96 };
  }, []);

  const particleGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const position = new Float32Array(quality.particles * 3);
    const aSeed = new Float32Array(quality.particles * 4);
    const aPhase = new Float32Array(quality.particles);
    const aSize = new Float32Array(quality.particles);
    const aBand = new Float32Array(quality.particles);

    for (let i = 0; i < quality.particles; i += 1) {
      const i4 = i * 4;
      aSeed[i4] = hash01(i, 0.13);
      aSeed[i4 + 1] = hash01(i, 0.37);
      aSeed[i4 + 2] = hash01(i, 0.61);
      aSeed[i4 + 3] = hash01(i, 0.89);
      aPhase[i] = hash01(i, 1.11);
      aSize[i] = 0.7 + hash01(i, 1.73) * 1.9;
      aBand[i] = hash01(i, 2.17);
    }

    g.setAttribute("position", new THREE.BufferAttribute(position, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(aSeed, 4));
    g.setAttribute("aPhase", new THREE.BufferAttribute(aPhase, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));
    g.setAttribute("aBand", new THREE.BufferAttribute(aBand, 1));

    return g;
  }, [quality.particles]);

  const ribbonGeometry = useMemo(() => {
    const base = new THREE.PlaneGeometry(1, 1, 6, 56);

    const seed = new Float32Array(quality.ribbons);
    const phase = new Float32Array(quality.ribbons);
    const width = new Float32Array(quality.ribbons);
    const drift = new Float32Array(quality.ribbons);

    for (let i = 0; i < quality.ribbons; i += 1) {
      seed[i] = hash01(i, 2.49);
      phase[i] = hash01(i, 3.17) * TAU;
      width[i] = 0.08 + hash01(i, 4.01) * 0.22;
      drift[i] = hash01(i, 4.73);
    }

    base.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
    base.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phase, 1));
    base.setAttribute("aWidth", new THREE.InstancedBufferAttribute(width, 1));
    base.setAttribute("aDrift", new THREE.InstancedBufferAttribute(drift, 1));

    return base;
  }, [quality.ribbons]);

  const commonAudioUniforms = useMemo(
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
      uCentroid: { value: 0 },
      uFlux: { value: 0 },
      uKick: { value: 0 },
      uSnare: { value: 0 },
      uHighTransient: { value: 0 }
    }),
    []
  );

  useEffect(() => {
    if (!ribbonsRef.current) return;

    const identity = new THREE.Matrix4();
    for (let i = 0; i < quality.ribbons; i += 1) {
      ribbonsRef.current.setMatrixAt(i, identity);
    }
    ribbonsRef.current.instanceMatrix.needsUpdate = true;
  }, [quality.ribbons]);

  useEffect(() => {
    return () => {
      particleGeometry.dispose();
      ribbonGeometry.dispose();
    };
  }, [particleGeometry, ribbonGeometry]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const src = visualizerStateRef.current || {};
    const audioGain = tuning.reactivity;
    const bassGain = tuning.bassBoost;
    const trebleGain = tuning.trebleBoost;
    const deformGain = tuning.deformIntensity;
    const motionGain = tuning.animationEnabled ? tuning.motionIntensity : 0;
    const safeOffsetX = (safeArea.centerX - 0.5) * 5.2;
    const driftTime = t * (0.72 + motionGain * 0.55);

    const target = {
      sub: THREE.MathUtils.clamp((src.sub ?? src.bass ?? 0) * audioGain * bassGain, 0, 1),
      bass: THREE.MathUtils.clamp((src.bass ?? 0) * audioGain * bassGain, 0, 1),
      lowMid: THREE.MathUtils.clamp((src.lowMid ?? src.mid ?? 0) * audioGain, 0, 1),
      mid: THREE.MathUtils.clamp((src.mid ?? 0) * audioGain, 0, 1),
      highMid: THREE.MathUtils.clamp((src.highMid ?? src.treble ?? 0) * audioGain * trebleGain, 0, 1),
      treble: THREE.MathUtils.clamp((src.treble ?? 0) * audioGain * trebleGain, 0, 1),
      air: THREE.MathUtils.clamp((src.air ?? src.treble ?? 0) * audioGain * trebleGain, 0, 1),
      rms: THREE.MathUtils.clamp(src.rms ?? src.pulse ?? 0, 0, 1),
      centroid: THREE.MathUtils.clamp(src.centroid ?? src.treble ?? 0.5, 0, 1),
      flux: THREE.MathUtils.clamp(src.flux ?? 0, 0, 1),
      kick: THREE.MathUtils.clamp((src.kick ?? 0) * audioGain * bassGain, 0, 1),
      snare: THREE.MathUtils.clamp(src.snare ?? 0, 0, 1),
      highTransient: THREE.MathUtils.clamp((src.highTransient ?? 0) * audioGain * trebleGain, 0, 1)
    };

    const a = audioState.current;
    a.sub = smoothDamp(a.sub, target.sub, 2.2, delta);
    a.bass = smoothDamp(a.bass, target.bass, 7.2, delta);
    a.lowMid = smoothDamp(a.lowMid, target.lowMid, 5.1, delta);
    a.mid = smoothDamp(a.mid, target.mid, 3.2, delta);
    a.highMid = smoothDamp(a.highMid, target.highMid, 6.3, delta);
    a.treble = smoothDamp(a.treble, target.treble, 7.6, delta);
    a.air = smoothDamp(a.air, target.air, 10.5, delta);
    a.rms = smoothDamp(a.rms, target.rms, 3.6, delta);
    a.centroid = smoothDamp(a.centroid, target.centroid, 1.8, delta);
    a.flux = smoothDamp(a.flux, target.flux, 11.0, delta);
    a.kick = smoothDamp(a.kick, target.kick, 8.8, delta);
    a.snare = smoothDamp(a.snare, target.snare, 9.6, delta);
    a.highTransient = smoothDamp(a.highTransient, target.highTransient, 12.2, delta);

    commonAudioUniforms.uTime.value = driftTime;
    commonAudioUniforms.uSub.value = THREE.MathUtils.clamp(a.sub * deformGain, 0, 1.8);
    commonAudioUniforms.uBass.value = THREE.MathUtils.clamp(a.bass * deformGain, 0, 1.8);
    commonAudioUniforms.uLowMid.value = THREE.MathUtils.clamp(a.lowMid * deformGain, 0, 1.8);
    commonAudioUniforms.uMid.value = THREE.MathUtils.clamp(a.mid * (0.7 + deformGain * 0.3), 0, 1.6);
    commonAudioUniforms.uHighMid.value = THREE.MathUtils.clamp(a.highMid * deformGain, 0, 1.8);
    commonAudioUniforms.uTreble.value = a.treble;
    commonAudioUniforms.uAir.value = a.air;
    commonAudioUniforms.uRms.value = a.rms;
    commonAudioUniforms.uCentroid.value = a.centroid;
    commonAudioUniforms.uFlux.value = THREE.MathUtils.clamp(a.flux * (0.7 + deformGain * 0.3), 0, 1.6);
    commonAudioUniforms.uKick.value = THREE.MathUtils.clamp(a.kick * deformGain, 0, 1.8);
    commonAudioUniforms.uSnare.value = a.snare;
    commonAudioUniforms.uHighTransient.value = a.highTransient;

    if (cameraRef.current) {
      const cam = cameraState.current;
      const orbit = driftTime * (TAU / 74);
      const irregular = Math.sin(driftTime * 0.10) * 0.14 + Math.sin(driftTime * 0.037) * 0.1;
      const targetX = safeOffsetX + 0.12 + Math.cos(orbit + irregular) * 0.22 + a.mid * 0.12;
      const targetY = 0.35 + Math.sin(driftTime * 0.07) * 0.1 + a.kick * 0.04;
      const targetZ = 13.8 + Math.sin(orbit * 0.63 + irregular) * 0.22 - a.bass * 0.12;
      const targetLookX = safeOffsetX * 0.86 + Math.sin(driftTime * 0.11) * (0.08 + a.mid * 0.08);
      const targetLookY = 0.18 + Math.sin(driftTime * 0.08) * 0.07;
      const targetLookZ = Math.cos(driftTime * 0.09) * (0.08 + a.mid * 0.08);

      cam.x = smoothDamp(cam.x, targetX, 2.2, delta);
      cam.y = smoothDamp(cam.y, targetY, 2.2, delta);
      cam.z = smoothDamp(cam.z, targetZ, 2.5, delta);
      cam.lookX = smoothDamp(cam.lookX, targetLookX, 2.1, delta);
      cam.lookY = smoothDamp(cam.lookY, targetLookY, 2.1, delta);
      cam.lookZ = smoothDamp(cam.lookZ, targetLookZ, 2.1, delta);

      cameraRef.current.position.set(cam.x, cam.y, cam.z);
      cameraRef.current.lookAt(cam.lookX, cam.lookY, cam.lookZ);
    }
  });

  return (
    <group>
      <color attach="background" args={["#010104"]} />
      <fog attach="fog" args={["#02030a", 7, 24]} />

      <PerspectiveCamera ref={cameraRef} makeDefault fov={44} position={[0.35, 0.35, 13.8]} />

      <ambientLight intensity={0.12} color="#8eb3d1" />
      <directionalLight position={[6, 3, 2]} intensity={1.35} color="#66e8ff" />
      <directionalLight position={[-4, 2, -6]} intensity={0.88} color="#7e6dff" />
      <pointLight position={[0, 0.2, 0]} intensity={1.1} distance={10} color="#dcecff" />
      <pointLight position={[0, 3.2, -4.8]} intensity={0.22} distance={12} color="#ff5fbf" />

      <mesh position={[0, 0.3, -9.2]}>
        <planeGeometry args={[64, 38, 1, 1]} />
        <shaderMaterial
          uniforms={commonAudioUniforms}
          vertexShader="varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }"
          fragmentShader={HAZE_FRAGMENT}
          transparent
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      <instancedMesh ref={ribbonsRef} args={[ribbonGeometry, null, quality.ribbons]}>
        <shaderMaterial
          uniforms={commonAudioUniforms}
          vertexShader={RIBBON_VERTEX}
          fragmentShader={RIBBON_FRAGMENT}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.NormalBlending}
        />
      </instancedMesh>

      <points geometry={particleGeometry}>
        <shaderMaterial
          uniforms={commonAudioUniforms}
          vertexShader={PARTICLE_VERTEX}
          fragmentShader={PARTICLE_FRAGMENT}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
