import React, { useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Ear, Gem, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, ratioFromAngle, safeSetPointerCapture, useVerticalDrag } from '../shared';

/*
 * NOCTURNE//RELIQUARY — skin #9. Gothic chapel architecture, not Halloween
 * horror: pointed arches, stone tracery and jewel-tone stained glass. The
 * rose window is a real, clickable progress ring; the glass-pane row is a
 * real playback visualizer; the "gem" is the real favorite flag.
 */

const START_DEG = -120;
const SWEEP_DEG = 240;

const gemGlow = keyframes`
  0%, 100% { filter: drop-shadow(0 0 3px var(--nr-gem)); }
  50% { filter: drop-shadow(0 0 8px var(--nr-gem)); }
`;

const paneGlow = keyframes`
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
`;

const ARCH_CLIP = 'polygon(50% 0%, 100% 30%, 100% 100%, 0% 100%, 0% 30%)';

const Shell = styled.div`
  --nr-stone: ${({ $p }) => $p.stoneColor};
  --nr-tracery: ${({ $p }) => $p.traceryColor};
  --nr-blue: ${({ $p }) => $p.glassBlue};
  --nr-gold: ${({ $p }) => $p.glassGold};
  --nr-violet: ${({ $p }) => $p.glassViolet};
  --nr-text: ${({ $p }) => $p.displayText};
  --nr-gem: ${({ $p }) => $p.gemColor};
  --nr-button: ${({ $p }) => $p.buttonColor};

  position: relative;
  padding: 16px 14px 14px;
  border-radius: 10px;
  background:
    linear-gradient(160deg, rgba(255,255,255,0.05), transparent 40%),
    linear-gradient(180deg, color-mix(in srgb, var(--nr-stone) 120%, #000), var(--nr-stone));
  border: 1px solid color-mix(in srgb, var(--nr-tracery) 55%, transparent);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 20px rgba(0,0,0,0.45);
  color: var(--nr-text);
  font-family: 'Segoe UI', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 480px) {
    padding: 12px 10px 10px;
    gap: 8px;
  }
`;

const TopRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
`;

const RoseWrap = styled.div`
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
  border: 2px solid color-mix(in srgb, var(--nr-tracery) 70%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--nr-stone) 90%, #000);

  @media (max-width: 480px) {
    width: 60px;
    height: 60px;
  }
`;

const RoseGlass = styled.div`
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: conic-gradient(
    var(--nr-gold) 0% ${({ $pct }) => $pct * 0.25}%,
    var(--nr-blue) ${({ $pct }) => $pct * 0.25}% ${({ $pct }) => $pct * 0.6}%,
    var(--nr-violet) ${({ $pct }) => $pct * 0.6}% ${({ $pct }) => $pct}%,
    color-mix(in srgb, var(--nr-tracery) 35%, transparent) ${({ $pct }) => $pct}% 100%
  );
`;

const RoseHub = styled.div`
  position: absolute;
  inset: 30%;
  border-radius: 50%;
  background: var(--nr-stone);
  border: 1px solid color-mix(in srgb, var(--nr-tracery) 60%, transparent);
`;

const RoseSpoke = styled.span`
  position: absolute;
  top: 4px;
  left: 50%;
  width: 1px;
  height: calc(50% - 4px);
  background: color-mix(in srgb, var(--nr-tracery) 80%, transparent);
  transform-origin: bottom center;
  transform: translateX(-50%) rotate(${({ $deg }) => $deg}deg);
`;

const Display = styled.div`
  min-width: 0;
  clip-path: ${ARCH_CLIP};
  padding: 14px 10px 8px;
  background: rgba(10, 8, 20, 0.55);
  border: 1px solid color-mix(in srgb, var(--nr-tracery) 45%, transparent);
`;

const TrackTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TrackSub = styled.div`
  font-size: 10px;
  opacity: 0.8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
`;

const TimeRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  opacity: 0.75;
  margin-top: 4px;
  font-family: 'Consolas', monospace;
`;

const PaneRow = styled.div`
  display: flex;
  gap: 3px;
`;

const Pane = styled.span`
  flex: 1;
  height: 12px;
  border-radius: 2px;
  background: ${({ $c }) => $c};
  opacity: ${({ $active }) => ($active ? 1 : 0.3)};
  animation: ${({ $active, $dur }) => ($active ? css`${paneGlow} ${$dur}ms ease-in-out infinite` : 'none')};
  box-shadow: ${({ $active, $c }) => ($active ? `0 0 5px ${$c}` : 'none')};
`;

const ControlRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
`;

const TransportGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ArchButton = styled.button`
  width: 26px;
  height: 26px;
  clip-path: ${ARCH_CLIP};
  border: none;
  background: linear-gradient(180deg, color-mix(in srgb, var(--nr-button) 150%, #555), var(--nr-button));
  color: var(--nr-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const PlayButton = styled(ArchButton)`
  width: 36px;
  height: 36px;
`;

const VigilButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--nr-blue) 55%, #000);
  background: ${({ $active }) => ($active
    ? 'linear-gradient(180deg, color-mix(in srgb, var(--nr-blue) 55%, #001), color-mix(in srgb, var(--nr-blue) 25%, #000))'
    : 'linear-gradient(180deg, #201d30, #14121e)')};
  color: ${({ $active }) => ($active ? '#eef2ff' : 'var(--nr-blue)')};
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;

  &:active { transform: translateY(1px); }
`;

const GemButton = styled.button`
  border: none;
  background: none;
  color: ${({ $on }) => ($on ? 'var(--nr-gem)' : 'color-mix(in srgb, var(--nr-gem) 40%, #555)')};
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  display: flex;
  align-items: center;
  animation: ${({ $on }) => ($on ? css`${gemGlow} 2s ease-in-out infinite` : 'none')};
  opacity: ${({ disabled }) => (disabled ? 0.4 : 1)};
`;

const VolTrack = styled.div`
  position: relative;
  width: 10px;
  height: 36px;
  border-radius: 5px;
  background: rgba(255,255,255,0.08);
  cursor: ns-resize;
  touch-action: none;
  overflow: hidden;
`;

const VolFill = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: ${({ $pct }) => $pct}%;
  background: var(--nr-blue);
`;

const PANE_COLORS = ['var(--nr-gold)', 'var(--nr-blue)', 'var(--nr-violet)', 'var(--nr-gold)', 'var(--nr-blue)', 'var(--nr-violet)'];

export default function NocturneReliquarySkin({
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
  isFavorited = false,
  canFavorite = false,
  onToggleFavorite = () => {},
  palette = defaultPalette
}) {
  const roseRef = useRef(null);
  const draggingRose = useRef(false);
  const volDrag = useVerticalDrag(volume, onVolumeChange, 100);

  const playing = isActive && isPlaying;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  const seekFromPointer = (e) => {
    if (!duration) return;
    onSeek(ratioFromAngle(roseRef, e.clientX, e.clientY, START_DEG, SWEEP_DEG) * duration);
  };

  const onRoseDown = (e) => { draggingRose.current = true; safeSetPointerCapture(e.currentTarget, e.pointerId); seekFromPointer(e); };
  const onRoseMove = (e) => { if (draggingRose.current) seekFromPointer(e); };
  const onRoseUp = () => { draggingRose.current = false; };

  return (
    <Shell $p={palette}>
      <TopRow>
        <RoseWrap
          ref={roseRef}
          role="slider"
          aria-label="Progreso"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={currentTime}
          onPointerDown={onRoseDown}
          onPointerMove={onRoseMove}
          onPointerUp={onRoseUp}
          onPointerLeave={onRoseUp}
        >
          <RoseGlass $pct={progress * 100} />
          {Array.from({ length: 8 }, (_, i) => <RoseSpoke key={i} $deg={i * 45} />)}
          <RoseHub />
        </RoseWrap>

        <Display>
          {track ? (
            <>
              <TrackTitle title={track.title}>{track.title}</TrackTitle>
              <TrackSub>{modeLabel}{track.owner_username ? ` · ${track.owner_username}` : ''}</TrackSub>
              <TimeRow><span>{fmtTime(currentTime)}</span><span>{fmtTime(duration)}</span></TimeRow>
            </>
          ) : (
            <TrackSub>{mode === 'favorites' ? 'SIN FAVORITAS' : mode === 'radio' ? 'RADIO SIN SEÑAL' : 'CRIPTA EN SILENCIO'}</TrackSub>
          )}
        </Display>
      </TopRow>

      <PaneRow>
        {PANE_COLORS.map((c, i) => (
          <Pane key={i} $c={c} $active={playing} $dur={900 + (i % 3) * 300} />
        ))}
      </PaneRow>

      <ControlRow>
        <TransportGroup>
          <ArchButton type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
            <SkipBack size={11} />
          </ArchButton>
          <GemButton
            type="button"
            onClick={() => canFavorite && onToggleFavorite()}
            disabled={!canFavorite || !track}
            $on={isFavorited}
            aria-pressed={isFavorited}
            aria-label="Favorito (gema)"
            title={canFavorite ? 'Gema de favorito' : 'Solo el dueño puede encender la gema'}
          >
            <Gem size={16} fill={isFavorited ? 'currentColor' : 'none'} />
          </GemButton>
        </TransportGroup>

        <TransportGroup style={{ justifyContent: 'center' }}>
          <PlayButton type="button" onClick={onTogglePlay} disabled={!track} aria-label={playing ? 'Pausar' : 'Reproducir'}>
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </PlayButton>
        </TransportGroup>

        <TransportGroup>
          <ArchButton type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
            <SkipForward size={11} />
          </ArchButton>
          <VolTrack
            role="slider"
            aria-label="Volumen"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(volume * 100)}
            onPointerDown={volDrag.onPointerDown}
            onPointerMove={volDrag.onPointerMove}
            onPointerUp={volDrag.onPointerUp}
            onPointerLeave={volDrag.onPointerUp}
          >
            <VolFill $pct={volume * 100} />
          </VolTrack>
        </TransportGroup>
      </ControlRow>

      <VigilButton
        type="button"
        onClick={onToggleEar}
        $active={isActive}
        aria-label={ariaLabel}
        aria-pressed={isActive}
        title="Profile Listen"
        style={{ alignSelf: 'center' }}
      >
        <Ear size={11} /> {isActive ? 'EN VIGILIA' : 'INICIAR VIGILIA'}
      </VigilButton>
    </Shell>
  );
}
