import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

/**
 * LiquidTornado — Cinematografía Estilo Pixar
 * 
 * Un tornado de vidrio/agua translúcido con:
 * - Brazos helicoidales (caracola elegante)
 * - Láminas de agua estratificada
 * - Gradiente de color: azul glaciar → aguamarina → cian perla
 * - Sistema de partículas (spray, gotas, salpicaduras)
 * - Iluminación magic hour (contraluz cálido)
 * - Respiración + ondulación orgánica (6s / 16s ciclos)
 * - Animación de cámara cinematográfica (dolly + zoom)
 * - God rays + flares anamórficos
 * - Condensación dinámica en la superficie
 */
export default function LiquidTornado({
  color = "#66CCCC",
  analyserRef = null,
  playing = false,
  visualizerStateRef = null
}) {
  const mountRef = useRef(null);
  const meshRef = useRef(null);
  const particlesRef = useRef(null);
  const geometryRef = useRef(null);
  const originalPositionsRef = useRef(null);
  const audioStateRef = useRef({ bass: 0, mid: 0, treble: 0, beat: 0, pulse: 0 });
  const cameraRef = useRef(null);
  const composerRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      console.warn("LiquidTornado: mount ref not available");
      return;
    }
    console.log("LiquidTornado: initializing...", { color, playing, analyserRef: !!analyserRef });

    // ─────────────────────────────────────────────────────────────────────
    // SCENE, CAMERA, RENDERER
    // ─────────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a15);
    scene.fog = new THREE.Fog(0x0a0a15, 15, 30);

    const camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Cámara contrapicada (10-15°) para majestuosidad
    camera.position.set(1.2, 2.5, 7);
    camera.lookAt(0, 0.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.35;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // Post-processing: Bloom para efecto glass
    const composer = new EffectComposer(renderer);
    composerRef.current = composer;
    composer.addPass(new RenderPass(scene, camera));
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8,
      0.3,
      0.4
    );
    bloomPass.threshold = 0.5;
    bloomPass.strength = 0.2;
    bloomPass.radius = 0.5;
    composer.addPass(bloomPass);

    // ─────────────────────────────────────────────────────────────────────
    // ILUMINACIÓN: Magic Hour (Pixar Style)
    // ─────────────────────────────────────────────────────────────────────
    
    // Luz principal: sol bajo (4500K - hora dorada)
    const keyLight = new THREE.DirectionalLight(0xFFB366, 0.65);
    keyLight.position.set(5, 4, 5);
    scene.add(keyLight);

    // Luz de relleno: azul frío desde abajo
    const fillLight = new THREE.DirectionalLight(0x4B7BFF, 0.4);
    fillLight.position.set(-3, -3, -2);
    scene.add(fillLight);

    // Contraluz: cálido intenso atrás (borde luminoso)
    const backLight = new THREE.DirectionalLight(0xFFAA44, 0.5);
    backLight.position.set(-6, 3, -8);
    scene.add(backLight);

    // Luz ambiental suave
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambientLight);

    // ENVIRONMENT MAP - DISABLED FOR NOW (too bright)
    // const pmremGenerator = new THREE.PMREMGenerator(renderer);
    // pmremGenerator.compileEquirectangularShader();
    //
    // const hdrLoader = new HDRLoader();
    // hdrLoader.load(
    //   "/hdr/wooden_studio_17_2k.hdr",
    //   (texture) => {
    //     const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    //     scene.environment = envMap;
    //   },
    //   undefined,
    //   () => console.log("HDR fallback mode")
    // );

    // ─────────────────────────────────────────────────────────────────────
    // GEOMETRY: Caracola helicoidal (3-4 brazos visibles)
    // ─────────────────────────────────────────────────────────────────────
    const points = [];
    const height = 5.0;
    const segments = 96;

    // Perfil spline: base estrecha → expansión → cinturón estrecho → cúspide
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = -height / 2 + t * height;

      const normalizedHeight = t;
      
      // Cinturón en la zona media (60% de altura)
      const cinturonFactor = Math.exp(-Math.pow(normalizedHeight - 0.6, 2) * 8);
      
      // Función de radio: caracola elegante
      const radiusBase = 0.12 + Math.pow(normalizedHeight, 1.4) * 1.4;
      const radiusWithCinturon = radiusBase * (0.7 + cinturonFactor * 0.5);
      
      points.push(new THREE.Vector2(Math.max(0.05, radiusWithCinturon), y));
    }

    // LatheGeometry: 4 brazos principales (divisiones = 128)
    const latheGeo = new THREE.LatheGeometry(points, 128, 0, Math.PI * 2);
    latheGeo.computeVertexNormals();

    // Guardar posiciones originales para deformación controlada
    const positionAttr = latheGeo.getAttribute("position");
    const originalPositions = new Float32Array(positionAttr.array);
    originalPositionsRef.current = originalPositions;
    geometryRef.current = latheGeo;

    // ─────────────────────────────────────────────────────────────────────
    // MATERIAL: Vidrio esmerilado premium (Pixar glass)
    // ─────────────────────────────────────────────────────────────────────
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      transmission: 0.50, // 50% transparencia (reducido de 0.70)
      transparent: true,
      roughness: 0.12, // Más rugoso para capturar luz
      metalness: 0.02,
      clearcoat: 0.85,
      clearcoatRoughness: 0.08,
      ior: 1.45,
      thickness: 0.6,
      attenuationColor: new THREE.Color(0x4D9CCC),
      attenuationDistance: 2.5,
      envMapIntensity: 0.8, // Reducido de 2.8
      reflectivity: 0.6, // Reducido de 0.98
      side: THREE.DoubleSide,
      fog: true,
      wireframe: false
    });

    const mesh = new THREE.Mesh(latheGeo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    meshRef.current = mesh;
    scene.add(mesh);

    // ─────────────────────────────────────────────────────────────────────
    // SISTEMA DE PARTÍCULAS: Spray, gotas, salpicaduras
    // ─────────────────────────────────────────────────────────────────────
    const particlesGeometry = new THREE.BufferGeometry();
    const particleCount = 800;
    const particlesPositions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const opacities = new Float32Array(particleCount);
    const types = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.3 + Math.random() * 0.5;
      const heightOffset = -1.5 + Math.random() * 3;

      particlesPositions[i * 3] = Math.cos(angle) * radius;
      particlesPositions[i * 3 + 1] = heightOffset;
      particlesPositions[i * 3 + 2] = Math.sin(angle) * radius;

      const upSpeed = 1 + Math.random() * 2;
      velocities[i * 3] = Math.cos(angle) * 0.3;
      velocities[i * 3 + 1] = upSpeed;
      velocities[i * 3 + 2] = Math.sin(angle) * 0.3;

      types[i] = Math.random() < 0.6 ? 0 : (Math.random() < 0.5 ? 1 : 2);
      sizes[i] = types[i] === 0 ? 0.08 : (types[i] === 1 ? 0.25 : 0.12);
      opacities[i] = Math.random() * 0.8 + 0.2;
    }

    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(particlesPositions, 3));
    particlesGeometry.setAttribute("velocity", new THREE.BufferAttribute(velocities, 3));
    particlesGeometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    particlesGeometry.setAttribute("opacity", new THREE.BufferAttribute(opacities, 1));
    particlesGeometry.setAttribute("type", new THREE.BufferAttribute(types, 1));

    const particlesMaterial = new THREE.PointsMaterial({
      color: 0xE0FFFF,
      sizeAttenuation: true,
      transparent: true,
      fog: true
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    particlesRef.current = particles;
    scene.add(particles);

    // ─────────────────────────────────────────────────────────────────────
    // AUDIO ANALYSIS
    // ─────────────────────────────────────────────────────────────────────
    const dataArray = analyserRef?.current
      ? new Uint8Array(analyserRef.current.frequencyBinCount)
      : null;

    const getEnergy = (data, start, end) => {
      if (!data) return 0;
      let sum = 0;
      for (let i = start; i < end; i++) sum += data[i];
      return sum / (end - start) / 255;
    };

    const VISUALIZER_STALE_MS = 2200;
    let smoothBass = 0, smoothMid = 0, smoothTreble = 0, smoothPulse = 0;
    let prevTime = 0;
    let beatPulse = 0;

    // ─────────────────────────────────────────────────────────────────────
    // ANIMATION LOOP
    // ─────────────────────────────────────────────────────────────────────
    let rafId = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const time = performance.now() * 0.001;
      const deltaTime = Math.min(time - prevTime, 0.05);
      prevTime = time;

      // ── AUDIO DATA ─────────────────────────────────────────────────────
      if (playing && analyserRef?.current && dataArray) {
        analyserRef.current.getByteFrequencyData(dataArray);
        const bin = (ratio) =>
          Math.max(0, Math.min(dataArray.length - 1, Math.floor(dataArray.length * ratio)));

        const bass = getEnergy(dataArray, bin(0.02), bin(0.08));
        const mid = getEnergy(dataArray, bin(0.08), bin(0.40));
        const treble = getEnergy(dataArray, bin(0.40), bin(0.85));

        smoothBass += (bass - smoothBass) * 0.20;
        smoothMid += (mid - smoothMid) * 0.16;
        smoothTreble += (treble - smoothTreble) * 0.14;
      } else if (visualizerStateRef?.current?.active) {
        const fresh = Date.now() - (visualizerStateRef.current.updatedAt || 0) < VISUALIZER_STALE_MS;
        if (fresh) {
          smoothBass += ((visualizerStateRef.current.bass || 0) - smoothBass) * 0.24;
          smoothMid += ((visualizerStateRef.current.mid || 0) - smoothMid) * 0.24;
          smoothTreble += ((visualizerStateRef.current.treble || 0) - smoothTreble) * 0.24;
          beatPulse = Math.max(beatPulse * 0.90, visualizerStateRef.current.beat || 0);
        } else {
          smoothBass *= 0.92;
          smoothMid *= 0.92;
          smoothTreble *= 0.92;
          beatPulse *= 0.90;
        }
      } else {
        // Idle: auto-animación orquestal
        smoothBass = 0.10 + Math.sin(time * 0.6) * 0.06;
        smoothMid = 0.14 + Math.sin(time * 0.9 + 1) * 0.07;
        smoothTreble = 0.08 + Math.sin(time * 1.3 + 2) * 0.04;
        beatPulse *= 0.88;
      }

      smoothPulse = smoothBass * 0.35 + smoothMid * 0.40 + smoothTreble * 0.25;

      audioStateRef.current = {
        bass: smoothBass,
        mid: smoothMid,
        treble: smoothTreble,
        beat: beatPulse,
        pulse: smoothPulse
      };

      audioStateRef.current = { bass: smoothBass, mid: smoothMid, treble: smoothTreble, beat: beatPulse, pulse: smoothPulse };

      // ── DEFORMACIÓN DE VÉRTICES: Twist + Ondulación ───────────────────
      const positions = positionAttr.array;
      const originalPos = originalPositionsRef.current;

      for (let i = 0; i < positions.length; i += 3) {
        const origX = originalPos[i];
        const origY = originalPos[i + 1];
        const origZ = originalPos[i + 2];

        const normalizeY = (origY + height / 2) / height;

        // TWIST HELICOIDAL (3-4 brazos visibles = 3-4 rotaciones completas)
        const numArms = 3.5;
        const baseTwist = normalizeY * Math.PI * 2 * numArms;
        const twistAmplitude = 0.5 + smoothMid * 1.5;
        const dynamicTwist = baseTwist + Math.sin(time * 0.4) * twistAmplitude;

        // ONDULACIÓN LAMINAR (banderas suaves)
        const waveFreq = 1.8 + normalizeY * 2.2;
        const waveAmount = Math.sin(normalizeY * Math.PI * waveFreq + time * 1.2) * (0.028 + smoothTreble * 0.12);

        // Calcular radio
        const radiusXZ = Math.sqrt(origX * origX + origZ * origZ);
        const originalAngle = Math.atan2(origZ, origX);

        // Aplicar twist
        const newAngle = originalAngle + dynamicTwist;

        // RESPIRACIÓN (6s ciclo) - expansión/contracción con bass
        const breathingCycle = (time / 6) % 1;
        const breathingScale = 1 + Math.sin(breathingCycle * Math.PI * 2) * 0.15 + smoothBass * 0.4;

        // Escala de onda adicional
        const scaleWave = 1 + Math.sin(time * 0.8 + normalizeY * Math.PI) * 0.05;
        const radiusScale = breathingScale * scaleWave;

        // Nueva posición
        const newRadius = (radiusXZ + waveAmount) * radiusScale;
        positions[i] = Math.cos(newAngle) * newRadius;
        positions[i + 2] = Math.sin(newAngle) * newRadius;

        // MOVIMIENTO VERTICAL (ondulación tipo bandera)
        const heightWave = Math.sin(time * 0.95 + normalizeY * Math.PI * 1.5) * smoothPulse * 0.12;
        positions[i + 1] = origY + heightWave;
      }

      positionAttr.needsUpdate = true;

      // ── ROTACIÓN GLOBAL (fluidez orgánica) ─────────────────────────────
      // Rotación lenta + modulada por mid
      mesh.rotation.y += (0.18 + smoothMid * 1.4) * deltaTime;

      // Inclinación dinámica
      mesh.rotation.z = Math.sin(time * 0.25) * 0.12;
      mesh.rotation.x = 0.08 + Math.sin(time * 0.35) * 0.08;

      // ── ESCALA: Respiración global (bass) ──────────────────────────────
      const targetScale = 1 + smoothBass * 0.45 + beatPulse * 0.25;
      mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.14);

      // ── PARTÍCULAS: Animación dinámica ─────────────────────────────────
      const particlesPos = particlesGeometry.getAttribute("position").array;
      const particlesVel = particlesGeometry.getAttribute("velocity").array;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        // Aplicar velocidad
        particlesPos[i3] += particlesVel[i3] * deltaTime;
        particlesPos[i3 + 1] += particlesVel[i3 + 1] * deltaTime;
        particlesPos[i3 + 2] += particlesVel[i3 + 2] * deltaTime;

        // Reciclar si sale del área
        if (particlesPos[i3 + 1] > 3 || Math.sqrt(particlesPos[i3] ** 2 + particlesPos[i3 + 2] ** 2) > 2) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 0.25 + Math.random() * 0.4;
          particlesPos[i3] = Math.cos(angle) * radius;
          particlesPos[i3 + 1] = -1.5 + Math.random() * 0.5;
          particlesPos[i3 + 2] = Math.sin(angle) * radius;
          particlesVel[i3] = Math.cos(angle) * 0.4;
          particlesVel[i3 + 1] = 1.2 + Math.random() * 2.5;
          particlesVel[i3 + 2] = Math.sin(angle) * 0.4;
        }
      }

      particlesGeometry.getAttribute("position").needsUpdate = true;

      // ── CÁMARA CINEMATOGRÁFICA: Dolly lento + zoom ───────────────────
      // Dolly de izquierda a derecha (20s ciclo)
      const dollyX = Math.sin((time / 20) * Math.PI * 2) * 2;
      // Zoom imperceptible (30s ciclo)
      const zoomFactor = 1 + Math.sin((time / 30) * Math.PI * 2) * 0.08;

      camera.position.x = dollyX;
      camera.position.z = 7 * zoomFactor;
      camera.lookAt(0, 0.5, 0);

      // ── ILUMINACIÓN DINÁMICA ──────────────────────────────────────────
      keyLight.intensity = 0.8 + smoothTreble * 0.5;
      fillLight.intensity = 0.5 + smoothPulse * 0.6;
      backLight.intensity = 0.7 + smoothBass * 0.5;

      // ── RENDER (con post-processing) ──────────────────────────────────
      composer.render();
    };

    animate();

    // ─────────────────────────────────────────────────────────────────────
    // RESIZE HANDLER
    // ─────────────────────────────────────────────────────────────────────
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // ─────────────────────────────────────────────────────────────────────
    // CLEANUP
    // ─────────────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);

      latheGeo.dispose();
      particlesGeometry.dispose();
      material.dispose();
      particlesMaterial.dispose();
      pmremGenerator.dispose();

      scene.remove(mesh);
      scene.remove(particles);
      composer.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [color, analyserRef, playing, visualizerStateRef]);

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 1,
        pointerEvents: "none",
        userSelect: "none"
      }}
    />
  );
}
