import React, { useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Ear, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, safeSetPointerCapture, useVerticalDrag, ratioFromClientX } from '../shared';
import { brushedMetal, chromeGradient, chromeRing, glassPanel, glassPanelShadow, bevelRaised, bevelSunken, screwCss } from '../materials';

/*
 * OBSIDIAN AMBER — skin #1. A physical black-chrome hardware module, not a
 * dark card with an accent border. The chassis is an asymmetric chamfered
 * chunk of brushed metal (recognizable in silhouette alone); the display is
 * amber glass recessed behind a chrome bezel; the volume control is a real
 * chrome knob with a machined ring; the transport buttons are raised metal
 * caps that physically depress. Four visual layers, back to front: chassis
 * -> recessed control panel -> physical controls -> lit glass elements.
 */

const flicker = keyframes`
  0%, 96%, 100% { opacity: 1; }
  97% { opacity: 0.86; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.35; transform: scaleY(0.45); }
  50% { opacity: 1; transform: scaleY(1); }
`;

const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 6px 1px var(--oa-glow); }
  50% { box-shadow: 0 0 15px 5px var(--oa-glow); }
`;

// Asymmetric chamfered chassis — the silhouette a solid-black fill would
// still read as "this specific hardware module", not a rounded rectangle.
const CHASSIS_CLIP = 'polygon(0% 11%, 15% 0%, 100% 0%, 100% 82%, 90% 100%, 0% 100%)';

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
  clip-path: ${CHASSIS_CLIP};
  padding: 18px 20px 22px;
  background: ${({ $p }) => brushedMetal($p.metalPrimary)};
  color: #d8d8dc;
  font-family: 'Segoe UI', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 14px 28px rgba(0,0,0,0.55);

  @media (max-width: 480px) {
    padding: 14px 14px 18px;
    gap: 8px;
  }
`;

const ChassisEdge = styled.div`
  position: absolute;
  inset: 0;
  clip-path: ${CHASSIS_CLIP};
  pointer-events: none;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.14),
    inset 0 0 0 1px rgba(0,0,0,0.5),
    inset 0 -3px 6px rgba(0,0,0,0.5);
`;

const Screw = styled.span`
  position: absolute;
  width: 7px;
  height: 7px;
  z-index: 2;
  ${screwCss}
  ${({ $pos }) => $pos}
`;

const Panel = styled.div`
  position: relative;
  z-index: 1;
  border-radius: 8px;
  padding: 10px 10px 12px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--oa-metal-2) 60%, #000) 0%, color-mix(in srgb, var(--oa-metal-1) 80%, #000) 100%);
  box-shadow: ${bevelSunken(0.8)};
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const DisplayRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: stretch;
`;

const DisplayBezel = styled.div`
  position: relative;
  border-radius: 4px;
  padding: 3px;
  background: ${chromeGradient()};
  box-shadow: ${bevelRaised(0.7)};
`;

const Display = styled.div`
  position: relative;
  min-width: 0;
  height: 100%;
  padding: 8px 10px;
  border-radius: 2px;
  background: ${({ $p }) => glassPanel($p.glassAmber, 'sunken')};
  box-shadow: ${({ $p }) => glassPanelShadow($p.glassAmber, 'sunken')};
  color: var(--oa-display-text);
  font-family: 'Consolas', 'SFMono-Regular', monospace;
  overflow: hidden;
  animation: ${flicker} 6s linear infinite;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, rgba(255,255,255,0.16) 0%, transparent 22%);
    pointer-events: none;
  }
`;

const TrackTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 0 6px color-mix(in srgb, var(--oa-glass) 65%, transparent);
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
  opacity: 0.8;
`;

const TechTag = styled.span`
  border: 1px solid color-mix(in srgb, var(--oa-glass) 50%, transparent);
  border-radius: 2px;
  padding: 1px 4px;
`;

const EmptyDisplay = styled.div`
  font-size: 11px;
  letter-spacing: 0.04em;
  opacity: 0.75;
  padding: 6px 0;
`;

const VuBezel = styled.div`
  padding: 3px;
  border-radius: 4px;
  background: ${chromeGradient()};
  box-shadow: ${bevelRaised(0.7)};
  flex-shrink: 0;
`;

const VuColumn = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  width: 44px;
  height: 100%;
  padding: 4px;
  border-radius: 2px;
  background: #050505;
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.8);
`;

const VuCell = styled.span`
  flex: 1;
  border-radius: 1px;
  background: linear-gradient(180deg, var(--oa-led), color-mix(in srgb, var(--oa-led) 35%, #000));
  box-shadow: 0 0 4px color-mix(in srgb, var(--oa-led) 70%, transparent);
  height: ${({ $h }) => $h}%;
  opacity: ${({ $active }) => ($active ? 1 : 0.22)};
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

const ProgressRail = styled.div`
  flex: 1;
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 3px;
  background: #08080a;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.85);
  cursor: pointer;
`;

const ProgressSeg = styled.span`
  flex: 1;
  height: 6px;
  border-radius: 1px;
  background: ${({ $lit }) => ($lit ? 'var(--oa-led)' : 'rgba(255,255,255,0.06)')};
  box-shadow: ${({ $lit }) => ($lit ? '0 0 4px var(--oa-led), inset 0 1px 0 rgba(255,255,255,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.6)')};
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

