import React, { useMemo, useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Activity, HeartPulse, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, ratioFromAngle, safeSetPointerCapture } from '../shared';

/*
 * LIFE//SIGN — skin #8. Medical monitor / oscilloscope. The ECG trace is a
 * stylized waveform reacting to transport state (like every other skin's
 * visualizer) — it is NOT presented as a real biometric reading. The one
 * number that WOULD read as real telemetry, BPM, has no real data source
 * anywhere in Chaplin (no tempo/audio-analysis field exists on Track), so it
 * is hard-locked to "--" rather than ever inventing a value.
 */

const START_DEG = -100;
const SWEEP_DEG = 200;

const scan = keyframes`
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -240; }
`;

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
`;

// Procedurally builds an ECG-blip polyline (never hand-authored path data):
// a flat baseline with a periodic PQRST-ish spike every `period` units.
function buildEcgPoints(width, height, period, spikeHeight) {
  const pts = [];
  const mid = height / 2;
  for (let x = 0; x <= width; x += 2) {
    const phase = x % period;
    let y = mid;
    if (phase > period * 0.42 && phase < period * 0.46) y = mid + spikeHeight * 0.35;
    else if (phase >= period * 0.46 && phase < period * 0.5) y = mid - spikeHeight;
    else if (phase >= period * 0.5 && phase < period * 0.54) y = mid + spikeHeight * 0.55;
    else if (phase >= period * 0.54 && phase < period * 0.6) y = mid;
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

const Shell = styled.div`
  --ls-bezel: ${({ $p }) => $p.bezelColor};
  --ls-screen: ${({ $p }) => $p.screenBack};
  --ls-trace: ${({ $p }) => $p.traceColor};
  --ls-grid: ${({ $p }) => $p.gridColor};
  --ls-text: ${({ $p }) => $p.readoutText};
  --ls-monitor: ${({ $p }) => $p.monitorColor};
  --ls-button: ${({ $p }) => $p.buttonColor};

  position: relative;
  padding: 12px;
  border-radius: 12px;
  background: linear-gradient(160deg, rgba(255,255,255,0.05), transparent 35%), var(--ls-bezel);
  border: 1px solid rgba(0,0,0,0.6);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 20px rgba(0,0,0,0.4);
  color: var(--ls-text);
  font-family: 'Consolas', 'SFMono-Regular', monospace;
  display: flex;
  flex-direction: column;
  gap: 8px;

  @media (max-width: 480px) {
    padding: 9px;
    gap: 6px;
  }
`;

const Screen = styled.div`
  position: relative;
  border-radius: 6px;
  background:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px) 0 0 / 100% 12px,
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px) 0 0 / 14px 100%,
    var(--ls-screen);
  border: 1px solid color-mix(in srgb, var(--ls-trace) 30%, transparent);
  padding: 6px 8px;
  overflow: hidden;
`;

const HeaderLine = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  letter-spacing: 0.05em;
  opacity: 0.85;
`;

const TraceRow = styled.div`
  height: 34px;
  margin-top: 3px;
`;

const TraceSvg = styled.svg`
  width: 100%;
  height: 100%;
  overflow: visible;
`;

const TracePath = styled.polyline`
  fill: none;
  stroke: var(--ls-trace);
  stroke-width: 1.6;
  filter: drop-shadow(0 0 3px var(--ls-trace));
  stroke-dasharray: 8 4;
  animation: ${({ $active }) => ($active ? css`${scan} 1.1s linear infinite` : 'none')};
  opacity: ${({ $active }) => ($active ? 1 : 0.4)};
`;

const ChannelRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  margin-top: 4px;
  opacity: 0.85;
`;

const TrackLine = styled.div`
  font-size: 11px;
  font-weight: 700;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const BpmTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  animation: ${({ $active }) => ($active ? css`${blink} 1.2s ease-in-out infinite` : 'none')};
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

const CtlButton = styled.button`
  width: 26px;
  height: 26px;
  border-radius: 4px;
  border: 1px solid rgba(0,0,0,0.5);
  background: linear-gradient(180deg, color-mix(in srgb, var(--ls-button) 150%, #555), var(--ls-button));
  color: var(--ls-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const PlayButton = styled(CtlButton)`
  width: 36px;
  height: 36px;
  border-radius: 50%;
