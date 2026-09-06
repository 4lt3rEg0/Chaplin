import React, { useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Heart, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, ratioFromAngle, ratioFromClientX, safeSetPointerCapture } from '../shared';

/*
 * NEON//HEART — skin #11. A cybernetic heart core, not generic cyberpunk
 * glitch/katakana dressing. The core only beats while actually playing, the
 * halo ring is real, clickable song progress, and CORE LINK is the real
 * profile-listen handoff.
 */

const START_DEG = 0;
const SWEEP_DEG = 360;

const beat = keyframes`
  0%, 100% { transform: scale(1); }
  20% { transform: scale(1.16); }
  35% { transform: scale(0.98); }
  50% { transform: scale(1.1); }
  70% { transform: scale(1); }
`;

const traceFlicker = keyframes`
  0%, 100% { opacity: 0.25; }
  50% { opacity: 0.75; }
`;

const linkGlow = keyframes`
  0%, 100% { box-shadow: 0 0 5px 1px var(--nh-link); }
  50% { box-shadow: 0 0 13px 4px var(--nh-link); }
`;

const Shell = styled.div`
  --nh-panel: ${({ $p }) => $p.panelColor};
  --nh-circuit: ${({ $p }) => $p.circuitColor};
  --nh-core: ${({ $p }) => $p.coreColor};
  --nh-halo: ${({ $p }) => $p.haloColor};
  --nh-text: ${({ $p }) => $p.displayText};
  --nh-link: ${({ $p }) => $p.linkColor};
  --nh-button: ${({ $p }) => $p.buttonColor};

  position: relative;
  padding: 14px;
  border-radius: 14px;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--nh-circuit) 25%, transparent) 1px, transparent 1px) 0 0 / 22px 100%,
    linear-gradient(0deg, color-mix(in srgb, var(--nh-circuit) 25%, transparent) 1px, transparent 1px) 0 0 / 100% 22px,
    var(--nh-panel);
  border: 1px solid color-mix(in srgb, var(--nh-halo) 35%, transparent);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 22px rgba(0,0,0,0.5);
  color: var(--nh-text);
  font-family: 'Segoe UI', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;

  @media (max-width: 480px) {
    padding: 10px;
    gap: 8px;
  }
`;

const TopRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
`;

const CoreWrap = styled.div`
  position: relative;
  width: 70px;
  height: 70px;
  flex-shrink: 0;
  cursor: pointer;

  @media (max-width: 480px) {
    width: 58px;
    height: 58px;
  }
`;

const Halo = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(var(--nh-halo) ${({ $pct }) => $pct}%, rgba(255,255,255,0.08) 0);
  mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
`;

const TraceLine = styled.span`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 14px;
  height: 1px;
  background: var(--nh-circuit);
  transform-origin: left center;
  transform: translateY(-50%) rotate(${({ $deg }) => $deg}deg) translateX(38px);
  animation: ${({ $active }) => ($active ? css`${traceFlicker} 1.4s ease-in-out infinite` : 'none')};
  opacity: ${({ $active }) => ($active ? 0.6 : 0.2)};
`;

const CoreIcon = styled(Heart)`
  position: absolute;
  inset: 0;
  margin: auto;
  color: var(--nh-core);
  filter: drop-shadow(0 0 8px var(--nh-core));
  animation: ${({ $active }) => ($active ? css`${beat} 1.1s ease-in-out infinite` : 'none')};
`;

