import React, { useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Ear, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, safeSetPointerCapture, ratioFromAngle } from '../shared';

/*
 * VELOCITY COCKPIT — skin #3. An instrument-cluster binnacle: two large
 * gauge pods are drawn as real SVG circles that physically protrude above
 * a trapezoidal dashboard hood (the silhouette a solid-black fill would
 * still read as "gauge cluster", nothing like the tank or the deck). The
 * left gauge is real song progress (draggable to seek), the right is
 * volume; both needles are SVG lines rotated by React state, not CSS
 * tricks layered on a div.
 */

const VIEW_W = 520;
const VIEW_H = 260;
const START_DEG = -130;
const SWEEP_DEG = 260;

const HOOD_PATH = 'M 30 40 L 490 40 L 520 60 L 520 240 L 0 240 L 0 60 Z';

const needleFlick = keyframes`
  0%, 100% { filter: drop-shadow(0 0 2px var(--vc-needle)); }
  50% { filter: drop-shadow(0 0 5px var(--vc-needle)); }
`;
const switchGlow = keyframes`
  0%, 100% { box-shadow: 0 0 5px 1px var(--vc-switch); }
  50% { box-shadow: 0 0 13px 4px var(--vc-switch); }
`;

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
  width: 100%;
  max-width: 520px;
  aspect-ratio: ${VIEW_W} / ${VIEW_H};
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: var(--vc-text);
  filter: drop-shadow(0 14px 18px rgba(0, 0, 0, 0.45));
`;

const HoodSvg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
`;

const HoodFill = styled.path`
  fill: url(#vc-hood-grad);
  stroke: rgba(0, 0, 0, 0.6);
`;
const HoodHighlight = styled.path`
  fill: none;
  stroke: rgba(255, 255, 255, 0.08);
`;
const Screw = styled.circle`
  fill: url(#vc-screw-grad);
`;
const GaugeRing = styled.circle`
  fill: url(#vc-gauge-grad);
  stroke: rgba(0, 0, 0, 0.6);
  stroke-width: 2;
`;
const GaugeFace = styled.circle`
  fill: url(#vc-face-grad);
  stroke: rgba(0, 0, 0, 0.5);
`;
const GaugeTick = styled.line`
  stroke: var(--vc-tick);
  stroke-width: 1.6;
  opacity: 0.8;
`;
const GaugeTickMajor = styled.line`
  stroke: var(--vc-tick);
  stroke-width: 2.4;
`;
const GaugeNeedle = styled.line`
  stroke: var(--vc-needle);
  stroke-width: 2.4;
  animation: ${css`${needleFlick} 2.6s ease-in-out infinite`};
`;
const GaugeHub = styled.circle`
  fill: #0c0c0e;
  stroke: var(--vc-needle);
  stroke-width: 1;
`;
const GaugeLabel = styled.text`
  fill: var(--vc-text);
  font-size: 8px;
  letter-spacing: 1.5px;
  font-family: 'Consolas', monospace;
  opacity: 0.6;
  text-anchor: middle;
`;
const MfdBacking = styled.rect`
  fill: url(#vc-mfd-grad);
  stroke: color-mix(in srgb, var(--vc-accent) 40%, transparent);
`;

const pct = (v, total) => `${(v / total) * 100}%`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

const GaugeHit = styled.div`
  position: absolute;
  border-radius: 50%;
  pointer-events: auto;
  cursor: pointer;
`;

const MfdText = styled.div`
  position: absolute;
  left: ${pct(210, VIEW_W)};
  top: ${pct(70, VIEW_H)};
  width: ${pct(100, VIEW_W)};
  height: ${pct(50, VIEW_H)};
  padding: 4px 6px;
  font-family: 'Consolas', monospace;
  overflow: hidden;
`;

const TrackTitle = styled.div`
  font-size: clamp(9px, 1.8vw, 11px);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const TrackSub = styled.div`
  font-size: clamp(7px, 1.3vw, 8px);
  opacity: 0.75;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const TimeRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: clamp(6.5px, 1.1vw, 7.5px);
  opacity: 0.8;
  margin-top: 3px;
`;
const EmptyText = styled.div`
  font-size: clamp(8px, 1.5vw, 10px);
  opacity: 0.7;
