// Shared MATERIAL recipes — CSS gradient/shadow strings that make a surface
// read as a specific physical substance (metal, chrome, glass, rubber,
// brass, LCD). These are photographic techniques, not anatomy: every skin
// still builds its own unique silhouette and control layout, but reaches
// for the same physically-correct gradient shapes when it needs "this part
// is brushed aluminum" or "this part is glass" — the same way a real
// industrial designer reuses render techniques across totally different
// products. Nothing here is skin-specific; nothing here draws a silhouette.

// ---- METAL --------------------------------------------------------------

// Brushed dark metal panel: a soft diagonal sheen + fine brushed-grain lines
// + an overall vertical falloff so it never reads as a flat tint.
export const brushedMetal = (base, sheen = 'rgba(255,255,255,0.16)') => `
  repeating-linear-gradient(115deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 3px),
  linear-gradient(125deg, ${sheen} 0%, transparent 22%, transparent 78%, rgba(0,0,0,0.35) 100%),
  linear-gradient(180deg, color-mix(in srgb, ${base} 90%, #fff 10%) 0%, ${base} 45%, color-mix(in srgb, ${base} 78%, #000) 100%)
`;

// Chrome: high-contrast alternating bands (the classic "chrome" tell —
// real chrome mirrors its environment, so we fake environment bands).
export const chromeGradient = (tint = '#dfe4ea') => `
  linear-gradient(180deg,
    #f5f7fa 0%, #c7ccd1 8%, #8b9096 16%, #eef1f4 26%,
    #6d7278 38%, ${tint} 50%, #9198a0 62%, #f2f4f6 74%,
    #71767c 86%, #d6dadf 94%, #a5aab0 100%)
`;

export const chromeRing = (tint = '#dfe4ea') => `
  conic-gradient(from 200deg,
    #eef1f4, #7d838a 20%, #f5f7fa 35%, ${tint} 50%,
    #6d7278 65%, #eef1f4 80%, #9198a0 100%)
`;

// ---- BRASS / COPPER -------------------------------------------------------

export const brassGradient = (base = '#b8802f') => `
  linear-gradient(125deg, rgba(255,244,214,0.5) 0%, transparent 25%),
  repeating-linear-gradient(100deg, rgba(0,0,0,0.05) 0px, transparent 2px, transparent 5px),
  linear-gradient(180deg, color-mix(in srgb, ${base} 80%, #fff 20%) 0%, ${base} 40%, color-mix(in srgb, ${base} 65%, #1a0d00) 100%)
`;

// ---- PLASTIC / RUBBER -----------------------------------------------------

export const glossPlastic = (base) => `
  radial-gradient(120% 90% at 30% 0%, rgba(255,255,255,0.35), transparent 55%),
  linear-gradient(180deg, color-mix(in srgb, ${base} 90%, #fff 10%) 0%, ${base} 55%, color-mix(in srgb, ${base} 70%, #000) 100%)
`;

export const matteRubber = (base) => `
  radial-gradient(140% 100% at 40% -10%, rgba(255,255,255,0.08), transparent 60%),
  linear-gradient(180deg, color-mix(in srgb, ${base} 96%, #fff 4%), color-mix(in srgb, ${base} 82%, #000))
`;

// ---- GLASS ------------------------------------------------------------

// A layered glass panel: base tint + diagonal sheen streak + bright top
// rim + soft inner shadow to fake thickness. `depth` toggles a stronger
// inset (for a "sunken behind glass" display vs a raised glass button).
export const glassPanel = (tintVar, depth = 'sunken') => `
  linear-gradient(115deg, rgba(255,255,255,0.22) 0%, transparent 16%, transparent 46%, rgba(255,255,255,0.06) 60%, transparent 74%),
  radial-gradient(120% 140% at 20% -20%, rgba(255,255,255,0.30), transparent 45%),
  linear-gradient(165deg, color-mix(in srgb, ${tintVar} 55%, #000) 0%, color-mix(in srgb, ${tintVar} 28%, #000) 55%, color-mix(in srgb, ${tintVar} 14%, #000) 100%)
`;

export const glassPanelShadow = (tintVar, depth = 'sunken') => (depth === 'sunken'
  ? `inset 0 3px 8px rgba(0,0,0,0.7), inset 0 -2px 4px color-mix(in srgb, ${tintVar} 20%, transparent), 0 1px 0 rgba(255,255,255,0.15)`
  : `0 3px 6px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -3px 6px color-mix(in srgb, ${tintVar} 35%, transparent)`);

// ---- LCD / VFD DISPLAY --------------------------------------------------

export const lcdBack = (tintVar) => `
  repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px),
  radial-gradient(120% 130% at 25% 10%, color-mix(in srgb, ${tintVar} 22%, transparent), transparent 60%),
  color-mix(in srgb, ${tintVar} 8%, #05070a)
`;

export const lcdGlassShadow = () => `
  inset 0 2px 6px rgba(0,0,0,0.85),
  inset 0 0 22px rgba(0,0,0,0.5),
  0 1px 0 rgba(255,255,255,0.08)
`;

// ---- BEVEL / DEPTH SYSTEM --------------------------------------------------

// A raised physical edge (button, panel, control face). `intensity` 0..1.
export const bevelRaised = (intensity = 1) => `
  0 ${2 * intensity}px ${4 * intensity}px rgba(0,0,0,${0.35 * intensity}),
  0 ${1 * intensity}px 0 rgba(255,255,255,${0.12 * intensity}) inset,
  0 -${2 * intensity}px ${3 * intensity}px rgba(0,0,0,${0.35 * intensity}) inset
`;

// A sunken/inset physical recess (a socket a part sits inside).
export const bevelSunken = (intensity = 1) => `
  inset 0 ${2 * intensity}px ${5 * intensity}px rgba(0,0,0,${0.6 * intensity}),
  inset 0 -${1 * intensity}px 0 rgba(255,255,255,${0.06 * intensity}),
  0 1px 0 rgba(255,255,255,0.08)
`;

// Standard countersunk screw/rivet — a real, tiny, recurring detail every
// physical device has. Sized via `size` (px); positioned by the caller.
export const screwCss = `
  border-radius: 50%;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.5), transparent 40%),
    radial-gradient(circle at 35% 30%, #9a9a9e, #1a1a1c 72%);
  box-shadow: 0 1px 1px rgba(255,255,255,0.2), 0 1px 2px rgba(0,0,0,0.6);

  &::after {
    content: '';
    position: absolute;
    inset: 32% 12%;
    background: rgba(0,0,0,0.55);
    border-radius: 1px;
  }
`;
