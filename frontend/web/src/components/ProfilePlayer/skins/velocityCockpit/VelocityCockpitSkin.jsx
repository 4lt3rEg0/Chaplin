import React, { useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Ear, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, safeSetPointerCapture, ratioFromAngle } from '../shared';
import { chromeGradient, glassPanel, matteRubber, bevelRaised, bevelSunken, screwCss } from '../materials';

/*
 * VELOCITY COCKPIT — skin #4. An instrument-cluster binnacle: two large
 * chrome-ringed gauge pods physically protrude above a hooded dashboard
 * panel, exactly like a real automotive cluster — not a rounded box with an
 * arc drawn on it. The MFD screen sits recessed between the gauges; the
 * transport row lives on the lower dash apron.
 */

const START_DEG = -130;
const SWEEP_DEG = 260;

const needleFlick = keyframes`
  0%, 100% { filter: drop-shadow(0 0 2px var(--vc-needle)); }
  50% { filter: drop-shadow(0 0 5px var(--vc-needle)); }
`;

const switchGlow = keyframes`
  0%, 100% { box-shadow: 0 0 5px 1px var(--vc-switch); }
  50% { box-shadow: 0 0 12px 3px var(--vc-switch); }
`;

// The dashboard hood: a trapezoid-ish shape (angled top, wider base) so the
// silhouette alone reads as a binnacle even with the gauges removed.
const HOOD_CLIP = 'polygon(6% 0%, 94% 0%, 100% 22%, 100% 100%, 0% 100%, 0% 22%)';

const Wrap = styled.div`
  --vc-panel: ${({ $p }) => $p.dashPanel};
  --vc-face: ${({ $p }) => $p.gaugeFace};
  --vc-needle: ${({ $p }) => $p.needleColor};
  --vc-tick: ${({ $p }) => $p.tickColor};
  --vc-text: ${({ $p }) => $p.displayText};
  --vc-switch: ${({ $p }) => $p.switchColor};
  --vc-button: ${({ $p }) => $p.buttonColor};
  --vc-accent: ${({ $p }) => $p.accentColor};

  position: relative;
  padding-top: 34px;
  color: var(--vc-text);
  font-family: 'Segoe UI', system-ui, sans-serif;

  @media (max-width: 480px) {
    padding-top: 28px;
  }
`;

const Hood = styled.div`
  position: relative;
  clip-path: ${HOOD_CLIP};
  padding: 30px 16px 16px;
  background: ${({ $p }) => matteRubber($p.dashPanel)};
  box-shadow: 0 12px 24px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 480px) {
    padding: 26px 12px 12px;
  }
`;

const HoodEdge = styled.div`
  position: absolute;
  inset: 0;
  clip-path: ${HOOD_CLIP};
  pointer-events: none;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(0,0,0,0.6), inset 0 -3px 8px rgba(0,0,0,0.5);
`;

const GaugePod = styled.div`
  position: absolute;
  top: -34px;
  ${({ $side }) => ($side === 'left' ? 'left: 4%;' : 'right: 4%;')}
  width: 82px;
  height: 82px;
  border-radius: 50%;
  padding: 4px;
  background: ${chromeGradient()};
  box-shadow: ${bevelRaised(1)}, 0 8px 14px rgba(0,0,0,0.5);
  cursor: pointer;
  z-index: 2;

  @media (max-width: 480px) {
    width: 66px;
    height: 66px;
    top: -28px;
  }
`;

const GaugeFace = styled.div`
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 32%, color-mix(in srgb, var(--vc-face) 94%, #fff 6%), var(--vc-face) 70%);
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.65);
`;

const GaugeArc = styled.div`
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: conic-gradient(var(--vc-tick) ${({ $pct }) => $pct * 0.72}%, rgba(255,255,255,0.08) 0);
  transform: rotate(126deg);
  mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px));
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px));
`;

const Needle = styled.div`
  position: absolute;
  left: 50%;
  bottom: 50%;
  width: 2px;
  height: 32%;
  background: linear-gradient(180deg, var(--vc-needle), transparent);
  transform-origin: 50% 100%;
  transform: translateX(-50%) rotate(${({ $deg }) => $deg}deg);
  animation: ${css`${needleFlick} 2.6s ease-in-out infinite`};
`;

const GaugeHub = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--vc-needle);
  transform: translate(-50%, -50%);
  box-shadow: 0 0 4px var(--vc-needle);
`;

const GaugeGlass = styled.div`
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  background: linear-gradient(120deg, rgba(255,255,255,0.28) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.06) 100%);
  pointer-events: none;
`;

const GaugeLabel = styled.span`
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 7px;
  letter-spacing: 0.08em;
  opacity: 0.6;
  font-family: 'Consolas', monospace;
`;

const Screw = styled.span`
  position: absolute;
  width: 6px;
  height: 6px;
  z-index: 2;
  ${screwCss}
  ${({ $pos }) => $pos}
`;

const MfdBezel = styled.div`
  align-self: center;
  width: 100%;
  padding: 3px;
  border-radius: 5px;
  background: ${chromeGradient()};
  box-shadow: ${bevelRaised(0.6)};
  margin-top: 6px;
`;

const Mfd = styled.div`
  min-width: 0;
  padding: 8px 10px;
  border-radius: 3px;
  background: ${({ $p }) => glassPanel($p.accentColor, 'sunken')};
  font-family: 'Consolas', monospace;
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
  opacity: 0.75;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
`;

const TimeRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  opacity: 0.8;
  margin-top: 4px;
  letter-spacing: 0.04em;
`;

