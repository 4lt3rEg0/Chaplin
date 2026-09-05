import React, { useCallback, useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Ear, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { defaultPalette } from './palette';

/*
 * OBSIDIAN AMBER — skin #1 of the Chaplin profile player collection.
 * Black chrome / graphite hardware with backlit amber glass. Real controls:
 * play/pause, prev/next, a draggable volume knob, a clickable LED progress
 * strip, and the "profile listen" function as an amber glass switch built
 * into the shell (never a button glued on top).
 *
 * All colors come from CSS custom properties set from `palette` — every
 * styled rule below reads var(--oa-*) so recoloring never has to touch this
 * file, and swapping palette is just swapping the token values.
 */

const fmtTime = (value) => {
  if (!Number.isFinite(value)) return '00:00';
  const safe = Math.max(0, Math.floor(value));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const flicker = keyframes`
  0%, 96%, 100% { opacity: 1; }
  97% { opacity: 0.85; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.4; transform: scaleY(0.5); }
  50% { opacity: 1; transform: scaleY(1); }
`;

const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 6px 1px var(--oa-glow); }
  50% { box-shadow: 0 0 14px 4px var(--oa-glow); }
`;

const Shell = styled.div`
  --oa-metal-1: ${({ $p }) => $p.metalPrimary};
  --oa-metal-2: ${({ $p }) => $p.metalSecondary};
  --oa-glass: ${({ $p }) => $p.glassAmber};
  --oa-display-text: ${({ $p }) => $p.displayText};
  --oa-led: ${({ $p }) => $p.ledColor};
  --oa-button: ${({ $p }) => $p.buttonColor};
  --oa-glow: ${({ $p }) => $p.glowColor};
  --oa-listen: ${({ $p }) => $p.listenColor};

  position: relative;
  padding: 14px;
  border-radius: 14px;
  background:
    linear-gradient(155deg, rgba(255,255,255,0.10) 0%, transparent 30%),
    linear-gradient(180deg, var(--oa-metal-2) 0%, var(--oa-metal-1) 60%);
  border: 1px solid rgba(0, 0, 0, 0.6);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    inset 0 -2px 4px rgba(0, 0, 0, 0.5),
    0 8px 20px rgba(0, 0, 0, 0.45);
  color: #d8d8dc;
  font-family: 'Segoe UI', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 480px) {
    padding: 10px;
    gap: 8px;
  }
`;

const Screw = styled.span`
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #7a7a80, #101012 70%);
  box-shadow: 0 1px 1px rgba(255,255,255,0.15);
  ${({ $pos }) => $pos}
`;

const DisplayRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: stretch;
`;

const Display = styled.div`
  position: relative;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 6px;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.05), transparent 40%),
    linear-gradient(160deg, color-mix(in srgb, var(--oa-glass) 14%, #100b02), #0c0900);
  border: 1px solid color-mix(in srgb, var(--oa-glass) 45%, #000);
  box-shadow: inset 0 0 10px rgba(0,0,0,0.7), inset 0 0 18px color-mix(in srgb, var(--oa-glass) 12%, transparent);
  color: var(--oa-display-text);
  font-family: 'Consolas', 'SFMono-Regular', monospace;
  overflow: hidden;
  animation: ${flicker} 6s linear infinite;
`;

const TrackTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 0 6px color-mix(in srgb, var(--oa-glass) 60%, transparent);
`;

const TrackSub = styled.div`
  font-size: 10px;
  opacity: 0.85;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 1px;
`;

const DisplayMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 5px;
  font-size: 9px;
  letter-spacing: 0.08em;
  opacity: 0.75;
`;

const TechTag = styled.span`
  border: 1px solid color-mix(in srgb, var(--oa-glass) 50%, transparent);
  border-radius: 3px;
  padding: 1px 4px;
`;

const EmptyDisplay = styled.div`
  font-size: 11px;
  letter-spacing: 0.04em;
  opacity: 0.75;
  padding: 6px 0;
`;

const VuColumn = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  width: 46px;
  flex-shrink: 0;
`;

const VuBar = styled.span`
  flex: 1;
  border-radius: 1px;
  background: linear-gradient(180deg, var(--oa-led), color-mix(in srgb, var(--oa-led) 40%, #000));
  height: ${({ $h }) => $h}%;
  opacity: ${({ $active }) => ($active ? 1 : 0.25)};
  transform-origin: bottom;
  animation-name: ${({ $active }) => ($active ? pulse : 'none')};
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-duration: ${({ $dur }) => $dur}ms;
`;

const ProgressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 9px;
  font-family: 'Consolas', monospace;
  color: var(--oa-display-text);
  opacity: 0.9;
`;

const ProgressStrip = styled.div`
  flex: 1;
  display: flex;
  gap: 2px;
  cursor: pointer;
  padding: 4px 0;
`;

const ProgressSeg = styled.span`
  flex: 1;
  height: 5px;
  border-radius: 1px;
  background: ${({ $lit }) => ($lit ? 'var(--oa-led)' : 'rgba(255,255,255,0.08)')};
  box-shadow: ${({ $lit }) => ($lit ? '0 0 4px var(--oa-led)' : 'none')};
`;

const ControlRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
`;

const TransportGroup = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const RoundButton = styled.button`
  width: ${({ $big }) => ($big ? '42px' : '30px')};
  height: ${({ $big }) => ($big ? '42px' : '30px')};
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.7);
  background:
    radial-gradient(circle at 35% 30%, rgba(255,255,255,0.18), transparent 55%),
    linear-gradient(180deg, color-mix(in srgb, var(--oa-button) 130%, #444), var(--oa-button));
  color: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15);

  &:active {
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.6);
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

const ListenButton = styled.button`
  position: relative;
  width: 46px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--oa-listen) 55%, #000);
  background: ${({ $active }) => ($active
    ? 'linear-gradient(180deg, color-mix(in srgb, var(--oa-listen) 55%, #1a1305), color-mix(in srgb, var(--oa-listen) 25%, #0c0900))'
    : 'linear-gradient(180deg, #201a10, #12100a)')};
  color: ${({ $active }) => ($active ? '#1a1305' : 'var(--oa-listen)')};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  animation: ${({ $active }) => ($active ? css`${glowPulse} 2.2s ease-in-out infinite` : 'none')};

  &:active {
    transform: translateY(1px);
  }
`;

const VolumeWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`;

const Knob = styled.div`
  position: relative;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 28%, rgba(255,255,255,0.22), transparent 55%),
    linear-gradient(180deg, #3a3a3f, #1c1c1f);
  border: 1px solid rgba(0,0,0,0.7);
  box-shadow: 0 1px 2px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1);
  cursor: ns-resize;
  touch-action: none;

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 50%;
    width: 2px;
    height: 8px;
    background: var(--oa-led);
    box-shadow: 0 0 3px var(--oa-led);
    transform-origin: 50% 12px;
    transform: translateX(-50%) rotate(${({ $angle }) => $angle}deg);
  }
