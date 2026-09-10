// FASE 15.2 — ICE NORMAL MAP PROCEDURAL
//
// No static image, anywhere — every bump on the ice's surface comes from
// noise evaluated live in the fragment shader. This file is pure GLSL,
// exported as strings and spliced into RefractionShader.js's fragment
// shader, kept separate so the noise math can be read/tuned without
// touching the optical model around it.
//
// Three explicit scales, each reads as a different physical thing when the
// normal they produce is used to bend light (see iceNormalPerturb below):
//   MACRO  — big, slow density swells across the whole slab (think: where
//            the ice is thicker/thinner)
//   MEDIO  — internal veins/streaks (the frozen "grain" ice gets when it
//            forms in layers)
//   MICRO  — small surface imperfections (what actually catches a sharp
//            specular glint rather than reading as a smooth plastic dome)
//
// No octave is spectacular by itself, which is the point — real ice reads
// as "mostly smooth, subtly alive," not textured.

export const glslHash = /* glsl */ `
  float iceHash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
`;

export const glslValueNoise = /* glsl */ `
  float iceValueNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(iceHash(i + vec3(0,0,0)), iceHash(i + vec3(1,0,0)), f.x),
          mix(iceHash(i + vec3(0,1,0)), iceHash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(iceHash(i + vec3(0,0,1)), iceHash(i + vec3(1,0,1)), f.x),
          mix(iceHash(i + vec3(0,1,1)), iceHash(i + vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }
`;

// Fractal Brownian Motion — a handful of octaves of iceValueNoise summed at
// halving amplitude / doubling frequency. Cheap (4 taps) but enough to kill
// the "obviously one sine wave" look a single noise call has.
export const glslFbm = /* glsl */ `
  float iceFbm(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 4; i += 1) {
      sum += iceValueNoise(p * freq) * amp;
      freq *= 2.02;
      amp *= 0.5;
    }
    return sum;
  }
`;

// The actual "normal map" — no texture, no UV lookup. Evaluates an FBM
// height field at three different world-space scales (macro/medio/micro),
// combines them with different weights, then estimates the gradient via
// finite differences (the standard way to turn a scalar noise field into a
// perturbation vector without an analytic derivative). uNormalStrength
// scales the whole result — this is what Fase 15.8 drives with audio bass.
export const glslIceNormalPerturb = /* glsl */ `
  vec3 iceNormalPerturb(vec3 p, float t, float strength) {
    float e = 0.02;

    // MACRO — large slow density swells, drifting very slowly over time.
    vec3 macroP = p * 0.6 + vec3(0.0, 0.0, t * 0.015);
    // MEDIO — internal veins, a tighter frequency band, drifting sideways.
    vec3 medioP = p * 2.4 + vec3(t * 0.03, -t * 0.02, 0.0);
    // MICRO — fine surface imperfections, near-static (real ice grain
    // doesn't visibly crawl at this scale, only glints as the eye/light
    // moves) — time contributes only a tiny jitter.
    vec3 microP = p * 9.0 + vec3(0.0, 0.0, t * 0.004);

    float hC = iceFbm(macroP) * 0.55 + iceFbm(medioP) * 0.30 + iceFbm(microP) * 0.15;
    float hX = iceFbm(macroP + vec3(e,0,0)) * 0.55 + iceFbm(medioP + vec3(e,0,0)) * 0.30 + iceFbm(microP + vec3(e,0,0)) * 0.15;
    float hY = iceFbm(macroP + vec3(0,e,0)) * 0.55 + iceFbm(medioP + vec3(0,e,0)) * 0.30 + iceFbm(microP + vec3(0,e,0)) * 0.15;

    vec2 grad = clamp(vec2(hX - hC, hY - hC) / e, -3.0, 3.0);
    // Scaled well down from the raw finite-difference gradient — this is a
    // BUMP, meant to read as "the surface has grain," not a displacement
    // large enough to warp the whole picture behind it on its own. The
    // refraction pass (RefractionShader.js) is what turns this into visible
    // distortion, and does so with its own separate, small multiplier.
    return vec3(grad * strength * 0.16, 1.0);
  }
`;

export const ICE_NOISE_GLSL = glslHash + glslValueNoise + glslFbm + glslIceNormalPerturb;
