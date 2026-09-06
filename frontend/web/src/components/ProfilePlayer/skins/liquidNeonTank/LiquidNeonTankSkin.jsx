import React, { useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Ear, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, safeSetPointerCapture, useVerticalDrag, ratioFromClientX } from '../shared';
import { chromeGradient, glassPanel, glassPanelShadow, glossPlastic, bevelRaised, bevelSunken, brushedMetal } from '../materials';

/*
 * LIQUID NEON TANK — skin #2. A physical capsule/aquarium sitting on a
 * heavy metal plinth — not a rounded rectangle. The tank is a true stadium
 * shape with a thick glass wall (layered rim highlight + inner shadow to
 * fake glass thickness); the track display is a round porthole embedded
 * into the glass, not a rectangle floating on top; the plinth is a separate
 * physical piece the capsule visually plugs into.
 */

const rise = keyframes`
  0% { transform: translateY(4px) scale(0.6); opacity: 0; }
  15% { opacity: 0.9; }
  100% { transform: translateY(-70px) scale(1); opacity: 0; }
`;

const ripple = keyframes`
  0%, 100% { transform: translateX(0) scaleY(1); }
  50% { transform: translateX(-6px) scaleY(1.06); }
`;

const valveGlow = keyframes`
  0%, 100% { box-shadow: 0 0 6px 1px var(--ln-valve); }
  50% { box-shadow: 0 0 16px 5px var(--ln-valve); }
`;

const Wrap = styled.div`
  --ln-glass: ${({ $p }) => $p.tankGlass};
  --ln-cyan: ${({ $p }) => $p.liquidCyan};
  --ln-magenta: ${({ $p }) => $p.liquidMagenta};
  --ln-bubble: ${({ $p }) => $p.bubbleColor};
  --ln-text: ${({ $p }) => $p.displayText};
  --ln-valve: ${({ $p }) => $p.valveColor};
  --ln-button: ${({ $p }) => $p.buttonColor};
  --ln-led: ${({ $p }) => $p.ledColor};

  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: var(--ln-text);
`;

// The tank: a true stadium capsule (border-radius clamps to half the
// height), with a thick faked-glass wall around a dark liquid chamber.
const Capsule = styled.div`
  position: relative;
  z-index: 2;
  border-radius: 200px;
  padding: 10px;
  background: ${({ $p }) => glassPanel($p.tankGlass, 'raised')};
  box-shadow:
    0 -1px 0 rgba(255,255,255,0.5) inset,
    0 10px 24px rgba(0,0,0,0.5),
    ${({ $p }) => glassPanelShadow($p.tankGlass, 'raised')};

  @media (max-width: 480px) {
    padding: 7px;
  }
`;

const Chamber = styled.div`
  position: relative;
  height: 108px;
  border-radius: 200px;
  overflow: hidden;
  background: color-mix(in srgb, var(--ln-glass) 55%, #000);
  box-shadow: inset 0 4px 14px rgba(0,0,0,0.75), inset 0 0 0 1px rgba(0,0,0,0.4);

  @media (max-width: 480px) {
    height: 90px;
  }
`;

const Fluid = styled.div`
  position: absolute;
  inset: 0;
  top: ${({ $fill }) => 100 - $fill}%;
  background: linear-gradient(105deg, color-mix(in srgb, var(--ln-cyan) 55%, transparent), color-mix(in srgb, var(--ln-magenta) 45%, transparent));
  opacity: 0.6;
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

const GlassSheen = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 200px;
  background: linear-gradient(100deg, rgba(255,255,255,0.28) 0%, transparent 18%, transparent 82%, rgba(255,255,255,0.10) 100%);
  pointer-events: none;
`;

// Round porthole embedded into the glass — a real window, not a card.
const Porthole = styled.div`
  position: absolute;
  top: 50%;
  left: 14px;
  transform: translateY(-50%);
  width: 82px;
  height: 82px;
  border-radius: 50%;
  padding: 4px;
  background: ${chromeGradient()};
  box-shadow: ${bevelRaised(0.8)};

  @media (max-width: 480px) {
    width: 66px;
    height: 66px;
    left: 10px;
  }
`;

