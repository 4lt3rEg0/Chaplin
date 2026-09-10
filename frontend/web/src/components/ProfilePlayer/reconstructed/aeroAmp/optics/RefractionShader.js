// FASE 15 — TRUE OPTICAL ICE ENGINE
//
// This is the actual optical model, replacing Fase 14's iceShader.js. The
// difference in one line: Fase 14 mixed a Fresnel-weighted blend of two
// static environment-map samples (reflection vs. "refraction," but the
// "refraction" sample was just the same static env map from a bent
// direction — nothing behind the ice ever actually appeared distorted).
// This version samples a REAL texture of what is behind the mesh
// (uSceneTex — a live rasterization of the actual SVG shell, captured by
// CrystalRenderer.jsx, not a synthetic stand-in scene) and distorts THAT,
// per-channel, which is what makes elements behind the glass actually
// deform when seen through it (Fase 15.1 / 15.4).
import { ICE_NOISE_GLSL } from './IceNoise';
import { glslCaustics } from './Caustics';

export const iceVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uAudioBass;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  varying vec3 vViewDir;
  // FASE 15.1 — screen-space UV of this fragment, used to sample uSceneTex.
  // Computed here (not derived from gl_FragCoord in the fragment shader) so
  // it correctly follows the mesh's own projection regardless of canvas size.
  varying vec2 vScreenUV;

  void main() {
    vUv = uv;

    // Fase 15.8 — bass makes the whole volume breathe, same idea as Fase 14
    // but slightly reduced (0.025 vs 0.03) since normal-map turbulence now
    // carries most of the "the ice is agitated" read.
    float bulge = 1.0 + uAudioBass * 0.025;
    vec3 pos = position * bulge;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);

    vec4 viewPosition = viewMatrix * worldPosition;
    vViewDir = normalize(-viewPosition.xyz);

    vec4 clipPosition = projectionMatrix * viewPosition;
    vScreenUV = (clipPosition.xy / clipPosition.w) * 0.5 + 0.5;

    gl_Position = clipPosition;
  }