`;

const Apron = styled.div`
  position: absolute;
  left: ${pct(20, VIEW_W)};
  top: ${pct(150, VIEW_H)};
  width: ${pct(480, VIEW_W)};
  height: ${pct(80, VIEW_H)};
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  pointer-events: auto;
`;

const TransportGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SwitchButton = styled.button`
  width: 15%;
  aspect-ratio: 1;
  border-radius: 6px;
  border: none;
  background: linear-gradient(180deg, color-mix(in srgb, var(--vc-button) 65%, #999) 0%, var(--vc-button) 50%, color-mix(in srgb, var(--vc-button) 60%, #000) 100%);
  color: var(--vc-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.5);

  svg { width: 45%; height: 45%; }
  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const PlayButton = styled(SwitchButton)`
  width: 20%;
  border-radius: 50%;
`;

const ListenSwitch = styled.button`
  position: relative;
  flex: 0 0 auto;
  width: 34%;
  min-width: 40px;
  aspect-ratio: 50 / 30;
  border-radius: 4px;
  border: none;
  padding: 3px;
  background: linear-gradient(180deg, #26201c, #14100d);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6);
  cursor: pointer;
`;

const ListenLed = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  background: ${({ $active }) => ($active
    ? 'radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--vc-switch) 90%, #fff), color-mix(in srgb, var(--vc-switch) 50%, #000))'
    : 'radial-gradient(circle at 35% 30%, #3a2c26, #150d0a)')};
  color: ${({ $active }) => ($active ? '#1a0500' : 'var(--vc-switch)')};
  animation: ${({ $active }) => ($active ? css`${switchGlow} 2s ease-in-out infinite` : 'none')};

  svg { width: 32%; height: 32%; flex-shrink: 0; }
`;

const ListenLabel = styled.span`
  font-size: 6px;
  font-weight: 700;
  letter-spacing: 0.3px;
  white-space: nowrap;
  line-height: 1;
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

function buildTicks(cx, cy, r) {
  return Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    const angleDeg = START_DEG + t * SWEEP_DEG - 90;
    const rad = (angleDeg * Math.PI) / 180;
    const inner = r - (i % 2 === 0 ? 10 : 6);
    return {
      major: i % 2 === 0,
      x1: cx + Math.cos(rad) * inner,
      y1: cy + Math.sin(rad) * inner,
      x2: cx + Math.cos(rad) * r,
      y2: cy + Math.sin(rad) * r
    };
  });
}