const PortholeGlass = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(4, 14, 20, 0.72);
  box-shadow: inset 0 3px 8px rgba(0,0,0,0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 6px;
  overflow: hidden;
`;

const TrackTitle = styled.div`
  font-size: 10px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  text-shadow: 0 0 8px color-mix(in srgb, var(--ln-cyan) 70%, transparent);
`;

const TrackSub = styled.div`
  font-size: 8px;
  opacity: 0.8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
`;

const InfoStrip = styled.div`
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  left: 108px;
  font-family: 'Consolas', monospace;
  font-size: 9px;
  opacity: 0.85;
  display: flex;
  flex-direction: column;
  gap: 3px;

  @media (max-width: 480px) {
    left: 84px;
  }
`;

// The plinth — a separate physical base the capsule visually rests in,
// overlapped to read as one fused object rather than two stacked cards.
const Plinth = styled.div`
  position: relative;
  z-index: 1;
  margin-top: -22px;
  padding: 26px 16px 12px;
  border-radius: 22px;
  background: ${({ $p }) => brushedMetal($p.buttonColor)};
  box-shadow: 0 10px 22px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  background: #050505;
  box-shadow: ${bevelSunken(0.8)};
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
  border: none;
  background: ${({ $p }) => glossPlastic($p.buttonColor)};
  color: var(--ln-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: ${bevelRaised(0.9)};

  &:active { box-shadow: ${bevelSunken(0.9)}; transform: translateY(1px); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const Valve = styled.button`
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  border: none;
  background: ${({ $active }) => ($active
    ? 'radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--ln-valve) 90%, white), color-mix(in srgb, var(--ln-valve) 45%, #000))'
    : 'radial-gradient(circle at 35% 30%, #3a3a3f, #101012)')};
  color: ${({ $active }) => ($active ? '#04121a' : 'var(--ln-valve)')};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: ${bevelRaised(0.9)};
  animation: ${({ $active }) => ($active ? css`${valveGlow} 2s ease-in-out infinite` : 'none')};

  &::before {
    content: '';
    position: absolute;
    right: -9px;
    top: 50%;
    width: 9px;
    height: 5px;
    background: #26262b;
    box-shadow: inset 0 1px 1px rgba(0,0,0,0.6);
    transform: translateY(-50%);
  }
`;

const VolumeTube = styled.div`
  position: relative;
  width: 14px;
  height: 34px;
  border-radius: 7px;
  background: #050505;
  box-shadow: ${bevelSunken(0.7)};
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

const BUBBLES = 6;

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
  const volDrag = useVerticalDrag(volume, onVolumeChange, 90);

  const playing = isActive && isPlaying;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const fillLevel = 20 + progress * 70;

  const seek = (clientX) => {
    if (!duration) return;
    onSeek(ratioFromClientX(tubeRef, clientX) * duration);
  };

  const onVolDown = (e) => { safeSetPointerCapture(e.currentTarget, e.pointerId); volDrag.onPointerDown(e); };

  return (
    <Wrap $p={palette}>
      <Capsule $p={palette}>
        <Chamber>
          <Fluid $fill={fillLevel} $active={playing} />
          {Array.from({ length: BUBBLES }, (_, i) => (
            <Bubble key={i} $x={26 + i * 12} $size={3 + (i % 3)} $dur={1400 + (i % 4) * 500} $active={playing} />
          ))}
          <GlassSheen />
          <Porthole>
            <PortholeGlass>
              {track ? (
                <>
                  <TrackTitle title={track.title}>{track.title}</TrackTitle>
                  <TrackSub>{track.owner_username}</TrackSub>
                </>
              ) : (
                <TrackSub>{mode === 'favorites' ? 'SIN FAV' : mode === 'radio' ? 'SIN SEÑAL' : 'VACÍO'}</TrackSub>
              )}
            </PortholeGlass>
          </Porthole>
          <InfoStrip>
            <span>{modeLabel}</span>
            <span>{fmtTime(currentTime)} / {fmtTime(duration)}</span>
            <span>{isActive ? (playing ? 'FLUJO ACTIVO' : 'EN PAUSA') : 'EN REPOSO'}</span>
          </InfoStrip>
        </Chamber>
      </Capsule>

      <Plinth $p={palette}>
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
            <BubbleButton $p={palette} type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
              <SkipBack size={12} />
            </BubbleButton>
            <Valve type="button" onClick={onToggleEar} $active={isActive} aria-label={ariaLabel} aria-pressed={isActive} title="Profile Listen">
              <Ear size={15} />
            </Valve>
          </TransportGroup>

          <TransportGroup style={{ justifyContent: 'center' }}>
            <BubbleButton $p={palette} $big type="button" onClick={onTogglePlay} aria-label={playing ? 'Pausar' : 'Reproducir'} disabled={!track}>
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </BubbleButton>
          </TransportGroup>

          <TransportGroup>
            <BubbleButton $p={palette} type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
              <SkipForward size={12} />
            </BubbleButton>
            <VolumeTube
              ref={volRef}
              role="slider"
              aria-label="Volumen"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(volume * 100)}
              onPointerDown={onVolDown}
              onPointerMove={volDrag.onPointerMove}
              onPointerUp={volDrag.onPointerUp}
              onPointerLeave={volDrag.onPointerUp}
            >
              <VolumeFill $pct={volume * 100} />
            </VolumeTube>
          </TransportGroup>
        </ControlRow>
      </Plinth>
    </Wrap>
  );
}