const Apron = styled.div`
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,0.08);
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

const SwitchButton = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 5px;
  border: none;
  background: linear-gradient(180deg, color-mix(in srgb, var(--vc-button) 65%, #999) 0%, var(--vc-button) 50%, color-mix(in srgb, var(--vc-button) 60%, #000) 100%);
  color: var(--vc-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: ${bevelRaised(0.9)};

  &:active { box-shadow: ${bevelSunken(0.9)}; transform: translateY(1px); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const PlayButton = styled(SwitchButton)`
  width: 40px;
  height: 40px;
  border-radius: 50%;
`;

const ListenSwitch = styled.button`
  position: relative;
  width: 46px;
  height: 26px;
  border-radius: 4px;
  border: none;
  padding: 3px;
  background: linear-gradient(180deg, #26201c, #14100d);
  box-shadow: ${bevelSunken(0.6)};
  cursor: pointer;
`;

const ListenLed = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $active, $tint }) => (
    $active
      ? `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${$tint} 90%, #fff), color-mix(in srgb, ${$tint} 50%, #000))`
      : 'radial-gradient(circle at 35% 30%, #3a2c26, #150d0a)'
  )};
  color: ${({ $active }) => ($active ? '#1a0500' : 'var(--vc-switch)')};
  animation: ${({ $active }) => ($active ? css`${switchGlow} 2s ease-in-out infinite` : 'none')};
`;

export default function VelocityCockpitSkin({
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
  const progressGaugeRef = useRef(null);
  const volGaugeRef = useRef(null);
  const draggingProgress = useRef(false);
  const draggingVol = useRef(false);

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const progressDeg = START_DEG + progress * SWEEP_DEG;
  const volDeg = START_DEG + volume * SWEEP_DEG;

  const onProgressDown = (e) => {
    draggingProgress.current = true;
    safeSetPointerCapture(e.currentTarget, e.pointerId);
    if (duration) onSeek(ratioFromAngle(progressGaugeRef, e.clientX, e.clientY, START_DEG, SWEEP_DEG) * duration);
  };
  const onProgressMove = (e) => {
    if (!draggingProgress.current || !duration) return;
    onSeek(ratioFromAngle(progressGaugeRef, e.clientX, e.clientY, START_DEG, SWEEP_DEG) * duration);
  };
  const onProgressUp = () => { draggingProgress.current = false; };

  const onVolDown = (e) => {
    draggingVol.current = true;
    safeSetPointerCapture(e.currentTarget, e.pointerId);
    onVolumeChange(ratioFromAngle(volGaugeRef, e.clientX, e.clientY, START_DEG, SWEEP_DEG));
  };
  const onVolMove = (e) => {
    if (!draggingVol.current) return;
    onVolumeChange(ratioFromAngle(volGaugeRef, e.clientX, e.clientY, START_DEG, SWEEP_DEG));
  };
  const onVolUp = () => { draggingVol.current = false; };

  const playing = isActive && isPlaying;

  return (
    <Wrap $p={palette}>
      <GaugePod
        $side="left"
        ref={progressGaugeRef}
        role="slider"
        aria-label="Progreso"
        aria-valuemin={0}
        aria-valuemax={duration || 0}
        aria-valuenow={currentTime}
        onPointerDown={onProgressDown}
        onPointerMove={onProgressMove}
        onPointerUp={onProgressUp}
        onPointerLeave={onProgressUp}
      >
        <GaugeArc $pct={progress * 100} />
        <GaugeFace />
        <Needle $deg={progressDeg} />
        <GaugeHub />
        <GaugeGlass />
        <GaugeLabel>PROG</GaugeLabel>
      </GaugePod>

      <GaugePod
        $side="right"
        ref={volGaugeRef}
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
        <GaugeArc $pct={volume * 100} />
        <GaugeFace />
        <Needle $deg={volDeg} />
        <GaugeHub />
        <GaugeGlass />
        <GaugeLabel>VOL</GaugeLabel>
      </GaugePod>

      <Hood $p={palette}>
        <HoodEdge />
        <Screw $pos="top: 34px; left: 10px;" />
        <Screw $pos="top: 34px; right: 10px;" />

        <MfdBezel>
          <Mfd $p={palette}>
            {track ? (
              <>
                <TrackTitle title={track.title}>{track.title}</TrackTitle>
                <TrackSub>{modeLabel}{track.owner_username ? ` · ${track.owner_username}` : ''}</TrackSub>
                <TimeRow>
                  <span>{fmtTime(currentTime)}</span>
                  <span>{playing ? 'RUN' : isActive ? 'HOLD' : 'IDLE'}</span>
                  <span>{fmtTime(duration)}</span>
                </TimeRow>
              </>
            ) : (
              <TrackSub>{mode === 'favorites' ? 'SIN FAVORITAS' : mode === 'radio' ? 'RADIO SIN SEÑAL' : 'SIN SEÑAL'}</TrackSub>
            )}
          </Mfd>
        </MfdBezel>

        <Apron>
          <TransportGroup>
            <SwitchButton type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
              <SkipBack size={13} />
            </SwitchButton>
            <ListenSwitch type="button" onClick={onToggleEar} aria-label={ariaLabel} aria-pressed={isActive} title="Profile Listen">
              <ListenLed $active={isActive} $tint={palette.switchColor}>
                <Ear size={14} />
              </ListenLed>
            </ListenSwitch>
          </TransportGroup>

          <TransportGroup style={{ justifyContent: 'center' }}>
            <PlayButton type="button" onClick={onTogglePlay} aria-label={playing ? 'Pausar' : 'Reproducir'} disabled={!track}>
              {playing ? <Pause size={17} /> : <Play size={17} />}
            </PlayButton>
          </TransportGroup>

          <TransportGroup>
            <SwitchButton type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
              <SkipForward size={13} />
            </SwitchButton>
          </TransportGroup>
        </Apron>
      </Hood>
    </Wrap>
  );
}