const Display = styled.div`
  min-width: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(8, 4, 18, 0.55);
  border: 1px solid color-mix(in srgb, var(--nh-halo) 35%, transparent);
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

const HexButton = styled.button`
  width: 28px;
  height: 28px;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  border: none;
  background: linear-gradient(180deg, color-mix(in srgb, var(--nh-button) 150%, #555), var(--nh-button));
  color: var(--nh-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const PlayButton = styled(HexButton)`
  width: 38px;
  height: 38px;
`;

const LinkButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 9px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--nh-link) 55%, #000);
  background: ${({ $active }) => ($active
    ? 'linear-gradient(180deg, color-mix(in srgb, var(--nh-link) 55%, #012), color-mix(in srgb, var(--nh-link) 25%, #001))'
    : 'linear-gradient(180deg, #1c1430, #120e20)')};
  color: ${({ $active }) => ($active ? '#00181c' : 'var(--nh-link)')};
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  animation: ${({ $active }) => ($active ? css`${linkGlow} 2s ease-in-out infinite` : 'none')};

  &:active { transform: translateY(1px); }
`;

const PowerBar = styled.div`
  position: relative;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.08);
  cursor: pointer;
  overflow: hidden;
`;

const PowerFill = styled.div`
  position: absolute;
  inset: 0;
  width: ${({ $pct }) => $pct}%;
  background: linear-gradient(90deg, var(--nh-halo), var(--nh-core));
`;

export default function NeonHeartSkin({
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
  const coreRef = useRef(null);
  const draggingCore = useRef(false);
  const volRef = useRef(null);
  const draggingVol = useRef(false);

  const playing = isActive && isPlaying;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  const seekFromPointer = (e) => {
    if (!duration) return;
    onSeek(ratioFromAngle(coreRef, e.clientX, e.clientY, START_DEG, SWEEP_DEG) * duration);
  };
  const onCoreDown = (e) => { draggingCore.current = true; safeSetPointerCapture(e.currentTarget, e.pointerId); seekFromPointer(e); };
  const onCoreMove = (e) => { if (draggingCore.current) seekFromPointer(e); };
  const onCoreUp = () => { draggingCore.current = false; };

  const onVolDown = (e) => { draggingVol.current = true; safeSetPointerCapture(e.currentTarget, e.pointerId); onVolumeChange(ratioFromClientX(volRef, e.clientX)); };
  const onVolMove = (e) => { if (draggingVol.current) onVolumeChange(ratioFromClientX(volRef, e.clientX)); };
  const onVolUp = () => { draggingVol.current = false; };

  return (
    <Shell $p={palette}>
      <TopRow>
        <CoreWrap
          ref={coreRef}
          role="slider"
          aria-label="Progreso"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={currentTime}
          onPointerDown={onCoreDown}
          onPointerMove={onCoreMove}
          onPointerUp={onCoreUp}
          onPointerLeave={onCoreUp}
        >
          <Halo $pct={progress * 100} />
          {Array.from({ length: 6 }, (_, i) => <TraceLine key={i} $deg={i * 60} $active={playing} />)}
          <CoreIcon size={26} fill="currentColor" $active={playing} />
        </CoreWrap>

        <Display>
          {track ? (
            <>
              <TrackTitle title={track.title}>{track.title}</TrackTitle>
              <TrackSub>{modeLabel}{track.owner_username ? ` · ${track.owner_username}` : ''}</TrackSub>
              <TimeRow><span>{fmtTime(currentTime)}</span><span>{fmtTime(duration)}</span></TimeRow>
            </>
          ) : (
            <TrackSub>{mode === 'favorites' ? 'SIN FAVORITAS' : mode === 'radio' ? 'RADIO SIN SEÑAL' : 'NÚCLEO EN REPOSO'}</TrackSub>
          )}
        </Display>
      </TopRow>

      <PowerBar
        ref={volRef}
        role="slider"
        aria-label="Volumen"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(volume * 100)}
        onPointerDown={onVolDown}
        onPointerMove={onVolMove}
        onPointerUp={onVolUp}
        onPointerLeave={onVolUp}
      >
        <PowerFill $pct={volume * 100} />
      </PowerBar>

      <ControlRow>
        <TransportGroup>
          <HexButton type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
            <SkipBack size={12} />
          </HexButton>
          <PlayButton type="button" onClick={onTogglePlay} disabled={!track} aria-label={playing ? 'Pausar' : 'Reproducir'}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </PlayButton>
          <HexButton type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
            <SkipForward size={12} />
          </HexButton>
        </TransportGroup>

        <div />

        <LinkButton
          type="button"
          onClick={onToggleEar}
          $active={isActive}
          aria-label={ariaLabel}
          aria-pressed={isActive}
          title="Profile Listen"
        >
          <Heart size={11} fill={isActive ? 'currentColor' : 'none'} /> {isActive ? 'LINKED' : 'CORE LINK'}
        </LinkButton>
      </ControlRow>
    </Shell>
  );
}
