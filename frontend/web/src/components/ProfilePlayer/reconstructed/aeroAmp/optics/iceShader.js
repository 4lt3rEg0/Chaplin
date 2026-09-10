// FASE 14.2 — ICE REFRACTION MATERIAL
//
// GLSL for IceCrystalMaterial. Kept in its own file (per Fase 14.8 — "no
// meter 1000 líneas dentro de AeroAmpSkin.jsx") so the shader can be read,
// tuned or swapped without touching the component tree at all.
//
// What this simulates, and what it deliberately doesn't:
// - A Schlick Fresnel term (uFresnelPower) drives the mix between the
//   "looking straight through" color and the "grazing angle, mostly
//   reflective" color — the single biggest cue that separates glass/ice
//   from painted plastic.
// - A real refract() vector (eta ≈ 1/1.32, real ice IOR is ~1.31-1.33) bends
//   the environment sample instead of just showing it — the whole point of
//   Fase 14 vs. the Fase 6-13 SVG pass, which could fake Fresnel but never
//   real bending.
// - A cheap value-noise "caustic" shimmer, very low amplitude and slow
//   (uTime), standing in for light rays wandering inside the ice. This is
//   NOT a fantasy magic-crystal glow — amplitude is tuned low on purpose.
// - uAudioBass nudges refraction strength and the Fresnel power a little,
//   so the material itself (not just an overlay) responds to bass — see
//   CrystalOpticsLayer's useFrame for how the analyser feeds this.
//
// What it doesn't do: sample the real DOM behind the player. There is no
// cheap, reliable way to pipe arbitrary HTML into a WebGL texture every
// frame. Instead the environment is a small procedural gradient (sky blue
// / white toplight / cyan aurora / faint lilac — see environmentTexture.js)
// rendered once to a canvas texture, which the ice then genuinely reflects
// and refracts. The canvas itself is fully alpha-transparent, so the real
// app background still shows through wherever the ice doesn't cover it —
// that transparency is real WebGL alpha, not a CSS trick.

export const iceVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uAudioBass;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;

    // Fase 14.6 — bass makes the whole volume breathe very slightly, as if
    // pressure inside the ice were rising with the sound.
    float bulge = 1.0 + uAudioBass * 0.03;
    vec3 pos = position * bulge;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);

    vec4 viewPosition = viewMatrix * worldPosition;
    vViewDir = normalize(-viewPosition.xyz);

    gl_Position = projectionMatrix * viewPosition;
  }
`;

export const iceFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uAudioBass;
  uniform float uAudioMid;
  uniform float uAudioHigh;
  uniform float uRefractionStrength;
  uniform float uFresnelPower;
  uniform float uIceDensity;
  uniform sampler2D uEnvMap;
  uniform vec3 uIceTint;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  varying vec3 vViewDir;

  const float PI = 3.14159265359;
  // Real ice: IOR ~1.31. eta = n_air / n_ice.
  const float IOR = 1.32;

  // Cheap hash-based value noise — enough for a soft internal shimmer,
  // deliberately not a full simplex/perlin implementation (cost vs benefit
  // isn't there for something this subtle).
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  vec2 dirToEquirect(vec3 dir) {
    float phi = atan(dir.z, dir.x);
    float theta = acos(clamp(dir.y, -1.0, 1.0));
    return vec2(phi / (2.0 * PI) + 0.5, 1.0 - theta / PI);
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewDir);

    // FASE 14.3 — a virtual light source that follows the cursor (uMouse,
    // -1..1) nudges the normal very slightly, so the reflection genuinely
    // repositions instead of only the SVG highlight above doing the work.
    vec3 lightBias = vec3(uMouse.x, uMouse.y, 0.4) * 0.12;
    vec3 n = normalize(normal + lightBias);

    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), uFresnelPower);

    // FASE 14.2 — real refraction vector, not a fake blur.
    float eta = 1.0 / IOR;
    vec3 refracted = refract(-viewDir, n, eta);
    vec3 reflected = reflect(-viewDir, n);

    float strength = uRefractionStrength * (1.0 + uAudioBass * 0.5);
    vec3 refractDir = normalize(mix(-viewDir, refracted, clamp(strength, 0.0, 1.0)));

    vec3 envRefraction = texture2D(uEnvMap, dirToEquirect(refractDir)).rgb;
    vec3 envReflection = texture2D(uEnvMap, dirToEquirect(reflected)).rgb;

    // FASE 14.4 — ice caustics: slow, low-amplitude, organic. Two noise
    // octaves drifting at different speeds so it never looks like a static
    // texture, mixed in as light, not as a color tint.
    float causticSlow = noise(vWorldPosition * 0.6 + vec3(0.0, 0.0, uTime * 0.05));
    float causticFast = noise(vWorldPosition * 1.7 + vec3(uTime * 0.08, uTime * -0.06, 0.0));
    float caustic = (causticSlow * 0.65 + causticFast * 0.35);
    caustic = smoothstep(0.45, 0.95, caustic) * (0.12 + uAudioMid * 0.10);

    // Base ice color: tinted refraction + tinted reflection at grazing
    // angles (Fresnel), plus the caustic shimmer as additive light and a
    // tiny high-frequency sparkle keyed to uAudioHigh.
    vec3 color = mix(envRefraction * uIceTint, envReflection, fresnel);
    color += caustic * vec3(0.75, 0.95, 1.0);

    float sparkle = step(0.985, hash(floor(vWorldPosition * 40.0) + floor(uTime * 6.0)));
    color += sparkle * uAudioHigh * vec3(1.0, 1.0, 1.0) * 0.35;

    // Alpha: denser/more opaque at grazing edges (Fresnel) and controlled
    // overall by uIceDensity — never a flat "opacity" value standing in
    // for the material, per the brief.
    float alpha = clamp(uIceDensity * (0.35 + fresnel * 0.55), 0.0, 0.92);

    gl_FragColor = vec4(color, alpha);
  }
`;

export const ICE_UNIFORM_DEFAULTS = {
  uTime: 0,
  uMouse: [0, 0],
  uAudioBass: 0,
  uAudioMid: 0,
  uAudioHigh: 0,
  uRefractionStrength: 0.55,
  uFresnelPower: 2.4,
  uIceDensity: 0.6,
  uIceTint: [0.75, 0.92, 1.0]
};
