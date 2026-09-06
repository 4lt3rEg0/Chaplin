import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { fmtTime, ratioFromClientX, safeSetPointerCapture } from '../../shared/audioControls';
import { ChromeButtonGradient, GlassSheenGradient, OceanTextureFilter } from '../materials';
import { AQUA_WAVE_BODY_PATH, AQUA_WAVE_HIGHLIGHT_PATHS } from './waveGeometry';

/*
 * AQUA FLOW — hybrid tracing + reconstruction pass. The wave silhouette
 * (AQUA_WAVE_BODY_PATH) and its specular highlight streaks
 * (AQUA_WAVE_HIGHLIGHT_PATHS) are real measured geometry: automated contour
 * extraction + a per-column boundary walk on the isolated reference
 * (tools/player-reconstruction/references/aqua-flow/reference.png, 632x367),
 * Catmull-Rom -> cubic-Bezier fit through a controlled, downsampled point
 * set — see tools/player-reconstruction/scripts/trace_wave_contour.py,
 * trace_wave_thickness.py and fit_wave_paths.py. Every other element below
 * (display panel, pills, LED positions) is still the pass-2 hand-measured
 * geometry; the transport/secondary button circles use Hough-circle
 * measurements (extract_key_geometry.py), verified against
 * key_elements_overlay.png. viewBox matches the reference's own pixel
 * dimensions 1:1 so the silhouette bounding box is identical.
 */

const VIEW_W = 632;
const VIEW_H = 367;

const Wrap = styled.div`
  --shell: ${({ $p }) => $p.shell};
  --bezel: ${({ $p }) => $p.bezel};
  --display: ${({ $p }) => $p.display};
  --text: ${({ $p }) => $p.text};
  --wave: ${({ $p }) => $p.wave};
  --water: ${({ $p }) => $p.water};
  --accent: ${({ $p }) => $p.accent};
  --button: ${({ $p }) => $p.button};
  --buttonShadow: ${({ $p }) => $p.buttonShadow};
  --pill: ${({ $p }) => $p.pill};
  --ledOff: ${({ $p }) => $p.ledOff};
  --ledOn: ${({ $p }) => $p.ledOn};

  position: relative;
  width: 100%;
  max-width: 480px;
  aspect-ratio: ${VIEW_W} / ${VIEW_H};
  font-family: 'Segoe UI', system-ui, sans-serif;
  filter: drop-shadow(0 12px 18px rgba(0, 10, 20, 0.45));
  user-select: none;
`;

const BodySvg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
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
  &:active:not(:disabled) { filter: brightness(0.85); }
`;

const HitPill = styled(HitCircle)`
  border-radius: 999px;
`;

const DisplayText = styled.div`
  position: absolute;
  pointer-events: none;
  color: var(--text);
  overflow: hidden;
`;

const TitleLine = styled.div`
  font-size: clamp(9px, 2.1vw, 15px);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ArtistLine = styled.div`
  font-size: clamp(7px, 1.5vw, 10.5px);
  opacity: 0.82;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 3px;
`;

const TimeText = styled.div`
  position: absolute;
  font-family: 'Consolas', monospace;
  font-size: clamp(7px, 1.4vw, 10px);
  color: var(--accent);
  text-align: right;
  pointer-events: none;
`;

const ProgressTrack = styled.div`
  position: absolute;
  border-radius: 6px;
  background: rgba(0, 10, 20, 0.55);
  overflow: hidden;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.6);
`;

const ProgressFill = styled.div`
  position: absolute;
  inset: 0;
  width: ${({ $pct }) => $pct}%;
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 90%, #fff), var(--accent));
`;

const VolumeTrack = styled.div`
  position: absolute;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  pointer-events: auto;
  -webkit-tap-highlight-color: transparent;
`;

const VolumeFill = styled(ProgressFill)``;

// Real semantic sub-component: the wave silhouette (measured body fill) plus
// its specular highlight streaks (measured, separately-traced glossy bands —
// a curved gel/glass surface naturally has discontinuous specular streaks,
// not one flat traced blob), animatable/recolorable via the palette's
// --wave/--water/--accent CSS vars, never a raster image of the reference.
function AquaWave() {
  return (
    <g data-component="AquaWave" filter="url(#af-waveShadow)">
      <path d={AQUA_WAVE_BODY_PATH} fill="url(#af-waveGrad)" />
      {AQUA_WAVE_HIGHLIGHT_PATHS.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="url(#af-waveHighlightGrad)"
          opacity={i === 0 ? 0.95 : 0.75}
        />
      ))}
      <path d={AQUA_WAVE_BODY_PATH} fill="none" stroke="color-mix(in srgb, var(--wave) 40%, #fff)" strokeWidth="1.2" opacity="0.6" />
    </g>
  );
}

