import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { usePlayer } from "../../context/PlayerContext";
import { useVortex } from "../../context/VortexContext";

export default function ChromedVortexThree() {
  const mountRef = useRef(null);
  const [restoreKey, setRestoreKey] = useState(0);
  const { analyserRef, playing, sessionPlaying, visualizerStateRef } = usePlayer();
  const {
    vortexColor,
    finishType,
    backgroundStyle,
    animationEnabled,
    reactivity,
    deformIntensity,
    motionIntensity,
    bassBoost,
    trebleBoost
  } = useVortex();

  const animationSettingsRef = useRef({
    animationEnabled,
    reactivity,
    deformIntensity,
    motionIntensity,
    bassBoost,
    trebleBoost
  });
  const playbackStateRef = useRef({
    playing,
    sessionPlaying
  });

  useEffect(() => {
    animationSettingsRef.current = {
      animationEnabled,
      reactivity,
      deformIntensity,
      motionIntensity,
      bassBoost,
      trebleBoost
    };
  }, [animationEnabled, reactivity, deformIntensity, motionIntensity, bassBoost, trebleBoost]);

  useEffect(() => {
    playbackStateRef.current = {
      playing,
      sessionPlaying
    };
  }, [playing, sessionPlaying]);

  const baseColor = vortexColor;
  const VISUALIZER_STALE_MS = 2200;

  const createTimeTracker = () => {
    const clock = new THREE.Clock();
    return () => clock.getElapsedTime();
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = false;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x888888, 0.4);
    fillLight.position.set(-5, -5, -5);
    scene.add(fillLight);

    const camera = new THREE.PerspectiveCamera(
      40,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 8);

    if (backgroundStyle === "lavaLamp" || backgroundStyle === "lava") {
      camera.position.set(0, 0.05, 6.4);
    }

    if (backgroundStyle === "rain") {
      camera.position.set(0, 0.15, 6.2);
    }

    if (backgroundStyle === "aeroHalo") {
      camera.position.set(0, 0.0, 7.2);
    }

    if (backgroundStyle === "fluidCurtain") {
      camera.position.set(0, 0.0, 7.0);
    }

    // Render at 60% of screen — canvas scales up via CSS (~2.8x fewer pixels to shade)
    const RENDER_SCALE = 0.6;
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(Math.floor(window.innerWidth * RENDER_SCALE), Math.floor(window.innerHeight * RENDER_SCALE));
    renderer.setPixelRatio(1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    // WebGL resilience: a lost context (GPU reset, driver crash, tab backgrounded
    // on some mobile browsers) must not keep calling render on a dead context, and
    // must not take the rest of Chaplin down with it. We don't try to resume the
    // existing renderer/composer mid-state — on restore we tear down and rebuild
    // the whole scene from scratch via `restoreKey`, which is simpler and safer
    // than patching a half-dead Three.js pipeline back together.
    let contextLost = false;
    const handleContextLost = (event) => {
      event.preventDefault();
      contextLost = true;
      // eslint-disable-next-line no-console
      console.error("[Chaplin] ChromedVortexThree: WebGL context lost.");
    };
    const handleContextRestored = () => {
      // eslint-disable-next-line no-console
      console.warn("[Chaplin] ChromedVortexThree: WebGL context restored — rebuilding scene.");
      setRestoreKey((key) => key + 1);
    };
    renderer.domElement.addEventListener("webglcontextlost", handleContextLost, false);
    renderer.domElement.addEventListener("webglcontextrestored", handleContextRestored, false);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const hdrLoader = new RGBELoader();
    let envMap = null;
    hdrLoader.load(
      "/hdr/wooden_studio_17_2k.hdr",
      (texture) => {
        envMap = pmremGenerator.fromEquirectangular(texture).texture;
        scene.environment = envMap;
      },
      undefined,
      () => {
        scene.background = new THREE.Color(0x000000);
      }
    );

    if (backgroundStyle === "lavaLamp" || backgroundStyle === "lava") {
      const finishProfile = (() => {
        switch (finishType) {
          case "chrome":      return { glow: 1.2,  alpha: 0.96, viscosity: 0.30, threshold: 0.080, highlightMix: 0.32, rough: 0.18, micro: 1.15, spec: 1.30, finishT: 0.0 };
          case "metallic":    return { glow: 1.08, alpha: 0.90, viscosity: 0.26, threshold: 0.090, highlightMix: 0.24, rough: 0.34, micro: 0.92, spec: 1.08, finishT: 1.0 };
          case "metalized":   return { glow: 1.0,  alpha: 0.88, viscosity: 0.24, threshold: 0.095, highlightMix: 0.20, rough: 0.44, micro: 0.78, spec: 0.95, finishT: 2.0 };
          case "matte":       return { glow: 0.78, alpha: 0.84, viscosity: 0.20, threshold: 0.105, highlightMix: 0.14, rough: 0.74, micro: 0.62, spec: 0.60, finishT: 3.0 };
          case "glossy":      return { glow: 1.28, alpha: 0.98, viscosity: 0.32, threshold: 0.080, highlightMix: 0.36, rough: 0.14, micro: 1.18, spec: 1.40, finishT: 4.0 };
          case "pearlescent": return { glow: 1.16, alpha: 0.94, viscosity: 0.28, threshold: 0.088, highlightMix: 0.42, rough: 0.28, micro: 1.02, spec: 1.18, finishT: 5.0 };
          default:            return { glow: 1.0,  alpha: 0.90, viscosity: 0.24, threshold: 0.092, highlightMix: 0.24, rough: 0.40, micro: 0.90, spec: 1.00, finishT: 2.0 };
        }
      })();

      const accent        = new THREE.Color(baseColor || "#ad59ff");
      const deepColor     = accent.clone().offsetHSL(0.06, -0.1,  -0.32);
      const midColor      = accent.clone().offsetHSL(-0.02, 0.18, -0.02);
      const highlightColor = accent.clone().lerp(new THREE.Color("#ffd6a3"), finishProfile.highlightMix);

      // ─────────────────────────────────────────────────────────────────────
      // JS BLOB SIMULATION LAYER
      // Coordinate space: x ∈ [-aspRatio, aspRatio], y ∈ [-1, 1]
      // ─────────────────────────────────────────────────────────────────────
      const BLOB_MAX = 8;
      const BLOB_MIN = 3;
      const R_MIN    = 0.16;
      const R_MAX    = 0.42;
      const BASE_SPD = 0.016;
      let   aspRatio = window.innerWidth / window.innerHeight;

      const makeBlob = (x, y, vx, vy, r) => ({
        pos:      new THREE.Vector2(x, y),
        vel:      new THREE.Vector2(vx, vy),
        radius:   r,
        baseR:    r,
        cooldown: 0,
        // Random 1-12 hits required before this blob merges with another
        mergeIn:  Math.ceil(Math.random() * 12),
        // Random 1-12 hits required before a merged blob splits again
        splitIn:  Math.ceil(Math.random() * 12),
        isMerged: false,
      });

      // Initialize blobs in a vortex pattern — arranged in circular rings at different heights
      const blobs = Array.from({ length: 7 }, (_, i) => {
        // Layer the blobs vertically to create a tall tornado shape
        const normalizedHeight = i / 6; // 0 to 1
        const layerHeight = normalizedHeight * 1.6 - 0.8; // -0.8 to +0.8 vertical spread
        
        // Narrower at top, wider at bottom (inverted cone shape for tornado)
        const widthFactor = 0.35 + (1.0 - normalizedHeight) * 0.25;
        const ringRadius = widthFactor + Math.random() * 0.12;
        const startAngle = (i / 7) * Math.PI * 2 + Math.random() * 0.5;
        
        // Initial position on the ring
        const x = Math.cos(startAngle) * ringRadius;
        const y = layerHeight;
        
        // Initial velocity tangent to the ring (counter-clockwise orbital)
        const tangentAngle = startAngle + Math.PI * 0.5;
        const orbitalSpeed = BASE_SPD * (1.6 + normalizedHeight * 0.4);
        const vx = Math.cos(tangentAngle) * orbitalSpeed;
        const vy = Math.sin(layerHeight * 2.5) * BASE_SPD * 0.35; // More pronounced vertical undulation
        
        return makeBlob(
          x * aspRatio * 0.75,
          y,
          vx,
          vy,
          R_MIN + Math.random() * (R_MAX - R_MIN) * 0.5
        );
      });

      let prevBeat = 0;

      const updateBlobs = (dt, bass, beat, pulse) => {
        const safeDt = Math.min(dt, 0.05);
        aspRatio = window.innerWidth / window.innerHeight;

        // Vortex center — applies centripetal pull
        const vortexCenterX = 0;
        const vortexCenterY = 0;
        
        // Vortex expansion factor from music
        const vortexExpansion = 1.0 + bass * 0.5 + beat * 0.3;

        // ── Vortex physics: orbital rotation + height-driven spiral ────────
        for (const b of blobs) {
          const t = performance.now() * 0.00028;
          const seed = b.baseR * 31.7 + b.pos.x * 0.9;
          
          // Position relative to vortex center
          const dx = b.pos.x - vortexCenterX;
          const dy = b.pos.y - vortexCenterY;
          const distFromCenter = Math.sqrt(dx * dx + dy * dy);
          
          // Target orbital radius (narrower for vortex effect)
          // Wider at bottom, narrower at top (conical shape)
          const heightFactor = 1.0 - Math.abs(dy) * 0.4;
          const targetOrbitalRadius = (0.40 + Math.abs(dy) * 0.18) * heightFactor * vortexExpansion;
          
          // Centripetal acceleration toward vortex axis — stronger pull inward
          if (distFromCenter > 0.02) {
            const centripetalForce = 0.00022 * (1.0 + bass * 0.5 + pulse * 0.2);
            const pullDirX = -dx / distFromCenter;
            const pullDirY = -dy / distFromCenter;
            const radiusDeviation = distFromCenter - targetOrbitalRadius;
            
            // Strong inward pull keeps the vortex tight
            if (radiusDeviation > 0) {
              b.vel.x += pullDirX * radiusDeviation * centripetalForce * 60 * safeDt * 1.2;
              b.vel.y += pullDirY * radiusDeviation * centripetalForce * 60 * safeDt * 1.2;
            } else {
              // Gentle outward resistance to prevent over-contracting
              b.vel.x += pullDirX * radiusDeviation * centripetalForce * 60 * safeDt * 0.4;
              b.vel.y += pullDirY * radiusDeviation * centripetalForce * 60 * safeDt * 0.4;
            }
          }
          
          // Tangential (orbital) velocity — sustains counter-clockwise rotation
          const angle = Math.atan2(dy, dx);
          const tangentAngle = angle + Math.PI * 0.5 + t * 0.15; // Adds time-based rotation boost
          const orbitalSpeed = BASE_SPD * (1.5 + pulse * 0.8 + beat * 0.6) * vortexExpansion;
          const targetVx = Math.cos(tangentAngle) * orbitalSpeed;
          const targetVy = Math.sin(tangentAngle) * orbitalSpeed;
          
          // Gradually steer toward tangential motion (smoothing for elegant swirl)
          const steerStrength = 0.095 * (1.0 + bass * 0.25 + pulse * 0.15);
          b.vel.x += (targetVx - b.vel.x) * steerStrength;
          b.vel.y += (targetVy - b.vel.y) * steerStrength;
          
          // Upward drift proportional to height — strong rising motion for vortex
          const heightInfluence = (dy + 0.8) * 0.45;
          const upwardForce = BASE_SPD * 0.12 * heightInfluence * (1.0 + pulse * 0.6 + bass * 0.3);
          b.vel.y += upwardForce;
          
          // Audio-driven downward counter-force (creates spiraling effect with bass)
          b.vel.y -= Math.sin(t + seed) * 0.00008 * 60 * safeDt * bass;
          
          // Light damping — preserves momentum while keeping system stable
          b.vel.multiplyScalar(Math.pow(0.9970, 60 * safeDt));

          // Ensure minimum orbital speed
          const spd = b.vel.length();
          const minSpd = orbitalSpeed * 0.40;
          if (spd < minSpd) b.vel.multiplyScalar(minSpd / Math.max(spd, 1e-5));

          // Maximum speed cap (higher for reactive effect)
          const maxSpd = orbitalSpeed * 3.0;
          if (spd > maxSpd) b.vel.multiplyScalar(maxSpd / spd);

          // Apply position update
          b.pos.x += b.vel.x * 60 * safeDt;
          b.pos.y += b.vel.y * 60 * safeDt;

          // Radius pulses with audio intensity
          b.radius = Math.max(R_MIN, Math.min(R_MAX, b.baseR * (1.0 + beat * 0.25 + bass * 0.15 + pulse * 0.08)));

          // Soft boundary — blobs stay in expanded vortex zone
          const boundaryRadiusX = aspRatio * 0.75;
          const boundaryRadiusY = 1.3;
          const dx_bound = b.pos.x;
          const dy_bound = b.pos.y;
          const distFromBoundary = Math.sqrt((Math.abs(dx_bound) / boundaryRadiusX) ** 2.2 + (Math.abs(dy_bound) / boundaryRadiusY) ** 2.2);
          
          if (distFromBoundary > 0.92) {
            // Soft elastic rebound (not hard bounce) — keeps blobs in shape
            const returnForce = (distFromBoundary - 0.82) * 0.0055;
            const normalX = (Math.abs(dx_bound) > 0.01) ? -Math.sign(dx_bound) : 0;
            const normalY = (Math.abs(dy_bound) > 0.01) ? -Math.sign(dy_bound) : 0;
            b.vel.x += normalX * returnForce;
            b.vel.y += normalY * returnForce;
          }

          if (b.cooldown > 0) b.cooldown -= safeDt;
        }

        // ── Collision: MERGE or ELASTIC BOUNCE based on context ────────────
        outerColl: for (let i = blobs.length - 1; i > 0; i--) {
          for (let j = i - 1; j >= 0; j--) {
            const a = blobs[i], b = blobs[j];
            const dx   = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const sumR = a.radius + b.radius;
            if (dist >= sumR || dist < 1e-4) continue;

            const nx = dx / dist, ny = dy / dist;
            // Relative normal velocity (negative = approaching)
            const rvn = (b.vel.x - a.vel.x) * nx + (b.vel.y - a.vel.y) * ny;

            if (rvn >= 0) {
              // Separating — gentle overlap push only
              const f = ((sumR - dist) / sumR) * 0.003;
              a.vel.x -= nx * f; a.vel.y -= ny * f;
              b.vel.x += nx * f; b.vel.y += ny * f;
              continue;
            }

            if (a.cooldown > 0 || b.cooldown > 0) {
              // On cooldown: just resolve overlap without physics change
              const ov = sumR - dist;
              a.pos.x -= nx * ov * 0.5; a.pos.y -= ny * ov * 0.5;
              b.pos.x += nx * ov * 0.5; b.pos.y += ny * ov * 0.5;
              continue;
            }

            // ── Elastic bounce first (always) ────────────────────────────
            const ma  = a.radius * a.radius;
            const mb  = b.radius * b.radius;
            const imp = (2.0 * rvn) / (ma + mb);
            a.vel.x += imp * mb * nx;  a.vel.y += imp * mb * ny;
            b.vel.x -= imp * ma * nx;  b.vel.y -= imp * ma * ny;
            const ov = sumR - dist;
            const pa = (mb / (ma + mb)) * ov;
            const pb = (ma / (ma + mb)) * ov;
            a.pos.x -= nx * pa; a.pos.y -= ny * pa;
            b.pos.x += nx * pb; b.pos.y += ny * pb;
            a.cooldown = 0.22;
            b.cooldown = 0.22;

            // ── Decrement merge counters ─────────────────────────────────
            // Each hit counts down toward the merge threshold
            a.mergeIn--;
            b.mergeIn--;

            // ── Check if a merged blob should split on this hit ──────────
            // A merged blob tracks hits via splitIn; when it reaches 0 it splits
            if (blobs.length < BLOB_MAX) {
              for (const big of [a, b]) {
                if (!big.isMerged) continue;
                big.splitIn--;
                if (big.splitIn <= 0 && big.radius > R_MIN * 1.35 && big.cooldown <= 0.1) {
                  const newR = big.radius * Math.SQRT1_2;
                  const vlen = big.vel.length() || 0.001;
                  const px   = -big.vel.y / vlen, py = big.vel.x / vlen;
                  const sv   = BASE_SPD * 0.55;
                  const off  = newR * 0.55;
                  const child = makeBlob(
                    big.pos.x + px * off, big.pos.y + py * off,
                    big.vel.x + px * sv,  big.vel.y + py * sv,
                    newR
                  );
                  child.isMerged = false;
                  blobs.push(child);
                  big.pos.x -= px * off; big.pos.y -= py * off;
                  big.vel.x -= px * sv;  big.vel.y -= py * sv;
                  big.radius   = newR;
                  big.baseR    = newR;
                  big.isMerged = false;
                  big.cooldown = 0.8;
                  big.splitIn  = Math.ceil(Math.random() * 12); // reset for next merge
                  break; // only split one per frame
                }
              }
            }

            // ── Check if both blobs have reached their merge threshold ────
            if (blobs.length > BLOB_MIN && a.mergeIn <= 0 && b.mergeIn <= 0) {
              // Merge b into a (a has lower index j, keeps the slot)
              const newR = Math.min(Math.sqrt(a.radius * a.radius + b.radius * b.radius), R_MAX);
              const wa   = a.radius / sumR, wb = 1 - wa;
              b.pos.set(a.pos.x * wa + b.pos.x * wb, a.pos.y * wa + b.pos.y * wb);
              b.vel.set(a.vel.x * wa + b.vel.x * wb, a.vel.y * wa + b.vel.y * wb);
              b.radius   = newR;
              b.baseR    = newR;
              b.isMerged = true;
              b.cooldown = 1.4;
              b.mergeIn  = Math.ceil(Math.random() * 12); // fresh merge counter
              b.splitIn  = Math.ceil(Math.random() * 12); // random splits-before-divide
              blobs.splice(i, 1);
              break outerColl;
            }
          }
        }

        // ── Music-driven split: also resets splitIn counter ──────────────
        const beatUp = beat - prevBeat;
        prevBeat = beat;
        if (beatUp > 0.18 && blobs.length < BLOB_MAX) {
          let bigIdx = 0;
          for (let i = 1; i < blobs.length; i++) {
            if (blobs[i].radius > blobs[bigIdx].radius) bigIdx = i;
          }
          const big = blobs[bigIdx];
          if (big.radius > R_MIN * 1.35 && big.cooldown <= 0) {
            const newR  = big.radius * Math.SQRT1_2;
            // Split perpendicular to direction of travel — both pieces keep moving
            const vlen  = big.vel.length() || 0.001;
            const px    = -big.vel.y / vlen, py = big.vel.x / vlen;
            const sv    = BASE_SPD * 0.55;
            const off   = newR * 0.55;
            blobs.push(makeBlob(
              big.pos.x + px * off, big.pos.y + py * off,
              big.vel.x + px * sv,  big.vel.y + py * sv,
              newR
            ));
            blobs[bigIdx].pos.x -= px * off;
            blobs[bigIdx].pos.y -= py * off;
            blobs[bigIdx].vel.x -= px * sv;
            blobs[bigIdx].vel.y -= py * sv;
            blobs[bigIdx].radius   = newR;
            blobs[bigIdx].baseR    = newR;
            blobs[bigIdx].isMerged = false;
            blobs[bigIdx].cooldown = 0.8;
            blobs[bigIdx].mergeIn  = Math.ceil(Math.random() * 12);
            blobs[bigIdx].splitIn  = Math.ceil(Math.random() * 12);
            blobs[blobs.length - 1].baseR    = newR;
            blobs[blobs.length - 1].isMerged = false;
            blobs[blobs.length - 1].cooldown = 0.8;
          }
        }
      };

      // ─────────────────────────────────────────────────────────────────────
      // SHADER LAYER — full-screen metaball SDF
      // Vertex shader uses NDC passthrough; position of blobs comes from JS
      // ─────────────────────────────────────────────────────────────────────
      const vertSrc = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          // Bypass camera — write NDC directly so quad always fills screen
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `;

      const fragSrc = `
        precision highp float;
        #define MAX_BLOBS 6

        varying vec2 vUv;

        uniform float uTime;
        uniform float uAspect;
        uniform float uBass;
        uniform float uMid;
        uniform float uTreble;
        uniform float uBeat;
        uniform float uPulse;
        uniform vec2  uBlobPos[MAX_BLOBS];
        uniform float uBlobRadius[MAX_BLOBS];
        uniform float uViscosity;
        uniform float uThreshold;
        uniform float uAlpha;
        uniform float uGlow;
        uniform float uFinishRough;
        uniform float uFinishMicro;
        uniform float uFinishSpec;
        uniform float uFinishType;
        uniform vec3  uColorDeep;
        uniform vec3  uColorMid;
        uniform vec3  uColorHL;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          float a = hash(i), b = hash(i + vec2(1,0)), c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }
        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
          for (int i = 0; i < 2; i++) { v += a * noise(p); p = m * p; a *= 0.5; } // 2 octaves (was 4)
          return v;
        }
        float smin(float a, float b, float k) {
          float h = max(k - abs(a - b), 0.0) / k;
          return min(a, b) - h * h * h * k * (1.0 / 6.0);
        }

        // Metaball SDF — blob positions are driven by JS simulation
        float blobField(vec2 p) {
          // Add subtle spiral texture for vortex effect
          float spiralPhase = atan(p.y, p.x) + length(p) * 3.2;
          float spiralmod = (sin(spiralPhase + length(p) * 8.0) * 0.5 + 0.5) * 0.008;
          
          // Domain warp removed — blobs driven by JS physics, saves 6 fbm calls/px
          float field = 1000.0;
          for (int i = 0; i < MAX_BLOBS; i++) {
            float d = length(p - uBlobPos[i]) - uBlobRadius[i];
            field = smin(field, d, 0.16 + uViscosity * 0.12);
          }
          
          // Subtle spiral warping for stronger vortex visual
          field -= spiralmod * (0.55 + uBass * 0.35);
          return field;
        }

        void main() {
          // Map UV → screen-space matching JS simulation coordinates
          vec2 p = vec2((vUv.x - 0.5) * 2.0 * uAspect, (vUv.y - 0.5) * 2.0);

          float field   = blobField(p);
          float density = 1.0 - smoothstep(-uThreshold, uThreshold + 0.10, field);
          if (density < 0.01) discard;

          float inner   = clamp(-field / 0.46, 0.0, 1.0);
          float cGlow   = pow(inner, 1.5) * (0.55 + uGlow * 0.28 + uBass * 0.14);
          float halo    = exp(-max(field, 0.0) * (6.5 + uViscosity * 3.0)) * (0.20 + uGlow * 0.16);
          float contour = mix(0.75, 1.0 - smoothstep(0.0, 0.020, abs(field)), uBeat * 0.6 + uBass * 0.4);

          // SDF gradient → surface normal (forward diff: reuse already-computed field, saves 2 blobField calls)
          float eps = 0.010;
          float fx  = blobField(p + vec2(eps, 0.0)) - field;
          float fy  = blobField(p + vec2(0.0, eps)) - field;
          vec3  n   = normalize(vec3(-fx, -fy, 1.0));

          // Microstructure texture — uFinishMicro scales detail: chrome=fine, matte=coarse
          float microTex  = fbm(p * (2.0 + uFinishMicro * 3.2) + uTime * 0.25);
          // Normal perturbation: rough finishes scatter normals → bumpy/chalky look
          // chrome (rough=0.18): perturbStr=0.054 → barely perturbed (mirror-smooth)
          // matte  (rough=0.74): perturbStr=0.222 → heavily perturbed (diffuse, chalky)
          float roughNoise = (microTex - 0.50) * 1.4;
          float perturbStr = uFinishRough * 0.30;
          n = normalize(n + vec3(roughNoise * perturbStr, roughNoise * perturbStr * 0.75, 0.0));

          vec3  l   = normalize(vec3(0.38, 0.48, 0.80));
          vec3  v   = vec3(0.0, 0.0, 1.0);
          vec3  hv  = normalize(l + v);
          float ndl = max(dot(n,  l),  0.0);
          float ndh = max(dot(n,  hv), 0.0);
          float ndv = max(dot(n, v),  0.0);

          // Fresnel rim — brightest at blob edges (where n tilts from camera), zero on matte
          float fresnel = pow(max(0.0, 1.0 - ndv), 3.5) * (1.0 - uFinishRough);

          // Pearlescent iridescence
          float pearl = (uFinishType > 4.5) ? (0.10 + 0.10 * sin((p.x + p.y + uTime) * 3.0)) : 0.0;

          float beatTex  = mix(0.0, microTex * 0.25, uBeat * 0.8 + uBass * 0.5);
          // Rough/matte reveals static surface texture; shiny shows beat flash only
          float texVis   = mix(beatTex, microTex * 0.20, uFinishRough * 0.75);

          vec3 col = mix(uColorDeep, uColorMid, smoothstep(0.10, 0.62, density + cGlow * 0.12 + texVis));
          col      = mix(col, uColorHL,         smoothstep(0.52, 1.0,  density + cGlow * 0.26 + texVis * 0.5));
          col     += uColorHL * cGlow   * (0.20 + texVis * 0.15);
          col     += uColorHL * contour * 0.12;

          if (pearl > 0.0) col = mix(col, col.bgr, pearl);

          // Specular: range 6 (matte) → 120 (chrome) — wide visible gap between finish types
          float specPow = mix(6.0, 120.0, 1.0 - clamp(uFinishRough, 0.0, 1.0));
          col += uColorHL  * pow(ndh, specPow) * (0.12 + uFinishSpec * 0.66);
          col += uColorMid * ndl * (0.05 + (1.0 - uFinishRough) * 0.11);

          // Fresnel rim — bright edge ring on chrome/glossy, invisible on matte
          col += uColorHL * fresnel * (0.16 + uFinishSpec * 0.32);

          // Chrome only: ultra-sharp secondary specular hot spot (mirror-ball flash)
          col += uColorHL * pow(ndh, 200.0) * 0.80 * (1.0 - step(0.5, uFinishType));

          float alpha = clamp(density * 1.15 + cGlow * 0.25 + halo * 0.40, 0.0, 1.0) * uAlpha;
          gl_FragColor = vec4(col, alpha);
        }
      `;

      // ── Full-screen quad (2×2 plane, NDC passthrough vertex shader) ──────
      const geo         = new THREE.PlaneGeometry(2, 2);
      const blobPosArr  = Array.from({ length: 6 }, () => new THREE.Vector2(0, -100));
      const blobRadArr  = [0.001, 0.001, 0.001, 0.001, 0.001, 0.001];

      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite:  false,
        depthTest:   false,
        blending:    THREE.NormalBlending,
        vertexShader:   vertSrc,
        fragmentShader: fragSrc,
        uniforms: {
          uTime:        { value: 0 },
          uAspect:      { value: aspRatio },
          uBass:        { value: 0 },
          uMid:         { value: 0 },
          uTreble:      { value: 0 },
          uBeat:        { value: 0 },
          uPulse:       { value: 0 },
          uBlobPos:     { value: blobPosArr },
          uBlobRadius:  { value: blobRadArr },
          uViscosity:   { value: finishProfile.viscosity },
          uThreshold:   { value: finishProfile.threshold },
          uAlpha:       { value: finishProfile.alpha },
          uGlow:        { value: finishProfile.glow },
          uFinishRough: { value: finishProfile.rough },
          uFinishMicro: { value: finishProfile.micro },
          uFinishSpec:  { value: finishProfile.spec },
          uFinishType:  { value: finishProfile.finishT },
          uColorDeep:   { value: new THREE.Vector3(deepColor.r,      deepColor.g,      deepColor.b) },
          uColorMid:    { value: new THREE.Vector3(midColor.r,       midColor.g,       midColor.b) },
          uColorHL:     { value: new THREE.Vector3(highlightColor.r, highlightColor.g, highlightColor.b) },
        },
      });

      const lavaMesh = new THREE.Mesh(geo, mat);
      scene.add(lavaMesh);

      const lavaAccentLight = new THREE.PointLight(accent, 0.8, 20, 2.0);
      lavaAccentLight.position.set(0, 0.5, 1.5);
      scene.add(lavaAccentLight);

      // UnrealBloomPass removed — was 5 full-screen passes per frame

      let smoothSub = 0, smoothBass = 0, smoothMid = 0, smoothTreble = 0, smoothPulse = 0;
      let beatHold = 0, prevPulse = 0;

      const dataArray = analyserRef?.current
        ? new Uint8Array(analyserRef.current.frequencyBinCount)
        : null;

      const getEnergy = (data, s, e) => {
        let sum = 0;
        for (let i = s; i < e; i++) sum += data[i];
        return sum / (e - s) / 255;
      };

      const getElapsedTime = createTimeTracker();
      let prevTime = 0;

      const onResize = () => {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setSize(Math.floor(w * RENDER_SCALE), Math.floor(h * RENDER_SCALE));
        mat.uniforms.uAspect.value = w / h;
      };
      window.addEventListener("resize", onResize);

      let rafId = 0;
      const animateLavaLamp = () => {
        rafId = requestAnimationFrame(animateLavaLamp);
        const time = getElapsedTime();
        const dt   = Math.max(0, time - prevTime);
        prevTime   = time;

        const { playing: lp, sessionPlaying: sp } = playbackStateRef.current;
        if (lp && analyserRef?.current && dataArray) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const bin = r => Math.max(0, Math.min(dataArray.length - 1, Math.floor(dataArray.length * r)));
          const sub  = getEnergy(dataArray, bin(0.00), bin(0.03));
          const bass = getEnergy(dataArray, bin(0.03), bin(0.09));
          const mids = getEnergy(dataArray, bin(0.09), bin(0.35));
          const high = getEnergy(dataArray, bin(0.35), bin(0.85));
          smoothSub    += (sub  - smoothSub)    * 0.08;
          smoothBass   += (bass - smoothBass)   * 0.10;
          smoothMid    += (mids - smoothMid)    * 0.10;
          smoothTreble += (high - smoothTreble) * 0.12;
          const pulse = smoothSub * 0.28 + smoothBass * 0.34 + smoothMid * 0.24 + smoothTreble * 0.14;
          smoothPulse += (pulse - smoothPulse) * 0.12;
          const tr = Math.max(0, pulse - prevPulse); prevPulse = pulse;
          beatHold = Math.max(beatHold * 0.92, Math.min(1, tr * 5.8));
        } else if (sp && visualizerStateRef?.current?.active) {
          const sh    = visualizerStateRef.current;
          const fresh = Date.now() - (sh.updatedAt || 0) < VISUALIZER_STALE_MS;
          if (fresh) {
            smoothSub    += ((sh.sub    || 0) - smoothSub)    * 0.12;
            smoothBass   += ((sh.bass   || 0) - smoothBass)   * 0.12;
            smoothMid    += ((sh.mid    || 0) - smoothMid)    * 0.12;
            smoothTreble += ((sh.treble || 0) - smoothTreble) * 0.12;
            smoothPulse  += ((sh.pulse  || 0) - smoothPulse)  * 0.12;
            beatHold = Math.max(beatHold * 0.92, Math.min(1, sh.beat || 0));
          } else {
            smoothSub *= 0.97; smoothBass *= 0.97; smoothMid *= 0.97; smoothTreble *= 0.97; smoothPulse *= 0.97;
            beatHold  *= 0.92;
          }
        } else {
          smoothSub *= 0.97; smoothBass *= 0.97; smoothMid *= 0.97; smoothTreble *= 0.97; smoothPulse *= 0.97;
          beatHold  *= 0.92;
        }

        const settings = animationSettingsRef.current;
        const gate = settings.animationEnabled ? 1.0 : 0.0;

        // ── Run JS physics simulation ─────────────────────────────────────
        updateBlobs(dt, smoothBass * gate, beatHold * gate, smoothPulse * gate);

        // ── Sync JS blob state → shader uniforms ─────────────────────────
        for (let i = 0; i < 6; i++) {
          if (i < blobs.length) {
            blobPosArr[i].set(blobs[i].pos.x, blobs[i].pos.y);
            blobRadArr[i] = blobs[i].radius;
          } else {
            blobPosArr[i].set(0, -100);
            blobRadArr[i] = 0.001;
          }
        }
        mat.uniforms.uBlobPos.value    = blobPosArr;
        mat.uniforms.uBlobRadius.value = blobRadArr;

        mat.uniforms.uTime.value       = time;
        mat.uniforms.uBass.value       = smoothBass;
        mat.uniforms.uMid.value        = smoothMid;
        mat.uniforms.uTreble.value     = smoothTreble;
        mat.uniforms.uBeat.value       = beatHold;
        mat.uniforms.uPulse.value      = smoothPulse;
        mat.uniforms.uViscosity.value  = Math.max(0.14, finishProfile.viscosity + smoothPulse * 0.06 + beatHold * 0.03);
        mat.uniforms.uThreshold.value  = finishProfile.threshold - smoothBass * 0.010 - beatHold * 0.005;
        mat.uniforms.uGlow.value       = finishProfile.glow + smoothPulse * 0.22 + beatHold * 0.15 + smoothBass * 0.08;

        lavaAccentLight.intensity = 0.75 + smoothPulse * 0.95 + beatHold * 0.30 + smoothBass * 0.15;
        lavaAccentLight.position.z = 1.8 + Math.sin(time * 0.8) * 0.3;

        directionalLight.intensity = 0.30 + smoothTreble * 0.28;
        fillLight.intensity        = 0.22 + smoothMid    * 0.16;

        if (!contextLost) renderer.render(scene, camera);
      };

      animateLavaLamp();

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("resize", onResize);
        renderer.domElement.removeEventListener("webglcontextlost", handleContextLost, false);
        renderer.domElement.removeEventListener("webglcontextrestored", handleContextRestored, false);
        scene.remove(lavaMesh);
        scene.remove(lavaAccentLight);
        geo.dispose();
        mat.dispose();
        pmremGenerator.dispose();
        if (envMap) envMap.dispose();
        mount.removeChild(renderer.domElement);
        renderer.dispose();
      };
    }


    if (backgroundStyle === "rain") {
      const finishProfile = (() => {
        switch (finishType) {
          case "chrome":
            return { glow: 1.24, sharpness: 1.3, texture: 0.95, opacity: 0.92, reflection: 1.18 };
          case "metallic":
            return { glow: 1.12, sharpness: 1.15, texture: 0.82, opacity: 0.9, reflection: 1.12 };
          case "metalized":
            return { glow: 1.08, sharpness: 1.05, texture: 0.76, opacity: 0.88, reflection: 1.06 };
          case "matte":
            return { glow: 0.82, sharpness: 0.8, texture: 0.52, opacity: 0.82, reflection: 0.78 };
          case "glossy":
            return { glow: 1.34, sharpness: 1.45, texture: 1.0, opacity: 0.96, reflection: 1.26 };
          case "pearlescent":
            return { glow: 1.2, sharpness: 1.1, texture: 0.9, opacity: 0.9, reflection: 1.22 };
          default:
            return { glow: 1.0, sharpness: 1.0, texture: 0.78, opacity: 0.88, reflection: 1.0 };
        }
      })();

      const accent = new THREE.Color(baseColor || "#54c6ff");

      const rainVertexShader = `
        attribute float aSize;
        attribute float aSpeed;
        attribute float aSeed;

        varying float vSeed;
        varying float vSpeed;

        uniform float uTime;
        uniform float uFall;
        uniform float uMotion;
        uniform float uPulse;
        uniform float uDensity;

        void main() {
          vec3 p = position;
          float yRange = 14.0;
          float speed = (0.9 + aSpeed * 1.35) * uFall;
          p.y = mod(position.y - uTime * speed + yRange * 0.5, yRange) - yRange * 0.5;
          p.x += sin(aSeed * 17.0) * 0.04 * uMotion;
          p.z += cos(aSeed * 23.0) * 0.03 * uMotion;

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;

          float perspective = 260.0 / max(1.0, -mv.z);
          gl_PointSize = aSize * (0.8 + uDensity * 0.7 + uPulse * 1.1) * perspective;
          gl_PointSize = clamp(gl_PointSize, 1.5, 11.0);

          vSeed = aSeed;
          vSpeed = aSpeed;
        }
      `;

      const rainFragmentShader = `
        precision highp float;

        varying float vSeed;
        varying float vSpeed;

        uniform float uTime;
        uniform float uTreble;
        uniform float uBass;
        uniform float uGlow;
        uniform float uTextureAmount;
        uniform float uSharpness;
        uniform float uOpacity;
        uniform float uReflection;
        uniform vec3 uBaseColor;

        void main() {
          vec2 uv = gl_PointCoord * 2.0 - 1.0;
          float streakWidth = 7.0 + uSharpness * 11.0;
          float body = exp(-abs(uv.x) * streakWidth);
          float head = smoothstep(1.0, -0.35, uv.y);
          float tail = smoothstep(-1.0, 0.55, uv.y);

          float core = body * head * tail;
          float grain = sin((uv.y + uTime * 3.6 + vSeed * 11.0) * 34.0) * 0.5 + 0.5;
          float sideSpark = exp(-abs(uv.x - 0.18 * sin(vSeed * 30.0)) * 22.0) * 0.25;

          float texturized = mix(core, core * (0.6 + grain * 0.7) + sideSpark, clamp(uTextureAmount, 0.0, 1.0));
          float energy = 0.7 + uTreble * 0.6 + uBass * 0.3 + vSpeed * 0.25;

          vec3 neon = uBaseColor * (0.7 + uReflection * 0.45);
          vec3 highlight = mix(neon, vec3(1.0), 0.28 + uTreble * 0.18);
          vec3 color = mix(neon, highlight, clamp(texturized * 0.95 + uGlow * 0.22, 0.0, 1.0));

          float alpha = clamp(texturized * energy * uOpacity, 0.0, 1.0);
          if (alpha < 0.03) discard;

          gl_FragColor = vec4(color, alpha);
        }
      `;

      const count = 2600;
      const rainGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const speeds = new Float32Array(count);
      const seeds = new Float32Array(count);

      for (let i = 0; i < count; i += 1) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 14.5;
        positions[i3 + 1] = (Math.random() - 0.5) * 14.0;
        positions[i3 + 2] = (Math.random() - 0.5) * 9.0;
        sizes[i] = 0.09 + Math.random() * 0.14;
        speeds[i] = 0.55 + Math.random() * 1.45;
        seeds[i] = Math.random();
      }

      rainGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      rainGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      rainGeometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
      rainGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

      const rainMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        vertexShader: rainVertexShader,
        fragmentShader: rainFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uFall: { value: 1.25 },
          uMotion: { value: 1.0 },
          uPulse: { value: 0.0 },
          uDensity: { value: 0.75 },
          uTreble: { value: 0.0 },
          uBass: { value: 0.0 },
          uGlow: { value: finishProfile.glow },
          uTextureAmount: { value: finishProfile.texture },
          uSharpness: { value: finishProfile.sharpness },
          uOpacity: { value: finishProfile.opacity },
          uReflection: { value: finishProfile.reflection },
          uBaseColor: { value: new THREE.Vector3(accent.r, accent.g, accent.b) }
        }
      });

      const rain = new THREE.Points(rainGeometry, rainMaterial);
      rain.position.y = 0.35;
      scene.add(rain);

      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.35,
        0.4,
        0.6
      );
      bloom.threshold = 0.16;
      bloom.strength = 1.1 * finishProfile.glow;
      bloom.radius = 0.5;
      composer.addPass(bloom);

      let smoothSub = 0;
      let smoothBass = 0;
      let smoothMid = 0;
      let smoothTreble = 0;
      let smoothPulse = 0;
      let beatHold = 0;
      let prevPulse = 0;

      const dataArray = analyserRef?.current
        ? new Uint8Array(analyserRef.current.frequencyBinCount)
        : null;

      const getEnergy = (data, start, end) => {
        let sum = 0;
        for (let i = start; i < end; i += 1) sum += data[i];
        return sum / (end - start) / 255;
      };

      const getElapsedTime = createTimeTracker();

      const onResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        composer.setSize(width, height);
      };

      window.addEventListener("resize", onResize);

      let rafId = 0;
      const animateRain = () => {
        rafId = requestAnimationFrame(animateRain);

        const time = getElapsedTime();
        const { playing: localPlaying, sessionPlaying: localSessionPlaying } = playbackStateRef.current;

        if (localPlaying && analyserRef?.current && dataArray) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const bin = (ratio) => Math.max(0, Math.min(dataArray.length - 1, Math.floor(dataArray.length * ratio)));
          const sub = getEnergy(dataArray, bin(0.0), bin(0.03));
          const bass = getEnergy(dataArray, bin(0.03), bin(0.09));
          const mids = getEnergy(dataArray, bin(0.09), bin(0.35));
          const highs = getEnergy(dataArray, bin(0.35), bin(0.85));

          smoothSub += (sub - smoothSub) * 0.12;
          smoothBass += (bass - smoothBass) * 0.13;
          smoothMid += (mids - smoothMid) * 0.14;
          smoothTreble += (highs - smoothTreble) * 0.2;

          const pulse = smoothSub * 0.34 + smoothBass * 0.36 + smoothMid * 0.2 + smoothTreble * 0.1;
          smoothPulse += (pulse - smoothPulse) * 0.2;
          const transient = Math.max(0, pulse - prevPulse);
          prevPulse = pulse;
          beatHold = Math.max(beatHold * 0.9, Math.min(1, transient * 7.0));
        } else if (localSessionPlaying && visualizerStateRef?.current?.active) {
          const shared = visualizerStateRef.current;
          const fresh = Date.now() - (shared.updatedAt || 0) < VISUALIZER_STALE_MS;
          if (fresh) {
            smoothSub += ((shared.sub || 0) - smoothSub) * 0.18;
            smoothBass += ((shared.bass || 0) - smoothBass) * 0.18;
            smoothMid += ((shared.mid || 0) - smoothMid) * 0.18;
            smoothTreble += ((shared.treble || 0) - smoothTreble) * 0.18;
            smoothPulse += ((shared.pulse || 0) - smoothPulse) * 0.18;
            beatHold = Math.max(beatHold * 0.9, Math.min(1, shared.beat || 0));
          } else {
            smoothSub *= 0.96;
            smoothBass *= 0.96;
            smoothMid *= 0.96;
            smoothTreble *= 0.96;
            smoothPulse *= 0.96;
            beatHold *= 0.9;
          }
        } else {
          smoothSub *= 0.96;
          smoothBass *= 0.96;
          smoothMid *= 0.96;
          smoothTreble *= 0.96;
          smoothPulse *= 0.96;
          beatHold *= 0.9;
        }

        const settings = animationSettingsRef.current;
        const gate = settings.animationEnabled ? 1.0 : 0.0;
        const reactive = Math.max(0.0, settings.reactivity);
        const motionGain = Math.max(0.2, settings.motionIntensity);
        const deformGain = Math.max(0.2, settings.deformIntensity);
        const bassGain = Math.max(0.2, settings.bassBoost);
        const trebleGain = Math.max(0.2, settings.trebleBoost);

        const idlePulse = gate * (0.09 + Math.sin(time * 2.4) * 0.04 + Math.sin(time * 4.4) * 0.02);
        const idleBass = gate * (0.06 + Math.sin(time * 1.5 + 1.3) * 0.03);
        const idleTreble = gate * (0.06 + Math.sin(time * 4.0 + 0.8) * 0.03);

        const bassDriven = Math.max(0.0, smoothBass * bassGain, idleBass);
        const trebleDriven = Math.max(0.0, smoothTreble * trebleGain, idleTreble);
        const pulseDriven = Math.max(0.0, smoothPulse, idlePulse);
        const beatDriven = Math.max(0.0, beatHold, gate * Math.max(0.0, Math.sin(time * 2.2)) * 0.12);

        rainMaterial.uniforms.uTime.value = time;
        rainMaterial.uniforms.uPulse.value = pulseDriven * reactive;
        rainMaterial.uniforms.uBass.value = bassDriven;
        rainMaterial.uniforms.uTreble.value = trebleDriven;
        rainMaterial.uniforms.uMotion.value = motionGain * 0.35;
        rainMaterial.uniforms.uDensity.value = 0.58 + reactive * 0.6 + beatDriven * 0.4;
        rainMaterial.uniforms.uFall.value = 0.95 + motionGain * 0.85;

        rain.rotation.y = 0.0;
        rain.position.x = 0.0;

        bloom.strength = (0.9 + pulseDriven * 1.1 + beatDriven * 0.45 + trebleDriven * 0.3) * finishProfile.glow;
        bloom.radius = 0.42 + trebleDriven * 0.3 * deformGain;
        bloom.threshold = 0.22 - bassDriven * 0.08;

        directionalLight.intensity = 0.3 + trebleDriven * 0.34;
        fillLight.intensity = 0.24 + pulseDriven * 0.2;

        camera.position.z = 6.2;
        camera.position.x = 0.0;
        camera.lookAt(0, -0.2, 0);

        if (!contextLost) composer.render();
      };

      animateRain();

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("resize", onResize);
        renderer.domElement.removeEventListener("webglcontextlost", handleContextLost, false);
        renderer.domElement.removeEventListener("webglcontextrestored", handleContextRestored, false);

        scene.remove(rain);
        rainGeometry.dispose();
        rainMaterial.dispose();

        composer.dispose();
        pmremGenerator.dispose();
        if (envMap) envMap.dispose();
        mount.removeChild(renderer.domElement);
        renderer.dispose();
      };
    }

    const geometry = (() => {
      if (backgroundStyle === "vortex") {
        const g = new THREE.ConeGeometry(1.6, 6, 200, 32, true);
        g.rotateX(Math.PI * 0.5);
        return g;
      }

      if (backgroundStyle === "aeroHalo") {
        return new THREE.TorusKnotGeometry(1.15, 0.34, 280, 36, 2, 3);
      }

      if (backgroundStyle === "fluidCurtain") {
        const g = new THREE.CylinderGeometry(1.35, 1.35, 4.8, 120, 40, true);
        g.rotateX(Math.PI * 0.5);
        return g;
      }

      if (backgroundStyle === "prismBloom") {
        return new THREE.IcosahedronGeometry(1.9, 6);
      }

      if (backgroundStyle === "hourglass") {
        const top = new THREE.ConeGeometry(1.4, 1.5, 120, 10, true);
        const bottom = new THREE.ConeGeometry(1.4, 1.5, 120, 10, true);
        top.translate(0, 0.75, 0);
        bottom.rotateX(Math.PI);
        bottom.translate(0, -0.75, 0);
        const merged = mergeGeometries([top, bottom], true);
        return merged;
      }

      if (backgroundStyle === "rain") {
        return new THREE.SphereGeometry(1.8, 60, 60);
      }

      return new THREE.IcosahedronGeometry(1.8, 7);
    })();

    let materialProps = {};
    switch (finishType) {
      case 'chrome':
        materialProps = { metalness: 0.95, roughness: 0.05, clearcoat: 1.0, clearcoatRoughness: 0.02, reflectivity: 1.0 };
        break;
      case 'metallic':
        materialProps = { metalness: 0.8, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.1, reflectivity: 0.8 };
        break;
      case 'metalized':
        materialProps = { metalness: 0.6, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2, reflectivity: 0.6 };
        break;
      case 'pearlescent':
        materialProps = { metalness: 0.3, roughness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.05, reflectivity: 0.7, sheen: 0.3, sheenColor: new THREE.Color(baseColor) };
        break;
      case 'matte':
        materialProps = { metalness: 0.1, roughness: 0.8, clearcoat: 0.2, clearcoatRoughness: 0.5, reflectivity: 0.2 };
        break;
      case 'glossy':
        materialProps = { metalness: 0.2, roughness: 0.02, clearcoat: 0.9, clearcoatRoughness: 0.01, reflectivity: 0.9 };
        break;
      default:
        materialProps = { metalness: 0.85, roughness: 0.08, clearcoat: 1.0, clearcoatRoughness: 0.05, reflectivity: 0.9 };
    }

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(baseColor),
      ...materialProps,
      envMapIntensity: 2.5,
      ior: 1.45,
      thickness: 0.1,
      attenuationColor: new THREE.Color(0x888888),
      attenuationDistance: 0.5,
      fog: false
    });

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uSub = { value: 0 };
      shader.uniforms.uBass = { value: 0 };
      shader.uniforms.uMid = { value: 0 };
      shader.uniforms.uTreble = { value: 0 };
      shader.uniforms.uPulse = { value: 0 };
      shader.uniforms.uBeat = { value: 0 };
      shader.uniforms.uStyle = { value: 0 };

      shader.vertexShader =
        `
        uniform float uTime;
        uniform float uSub;
        uniform float uBass;
        uniform float uMid;
        uniform float uTreble;
        uniform float uPulse;
        uniform float uBeat;
        uniform int uStyle;

        float metaball(vec3 p, vec3 c, float r) {
          float d = length(p - c);
          return smoothstep(r, r * 0.6, d);
        }
        ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `
        vec3 transformed = position;
        float t = uTime * 0.3;

        float wave1 = sin(position.x * 2.0 + t) * 0.05;
        float wave2 = cos(position.y * 1.5 - t * 0.7) * 0.03;
        float wave3 = sin(position.z * 1.8 + t * 0.5) * 0.04;

        float bassPulse = uBass * 0.14;
        float subPulse = uSub * 0.16;
        float midPulse = uMid * 0.12;
        float trebleSpike = uTreble * 0.35;
        float beatPunch = uBeat * 0.28;
        float groove = uPulse * 0.12;

        if (uStyle == 0) {
          float height = transformed.y;
          float h = clamp((height + 3.0) / 6.0, 0.0, 1.0);
          float funnel = mix(0.25, 2.8, pow(h, 1.5));
          float angle = atan(transformed.z, transformed.x);
          angle += h * 6.2831853 * 1.618 + t * 0.35;
          float radius = length(transformed.xz) * funnel;
          float edge = sin(radius * 12.0 + t * (1.65 + uMid * 1.3)) * 0.35;
          edge += sin(radius * 28.0 + t * 2.7) * 0.12;
          edge *= (0.6 + (1.0 - h) * 0.6);
          radius += edge * (1.0 - h) * (1.0 + groove + beatPunch * 0.6);
          transformed.xz = vec2(cos(angle), sin(angle)) * radius;
          float tent = sin(radius * (14.0 + uTreble * 16.0) - t * 2.2) * 0.13;
          float taper = pow(1.0 - h, 1.8);
          transformed += normal * tent * taper * (0.7 + trebleSpike + beatPunch + subPulse * 0.5);
        }

        else if (uStyle == 1) {
          float angle = atan(position.z, position.x);
          float latitude = position.y;
          float tentaclePattern = sin(angle * 18.0 + t * 4.0 + latitude * 9.0) * 0.5 + 0.5;
          float tentacleMask = pow(tentaclePattern, 3.6);
          float tentacleLength = tentacleMask * (0.05 + uBass * 0.17 + uBeat * 0.24 + uSub * 0.09);
          float microRidge = sin(angle * (42.0 + uTreble * 35.0) + t * 8.0 + latitude * 15.0) * (0.01 + uTreble * 0.05);
          float breathing = sin(t * 2.4 + latitude * 3.6) * (0.02 + uMid * 0.06);
          transformed += normal * (wave1 + wave2 + wave3 + bassPulse + midPulse + tentacleLength + microRidge + breathing + beatPunch * 0.35);
        }

        else if (uStyle == 2) {
          float height = transformed.y;
          float h = clamp((height + 1.5) / 3.0, 0.0, 1.0);
          float neck = smoothstep(0.45, 0.55, abs(h - 0.5));
          float cone = mix(1.0, 0.4 - uSub * 0.06, abs(h - 0.5) * 2.0);
          float noise = sin((transformed.x + transformed.z) * (12.0 + uTreble * 12.0) + t * 1.8) * (0.03 + uMid * 0.02);
          transformed.xz *= cone;
          transformed += normal * noise * neck * (1.0 + beatPunch * 0.9);
        }

        else if (uStyle == 3) {
          vec3 p = transformed * 1.1;
          vec3 c1 = vec3(sin(t * 0.6) * 0.6, cos(t * 0.4) * 0.8, sin(t * 0.5) * 0.6);
          vec3 c2 = vec3(cos(t * 0.7) * 0.5, sin(t * 0.3) * 0.7, cos(t * 0.6) * 0.5);
          vec3 c3 = vec3(sin(t * 0.5 + 2.0) * 0.7, cos(t * 0.6 + 1.0) * 0.5, sin(t * 0.4 + 3.0) * 0.7);

          float blob = metaball(p, c1, 0.9);
          blob += metaball(p, c2, 0.75);
          blob += metaball(p, c3, 0.85);
          blob = clamp(blob, 0.0, 1.0);

          float fluid = sin(t * (1.2 + uMid * 1.5) + p.y * 4.0) * (0.06 + uTreble * 0.04);
          transformed += normal * (blob * (0.28 + uBass * 0.24) + fluid + bassPulse * 0.12 + beatPunch * 0.18);
        }

        else if (uStyle == 4) {
          float y = transformed.y + 2.0;
          float flame = sin(y * (8.0 + uTreble * 14.0) - t * (2.0 + uMid * 1.4)) * 0.15;
          flame += cos(y * 14.0 - t * 3.4) * (0.08 + uTreble * 0.05);
          flame += sin((transformed.x + transformed.z) * 10.0 + t * 2.5) * 0.05;
          float turbulence = pow(fract(sin(dot(transformed.xyz, vec3(12.9898,78.233,45.164))) * 43758.5453), 2.0);
          flame += turbulence * 0.12;
          float taper = smoothstep(0.1, 2.0, y);
          transformed += normal * flame * (1.0 - taper) * (0.65 + bassPulse * 0.3 + beatPunch * 0.5);
        }

        else if (uStyle == 5) {
          float ring = length(transformed.xz);
          float swirl = atan(transformed.z, transformed.x);
          float nested = sin(swirl * 6.0 + t * (0.9 + uMid * 0.7)) * (0.08 + uTreble * 0.06);
          float breath = sin(t * 1.3 + ring * 3.2) * (0.05 + uBass * 0.1);
          float haloBands = sin(ring * 18.0 - t * 2.2) * (0.02 + uPulse * 0.05);
          transformed += normal * (nested + breath + haloBands + beatPunch * 0.16);
        }

        else if (uStyle == 6) {
          float longitudinal = transformed.z;
          float around = atan(transformed.y, transformed.x);
          float curtainWaveA = sin(longitudinal * 4.4 + t * (1.1 + uMid * 0.8) + around * 3.0) * (0.08 + uBass * 0.1);
          float curtainWaveB = cos(longitudinal * 8.0 - t * (1.9 + uTreble * 1.2)) * (0.04 + uTreble * 0.06);
          float fringe = sin(around * 18.0 + t * 4.0) * (0.015 + uPulse * 0.04);
          transformed += normal * (curtainWaveA + curtainWaveB + fringe + groove * 0.2 + beatPunch * 0.14);
        }

        else if (uStyle == 7) {
          float radial = length(transformed);
          float petals = sin(atan(transformed.y, transformed.x) * 7.0 + t * (0.8 + uMid)) * (0.07 + uTreble * 0.06);
          float coreBreath = sin(t * 1.2 + radial * 6.5) * (0.05 + uBass * 0.11);
          float prismRipple = cos((transformed.x + transformed.y + transformed.z) * 9.0 - t * 2.6) * (0.025 + uPulse * 0.06);
          transformed += normal * (petals + coreBreath + prismRipple + beatPunch * 0.2);
        }
        `
      );

      material.userData.shader = shader;
    };

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI * 0.08;
    mesh.rotation.z = Math.PI * 0.02;
    scene.add(mesh);

    let particles = null;
    if (backgroundStyle === "hourglass") {
      const particleCount = 500;
      const particleGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * 1.2;
        const z = (Math.random() - 0.5) * 1.2;
        const y = Math.random() * 0.5 + 0.5;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
      }
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const particleMaterial = new THREE.PointsMaterial({
        color: new THREE.Color(baseColor),
        size: 0.03,
        transparent: true,
        opacity: 0.9
      });
      particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);
    }

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      2.5,
      0.4,
      0.85
    );
    bloom.threshold = 0.6;
    bloom.strength = 0.8;
    bloom.radius = 0.5;
    composer.addPass(bloom);

    let smoothSub = 0;
    let smoothBass = 0;
    let smoothMid = 0;
    let smoothTreble = 0;
    let smoothPulse = 0;
    let beatHold = 0;
    let prevPulse = 0;
    const dataArray = analyserRef?.current
      ? new Uint8Array(analyserRef.current.frequencyBinCount)
      : null;

    function getEnergy(data, start, end) {
      let sum = 0;
      for (let i = start; i < end; i++) sum += data[i];
      return sum / (end - start) / 255;
    }

    const getElapsedTime = createTimeTracker();

    function onResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
    }

    window.addEventListener("resize", onResize);

    let rafId = 0;
    function animate() {
      rafId = requestAnimationFrame(animate);

      const time = getElapsedTime();
      let outputPulse = smoothPulse;
      let outputMid = smoothMid;
      let outputSub = smoothSub;
      let outputBeat = beatHold;

      if (material.userData.shader) {
        material.userData.shader.uniforms.uTime.value = time;
      }

      const { playing: localPlaying, sessionPlaying: localSessionPlaying } = playbackStateRef.current;

      if (localPlaying && analyserRef?.current && dataArray && material.userData.shader) {
        analyserRef.current.getByteFrequencyData(dataArray);
        const settings = animationSettingsRef.current;
        const animationGate = settings.animationEnabled ? 1 : 0;
        const reactiveGain = Math.max(0, settings.reactivity) * animationGate;
        const bassGain = Math.max(0, settings.bassBoost);
        const trebleGain = Math.max(0, settings.trebleBoost);
        const deformGain = Math.max(0, settings.deformIntensity);
        const motionGain = Math.max(0, settings.motionIntensity);

        const nyquistBins = dataArray.length;
        const bin = (ratio) => Math.max(0, Math.min(nyquistBins - 1, Math.floor(nyquistBins * ratio)));

        const sub = getEnergy(dataArray, bin(0.0), bin(0.03));
        const bass = getEnergy(dataArray, bin(0.03), bin(0.09));
        const mids = getEnergy(dataArray, bin(0.09), bin(0.35));
        const highs = getEnergy(dataArray, bin(0.35), bin(0.85));

        smoothSub += (sub - smoothSub) * 0.12;
        smoothBass += (bass - smoothBass) * 0.13;
        smoothMid += (mids - smoothMid) * 0.14;
        smoothTreble += (highs - smoothTreble) * 0.2;

        const pulse = smoothSub * 0.34 + smoothBass * 0.36 + smoothMid * 0.2 + smoothTreble * 0.1;
        smoothPulse += (pulse - smoothPulse) * 0.2;

        const transient = Math.max(0, pulse - prevPulse);
        prevPulse = pulse;
        beatHold = Math.max(beatHold * 0.9, Math.min(1, transient * 7.0));

        const subOut = smoothSub * reactiveGain * bassGain;
        const bassOut = smoothBass * reactiveGain * bassGain;
        const midOut = smoothMid * reactiveGain;
        const trebleOut = smoothTreble * reactiveGain * trebleGain;
        const pulseOut = smoothPulse * reactiveGain;
        const beatOut = beatHold * reactiveGain;

        outputPulse = pulseOut;
        outputMid = midOut;
        outputSub = subOut;
        outputBeat = beatOut;

        material.userData.shader.uniforms.uSub.value = subOut * deformGain;
        material.userData.shader.uniforms.uBass.value = bassOut * deformGain;
        material.userData.shader.uniforms.uMid.value = midOut * deformGain;
        material.userData.shader.uniforms.uTreble.value = trebleOut * deformGain;
        material.userData.shader.uniforms.uPulse.value = pulseOut * deformGain;
        material.userData.shader.uniforms.uBeat.value = beatOut * deformGain;

        bloom.strength = 0.64 + pulseOut * 0.8 * deformGain + beatOut * 0.32 * deformGain;
        bloom.radius = 0.42 + trebleOut * 0.24 * deformGain;
        bloom.threshold = 0.52 - bassOut * 0.1 * deformGain;

        camera.position.z = 8 - bassOut * 0.9 * motionGain - beatOut * 0.4 * motionGain;
        camera.position.x = Math.sin(time * 0.23) * (0.15 + midOut * 0.2 * motionGain);
        camera.lookAt(0, 0, 0);

        directionalLight.intensity = 0.42 + trebleOut * 0.75;
        fillLight.intensity = 0.26 + midOut * 0.4;
      } else if (localSessionPlaying && visualizerStateRef?.current?.active && material.userData.shader) {
        const settings = animationSettingsRef.current;
        const animationGate = settings.animationEnabled ? 1 : 0;
        const reactiveGain = Math.max(0, settings.reactivity) * animationGate;
        const bassGain = Math.max(0, settings.bassBoost);
        const trebleGain = Math.max(0, settings.trebleBoost);
        const deformGain = Math.max(0, settings.deformIntensity);
        const motionGain = Math.max(0, settings.motionIntensity);
        const shared = visualizerStateRef.current;
        const fresh = Date.now() - (shared.updatedAt || 0) < VISUALIZER_STALE_MS;

        if (!fresh) {
          material.userData.shader.uniforms.uSub.value = 0;
          material.userData.shader.uniforms.uBass.value = 0;
          material.userData.shader.uniforms.uMid.value = 0;
          material.userData.shader.uniforms.uTreble.value = 0;
          material.userData.shader.uniforms.uPulse.value = 0;
          material.userData.shader.uniforms.uBeat.value = 0;
          bloom.strength = 0.64;
          bloom.radius = 0.42;
          bloom.threshold = 0.52;
          camera.position.z = 8;
          camera.position.x = Math.sin(time * 0.23) * 0.15;
          camera.lookAt(0, 0, 0);
          directionalLight.intensity = 0.42;
          fillLight.intensity = 0.26;
        } else {
          const subOut = (shared.sub || 0) * reactiveGain * bassGain;
          const bassOut = (shared.bass || 0) * reactiveGain * bassGain;
          const midOut = (shared.mid || 0) * reactiveGain;
          const trebleOut = (shared.treble || 0) * reactiveGain * trebleGain;
          const pulseOut = (shared.pulse || 0) * reactiveGain;
          const beatOut = (shared.beat || 0) * reactiveGain;

          outputPulse = pulseOut;
          outputMid = midOut;
          outputSub = subOut;
          outputBeat = beatOut;

          material.userData.shader.uniforms.uSub.value = subOut * deformGain;
          material.userData.shader.uniforms.uBass.value = bassOut * deformGain;
          material.userData.shader.uniforms.uMid.value = midOut * deformGain;
          material.userData.shader.uniforms.uTreble.value = trebleOut * deformGain;
          material.userData.shader.uniforms.uPulse.value = pulseOut * deformGain;
          material.userData.shader.uniforms.uBeat.value = beatOut * deformGain;

          bloom.strength = 0.64 + pulseOut * 0.8 * deformGain + beatOut * 0.32 * deformGain;
          bloom.radius = 0.42 + trebleOut * 0.24 * deformGain;
          bloom.threshold = 0.52 - bassOut * 0.1 * deformGain;

          camera.position.z = 8 - bassOut * 0.9 * motionGain - beatOut * 0.4 * motionGain;
          camera.position.x = Math.sin(time * 0.23) * (0.15 + midOut * 0.2 * motionGain);
          camera.lookAt(0, 0, 0);

          directionalLight.intensity = 0.42 + trebleOut * 0.75;
          fillLight.intensity = 0.26 + midOut * 0.4;
        }
      }

      if (material.userData.shader) {
        let styleIndex = 0;
        if (backgroundStyle === "sphere") styleIndex = 1;
        else if (backgroundStyle === "hourglass") styleIndex = 2;
        else if (backgroundStyle === "lavaLamp" || backgroundStyle === "lava") styleIndex = 3;
        else if (backgroundStyle === "rain") styleIndex = 4;
        else if (backgroundStyle === "aeroHalo") styleIndex = 5;
        else if (backgroundStyle === "fluidCurtain") styleIndex = 6;
        else if (backgroundStyle === "prismBloom") styleIndex = 7;
        material.userData.shader.uniforms.uStyle.value = styleIndex;
      }

      const settings = animationSettingsRef.current;
      const animationGate = settings.animationEnabled ? 1 : 0;
      const motionGain = Math.max(0, settings.motionIntensity);
      mesh.rotation.y += 0.0007 + outputPulse * 0.01 * motionGain * animationGate;
      mesh.rotation.x += 0.00025 + outputMid * 0.003 * motionGain * animationGate;

      directionalLight.position.x = 5 * Math.cos(time * 0.0001);
      directionalLight.position.z = 5 * Math.sin(time * 0.0001);

      if (backgroundStyle === "hourglass" && particles) {
        const positions = particles.geometry.attributes.position.array;
        for (let i = 0; i < 500; i++) {
          const i3 = i * 3;
          const fallSpeed = 0.004 + outputSub * 0.02 * motionGain * animationGate + outputBeat * 0.012 * motionGain * animationGate;
          positions[i3 + 1] -= fallSpeed;
          if (positions[i3 + 1] < -0.5) {
            positions[i3] = (Math.random() - 0.5) * 1.2;
            positions[i3 + 1] = 0.5 + Math.random() * 0.5;
            positions[i3 + 2] = (Math.random() - 0.5) * 1.2;
          }
        }
        particles.geometry.attributes.position.needsUpdate = true;
      }

      if (!contextLost) composer.render();
    }

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLost, false);
      renderer.domElement.removeEventListener("webglcontextrestored", handleContextRestored, false);
      mount.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      composer.dispose();
      pmremGenerator.dispose();
      if (envMap) envMap.dispose();
      if (particles) {
        scene.remove(particles);
        particles.geometry.dispose();
        particles.material.dispose();
      }
      renderer.dispose();
    };
  }, [baseColor, finishType, backgroundStyle, analyserRef, visualizerStateRef, restoreKey]);

  return (
    <div
      ref={mountRef}
      style={{ position: "fixed", inset: 0, zIndex: -1 }}
    />
  );
}
