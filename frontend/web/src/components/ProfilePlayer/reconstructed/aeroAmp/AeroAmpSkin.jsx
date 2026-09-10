import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { fmtTime, ratioFromClientX, safeSetPointerCapture, prefersReducedMotion } from '../../shared/audioControls';
// FASE 15 — optional hybrid WebGL optics layer (true screen-space
// refraction of the real SVG below it — see optics/CrystalRenderer.jsx's
// header comment for what changed from Fase 14). Renders no UI of its own
// and is only ever mounted when the browser actually supports WebGL and the
// user hasn't asked for reduced motion — see `opticsQuality` below.
import CrystalRenderer from './optics/CrystalRenderer';
// (no material helpers imported from ../materials — Block 4 removed the last
// consumers, aa-btn/aa-btnAccent; the ice-crystal material system below is
// authored directly in this file's own <defs>, not via ../materials helpers)

// LIQUID ICE SHELL — separate architecture from CrystalRenderer above (that
// one stays frozen/historical, per its own file). This mounts a REAL 3D
// mesh (extruded from the same chamfered silhouette the SVG shell draws)
// with a physically-based transmission material, sampling a synthetic
// studio environment for its reflections — replacing the earlier SVG
// reflection-overlay experiment, which had no surface normal or
// environment to sample and so could only paint fake highlights. It
// mounts BELOW BodySvg (never captures/replaces it) — see LiquidIceShell's
// own header for the full contract.
import LiquidIceShell from './optics/LiquidIceShell';

/*
 * AEROAMP — original composition (no traced reference; the brief was a
 * written Frutiger Aero / Y2K description plus a reference photo of a
 * translucent-plastic handheld, not a source sheet to trace). Priorities,
 * in order: (1) the shell reads as real glossy/translucent gel plastic —
 * layered gradient + blurred specular highlights + a hint of grain, never a
 * flat tinted div; (2) a genuine 8-bit LCD porthole with a small animated
 * pixel mascot (idle bob + blink, both real CSS keyframes, both skipped
 * under prefers-reduced-motion); (3) scattered ambient bubble decoration
 * (star glyphs removed in the INDUSTRIAL DESIGN FINAL PASS — "Frutiger
 * Aero no es fantasía espacial").
 * Every interactive control keeps the exact hit-boxes, aria-labels and
 * handlers proven working in the previous pass — only the paint changed.
 */

const VIEW_W = 600;
const VIEW_H = 300;
const BAR_COUNT = 14;
const BAR_BASE_Y = 152;
const BAR_MAX_H = 34;

// FASE 6 — corner facets: a straight 45°-cut chamfer at each corner instead
// of the smooth rounded corners the shell had through Bloque 5. Same
// rectangular footprint and bounding box as before — only the 4 corners
// change, which is what sells "cut ice / polished glass edge" without the
// silhouette turning into a hexagon or a gem (explicitly out of scope).
// Layering several of these at slightly different insets/corner sizes is
// also what gives the shell its "double bevel" / visible thickness, since
// each layer's chamfer edge peeks out from behind the one in front of it.
function chamferedRectPath(x, y, w, h, c) {
  const x2 = x + w;
  const y2 = y + h;
  return `M${x + c} ${y} H${x2 - c} L${x2} ${y + c} V${y2 - c} L${x2 - c} ${y2} H${x + c} L${x} ${y2 - c} V${y + c} Z`;
}

// Perimeter of that same chamfered rect (sum of its 8 straight segments) —
// used to size the FASE 7 stroke-dasharray pattern so the "hot arc / dark
// gap" pattern is proportioned to the actual path instead of guessed.
function chamferedRectPerimeter(w, h, c) {
  const straightH = w - 2 * c;
  const straightV = h - 2 * c;
  const diag = c * Math.SQRT2;
  return 2 * straightH + 2 * straightV + 4 * diag;
}

const floatBubble = keyframes`
  0% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.55; }
  50% { transform: translate3d(4px, -14px, 0) scale(1.08); opacity: 0.9; }
  100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.55; }
`;

// FASE 9 — very small, slow drift for the "plano medio" (fracture veins)
// and "plano frontal" (micro-frost) depth layers, so the faceted ice reads
// as three physically separated planes instead of one flat texture stack.
// Amplitude is deliberately tiny (1-2px) — this is parallax life, not a
// decoration that draws the eye.
const iceDriftMed = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(-1.4px, 1px, 0); }
`;
const iceDriftFront = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(1px, -1.6px, 0); }
`;

const pixelBob = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-1px); }
`;

const pixelBlink = keyframes`
  0%, 90%, 100% { opacity: 1; }
  92%, 97% { opacity: 0; }
`;

const reducedMotionOff = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
  }
`;

const Wrap = styled.div`
  --shell: ${({ $p }) => $p.shell};
  --shellDeep: ${({ $p }) => $p.shellDeep};
  --bezel: ${({ $p }) => $p.bezel};
  --display: ${({ $p }) => $p.display};
  --screenPixel: ${({ $p }) => $p.screenPixel};
  --text: ${({ $p }) => $p.text};
  --accent: ${({ $p }) => $p.accent};
  --accentSoft: ${({ $p }) => $p.accentSoft};
  --button: ${({ $p }) => $p.button};
  --buttonShadow: ${({ $p }) => $p.buttonShadow};
  --bubble: ${({ $p }) => $p.bubble};
  --ledOff: ${({ $p }) => $p.ledOff};
  --ledOn: ${({ $p }) => $p.ledOn};

  /* FASE 10 — audio-reactive ice. Written directly to this node's style by
     the existing analyser rAF loop (no React state churn at 60fps, same
     rule the VU bars already follow) — defaulted here so every reader that
     does var(--audioGlow, ...) etc. has a sane value even before the first
     frame runs, and idle()/no-analyser states reset them to these same
     baselines instead of leaving stale values from a previous track. */
  --audioGlow: 0;
  --audioIcePulse: 0;
  --audioRefraction: 0;

  position: relative;
  width: 100%;
  max-width: 460px;
  aspect-ratio: ${VIEW_W} / ${VIEW_H};
  font-family: 'Segoe UI', system-ui, sans-serif;
  filter: drop-shadow(0 10px 18px rgba(20, 60, 90, 0.4));
  user-select: none;

  /* Bloque 5 — Aero Environment Finishing Layer: an ambient cyan/blue glow
     bleeding out past the shell's own silhouette (sits behind everything,
     z-index -1) plus a diagonal light sheen laid over the whole device on
     top of it (pointer-events: none, so it never blocks the real buttons
     underneath) — the two touches that make the object read as sitting
     inside the same lit environment as its background, not pasted on it. */
  &::before {
    content: '';
    position: absolute;
    inset: -25px;
    border-radius: 60px;
    background:
      radial-gradient(circle at 30% 20%, rgba(120, 240, 255, 0.25), transparent 45%),
      radial-gradient(circle at 80% 80%, rgba(100, 170, 255, 0.18), transparent 40%);
    filter: blur(30px);
    z-index: -1;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 34px;
    background: linear-gradient(120deg, rgba(255, 255, 255, 0.35), transparent 30%);
    pointer-events: none;
  }
`;

const BodySvg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  /* FASE 15 — once CrystalRenderer's first real capture of THIS element
     lands (see $crystalReady / onFirstCapture in the component body), the
     WebGL layer above is showing a refracted photo of this exact SVG. Left
     at full opacity, that reads as a double image — the real shell plus a
     slightly-shifted refracted copy of it, ghosting at every edge. Fading
     the real SVG down (never hiding it outright — it's still the fallback
     if capture ever fails, and it's still what CrystalRenderer captures
     FROM, at full effective color, since resolving computed style reads
     each element's own opacity, not this root's) leaves a single coherent
     image. Pure CSS opacity — no element, hitbox or filter is removed. */
  opacity: ${({ $crystalReady }) => ($crystalReady ? 0.14 : 1)};
  transition: opacity 0.5s ease;
`;

// Real optical transparency, not a color trick: blurs whatever is actually
// behind the shell (the app's animated background) so the shell reads as
// something you see *through*, the way frosted ice or gel plastic really
// works. Sits between BodySvg and the shell's own SVG fill (which is left
// semi-opaque via fill-opacity so this blur shows through it too). No-op
// where backdrop-filter isn't supported — the layered SVG gradients still
// carry the look on their own.
const GlassBackdrop = styled.div`
  position: absolute;
  inset: 8px 6px;
  border-radius: 32px;
  backdrop-filter: blur(14px) saturate(1.5);
  -webkit-backdrop-filter: blur(14px) saturate(1.5);
  pointer-events: none;
`;

const pct = (v, total) => `${(v / total) * 100}%`;
const box = (x, y, w, h) => ({ left: pct(x, VIEW_W), top: pct(y, VIEW_H), width: pct(w, VIEW_W), height: pct(h, VIEW_H) });

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

const HitCircle = styled.button`
  position: absolute;
  border: none;
  border-radius: 50%;
  background: transparent;
  padding: 0;
  cursor: pointer;
  pointer-events: auto;
  -webkit-tap-highlight-color: transparent;
  &:disabled { cursor: not-allowed; opacity: 0.4; }
  &:active:not(:disabled) { filter: brightness(0.88) saturate(1.1); transform: scale(0.96); }
  &:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
`;

const HitPill = styled(HitCircle)`
  border-radius: 999px;
`;

const DisplayText = styled.div`
  position: absolute;
  pointer-events: none;
  color: var(--text);
  overflow: hidden;
  font-family: 'Consolas', 'Courier New', monospace;
`;

const TitleLine = styled.div`
  font-size: clamp(9px, 1.9vw, 13px);
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ArtistLine = styled.div`
  font-size: clamp(7px, 1.3vw, 9.5px);
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 3px;
`;

const TimeText = styled.div`
  position: absolute;
  font-family: 'Consolas', monospace;
  font-size: clamp(7px, 1.3vw, 10px);
  color: var(--screenPixel);
  opacity: 0.75;
  text-align: right;
  pointer-events: none;
`;

// Background is transparent on purpose (Bloque 5): the groove is now drawn
// as real SVG glass in BodySvg (Crystal Seek Light Bar, same coordinates —
// box(30, 172, 540, 14)) so it's made of the same material as the rest of
// the shell instead of a flat CSS-colored div sitting on top of it.
const SeekTrack = styled.div`
  position: absolute;
  border-radius: 7px;
  background: transparent;
  overflow: hidden;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: inset 0 1px 3px rgba(0, 10, 20, 0.5);
`;

const SeekFill = styled.div`
  position: absolute;
  inset: 0;
  width: ${({ $pct }) => $pct}%;
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 85%, #fff), var(--accent));
`;