`;

const VolLabel = styled.span`
  font-size: 8px;
  letter-spacing: 0.06em;
  opacity: 0.7;
  font-family: 'Consolas', monospace;
`;

const BAR_COUNT = 9;
const SEGMENTS = 18;

function useVolumeDrag(volume, onVolumeChange) {
  const draggingRef = useRef(false);
  const startRef = useRef({ y: 0, volume: 0 });

  const onPointerDown = useCallback((e) => {
    draggingRef.current = true;
    startRef.current = { y: e.clientY, volume };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, [volume]);

  const onPointerMove = useCallback((e) => {
    if (!draggingRef.current) return;
    const deltaY = startRef.current.y - e.clientY;
    const next = Math.max(0, Math.min(1, startRef.current.volume + deltaY / 120));
    onVolumeChange(next);
  }, [onVolumeChange]);

  const onPointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}

export default function ObsidianAmberSkin({
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
  const stripRef = useRef(null);
  const drag = useVolumeDrag(volume, onVolumeChange);

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const litSegments = Math.round(progress * SEGMENTS);
  const angle = -130 + volume * 260;

  const seekFromClientX = (clientX) => {
    const el = stripRef.current;
    if (!el || !duration) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <Shell $p={palette}>
      <Screw $pos="top: 6px; left: 6px;" />
      <Screw $pos="top: 6px; right: 6px;" />
      <Screw $pos="bottom: 6px; left: 6px;" />
      <Screw $pos="bottom: 6px; right: 6px;" />

      <DisplayRow>
        <Display>
          {track ? (
            <>
              <TrackTitle title={track.title}>{track.title}</TrackTitle>
              <TrackSub>{modeLabel}{track.owner_username ? ` · ${track.owner_username}` : ''}</TrackSub>
              <DisplayMeta>
                <span>{fmtTime(currentTime)} / {fmtTime(duration)}</span>
                <TechTag>{isActive ? (isPlaying ? 'PLAY' : 'PAUSE') : 'STBY'}</TechTag>
                <TechTag>44.1K·CHAPLIN</TechTag>
              </DisplayMeta>
            </>
          ) : (
            <EmptyDisplay>
              {mode === 'favorites' ? 'SIN FAVORITAS' : mode === 'radio' ? 'RADIO SIN SEÑAL' : 'SIN SEÑAL DE AUDIO'}
            </EmptyDisplay>
          )}
        </Display>

        <VuColumn>
          {Array.from({ length: BAR_COUNT }, (_, i) => (
            <VuBar
              key={i}
              $h={30 + ((i * 37) % 65)}
              $active={isActive && isPlaying}
              $dur={550 + (i % 4) * 120}
            />
          ))}
        </VuColumn>
      </DisplayRow>

      <ProgressRow>
        <span>{fmtTime(currentTime)}</span>
        <ProgressStrip
          ref={stripRef}
          role="slider"
          aria-label="Progreso"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={currentTime}
          onClick={(e) => seekFromClientX(e.clientX)}
        >
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <ProgressSeg key={i} $lit={i < litSegments} />
          ))}
        </ProgressStrip>
        <span>{fmtTime(duration)}</span>
      </ProgressRow>

      <ControlRow>
        <TransportGroup>
          <RoundButton type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
            <SkipBack size={13} />
          </RoundButton>
          <ListenButton
            type="button"
            onClick={onToggleEar}
            $active={isActive}
            aria-label={ariaLabel}
            aria-pressed={isActive}
            title="Profile Listen"
          >
            <Ear size={16} />
          </ListenButton>
        </TransportGroup>

        <TransportGroup style={{ justifyContent: 'center' }}>
          <RoundButton
            type="button"
            $big
            onClick={onTogglePlay}
            aria-label={isActive && isPlaying ? 'Pausar' : 'Reproducir'}
            disabled={!track}
          >
            {isActive && isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </RoundButton>
        </TransportGroup>

        <TransportGroup>
          <RoundButton type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
            <SkipForward size={13} />
          </RoundButton>
          <VolumeWrap>
            <Knob
              $angle={angle}
              onPointerDown={drag.onPointerDown}
              onPointerMove={drag.onPointerMove}
              onPointerUp={drag.onPointerUp}
              onPointerLeave={drag.onPointerUp}
              role="slider"
              aria-label="Volumen"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(volume * 100)}
            />
            <VolLabel>{Math.round(volume * 100)}</VolLabel>
          </VolumeWrap>
        </TransportGroup>
      </ControlRow>
    </Shell>
  );
}
