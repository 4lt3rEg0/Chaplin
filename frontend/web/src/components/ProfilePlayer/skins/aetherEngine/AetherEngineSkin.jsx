import React, { useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Cog, Pause, Play, SkipBack, SkipForward, Zap } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, ratioFromAngle, safeSetPointerCapture } from '../shared';
import { brassGradient, glassPanel, bevelRaised, bevelSunken, screwCss } from '../materials';

/*
 * AETHER//ENGINE — skin #11. Steampunk machinery: a riveted brass housing
 * with a real pressure-gauge pod protruding on one side and a steam pipe
 * stub on the other (silhouette alone reads as "machine", not a rounded
 * rectangle with copper tint). Gears actually spin — opposite directions,
 * real running/frozen state tied to play/pause. Odometer digits are the
 * real elapsed time, never a fake counter.
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
const steamPuff = keyframes`
  0% { opacity: 0; transform: translateY(0) scale(0.6); }
  30% { opacity: 0.6; }
  100% { opacity: 0; transform: translateY(-16px) scale(1.3); }
`;

const BODY_CLIP = 'polygon(0% 0%, 88% 0%, 100% 18%, 100% 100%, 0% 100%)';

const Wrap = styled.div`
  --ae-panel: ${({ $p }) => $p.brassPanel};
  --ae-copper: ${({ $p }) => $p.copperAccent};
  --ae-gear: ${({ $p }) => $p.gearColor};
  --ae-face: ${({ $p }) => $p.gaugeFace};
  --ae-needle: ${({ $p }) => $p.needleColor};
  --ae-text: ${({ $p }) => $p.displayText};
  --ae-link: ${({ $p }) => $p.linkColor};
  --ae-button: ${({ $p }) => $p.buttonColor};

  position: relative;
  padding-top: 10px;
  padding-right: 40px;
  font-family: 'Georgia', 'Segoe UI', serif;
  color: var(--ae-text);

  @media (max-width: 480px) {
    padding-right: 32px;
  }
`;

const PipeStub = styled.div`
  position: absolute;
  top: -8px;
  right: 6px;
  width: 16px;
  height: 26px;
  border-radius: 4px 4px 0 0;
  background: ${({ $p }) => brassGradient($p.copperAccent)};
  box-shadow: ${bevelRaised(0.7)};
  z-index: 0;

  &::after {
    content: '';
    position: absolute;
    inset: -3px -3px auto -3px;
    height: 5px;
    border-radius: 2px;
    background: color-mix(in srgb, var(--ae-copper) 70%, #000);
  }
`;

const Steam = styled.span`
  position: absolute;
  top: -14px;
  left: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,0.5);
  filter: blur(2px);
  animation: ${({ $active, $delay }) => ($active ? css`${steamPuff} 1.8s ease-out ${$delay}ms infinite` : 'none')};
`;

const Body = styled.div`
  position: relative;
  clip-path: ${BODY_CLIP};
  padding: 16px 34px 16px 16px;
  background: ${({ $p }) => brassGradient($p.brassPanel)};
  box-shadow: 0 12px 24px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 480px) {
    padding: 12px 28px 12px 12px;
    gap: 8px;
  }
`;

const BodyEdge = styled.div`
  position: absolute;
  inset: 0;
  clip-path: ${BODY_CLIP};
  pointer-events: none;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 0 2px color-mix(in srgb, var(--ae-copper) 40%, transparent);
`;

const Rivet = styled.span`
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--ae-copper) 80%, #fff 20%), #241608 70%);
  z-index: 2;
  ${({ $pos }) => $pos}
`;

const TopRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
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
  background: ${({ $p }) => glassPanel($p.copperAccent, 'sunken')};
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

// The pressure gauge pod — physically protrudes past the body's right edge.
const GaugeWrap = styled.div`
  position: absolute;
  top: 50%;
  right: -30px;
  transform: translateY(-50%);
  width: 68px;
  height: 68px;
  border-radius: 50%;
  cursor: pointer;
  z-index: 3;
  background: ${({ $p }) => brassGradient($p.copperAccent)};
  padding: 4px;
  box-shadow: ${bevelRaised(1)}, 0 8px 16px rgba(0,0,0,0.5);

  @media (max-width: 480px) {
    width: 56px;
    height: 56px;
    right: -24px;
  }
`;

const GaugeFace = styled.div`
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 32%, color-mix(in srgb, var(--ae-face) 94%, #fff 6%), var(--ae-face) 70%);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.6);
`;

const GaugeArc = styled.div`
  position: absolute;
  inset: 4px;
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
  border: none;
  background: ${({ $p }) => brassGradient($p.buttonColor)};
  color: var(--ae-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: ${bevelRaised(0.9)};

  &:active { box-shadow: ${bevelSunken(0.9)}; transform: translateY(1px); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const LinkButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 9px;
  border-radius: 6px;
  border: none;
  background: ${({ $active, $p }) => ($active
    ? 'linear-gradient(180deg, color-mix(in srgb, var(--ae-link) 55%, #012), color-mix(in srgb, var(--ae-link) 25%, #001))'
    : brassGradient($p.buttonColor))};
  color: ${({ $active }) => ($active ? '#00161c' : 'var(--ae-link)')};
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  box-shadow: ${bevelRaised(0.8)};
  animation: ${({ $active }) => ($active ? css`${linkGlow} 2s ease-in-out infinite` : 'none')};

  &:active { box-shadow: ${bevelSunken(0.8)}; transform: translateY(1px); }
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
  const volDeg = START_DEG + volume * SWEEP_DEG;

  const timeDigits = fmtTime(currentTime).replace(':', '');

  const seekFromOdo = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <Wrap $p={palette}>
      <PipeStub $p={palette}>
        {[0, 600, 1200].map((d) => <Steam key={d} $active={playing} $delay={d} />)}
      </PipeStub>

      <Body $p={palette}>
        <BodyEdge />
        <Rivet $pos="top: 6px; left: 6px;" />
        <Rivet $pos="bottom: 6px; left: 6px;" />
        <Rivet $pos="bottom: 6px; left: 40%;" />

        <GaugeWrap
          $p={palette}
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

        <TopRow>
          <GearStack>
            <GearIcon size={30} $dir="cw" $running={playing} style={{ top: 0, left: 0 }} />
            <GearIcon size={22} $dir="ccw" $running={playing} style={{ bottom: 0, right: 0 }} />
          </GearStack>

          <Display $p={palette}>
            {track ? (
              <>
                <TrackTitle title={track.title}>{track.title}</TrackTitle>
                <TrackSub>{modeLabel}{track.owner_username ? ` · ${track.owner_username}` : ''}</TrackSub>
              </>
            ) : (
              <TrackSub>{mode === 'favorites' ? 'SIN FAVORITAS' : mode === 'radio' ? 'RADIO SIN SEÑAL' : 'CALDERA APAGADA'}</TrackSub>
            )}
          </Display>
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
            <BrassButton $p={palette} type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
              <SkipBack size={12} />
            </BrassButton>
            <BrassButton $p={palette} $big type="button" onClick={onTogglePlay} disabled={!track} aria-label={playing ? 'Pausar' : 'Reproducir'}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </BrassButton>
            <BrassButton $p={palette} type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
              <SkipForward size={12} />
            </BrassButton>
          </TransportGroup>

          <div />

          <LinkButton
            $p={palette}
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
      </Body>
    </Wrap>
  );
}
