import React, { useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Ear, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, safeSetPointerCapture, useVerticalDrag, ratioFromClientX } from '../shared';

/*
 * LIQUID NEON TANK — skin #2. A translucent tech-aquarium module: a real
 * SVG stadium-shaped tank gripped by two external metal brackets that
 * extend above and below its glass (the silhouette that reads as "tank
 * clamped into a stand", never a rounded rectangle), sitting on a base
 * plinth. The liquid fills left-to-right with playback progress and is
 * itself the seek strip; a secondary glass tube on the left bracket is an
 * independent volume level; bubbles rise only while actually playing.
 */

const VIEW_W = 480;
const VIEW_H = 270;

const CAPSULE_OUTER = 'M 120 20 L 360 20 A 80 80 0 0 1 360 180 L 120 180 A 80 80 0 0 1 120 20 Z';
const CAPSULE_INNER = 'M 126 27 L 354 27 A 73 73 0 0 1 354 173 L 126 173 A 73 73 0 0 1 126 27 Z';

const rise = keyframes`
  0% { transform: translateY(0) scale(0.6); opacity: 0; }
  15% { opacity: 0.9; }
  100% { transform: translateY(-130px) scale(1); opacity: 0; }
`;
const ripple = keyframes`
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(4px); }
`;
const valveGlow = keyframes`
  0%, 100% { box-shadow: 0 0 6px 1px var(--ln-valve); }
  50% { box-shadow: 0 0 16px 5px var(--ln-valve); }
`;

const Wrap = styled.div`
  --ln-glass: ${({ $p }) => $p.tankGlass};
  --ln-bracket: ${({ $p }) => $p.bracketMetal};
  --ln-cyan: ${({ $p }) => $p.liquidCyan};
  --ln-magenta: ${({ $p }) => $p.liquidMagenta};
  --ln-bubble: ${({ $p }) => $p.bubbleColor};
  --ln-text: ${({ $p }) => $p.displayText};
  --ln-valve: ${({ $p }) => $p.valveColor};
  --ln-led: ${({ $p }) => $p.ledColor};

  position: relative;
  width: 100%;
  max-width: 480px;
  aspect-ratio: ${VIEW_W} / ${VIEW_H};
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: var(--ln-text);
  filter: drop-shadow(0 14px 18px rgba(0, 0, 0, 0.45));
`;

