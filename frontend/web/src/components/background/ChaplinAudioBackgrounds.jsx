import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { usePlayer } from '../../context/PlayerContext';
import LiquidTornadoBackground from './liquidTornado/LiquidTornadoBackground';
import OceanHorizonBackground from './oceanHorizon/OceanHorizonBackground';
import GlassHourglassBackground from './glassHourglass/GlassHourglassBackground';
import CosmicTelescopeBackground from './cosmicTelescope/CosmicTelescopeBackground';
import { EnergyGridFloorField } from './cinematic/CinematicAudioBackgrounds';

export {
  NeuralWeb,
  AuroraSky,
  LiquidChromeWaves,
  RainfieldNeon,
  PlasmaSphere,
  DataTunnel,
  FractalBloom,
  NightVisionLandscape
} from './cinematic/CinematicAudioBackgrounds';

export function OceanHorizon() {
  return <OceanHorizonBackground />;
}

export function LiquidTornado() {
  return <LiquidTornadoBackground />;
}

export function GlassHourglass() {
  return <GlassHourglassBackground />;
}

export function CosmicTelescope() {
  return <CosmicTelescopeBackground />;
}

export function EnergyGridFloor() {
  return <EnergyGridFloorField />;
}

function LegacyNeuralWeb() {
  const { visualizerStateRef } = usePlayer();
  const nodesRef = useRef(null);
  const linesRef = useRef(null);
  const smoothed = useRef({ bass: 0, mid: 0, treble: 0, pulse: 0, beat: 0 });
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const baseNodes = useMemo(() => {
    const nodes = [];
    for (let index = 0; index < 180; index += 1) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const radius = 25 * Math.cbrt(Math.random());
      nodes.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * radius,
        Math.cos(phi) * radius,
        Math.sin(phi) * Math.sin(theta) * radius
      ));
    }
    return nodes;
  }, []);
  const linePositions = useMemo(() => {
    const result = [];
    for (let i = 0; i < baseNodes.length; i += 1) {
      for (let j = i + 1; j < baseNodes.length; j += 1) {
        if (baseNodes[i].distanceTo(baseNodes[j]) < 7) {
          result.push(baseNodes[i].x, baseNodes[i].y, baseNodes[i].z, baseNodes[j].x, baseNodes[j].y, baseNodes[j].z);
        }
      }
    }
    return new Float32Array(result);
  }, [baseNodes]);

  useEffect(() => {
    return () => {
      linesRef.current?.geometry?.dispose?.();
      linesRef.current?.material?.dispose?.();
      nodesRef.current?.geometry?.dispose?.();
      nodesRef.current?.material?.dispose?.();
    };
  }, []);

  useFrame((state) => {
    const audio = visualizerStateRef.current || {};
    smoothed.current.bass += ((audio.bass || 0) - smoothed.current.bass) * 0.1;
    smoothed.current.mid += ((audio.mid || 0) - smoothed.current.mid) * 0.1;
    smoothed.current.treble += ((audio.treble || 0) - smoothed.current.treble) * 0.1;
    smoothed.current.pulse += ((audio.pulse || 0) - smoothed.current.pulse) * 0.1;
    smoothed.current.beat += ((audio.beat || 0) - smoothed.current.beat) * 0.1;

    const ease = (value) => {
      const t = THREE.MathUtils.clamp(value, 0, 1);
      return t * t * (3 - 2 * t);
    };
    const midEase = ease(smoothed.current.mid);
    const trebleEase = ease(smoothed.current.treble);
    const pulseEase = ease(smoothed.current.pulse);

    const jitterAmp = midEase * 0.45;
    if (nodesRef.current) {
      for (let index = 0; index < baseNodes.length; index += 1) {
        const point = baseNodes[index];
        const lag = (index / baseNodes.length) * 0.5;
        dummy.position.set(
          point.x + Math.sin(state.clock.elapsedTime * 0.8 + index - lag) * jitterAmp,
          point.y + Math.cos(state.clock.elapsedTime * 0.7 + index * 0.4 + lag) * jitterAmp,
          point.z + Math.sin(state.clock.elapsedTime * 0.9 + index * 0.7 - lag * 0.8) * jitterAmp
        );
        dummy.scale.setScalar(1 + pulseEase * 0.9);
        dummy.updateMatrix();
        nodesRef.current.setMatrixAt(index, dummy.matrix);
      }
      nodesRef.current.instanceMatrix.needsUpdate = true;
    }

    if (linesRef.current?.material) {
      linesRef.current.material.opacity = 0.08 + trebleEase * 0.4 + pulseEase * 0.22;
    }
  });

  return (
    <group>
      <PerspectiveCamera makeDefault position={[0, 0, 48]} />
      <instancedMesh ref={nodesRef} args={[null, null, 180]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="#8bfaff" />
      </instancedMesh>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#86d8ff" transparent opacity={0.12} />
      </lineSegments>
    </group>
  );
}