export default function AquaFlowSkin({
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
  onSelectTrack = () => {},
  palette
}) {
  const playing = isActive && isPlaying;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const progressRef = useRef(null);
  const volRef = useRef(null);
  const [draggingVol, setDraggingVol] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [visualizerOn, setVisualizerOn] = useState(true);

  const seek = (clientX) => {
    if (!duration) return;
    onSeek(ratioFromClientX(progressRef, clientX) * duration);
  };
  const setVol = (clientX) => onVolumeChange(Math.round(ratioFromClientX(volRef, clientX) * 100) / 100);

  const title = track ? track.title : (mode === 'favorites' ? 'Sin favoritas' : mode === 'radio' ? 'Radio sin señal' : 'Sin reproducción');
  const artist = track?.owner_username ? `@${track.owner_username}` : modeLabel;

  return (
    <Wrap $p={palette} data-skin-root="aqua-flow">
      <BodySvg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <ChromeButtonGradient id="af-btn" colorVar="var(--button)" />
          <GlassSheenGradient id="af-sheen" opacity={0.3} />
          {visualizerOn && <OceanTextureFilter id="af-ocean" seed={9} />}
          <linearGradient id="af-shellGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--bezel) 60%, #fff)' }} />
            <stop offset="45%" style={{ stopColor: 'var(--bezel)' }} />
            <stop offset="100%" style={{ stopColor: 'color-mix(in srgb, var(--shell) 75%, #000)' }} />
          </linearGradient>
          <linearGradient id="af-bezelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--bezel) 40%, #000)' }} />
            <stop offset="15%" style={{ stopColor: 'color-mix(in srgb, var(--bezel) 50%, #000)' }} />
            <stop offset="30%" style={{ stopColor: 'color-mix(in srgb, var(--bezel) 85%, #fff)' }} />
            <stop offset="55%" style={{ stopColor: 'var(--bezel)' }} />
            <stop offset="80%" style={{ stopColor: 'color-mix(in srgb, var(--bezel) 35%, #000)' }} />
            <stop offset="100%" style={{ stopColor: 'color-mix(in srgb, var(--bezel) 20%, #000)' }} />
          </linearGradient>
          <linearGradient id="af-displayGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--display) 88%, #3a7a9c)' }} />
            <stop offset="100%" style={{ stopColor: 'color-mix(in srgb, var(--display) 70%, #000)' }} />
          </linearGradient>
          <linearGradient id="af-waveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--wave) 55%, #fff)' }} />
            <stop offset="18%" style={{ stopColor: 'color-mix(in srgb, var(--wave) 92%, #fff)' }} />
            <stop offset="45%" style={{ stopColor: 'var(--wave)' }} />
            <stop offset="75%" style={{ stopColor: 'color-mix(in srgb, var(--wave) 70%, #001a2a)' }} />
            <stop offset="100%" style={{ stopColor: 'color-mix(in srgb, var(--wave) 40%, #001220)' }} />
          </linearGradient>
          <linearGradient id="af-waveHighlightGrad" x1="0" y1="0" x2="1" y2="0.4">
            <stop offset="0%" style={{ stopColor: '#eafcff', stopOpacity: 0.55 }} />
            <stop offset="45%" style={{ stopColor: '#ffffff', stopOpacity: 0.98 }} />
            <stop offset="100%" style={{ stopColor: '#eafcff', stopOpacity: 0.65 }} />
          </linearGradient>
          <filter id="af-waveShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#001522" floodOpacity="0.5" />
          </filter>
          <linearGradient id="af-waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--water) 30%, #000)' }} />
            <stop offset="45%" style={{ stopColor: 'var(--water)' }} />
            <stop offset="80%" style={{ stopColor: 'color-mix(in srgb, var(--accent) 15%, #fff)' }} />
            <stop offset="100%" style={{ stopColor: 'color-mix(in srgb, var(--water) 60%, #000)' }} />
          </linearGradient>
          <linearGradient id="af-lowerWaterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--water)' }} />
            <stop offset="100%" style={{ stopColor: 'color-mix(in srgb, var(--water) 40%, #000)' }} />
          </linearGradient>
          <linearGradient id="af-pillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--button) 40%, #fff)' }} />
            <stop offset="25%" style={{ stopColor: 'color-mix(in srgb, var(--button) 80%, #fff)' }} />
            <stop offset="50%" style={{ stopColor: 'var(--button)' }} />
            <stop offset="85%" style={{ stopColor: 'color-mix(in srgb, var(--buttonShadow) 80%, #000)' }} />
            <stop offset="100%" style={{ stopColor: 'color-mix(in srgb, var(--buttonShadow) 40%, #000)' }} />
          </linearGradient>
          <clipPath id="af-windowClip">
            <rect x="12" y="6" width="598" height="354" rx="14" />
          </clipPath>
          <clipPath id="af-waterClip">
            <rect x="14" y="155" width="591" height="200" />
          </clipPath>
        </defs>

        {/* outer chrome bezel + gel chassis */}
        <rect x="12" y="6" width="598" height="354" rx="14" fill="url(#af-shellGrad)" />
        <rect x="15" y="9" width="592" height="348" rx="11" fill="var(--shell)" />

        <g clipPath="url(#af-windowClip)">
          {/* title bar */}
          <rect x="12" y="6" width="598" height="30" fill="url(#af-bezelGrad)" />
          
          {/* Winamp logo: lightning bolt shape tracing x=28..44, y=21..36 */}
          <path d="M 38,21 L 28,29 L 35,29 L 33,36 L 44,26 L 37,26 Z" fill="color-mix(in srgb, var(--accent) 70%, #ffcf40)" opacity="0.9" />
          
          <text x="311" y="25" textAnchor="middle" fontFamily="Trebuchet MS, sans-serif" fontSize="13" fontWeight="700" letterSpacing="2.5" fill="var(--text)">WINAMP</text>
          <rect x="481" y="11" width="16" height="12" rx="2" fill="none" stroke="var(--text)" strokeOpacity="0.7" strokeWidth="1.2" />
          <rect x="502" y="11" width="12" height="12" rx="2" fill="none" stroke="var(--text)" strokeOpacity="0.7" strokeWidth="1.2" />
          <circle cx="536" cy="17" r="9" fill="none" stroke="var(--text)" strokeOpacity="0.7" strokeWidth="1.2" />

          {/* display panel with beautiful high-contrast bright bezel stroke */}
          <rect x="14" y="38" width="591" height="120" rx="6" fill="url(#af-displayGrad)" stroke="color-mix(in srgb, var(--bezel) 40%, #fff)" strokeWidth="3" />
          
          {/* left display water window / visualizer tank */}
          <rect x="20" y="46" width="172" height="104" rx="4" fill="url(#af-waterGrad)" />
          {visualizerOn && <rect x="20" y="46" width="172" height="104" rx="4" filter="url(#af-ocean)" opacity="0.7" />}
          {avatarUrl && (
            <image href={avatarUrl} x="20" y="46" width="172" height="104" clipPath="inset(0% round 4px)" preserveAspectRatio="xMidYMid slice" />
          )}
          <rect x="14" y="38" width="591" height="120" rx="6" fill="url(#af-sheen)" />

          {/* status LEDs */}
          <rect x="515" y="61" width="16" height="12" rx="2" fill={isFavorited ? 'var(--ledOn)' : 'var(--ledOff)'} opacity={isFavorited ? 1 : 0.7} />
          <rect x="541" y="61" width="16" height="12" rx="2" fill={playing ? 'var(--ledOn)' : 'var(--ledOff)'} opacity={playing ? 1 : 0.7} />

          {/* water surface — spans the whole lower body, behind the wave and buttons */}
          <g clipPath="url(#af-waterClip)">
            <rect x="14" y="155" width="591" height="200" fill="url(#af-lowerWaterGrad)" />
            {visualizerOn && <rect x="14" y="155" width="591" height="200" filter="url(#af-ocean)" />}
          </g>

          {/* small round accessory buttons — cx/cy/r measured via Hough-circle
              detection on the reference (extract_key_geometry.py), verified
              against key_elements_overlay.png */}
          <circle cx="66.6" cy="235.8" r="19.3" fill="url(#af-btn)" stroke="var(--buttonShadow)" strokeWidth="1.5" />
          <circle cx="123" cy="238.2" r="18" fill="url(#af-btn)" stroke="var(--buttonShadow)" strokeWidth="1.5" />
          <circle cx="174.6" cy="237" r="19.3" fill="url(#af-btn)" stroke="var(--buttonShadow)" strokeWidth="1.5" />
          {[59.6, 66.6, 73.6].map((x, i) => (
            <rect key={x} x={x} y={235.8 - (i + 1) * 3.2} width="3.5" height={(i + 1) * 6.4} fill="var(--buttonShadow)" />
          ))}
          <path d="M 115,230.2 h16 v5 h-11 v10 h-5 z" fill="var(--buttonShadow)" />
          <path d="M 174.6,226.8 l3,7 7,1 -5,5 1,7 -6,-4 -6,4 1,-7 -5,-5 7,-1 z" fill="var(--buttonShadow)" />

          {/* transport row — measured, same source */}
          <circle cx="82.2" cy="298.2" r="32.7" fill="url(#af-btn)" stroke="var(--buttonShadow)" strokeWidth="2" />
          <circle cx="150.6" cy="299.4" r="31.4" fill="url(#af-btn)" stroke="var(--buttonShadow)" strokeWidth="2" />
          <circle cx="222.6" cy="298.2" r="31.2" fill="url(#af-btn)" stroke="var(--buttonShadow)" strokeWidth="2" />
          <path d="M 68.2,298.2 L 82.2,287.2 L 82.2,309.2 Z M 82.2,298.2 L 96.2,287.2 L 96.2,309.2 Z" fill="var(--buttonShadow)" />
          <path d="M 137.6,284.4 L 163.6,299.4 L 137.6,314.4 Z" fill="var(--buttonShadow)" />
          <path d="M 208.6,287.2 L 222.6,298.2 L 208.6,309.2 Z M 222.6,287.2 L 236.6,298.2 L 222.6,309.2 Z" fill="var(--buttonShadow)" />

          {/* pills with linear chrome gradients to prevent radial stretching */}
          <rect x="270" y="280" width="155" height="40" rx="20" fill="url(#af-pillGrad)" stroke="var(--buttonShadow)" />
          <rect x="445" y="280" width="155" height="40" rx="20" fill="url(#af-pillGrad)" stroke="var(--buttonShadow)" />
          <rect x="322" y="297" width="50" height="6" rx="3" fill="var(--buttonShadow)" />
          <circle cx="522" cy="294" r="7" fill="var(--buttonShadow)" />
          <path d="M 505,316 q17,-18 34,0 z" fill="var(--buttonShadow)" />
        </g>

        {/* the wave ribbon, rendered outside windowClip so it can protrude left/right beyond chassis boundaries */}
        <AquaWave />
      </BodySvg>

      <Overlay>
        <DisplayText style={box(205, 52, 290, 44)}>
          <TitleLine>{title}</TitleLine>
          <ArtistLine>{artist}</ArtistLine>
        </DisplayText>
        <TimeText style={box(430, 55, 155, 16)}>{fmtTime(currentTime)} / {fmtTime(duration)}</TimeText>

        <ProgressTrack ref={progressRef} style={box(215, 138, 340, 12)} role="slider" aria-label="Progreso" aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={currentTime} onClick={(e) => seek(e.clientX)}>
          <ProgressFill $pct={progress * 100} />
        </ProgressTrack>

        <HitCircle style={box(47.3, 216.5, 38.6, 38.6)} type="button" aria-label="Visualizador" aria-pressed={visualizerOn} onClick={() => setVisualizerOn((v) => !v)} />
        <HitCircle style={box(105, 220.2, 36, 36)} type="button" aria-label="Ver lista" onClick={() => setShowQueue((v) => !v)} disabled={!hasQueue} />
        <HitCircle style={box(155.3, 217.7, 38.6, 38.6)} type="button" aria-label="Favorito" aria-pressed={isFavorited} onClick={onToggleFavorite} disabled={!canFavorite || !track} />

        <HitCircle style={box(49.5, 265.5, 65.4, 65.4)} type="button" aria-label="Anterior" onClick={onPrev} disabled={!hasQueue} />
        <HitCircle style={box(119.2, 268, 62.8, 62.8)} type="button" aria-label={playing ? 'Pausar' : 'Reproducir'} aria-pressed={playing} onClick={onTogglePlay} disabled={!track} />
        <HitCircle style={box(191.4, 267, 62.4, 62.4)} type="button" aria-label="Siguiente" onClick={onNext} disabled={!hasQueue} />

        <VolumeTrack ref={volRef} style={box(270, 280, 155, 40)} role="slider" aria-label="Volumen" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(volume * 100)}
          onPointerDown={(e) => { setDraggingVol(true); safeSetPointerCapture(e.currentTarget, e.pointerId); setVol(e.clientX); }}
          onPointerMove={(e) => { if (draggingVol) setVol(e.clientX); }}
          onPointerUp={() => setDraggingVol(false)}
          onPointerCancel={() => setDraggingVol(false)}
        >
          <VolumeFill $pct={volume * 100} style={{ opacity: 0.3 }} />
        </VolumeTrack>

        <HitPill style={box(445, 280, 155, 40)} type="button" aria-label={ariaLabel} aria-pressed={isActive} onClick={onToggleEar} />

        {showQueue && hasQueue && (
          <div style={{
            position: 'absolute', left: '4%', top: '2%', width: '92%', maxHeight: '96%', overflowY: 'auto',
            background: 'rgba(4,16,28,0.94)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8,
            pointerEvents: 'auto', padding: 6, zIndex: 5
          }}>
            {queue.map((t, i) => (
              <div
                key={t.id ?? i}
                role="button"
                tabIndex={0}
                onClick={() => { onSelectTrack(i); setShowQueue(false); }}
                style={{ padding: '4px 6px', fontSize: 11, color: '#cdeaff', cursor: 'pointer', borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {t.title}
              </div>
            ))}
          </div>
        )}
      </Overlay>
    </Wrap>
  );
}
