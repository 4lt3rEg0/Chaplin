import React, { useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Cog, Pause, Play, SkipBack, SkipForward, Zap } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, ratioFromAngle, safeSetPointerCapture } from '../shared';

/*
 * AETHER//ENGINE — skin #10. Steampunk brass engine. The gears actually spin
 * (opposite directions, real running/frozen state on play/pause) instead of
 * being static decoration; the odometer digits are the real elapsed time,
 * not a fake counter; the pressure gauge is a real, draggable volume dial.
 */

const START_DEG = -130;
const SWEEP_DEG = 260;

const spinCw = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;
const spinCcw = keyframes`from { transform: rotate(0deg); } to { transform: rotate(-360deg); }`;

const needleThrum = keyframes`
  0%, 100% { filter: drop-shadow(0 0 2px var(--ae-needle)); }
  50% { filter: drop-shadow(0 0 5px var(--ae-needle)); }
`;

const linkGlow = keyframes`
  0%, 100% { box-shadow: 0 0 5px 1px var(--ae-link); }
  50% { box-shadow: 0 0 13px 4px var(--ae-link); }
`;

const Shell = styled.div`
  --ae-panel: ${({ $p }) => $p.brassPanel};
  --ae-copper: ${({ $p }) => $p.copperAccent};
  --ae-gear: ${({ $p }) => $p.gearColor};
  --ae-face: ${({ $p }) => $p.gaugeFace};
  --ae-needle: ${({ $p }) => $p.needleColor};
  --ae-text: ${({ $p }) => $p.displayText};
  --ae-link: ${({ $p }) => $p.linkColor};
  --ae-button: ${({ $p }) => $p.buttonColor};

  position: relative;
  padding: 14px;
  border-radius: 10px;
  background:
    linear-gradient(160deg, rgba(255,255,255,0.08), transparent 35%),
    linear-gradient(180deg, color-mix(in srgb, var(--ae-panel) 130%, #000), var(--ae-panel));
  border: 3px solid color-mix(in srgb, var(--ae-copper) 40%, #000);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 20px rgba(0,0,0,0.5);
  color: var(--ae-text);
  font-family: 'Georgia', 'Segoe UI', serif;
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 480px) {
    padding: 10px;
    gap: 8px;
  }
`;

const Rivet = styled.span`
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--ae-copper) 80%, #fff 20%), #241608 70%);
  ${({ $pos }) => $pos}
`;

const TopRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
`;

const GearStack = styled.div`
  position: relative;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
`;

const GearIcon = styled(Cog)`
  position: absolute;
  color: var(--ae-gear);
  animation: ${({ $dir }) => ($dir === 'cw' ? css`${spinCw} 3.2s linear infinite` : css`${spinCcw} 4s linear infinite`)};
  animation-play-state: ${({ $running }) => ($running ? 'running' : 'paused')};
`;

const Display = styled.div`
  min-width: 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: linear-gradient(160deg, rgba(255,255,255,0.05), transparent 40%), #16100a;
  border: 1px solid color-mix(in srgb, var(--ae-copper) 45%, transparent);
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

const GaugeWrap = styled.div`
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
  border: 2px solid color-mix(in srgb, var(--ae-copper) 60%, #000);
`;

const GaugeFace = styled.div`
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 32%, color-mix(in srgb, var(--ae-face) 160%, #fff 6%), var(--ae-face) 70%);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.6);
`;

const GaugeArc = styled.div`
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: conic-gradient(var(--ae-needle) ${({ $pct }) => $pct * 0.72}%, transparent 0);
  transform: rotate(126deg);
  mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
`;

const Needle = styled.div`
  position: absolute;
  left: 50%;
  bottom: 50%;
  width: 2px;
  height: 32%;
  background: var(--ae-needle);
  transform-origin: 50% 100%;
  transform: translateX(-50%) rotate(${({ $deg }) => $deg}deg);
  animation: ${css`${needleThrum} 2.4s ease-in-out infinite`};
`;

const OdoRow = styled.div`
  display: flex;
  gap: 2px;
  cursor: pointer;
  font-family: 'Consolas', monospace;
`;