function LegacyAuroraSky() {
  const { visualizerStateRef } = usePlayer();
  const materialRef = useRef(null);
  const smoothed = useRef({ bass: 0, mid: 0, treble: 0, pulse: 0, beat: 0 });

  useEffect(() => {
    return () => materialRef.current?.dispose?.();
  }, []);

  useFrame((state) => {
    const audio = visualizerStateRef.current || {};
    smoothed.current.bass += ((audio.bass || 0) - smoothed.current.bass) * 0.1;
    smoothed.current.mid += ((audio.mid || 0) - smoothed.current.mid) * 0.1;
    smoothed.current.treble += ((audio.treble || 0) - smoothed.current.treble) * 0.1;
    smoothed.current.pulse += ((audio.pulse || 0) - smoothed.current.pulse) * 0.1;
    smoothed.current.beat += ((audio.beat || 0) - smoothed.current.beat) * 0.1;

    const ease = (value) => {
      const t = THREE.MathUtils.clamp(value, 0, 1);
      return t * t * (3 - 2 * t);
    };
    if (materialRef.current?.uniforms) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uMid.value = ease(smoothed.current.mid);
      materialRef.current.uniforms.uPulse.value = ease(smoothed.current.pulse);
      materialRef.current.uniforms.uTreble.value = ease(smoothed.current.treble);
    }
  });

  return (
    <group>
      <PerspectiveCamera makeDefault position={[0, 0, 80]} />
      <mesh>
        <planeGeometry args={[400, 200, 1, 1]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={{ uTime: { value: 0 }, uMid: { value: 0 }, uPulse: { value: 0 }, uTreble: { value: 0 } }}
          vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
          fragmentShader={`uniform float uTime; uniform float uMid; uniform float uPulse; uniform float uTreble; varying vec2 vUv; float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); } float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y); } float fbm(vec2 p){ float value = 0.0; float amp = 0.5; for(int i=0;i<5;i++){ value += noise(p) * amp; p *= 2.0; amp *= 0.5; } return value; } void main(){ vec2 uv = vUv * vec2(2.4, 1.5); float speed = 0.1 + uMid * 0.8; float detail = 1.0 + uTreble * 1.6; float n = fbm(uv * detail + vec2(uTime * speed, -uTime * speed * 0.4)); float band = smoothstep(0.25, 0.95, n + sin(uv.x * 4.0 + uTime) * 0.1); vec3 green = vec3(0.06, 0.88, 0.48); vec3 blue = vec3(0.08, 0.44, 0.95); vec3 violet = vec3(0.45, 0.18, 0.92); vec3 color = mix(green, blue, band); color = mix(color, violet, smoothstep(0.55, 1.0, band)); color *= 0.55 + uPulse * 0.95; gl_FragColor = vec4(color, 1.0); }`}
        />
      </mesh>
    </group>
  );
}

