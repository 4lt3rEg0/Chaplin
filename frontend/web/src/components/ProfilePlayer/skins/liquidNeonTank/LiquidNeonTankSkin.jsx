import React, { useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Ear, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, useVerticalDrag, ratioFromClientX } from '../shared';

/*
 * LIQUID NEON TANK — skin #2. A translucent tech-aquarium: the shell is
 * glass, the fluid inside is the instrument. Playback state drives real
 * fluid behavior (rising bubbles, surface ripple) rather than a generic
 * equalizer; progress and volume are both read as liquid levels in their
 * own tubes; "profile listen" is a valve built into the tank wall.
 */

const rise = keyframes`
  0% { transform: translateY(6px) scale(0.6); opacity: 0; }
  15% { opacity: 0.9; }
  100% { transform: translateY(-92px) scale(1); opacity: 0; }
`;

const ripple = keyframes`
  0%, 100% { transform: translateX(0) scaleY(1); }
  50% { transform: translateX(-6px) scaleY(1.08); }
`;

const valveGlow = keyframes`
  0%, 100% { box-shadow: 0 0 6px 1px var(--ln-valve); }
  50% { box-shadow: 0 0 16px 5px var(--ln-valve); }
`;

const Shell = styled.div`
  --ln-glass: ${({ $p }) => $p.tankGlass};
  --ln-cyan: ${({ $p }) => $p.liquidCyan};
  --ln-magenta: ${({ $p }) => $p.liquidMagenta};
  --ln-bubble: ${({ $p }) => $p.bubbleColor};
  --ln-text: ${({ $p }) => $p.displayText};
  --ln-valve: ${({ $p }) => $p.valveColor};
  --ln-button: ${({ $p }) => $p.buttonColor};
  --ln-led: ${({ $p }) => $p.ledColor};

  position: relative;
  padding: 16px 16px 14px;
  border-radius: 20px;
  background:
    linear-gradient(160deg, rgba(255,255,255,0.08), transparent 40%),
    color-mix(in srgb, var(--ln-glass) 88%, #000);
  border: 1px solid color-mix(in srgb, var(--ln-cyan) 35%, transparent);
  box-shadow:
    inset 0 0 24px rgba(0,0,0,0.55),
    inset 0 1px 0 rgba(255,255,255,0.08),
    0 10px 26px rgba(0,0,0,0.4);
  color: var(--ln-text);
  font-family: 'Segoe UI', system-ui, sans-serif;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 480px) {
    padding: 12px 12px 10px;
    gap: 8px;
  }
`;

const TankBody = styled.div`
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  height: 118px;
  background: color-mix(in srgb, var(--ln-glass) 70%, #000);
  border: 1px solid color-mix(in srgb, var(--ln-cyan) 25%, transparent);

  @media (max-width: 480px) {
    height: 96px;
  }
`;

const Fluid = styled.div`
  position: absolute;
  inset: 0;
  top: ${({ $fill }) => 100 - $fill}%;
  background: linear-gradient(105deg, color-mix(in srgb, var(--ln-cyan) 55%, transparent), color-mix(in srgb, var(--ln-magenta) 45%, transparent));
  opacity: 0.55;
  animation: ${({ $active }) => ($active ? css`${ripple} 3.4s ease-in-out infinite` : 'none')};

  &::before {
    content: '';
    position: absolute;
    top: -6px;
    left: -10%;
    width: 120%;
    height: 12px;
    background: color-mix(in srgb, var(--ln-cyan) 70%, transparent);
    filter: blur(4px);
    opacity: 0.8;
  }
`;

const Bubble = styled.span`
  position: absolute;
  bottom: 4px;
  left: ${({ $x }) => $x}%;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--ln-bubble) 80%, transparent);
  box-shadow: 0 0 4px color-mix(in srgb, var(--ln-bubble) 60%, transparent);
  animation: ${({ $active, $dur }) => ($active ? css`${rise} ${$dur}ms ease-in infinite` : 'none')};
  opacity: ${({ $active }) => ($active ? 1 : 0)};
`;

const Porthole = styled.div`
  position: absolute;
  inset: 8px 8px auto 8px;
  padding: 7px 10px;
  border-radius: 10px;
  background: rgba(4, 14, 20, 0.55);
  border: 1px solid color-mix(in srgb, var(--ln-cyan) 40%, transparent);
  backdrop-filter: blur(1px);
`;

const TrackTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 0 8px color-mix(in srgb, var(--ln-cyan) 70%, transparent);
`;

const TrackSub = styled.div`
  font-size: 10px;
  opacity: 0.8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const EmptyState = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  letter-spacing: 0.05em;
  opacity: 0.65;
`;

const ProgressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 9px;
  font-family: 'Consolas', monospace;
`;

const ProgressTube = styled.div`
  flex: 1;
  height: 10px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--ln-glass) 60%, #000);
  border: 1px solid color-mix(in srgb, var(--ln-cyan) 30%, transparent);
  cursor: pointer;
  overflow: hidden;
  position: relative;
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: linear-gradient(90deg, var(--ln-cyan), var(--ln-magenta));
  box-shadow: 0 0 8px color-mix(in srgb, var(--ln-cyan) 70%, transparent);
`;

const ControlRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
`;

const TransportGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const BubbleButton = styled.button`
  width: ${({ $big }) => ($big ? '42px' : '28px')};
  height: ${({ $big }) => ($big ? '42px' : '28px')};
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--ln-cyan) 45%, transparent);
  background:
    radial-gradient(circle at 32% 28%, rgba(255,255,255,0.28), transparent 55%),
    color-mix(in srgb, var(--ln-button) 130%, #000);
  color: var(--ln-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.4);

  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const Valve = styled.button`
  position: relative;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid color-mix(in srgb, var(--ln-valve) 60%, #000);
  background: ${({ $active }) => ($active
    ? 'radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--ln-valve) 70%, white), color-mix(in srgb, var(--ln-valve) 40%, #000))'
    : 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.15), #0c1b22)')};
  color: ${({ $active }) => ($active ? '#04121a' : 'var(--ln-valve)')};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  animation: ${({ $active }) => ($active ? css`${valveGlow} 2s ease-in-out infinite` : 'none')};

  &::before {
    content: '';
    position: absolute;
    right: -8px;
    top: 50%;
    width: 8px;
    height: 4px;
    background: color-mix(in srgb, var(--ln-valve) 50%, #000);
    transform: translateY(-50%);
  }
`;

const VolumeTube = styled.div`
  position: relative;
  width: 14px;
  height: 34px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--ln-glass) 60%, #000);
  border: 1px solid color-mix(in srgb, var(--ln-cyan) 30%, transparent);
  cursor: ns-resize;
  touch-action: none;
  overflow: hidden;
`;

const VolumeFill = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: ${({ $pct }) => $pct}%;
  background: linear-gradient(180deg, var(--ln-magenta), var(--ln-cyan));
`;

const BUBBLES = 7;

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
  const tubeRef = useRef(null);
  const volRef = useRef(null);
  const drag = useVerticalDrag(volume, onVolumeChange, 90);

  const playing = isActive && isPlaying;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const fillLevel = 18 + progress * 74;

  const seek = (clientX) => {
    if (!duration) return;
    onSeek(ratioFromClientX(tubeRef, clientX) * duration);
  };

  return (
    <Shell $p={palette}>
      <TankBody>
        <Fluid $fill={fillLevel} $active={playing} />
        {Array.from({ length: BUBBLES }, (_, i) => (
          <Bubble
            key={i}
            $x={10 + i * 12}
            $size={3 + (i % 3)}
            $dur={1400 + (i % 4) * 500}
            $active={playing}
          />
        ))}
        <Porthole>
          {track ? (
            <>
              <TrackTitle title={track.title}>{track.title}</TrackTitle>
              <TrackSub>{modeLabel}{track.owner_username ? ` · ${track.owner_username}` : ''} · {fmtTime(currentTime)} / {fmtTime(duration)}</TrackSub>
            </>
          ) : (
            <TrackSub>{mode === 'favorites' ? 'TANQUE SIN FAVORITAS' : mode === 'radio' ? 'RADIO SIN SEÑAL' : 'TANQUE VACÍO'}</TrackSub>
          )}
        </Porthole>
        {!track && <EmptyState>· · ·</EmptyState>}
      </TankBody>

      <ProgressRow>
        <span>{fmtTime(currentTime)}</span>
        <ProgressTube
          ref={tubeRef}
          role="slider"
          aria-label="Progreso"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={currentTime}
          onClick={(e) => seek(e.clientX)}
        >
          <ProgressFill $pct={progress * 100} />
        </ProgressTube>
        <span>{fmtTime(duration)}</span>
      </ProgressRow>

      <ControlRow>
        <TransportGroup>
          <BubbleButton type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
            <SkipBack size={12} />
          </BubbleButton>
          <Valve
            type="button"
            onClick={onToggleEar}
            $active={isActive}
            aria-label={ariaLabel}
            aria-pressed={isActive}
            title="Profile Listen"
          >
            <Ear size={15} />
          </Valve>
        </TransportGroup>

        <TransportGroup style={{ justifyContent: 'center' }}>
          <BubbleButton
            type="button"
            $big
            onClick={onTogglePlay}
            aria-label={playing ? 'Pausar' : 'Reproducir'}
            disabled={!track}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </BubbleButton>
        </TransportGroup>

        <TransportGroup>
          <BubbleButton type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
            <SkipForward size={12} />
          </BubbleButton>
          <VolumeTube
            ref={volRef}
            role="slider"
            aria-label="Volumen"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(volume * 100)}
            onPointerDown={drag.onPointerDown}
            onPointerMove={drag.onPointerMove}
            onPointerUp={drag.onPointerUp}
            onPointerLeave={drag.onPointerUp}
          >
            <VolumeFill $pct={volume * 100} />
          </VolumeTube>
        </TransportGroup>
      </ControlRow>
    </Shell>
  );
}
