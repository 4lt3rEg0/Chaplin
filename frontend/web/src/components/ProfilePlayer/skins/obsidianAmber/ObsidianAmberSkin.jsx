import React, { useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Ear, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, safeSetPointerCapture, useVerticalDrag, ratioFromClientX } from '../shared';

/*
 * OBSIDIAN AMBER — skin #1 of the Chaplin Winamp/Y2K player collection.
 *
 * The chassis is a single authored SVG path (not a rounded <div>): a black
 * chrome deck with a raised VU-meter bay stepping up on the top-left and
 * chamfered corners elsewhere, so the silhouette alone — no color, no text,
 * no icons — reads as "an asymmetric hardware module", never a card. Every
 * interactive control (transport, knob, listen switch, seek strip) is a
 * real HTML element layered on top at coordinates matched to the SVG
 * viewBox, so it stays keyboard/touch accessible while the ornamental
 * metal/bevel/screws/vents/gauge live in the SVG layer beneath it.
 */

const VIEW_W = 560;
const VIEW_H = 280;

// Outer chassis: raised bay top-left, chamfers on the other three corners.
const CHASSIS_PATH = `
  M 20 55
  L 20 0
  L 190 0
  L 190 55
  L 540 55
  L 560 75
  L 560 255
  L 520 275
  L 20 275
  L 0 255
  L 0 75
  Z
`;

const FEET = [
  { x: 46, y: 275, w: 30, h: 8 },
  { x: 484, y: 275, w: 30, h: 8 }
];

const VENTS = Array.from({ length: 6 }, (_, i) => ({ x: 548, y: 90 + i * 22 }));

const needleSway = keyframes`
  0%, 100% { transform: rotate(-18deg); }
  50% { transform: rotate(18deg); }
`;

const flicker = keyframes`
  0%, 96%, 100% { opacity: 1; }
  97% { opacity: 0.88; }
`;

const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 6px 1px var(--oa-glow); }
  50% { box-shadow: 0 0 15px 5px var(--oa-glow); }
`;

const Wrap = styled.div`
  --oa-metal-1: ${({ $p }) => $p.metalPrimary};
  --oa-metal-2: ${({ $p }) => $p.metalSecondary};
  --oa-glass: ${({ $p }) => $p.glassAmber};
  --oa-display-text: ${({ $p }) => $p.displayText};
  --oa-led: ${({ $p }) => $p.ledColor};
  --oa-button: ${({ $p }) => $p.buttonColor};
  --oa-glow: ${({ $p }) => $p.glowColor};
  --oa-listen: ${({ $p }) => $p.listenColor};

  position: relative;
  width: 100%;
  max-width: 560px;
  aspect-ratio: ${VIEW_W} / ${VIEW_H};
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: var(--oa-display-text);
  filter: drop-shadow(0 14px 20px rgba(0, 0, 0, 0.5));
`;

const ChassisSvg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
`;

const ChassisFill = styled.path`
  fill: url(#oa-metal-grad);
  stroke: rgba(0, 0, 0, 0.65);
  stroke-width: 1.5;
`;

const ChassisHighlight = styled.path`
  fill: none;
  stroke: rgba(255, 255, 255, 0.14);
  stroke-width: 1;
`;

const Foot = styled.rect`
  fill: #050505;
  rx: 3;
`;

const Vent = styled.rect`
  fill: rgba(0, 0, 0, 0.55);
`;

const Screw = styled.circle`
  fill: url(#oa-screw-grad);
  stroke: rgba(0, 0, 0, 0.6);
  stroke-width: 0.5;
`;

const BayPanel = styled.path`
  fill: #08080a;
  stroke: rgba(0, 0, 0, 0.7);
`;

const GaugeArcTrack = styled.path`
  fill: none;
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 3;
`;

const GaugeTick = styled.line`
  stroke: var(--oa-led);
  stroke-width: 1.4;
  opacity: 0.75;
`;

const GaugeNeedle = styled.line`
  stroke: var(--oa-led);
  stroke-width: 2;
  filter: drop-shadow(0 0 2px var(--oa-led));
  transform-origin: ${105 / VIEW_W * 100}% ${55 / VIEW_H * 100}%;
  transform-box: fill-box;
  animation: ${({ $active }) => ($active ? css`${needleSway} 1.6s ease-in-out infinite` : 'none')};
  transform: ${({ $active }) => ($active ? undefined : 'rotate(-18deg)')};
`;

const GaugeHub = styled.circle`
  fill: #050505;
  stroke: var(--oa-led);
  stroke-width: 1;
`;