`;

export const iceFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uAudioBass;
  uniform float uAudioMid;
  uniform float uAudioHigh;
  uniform float uNormalStrength;
  uniform float uRefractionStrength;
  uniform float uCausticIntensity;
  uniform sampler2D uSceneTex;
  uniform sampler2D uEnvMap;
  uniform vec3 uIceTint;
  uniform float uHasScene;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying vec2 vUv;
  varying vec3 vViewDir;
  varying vec2 vScreenUV;

  const float PI = 3.14159265359;
  // FASE 15.3 — real ice IOR range is 1.31-1.33; IOR_G is the "green"
  // (reference) channel, IOR_SPREAD gives R/B their own slightly different
  // index for chromatic dispersion (Fase 15.4) — about half a percent of
  // IOR_G, deliberately tiny so the fringe stays "cut glass," not "prism."
  const float IOR_G = 1.32;
  const float IOR_SPREAD = 0.0022;

  ${ICE_NOISE_GLSL}
  ${glslCaustics}

  vec2 dirToEquirect(vec3 dir) {
    float phi = atan(dir.z, dir.x);
    float theta = acos(clamp(dir.y, -1.0, 1.0));
    return vec2(phi / (2.0 * PI) + 0.5, 1.0 - theta / PI);
  }

  void main() {
    vec3 viewDir = normalize(vViewDir);
    vec3 geoNormal = normalize(vNormal);

    // FASE 15.2 — procedural normal map (macro/medio/micro FBM), no texture.
    // uNormalStrength is audio-bass-reactive — see CrystalRenderer.jsx.
    vec3 perturb = iceNormalPerturb(vWorldPosition * 1.3, uTime, uNormalStrength);
    vec3 n = normalize(geoNormal + vec3(perturb.xy, 0.0) * 0.35);

    // Cursor bias — same technique as Fase 14, now a smaller contribution
    // since the procedural normal map is doing real work of its own.
    vec3 lightBias = vec3(uMouse.x, uMouse.y, 0.4) * 0.03;
    n = normalize(n + lightBias);

    float cosTheta = clamp(dot(n, viewDir), 0.0, 1.0);

    // FASE 15.3 — real Schlick Fresnel derived from IOR (angle-dependent,
    // not a fixed power curve): F0 = ((1-ior)/(1+ior))^2, so a
    // perpendicular look genuinely reflects less and a grazing angle
    // genuinely reflects more, in real ice's own proportions.
    float F0 = pow((1.0 - IOR_G) / (1.0 + IOR_G), 2.0);
    float fresnel = F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);

    // FASE 16 — CRYSTAL OPTICAL CALIBRATION. Fase 15 distorted the whole
    // face uniformly, which is exactly the "too much shader, not enough
    // product" problem this pass exists to fix: real ice/glass barely
    // bends anything you see head-on through its flat center — almost all
    // of the visible bending happens near edges. The first version of this
    // gate used the Fresnel term (surface-normal-angle based) for that, but
    // RoundedBox's normals turned out to vary continuously across the
    // WHOLE face rather than staying flat in the middle, which produced a
    // false bright/distorted band straight through the LCD/mascot instead
    // of a clean, calm center — measured directly by rendering with the
    // internal-volume layer disabled and confirming the band was still
    // there, i.e. coming from THIS material, not particles. Gating on
    // texture-space distance from the face's center instead sidesteps that
    // entirely and is arguably more correct for "solo cuando mira
    // esquinas/bordes" anyway — it's a direct measure of "how close to the
    // shell's actual edge," independent of any mesh-normal quirk.
    // FASE 16 — threshold tightened hard (0.58 -> 0.83): the mascot/LCD
    // sits at roughly 7-19% across the shell's width, which is close
    // enough to the LEFT edge in plain UV terms that the first threshold
    // still counted it as "rim" and kept distorting it. Real ice/glass
    // edge effects live in a much narrower border than that — this keeps
    // it to roughly the outer 8-9% of the face, the actual bevel/corner
    // area, and leaves the whole LCD/button field alone.
    // ICE EDITION BRIEF — re-tightened again (0.83 -> 0.90) after
    // CrystalRenderer.jsx's RoundedBox was deliberately oversized past the
    // camera's true visible frame (see that file's comment) to remove a
    // hard rectangular seam the old, undersized box exposed inside the
    // shell. A bigger mesh face means the same 0.83 threshold now sits
    // well inside the true visible edge, so this is recalibrated to the
    // new geometry: 0.90 is where the true frame boundary now falls in
    // this mesh's own UV space, so the rim glow still only appears at/near
    // the shell's actual visible edge, not partway through the interior.
    float edgeUV = max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0;
    float edgeFactor = smoothstep(0.90, 0.995, edgeUV);

    // FASE 15.1 — SCREEN SPACE REFRACTION: distort the UV used to sample
    // the real captured scene by the perturbed normal's own screen-space
    // component — exactly texture(uv + normal.xy * distortion). Base
    // strength cut roughly in half again from Fase 15 on top of the
    // edgeFactor gating above — refraction is now a premium detail you
    // notice at the rim, not a filter over the whole player.
    float distortion = uRefractionStrength * (1.0 + uAudioBass * 0.25) * 0.006 * edgeFactor;

    // FASE 15.4 — CHROMATIC DISPERSION: three per-channel IOR values (tiny
    // spread) bend the sampling UV by very slightly different amounts, so a
    // straight edge behind the ice picks up a faint R/G/B fringe right at
    // its boundary, the way a real cut-glass edge does. Not a rainbow.
    vec2 dirR = n.xy / (IOR_G - IOR_SPREAD);
    vec2 dirG = n.xy / IOR_G;
    vec2 dirB = n.xy / (IOR_G + IOR_SPREAD);

    vec2 uvR = clamp(vScreenUV + dirR * distortion, 0.002, 0.998);
    vec2 uvG = clamp(vScreenUV + dirG * distortion, 0.002, 0.998);
    vec2 uvB = clamp(vScreenUV + dirB * distortion, 0.002, 0.998);

    float sceneR = texture2D(uSceneTex, uvR).r;
    float sceneG = texture2D(uSceneTex, uvG).g;
    float sceneB = texture2D(uSceneTex, uvB).b;
    float sceneA = texture2D(uSceneTex, vScreenUV).a;
    vec3 refractedScene = vec3(sceneR, sceneG, sceneB);

    // FASE 15.5/16 — caustics: light the ice itself gathers. Fase 16 turns
    // this down to "discovered on close look," not "visible from across
    // the room" — a cheap glass ornament glows, an expensive one barely
    // does (see file header of ICE_MICRODETAILS-era comments below).
    float causticIntensity = uCausticIntensity * (0.08 + uAudioMid * 0.05);
    float caustic = iceCaustics(vWorldPosition * 0.9, uTime, causticIntensity);
    float rays = iceCausticRays(vWorldPosition * 0.8 + vec3(uMouse * 0.4, 0.0), uTime, uCausticIntensity * 0.05);

    vec3 reflection = texture2D(uEnvMap, dirToEquirect(reflect(-viewDir, n))).rgb;

    // FASE 16 COLOR SCIENCE — uIceTint now carries the brief's exact
    // "cristal" cyan (#7DEBFF) instead of a near-white tint, but only ever
    // mixed in proportion to edgeFactor: dead center (edgeFactor -> 0) the
    // real scene passes through essentially untinted and untouched, so
    // text/cover art/VU meter stay true-color and legible; only near the
    // rim does the ice's own color start to read. That's "40% hielo
    // transparente / 40% vidrio Aqua / 20% gel" as a gradient across the
    // surface, not a flat wash over everything.
    vec3 tintedScene = mix(refractedScene, refractedScene * uIceTint, edgeFactor * 0.6);
    // FASE 16 — reflection now gated by BOTH fresnel (grazing angle) AND
    // edgeFactor (actual texture-space edge proximity), not fresnel alone
    // — the same RoundedBox normal quirk that motivated edgeUV above could
    // still have let a pure-fresnel reflection wash the flat center. This
    // guarantees the reflection only ever shows up right at the rim,
    // matching "solo cuando mira esquinas/bordes/reflejos."
    vec3 color = mix(tintedScene, reflection, fresnel * edgeFactor * 0.55);
    color += (caustic + rays) * vec3(0.75, 0.94, 1.0);

    // INDUSTRIAL DESIGN FINAL PASS — "eliminar... polvo espacial, efectos
    // mágicos." This used to be a stochastic per-pixel glitter (a hashed
    // threshold flickering points on/off every frame) — nothing on a real
    // injection-molded acrylic shell twinkles like that; it read as pixie
    // dust, not manufactured plastic, and is removed rather than retuned.
    // uAudioHigh still gets a physical response (a barely-there brightening
    // of the existing rim reflection, gated by edgeFactor like everything
    // else optical here) instead of conjuring new bright points.
    color += reflection * uAudioHigh * edgeFactor * 0.05;

    // Alpha: driven by the REAL captured scene's own alpha (uHasScene==0
    // falls back to a flat mid alpha for the no-capture-yet / SSR-safe
    // case) — this is what lets the ice mesh's simple rounded-box geometry
    // still read as the shell's actual faceted silhouette: where the
    // rasterized SVG is transparent (outside the shell's chamfer), the
    // mesh fades toward faint instead of showing a hard rectangular edge.
    // FASE 16 — floor raised again (0.68 -> 0.8): the LCD/info area should
    // read as SOLID, clear ice, not a faint see-through film.
    float baseAlpha = clamp(0.8 + fresnel * 0.2, 0.0, 1.0);
    float shapedAlpha = mix(baseAlpha, baseAlpha * mix(0.12, 1.0, sceneA), uHasScene);

    gl_FragColor = vec4(color, shapedAlpha);
  }
`;

