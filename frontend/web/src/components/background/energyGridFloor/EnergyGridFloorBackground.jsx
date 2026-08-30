import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { usePlayerOptional } from "../../../context/PlayerContext";
import { useBackgroundRig } from "../shared/useBackgroundRig";

const DEBUG_ENERGY_FIELD = false;
const SOURCE_COUNT = 6;
const RADIAL_EVENT_COUNT = 8;
const SHEAR_EVENT_COUNT = 4;

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothExp = (current, target, lambda, delta) => current + (target - current) * (1 - Math.exp(-lambda * delta));
const smoothChannel = (current, target, attack, release, delta) => smoothExp(current, target, target > current ? attack : release, delta);

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
  for (int i = 0; i < 4; i++) {
    value += noise2(p) * amplitude;
    p = rot2(0.39) * p * 2.02 + vec2(17.0, 9.0);
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

float softTerrace(float h, float terraceStrength) {
  float quant = floor(h * 1.35 + 0.5) / 1.35;
  return mix(h, mix(h, quant, 0.48), terraceStrength);
}

float radialEventsField(vec2 p, vec4 radialEvents[${RADIAL_EVENT_COUNT}], float bass, float sub) {
  float total = 0.0;
  for (int i = 0; i < ${RADIAL_EVENT_COUNT}; i++) {
    vec4 event = radialEvents[i];
    if (event.w <= 0.0001) continue;
    float dist = length(p - event.xy);
    float band = sin((dist - event.z) * (0.16 + bass * 0.22) * 12.0);
    float envelope = exp(-abs(dist - event.z) * (0.28 + sub * 0.22));
    total += band * envelope * event.w;
  }
  return total;
}

float shearEventsField(vec2 p, vec4 shearEvents[${SHEAR_EVENT_COUNT}], float mid, float highTransient) {
  float total = 0.0;
  for (int i = 0; i < ${SHEAR_EVENT_COUNT}; i++) {
    vec4 event = shearEvents[i];
    if (event.w <= 0.0001) continue;
    vec2 normal = normalize(event.xy + 1e-4);
    float signedDist = dot(p, normal) - event.z;
    float front = sin(signedDist * (0.22 + highTransient * 0.45) * 10.0);
    float envelope = exp(-abs(signedDist) * (0.44 + mid * 0.24));
    total += front * envelope * event.w;
  }
  return total;
}

float fieldSourcesContribution(vec2 p, vec4 sources[${SOURCE_COUNT}], float time, float lowMid, float mid, float trackProgress) {
  float total = 0.0;
  for (int i = 0; i < ${SOURCE_COUNT}; i++) {
    vec4 source = sources[i];
    vec2 q = p - source.xy;
    float dist = length(q);
    float polarity = source.w;
    float falloff = source.z / (1.0 + dist * dist * 0.006);
    float osc = sin(dist * (0.035 + float(i) * 0.004 + mid * 0.01) - time * (0.14 + float(i) * 0.011));
    float saddle = (q.x * q.x - q.y * q.y) * 0.00012 * polarity;
    total += falloff * polarity;
    total += osc * source.z * 0.18 * (0.35 + lowMid * 0.65);
    total += saddle * (0.5 + trackProgress * 0.35);
  }
  return total;
}

float fieldHeight(
  vec2 p,
  float time,
  float sub,
  float bass,
  float lowMid,
  float mid,
  float highMid,
  float treble,
  float air,
  float rms,
  float trackProgress,
  vec4 sources[${SOURCE_COUNT}],
  vec4 radialEvents[${RADIAL_EVENT_COUNT}],
  vec4 shearEvents[${SHEAR_EVENT_COUNT}]
) {
  float macro = sin(p.x * 0.006 + time * 0.032) * 7.0 + cos(p.y * 0.004 - time * 0.027) * 5.4;
  macro *= 0.52 + sub * 0.38;

  vec2 warp = noiseVec2(p * 0.011 + vec2(time * 0.021, -time * 0.016));
  vec2 warped = p + warp * (6.0 + lowMid * 12.0 + rms * 4.0);

  float sourceField = fieldSourcesContribution(warped, sources, time, lowMid, mid, trackProgress);
  float standing = sin(warped.x * (0.052 + mid * 0.018) + time * 0.16) * sin(warped.y * (0.047 + mid * 0.015) - time * 0.12);
  float ridges = ridge2(warped * (0.022 + highMid * 0.014) + vec2(time * 0.008, 0.0));
  float fractures = ridge2(warped * (0.051 + highMid * 0.03) - vec2(time * 0.012, time * 0.01));

  float kickField = radialEventsField(warped, radialEvents, bass, sub);
  float snareField = shearEventsField(warped, shearEvents, mid, air);

  float topology = sourceField * (0.9 + lowMid * 0.5);
  float idleTopology = (fbm2(warped * 0.014 + vec2(time * 0.006, -time * 0.004)) - 0.5) * 9.0;
  idleTopology += sin(warped.x * 0.024 + warped.y * 0.017 + time * 0.028) * 1.4;
  topology += idleTopology;
  topology += standing * (0.55 + mid * 0.65);
  topology += (ridges - 0.45) * (1.4 + lowMid * 2.1);
  topology += (fractures - 0.5) * (0.3 + highMid * 1.1);
  topology += kickField * (1.8 + bass * 1.6);
  topology += snareField * (1.15 + mid * 0.9);
  topology += (fbm2(warped * 0.083 - vec2(time * 0.06, -time * 0.04)) - 0.5) * (0.14 + treble * 0.18 + air * 0.08);

  float terraceStrength = clamp(lowMid * 0.35 + mid * 0.22 + trackProgress * 0.1, 0.0, 0.62);
  return clamp(softTerrace(macro + topology, terraceStrength), -14.0, 14.0);
}
`;

const FIELD_VERTEX = `
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
uniform float uTrackProgress;
uniform vec2 uFieldOffset;
uniform vec4 uSources[${SOURCE_COUNT}];
uniform vec4 uRadialEvents[${RADIAL_EVENT_COUNT}];
uniform vec4 uShearEvents[${SHEAR_EVENT_COUNT}];

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying vec2 vFieldPos;
varying float vHeight;
varying float vGradient;
varying float vDistance;
varying float vKickEnergy;
varying float vSnareEnergy;

${FLOW_GLSL}

void main() {
  vec2 fieldPos = vec2(position.x, position.y) + uFieldOffset;
  float h = fieldHeight(fieldPos, uTime, uSub, uBass, uLowMid, uMid, uHighMid, uTreble, uAir, uRms, uTrackProgress, uSources, uRadialEvents, uShearEvents);

  float sampleStep = 1.2;
  float hx = fieldHeight(fieldPos + vec2(sampleStep, 0.0), uTime, uSub, uBass, uLowMid, uMid, uHighMid, uTreble, uAir, uRms, uTrackProgress, uSources, uRadialEvents, uShearEvents);
  float hz = fieldHeight(fieldPos + vec2(0.0, sampleStep), uTime, uSub, uBass, uLowMid, uMid, uHighMid, uTreble, uAir, uRms, uTrackProgress, uSources, uRadialEvents, uShearEvents);

  vec3 displaced = vec3(position.x, h, position.y);
  vec3 sampleX = vec3(position.x + sampleStep, hx, position.y);
  vec3 sampleZ = vec3(position.x, hz, position.y + sampleStep);
  vec3 normal = normalize(cross(sampleZ - displaced, sampleX - displaced));

  vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
  vWorldPosition = worldPosition.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - worldPosition.xyz);
  vFieldPos = fieldPos;
  vHeight = h;
  vGradient = length(vec2(hx - h, hz - h));
  vDistance = distance(cameraPosition, worldPosition.xyz);
  vKickEnergy = abs(radialEventsField(fieldPos, uRadialEvents, uBass, uSub));
  vSnareEnergy = abs(shearEventsField(fieldPos, uShearEvents, uMid, uHighTransient));

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const FIELD_FRAGMENT = `
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
uniform float uTrackProgress;
uniform vec2 uFieldOffset;
uniform vec4 uSources[${SOURCE_COUNT}];
uniform vec4 uRadialEvents[${RADIAL_EVENT_COUNT}];
uniform vec4 uShearEvents[${SHEAR_EVENT_COUNT}];

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying vec2 vFieldPos;
varying float vHeight;
varying float vGradient;
varying float vDistance;
varying float vKickEnergy;
varying float vSnareEnergy;

${FLOW_GLSL}

float gridMask(vec2 p, float scale, float width) {
  vec2 cell = p / scale;
  vec2 a = abs(fract(cell - 0.5) - 0.5) / max(fwidth(cell), vec2(1e-4));
  float line = 1.0 - min(min(a.x, a.y), 1.0);
  return smoothstep(width, 1.0, line);
}

float contourMask(float h, float frequency, float width) {
  float line = abs(fract(h * frequency - 0.5) - 0.5) / max(fwidth(h * frequency), 1e-4);
  return 1.0 - smoothstep(0.0, width, line);
}

void main() {
  vec3 normal = normalize(vWorldNormal);
  vec3 viewDir = normalize(vViewDir);

  vec3 topLightDir = normalize(vec3(-0.25, 0.88, -0.38));
  vec3 horizonLightDir = normalize(vec3(0.72, 0.18, -0.64));
  float ndlTop = max(dot(normal, topLightDir), 0.0);
  float ndlHorizon = max(dot(normal, horizonLightDir), 0.0);
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.2);

  float distanceFade = smoothstep(80.0, 360.0, vDistance);
  float nearFade = 1.0 - smoothstep(110.0, 260.0, vDistance);
  float horizonFade = 1.0 - smoothstep(190.0, 360.0, vDistance);

  float topologyMorph = clamp(uMid * 0.7 + uTrackProgress * 0.18, 0.0, 1.0);
  float microReveal = pow(clamp(uTreble * 0.8 + uAir * 0.5, 0.0, 1.0), 1.6);
  float macroGrid = gridMask(vFieldPos, mix(6.4, 4.2, topologyMorph), 0.28) * (0.62 + nearFade * 0.4);
  float mesoGrid = gridMask(vFieldPos + vec2(vHeight * 0.7), mix(2.2, 1.45, topologyMorph), 0.22) * (0.72 + uMid * 0.18);
  float microGrid = gridMask(vFieldPos + noiseVec2(vFieldPos * 0.03 + vec2(uTime * 0.03, -uTime * 0.02)) * 1.1, 0.58, 0.1) * microReveal;
  float contours = contourMask(vHeight, mix(0.16, 0.34, uLowMid), 1.2) * (0.34 + uLowMid * 0.28);

  float lineMix = mix(macroGrid, mesoGrid, 0.48 + topologyMorph * 0.22);
  lineMix = max(lineMix, contours * (0.5 + uLowMid * 0.22));
  lineMix += microGrid * 0.42;
  lineMix *= 0.72 + horizonFade * 0.38;

  vec3 deep = mix(vec3(0.008, 0.012, 0.03), vec3(0.02, 0.02, 0.05), smoothstep(0.35, 0.92, uCentroid));
  vec3 membrane = mix(vec3(0.028, 0.055, 0.10), vec3(0.065, 0.065, 0.14), smoothstep(0.15, 0.85, uCentroid));
  vec3 positive = mix(vec3(0.38, 0.70, 0.92), vec3(0.72, 0.86, 0.98), smoothstep(0.22, 0.88, uCentroid));
  vec3 negative = mix(vec3(0.11, 0.10, 0.24), vec3(0.30, 0.22, 0.44), smoothstep(0.22, 0.88, uCentroid));
  vec3 accent = mix(negative, positive, smoothstep(-0.6, 0.8, vHeight * 0.12 + vGradient * 0.8));

  float curvatureEnergy = smoothstep(0.2, 2.8, vGradient);
  float emission = lineMix * (0.78 + curvatureEnergy * 0.72 + vKickEnergy * 0.3 + vSnareEnergy * 0.2);
  emission += vKickEnergy * (0.08 + uBass * 0.16);
  emission += vSnareEnergy * (0.06 + uHighTransient * 0.14);
  emission += microGrid * (0.02 + uAir * 0.08);

  vec3 color = mix(deep, membrane, ndlTop * 0.55 + ndlHorizon * 0.25 + fresnel * 0.2);
  color += accent * emission;
  color += positive * fresnel * 0.12;
  vec3 topologyTint = mix(negative, positive, smoothstep(-7.0, 7.0, vHeight));
  float reliefLight = smoothstep(-10.0, 10.0, vHeight) * 0.1 + curvatureEnergy * 0.16;
  color += topologyTint * reliefLight;
  color *= 0.82 + ndlTop * 0.24 + ndlHorizon * 0.14;

  float sourceGlow = 0.0;
  for (int i = 0; i < ${SOURCE_COUNT}; i++) {
    vec4 source = uSources[i];
    float d = length(vFieldPos - source.xy);
    sourceGlow += source.z * exp(-d * 0.045) * 0.015;
  }
  color += mix(negative, positive, 0.6) * sourceGlow * (0.25 + uRms * 0.3);

  vec3 haze = mix(vec3(0.014, 0.02, 0.03), vec3(0.05, 0.06, 0.08), smoothstep(0.2, 1.0, uCentroid));
  color = mix(color, haze, distanceFade * 0.52);

  float phosphor = (vKickEnergy * 0.12 + vSnareEnergy * 0.08 + uFlux * 0.03) * exp(-vDistance * 0.012);
  color += accent * phosphor;

  gl_FragColor = vec4(color, 1.0);
}
`;

export default function EnergyGridFloorBackground() {
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
    lowMid: 0,
    highMid: 0,
    air: 0,
    rms: 0,
    centroid: 0.3,
    flux: 0,
    kick: 0,
    snare: 0,
    highTransient: 0,
    active: false,
    updatedAt: 0
  });
  const visualizerStateRef = playerContext?.visualizerStateRef ?? fallbackVisualizerRef;

  const cameraRef = useRef(null);
  const surfaceRef = useRef(null);

  const audioState = useRef({
    sub: 0,
    bass: 0,
    lowMid: 0,
    mid: 0,
    highMid: 0,
    treble: 0,
    air: 0,
    rms: 0,
    centroid: 0.3,
    flux: 0,
    kick: 0,
    snare: 0,
    highTransient: 0,
    beat: 0,
    pulse: 0,
    trackProgress: 0
  });
  const cameraState = useRef({ x: 0.2, y: 5.0, z: 11.0, lookX: 0.0, lookY: -2.1, lookZ: -14.0, fov: 46.0, impulse: 0.0 });
  const fieldOffset = useRef(new THREE.Vector2(0, 0));
  const sourceVectors = useMemo(() => Array.from({ length: SOURCE_COUNT }, () => new THREE.Vector4()), []);
  const radialUniforms = useMemo(() => Array.from({ length: RADIAL_EVENT_COUNT }, () => new THREE.Vector4(0, 0, 9999, 0)), []);
  const shearUniforms = useMemo(() => Array.from({ length: SHEAR_EVENT_COUNT }, () => new THREE.Vector4(1, 0, 9999, 0)), []);
  const radialEventsRef = useRef(Array.from({ length: RADIAL_EVENT_COUNT }, () => ({ x: 0, z: 0, radius: 9999, amplitude: 0, speed: 0, active: false })));
  const shearEventsRef = useRef(Array.from({ length: SHEAR_EVENT_COUNT }, () => ({ nx: 1, nz: 0, offset: 9999, amplitude: 0, speed: 0, active: false })));
  const eventCursorRef = useRef({ radial: 0, shear: 0, lastKick: 0, lastSnare: 0 });

  const quality = useMemo(() => {
    if (typeof window === "undefined") {
      return { segments: 160, radialCount: RADIAL_EVENT_COUNT, shearCount: SHEAR_EVENT_COUNT };
    }
    const lowPower = window.innerWidth < 900 || (navigator.hardwareConcurrency || 8) <= 4;
    if (lowPower) {
      return { segments: 96, radialCount: RADIAL_EVENT_COUNT, shearCount: SHEAR_EVENT_COUNT };
    }
    if (window.devicePixelRatio > 1.5) {
      return { segments: 160, radialCount: RADIAL_EVENT_COUNT, shearCount: SHEAR_EVENT_COUNT };
    }
    return { segments: 256, radialCount: RADIAL_EVENT_COUNT, shearCount: SHEAR_EVENT_COUNT };
  }, []);

  const uniforms = useMemo(
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
      uCentroid: { value: 0.3 },
      uFlux: { value: 0 },
      uKick: { value: 0 },
      uSnare: { value: 0 },
      uHighTransient: { value: 0 },
      uTrackProgress: { value: 0 },
      uFieldOffset: { value: fieldOffset.current },
      uSources: { value: sourceVectors },
      uRadialEvents: { value: radialUniforms },
      uShearEvents: { value: shearUniforms }
    }),
    [fieldOffset, radialUniforms, shearUniforms, sourceVectors]
  );

  useEffect(() => {
    return () => {
      surfaceRef.current?.geometry?.dispose?.();
      surfaceRef.current?.material?.dispose?.();
    };
  }, []);

  useFrame((state, delta) => {
    const src = visualizerStateRef.current || {};
    const audioGain = tuning.reactivity;
    const bassGain = tuning.bassBoost;
    const trebleGain = tuning.trebleBoost;
    const motionGain = tuning.animationEnabled ? tuning.motionIntensity : 0;
    const deformGain = tuning.deformIntensity;
    const audio = audioState.current;
    audio.sub = smoothChannel(audio.sub, clamp01((src.sub ?? 0) * audioGain * bassGain), 6.8, 2.5, delta);
    audio.bass = smoothChannel(audio.bass, clamp01((src.bass ?? 0) * audioGain * bassGain), 8.2, 3.0, delta);
    audio.lowMid = smoothChannel(audio.lowMid, clamp01((src.lowMid ?? 0) * audioGain), 3.6, 1.8, delta);
    audio.mid = smoothChannel(audio.mid, clamp01((src.mid ?? 0) * audioGain), 4.8, 2.2, delta);
    audio.highMid = smoothChannel(audio.highMid, clamp01((src.highMid ?? 0) * audioGain * trebleGain), 8.0, 3.2, delta);
    audio.treble = smoothChannel(audio.treble, clamp01((src.treble ?? 0) * audioGain * trebleGain), 12.0, 5.6, delta);
    audio.air = smoothChannel(audio.air, clamp01((src.air ?? 0) * audioGain * trebleGain), 14.0, 6.2, delta);
    audio.rms = smoothChannel(audio.rms, clamp01(src.rms ?? 0), 3.8, 1.5, delta);
    audio.centroid = smoothChannel(audio.centroid, clamp01(src.centroid ?? 0.3), 0.9, 0.5, delta);
    audio.flux = smoothChannel(audio.flux, clamp01(src.flux ?? 0), 12.0, 4.4, delta);
    audio.kick = smoothChannel(audio.kick, clamp01((src.kick ?? 0) * audioGain * bassGain), 16.0, 5.0, delta);
    audio.snare = smoothChannel(audio.snare, clamp01(src.snare ?? 0), 15.0, 5.0, delta);
    audio.highTransient = smoothChannel(audio.highTransient, clamp01((src.highTransient ?? 0) * audioGain * trebleGain), 18.0, 6.5, delta);
    audio.beat = smoothChannel(audio.beat, clamp01(src.beat ?? 0), 7.0, 3.0, delta);
    audio.pulse = smoothChannel(audio.pulse, clamp01(src.pulse ?? 0), 3.4, 1.4, delta);
    audio.trackProgress = smoothChannel(audio.trackProgress, clamp01(src.trackProgress ?? 0), 0.8, 0.8, delta);

    const time = state.clock.elapsedTime;
    const eventCursor = eventCursorRef.current;
    const kickAttack = Math.max(0, audio.kick - eventCursor.lastKick);
    const snareAttack = Math.max(0, audio.snare - eventCursor.lastSnare);
    eventCursor.lastKick = audio.kick;
    eventCursor.lastSnare = audio.snare;

    fieldOffset.current.x += delta * (0.85 + motionGain * 0.95 + audio.mid * 1.1 + audio.trackProgress * 0.45);
    fieldOffset.current.y += delta * (0.18 + Math.sin(time * 0.07) * 0.05 + audio.lowMid * 0.16);

    for (let index = 0; index < SOURCE_COUNT; index += 1) {
      const phase = index * 1.37;
      const trackOffset = audio.trackProgress * (index % 2 === 0 ? 1.8 : -1.4);
      sourceVectors[index].set(
        Math.sin(time * (0.043 + index * 0.006) + phase + trackOffset) * (34 + index * 8),
        Math.cos(time * (0.031 + index * 0.005) - phase * 0.8 - trackOffset * 0.6) * (22 + index * 9),
        2.8 + Math.sin(time * (0.09 + index * 0.013)) * 0.45 + audio.rms * 0.7 + (index % 3) * 0.28,
        index % 2 === 0 ? 1 : -1
      );
    }

    if (kickAttack > 0.03 && audio.kick > 0.12) {
      const index = eventCursor.radial % RADIAL_EVENT_COUNT;
      const source = sourceVectors[index % SOURCE_COUNT];
      const event = radialEventsRef.current[index];
      event.x = source.x;
      event.z = source.y;
      event.radius = 0;
      event.amplitude = (0.18 + audio.kick * 0.34 + audio.sub * 0.08) * deformGain;
      event.speed = (16 + audio.bass * 14) * (0.75 + motionGain * 0.5);
      event.active = true;
      eventCursor.radial += 1;
      cameraState.current.impulse = Math.max(cameraState.current.impulse, 0.12 + audio.kick * 0.38);
    }

    if (snareAttack > 0.02 && audio.snare > 0.08) {
      const index = eventCursor.shear % SHEAR_EVENT_COUNT;
      const angle = time * (0.24 + audio.mid * 0.4) + index * 0.8;
      const event = shearEventsRef.current[index];
      event.nx = Math.cos(angle);
      event.nz = Math.sin(angle);
      event.offset = -90;
      event.amplitude = (0.12 + audio.snare * 0.26 + audio.highTransient * 0.08) * deformGain;
      event.speed = (26 + audio.mid * 20) * (0.75 + motionGain * 0.5);
      event.active = true;
      eventCursor.shear += 1;
    }

    for (let index = 0; index < RADIAL_EVENT_COUNT; index += 1) {
      const event = radialEventsRef.current[index];
      const uniform = radialUniforms[index];
      if (!event.active) {
        uniform.set(0, 0, 9999, 0);
        continue;
      }
      event.radius += event.speed * delta;
      event.amplitude *= Math.exp(-delta * (1.3 - audio.rms * 0.4));
      if (event.radius > 240 || event.amplitude < 0.01) {
        event.active = false;
        uniform.set(0, 0, 9999, 0);
        continue;
      }
      uniform.set(event.x, event.z, event.radius, event.amplitude);
    }

    for (let index = 0; index < SHEAR_EVENT_COUNT; index += 1) {
      const event = shearEventsRef.current[index];
      const uniform = shearUniforms[index];
      if (!event.active) {
        uniform.set(1, 0, 9999, 0);
        continue;
      }
      event.offset += event.speed * delta;
      event.amplitude *= Math.exp(-delta * (1.7 - audio.rms * 0.3));
      if (event.offset > 140 || event.amplitude < 0.008) {
        event.active = false;
        uniform.set(1, 0, 9999, 0);
        continue;
      }
      uniform.set(event.nx, event.nz, event.offset, event.amplitude);
    }

    if (cameraRef.current) {
      const cam = cameraState.current;
      const aspect = state.size.width / Math.max(1, state.size.height);
      const portrait = aspect < 0.82 ? clamp01((0.82 - aspect) / 0.35) : 0;
      const ultraWide = aspect > 1.9 ? clamp01((aspect - 1.9) / 0.9) : 0;

      cam.impulse *= Math.exp(-delta * 6.8);
      const targetX = -0.6 + Math.sin(time * 0.022 + Math.sin(time * 0.011) * 0.35) * (3.2 + ultraWide * 1.1) + audio.mid * 0.35;
      const targetY = 5.0 + Math.sin(time * 0.018 + 1.4) * 0.45 + audio.sub * 0.3 + portrait * 1.0;
      const targetZ = 11.0 - cam.impulse - audio.bass * 0.5 - portrait * 1.2 + ultraWide * 1.1;
      const targetLookX = Math.sin(time * 0.012) * 3.2 + audio.mid * 0.4;
      const targetLookY = -2.1 + Math.sin(time * 0.011) * 0.18 + portrait * 0.2;
      const targetLookZ = -14.0 + Math.cos(time * 0.009) * 3.5;
      const targetFov = 46.0 - portrait * 4.0 + ultraWide * 1.4 - audio.sub * 0.18;

      cam.x = smoothChannel(cam.x, targetX, 0.8, 0.8, delta);
      cam.y = smoothChannel(cam.y, targetY, 0.8, 0.8, delta);
      cam.z = smoothChannel(cam.z, targetZ, 1.8, 1.8, delta);
      cam.lookX = smoothChannel(cam.lookX, targetLookX, 0.7, 0.7, delta);
      cam.lookY = smoothChannel(cam.lookY, targetLookY, 0.7, 0.7, delta);
      cam.fov = smoothChannel(cam.fov, targetFov, 1.2, 1.2, delta);

      cameraRef.current.position.set(cam.x, cam.y, cam.z);
      cameraRef.current.lookAt(cam.lookX, cam.lookY, cam.lookZ);
      cameraRef.current.fov = cam.fov;
      cameraRef.current.updateProjectionMatrix();
    }

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
    uniforms.uTrackProgress.value = audio.trackProgress;
  });

  return (
    <group>
      <color attach="background" args={["#01030a"]} />
      <fog attach="fog" args={["#060914", 34, 210]} />
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0.2, 5.0, 11.0]} fov={46} />

      <mesh ref={surfaceRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.2, 0]}>
        <planeGeometry args={[420, 420, quality.segments, quality.segments]} />
        <shaderMaterial uniforms={uniforms} vertexShader={FIELD_VERTEX} fragmentShader={FIELD_FRAGMENT} />
      </mesh>

      {DEBUG_ENERGY_FIELD ? (
        <mesh position={[0, 5, -12]}>
          <planeGeometry args={[5, 0.3, 1, 1]} />
          <meshBasicMaterial color="#6dd8ff" transparent opacity={0.65} />
        </mesh>
      ) : null}
    </group>
  );
}