`;

const MonitorButton = styled.button`
  padding: 5px 10px;
  border-radius: 5px;
  border: 1px solid color-mix(in srgb, var(--ls-monitor) 55%, #000);
  background: ${({ $active }) => ($active
    ? 'linear-gradient(180deg, color-mix(in srgb, var(--ls-monitor) 55%, #041), color-mix(in srgb, var(--ls-monitor) 25%, #000))'
    : 'linear-gradient(180deg, #1c221e, #10140f)')};
  color: ${({ $active }) => ($active ? '#022014' : 'var(--ls-monitor)')};
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  white-space: nowrap;

  &:active { transform: translateY(1px); }
`;

const EncoderWrap = styled.div`
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.15), #10140f 60%);
  border: 1px solid rgba(0,0,0,0.6);
  cursor: ns-resize;
  touch-action: none;
  flex-shrink: 0;
`;

const EncoderTick = styled.div`
  position: absolute;
  top: 2px;
  left: 50%;
  width: 2px;
  height: 6px;
  background: var(--ls-trace);
  transform-origin: 50% 12px;
  transform: translateX(-50%) rotate(${({ $deg }) => $deg}deg);
`;

const SEEK_H = 34;

export default function LifeSignSkin({
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
  const encoderRef = useRef(null);
  const draggingRef = useRef(false);
  const playing = isActive && isPlaying;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  const points = useMemo(() => buildEcgPoints(240, SEEK_H, 60, 13), []);

  const onEncoderDown = (e) => {
    draggingRef.current = true;
    safeSetPointerCapture(e.currentTarget, e.pointerId);
    onVolumeChange(ratioFromAngle(encoderRef, e.clientX, e.clientY, START_DEG, SWEEP_DEG));
  };
  const onEncoderMove = (e) => {
    if (!draggingRef.current) return;
    onVolumeChange(ratioFromAngle(encoderRef, e.clientX, e.clientY, START_DEG, SWEEP_DEG));
  };
  const onEncoderUp = () => { draggingRef.current = false; };

  const volDeg = START_DEG + volume * SWEEP_DEG;

  return (
    <Shell $p={palette}>
      <Screen>
        <HeaderLine>
          <span>LIFE//SIGN</span>
          <span>{isActive ? (playing ? 'MONITORING' : 'PAUSED') : 'STANDBY'}</span>
        </HeaderLine>

        <TraceRow>
          <TraceSvg viewBox={`0 0 240 ${SEEK_H}`} preserveAspectRatio="none">
            <TracePath points={points} $active={playing} />
          </TraceSvg>
        </TraceRow>

        {track ? (
          <TrackLine title={track.title}>{track.title} · {track.owner_username}</TrackLine>
        ) : (
          <TrackLine>{mode === 'favorites' ? 'SIN FAVORITAS' : mode === 'radio' ? 'RADIO SIN SEÑAL' : 'SIN SEÑAL VITAL'}</TrackLine>
        )}

        <ChannelRow>
          <BpmTag $active={playing}>
            <HeartPulse size={11} /> BPM --
          </BpmTag>
          <span><Activity size={11} style={{ verticalAlign: -2 }} /> CH1/CH2</span>
          <span>{fmtTime(currentTime)} / {fmtTime(duration)}</span>
        </ChannelRow>
      </Screen>

      <ControlRow>
        <TransportGroup>
          <CtlButton type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
            <SkipBack size={11} />
          </CtlButton>
          <PlayButton type="button" onClick={onTogglePlay} disabled={!track} aria-label={playing ? 'Pausar' : 'Reproducir'}>
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </PlayButton>
          <CtlButton type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
            <SkipForward size={11} />
          </CtlButton>
        </TransportGroup>

        <div
          role="slider"
          aria-label="Progreso"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={currentTime}
          onClick={(e) => {
            if (!duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            onSeek(ratio * duration);
          }}
          style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', inset: 0, width: `${progress * 100}%`, background: 'var(--ls-trace)', opacity: 0.7 }} />
        </div>

        <TransportGroup>
          <EncoderWrap
            ref={encoderRef}
            role="slider"
            aria-label="Volumen"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(volume * 100)}
            onPointerDown={onEncoderDown}
            onPointerMove={onEncoderMove}
            onPointerUp={onEncoderUp}
            onPointerLeave={onEncoderUp}
          >
            <EncoderTick $deg={volDeg} />
          </EncoderWrap>
          <MonitorButton
            type="button"
            onClick={onToggleEar}
            $active={isActive}
            aria-label={ariaLabel}
            aria-pressed={isActive}
            title="Profile Monitor"
          >
            {isActive ? 'ACTIVE' : 'MONITOR'}
          </MonitorButton>
        </TransportGroup>
      </ControlRow>
    </Shell>
  );
}
