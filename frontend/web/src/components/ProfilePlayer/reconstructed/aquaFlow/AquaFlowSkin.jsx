import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { fmtTime, ratioFromClientX, safeSetPointerCapture } from '../../shared/audioControls';
import { ChromeGradient, ChromeButtonGradient, GelGradient, DisplayGlassGradient, GlassSheenGradient, OceanTextureFilter } from '../materials';

/*
 * AQUA FLOW — golden master reconstruction. Every pixel here is authored
 * SVG/CSS tracing the Aqua Flow sketch (ij1a1r sheet), not the sketch
 * itself: chrome frame, gel window body, dark glass display, a real
 * wave-ribbon silhouette with a specular highlight, a procedural ocean
 * texture underneath (feTurbulence, not a photo), chrome buttons with
 * engraved icons. No raster of the original artwork is rendered.
 *
 * Real control mapping (per the sketch's own icon language):
 *  - 3 small round buttons above the transport row: EQ-bars icon -> the
 *    visualizer/ocean-animation toggle; folder icon -> open queue (jumps
 *    into the real track list via onSelectTrack); star icon -> Favorite.
 *  - transport row: prev / play-pause / next (real triangles).
 *  - left pill ("-"): Volume (drag/click, fill sweeps the pill).
 *  - right pill (person glyph): Profile Listen (the sketch's own
 *    person-shaped icon reused verbatim for its real semantic meaning).
 */

const VIEW_W = 640;
const VIEW_H = 380;