const GaugeLabel = styled.text`
  fill: var(--oa-led);
  font-size: 8px;
  letter-spacing: 1px;
  font-family: 'Consolas', monospace;
  opacity: 0.7;
`;

const DisplayBacking = styled.rect`
  fill: url(#oa-amber-grad);
  stroke: color-mix(in srgb, var(--oa-glass) 45%, #000);
`;

const DisplaySheen = styled.polygon`
  fill: rgba(255, 255, 255, 0.10);
`;

const PlateLabel = styled.text`
  fill: rgba(255, 255, 255, 0.35);
  font-size: 9px;
  letter-spacing: 1.5px;
  font-family: 'Segoe UI', sans-serif;
  font-weight: 600;
`;

/* ---- HTML overlay (interactive layer) ---- */

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

const pct = (v, total) => `${(v / total) * 100}%`;

const DisplayText = styled.div`
  position: absolute;
  left: ${pct(216, VIEW_W)};
  top: ${pct(92, VIEW_H)};
  width: ${pct(208, VIEW_W)};
  height: ${pct(58, VIEW_H)};
  padding: 4px 8px;
  overflow: hidden;
  font-family: 'Consolas', 'SFMono-Regular', monospace;
  color: var(--oa-display-text);
  animation: ${flicker} 6s linear infinite;
`;

const TrackTitle = styled.div`
  font-size: clamp(10px, 2.3vw, 13px);
  font-weight: 700;
  letter-spacing: 0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 0 6px color-mix(in srgb, var(--oa-glass) 60%, transparent);
`;

const TrackSub = styled.div`
  font-size: clamp(8px, 1.6vw, 10px);
  opacity: 0.85;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DisplayMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 3px;
  font-size: clamp(7px, 1.4vw, 9px);
  letter-spacing: 0.06em;
  opacity: 0.8;
`;

const TechTag = styled.span`
  border: 1px solid color-mix(in srgb, var(--oa-glass) 50%, transparent);
  border-radius: 2px;
  padding: 0 3px;
`;

const EmptyDisplay = styled.div`
  font-size: clamp(9px, 1.8vw, 11px);
  letter-spacing: 0.04em;
  opacity: 0.75;
`;

const SeekHit = styled.div`
  position: absolute;
  left: ${pct(216, VIEW_W)};
  top: ${pct(158, VIEW_H)};
  width: ${pct(208, VIEW_W)};
  height: ${pct(14, VIEW_H)};
  pointer-events: auto;
  cursor: pointer;
`;

const SeekTrack = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 2px;
  background: #050505;
  display: flex;
  gap: 2px;
  padding: 3px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.8);
`;

const SeekSeg = styled.span`
  flex: 1;
  border-radius: 1px;
  background: ${({ $lit }) => ($lit ? 'var(--oa-led)' : 'rgba(255,255,255,0.06)')};
  box-shadow: ${({ $lit }) => ($lit ? '0 0 3px var(--oa-led)' : 'none')};
`;

const TransportGroup = styled.div`
  position: absolute;
  left: ${pct(216, VIEW_W)};
  top: ${pct(184, VIEW_H)};
  width: ${pct(208, VIEW_W)};
  height: ${pct(72, VIEW_H)};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4%;
  pointer-events: auto;
