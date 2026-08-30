import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

/**
 * LiquidVortex Component
 *
 * A clear, elegant funnel-shaped vortex with:
 * - Recognizable silhouette at all times
 * - Smooth, controlled deformations
 * - Liquid glass aesthetic (transmission: 1)
 * - Audio-reactive subtle effects
 * - No chaotic noise or blob deformation
 */
export default function LiquidVortex({ 
  color = "#8854ff", 
  analyserRef = null,
  playing = false,
  visualizerStateRef = null 
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const meshRef = useRef(null);
  const shaderUniforms = useRef({});
  const audioDataRef = useRef({ bass: 0, mid: 0, treble: 0, pulse: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ─────────────────────────────────────────────────────────────────────
    // SCENE SETUP
    // ─────────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // ─────────────────────────────────────────────────────────────────────
    // LIGHTING
    // ─────────────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = false;
    scene.add(directionalLight);

    const rimLight = new THREE.DirectionalLight(0x6655ff, 0.5);
    rimLight.position.set(-5, -3, -3);
    scene.add(rimLight);

    // ─────────────────────────────────────────────────────────────────────
    // GEOMETRY: LatheGeometry for smooth funnel shape
    // ─────────────────────────────────────────────────────────────────────
    const points = [];
    
    // Create funnel profile (curve that gets tighter downward)
    // y ranges from -3 to 3 (top to bottom)
    for (let i = 0; i <= 32; i++) {
      const t = i / 32; // 0 to 1
      const y = 3 - t * 6; // 3 to -3
      
      // Radius function: wide at top, narrow at bottom
      // Uses smooth bezier-like curve
      const normalizedY = (y + 3) / 6; // 0 to 1 (top to bottom)
      const radius = 1.2 + Math.pow(normalizedY, 1.8) * 1.8 - Math.pow(normalizedY, 2) * 0.6;
      
      // Add subtle initial wave for elegance
      const waveAmount = Math.sin(t * Math.PI) * 0.08;
      const smoothRadius = radius * (1 + waveAmount);
      
      points.push(new THREE.Vector2(smoothRadius, y));
    }

    const latheGeometry = new THREE.LatheGeometry(points, 64, 0, Math.PI * 2);
    latheGeometry.computeVertexNormals();

    // Store original positions for smooth deformation
    const positionAttribute = latheGeometry.getAttribute("position");
    const originalPositions = new Float32Array(positionAttribute.array);
    latheGeometry.userData.originalPositions = originalPositions;

    // ─────────────────────────────────────────────────────────────────────
    // MATERIAL: MeshPhysicalMaterial with liquid glass aesthetic
    // ─────────────────────────────────────────────────────────────────────
    const baseColor = new THREE.Color(color);
    
    const material = new THREE.MeshPhysicalMaterial({
      color: baseColor,
      transmission: 0.95, // 0 = opaque, 1 = glass
      roughness: 0.15,
      metalness: 0.25,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      ior: 1.45, // Refractive index for liquid
      thickness: 0.5,
      attenuationColor: baseColor,
      attenuationDistance: 2,
      envMapIntensity: 2.2,
      reflectivity: 0.95,
      side: THREE.DoubleSide,
      fog: false
    });

    const mesh = new THREE.Mesh(latheGeometry, material);
    mesh.rotation.x = 0.15; // Slight tilt for better view
    meshRef.current = mesh;
    scene.add(mesh);

    // ─────────────────────────────────────────────────────────────────────
    // ENVIRONMENT MAP (optional, adds realism)
    // ─────────────────────────────────────────────────────────────────────
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const hdrLoader = new RGBELoader();
    hdrLoader.load(
      "/hdr/wooden_studio_17_2k.hdr",
      (texture) => {
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        scene.environment = envMap;
      },
      undefined,
      () => {
        console.log("HDR load failed, continuing without env map");
      }
    );

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

    // ─────────────────────────────────────────────────────────────────────
    // ANIMATION LOOP
    // ─────────────────────────────────────────────────────────────────────
    let rafId = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const time = performance.now() * 0.001;
      const deltaTime = time - prevTime;
      prevTime = time;

      // ── Audio Analysis ────────────────────────────────────────────────
      if (playing && analyserRef?.current && dataArray) {
        analyserRef.current.getByteFrequencyData(dataArray);
        const bin = (ratio) =>
          Math.max(0, Math.min(dataArray.length - 1, Math.floor(dataArray.length * ratio)));

        const bass = getEnergy(dataArray, bin(0.02), bin(0.08));
        const mid = getEnergy(dataArray, bin(0.08), bin(0.4));
        const treble = getEnergy(dataArray, bin(0.4), bin(0.85));

        smoothBass += (bass - smoothBass) * 0.15;
        smoothMid += (mid - smoothMid) * 0.12;
        smoothTreble += (treble - smoothTreble) * 0.1;
      } else if (visualizerStateRef?.current?.active) {
        const fresh = Date.now() - (visualizerStateRef.current.updatedAt || 0) < VISUALIZER_STALE_MS;
        if (fresh) {
          smoothBass += ((visualizerStateRef.current.bass || 0) - smoothBass) * 0.2;
          smoothMid += ((visualizerStateRef.current.mid || 0) - smoothMid) * 0.2;
          smoothTreble += ((visualizerStateRef.current.treble || 0) - smoothTreble) * 0.2;
        } else {
          smoothBass *= 0.95;
          smoothMid *= 0.95;
          smoothTreble *= 0.95;
        }
      } else {
        smoothBass *= 0.93;
        smoothMid *= 0.93;
        smoothTreble *= 0.93;
      }

      smoothPulse = (smoothBass * 0.3 + smoothMid * 0.4 + smoothTreble * 0.3) * 0.8;
      audioDataRef.current = { bass: smoothBass, mid: smoothMid, treble: smoothTreble, pulse: smoothPulse };

      // ── Rotation ──────────────────────────────────────────────────────
      // Slow, smooth rotation around Y axis
      mesh.rotation.y += (0.15 + smoothBass * 0.5) * deltaTime;

      // ── Height-based twist deformation ─────────────────────────────────
      // Subtle helical twist proportional to audio, without breaking silhouette
      const positions = positionAttribute.array;
      const originalPos = latheGeometry.userData.originalPositions;

      for (let i = 0; i < positions.length; i += 3) {
        const origX = originalPos[i];
        const origY = originalPos[i + 1];
        const origZ = originalPos[i + 2];

        // Normalize Y to 0-1 range (bottom to top)
        const normalizedY = (origY + 3) / 6;

        // Twist angle: increases with height and pulses with bass
        const twistAmount = normalizedY * (0.3 + smoothMid * 0.6);
        const twistAngle = twistAmount + time * 0.5 + Math.sin(normalizedY * Math.PI) * smoothBass * 0.4;

        // Apply twist rotation while preserving radius (silhouette-safe)
        const radiusXZ = Math.sqrt(origX * origX + origZ * origZ);
        const angle = Math.atan2(origZ, origX);
        const newAngle = angle + twistAngle;

        // Radial breathing: subtly expands/contracts with pulse (treble responsive)
        const radiusScale = 1 + Math.sin(normalizedY * Math.PI + time * 1.5) * smoothTreble * 0.08;

        positions[i] = Math.cos(newAngle) * radiusXZ * radiusScale;
        positions[i + 1] = origY + Math.sin(time + normalizedY * Math.PI) * smoothPulse * 0.15;
        positions[i + 2] = Math.sin(newAngle) * radiusXZ * radiusScale;
      }

      positionAttribute.needsUpdate = true;

      // ── Scale and intensity response ──────────────────────────────────
      // Scale vortex uniformly with bass (gentle expansion/contraction)
      const scaleTarget = 1 + smoothBass * 0.35;
      mesh.scale.lerp(new THREE.Vector3(scaleTarget, scaleTarget, scaleTarget), 0.1);

      // ── Lighting intensity response ──────────────────────────────────
      directionalLight.intensity = 0.6 + smoothTreble * 0.4;
      rimLight.intensity = 0.3 + smoothPulse * 0.8;

      // ── Render ────────────────────────────────────────────────────────
      renderer.render(scene, camera);
    };

    animate();

    // ─────────────────────────────────────────────────────────────────────
    // HANDLE WINDOW RESIZE
    // ─────────────────────────────────────────────────────────────────────
    const onWindowResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", onWindowResize);

    // ─────────────────────────────────────────────────────────────────────
    // CLEANUP
    // ─────────────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onWindowResize);
      
      latheGeometry.dispose();
      material.dispose();
      pmremGenerator.dispose();
      
      scene.remove(mesh);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
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