// INDUSTRIAL DESIGN FINAL PASS COLOR SYSTEM — this brief's exact palette,
// as normalized RGB (replaces Fase 16's four-stop set):
//   #FFFFFF  Glass White / key light        -> (1.0, 1.0, 1.0)
//   #5DEBFF  Aqua (the material's own tint) -> (0.365, 0.922, 1.0)
//   #063B66  Deep Ocean (env floor + shadow — this brief gives one dark
//            stop, not two; doing double duty here, NEVER pure black/gray)
//                                            -> (0.024, 0.231, 0.400)
export const ICE_PALETTE = {
  keyWhite: [1.0, 1.0, 1.0],
  crystalCyan: [0.365, 0.922, 1.0],
  depthOcean: [0.024, 0.231, 0.400],
  shadowNavy: [0.024, 0.231, 0.400]
};

export const ICE_UNIFORM_DEFAULTS = {
  uTime: 0,
  uMouse: [0, 0],
  uAudioBass: 0,
  uAudioMid: 0,
  uAudioHigh: 0,
  // FASE 16 — every strength dialed back from Fase 15's defaults; the
  // per-frame audio/CrystalRenderer math on top of these is turned down to
  // match (see CrystalRenderer.jsx), so "elegant, never aggressive" holds
  // even at full bass.
  uNormalStrength: 0.42,
  uRefractionStrength: 0.32,
  uCausticIntensity: 0.4,
  uIceTint: ICE_PALETTE.crystalCyan,
  uHasScene: 0
};