const TankSvg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
`;

const Bracket = styled.rect`
  fill: url(#ln-bracket-grad);
  stroke: rgba(0, 0, 0, 0.5);
`;

const Plinth = styled.rect`
  fill: url(#ln-bracket-grad);
  stroke: rgba(0, 0, 0, 0.5);
`;

const Foot = styled.rect`
  fill: #050505;
`;

const OuterWall = styled.path`
  fill: url(#ln-wall-grad);
  stroke: color-mix(in srgb, var(--ln-cyan) 35%, transparent);
  stroke-width: 1.5;
`;

const InnerChamber = styled.path`
  fill: color-mix(in srgb, var(--ln-glass) 65%, #000);
`;

const LiquidBody = styled.rect`
  fill: url(#ln-liquid-grad);
  opacity: 0.62;
  animation: ${({ $active }) => ($active ? css`${ripple} 2.6s ease-in-out infinite` : 'none')};
`;

const GlassSheen = styled.path`
  fill: rgba(255, 255, 255, 0.10);
  pointer-events: none;
`;

const Bubble = styled.circle`
  fill: color-mix(in srgb, var(--ln-bubble) 80%, transparent);
  animation: ${({ $active, $dur }) => ($active ? css`${rise} ${$dur}ms ease-in infinite` : 'none')};
  opacity: ${({ $active }) => ($active ? 1 : 0)};
`;

const VolTubeGlass = styled.rect`
  fill: #050505;
  stroke: color-mix(in srgb, var(--ln-cyan) 30%, transparent);
`;

const VolTubeLiquid = styled.rect`
  fill: url(#ln-liquid-grad);
`;

/* ---- HTML overlay ---- */
const pct = (v, total) => `${(v / total) * 100}%`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

const SeekHit = styled.div`
  position: absolute;
  left: ${pct(120, VIEW_W)};
  top: ${pct(20, VIEW_H)};
  width: ${pct(240, VIEW_W)};
  height: ${pct(160, VIEW_H)};
  pointer-events: auto;
  cursor: pointer;
`;

const DisplayPod = styled.div`
  position: absolute;
  left: ${pct(140, VIEW_W)};
  top: ${pct(58, VIEW_H)};
  width: ${pct(150, VIEW_W)};
  height: ${pct(64, VIEW_H)};
  padding: 5px 8px;
  border-radius: 8px;
  background: rgba(4, 14, 20, 0.62);
  border: 1px solid color-mix(in srgb, var(--ln-cyan) 35%, transparent);
  pointer-events: none;
  font-family: 'Consolas', monospace;
  overflow: hidden;
`;

const TrackTitle = styled.div`
  font-size: clamp(10px, 2vw, 12px);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 0 8px color-mix(in srgb, var(--ln-cyan) 70%, transparent);
`;

const TrackSub = styled.div`
  font-size: clamp(8px, 1.4vw, 9px);
  opacity: 0.85;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TimeRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: clamp(7px, 1.2vw, 8px);
  opacity: 0.8;
  margin-top: 3px;
`;

const EmptyText = styled.div`
  font-size: clamp(9px, 1.6vw, 11px);
  opacity: 0.7;
`;

const TransportGroup = styled.div`
  position: absolute;
  left: ${pct(150, VIEW_W)};
  top: ${pct(213, VIEW_H)};
  width: ${pct(180, VIEW_W)};
  height: ${pct(40, VIEW_H)};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6%;
  pointer-events: auto;
`;

const BubbleButton = styled.button`
  width: ${({ $big }) => ($big ? '34%' : '24%')};
  aspect-ratio: 1;
  border-radius: 50%;
  border: none;
  background: radial-gradient(circle at 32% 28%, rgba(255,255,255,0.28), transparent 55%), color-mix(in srgb, var(--ln-bracket) 60%, #000);
  color: var(--ln-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);

  svg { width: 44%; height: 44%; }
  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const ValveWrap = styled.div`
  position: absolute;
  left: ${pct(357, VIEW_W)};
  top: ${pct(84, VIEW_H)};
  width: ${pct(42, VIEW_W)};
  height: ${pct(42, VIEW_H)};
  pointer-events: auto;
`;

const Valve = styled.button`
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--ln-valve) 60%, #000);
  background: ${({ $active }) => ($active
    ? 'radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--ln-valve) 90%, white), color-mix(in srgb, var(--ln-valve) 45%, #000))'
    : 'radial-gradient(circle at 35% 30%, #3a3a3f, #101012)')};
  color: ${({ $active }) => ($active ? '#04121a' : 'var(--ln-valve)')};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  animation: ${({ $active }) => ($active ? css`${valveGlow} 2s ease-in-out infinite` : 'none')};

  svg { width: 42%; height: 42%; }
`;

const VolHit = styled.div`
  position: absolute;
  left: ${pct(94, VIEW_W)};
  top: ${pct(20, VIEW_H)};
  width: ${pct(16, VIEW_W)};
  height: ${pct(140, VIEW_H)};
  pointer-events: auto;
  cursor: ns-resize;
  touch-action: none;
`;

const BAR_COUNT = 7;

export default function LiquidNeonTankSkin({
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
  volume = 0.8,
  onVolumeChange = () => {},
  onSeek = () => {},
  palette = defaultPalette
}) {
  const seekRef = useRef(null);
  const volDrag = useVerticalDrag(volume, onVolumeChange, 90);

  const playing = isActive && isPlaying;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const liquidWidth = 6 + progress * 222; // within inner chamber width (228)

  const seek = (clientX) => {
    if (!duration) return;
    onSeek(ratioFromClientX(seekRef, clientX) * duration);
  };

  const onVolDown = (e) => { safeSetPointerCapture(e.currentTarget, e.pointerId); volDrag.onPointerDown(e); };

  const volFillH = volume * 130; // inside 140-tall tube, small margin

  return (
    <Wrap $p={palette}>
      <TankSvg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="ln-bracket-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--ln-bracket) 96%, #fff 4%)' }} />
            <stop offset="100%" style={{ stopColor: 'color-mix(in srgb, var(--ln-bracket) 55%, #000)' }} />
          </linearGradient>
          <linearGradient id="ln-wall-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
            <stop offset="18%" style={{ stopColor: 'color-mix(in srgb, var(--ln-glass) 55%, transparent)' }} />
            <stop offset="100%" style={{ stopColor: 'color-mix(in srgb, var(--ln-glass) 80%, #000)' }} />
          </linearGradient>
          <linearGradient id="ln-liquid-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: 'var(--ln-cyan)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--ln-magenta)' }} />
          </linearGradient>
          <clipPath id="ln-liquid-clip">
            <path d={CAPSULE_INNER} />
          </clipPath>
        </defs>

        <Bracket x={88} y={0} width={28} height={210} rx={6} />
        <Bracket x={364} y={0} width={28} height={210} rx={6} />
        <Plinth x={40} y={210} width={400} height={45} rx={8} />
        <Foot x={70} y={255} width={30} height={8} rx={2} />
        <Foot x={380} y={255} width={30} height={8} rx={2} />

        <OuterWall d={CAPSULE_OUTER} />
        <InnerChamber d={CAPSULE_INNER} />

        <g clipPath="url(#ln-liquid-clip)">
          <LiquidBody $active={playing} x={126} y={27} width={liquidWidth} height={146} />
          {Array.from({ length: BAR_COUNT }, (_, i) => (
            <Bubble
              key={i}
              cx={150 + i * 32}
              cy={168}
              r={2.4 + (i % 3)}
              $active={playing}
              $dur={1600 + (i % 4) * 500}
            />
          ))}
        </g>
        <GlassSheen d="M 130 30 L 230 30 L 170 100 L 130 100 Z" />

        {/* volume tube on the left bracket */}
        <VolTubeGlass x={94} y={20} width={16} height={140} rx={6} />
        <VolTubeLiquid x={97} y={20 + (140 - volFillH)} width={10} height={volFillH} rx={3} />
      </TankSvg>

      <Overlay>
        <SeekHit
          ref={seekRef}
          role="slider"
          aria-label="Progreso"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={currentTime}
          onClick={(e) => seek(e.clientX)}
        />

        <DisplayPod>
          {track ? (
            <>
              <TrackTitle title={track.title}>{track.title}</TrackTitle>
              <TrackSub>{modeLabel}{track.owner_username ? ` · ${track.owner_username}` : ''}</TrackSub>
              <TimeRow>
                <span>{fmtTime(currentTime)}</span>
                <span>{isActive ? (playing ? 'FLUJO' : 'PAUSA') : 'REPOSO'}</span>
                <span>{fmtTime(duration)}</span>
              </TimeRow>
            </>
          ) : (
            <EmptyText>{mode === 'favorites' ? 'SIN FAV' : mode === 'radio' ? 'SIN SEÑAL' : 'TANQUE VACÍO'}</EmptyText>
          )}
        </DisplayPod>

        <TransportGroup>
          <BubbleButton type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
            <SkipBack />
          </BubbleButton>
          <BubbleButton $big type="button" onClick={onTogglePlay} disabled={!track} aria-label={playing ? 'Pausar' : 'Reproducir'}>
            {playing ? <Pause /> : <Play />}
          </BubbleButton>
          <BubbleButton type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
            <SkipForward />
          </BubbleButton>
        </TransportGroup>

        <ValveWrap>
          <Valve type="button" onClick={onToggleEar} $active={isActive} aria-label={ariaLabel} aria-pressed={isActive} title="Profile Listen">
            <Ear />
          </Valve>
        </ValveWrap>

        <VolHit
          role="slider"
          aria-label="Volumen"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(volume * 100)}
          onPointerDown={onVolDown}
          onPointerMove={volDrag.onPointerMove}
          onPointerUp={volDrag.onPointerUp}
          onPointerLeave={volDrag.onPointerUp}
        />
      </Overlay>
    </Wrap>
  );
}