`;

const RoundButton = styled.button`
  width: ${({ $big }) => ($big ? '30%' : '20%')};
  aspect-ratio: 1;
  border-radius: 50%;
  border: none;
  background: linear-gradient(180deg, color-mix(in srgb, var(--oa-button) 145%, #666) 0%, var(--oa-button) 45%, color-mix(in srgb, var(--oa-button) 55%, #000) 100%);
  color: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    0 2px 3px rgba(0, 0, 0, 0.5),
    0 1px 0 rgba(255, 255, 255, 0.12) inset,
    0 -2px 3px rgba(0, 0, 0, 0.4) inset;

  svg { width: 42%; height: 42%; }

  &:active {
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6);
    transform: translateY(1px);
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

const ListenWrap = styled.div`
  position: absolute;
  left: ${pct(460, VIEW_W)};
  top: ${pct(90, VIEW_H)};
  width: ${pct(84, VIEW_W)};
  height: ${pct(42, VIEW_H)};
  pointer-events: auto;
`;

const ListenSwitch = styled.button`
  width: 100%;
  height: 100%;
  border-radius: 6px;
  border: none;
  padding: 3px;
  background: linear-gradient(180deg, #3a3a3f, #1c1c1f);
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  cursor: pointer;

  &:active { transform: translateY(1px); }
`;

const ListenGlass = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 3px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  background: ${({ $active }) => ($active
    ? 'linear-gradient(180deg, color-mix(in srgb, var(--oa-listen) 60%, #1a1305), color-mix(in srgb, var(--oa-listen) 30%, #0c0900))'
    : 'linear-gradient(180deg, #201a10, #12100a)')};
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6), ${({ $active }) => ($active ? '0 0 8px 1px var(--oa-listen)' : 'none')};
  color: ${({ $active }) => ($active ? '#1a1305' : 'var(--oa-listen)')};
  animation: ${({ $active }) => ($active ? css`${glowPulse} 2.2s ease-in-out infinite` : 'none')};

  svg { width: 16px; height: 16px; }
`;

const ListenLabel = styled.span`
  font-size: 6.5px;
  letter-spacing: 0.5px;
  font-weight: 700;
  font-family: 'Consolas', monospace;
`;

const KnobWrap = styled.div`
  position: absolute;
  left: ${pct(475, VIEW_W)};
  top: ${pct(150, VIEW_H)};
  width: ${pct(52, VIEW_W)};
  height: ${pct(52, VIEW_H)};
  pointer-events: auto;
`;

const KnobRing = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(from 200deg, #eef1f4, #7d838a 20%, #f5f7fa 35%, #c8ccd1 50%, #6d7278 65%, #eef1f4 80%, #9198a0 100%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
`;

const KnobFace = styled.div`
  position: absolute;
  inset: 12%;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 28%, #4a4a4e, #17171a 72%);
  box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.7), inset 0 -1px 1px rgba(255, 255, 255, 0.08);
  cursor: ns-resize;
  touch-action: none;

  &::after {
    content: '';
    position: absolute;
    top: 8%;
    left: 50%;
    width: 8%;
    height: 26%;
    background: var(--oa-led);
    box-shadow: 0 0 3px var(--oa-led);
    transform-origin: 50% 190%;
    transform: translateX(-50%) rotate(${({ $angle }) => $angle}deg);
  }
`;

const VolLabel = styled.span`
  position: absolute;
  left: ${pct(475, VIEW_W)};
  top: ${pct(206, VIEW_H)};
  width: ${pct(52, VIEW_W)};
  text-align: center;
  font-size: 7px;
  letter-spacing: 0.06em;
  opacity: 0.65;
  font-family: 'Consolas', monospace;
`;

const BAY_CX = 105;
const BAY_CY = 55;
const BAY_R = 44;
const SEGMENTS = 16;

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
  const seekRef = useRef(null);
  const drag = useVerticalDrag(volume, onVolumeChange, 120);

  const playing = isActive && isPlaying;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const litSegments = Math.round(progress * SEGMENTS);
  const knobAngle = -130 + volume * 260;

  const seekFromClientX = (clientX) => {
    if (!duration) return;
    onSeek(ratioFromClientX(seekRef, clientX) * duration);
  };

  // Gauge tick marks: 7 ticks across the semicircle arc (180deg sweep).
  const ticks = Array.from({ length: 7 }, (_, i) => {
    const t = i / 6; // 0..1
    const angleDeg = 180 - t * 180; // 180 (left) -> 0 (right)
    const rad = (angleDeg * Math.PI) / 180;
    const inner = BAY_R - 8;
    const outer = BAY_R;
    return {
      x1: BAY_CX + Math.cos(rad) * inner,
      y1: BAY_CY - Math.sin(rad) * inner,
      x2: BAY_CX + Math.cos(rad) * outer,
      y2: BAY_CY - Math.sin(rad) * outer
    };
  });

  return (
    <Wrap $p={palette}>
      <ChassisSvg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="oa-metal-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--oa-metal-2) 92%, #fff 8%)' }} />
            <stop offset="45%" style={{ stopColor: 'var(--oa-metal-2)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--oa-metal-1)' }} />
          </linearGradient>
          <linearGradient id="oa-amber-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--oa-glass) 22%, #100b02)' }} />
            <stop offset="100%" stopColor="#0c0900" />
          </linearGradient>
          <radialGradient id="oa-screw-grad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#9a9a9e" />
            <stop offset="100%" stopColor="#151517" />
          </radialGradient>
        </defs>

        <ChassisFill d={CHASSIS_PATH} />
        <ChassisHighlight d={CHASSIS_PATH} />

        {FEET.map((f, i) => <Foot key={i} x={f.x} y={f.y} width={f.w} height={f.h} />)}
        {VENTS.map((v, i) => <Vent key={i} x={v.x} y={v.y} width={8} height={12} rx={1} />)}

        <Screw cx={14} cy={14} r={4} />
        <Screw cx={196} cy={14} r={4} />
        <Screw cx={14} cy={261} r={4} />
        <Screw cx={546} cy={261} r={4} />

        {/* VU bay gauge */}
        <BayPanel d={`M 20 55 L 20 6 L 190 6 L 190 55 Z`} />
        <GaugeArcTrack d={`M ${BAY_CX - BAY_R} ${BAY_CY} A ${BAY_R} ${BAY_R} 0 0 1 ${BAY_CX + BAY_R} ${BAY_CY}`} />
        {ticks.map((t, i) => <GaugeTick key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />)}
        <GaugeNeedle
          $active={playing}
          x1={BAY_CX}
          y1={BAY_CY}
          x2={BAY_CX}
          y2={BAY_CY - (BAY_R - 10)}
        />
        <GaugeHub cx={BAY_CX} cy={BAY_CY} r={3.5} />
        <GaugeLabel x={BAY_CX - 8} y={BAY_CY - BAY_R - 4}>VU</GaugeLabel>

        {/* Amber display backing (text rendered in the HTML overlay) */}
        <DisplayBacking x={210} y={86} width={220} height={70} rx={3} />
        <DisplaySheen points="210,86 340,86 260,156 210,156" />

        <PlateLabel x={20} y={230}>OBSIDIAN AMBER</PlateLabel>
        <PlateLabel x={20} y={244} style={{ fontSize: 7, letterSpacing: 1, opacity: 0.55 }}>CHAPLIN AUDIO MODULE</PlateLabel>
      </ChassisSvg>

      <Overlay>
        <DisplayText>
          {track ? (
            <>
              <TrackTitle title={track.title}>{track.title}</TrackTitle>
              <TrackSub>{modeLabel}{track.owner_username ? ` · ${track.owner_username}` : ''}</TrackSub>
              <DisplayMeta>
                <span>{fmtTime(currentTime)} / {fmtTime(duration)}</span>
                <TechTag>{isActive ? (isPlaying ? 'PLAY' : 'PAUSE') : 'STBY'}</TechTag>
                <TechTag>44.1K·ST</TechTag>
              </DisplayMeta>
            </>
          ) : (
            <EmptyDisplay>
              {mode === 'favorites' ? 'SIN FAVORITAS' : mode === 'radio' ? 'RADIO SIN SEÑAL' : 'SIN SEÑAL DE AUDIO'}
            </EmptyDisplay>
          )}
        </DisplayText>

        <SeekHit
          ref={seekRef}
          role="slider"
          aria-label="Progreso"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={currentTime}
          onClick={(e) => seekFromClientX(e.clientX)}
        >
          <SeekTrack>
            {Array.from({ length: SEGMENTS }, (_, i) => <SeekSeg key={i} $lit={i < litSegments} />)}
          </SeekTrack>
        </SeekHit>

        <TransportGroup>
          <RoundButton type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
            <SkipBack />
          </RoundButton>
          <RoundButton $big type="button" onClick={onTogglePlay} disabled={!track} aria-label={playing ? 'Pausar' : 'Reproducir'}>
            {playing ? <Pause /> : <Play />}
          </RoundButton>
          <RoundButton type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
            <SkipForward />
          </RoundButton>
        </TransportGroup>

        <ListenWrap>
          <ListenSwitch type="button" onClick={onToggleEar} aria-label={ariaLabel} aria-pressed={isActive} title="Profile Listen">
            <ListenGlass $active={isActive}>
              <Ear />
              <ListenLabel>{isActive ? 'ACTIVE' : 'LISTEN'}</ListenLabel>
            </ListenGlass>
          </ListenSwitch>
        </ListenWrap>

        <KnobWrap>
          <KnobRing />
          <KnobFace
            $angle={knobAngle}
            onPointerDown={(e) => { safeSetPointerCapture(e.currentTarget, e.pointerId); drag.onPointerDown(e); }}
            onPointerMove={drag.onPointerMove}
            onPointerUp={drag.onPointerUp}
            onPointerLeave={drag.onPointerUp}
            role="slider"
            aria-label="Volumen"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(volume * 100)}
          />
        </KnobWrap>
        <VolLabel>{Math.round(volume * 100)}</VolLabel>
      </Overlay>
    </Wrap>
  );
}