const GAUGE_R = 50;
const LEFT_CX = 130, LEFT_CY = 40;
const RIGHT_CX = 390, RIGHT_CY = 40;

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

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const progressDeg = START_DEG + progress * SWEEP_DEG;
  const volDeg = START_DEG + volume * SWEEP_DEG;
  const playing = isActive && isPlaying;

  const progressDrag = useGaugeDrag(progressGaugeRef, (r) => { if (duration) onSeek(r * duration); });
  const volDrag = useGaugeDrag(volGaugeRef, onVolumeChange);

  const leftTicks = buildTicks(LEFT_CX, LEFT_CY, GAUGE_R - 6);
  const rightTicks = buildTicks(RIGHT_CX, RIGHT_CY, GAUGE_R - 6);

  const needleEnd = (cx, cy, deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + Math.cos(rad) * (GAUGE_R - 16), y: cy + Math.sin(rad) * (GAUGE_R - 16) };
  };
  const leftNeedle = needleEnd(LEFT_CX, LEFT_CY, progressDeg);
  const rightNeedle = needleEnd(RIGHT_CX, RIGHT_CY, volDeg);

  return (
    <Wrap $p={palette}>
      <HoodSvg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="vc-hood-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--vc-panel) 90%, #444 10%)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--vc-panel)' }} />
          </linearGradient>
          <radialGradient id="vc-gauge-grad" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#e8ecef" />
            <stop offset="35%" stopColor="#8a9096" />
            <stop offset="100%" stopColor="#3a3d42" />
          </radialGradient>
          <radialGradient id="vc-face-grad" cx="38%" cy="32%" r="70%">
            <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--vc-face) 94%, #fff 6%)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--vc-face)' }} />
          </radialGradient>
          <radialGradient id="vc-screw-grad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#9a9a9e" />
            <stop offset="100%" stopColor="#151517" />
          </radialGradient>
          <linearGradient id="vc-mfd-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--vc-accent) 20%, #0c0c0e)' }} />
            <stop offset="100%" stopColor="#0a0a0c" />
          </linearGradient>
        </defs>

        <HoodFill d={HOOD_PATH} />
        <HoodHighlight d={HOOD_PATH} />
        <Screw cx={16} cy={62} r={4} />
        <Screw cx={504} cy={62} r={4} />

        {[[LEFT_CX, LEFT_CY, leftTicks, progressDeg, leftNeedle, 'PROG'], [RIGHT_CX, RIGHT_CY, rightTicks, volDeg, rightNeedle, 'VOL']].map(([cx, cy, ticks, , needle, label], gi) => (
          <g key={gi}>
            <GaugeRing cx={cx} cy={cy} r={GAUGE_R} />
            <GaugeFace cx={cx} cy={cy} r={GAUGE_R - 5} />
            {ticks.map((t, i) => (t.major
              ? <GaugeTickMajor key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
              : <GaugeTick key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />))}
            <GaugeNeedle x1={cx} y1={cy} x2={needle.x} y2={needle.y} />
            <GaugeHub cx={cx} cy={cy} r={4} />
            <GaugeLabel x={cx} y={cy + GAUGE_R + 12}>{label}</GaugeLabel>
          </g>
        ))}

        <MfdBacking x={208} y={68} width={104} height={54} rx={3} />
      </HoodSvg>

      <Overlay>
        <GaugeHit
          ref={progressGaugeRef}
          style={{ left: pct(LEFT_CX - GAUGE_R, VIEW_W), top: pct(LEFT_CY - GAUGE_R, VIEW_H), width: pct(GAUGE_R * 2, VIEW_W), height: pct(GAUGE_R * 2, VIEW_H) }}
          role="slider"
          aria-label="Progreso"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={currentTime}
          onPointerDown={progressDrag.onPointerDown}
          onPointerMove={progressDrag.onPointerMove}
          onPointerUp={progressDrag.onPointerUp}
          onPointerLeave={progressDrag.onPointerUp}
        />
        <GaugeHit
          ref={volGaugeRef}
          style={{ left: pct(RIGHT_CX - GAUGE_R, VIEW_W), top: pct(RIGHT_CY - GAUGE_R, VIEW_H), width: pct(GAUGE_R * 2, VIEW_W), height: pct(GAUGE_R * 2, VIEW_H) }}
          role="slider"
          aria-label="Volumen"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(volume * 100)}
          onPointerDown={volDrag.onPointerDown}
          onPointerMove={volDrag.onPointerMove}
          onPointerUp={volDrag.onPointerUp}
          onPointerLeave={volDrag.onPointerUp}
        />

        <MfdText>
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
            <EmptyText>{mode === 'favorites' ? 'SIN FAV' : mode === 'radio' ? 'SIN SEÑAL' : 'SIN SEÑAL'}</EmptyText>
          )}
        </MfdText>

        <Apron>
          <TransportGroup>
            <SwitchButton type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
              <SkipBack />
            </SwitchButton>
          </TransportGroup>

          <TransportGroup style={{ justifyContent: 'center' }}>
            <PlayButton type="button" onClick={onTogglePlay} disabled={!track} aria-label={playing ? 'Pausar' : 'Reproducir'}>
              {playing ? <Pause /> : <Play />}
            </PlayButton>
          </TransportGroup>

          <TransportGroup>
            <SwitchButton type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
              <SkipForward />
            </SwitchButton>
            <ListenSwitch type="button" onClick={onToggleEar} aria-label={ariaLabel} aria-pressed={isActive} title="Profile Listen">
              <ListenLed $active={isActive}>
                <Ear />
                <ListenLabel>{isActive ? 'ON' : 'LISTEN'}</ListenLabel>
              </ListenLed>
            </ListenSwitch>
          </TransportGroup>
        </Apron>
      </Overlay>
    </Wrap>
  );
}