const OdoDigit = styled.span`
  flex: 1;
  text-align: center;
  padding: 3px 0;
  border-radius: 2px;
  background: #100b06;
  border: 1px solid color-mix(in srgb, var(--ae-copper) 40%, transparent);
  color: var(--ae-text);
  font-size: 11px;
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

const BrassButton = styled.button`
  width: ${({ $big }) => ($big ? '38px' : '28px')};
  height: ${({ $big }) => ($big ? '38px' : '28px')};
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--ae-copper) 50%, #000);
  background: radial-gradient(circle at 35% 28%, color-mix(in srgb, var(--ae-copper) 55%, #fff 8%), var(--ae-button) 70%);
  color: var(--ae-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.5);

  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const LinkButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 9px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--ae-link) 55%, #000);
  background: ${({ $active }) => ($active
    ? 'linear-gradient(180deg, color-mix(in srgb, var(--ae-link) 55%, #012), color-mix(in srgb, var(--ae-link) 25%, #001))'
    : 'linear-gradient(180deg, #221a10, #140f0a)')};
  color: ${({ $active }) => ($active ? '#00161c' : 'var(--ae-link)')};
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  animation: ${({ $active }) => ($active ? css`${linkGlow} 2s ease-in-out infinite` : 'none')};

  &:active { transform: translateY(1px); }
`;

function useGaugeDrag(ref, onChange) {
  const draggingRef = useRef(false);
  const onPointerDown = (e) => {
    draggingRef.current = true;
    safeSetPointerCapture(e.currentTarget, e.pointerId);
    onChange(ratioFromAngle(ref, e.clientX, e.clientY, START_DEG, SWEEP_DEG));
  };
  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    onChange(ratioFromAngle(ref, e.clientX, e.clientY, START_DEG, SWEEP_DEG));
  };
  const onPointerUp = () => { draggingRef.current = false; };
  return { onPointerDown, onPointerMove, onPointerUp };
}

export default function AetherEngineSkin({
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
  const gaugeRef = useRef(null);
  const gaugeDrag = useGaugeDrag(gaugeRef, onVolumeChange);

  const playing = isActive && isPlaying;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const volDeg = START_DEG + volume * SWEEP_DEG;

  const timeDigits = fmtTime(currentTime).replace(':', '');

  const seekFromOdo = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <Shell $p={palette}>
      <Rivet $pos="top: 5px; left: 5px;" />
      <Rivet $pos="top: 5px; right: 5px;" />
      <Rivet $pos="bottom: 5px; left: 5px;" />
      <Rivet $pos="bottom: 5px; right: 5px;" />

      <TopRow>
        <GearStack>
          <GearIcon size={30} $dir="cw" $running={playing} style={{ top: 0, left: 0 }} />
          <GearIcon size={22} $dir="ccw" $running={playing} style={{ bottom: 0, right: 0 }} />
        </GearStack>

        <Display>
          {track ? (
            <>
              <TrackTitle title={track.title}>{track.title}</TrackTitle>
              <TrackSub>{modeLabel}{track.owner_username ? ` · ${track.owner_username}` : ''}</TrackSub>
            </>
          ) : (
            <TrackSub>{mode === 'favorites' ? 'SIN FAVORITAS' : mode === 'radio' ? 'RADIO SIN SEÑAL' : 'CALDERA APAGADA'}</TrackSub>
          )}
        </Display>

        <GaugeWrap
          ref={gaugeRef}
          role="slider"
          aria-label="Volumen"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(volume * 100)}
          onPointerDown={gaugeDrag.onPointerDown}
          onPointerMove={gaugeDrag.onPointerMove}
          onPointerUp={gaugeDrag.onPointerUp}
          onPointerLeave={gaugeDrag.onPointerUp}
        >
          <GaugeArc $pct={volume * 100} />
          <GaugeFace />
          <Needle $deg={volDeg} />
        </GaugeWrap>
      </TopRow>

      <OdoRow
        role="slider"
        aria-label="Progreso"
        aria-valuemin={0}
        aria-valuemax={duration || 0}
        aria-valuenow={currentTime}
        onClick={seekFromOdo}
        title={`${fmtTime(currentTime)} / ${fmtTime(duration)}`}
      >
        {timeDigits.split('').map((d, i) => <OdoDigit key={i}>{d}</OdoDigit>)}
        <OdoDigit style={{ flex: 2, opacity: 0.6 }}>/ {fmtTime(duration)}</OdoDigit>
      </OdoRow>

      <ControlRow>
        <TransportGroup>
          <BrassButton type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
            <SkipBack size={12} />
          </BrassButton>
          <BrassButton $big type="button" onClick={onTogglePlay} disabled={!track} aria-label={playing ? 'Pausar' : 'Reproducir'}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </BrassButton>
          <BrassButton type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
            <SkipForward size={12} />
          </BrassButton>
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
          <Zap size={11} /> {isActive ? 'ETHER LINKED' : 'ETHER LINK'}
        </LinkButton>
      </ControlRow>
    </Shell>
  );
}