const CapButton = styled.button`
  position: relative;
  width: ${({ $big }) => ($big ? '46px' : '32px')};
  height: ${({ $big }) => ($big ? '46px' : '32px')};
  border-radius: 50%;
  border: none;
  background: linear-gradient(180deg, color-mix(in srgb, var(--oa-button) 65%, #999) 0%, var(--oa-button) 45%, color-mix(in srgb, var(--oa-button) 55%, #000) 100%);
  color: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: ${bevelRaised(1)};

  &:active {
    box-shadow: ${bevelSunken(1)};
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

const ListenSwitch = styled.button`
  position: relative;
  width: 50px;
  height: 32px;
  border-radius: 6px;
  border: none;
  padding: 3px;
  background: ${chromeGradient()};
  box-shadow: ${bevelRaised(0.6)};
  cursor: pointer;
  flex-shrink: 0;

  &:active { transform: translateY(1px); }
`;

const ListenGlass = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $active, $tint }) => glassPanel($tint, $active ? 'raised' : 'sunken')};
  box-shadow: ${({ $active, $tint }) => glassPanelShadow($tint, $active ? 'raised' : 'sunken')};
  color: ${({ $active }) => ($active ? '#1a1305' : 'var(--oa-listen)')};
  animation: ${({ $active }) => ($active ? css`${glowPulse} 2.2s ease-in-out infinite` : 'none')};
`;

const KnobWrap = styled.div`
  position: relative;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
`;

const KnobRing = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: ${() => chromeRing()};
  box-shadow: ${bevelRaised(1)};
`;

const KnobFace = styled.div`
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 28%, #4a4a4e, #17171a 72%);
  box-shadow: inset 0 2px 3px rgba(0,0,0,0.7), inset 0 -1px 1px rgba(255,255,255,0.08);
  cursor: ns-resize;
  touch-action: none;

  &::after {
    content: '';
    position: absolute;
    top: 4px;
    left: 50%;
    width: 2px;
    height: 9px;
    background: var(--oa-led);
    box-shadow: 0 0 3px var(--oa-led);
    transform-origin: 50% 14px;
    transform: translateX(-50%) rotate(${({ $angle }) => $angle}deg);
  }
`;

const VolLabel = styled.span`
  position: absolute;
  bottom: -13px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 8px;
  letter-spacing: 0.06em;
  opacity: 0.65;
  font-family: 'Consolas', monospace;
  white-space: nowrap;
`;

const VentRow = styled.div`
  position: absolute;
  bottom: 5px;
  right: 26px;
  display: flex;
  gap: 2px;
  z-index: 1;
`;

const Vent = styled.span`
  width: 2px;
  height: 10px;
  background: rgba(0,0,0,0.55);
  box-shadow: 1px 0 0 rgba(255,255,255,0.05);
`;

const BAR_COUNT = 9;
const SEGMENTS = 18;

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
  const drag = useVerticalDrag(volume, onVolumeChange, 120);

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const litSegments = Math.round(progress * SEGMENTS);
  const angle = -130 + volume * 260;

  const seekFromClientX = (clientX) => {
    if (!duration) return;
    onSeek(ratioFromClientX(stripRef, clientX) * duration);
  };

  return (
    <Shell $p={palette}>
      <ChassisEdge />
      <Screw $pos="top: 8px; left: 24px;" />
      <Screw $pos="top: 8px; right: 8px;" />
      <Screw $pos="bottom: 8px; left: 8px;" />
      <VentRow>
        {Array.from({ length: 5 }, (_, i) => <Vent key={i} />)}
      </VentRow>

      <Panel>
        <DisplayRow>
          <DisplayBezel>
            <Display $p={palette}>
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
          </DisplayBezel>

          <VuBezel>
            <VuColumn>
              {Array.from({ length: BAR_COUNT }, (_, i) => (
                <VuCell
                  key={i}
                  $h={30 + ((i * 37) % 65)}
                  $active={isActive && isPlaying}
                  $dur={550 + (i % 4) * 120}
                />
              ))}
            </VuColumn>
          </VuBezel>
        </DisplayRow>

        <ProgressRow>
          <span>{fmtTime(currentTime)}</span>
          <ProgressRail
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
          </ProgressRail>
          <span>{fmtTime(duration)}</span>
        </ProgressRow>

        <ControlRow>
          <TransportGroup>
            <CapButton type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
              <SkipBack size={13} />
            </CapButton>
            <ListenSwitch
              type="button"
              onClick={onToggleEar}
              aria-label={ariaLabel}
              aria-pressed={isActive}
              title="Profile Listen"
            >
              <ListenGlass $active={isActive} $tint={palette.listenColor}>
                <Ear size={15} />
              </ListenGlass>
            </ListenSwitch>
          </TransportGroup>

          <TransportGroup>
            <CapButton
              type="button"
              $big
              onClick={onTogglePlay}
              aria-label={isActive && isPlaying ? 'Pausar' : 'Reproducir'}
              disabled={!track}
            >
              {isActive && isPlaying ? <Pause size={19} /> : <Play size={19} />}
            </CapButton>
          </TransportGroup>

          <TransportGroup>
            <CapButton type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
              <SkipForward size={13} />
            </CapButton>
            <KnobWrap>
              <KnobRing />
              <KnobFace
                $angle={angle}
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
              <VolLabel>{Math.round(volume * 100)}</VolLabel>
            </KnobWrap>
          </TransportGroup>
        </ControlRow>
      </Panel>
    </Shell>
  );
}