/* SEEK PHYSICAL CHANNEL — level 3, liquid capsule fill. A separate
   component (not a SeekFill restyle) on purpose: PillFill below extends
   SeekFill for the volume pill, which must keep its current flat look —
   only the seek bar's own fill gets the capsule treatment. Was a flat
   2-stop CSS gradient (light accent -> accent), which is exactly what
   reads as "web progress bar". A real gel capsule has three things a flat
   gradient doesn't: a thin bright cap (not the whole top half), a
   medium-saturated body doing most of the work, and a deeper/denser edge
   right at the bottom rim where the material is thickest. */
const SeekCapsuleFill = styled(SeekFill)`
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.65) 0%,
    rgba(255, 255, 255, 0.65) 6%,
    color-mix(in srgb, var(--accent) 88%, #fff) 6%,
    var(--accent) 55%,
    color-mix(in srgb, var(--accent) 65%, #4a0f2e) 100%
  );
`;

/* VOLUME SLIDER — physical control, replacing the flat "VOL 70" CSS pill.
   Same split as the seek bar: static channel/rail drawn as real SVG glass
   in BodySvg (reusing aa-seekRail — already "aqua profundo", not
   duplicated), only the dynamic fill/thumb live here as HTML so their
   width/position can react to `volume` on every render. Deliberately its
   own component, not a SeekFill/SeekCapsuleFill restyle — the whole point
   is this must NOT share the seek's pink. */
const VolumeTrack = styled.div`
  position: absolute;
  border-radius: 7px;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  &:focus-visible {
    box-shadow: 0 0 0 2px rgba(125, 239, 255, 0.55);
  }
`;

const VolumeCapsuleFill = styled.div`
  position: absolute;
  inset: 0;
  width: ${({ $pct }) => $pct}%;
  border-radius: 5px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.55) 0%,
    rgba(255, 255, 255, 0.55) 8%,
    #7defff 8%,
    #2fb0e0 55%,
    #146a94 100%
  );
`;

const VolumeThumb = styled.div`
  position: absolute;
  top: 50%;
  left: ${({ $pct }) => $pct}%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(${({ $dragging }) => ($dragging ? 0.9 : 1)});
  background: radial-gradient(circle at 35% 30%, #eafcff 0%, #7defff 35%, #146a94 100%);
  box-shadow: 0 1px 2px rgba(4, 20, 35, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.5);
  pointer-events: none;
  transition: transform 0.08s ease;
`;

const PillLabel = styled.span`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(8px, 1.5vw, 10px);
  font-weight: 700;
  letter-spacing: 1.5px;
  color: var(--display);
  pointer-events: none;
`;

// Bloque 5: real drop-of-condensation shading (bright 28%-corner hotspot,
// a cyan mid-tone ring, a soft blue falloff) plus an inset+outer glow via
// box-shadow instead of the flat two-stop radial the bubbles had before —
// same floatBubble animation/props, just a richer material.
const Bubble = styled.div`
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(
    circle at 28% 22%,
    rgba(255, 255, 255, 0.95),
    rgba(255, 255, 255, 0.45) 8%,
    rgba(100, 230, 255, 0.35) 35%,
    rgba(0, 120, 200, 0.18) 60%,
    transparent 75%
  );
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow:
    inset 0 0 8px rgba(255, 255, 255, 0.8),
    0 0 14px rgba(100, 230, 255, 0.45);
  pointer-events: none;
  animation: ${floatBubble} ${({ $dur }) => $dur}s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay}s;
  ${reducedMotionOff}
`;

const QueuePanel = styled.div`
  position: absolute;
  left: 5%;
  top: 4%;
  width: 90%;
  max-height: 92%;
  overflow-y: auto;
  background: color-mix(in srgb, var(--screenPixel) 92%, #063B66 8%);
  border: 1px solid color-mix(in srgb, var(--accentSoft) 50%, transparent);
  border-radius: 10px;
  pointer-events: auto;
  padding: 6px;
  z-index: 5;
  box-shadow: 0 8px 20px rgba(0, 10, 20, 0.5);
`;

const QueueItem = styled.div`
  padding: 5px 8px;
  font-size: 11px;
  color: ${({ $active }) => ($active ? 'var(--accent)' : 'var(--display)')};
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  cursor: pointer;
  border-radius: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  &:hover { background: rgba(255, 255, 255, 0.08); }
`;

const MascotGroup = styled.g`
  animation: ${pixelBob} 1.8s steps(2) infinite;
  ${reducedMotionOff}
`;

// FASE 9 — ice internal depth system. Three explicit planes instead of one
// flat decorative layer: PlaneFrontal (micro-frost/specular, crisp, no
// blur, sits visually closest), PlaneMedio (the fracture veins — the
// layer that used to be the only one), and PlaneProfundo (trapped bubbles
// + dark depth pockets, most blurred, sits visually deepest). Each gets
// its own opacity/blur/motion so the ice reads as several sheets of glass
// stacked with real distance between them, not a single busy texture.
const PlaneFrontal = styled.g`
  animation: ${iceDriftFront} 9s ease-in-out infinite;
  ${reducedMotionOff}
`;
const PlaneMedio = styled.g`
  animation: ${iceDriftMed} 13s ease-in-out infinite;
  ${reducedMotionOff}
`;
// PlaneProfundo intentionally has no animation — it's the farthest layer,
// and real background depth doesn't visibly drift the way a closer surface
// does; motion there would read as an error, not depth.
const PlaneProfundo = styled.g``;

const EyePixel = styled.rect`
  animation: ${pixelBlink} 4.5s steps(1) infinite;
  ${reducedMotionOff}
`;

// Original 12x10 pixel mascot — a small round "bubble ghost" (ties back to
// the Frutiger-Aero bubble motif used in the decoration) drawn as a dark
// silhouette on the pale LCD, the way a real monochrome handheld screen
// renders sprites. Defined as row spans rather than a hand-typed coordinate
// list so the shape stays legible/editable.
const MASCOT_BODY_ROWS = [
  [3, 8], [2, 9], [1, 10], [0, 11], [0, 11], [0, 11], [0, 11], [0, 11], [0, 11]
];
const MASCOT_BODY = MASCOT_BODY_ROWS.flatMap(([from, to], row) =>
  Array.from({ length: to - from + 1 }, (_, i) => [from + i, row])
);
const MASCOT_FEET = [[0, 9], [1, 9], [3, 9], [4, 9], [6, 9], [7, 9], [9, 9], [10, 9]];
const MASCOT_EYES = [[3, 5], [8, 5]];
const MASCOT_HILITE = [[3, 1], [4, 2]];
const MASCOT_PX = 6;

function renderPixels(coords, fill, offsetX, offsetY) {
  return coords.map(([c, r], i) => (
    <rect key={i} x={offsetX + c * MASCOT_PX} y={offsetY + r * MASCOT_PX} width={MASCOT_PX} height={MASCOT_PX} fill={fill} />
  ));
}

// Real Aqua/Frutiger-Aero glossy-button recipe (per makeaero.com's generated
// CSS and the classic ::before diagonal "Web 2.0 glare" + ::after top-cap
// technique): a CRISP top highlight cap plus a crisp diagonal sweep, clipped
// to the button's own circle, topped with one small sharp specular dot. The
// earlier version only had a single blurred ellipse — soft blur alone reads
// as a flat painted smudge, not glass; the sharp-edged layers are what
// actually sell "light bouncing off a convex wet surface".
function ButtonGloss({ id, cx, cy, r }) {
  return (
    <>
      <clipPath id={id}>
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill="url(#aa-topCap)" />
        <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill="url(#aa-diagSweep)" style={{ mixBlendMode: 'screen' }} />
      </g>
      <circle cx={cx - r * 0.4} cy={cy - r * 0.45} r={Math.max(1.6, r * 0.15)} fill="#ffffff" opacity="0.92" />
    </>
  );
}

// INDUSTRIAL DESIGN FINAL PASS — "eliminar estrellas... sustituir por
// burbujas." STAR_DECOR (five ambient sparkle glyphs floating in the air
// around the shell) is gone; its five scatter positions/timings are kept
// here, just re-typed as bubbles rather than dropped, so the surrounding
// composition doesn't suddenly look empty on one side. BUBBLE_DECOR's own
// original six entries are unchanged.
const BUBBLE_DECOR = [
  { x: '3%', y: '8%', size: 18, dur: 4.2, delay: 0 },
  { x: '93%', y: '14%', size: 13, dur: 5, delay: 0.6 },
  { x: '6%', y: '82%', size: 15, dur: 4.6, delay: 1.1 },
  { x: '96%', y: '76%', size: 10, dur: 3.8, delay: 0.3 },
  { x: '88%', y: '90%', size: 8, dur: 3.4, delay: 1.6 },
  { x: '1%', y: '48%', size: 9, dur: 4.4, delay: 0.9 },
  { x: '1%', y: '32%', size: 12, dur: 2.6, delay: 0 },
  { x: '97%', y: '38%', size: 10, dur: 3.1, delay: 0.8 },
  { x: '90%', y: '4%', size: 8, dur: 2.9, delay: 1.4 },
  { x: '4%', y: '92%', size: 9, dur: 3.3, delay: 0.4 },
  { x: '80%', y: '95%', size: 7, dur: 2.7, delay: 1.9 }
];

// Bloque 5 — tiny motionless flecks of frost suspended inside the ice
// itself (as opposed to BUBBLE_DECOR/STAR_DECOR, which float in the air
// around the shell): [xPercent, yPercent, sizePx].
const FROZEN_PARTICLES = [
  [18, 22, 4],
  [82, 18, 3],
  [12, 65, 5],
  [91, 72, 4],
  [70, 90, 3],
  [30, 88, 2]
];