const Wrap = styled.div`
  --shell: ${({ $p }) => $p.shell};
  --bezel: ${({ $p }) => $p.bezel};
  --display: ${({ $p }) => $p.display};
  --text: ${({ $p }) => $p.text};
  --wave: ${({ $p }) => $p.wave};
  --accent: ${({ $p }) => $p.accent};
  --button: ${({ $p }) => $p.button};

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
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
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

const VolumeTrack = styled(ProgressTrack)``;
const VolumeFill = styled(ProgressFill)``;

export default function AquaFlowSkin({
  manifest,
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
    <Wrap $p={palette}>
      <BodySvg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <ChromeGradient id="af-bezel" colorVar="var(--bezel)" />
          <GelGradient id="af-shell" colorVar="var(--shell)" />
          <DisplayGlassGradient id="af-display" colorVar="var(--display)" />
          <ChromeButtonGradient id="af-btn" colorVar="var(--button)" />
          <GlassSheenGradient id="af-sheen" opacity={0.32} />
          <OceanTextureFilter id="af-ocean" seed={9} />
          <linearGradient id="af-wave" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--wave) 30%, #fff)' }} />
            <stop offset="35%" style={{ stopColor: 'color-mix(in srgb, var(--wave) 85%, #fff)' }} />
            <stop offset="70%" style={{ stopColor: 'var(--wave)' }} />
            <stop offset="100%" style={{ stopColor: 'color-mix(in srgb, var(--wave) 65%, #003)' }} />
          </linearGradient>
          <clipPath id="af-windowClip">
            <rect x="8" y="8" width="624" height="364" rx="16" />
          </clipPath>
        </defs>

        {/* outer chrome bezel */}
        <rect x="2" y="2" width="636" height="376" rx="20" fill="url(#af-bezel)" />
        {/* gel window body */}
        <rect x="8" y="8" width="624" height="364" rx="16" fill="url(#af-shell)" />

        <g clipPath="url(#af-windowClip)">
          {/* title bar */}
          <rect x="8" y="8" width="624" height="26" fill="url(#af-bezel)" opacity="0.55" />
          <circle cx="22" cy="21" r="7" fill="url(#af-btn)" stroke="rgba(0,0,0,0.3)" />
          <text x="320" y="25" textAnchor="middle" fontFamily="Trebuchet MS, sans-serif" fontSize="12" fontWeight="700" letterSpacing="2" fill="#eaf7ff">WINAMP</text>
          {[590, 604, 618].map((cx) => (
            <rect key={cx} x={cx - 5} y={15} width={10} height={10} rx={2} fill="url(#af-btn)" stroke="rgba(0,0,0,0.35)" />
          ))}

          {/* display panel */}
          <rect x="20" y="42" width="600" height="100" rx="8" fill="url(#af-display)" />
          <rect x="20" y="42" width="600" height="100" rx="8" fill="url(#af-sheen)" />
          <rect x="28" y="50" width="82" height="82" rx="5" fill="url(#af-shell)" opacity="0.85" />
          {avatarUrl && (
            <image href={avatarUrl} x="28" y="50" width="82" height="82" clipPath="inset(0% round 5px)" preserveAspectRatio="xMidYMid slice" />
          )}
          <rect x="20" y="128" width="600" height="14" fill="rgba(0,0,0,0.2)" />

          {/* status LEDs */}
          <rect x="596" y="50" width="12" height="10" rx="2" fill={isFavorited ? 'var(--accent)' : 'rgba(255,255,255,0.15)'} />
          <rect x="596" y="66" width="12" height="10" rx="2" fill={playing ? '#57ff8a' : 'rgba(255,255,255,0.15)'} />

          {/* ocean texture, behind the wave, fills the lower body */}
          <rect x="8" y="150" width="624" height="222" fill="#0c3a52" />
          <rect x="8" y="150" width="624" height="222" filter="url(#af-ocean)" />

          {/* the wave ribbon */}
          <path
            d="M 4,196 C 50,140 96,132 138,160 C 180,188 206,214 246,206 C 292,197 300,150 344,140
               C 388,130 420,158 452,182 C 484,206 512,216 548,198 C 578,182 598,168 636,172
               L 636,238 C 598,232 578,244 548,258 C 512,276 484,266 452,244
               C 420,222 388,196 344,204 C 300,212 292,256 246,264 C 206,272 180,248 138,222
               C 96,196 50,202 4,254 Z"
            fill="url(#af-wave)"
          />
          <path
            d="M 4,196 C 50,140 96,132 138,160 C 180,188 206,214 246,206 C 292,197 300,150 344,140
               C 388,130 420,158 452,182 C 484,206 512,216 548,198 C 578,182 598,168 636,172"
            fill="none"
            stroke="rgba(255,255,255,0.75)"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* transport row */}
          <circle cx="75" cy="305" r="27" fill="url(#af-btn)" stroke="rgba(0,20,40,0.5)" strokeWidth="2" />
          <circle cx="133" cy="305" r="31" fill="url(#af-btn)" stroke="rgba(0,20,40,0.5)" strokeWidth="2" />
          <circle cx="191" cy="305" r="27" fill="url(#af-btn)" stroke="rgba(0,20,40,0.5)" strokeWidth="2" />
          <path d="M 62,305 L 76,294 L 76,316 Z M 76,305 L 90,294 L 90,316 Z" fill="rgba(0,20,40,0.65)" />
          <path d="M 122,290 L 145,305 L 122,320 Z" fill="rgba(0,20,40,0.65)" />
          <path d="M 176,294 L 190,305 L 176,316 Z M 190,294 L 204,305 L 190,316 Z" fill="rgba(0,20,40,0.65)" />

          {/* small round accessory buttons */}
          <circle cx="45" cy="255" r="17" fill="url(#af-btn)" />
          <circle cx="90" cy="255" r="17" fill="url(#af-btn)" />
          <circle cx="135" cy="255" r="17" fill="url(#af-btn)" />
          {[38, 44, 50].map((x, i) => (
            <rect key={x} x={x} y={255 - (i + 1) * 3} width="3" height={(i + 1) * 6} fill="rgba(0,20,40,0.7)" />
          ))}
          <path d="M 82,248 h14 v5 h-10 v9 h-4 z" fill="rgba(0,20,40,0.7)" />
          <path d="M 135,247 l3,6 6,1 -4,4 1,6 -6,-3 -6,3 1,-6 -4,-4 6,-1 z" fill="rgba(0,20,40,0.7)" />

          {/* pills */}
          <rect x="270" y="288" width="150" height="34" rx="17" fill="url(#af-btn)" />
          <rect x="440" y="288" width="150" height="34" rx="17" fill="url(#af-btn)" />
          <rect x="325" y="302" width="40" height="6" rx="3" fill="rgba(0,20,40,0.7)" />
          <circle cx="515" cy="299" r="7" fill="rgba(0,20,40,0.7)" />
          <path d="M 500,318 q15,-16 30,0 z" fill="rgba(0,20,40,0.7)" />
        </g>
      </BodySvg>

      <Overlay>
        <DisplayText style={box(114, 50, 340, 40)}>
          <TitleLine>{title}</TitleLine>
          <ArtistLine>{artist}</ArtistLine>
        </DisplayText>
        <TimeText style={box(420, 55, 168, 16)}>{fmtTime(currentTime)} / {fmtTime(duration)}</TimeText>

        <ProgressTrack ref={progressRef} style={box(28, 130, 584, 10)} role="slider" aria-label="Progreso" aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={currentTime} onClick={(e) => seek(e.clientX)}>
          <ProgressFill $pct={progress * 100} />
        </ProgressTrack>

        <HitCircle style={box(28, 238, 34, 34)} type="button" aria-label="Visualizador" aria-pressed={visualizerOn} onClick={() => setVisualizerOn((v) => !v)} />
        <HitCircle style={box(73, 238, 34, 34)} type="button" aria-label="Ver lista" onClick={() => setShowQueue((v) => !v)} disabled={!hasQueue} />
        <HitCircle style={box(118, 238, 34, 34)} type="button" aria-label="Favorito" aria-pressed={isFavorited} onClick={onToggleFavorite} disabled={!canFavorite || !track} />

        <HitCircle style={box(48, 278, 54, 54)} type="button" aria-label="Anterior" onClick={onPrev} disabled={!hasQueue} />
        <HitCircle style={box(102, 274, 62, 62)} type="button" aria-label={playing ? 'Pausar' : 'Reproducir'} aria-pressed={playing} onClick={onTogglePlay} disabled={!track} />
        <HitCircle style={box(164, 278, 54, 54)} type="button" aria-label="Siguiente" onClick={onNext} disabled={!hasQueue} />

        <VolumeTrack ref={volRef} style={box(270, 288, 150, 34)} role="slider" aria-label="Volumen" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(volume * 100)}
          onPointerDown={(e) => { setDraggingVol(true); safeSetPointerCapture(e.currentTarget, e.pointerId); setVol(e.clientX); }}
          onPointerMove={(e) => { if (draggingVol) setVol(e.clientX); }}
          onPointerUp={() => setDraggingVol(false)}
          onPointerCancel={() => setDraggingVol(false)}
        >
          <VolumeFill $pct={volume * 100} style={{ opacity: 0.35 }} />
        </VolumeTrack>

        <HitPill style={box(440, 288, 150, 34)} type="button" aria-label={ariaLabel} aria-pressed={isActive} onClick={onToggleEar} />

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