function LegacyLiquidChromeWaves() {
  const { visualizerStateRef } = usePlayer();
  const planeRef = useRef(null);
  const smoothed = useRef({ bass: 0, mid: 0, treble: 0, pulse: 0, beat: 0 });
  const basePositions = useRef(null);

  useEffect(() => {
    return () => {
      planeRef.current?.geometry?.dispose?.();
      planeRef.current?.material?.dispose?.();
    };
  }, []);

  useFrame((state) => {
    const audio = visualizerStateRef.current || {};
    smoothed.current.bass += ((audio.bass || 0) - smoothed.current.bass) * 0.1;
    smoothed.current.mid += ((audio.mid || 0) - smoothed.current.mid) * 0.1;
    smoothed.current.treble += ((audio.treble || 0) - smoothed.current.treble) * 0.1;
    smoothed.current.pulse += ((audio.pulse || 0) - smoothed.current.pulse) * 0.1;
    smoothed.current.beat += ((audio.beat || 0) - smoothed.current.beat) * 0.1;

    const ease = (value) => Math.pow(THREE.MathUtils.clamp(value ?? 0, 0, 1), 0.75);
    const bassEase = ease(smoothed.current.bass);
    const midEase = ease(smoothed.current.mid);
    const trebleEase = ease(smoothed.current.treble);
    const pulseEase = ease(smoothed.current.pulse);

    const geometry = planeRef.current?.geometry;
    const positions = geometry?.attributes?.position;
    if (positions && !basePositions.current) {
      basePositions.current = positions.array.slice();
    }

    if (positions && basePositions.current) {
      const time = state.clock.elapsedTime;
      const amplitude = 0.8 + bassEase * 5.0;
      const speed = 0.4 + midEase * 2.2;
      const detail = 1.0 + trebleEase * 2.6;
      for (let index = 0; index < positions.count; index += 1) {
        const offset = index * 3;
        const x = basePositions.current[offset];
        const y = basePositions.current[offset + 1];
        const lag = Math.sin((x - y) * 0.015) * 0.22;
        positions.array[offset + 2] =
          Math.sin(x * 0.08 * detail + time * speed - lag) * amplitude +
          Math.cos(y * 0.06 * detail - time * speed * 0.8 + lag * 0.7) * amplitude * 0.4;
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
    }

    if (planeRef.current?.material) {
      planeRef.current.material.envMapIntensity = 1.1 + pulseEase * 0.9;
    }
  });

  return (
    <group>
      <PerspectiveCamera makeDefault position={[0, 0, 50]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[8, 10, 10]} intensity={2.5} />
      <Environment preset="warehouse" />
      <mesh ref={planeRef} rotation={[-0.4, 0, 0]}>
        <planeGeometry args={[150, 150, 128, 128]} />
        <meshStandardMaterial color="#d6ecff" metalness={1} roughness={0.1} />
      </mesh>
    </group>
  );
}

function LegacyRainfieldNeon() {
  const { visualizerStateRef } = usePlayer();
  const rainRef = useRef(null);
  const materialRef = useRef(null);
  const smoothed = useRef({ bass: 0, mid: 0, treble: 0, pulse: 0, beat: 0 });
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const drops = useMemo(() => {
    return Array.from({ length: 8000 }, () => ({
      x: (Math.random() - 0.5) * 120,
      y: Math.random() * 100 - 20,
      z: (Math.random() - 0.5) * 120,
      length: 0.8
    }));
  }, []);

  useEffect(() => {
    return () => {
      rainRef.current?.geometry?.dispose?.();
      materialRef.current?.dispose?.();
    };
  }, []);

  useFrame((state, delta) => {
    const audio = visualizerStateRef.current || {};
    smoothed.current.bass += ((audio.bass || 0) - smoothed.current.bass) * 0.1;
    smoothed.current.mid += ((audio.mid || 0) - smoothed.current.mid) * 0.1;
    smoothed.current.treble += ((audio.treble || 0) - smoothed.current.treble) * 0.1;
    smoothed.current.pulse += ((audio.pulse || 0) - smoothed.current.pulse) * 0.1;
    smoothed.current.beat += ((audio.beat || 0) - smoothed.current.beat) * 0.1;

    const ease = (value) => {
      const t = THREE.MathUtils.clamp(value, 0, 1);
      return t * t * (3 - 2 * t);
    };
    const bassEase = ease(smoothed.current.bass);
    const trebleEase = ease(smoothed.current.treble);
    const beatEase = ease(smoothed.current.beat);

    const speed = 25 + bassEase * 30;
    const density = 0.3 + trebleEase * 1.2;
    for (let index = 0; index < drops.length; index += 1) {
      const drop = drops[index];
      drop.y -= speed * delta;
      if (drop.y < -30) {
        drop.y = 70 + Math.random() * 30;
        drop.x = (Math.random() - 0.5) * 120 * density;
        drop.z = (Math.random() - 0.5) * 120 * density;
      }
      dummy.position.set(drop.x, drop.y, drop.z);
      dummy.scale.set(1, drop.length, 1);
      dummy.updateMatrix();
      rainRef.current.setMatrixAt(index, dummy.matrix);
    }
    rainRef.current.instanceMatrix.needsUpdate = true;

    if (materialRef.current) {
      materialRef.current.color.set(beatEase > 0.75 ? '#ffffff' : '#00f6ff');
      materialRef.current.emissiveIntensity = 0.9 + trebleEase * 0.9;
    }
  });

  return (
    <group>
      <PerspectiveCamera makeDefault position={[0, 6, 34]} />
      <instancedMesh ref={rainRef} args={[null, null, 8000]}>
        <boxGeometry args={[0.03, 0.8, 0.03]} />
        <meshStandardMaterial ref={materialRef} color="#00f6ff" emissive="#00f6ff" emissiveIntensity={1.1} transparent opacity={0.8} />
      </instancedMesh>
    </group>
  );
}

function LegacyPlasmaSphere() {
  const { visualizerStateRef } = usePlayer();
  const materialRef = useRef(null);
  const groupRef = useRef(null);
  const smoothed = useRef({ bass: 0, mid: 0, treble: 0, pulse: 0, beat: 0 });

  useEffect(() => {
    return () => materialRef.current?.dispose?.();
  }, []);

  useFrame((state) => {
    const audio = visualizerStateRef.current || {};
    smoothed.current.bass += ((audio.bass || 0) - smoothed.current.bass) * 0.1;
    smoothed.current.mid += ((audio.mid || 0) - smoothed.current.mid) * 0.1;
    smoothed.current.treble += ((audio.treble || 0) - smoothed.current.treble) * 0.1;
    smoothed.current.pulse += ((audio.pulse || 0) - smoothed.current.pulse) * 0.1;
    smoothed.current.beat += ((audio.beat || 0) - smoothed.current.beat) * 0.1;

    const ease = (value) => {
      const t = THREE.MathUtils.clamp(value, 0, 1);
      return t * t * (3 - 2 * t);
    };
    const bassEase = ease(smoothed.current.bass);
    const pulseEase = ease(smoothed.current.pulse);
    const trebleEase = ease(smoothed.current.treble);
    if (materialRef.current?.uniforms) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uPulse.value = pulseEase;
      materialRef.current.uniforms.uTreble.value = trebleEase;
    }
    if (groupRef.current) {
      const scale = THREE.MathUtils.lerp(6, 7, bassEase) / 6;
      groupRef.current.scale.setScalar(scale);
      groupRef.current.rotation.y += 0.004 + trebleEase * 0.004;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.45) * (0.03 + pulseEase * 0.05);
    }
  });

  return (
    <group ref={groupRef}>
      <PerspectiveCamera makeDefault position={[0, 0, 22]} />
      <mesh>
        <sphereGeometry args={[6, 128, 128]} />
        <shaderMaterial
          ref={materialRef}
          transparent
          uniforms={{ uTime: { value: 0 }, uPulse: { value: 0 }, uTreble: { value: 0 } }}
          vertexShader={`varying vec3 vNormal; varying vec3 vWorld; void main(){ vNormal = normalize(normalMatrix * normal); vec4 worldPos = modelMatrix * vec4(position, 1.0); vWorld = worldPos.xyz; gl_Position = projectionMatrix * viewMatrix * worldPos; }`}
          fragmentShader={`uniform float uTime; uniform float uPulse; uniform float uTreble; varying vec3 vNormal; varying vec3 vWorld; float hash(vec3 p){ return fract(sin(dot(p, vec3(17.1, 31.7, 47.2))) * 43758.5453); } float noise(vec3 p){ vec3 i = floor(p); vec3 f = fract(p); f = f*f*(3.0-2.0*f); float n000 = hash(i); float n100 = hash(i+vec3(1,0,0)); float n010 = hash(i+vec3(0,1,0)); float n110 = hash(i+vec3(1,1,0)); float n001 = hash(i+vec3(0,0,1)); float n101 = hash(i+vec3(1,0,1)); float n011 = hash(i+vec3(0,1,1)); float n111 = hash(i+vec3(1,1,1)); float nx00 = mix(n000, n100, f.x); float nx10 = mix(n010, n110, f.x); float nx01 = mix(n001, n101, f.x); float nx11 = mix(n011, n111, f.x); float nxy0 = mix(nx00, nx10, f.y); float nxy1 = mix(nx01, nx11, f.y); return mix(nxy0, nxy1, f.z); } void main(){ float turbulence = noise(vWorld * (0.35 + uTreble * 0.6) + uTime * 0.4); float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(-vWorld))), 2.0); vec3 color = mix(vec3(0.07, 0.2, 0.95), vec3(0.82, 0.1, 1.0), turbulence); color += fresnel * (0.3 + uPulse * 1.4); gl_FragColor = vec4(color, 0.92); }`}
        />
      </mesh>
    </group>
  );
}