export default function AeroAmpSkin({
  avatarUrl,
  track,
  mode,
  modeLabel,
  isActive,
  isPlaying,
  hasQueue,
  onToggleEar,
  onTogglePlay,
  onPrev,
  onNext,
  ariaLabel,
  currentTime = 0,
  duration = 0,
  onSeek = () => {},
  volume = 0.8,
  onVolumeChange = () => {},
  isFavorited = false,
  canFavorite = false,
  onToggleFavorite = () => {},
  queue = [],
  queueIndex = 0,
  onSelectTrack = () => {},
  palette,
  getAnalyser
}) {
  const playing = isActive && isPlaying;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const seekRef = useRef(null);
  const volRef = useRef(null);
  const wrapRef = useRef(null);
  // FASE 15 — a ref straight to the real <BodySvg> DOM node, handed down to
  // CrystalRenderer so it can rasterize the ACTUAL shell (buttons, LCD,
  // track pill — whatever is really on screen) into a texture and refract
  // that, instead of a synthetic stand-in scene. Read-only from
  // CrystalRenderer's side; nothing here ever writes through it.
  const svgRef = useRef(null);
  // FASE 15 — flips true exactly once, the first time CrystalRenderer
  // successfully captures svgRef into a texture (see BodySvg's
  // $crystalReady above). Real React state on purpose, unlike the 60fps
  // refs elsewhere in this file — this changes once per mount, not once
  // per frame, so it's cheap and it's what drives BodySvg's opacity
  // transition.
  const [crystalReady, setCrystalReady] = useState(false);
  const [draggingVol, setDraggingVol] = useState(false);
  // VOLUME MUTE — no second volume system: `volume` (prop, real audio via
  // onVolumeChange -> ProfilePlayer's handleVolumeChange -> audio.volume)
  // stays the only source of truth. This just remembers what to restore on
  // unmute. null = not muted. Any manual interaction with the slider clears
  // it (see setVol/adjustVol below) so "drag out of mute" falls out for
  // free instead of needing special-cased logic.
  const [mutedVolume, setMutedVolume] = useState(null);
  const [showQueue, setShowQueue] = useState(false);
  const barRefs = useRef([]);
  // FASE 14.6 — the same low/mid/high split that already drives
  // --audioGlow/--audioIcePulse/--audioRefraction (Fase 10), mirrored into
  // a plain ref for CrystalRenderer's shader uniforms — same
  // no-React-state-in-a-60fps-loop rule as glLightRef above.
  const audioLevelsRef = useRef({ low: 0, mid: 0, high: 0 });

  // FASE 8 — dynamic light. Position in real SVG viewBox units (not 0..1)
  // so it can be fed straight into the aa-dynamicHighlight gradient's
  // userSpaceOnUse cx/cy and into the sweep-rotation math below with no
  // extra conversion at render time. Default matches where the old static
  // highlight/aa-iceRefraction hotspot used to sit (~35%, 20%), so the very
  // first paint — and any reduced-motion session, which never updates this
  // — looks the same as it always did.
  const DEFAULT_LIGHT = { x: VIEW_W * 0.35, y: VIEW_H * 0.2 };
  const [light, setLight] = useState(DEFAULT_LIGHT);
  // FASE 14 — the same cursor position, mirrored into a plain ref in the
  // -1..1 range Three.js/shader uniforms expect (y flipped: screen-down vs
  // GL-up). A ref rather than more React state on purpose — CrystalRenderer
  // reads it inside its own useFrame loop every frame, and R3F's render loop
  // is already independent of React's; routing it through setState would
  // just add React re-renders that nothing downstream needs.
  const glLightRef = useRef({ x: -0.3, y: 0.6 });

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const el = wrapRef.current;
    if (!el) return undefined;
    let raf = null;
    let pending = null;
    const flush = () => {
      raf = null;
      if (pending) setLight(pending);
    };
    const handleMove = (e) => {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const ny = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      pending = { x: nx * VIEW_W, y: ny * VIEW_H };
      glLightRef.current = { x: nx * 2 - 1, y: -(ny * 2 - 1) };
      if (raf == null) raf = requestAnimationFrame(flush);
    };
    const handleLeave = () => {
      pending = DEFAULT_LIGHT;
      glLightRef.current = { x: -0.3, y: 0.6 };
      if (raf == null) raf = requestAnimationFrame(flush);
    };
    // pointermove/pointerleave only — never intercepts clicks, and doesn't
    // touch pointer-events on any element, so every existing HitCircle/
    // HitPill/SeekTrack/PillTrack interaction keeps working exactly as
    // before.
    el.addEventListener('pointermove', handleMove);
    el.addEventListener('pointerleave', handleLeave);
    return () => {
      el.removeEventListener('pointermove', handleMove);
      el.removeEventListener('pointerleave', handleLeave);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, []);

  // Diagonal sweep reflection rotates a little toward wherever the light
  // is — clamped to a subtle ±16° so it reads as "the reflection shifts
  // with the light" rather than a needle spinning to track the cursor.
  const lightAngleDeg = Math.max(-16, Math.min(16,
    (Math.atan2(light.y - VIEW_H / 2, light.x - VIEW_W / 2) * 180) / Math.PI / 4
  ));
  // Aliases matching the aa-dynamicHighlight gradient's cx/cy props below.
  const lightX = light.x;
  const lightY = light.y;

  // FASE 7 — "no stroke uniforme": break the outer Fresnel band into 4
  // unequal dash/gap pairs around its own perimeter instead of one
  // continuous line, so parts of the rim visibly disappear and others
  // stay lit — computed from the real chamfered path length rather than
  // guessed numbers, so it stays correct if the shell's size ever changes.
  const SHELL_C = 30;
  const shellPerimeter = chamferedRectPerimeter(580, 280, SHELL_C);
  const fresnelDasharray = [0.22, 0.06, 0.14, 0.09, 0.27, 0.05, 0.12, 0.05]
    .map((f) => (f * shellPerimeter).toFixed(1))
    .join(' ');

  const seek = (clientX) => {
    if (!duration) return;
    onSeek(ratioFromClientX(seekRef, clientX) * duration);
  };
  const setVol = (clientX) => {
    if (mutedVolume !== null) setMutedVolume(null);
    onVolumeChange(Math.round(ratioFromClientX(volRef, clientX) * 100) / 100);
  };
  const adjustVol = (delta) => {
    if (mutedVolume !== null) setMutedVolume(null);
    onVolumeChange(Math.round(Math.max(0, Math.min(1, volume + delta)) * 100) / 100);
  };
  // Mute/unmute through the exact same real onVolumeChange channel as the
  // slider — muting remembers the current volume and calls
  // onVolumeChange(0); unmuting restores it. Keyed off `volume > 0` rather
  // than a separate isMuted flag, so a volume that reached 0 by dragging
  // (not via this button) is still treated as "silent, click to restore"
  // instead of the button doing nothing.
  const toggleMute = () => {
    if (volume > 0) {
      setMutedVolume(volume);
      onVolumeChange(0);
    } else {
      onVolumeChange(mutedVolume ?? 0.7);
      setMutedVolume(null);
    }
  };

  const hasTrack = Boolean(track);
  const title = hasTrack
    ? track.title
    : (mode === 'favorites' ? 'Sin favoritas todavía' : mode === 'radio' ? 'Radio sin señal' : 'AEROAMP VACÍO');
  const artist = hasTrack
    ? (track.owner_username ? `@${track.owner_username}` : modeLabel)
    : 'Subí música a tu perfil para escuchar';

  // Real audio-reactive bars: pulled straight from the shared AnalyserNode's
  // frequency data every frame and written directly to the SVG rects (no
  // React state churn at 60fps). Heights are quantized to a handful of
  // discrete steps for an 8-bit VU-meter feel rather than a smooth curve.
  // Falls back to a flat idle line when there's no analyser (e.g. the
  // Settings preview carousel), audio isn't playing, or reduced motion.
  //
  // FASE 10 — same loop, same frequency data, additionally split into
  // low/mid/high bands and written as --audioGlow/--audioIcePulse/
  // --audioRefraction custom properties on the Wrap node (imperative style
  // writes, exactly like the bar rects — no extra React state, no extra
  // re-renders). Nothing about the existing bar-height writes below changed.
  useEffect(() => {
    let raf;
    const bars = barRefs.current;
    const wrapEl = wrapRef.current;
    const setAudioVars = (glow, pulse, refraction) => {
      if (!wrapEl) return;
      wrapEl.style.setProperty('--audioGlow', glow.toFixed(3));
      wrapEl.style.setProperty('--audioIcePulse', pulse.toFixed(3));
      wrapEl.style.setProperty('--audioRefraction', refraction.toFixed(3));
    };
    const idle = () => {
      bars.forEach((el) => {
        if (!el) return;
        el.setAttribute('height', '2');
        el.setAttribute('y', String(BAR_BASE_Y - 2));
      });
      setAudioVars(0, 0, 0);
      audioLevelsRef.current = { low: 0, mid: 0, high: 0 };
    };

    if (!playing || prefersReducedMotion() || typeof getAnalyser !== 'function') {
      idle();
      return undefined;
    }
    const analyser = getAnalyser();
    if (!analyser) {
      idle();
      return undefined;
    }
    const data = new Uint8Array(analyser.frequencyBinCount);
    const STEPS = 6;
    const STEP_H = BAR_MAX_H / STEPS;
    const bandAvg = (from, to) => {
      let sum = 0;
      let n = 0;
      for (let i = from; i < to; i += 1) { sum += data[i]; n += 1; }
      return n ? sum / n / 255 : 0;
    };
    const loop = () => {
      analyser.getByteFrequencyData(data);
      for (let i = 0; i < bars.length; i += 1) {
        const el = bars[i];
        if (!el) continue;
        const bin = Math.min(data.length - 1, Math.floor((i / bars.length) * data.length));
        const v = data[bin] / 255;
        const h = Math.max(2, Math.round((v * BAR_MAX_H) / STEP_H) * STEP_H);
        el.setAttribute('height', h.toFixed(1));
        el.setAttribute('y', (BAR_BASE_Y - h).toFixed(1));
      }
      // Low/mid/high thirds of the frequency range — coarse on purpose,
      // this drives ambient material glow, not a spectrum analyzer.
      const third = Math.max(1, Math.floor(data.length / 3));
      const low = bandAvg(0, third);
      const mid = bandAvg(third, third * 2);
      const high = bandAvg(third * 2, data.length);
      setAudioVars(low, mid, high);
      audioLevelsRef.current = { low, mid, high };
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, getAnalyser]);

  const barWidth = 22;
  const barGap = 6;
  const barsTotalWidth = BAR_COUNT * barWidth + (BAR_COUNT - 1) * barGap;
  const barsStartX = 140 + (420 - barsTotalWidth) / 2;

  // screenY was 58, putting the mascot/avatar module's own top edge
  // (screenY - 4 = 54) 6 units ABOVE the LCD glass panel's real top edge
  // (the "LCD glass surface" rect is y=60, height=90) — since the module
  // is ALSO exactly 90 tall (screenSize + 8), it should share the LCD's
  // exact y-range (60 to 150) instead of overshooting the top and falling
  // short at the bottom. 64 - 4 = 60, matching the LCD's own top exactly.
  const screenX = 44, screenY = 64, screenSize = 82;
  const mascotX = screenX + (screenSize - 72) / 2;
  // Measured centered (10px/12px margins, symmetric) by real bounding-box
  // math, but the ghost shape itself is optically top-heavy — a round head
  // filling most of its width up top vs thin, gapped feet at the bottom —
  // so mathematically-centered still reads as "stuck to the top". +4 is a
  // deliberate optical rebalance, not a coordinate fix.
  const mascotY = screenY + (screenSize - 60) / 2 + 4;

  // FASE 14.7 — quality gate for the optional WebGL layer. Reduced-motion
  // disables it outright (matching every other animation path in this file);
  // otherwise a very cheap heuristic (core count) picks between the 'high'
  // and 'medium' particle-count/capture-rate presets defined in
  // CrystalRenderer. There is no explicit 'low' value — 'low' in the
  // Fase 14.7/15.10 spec means "WebGL disabled, SVG-only fallback," which
  // is simply opticsQuality === null here.
  //
  // BASELINE DECISION (confirmed live, on-screen, by the user watching their
  // own tab — not a static screenshot): the bright pre-handoff SVG (this
  // state) reads better than what CrystalRenderer actually produces once it
  // takes over — the real observed behavior was "bright for ~1s, then goes
  // dark the instant WebGL takes control," and dark lost. Forced off here
  // by never mounting it (opticsQuality always null), not by deleting
  // CrystalRenderer/optics/* — those stay on disk untouched in case a later,
  // more targeted attempt (e.g. WebGL confined to the shell's edges/
  // reflections only, never over the LCD or buttons) is worth trying.
  const opticsQuality = useMemo(() => null, []);

  // LIQUID ICE SHELL quality gate — independent of opticsQuality above (that
  // one is CrystalRenderer's, frozen off). Same real-support checks
  // (reduced-motion, WebGL availability, a cheap core-count heuristic) so
  // this never mounts where it can't run, and never needs a runtime
  // fallback path — if it's null, the SVG shell below is already a
  // complete, correct player at full opacity.
  // TEMP re-enabled for pipeline test series (Test 1-5) — see
  // optics/LiquidIceShell.jsx. Not the final gate; revert to null if the
  // series doesn't produce visible output.
  const liquidShellQuality = useMemo(() => 'high', []);
  // Only the shell's own fill layers (Outer silhouette + Main crystal
  // volume) dim to let the 3D mesh read through — never BodySvg globally,
  // so LCD/buttons/text/mascot/seek stay at their real opacity always.
  const shellBaseOpacity = liquidShellQuality ? 0.15 : 1;

  return (
    <Wrap ref={wrapRef} $p={palette} data-skin-root="aero-amp">
      <GlassBackdrop />
      {liquidShellQuality && <LiquidIceShell quality={liquidShellQuality} />}
      <BodySvg ref={svgRef} $crystalReady={crystalReady} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* ============================================================
              AEROAMP ICE CRYSTAL ENGINE — MATERIAL SYSTEM v2
              Frutiger Aero + Vista Glass + Liquid Ice (BLOQUE 1/5)
              Hardcoded hex by design — this is AeroAmp's fixed "ice"
              identity, not driven by --shell/--accent like the rest of
              the palette system (confirmed). The legacy defs below are
              kept alongside these until Blocks 2-5 land, since the LCD/
              button/pill JSX further down still references them — each
              legacy id gets removed only once its consumer is replaced.
          ============================================================ */}

          {/* ---------- BASE ICE VOLUME ----------
              IDEA #12 checkpoint: replaces the old 6-stop translucent
              linear falloff (white 0.92 -> navy 0.88, every stop diluted
              by its own opacity — the actual source of the "papel/leche"
              read) with the real 3-stop recipe from Make Aero's Glossy
              Orb Generator (makeaero.com/orb): light center -> saturated
              mid -> dark saturated edge, same oklch(L% C H) constant-hue
              approach, re-centered as a radial (not linear) so the shell
              reads as one lit volume instead of a vertical stripe. Center
              stop is a faint aqua-tinted near-white (not literal #fff) per
              explicit instruction to avoid a milky highlight. No new
              highlight layer added — aa-hardSpecular/aa-dynamicHighlight
              below already cover that role; duplicating it here was
              explicitly ruled out. */}
          <radialGradient id="aa-iceVolume" cx="35%" cy="35%" r="75%">
            <stop offset="0%" stopColor="oklch(90% 0.045 205)" stopOpacity="0.95" />
            <stop offset="50%" stopColor="oklch(62% 0.19 205)" />
            <stop offset="100%" stopColor="oklch(32% 0.19 205)" />
          </radialGradient>

          {/* SEEK PHYSICAL CHANNEL — level 2, inner rail. Clean dark aqua,
              no glow, no white — the discrete "unplayed" surface distinct
              from the outer cavity walls (those already exist below, in
              CRYSTAL SEEK LIGHT BAR, and are left untouched: dark base +
              aa-iceDepth + top highlight + fresnel already read as a real
              recessed channel). */}
          <linearGradient id="aa-seekRail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1c5478" />
            <stop offset="100%" stopColor="#0a2c40" />
          </linearGradient>

          <linearGradient id="aa-iceDepth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
            <stop offset="35%" stopColor="#0c5b86" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#063B66" stopOpacity="0.85" />
          </linearGradient>

          <radialGradient id="aa-iceRefraction" cx="35%" cy="20%" r="80%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="18%" stopColor="#dfffff" stopOpacity="0.55" />
            <stop offset="42%" stopColor="#79ddff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0070b0" stopOpacity="0" />
          </radialGradient>

          {/* IDEA (CORNER LIGHT BLEED) — unlike aa-iceRefraction above (a
              broad top-left-biased wash covering most of the shell), these
              two are deliberately small and corner-confined: a real light
              source concentrated in one corner, plus a much weaker answer
              at the diagonally opposite corner, not a symmetric decoration.
              Drawn as objectBoundingBox radials on small ellipses, userSpace
              position chosen so their meaningful extent stays inside the
              shell's own thickness near each corner — and even where they
              geometrically reach further in, the LCD rect (aa-lcdGrad) and
              every button below are painted later/opaque and cover them, so
              this can't wash the screen or controls regardless. */}
          <radialGradient id="aa-cornerBleedMain" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f2fdff" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#8fe6ff" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#8fe6ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="aa-cornerBleedWeak" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3fa8d8" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3fa8d8" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="aa-auroraBlue" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7df5ff" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#24bfff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#008cff" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="aa-auroraWhite" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="aa-fresnel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="20%" stopColor="#bfffff" stopOpacity="0.8" />
            <stop offset="45%" stopColor="#5debff" stopOpacity="0.55" />
            <stop offset="75%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.75" />
          </linearGradient>

          <linearGradient id="aa-hardSpecular" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="7%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="20%" stopColor="#ffffff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="aa-crystalSweep" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="48%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="54%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="75%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="aa-frostEdge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
            <stop offset="30%" stopColor="#ffffff" stopOpacity="0.15" />
            <stop offset="70%" stopColor="#9eeaff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.75" />
          </linearGradient>

          <filter id="aa-iceNoise" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="19" result="noise" />
            <feColorMatrix in="noise" values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 .22 0" />
          </filter>

          {/* FASE 12 — liquid glass improvement. Was a single fractalNoise
              pass; now two octave-different passes (a coarse "gel" wave and
              a fine "glass grain" ripple) combined with feComposite before
              the displacement, so the shell's distortion reads as two
              overlapping optical irregularities instead of one uniform
              wobble — closer to how glass + gel actually layer. The slow
              baseFrequency animate on the coarse pass gives the material a
              barely-perceptible living drift (guarded by
              prefers-reduced-motion, same convention as every other
              animation in this file). */}
          <filter id="aa-liquidCrystal" x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="33" result="liquidCoarse">
              {!prefersReducedMotion() && (
                <animate attributeName="baseFrequency" dur="26s" values="0.012;0.016;0.012" repeatCount="indefinite" />
              )}
            </feTurbulence>
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="liquidFine" />
            <feComposite in="liquidCoarse" in2="liquidFine" operator="arithmetic" k1="0" k2="0.75" k3="0.35" k4="0" result="liquid" />
            <feDisplacementMap in="SourceGraphic" in2="liquid" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          <filter id="aa-softBloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="22" />
          </filter>

          <filter id="aa-edgeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* ============================================================
              FASE 6-12 — faceted body, advanced Fresnel, dynamic light,
              depth planes, liquid-glass refinement. See the JSX below for
              how each of these is used; grouped here so the whole "ice
              optics" material set lives in one place. */}

          {/* FASE 6 — small bright triangular catch-light for each chamfered
              corner cut, standing in for the "small side face" a real cut
              edge would show catching light at a different angle than the
              front/back planes. */}
          <linearGradient id="aa-facetLight" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#bdf3ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#bdf3ff" stopOpacity="0" />
          </linearGradient>

          {/* FASE 7 — the Fresnel rim splits into three concentric bands
              (outer ice-white / mid translucent-cyan / inner deep-blue)
              instead of one uniform stroke. aa-fresnel above already
              serves as the outer band; these two cover mid + inner. */}
          <linearGradient id="aa-fresnelCyan" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#5debff" stopOpacity="0.05" />
            <stop offset="30%" stopColor="#5debff" stopOpacity="0.65" />
            <stop offset="55%" stopColor="#8ff2ff" stopOpacity="0.2" />
            <stop offset="80%" stopColor="#5debff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#5debff" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="aa-fresnelDeep" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a3d63" stopOpacity="0" />
            <stop offset="35%" stopColor="#0a3d63" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#062c4a" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0a3d63" stopOpacity="0.6" />
          </linearGradient>

          {/* FASE 8 — dynamic light. userSpaceOnUse (not the default
              objectBoundingBox) because cx/cy are written every frame in
              real SVG viewBox units straight from pointer position, via
              React state — see the `light` state + pointermove handler in
              the component body. Centered at the default light.x/y so the
              very first paint (before any pointer event) matches the old
              static highlight position exactly. */}
          <radialGradient id="aa-dynamicHighlight" gradientUnits="userSpaceOnUse" cx={lightX} cy={lightY} r="260">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="35%" stopColor="#bdf3ff" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#bdf3ff" stopOpacity="0" />
          </radialGradient>

          {/* FASE 12 — a second, slower/coarser turbulence pass composited
              under the existing liquid-crystal displacement, so the
              internal-depth layer gets its own irregular drift instead of
              reusing the shell's exact distortion (real gel/glass never
              refracts two different depths identically). */}
          <filter id="aa-innerFlow" x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.01" numOctaves="2" seed={41} result="flow">
              {!prefersReducedMotion() && (
                <animate attributeName="baseFrequency" dur="22s" values="0.006 0.01;0.009 0.007;0.006 0.01" repeatCount="indefinite" />
              )}
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="flow" scale="6" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          {/* FASE 9 — the faint blur that separates "plano medio" (the
              fracture veins) from "plano frontal" (crisp micro-frost) —
              deliberately tiny, this is depth cueing, not a glow effect. */}
          <filter id="aa-microBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>

          {/* FASE 8 — clips the dynamic (cursor-following) highlight and
              its ambient companions to the shell's own faceted silhouette,
              same chamfer as the "Main crystal volume" path, so the light
              never bleeds past the object's edge. */}
          <clipPath id="aa-shellClipFacet">
            <path d={chamferedRectPath(10, 10, 580, 280, 30)} />
          </clipPath>

          {/* ---------- LEGACY (still consumed below — see note above) ----------
              aa-shellGrad/aa-gloss1/aa-gloss2/aa-grain/aa-liquid/aa-bottomGlow/
              aa-iris/aa-droplet/aa-cyanBleed/aa-magentaBleed/aa-shellClip were
              removed after Block 2. aa-sheen/aa-bezelGrad/aa-screenBezelGrad
              were removed after Block 3. aa-btn/aa-btnAccent were removed
              after Block 4. aa-pillGrad and the aa-clip-pill1/2 clipPaths
              were removed after Block 5 (Bottom Controls) — grep over the
              whole file confirmed no consumer left outside the section each
              block replaced. aa-topCap/aa-diagSweep/aa-blurLg are the only
              three still standing: the mascot glow icon (aa-topCap/
              aa-diagSweep, via ButtonGloss) and the contact-shadow ellipses
              (aa-blurLg) are permanent consumers, not leftovers waiting on a
              future block. */}
          <filter id="aa-blurLg" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          {/* Crisp (unblurred) top glass cap — stops packed tight near 0%
              then a long fade, matching real Aqua/Frutiger button CSS
              (::after highlight covering ~40% height, sharp at the edge).
              This crisp layer is what a soft blur alone can't fake. Used by
              the mascot glow icon and the control-pill top highlights. */}
          <linearGradient id="aa-topCap" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="4%" stopColor="#ffffff" stopOpacity="0.92" />
            <stop offset="14%" stopColor="#ffffff" stopOpacity="0.48" />
            <stop offset="42%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          {/* The classic diagonal "Web 2.0 glare streak". Used by the mascot
              glow icon. */}
          <linearGradient id="aa-diagSweep" x1="0" y1="0" x2="1" y2="0.7">
            <stop offset="28%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="42%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="52%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="68%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="aa-barGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" style={{ stopColor: 'var(--accent)' }} />
            <stop offset="100%" style={{ stopColor: 'color-mix(in srgb, var(--accentSoft) 80%, #fff)' }} />
          </linearGradient>
          {/* Pale monochrome-LCD backing (not DisplayGlassGradient — that
              one is deliberately near-black for OLED-style skins). A real
              handheld's screen is a light, slightly vignetted panel with
              dark pixels drawn on top of it. */}
          {/* Game Boy-style warm beige/yellow screen, hardcoded like the
              rest of AeroAmp's "fixed ice identity" palette (not
              var(--display)) — a real handheld console screen color, not
              the pale-blue LCD tone this used to be. */}
          <linearGradient id="aa-lcdGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5ecc8" />
            <stop offset="100%" stopColor="#e2d28c" />
          </linearGradient>
        </defs>

        {/* ============================================================
            ICE CRYSTAL SHELL v3 (FASE 6-10)
            Faceted physical body — chamfered silhouette, 3-band Fresnel,
            cursor-driven light, 3 explicit depth planes.
            ============================================================ */}

        {/* Deep contact shadow underneath the object */}
        <ellipse cx="300" cy="306" rx="285" ry="22" fill="#063B66" opacity="0.45" filter="url(#aa-softBloom)" />

        {/* Outer silhouette: dark blue ice thickness. FASE 6 — chamfered
            corners replace the old rounded ones (same bounding box). Dims
            with shellBaseOpacity (see above) so the LIQUID ICE SHELL 3D
            mesh underneath can read through — this is the ONLY thing that
            changes when it's active, not BodySvg globally. */}
        <path d={chamferedRectPath(8, 8, 584, 284, 32)} fill="#063B66" opacity={0.85 * shellBaseOpacity} />

        {/* Main crystal volume */}
        <path d={chamferedRectPath(10, 10, 580, 280, SHELL_C)} fill="url(#aa-iceVolume)" filter="url(#aa-liquidCrystal)" opacity={shellBaseOpacity} />

        {/* CORNER LIGHT BLEED — light concentrated in the material near one
            corner (primary, top-left) with a much fainter answer at the
            opposite corner (secondary), not a symmetric decoration. screen
            blend so it reads as light adding into the gel, not paint on
            top of it. */}
        <ellipse cx="45" cy="45" rx="120" ry="95" fill="url(#aa-cornerBleedMain)" filter="url(#aa-softBloom)" style={{ mixBlendMode: 'screen' }} />
        <ellipse cx="555" cy="250" rx="95" ry="70" fill="url(#aa-cornerBleedWeak)" filter="url(#aa-softBloom)" style={{ mixBlendMode: 'screen' }} opacity="0.5" />

        {/* FASE 6 — corner facet catch-lights: a bright stroke laid exactly
            along each chamfer cut, standing in for the small angled side
            face a real cut edge shows. Brighter on the two corners nearer
            the default/ambient light (top), dimmer on the two in shadow
            (bottom) — this asymmetry is what keeps it reading as a lit 3D
            bevel instead of a decorative outline. */}
        <g strokeWidth="2.5" strokeLinecap="round" fill="none">
          <line x1="10" y1="40" x2="40" y2="10" stroke="url(#aa-facetLight)" opacity="0.9" />
          <line x1="560" y1="10" x2="590" y2="40" stroke="url(#aa-facetLight)" opacity="0.9" />
          <line x1="590" y1="260" x2="560" y2="290" stroke="#2c5878" opacity="0.35" />
          <line x1="40" y1="290" x2="10" y2="260" stroke="#2c5878" opacity="0.35" />
        </g>

        <g clipPath="url(#aa-shellClipFacet)">
          {/* Internal ocean depth — FASE 12: aa-innerFlow gives this layer
              its own slow irregular drift, separate from the shell's own
              liquidCrystal distortion. */}
          <path d="
            M42 18
            H558
            C568 18 580 30 580 46
            V252
            C580 268 568 280 552 280
            H48
            C32 280 20 268 20 252
            V46
            C20 30 32 18 48 18
            Z
          " fill="url(#aa-iceDepth)" opacity="0.55" filter="url(#aa-innerFlow)" />

          {/* Aurora light trapped inside the ice — FASE 10: swells slightly
              with bass via --audioGlow (baseline unchanged when idle/no
              analyser, since the var defaults to 0). */}
          <ellipse cx="150" cy="55" rx="230" ry="110" fill="url(#aa-auroraBlue)" filter="url(#aa-softBloom)" style={{ opacity: 'calc(0.72 + var(--audioGlow, 0) * 0.28)' }} />
          <ellipse cx="460" cy="235" rx="180" ry="80" fill="url(#aa-auroraWhite)" filter="url(#aa-softBloom)" />

          {/* Ice refraction volume + frozen micro texture — soft/textural,
              left on their original rounded rects on purpose: contrasting
              a couple of soft-edged glow layers against the crisp faceted
              shell reads as "glow radiating from inside a cut object",
              rather than every layer fighting to show off the same edge. */}
          <rect x="12" y="12" width="576" height="276" rx="34" fill="url(#aa-iceRefraction)" opacity="0.55" />
          <rect x="10" y="10" width="580" height="280" rx="34" fill="url(#aa-iceNoise)" opacity="0.22" style={{ mixBlendMode: 'overlay' }} />

          {/* Hard upper ice cap — the fixed ambient rim-light along the top
              edge (independent of the cursor, the way a room's own overhead
              light always contributes a little). */}
          <path d="
            M42 12
            H558
            C578 12 588 26 588 45
            V70
            C480 42 120 42 12 70
            V45
            C12 26 24 12 42 12
            Z
          " fill="url(#aa-hardSpecular)" opacity="0.8" />

          {/* FASE 8 — dynamic specular hotspot, tracks the cursor via the
              `light` state (userSpaceOnUse cx/cy on aa-dynamicHighlight,
              updated in the pointermove handler above). This is the layer
              that actually moves; the hard cap above stays put. */}
          <ellipse cx={lightX} cy={lightY} rx="230" ry="190" fill="url(#aa-dynamicHighlight)" style={{ mixBlendMode: 'screen' }} />

          {/* Diagonal Vista/Aqua reflection — FASE 8: rotates a few degrees
              toward the light's side of the shell instead of sitting at a
              fixed angle forever. */}
          <g transform={`rotate(${lightAngleDeg.toFixed(2)} 300 150)`}>
            <path d="
              M-40 20
              L250 -40
              L620 240
              L620 300
              Z
            " fill="url(#aa-crystalSweep)" opacity="0.55" />
          </g>

          {/* ============================================================
              FASE 9 — ICE INTERNAL DEPTH SYSTEM
              Three explicit planes: profundo (deepest, most blurred, no
              motion) -> medio (fractures, faint blur, slow drift) ->
              frontal (crisp micro-frost/sparkle, closest, drifts most).
              ============================================================ */}
          <PlaneProfundo opacity="0.55">
            <ellipse cx="470" cy="90" rx="90" ry="50" fill="#063B66" opacity="0.35" filter="url(#aa-softBloom)" />
            <ellipse cx="110" cy="235" rx="80" ry="45" fill="#063B66" opacity="0.3" filter="url(#aa-softBloom)" />
            <circle cx="125" cy="90" r="8" fill="none" stroke="#ffffff" strokeWidth="1" />
            <circle cx="125" cy="90" r="3" fill="#ffffff" opacity="0.7" />
            <circle cx="520" cy="170" r="11" fill="none" stroke="#ffffff" strokeWidth="1" />
            <circle cx="520" cy="170" r="4" fill="#ffffff" opacity="0.65" />
            <circle cx="300" cy="255" r="6" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.5" />
          </PlaneProfundo>

          <PlaneMedio opacity="0.32" fill="none" stroke="#dfffff" strokeWidth="1.2" filter="url(#aa-microBlur)">
            <path d="M105 42 L130 75 L118 118 L150 154" />
            <path d="M470 180 L445 210 L468 250 L430 280" />
            <path d="M520 65 L500 95 L515 130" />
            <path d="M90 220 L130 240" />
            <path d="M300 30 L308 55 L296 80" />
            <path d="M235 130 L255 145 L248 175" />
          </PlaneMedio>

          <PlaneFrontal opacity="0.7">
            <circle cx="80" cy="110" r="1.4" fill="#ffffff" />
            <circle cx="195" cy="48" r="1.1" fill="#ffffff" />
            <circle cx="410" cy="205" r="1.3" fill="#ffffff" />
            <circle cx="500" cy="60" r="1" fill="#ffffff" />
            <circle cx="270" cy="245" r="1.2" fill="#ffffff" />
            <path d="M360 100 l0 6 M357 103 l6 0" stroke="#ffffff" strokeWidth="0.7" opacity="0.85" />
            <path d="M160 200 l0 5 M157.5 202.5 l5 0" stroke="#ffffff" strokeWidth="0.6" opacity="0.75" />
          </PlaneFrontal>
        </g>

        {/* Frost accumulation near edges */}
        <path d="
          M42 12
          H558
          C580 12 590 30 590 40
        " fill="none" stroke="url(#aa-frostEdge)" strokeWidth="4" opacity="0.8" />
        <path d="
          M42 288
          H558
        " fill="none" stroke="#9feaff" strokeWidth="3" opacity="0.45" />

        {/* ============================================================
            FASE 7 — ADVANCED FRESNEL OPTICS
            Three concentric bands (outer ice-white / mid cyan / inner deep
            blue) instead of one flat stroke; the outer band also breaks
            into dash/gap arcs so the rim visibly brightens and disappears
            around the silhouette rather than glowing evenly all the way
            round. Brightness of the whole rim also breathes a little with
            --audioIcePulse (FASE 10). */}
        <g style={{ filter: 'brightness(calc(1 + var(--audioIcePulse, 0) * 0.35))' }}>
          <path
            d={chamferedRectPath(10, 10, 580, 280, SHELL_C)}
            fill="none"
            stroke="url(#aa-fresnel)"
            strokeWidth="3"
            strokeDasharray={fresnelDasharray}
            filter="url(#aa-edgeGlow)"
          />
          <path
            d={chamferedRectPath(16, 16, 568, 268, 26)}
            fill="none"
            stroke="url(#aa-fresnelCyan)"
            strokeWidth="2.2"
            opacity="0.75"
          />
          <path
            d={chamferedRectPath(24, 24, 552, 252, 20)}
            fill="none"
            stroke="url(#aa-fresnelDeep)"
            strokeWidth="1.8"
            opacity="0.75"
          />
        </g>

        {/* Bottom cyan bounce */}
        <ellipse cx="300" cy="290" rx="270" ry="35" fill="#5eeaff" opacity="0.18" filter="url(#aa-softBloom)" />

        {/* header wordmark strip */}
        <text x="300" y="34" textAnchor="middle" fontFamily="'Trebuchet MS', sans-serif" fontSize="13" fontWeight="800" letterSpacing="3" fill="color-mix(in srgb, var(--screenPixel) 85%, #fff)">CHAPLIN</text>
        <circle cx="537" cy="30" r="4" fill="var(--accentSoft)" opacity="0.85" />
        <circle cx="552" cy="30" r="4" fill={isFavorited ? 'var(--ledOn)' : 'var(--ledOff)'} />
        <circle cx="567" cy="30" r="4" fill={playing ? 'var(--ledOn)' : 'var(--ledOff)'} />

        {/* FASE 11 — Winamp/Aqua-era hardware identity: a tiny technical
            readout (the kind every classic Winamp skin and Vista Media
            Center displayed near the transport) and a faint etched model
            plate, the way a real 2005-era device would carry a barely-
            visible serial silkscreen. Both intentionally tiny/low-opacity —
            flavor, not a second UI. */}
        <text x="567" y="41" textAnchor="end" fontFamily="'Consolas', monospace" fontSize="6" letterSpacing="0.5" fill="color-mix(in srgb, var(--screenPixel) 70%, #fff)" opacity="0.55">44.1kHz · STEREO</text>
        {/* FASE 16 LCD WINAMP RESTORATION — the brief names this string
            exactly ("AEROAMP ICE EDITION"), replacing the earlier serial-
            plate flavor text. Same tiny/low-opacity treatment as its
            neighbor above — a Winamp-style skin credit, not a second UI. */}
        <text x="33" y="41" textAnchor="start" fontFamily="'Consolas', monospace" fontSize="6" letterSpacing="0.5" fill="#ffffff" opacity="0.22">AEROAMP ICE EDITION</text>

        {/* ============================================================
            ICE LCD CORE v2 (BLOQUE 3/5)
            Embedded Winamp Crystal Display
            ============================================================ */}

        {/* Outer LCD cavity shadow */}
        <rect x="28" y="44" width="544" height="126" rx="18" fill="#063B66" opacity="0.75" />

        {/* Frozen glass bezel */}
        <rect x="30" y="46" width="540" height="118" rx="16" fill="url(#aa-iceDepth)" stroke="#bdf6ff" strokeWidth="2" />

        {/* LCD PHYSICAL CAVITY — inner bevel, made directional (was a single
            uniform white stroke all the way around, which reads flat/drawn
            rather than "cut into the shell"). A real inset bevel has light
            answering from one side and shadow from the other: cool tenue
            highlight along the top inner edge, deep-blue shadow along the
            bottom inner edge. Two short strokes, not a new shape. */}
        <path d="M46 51 H554" stroke="#eaffff" strokeWidth="2" opacity="0.4" strokeLinecap="round" fill="none" />
        <path d="M46 159 H554" stroke="#04263f" strokeWidth="2" opacity="0.5" strokeLinecap="round" fill="none" />

        {/* LCD recessed cavity */}
        <rect x="40" y="56" width="520" height="98" rx="9" fill="#063B66" opacity="0.9" />

        {/* LCD glass surface */}
        <rect x="44" y="60" width="512" height="90" rx="8" fill="url(#aa-lcdGrad)" />

        {/* Cyan illumination removed here — it tinted the new warm beige/
            yellow Game Boy screen toward a muddy green. Left on every
            other consumer of aa-auroraBlue (untouched). */}

        {/* LCD scanline texture */}
        <pattern id="aa-scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#ffffff" opacity="0.12" />
        </pattern>
        <rect x="44" y="60" width="512" height="90" rx="8" fill="url(#aa-scanlines)" opacity="0.25" />

        {/* LCD PHYSICAL CAVITY — front glass reflection, dialed from 0.22 to
            0.12 (the requested 8-15% band). At 0.22 it read as strong enough
            to cross the mascot viewport aggressively; at 0.12 the same wide/
            tenue/top-weighted shape still sells "glass sheet in front of the
            display" without competing with the pixel art under it. */}
        <path d="
          M52 62
          H548
          C520 72 140 72 52 62
          Z
        " fill="#ffffff" opacity="0.12" />

        {/* Screen side glow */}
        <rect x="44" y="60" width="512" height="90" rx="8" fill="none" stroke="#7defff" strokeWidth="1.5" opacity="0.8" />

        {/* 8-bit mascot viewport */}
        <rect x={screenX - 4} y={screenY - 4} width={screenSize + 8} height={screenSize + 8} rx="14" fill="#063B66" opacity="0.75" />
        <rect x={screenX} y={screenY} width={screenSize} height={screenSize} rx="10" fill="#f5ecc8" />
        {avatarUrl ? (
          <image href={avatarUrl} x={screenX} y={screenY} width={screenSize} height={screenSize} preserveAspectRatio="xMidYMid slice" />
        ) : (
          <MascotGroup>
            {renderPixels(MASCOT_BODY, 'var(--screenPixel)', mascotX, mascotY)}
            {renderPixels(MASCOT_FEET, 'var(--screenPixel)', mascotX, mascotY)}
            {renderPixels(MASCOT_HILITE, 'color-mix(in srgb, var(--screenPixel) 25%, #fff)', mascotX, mascotY)}
            {MASCOT_EYES.map(([c, r], i) => (
              <EyePixel key={i} x={mascotX + c * MASCOT_PX} y={mascotY + r * MASCOT_PX} width={MASCOT_PX} height={MASCOT_PX} fill="#f5ecc8" />
            ))}
          </MascotGroup>
        )}

        {/* Pixel glass overlay */}
        <rect x={screenX} y={screenY} width={screenSize} height={screenSize} rx="10" fill="url(#aa-crystalSweep)" opacity="0.35" />

        {/* Audio spectrum cavity */}
        <rect x="205" y="105" width="300" height="35" rx="8" fill="#063B66" opacity="0.35" />
        {/* ICE EDITION BRIEF names "VISUALIZER" as one of the technical
            labels the LCD should carry. Same tiny/low-opacity flavor-text
            treatment as the "44.1kHz · STEREO" and "AEROAMP ICE EDITION"
            labels above — a Winamp-style module credit sitting right over
            its own cavity, not a HUD callout. ("PLAYLIST" from the same
            brief line is deliberately NOT added here: this skin has no
            playlist view for the label to name, and a label pointing at
            nothing would itself be the "HUD" the brief warns against.) */}
        <text x="210" y="112" textAnchor="start" fontFamily="'Consolas', monospace" fontSize="5" letterSpacing="1" fill="color-mix(in srgb, var(--screenPixel) 70%, #fff)" opacity="0.4">VISUALIZER</text>

        {/* audio reactive bars */}
        <g>
          {Array.from({ length: BAR_COUNT }).map((_, i) => (
            <rect
              key={i}
              ref={(el) => { barRefs.current[i] = el; }}
              x={barsStartX + i * (barWidth + barGap)}
              y={BAR_BASE_Y - 2}
              width={barWidth}
              height={2}
              shapeRendering="crispEdges"
              fill="url(#aa-barGrad)"
              opacity="0.95"
            />
          ))}
        </g>

        {/* Final LCD crystal layer */}
        <rect x="40" y="56" width="520" height="98" rx="9" fill="none" stroke="url(#aa-fresnel)" strokeWidth="2" opacity="0.8" />

        {/* soft ambient-occlusion contact shadow grounding the button row
            against the shell, instead of the buttons looking like they
            float free of the surface they're set into */}
        <ellipse cx="300" cy="252" rx="180" ry="10" fill="#0a2233" opacity="0.28" filter="url(#aa-blurLg)" />

        {/* ICE EDITION BRIEF — "the shell should look manufactured, not
            generated." Diagnosis: the body was one continuous crystal
            volume top to bottom — LCD module and control fascia both just
            floating on the same slab, no manufacturing decision separating
            them, which is exactly the "rounded rectangle reads as a web
            card" trap the brief calls out by name. This is the parting
            line between two assembled housing pieces: display module
            above, button fascia below — a real recessed channel that the
            Seek pill (already drawn further below, on top, at the same
            y=172 coordinates) then sits inside, the way a hardware slider
            on a real 2006 device is often set right into a case seam
            rather than floating free on a flat panel. Height kept to the
            LCD's own bottom edge (170) down to just short of where the
            button row starts (~187) so it reads as a joint line, not a
            HUD divider. Two tiny "rivet" catch-lights flank the seam,
            outside the seek pill's own span (30-570) — a visible-fastener
            detail, the kind of thing an injection-molded "generated" shell
            would hide but a real assembled one shows. */}
        <rect x="16" y="169" width="568" height="19" rx="4" fill="#063B66" opacity="0.55" filter="url(#aa-microBlur)" />
        <rect x="16" y="169" width="568" height="2" rx="1" fill="#ffffff" opacity="0.3" />
        <rect x="16" y="184.5" width="568" height="1.5" fill="#063B66" opacity="0.5" />
        <circle cx="23" cy="178.5" r="2.4" fill="#063B66" opacity="0.6" />
        <circle cx="23" cy="177.9" r="1.1" fill="#ffffff" opacity="0.35" />
        <circle cx="577" cy="178.5" r="2.4" fill="#063B66" opacity="0.6" />
        <circle cx="577" cy="177.9" r="1.1" fill="#ffffff" opacity="0.35" />

        {/* ============================================================
            AERO CRYSTAL TRANSPORT CONTROLS v2 (BLOQUE 4/5)
            Liquid glass hardware buttons
            ============================================================ */}

        {/* ambient shadow below controls */}
        <ellipse cx="302" cy="255" rx="190" ry="16" fill="#063B66" opacity="0.55" filter="url(#aa-softBloom)" />

        {/* INDUSTRIAL DESIGN FINAL PASS — "ahora parece que los botones
            flotan. Solución: crear una superficie donde estén montados."
            A distinct control-fascia plate: structurally the same idea as
            the LCD's own bezel/cavity (a recessed zone let into the shell
            with its own edge), so the five transport buttons read as
            mounted onto a physical panel rather than floating loose over
            the shell's general backdrop. Sits behind every button below,
            spanning the same inset as the main body (x 20-580), from just
            under the LCD/seam joint down to just above the volume/status
            pill row. */}
        <rect x="20" y="192" width="560" height="60" rx="20" fill="#063B66" opacity="0.22" />
        <rect x="20" y="192" width="560" height="60" rx="20" fill="none" stroke="#063B66" strokeWidth="1.5" opacity="0.45" />
        <rect x="22" y="193.5" width="556" height="2" rx="1" fill="#ffffff" opacity="0.14" />

        {/* ICE EDITION BRIEF — Aqua's 4-layer button recipe (upper highlight
            / main volume / lower shadow / inner shadow) was only ever built
            for PLAY. The brief asks it of "each control," so the secondary
            transport buttons below now get the same lower-shadow +
            inner-shadow rim treatment PLAY already had — scaled down and
            lower-opacity on purpose, since PLAY stays the hero (per the
            brief's own "make it the hero element") and these should read
            as its supporting cast, not compete with it. */}

        {/* ---------- FAVORITE BUTTON ---------- */}
        <ellipse cx="152" cy="238" rx="17" ry="4" fill="#063B66" opacity="0.3" filter="url(#aa-microBlur)" />
        <circle cx="152" cy="222" r="20" fill="#063B66" opacity="0.7" />
        <circle cx="152" cy="222" r="18" fill="url(#aa-iceVolume)" stroke="#bfffff" strokeWidth="1.5" />
        <circle cx="152" cy="222" r="15" fill="url(#aa-iceRefraction)" opacity="0.75" />
        <path d="M134 228 A15 15 0 0 0 170 228" fill="none" stroke="#063B66" strokeWidth="3" strokeLinecap="round" opacity="0.3" filter="url(#aa-microBlur)" />
        <path d="M140 214 Q152 204 164 214" stroke="#ffffff" strokeWidth="3" opacity="0.65" fill="none" />
        <path d="M152 212 l3 7 l7 1 l-5 5 l1 7 l-6 -4 l-6 4 l1 -7 l-5 -5 l7 -1 z" fill={isFavorited ? 'var(--accent)' : '#083b58'} />
        <ButtonGloss id="aa-crystal-fav" cx={152} cy={222} r={18} />

        {/* ---------- PREVIOUS ---------- */}
        <ellipse cx="220" cy="245" rx="22" ry="5" fill="#063B66" opacity="0.3" filter="url(#aa-microBlur)" />
        <circle cx="220" cy="222" r="26" fill="#063B66" />
        <circle cx="220" cy="222" r="24" fill="url(#aa-iceVolume)" stroke="#ffffff" strokeOpacity="0.65" strokeWidth="1.5" />
        <circle cx="220" cy="222" r="20" fill="url(#aa-iceRefraction)" />
        <path d="M200 231 A20 20 0 0 0 240 231" fill="none" stroke="#063B66" strokeWidth="4" strokeLinecap="round" opacity="0.3" filter="url(#aa-microBlur)" />
        <path d="M207 222 L220 212 L220 232 Z M220 222 L233 212 L233 232 Z" fill="#063b66" />
        <ButtonGloss id="aa-crystal-prev" cx={220} cy={222} r={24} />

        {/* ---------- MAIN PLAY CORE ---------- */}
        {/* FASE 16 BUTTON MASTERING — "especial atención al botón PLAY...
            debe parecer un botón real fabricado en cristal." Two additions,
            both purely decorative (no hitbox/geometry change — HitCircle
            above is untouched): a contact shadow on the shell beneath the
            button, wider and softer than the button itself, the way a real
            piece of glass sitting proud of a surface actually casts one —
            this is the "separación física del cuerpo" cue; and a soft dark
            arc along the lower-inner rim (a cheap, convincing inner-shadow
            trick: a dark stroke, blurred, offset toward the shadow side)
            so the button reads as a solid faceted object catching light
            from above rather than a flat painted circle. */}
        <ellipse cx="300" cy="248" rx="30" ry="7" fill="#063B66" opacity="0.4" filter="url(#aa-softBloom)" />
        <circle cx="300" cy="222" r="35" fill="#063B66" opacity="0.8" />
        <circle cx="300" cy="222" r="32" fill="url(#aa-auroraBlue)" stroke="#ffffff" strokeWidth="2" />
        <circle cx="300" cy="222" r="27" fill="url(#aa-iceVolume)" />
        <path
          d="M276 232 A27 27 0 0 0 324 232"
          fill="none"
          stroke="#063B66"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.4"
          filter="url(#aa-microBlur)"
        />

        {/* energy ring */}
        <circle cx="300" cy="222" r="30" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.8" />
        <circle cx="300" cy="222" r="24" fill="none" stroke="#48eaff" strokeWidth="2" opacity="0.5" />

        {playing ? (
          <g fill="#ffffff">
            <rect x="290" y="208" width="7" height="28" rx="2" />
            <rect x="303" y="208" width="7" height="28" rx="2" />
          </g>
        ) : (
          <path d="M292 206 L292 238 L318 222 Z" fill="#ffffff" />
        )}

        {/* hard reflection */}
        <path d="M277 210 Q300 195 324 210" fill="none" stroke="#ffffff" strokeWidth="4" opacity="0.55" />

        <ButtonGloss id="aa-crystal-play" cx={300} cy={222} r={32} />

        {/* ---------- NEXT ---------- */}
        <ellipse cx="380" cy="245" rx="22" ry="5" fill="#063B66" opacity="0.3" filter="url(#aa-microBlur)" />
        <circle cx="380" cy="222" r="26" fill="#063B66" />
        <circle cx="380" cy="222" r="24" fill="url(#aa-iceVolume)" stroke="#ffffff" strokeOpacity="0.65" strokeWidth="1.5" />
        <circle cx="380" cy="222" r="20" fill="url(#aa-iceRefraction)" />
        <path d="M360 231 A20 20 0 0 0 400 231" fill="none" stroke="#063B66" strokeWidth="4" strokeLinecap="round" opacity="0.3" filter="url(#aa-microBlur)" />
        <path d="M367 212 L380 222 L367 232 Z M380 212 L393 222 L380 232 Z" fill="#063b66" />
        <ButtonGloss id="aa-crystal-next" cx={380} cy={222} r={24} />

        {/* ---------- QUEUE ---------- */}
        <ellipse cx="448" cy="238" rx="17" ry="4" fill="#063B66" opacity="0.3" filter="url(#aa-microBlur)" />
        <circle cx="448" cy="222" r="20" fill="#063B66" />
        <circle cx="448" cy="222" r="18" fill="url(#aa-iceVolume)" stroke="#ffffff" strokeWidth="1.5" />
        <path d="M430 228 A18 18 0 0 0 466 228" fill="none" stroke="#063B66" strokeWidth="3" strokeLinecap="round" opacity="0.3" filter="url(#aa-microBlur)" />
        <rect x="440" y="214" width="16" height="3" rx="1.5" fill="#063b66" />
        <rect x="440" y="220.5" width="16" height="3" rx="1.5" fill="#063b66" />
        <rect x="440" y="227" width="16" height="3" rx="1.5" fill="#063b66" />
        <ButtonGloss id="aa-crystal-queue" cx={448} cy={222} r={18} />

        {/* INDUSTRIAL DESIGN FINAL PASS — "eliminar estrellas / polvo
            espacial... Frutiger Aero no es fantasía espacial. Sustituir por
            burbujas, gotas, reflejos ambientales." The two decorative
            5-point stars here were literal magic-sparkle iconography with
            no hardware referent — nothing on a real 2006 device looks like
            a star. Replaced with a pair of Aero air bubbles (a soft body +
            a small offset highlight, the exact device used everywhere else
            in this shell for glass/bubble reflections) — the same real-
            world referent the brief asks for, right where the stars used
            to sit. */}
        <circle cx="492" cy="216" r="7" fill="url(#aa-auroraWhite)" opacity="0.55" />
        <circle cx="492" cy="216" r="7" fill="none" stroke="#ffffff" strokeWidth="0.75" opacity="0.4" />
        <circle cx="489.5" cy="213" r="1.8" fill="#ffffff" opacity="0.8" />
        <circle cx="522" cy="234" r="5" fill="url(#aa-auroraWhite)" opacity="0.5" />
        <circle cx="522" cy="234" r="5" fill="none" stroke="#ffffff" strokeWidth="0.6" opacity="0.35" />
        <circle cx="520.3" cy="232" r="1.3" fill="#ffffff" opacity="0.75" />

        {/* ============================================================
            AERO CRYSTAL BOTTOM CONTROLS (BLOQUE 5/5)
            Liquid glass sliders
            ============================================================ */}

        {/* Volume crystal cavity — outer capsule casing, same material
            family/treatment as the Listen pill right next to it (kept
            unchanged: this is the physical shell both controls are
            mounted into). The mute button and slider channel below are
            the functional mechanism mounted INSIDE that casing — same
            carcasa/hueco relationship already used for the LCD. */}
        <rect x="28" y="258" width="254" height="30" rx="15" fill="#063B66" opacity="0.75" />
        <rect x="30" y="260" width="250" height="26" rx="13" fill="url(#aa-iceVolume)" stroke="#ffffff" strokeWidth="1.5" opacity="0.95" />
        <rect x="36" y="264" width="238" height="10" rx="5" fill="#ffffff" opacity="0.12" />
        <rect x="30" y="260" width="250" height="26" rx="13" fill="url(#aa-crystalSweep)" opacity="0.35" />

        {/* VOLUME CONTROL — mute button, same physical-button template as
            Favorite/Prev/Next/Queue above (contact shadow, dark base,
            aa-iceVolume body, aa-iceRefraction inner glass, pressed-shadow
            arc, top highlight arc, ButtonGloss), just smaller (r=13 vs the
            transport buttons' 18-32) so it doesn't compete with them. */}
        <ellipse cx="45" cy="284" rx="12" ry="3" fill="#063B66" opacity="0.3" filter="url(#aa-microBlur)" />
        <circle cx="45" cy="273" r="15" fill="#063B66" opacity="0.7" />
        <circle cx="45" cy="273" r="13" fill="url(#aa-iceVolume)" stroke="#bfffff" strokeWidth="1.2" />
        <circle cx="45" cy="273" r="11" fill="url(#aa-iceRefraction)" opacity="0.75" />
        <path d="M34 277 A11 11 0 0 0 56 277" fill="none" stroke="#063B66" strokeWidth="2.2" strokeLinecap="round" opacity="0.3" filter="url(#aa-microBlur)" />
        <path d="M38 267 Q45 261 52 267" stroke="#ffffff" strokeWidth="2" opacity="0.6" fill="none" />
        {/* speaker glyph — the actual standard volume/mute icon shape (same
            speaker silhouette + wave-arcs / X pairing used across every
            major icon set and OS volume control), scaled and centered into
            this button instead of a freehand redraw. Speaker polygon stays
            fully inside x:37.6-44.4 and both states stay inside x:53.4,
            clear of the slider channel that starts at x=64. */}
        <path d="M44.4 267.8 L40.6 270.8 L37.6 270.8 L37.6 275.3 L40.6 275.3 L44.4 278.3 Z" fill="#083b58" />
        {volume === 0 ? (
          <path d="M53.4 270.75 L48.9 275.25 M48.9 270.75 L53.4 275.25" stroke="#083b58" strokeWidth="1.6" strokeLinecap="round" />
        ) : (
          <>
            <path d="M47.8 270.4 A3.75 3.75 0 0 1 47.8 275.7" stroke="#083b58" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M50.4 267.7 A7.5 7.5 0 0 1 50.4 278.3" stroke="#083b58" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.7" />
          </>
        )}
        <ButtonGloss id="aa-crystal-mute" cx={45} cy={273} r={13} />

        {/* VOLUME CONTROL — slider channel, reusing aa-seekRail (the seek
            bar's own "aqua profundo" rail material — not a new duplicate
            recipe) at a smaller footprint. The dynamic pink-equivalent
            fill/thumb are HTML, drawn on top (see VolumeCapsuleFill/
            VolumeThumb), same split as the seek bar. */}
        <rect x="64" y="267" width="152" height="12" rx="6" fill="#063B66" opacity="0.8" />
        <rect x="66" y="269" width="148" height="8" rx="4" fill="url(#aa-seekRail)" />
        <rect x="64" y="267" width="152" height="4" rx="2" fill="#ffffff" opacity="0.18" />

        {/* Listen button */}
        <rect x="318" y="258" width="254" height="30" rx="15" fill="#063B66" opacity="0.75" />
        <rect x="320" y="260" width="250" height="26" rx="13" fill="url(#aa-iceVolume)" stroke="#ffffff" strokeWidth="1.5" />
        <rect x="326" y="264" width="238" height="9" rx="5" fill="#ffffff" opacity="0.15" />
        <rect x="320" y="260" width="250" height="26" rx="13" fill="url(#aa-crystalSweep)" opacity="0.35" />

        {/* ============================================================
            CRYSTAL SEEK LIGHT BAR (BLOQUE 5/5)
            ============================================================ */}
        <rect x="30" y="172" width="540" height="14" rx="7" fill="#063B66" opacity="0.8" />

        {/* SEEK PHYSICAL CHANNEL — level 2, inner rail (new, inset within
            the existing cavity). This is what's visible for the unplayed
            length once the pink HTML fill (SeekFill, on top, separate
            layer) covers the played portion. */}
        <rect x="32" y="174" width="536" height="10" rx="5" fill="url(#aa-seekRail)" />

        <rect x="30" y="172" width="540" height="14" rx="7" fill="url(#aa-iceDepth)" />
        <rect x="30" y="172" width="540" height="5" rx="3" fill="#ffffff" opacity="0.25" />
        <rect x="30" y="172" width="540" height="14" rx="7" fill="url(#aa-fresnel)" opacity="0.35" />
      </BodySvg>

      {/* FASE 15 — still mounted above BodySvg (Fase 14 found that behind
          it, the shell's own opaque fills buried almost the whole layer —
          see the git history on this line for that A/B measurement), but
          the reason it now reads as real ice rather than an overlay isn't
          the mount order or a blend mode — it's that CrystalRenderer
          actually samples a live capture of this exact <BodySvg> (svgRef)
          and bends it per-pixel (screen-space refraction + chromatic
          dispersion, see optics/RefractionShader.js). Because the shader's
          own output already IS a distorted photo of the real shell, plain
          alpha compositing is correct here — no mix-blend-mode trick
          needed anymore. Still pointer-events: none, still zero UI/hit-
          testing of its own, still fully optional (unmounted entirely
          whenever opticsQuality is null, e.g. prefers-reduced-motion). */}
      {opticsQuality && (
        <CrystalRenderer
          svgRef={svgRef}
          lightRef={glLightRef}
          audioLevelsRef={audioLevelsRef}
          quality={opticsQuality}
          onFirstCapture={() => setCrystalReady(true)}
        />
      )}

      <Overlay>
        <DisplayText style={box(140, 64, 280, 34)}>
          <TitleLine>{title}</TitleLine>
          <ArtistLine>{artist}</ArtistLine>
        </DisplayText>
        <TimeText style={box(430, 62, 124, 16)}>{fmtTime(currentTime)} / {fmtTime(duration)}</TimeText>

        <SeekTrack ref={seekRef} style={box(30, 172, 540, 14)} role="slider" aria-label="Progreso" aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={currentTime} onClick={(e) => seek(e.clientX)}>
          <SeekCapsuleFill $pct={progress * 100} />
        </SeekTrack>

        <HitCircle style={box(134, 204, 36, 36)} type="button" aria-label="Favorito" aria-pressed={isFavorited} onClick={onToggleFavorite} disabled={!canFavorite || !track} />
        <HitCircle style={box(196, 198, 48, 48)} type="button" aria-label="Anterior" onClick={onPrev} disabled={!hasQueue} />
        <HitCircle style={box(268, 190, 64, 64)} type="button" aria-label={playing ? 'Pausar' : 'Reproducir'} aria-pressed={playing} onClick={onTogglePlay} disabled={!track} />
        <HitCircle style={box(356, 198, 48, 48)} type="button" aria-label="Siguiente" onClick={onNext} disabled={!hasQueue} />
        <HitCircle style={box(430, 204, 36, 36)} type="button" aria-label="Ver lista" aria-pressed={showQueue} onClick={() => setShowQueue((v) => !v)} disabled={!hasQueue} />

        {/* VOLUME CONTROL — real mute button + real slider, replacing the
            flat "VOL 70" pill. Mute/unmute go through the same real
            onVolumeChange channel as the slider (see toggleMute above) —
            no parallel volume system. */}
        <HitCircle style={box(32, 260, 26, 26)} type="button" aria-label={volume === 0 ? 'Activar sonido' : 'Silenciar'} aria-pressed={volume === 0} onClick={toggleMute} />

        <VolumeTrack ref={volRef} style={box(64, 267, 152, 12)} role="slider" aria-label="Volumen" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(volume * 100)}
          tabIndex={0}
          onPointerDown={(e) => { setDraggingVol(true); safeSetPointerCapture(e.currentTarget, e.pointerId); setVol(e.clientX); }}
          onPointerMove={(e) => { if (draggingVol) setVol(e.clientX); }}
          onPointerUp={() => setDraggingVol(false)}
          onPointerCancel={() => setDraggingVol(false)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); adjustVol(-0.05); }
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); adjustVol(0.05); }
          }}
        >
          <VolumeCapsuleFill $pct={volume * 100} />
          <VolumeThumb $pct={volume * 100} $dragging={draggingVol} />
        </VolumeTrack>

        <PillLabel style={box(220, 260, 58, 26)}>{volume === 0 ? 'MUTE' : Math.round(volume * 100)}</PillLabel>

        <HitPill style={box(320, 260, 250, 26)} type="button" aria-label={ariaLabel} aria-pressed={isActive} onClick={onToggleEar}>
          <PillLabel>{isActive ? '♪ LISTENING' : '♪ LISTEN'}</PillLabel>
        </HitPill>

        {BUBBLE_DECOR.map((b, i) => (
          <Bubble key={i} style={{ left: b.x, top: b.y, width: b.size, height: b.size }} $dur={b.dur} $delay={b.delay} />
        ))}

        {showQueue && hasQueue && (
          <QueuePanel>
            {queue.map((t, i) => (
              <QueueItem
                key={t.id ?? i}
                role="button"
                tabIndex={0}
                $active={i === queueIndex}
                onClick={() => { onSelectTrack(i); setShowQueue(false); }}
              >
                {t.title}
              </QueueItem>
            ))}
          </QueuePanel>
        )}

        {/* ============================================================
            FROZEN PARTICLES (BLOQUE 5/5)
            ============================================================ */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {FROZEN_PARTICLES.map(([x, y, s], i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                width: s,
                height: s,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #fff, rgba(120, 230, 255, .2), transparent)',
                filter: 'blur(.2px)',
                opacity: 0.75
              }}
            />
          ))}
        </div>
      </Overlay>
    </Wrap>
  );
}