function LegacyDataTunnel() {
  const { visualizerStateRef } = usePlayer();
  const tunnelRef = useRef(null);
  const cameraRef = useRef(null);
  const materialRef = useRef(null);
  const smoothed = useRef({ bass: 0, mid: 0, treble: 0, pulse: 0, beat: 0 });
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const cubes = useMemo(() => {
    return Array.from({ length: 3000 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 12 + (Math.random() - 0.5) * 1.6;
      return {
        angle,
        radius,
        z: -Math.random() * 300,
        scale: 0.15 + Math.random() * 0.22
      };
    });
  }, []);

  useEffect(() => {
    return () => {
      tunnelRef.current?.geometry?.dispose?.();
      materialRef.current?.dispose?.();
    };
  }, []);

  useFrame((state, delta) => {
    const audio = visualizerStateRef.current || {};
    smoothed.current.bass += ((audio.bass || 0) - smoothed.current.bass) * 0.1;
    smoothed.current.mid += ((audio.mid || 0) - smoothed.current.mid) * 0.1;
    smoothed.current.treble += ((audio.treble || 0) - smoothed.current.treble) * 0.1;
    smoothed.current.pulse += ((audio.pulse || 0) - smoothed.current.pulse) * 0.1;
    smoothed.current.beat += ((audio.beat || 0) - smoothed.current.beat) * 0.1;

    const ease = (value) => {
      const t = THREE.MathUtils.clamp(value, 0, 1);
      return t * t * (3 - 2 * t);
    };
    const bassEase = ease(smoothed.current.bass);
    const midEase = ease(smoothed.current.mid);
    const beatEase = ease(smoothed.current.beat);

    const speed = 24 + bassEase * 64;
    const distortion = midEase * 1.8;
    for (let index = 0; index < cubes.length; index += 1) {
      const cube = cubes[index];
      cube.z += speed * delta;
      if (cube.z > 18) cube.z = -300;
      const angle = cube.angle + Math.sin(state.clock.elapsedTime + cube.z * 0.02) * distortion * 0.08;
      dummy.position.set(Math.cos(angle) * cube.radius, Math.sin(angle) * cube.radius, cube.z);
      dummy.rotation.set(angle, angle, angle * 0.3);
      dummy.scale.setScalar(cube.scale + beatEase * 0.06);
      dummy.updateMatrix();
      tunnelRef.current.setMatrixAt(index, dummy.matrix);
    }
    tunnelRef.current.instanceMatrix.needsUpdate = true;

    if (cameraRef.current) {
      cameraRef.current.position.z = 10 - ease(smoothed.current.pulse) * 1.8;
    }
    if (materialRef.current) {
      materialRef.current.color.set(beatEase > 0.72 ? '#f8ffff' : '#6fe2ff');
      materialRef.current.emissiveIntensity = 0.45 + beatEase * 1.4;
    }
  });

  return (
    <group>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 10]} />
      <instancedMesh ref={tunnelRef} args={[null, null, 3000]}>
        <boxGeometry args={[0.26, 0.26, 0.26]} />
        <meshStandardMaterial ref={materialRef} color="#6fe2ff" emissive="#6fe2ff" emissiveIntensity={0.8} metalness={0.4} roughness={0.2} />
      </instancedMesh>
    </group>
  );
}

function LegacyFractalBloom() {
  const { visualizerStateRef } = usePlayer();
  const bloomRef = useRef(null);
  const petalsRef = useRef(null);
  const coreRef = useRef(null);
  const materialRef = useRef(null);
  const petalMaterialRef = useRef(null);
  const smoothed = useRef({ bass: 0, mid: 0, treble: 0, pulse: 0, beat: 0 });
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const rings = useMemo(() => {
    return Array.from({ length: 800 }, (_, index) => ({
      angle: (index / 800) * Math.PI * 2,
      radius: Math.pow(index / 800, 1.7) * 18,
      scale: 0.08 + (index / 800) * 0.28
    }));
  }, []);

  const petals = useMemo(() => {
    return Array.from({ length: 220 }, (_, index) => ({
      angle: (index / 220) * Math.PI * 2,
      band: index % 11,
      radius: 4.0 + (index % 22) * 0.52,
      scale: 0.42 + (index % 8) * 0.06
    }));
  }, []);

  useEffect(() => {
    return () => {
      bloomRef.current?.geometry?.dispose?.();
      materialRef.current?.dispose?.();
      petalsRef.current?.geometry?.dispose?.();
      petalMaterialRef.current?.dispose?.();
      coreRef.current?.geometry?.dispose?.();
      coreRef.current?.material?.dispose?.();
    };
  }, []);

  useFrame((state) => {
    const audio = visualizerStateRef.current || {};
    smoothed.current.bass += ((audio.bass || 0) - smoothed.current.bass) * 0.1;
    smoothed.current.mid += ((audio.mid || 0) - smoothed.current.mid) * 0.1;
    smoothed.current.treble += ((audio.treble || 0) - smoothed.current.treble) * 0.1;
    smoothed.current.pulse += ((audio.pulse || 0) - smoothed.current.pulse) * 0.1;
    smoothed.current.beat += ((audio.beat || 0) - smoothed.current.beat) * 0.1;

    const ease = (value) => {
      const clamped = THREE.MathUtils.clamp(value, 0, 1);
      return clamped * clamped * (3 - 2 * clamped);
    };

    const bassEase = ease(smoothed.current.bass);
    const midEase = ease(smoothed.current.mid);
    const trebleEase = ease(smoothed.current.treble);
    const pulseEase = ease(smoothed.current.pulse);
    const beatEase = ease(smoothed.current.beat);

    const expansion = 1 + pulseEase * 1.2;
    const globalSize = 1 + bassEase * 0.48;
    const time = state.clock.elapsedTime;

    for (let index = 0; index < rings.length; index += 1) {
      const ring = rings[index];
      const bloomBand = index / rings.length;
      const lag = bloomBand * 0.16;
      const phase = time * (0.12 + midEase * 0.35) + ring.angle + index * 0.0015;
      const radialBreath = 1 + Math.sin(time * 0.85 - lag * 6.0) * (0.05 + pulseEase * 0.12);
      const radius = ring.radius * expansion * radialBreath;
      const swirl = Math.sin(phase * 1.7) * (0.02 + trebleEase * 0.09);
      const zLayer = Math.sin(phase * 0.7 + lag * 9.0) * (0.4 + beatEase * 1.1);

      dummy.position.set(Math.cos(phase) * radius, Math.sin(phase) * radius, zLayer);
      dummy.rotation.set(0, 0, phase * (1.0 + trebleEase * 1.4) + swirl);
      dummy.scale.setScalar((ring.scale + trebleEase * 0.13 + pulseEase * 0.08) * globalSize);
      dummy.updateMatrix();
      bloomRef.current.setMatrixAt(index, dummy.matrix);
    }
    bloomRef.current.instanceMatrix.needsUpdate = true;

    if (petalsRef.current) {
      for (let index = 0; index < petals.length; index += 1) {
        const petal = petals[index];
        const bandNorm = petal.band / 10;
        const lag = bandNorm * 0.22;
        const baseA = petal.angle + time * (0.06 + midEase * 0.24);
        const radius = petal.radius * (1 + pulseEase * 0.38 + Math.sin(time * 0.7 - lag * 8.0) * 0.04);
        const flap = Math.sin(time * (1.4 + trebleEase * 2.0) + index * 0.23) * (0.04 + trebleEase * 0.12);
        dummy.position.set(Math.cos(baseA) * radius, Math.sin(baseA) * radius, -1.8 + bandNorm * 3.2 + flap * 3.5);
        dummy.rotation.set(0, 0, baseA + Math.PI * 0.5 + flap);
        dummy.scale.set(petal.scale * (1 + bassEase * 0.25), petal.scale * (0.58 + pulseEase * 0.34), 1);
        dummy.updateMatrix();
        petalsRef.current.setMatrixAt(index, dummy.matrix);
      }
      petalsRef.current.instanceMatrix.needsUpdate = true;
    }

    if (materialRef.current) {
      materialRef.current.opacity = 0.22 + pulseEase * 0.34;
      materialRef.current.color.setRGB(
        0.72 + pulseEase * 0.18,
        0.42 + trebleEase * 0.2,
        0.95
      );
    }

    if (petalMaterialRef.current) {
      petalMaterialRef.current.opacity = 0.16 + pulseEase * 0.22;
    }

    if (coreRef.current?.material) {
      coreRef.current.scale.setScalar(1 + bassEase * 0.15 + beatEase * 0.09);
      coreRef.current.material.opacity = 0.22 + pulseEase * 0.3;
    }
  });

  return (
    <group>
      <PerspectiveCamera makeDefault position={[0, 0, 36]} />
      <ambientLight intensity={0.24} color="#dca8ff" />
      <pointLight position={[0, 0, 10]} intensity={1.3} distance={55} color="#ffc8ff" />
      <pointLight position={[8, -6, 6]} intensity={0.9} distance={45} color="#7ccfff" />

      <mesh ref={coreRef}>
        <sphereGeometry args={[2.4, 48, 48]} />
        <meshBasicMaterial color="#ffd0ff" transparent opacity={0.26} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <instancedMesh ref={bloomRef} args={[null, null, 800]}>
        <ringGeometry args={[0.68, 1, 24]} />
        <meshBasicMaterial ref={materialRef} color="#ff6dff" transparent opacity={0.34} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>

      <instancedMesh ref={petalsRef} args={[null, null, 220]}>
        <planeGeometry args={[1.0, 0.44, 1, 1]} />
        <meshBasicMaterial ref={petalMaterialRef} color="#8edfff" transparent opacity={0.24} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

function LegacyNightVisionLandscape() {
  const { visualizerStateRef } = usePlayer();
  const materialRef = useRef(null);
  const hazeRef = useRef(null);
  const smoothed = useRef({ bass: 0, mid: 0, treble: 0, pulse: 0, beat: 0 });

  useEffect(() => {
    return () => {
      materialRef.current?.dispose?.();
      hazeRef.current?.dispose?.();
    };
  }, []);

  useFrame((state) => {
    const audio = visualizerStateRef.current || {};
    smoothed.current.bass += ((audio.bass || 0) - smoothed.current.bass) * 0.1;
    smoothed.current.mid += ((audio.mid || 0) - smoothed.current.mid) * 0.1;
    smoothed.current.treble += ((audio.treble || 0) - smoothed.current.treble) * 0.1;
    smoothed.current.pulse += ((audio.pulse || 0) - smoothed.current.pulse) * 0.1;
    smoothed.current.beat += ((audio.beat || 0) - smoothed.current.beat) * 0.1;

    if (materialRef.current?.uniforms) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uBass.value = smoothed.current.bass;
      materialRef.current.uniforms.uMid.value = smoothed.current.mid;
      materialRef.current.uniforms.uPulse.value = smoothed.current.pulse;
      materialRef.current.uniforms.uTreble.value = smoothed.current.treble;
    }

    if (hazeRef.current?.uniforms) {
      hazeRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      hazeRef.current.uniforms.uPulse.value = smoothed.current.pulse;
    }
  });

  return (
    <group>
      <PerspectiveCamera makeDefault position={[0, 18, 36]} rotation={[-0.52, 0, 0]} />
      <ambientLight intensity={0.18} color="#6effb8" />
      <directionalLight position={[20, 30, 12]} intensity={0.85} color="#9affd0" />

      <mesh position={[0, 26, -24]}>
        <planeGeometry args={[280, 120, 1, 1]} />
        <shaderMaterial
          ref={hazeRef}
          transparent
          depthWrite={false}
          uniforms={{ uTime: { value: 0 }, uPulse: { value: 0 } }}
          vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
          fragmentShader={`uniform float uTime; uniform float uPulse; varying vec2 vUv; float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); } float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y); } void main(){ vec2 uv = vUv * vec2(2.2, 1.4); float n = noise(uv + vec2(uTime*0.05, -uTime*0.03)); float glow = smoothstep(0.35, 0.9, n) * (0.16 + uPulse * 0.24); vec3 col = vec3(0.06, 0.95, 0.55) * glow; gl_FragColor = vec4(col, glow); }`}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[300, 300, 256, 256]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={{ uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uPulse: { value: 0 }, uTreble: { value: 0 } }}
          vertexShader={`uniform float uTime; uniform float uBass; varying vec2 vUv; varying float vHeight; varying float vFog; float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); } float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y); } float fbm(vec2 p){ float v = 0.0; float a = 0.5; for(int i=0;i<4;i++){ v += noise(p) * a; p *= 2.0; a *= 0.5; } return v; } void main(){ vUv = uv; vec3 p = position; float t = uTime * 0.045; float n = fbm(p.xz * 0.06 + vec2(t, -t * 0.3)); float ridges = abs(noise(p.xz * 0.11 - t) - 0.5) * 2.0; float height = (n * 0.72 + ridges * 0.28) * mix(1.2, 8.8, uBass); p.y += height; vHeight = height; vFog = smoothstep(18.0, 130.0, length(p.xz)); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`}
          fragmentShader={`uniform float uTime; uniform float uMid; uniform float uPulse; uniform float uTreble; varying vec2 vUv; varying float vHeight; varying float vFog; void main(){ float scanA = sin(vUv.y * 360.0 + uTime * (6.0 + uMid * 9.0)) * 0.045 + 0.955; float scanB = sin(vUv.y * 980.0 + uTime * (2.8 + uTreble * 12.0)) * 0.018 + 0.982; float horizon = smoothstep(0.1, 0.72, 1.0 - vUv.y); float glow = 0.24 + uPulse * 0.62 + vHeight * 0.03; vec3 night = vec3(0.005, 0.03, 0.015); vec3 phosphor = vec3(0.0, 1.0, 0.53) * glow * scanA * scanB; vec3 rim = vec3(0.5, 1.0, 0.75) * smoothstep(2.6, 7.0, vHeight) * 0.22; vec3 color = mix(night, phosphor + rim, horizon); color = mix(color, night, vFog * 0.45); gl_FragColor = vec4(color, 1.0); }`}
        />
      </mesh>
    </group>
  );
}