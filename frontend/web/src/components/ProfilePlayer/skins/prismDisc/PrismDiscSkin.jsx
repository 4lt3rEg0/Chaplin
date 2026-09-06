import React, { useCallback, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Disc3, DoorOpen, Ear, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, safeSetPointerCapture, ratioFromClientX } from '../shared';
import { glassPanel, glossPlastic, bevelRaised, bevelSunken, screwCss } from '../materials';

/*
 * PRISM DISC — skin #4. A portable optical player where the disc physically
 * dominates the object: a large lidded window bulges out above the body
 * (not a rectangle with a spinner icon inside), the disc itself has actual
 * concentric data rings, and a radial laser arm sweeps across it to show
 * real playback progress — the arm angle IS the progress readout.
 */

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;
const laserPulse = keyframes`0%, 100% { opacity: 0.7; } 50% { opacity: 1; }`;

const BODY_CLIP = 'polygon(0% 0%, 100% 0%, 100% 100%, 14% 100%, 0% 88%)';

const Wrap = styled.div`
  --pd-shell: ${({ $p }) => $p.shellTint};
  --pd-disc: ${({ $p }) => $p.discBase};
  --pd-shine: ${({ $p }) => $p.discShine};
  --pd-laser: ${({ $p }) => $p.laserColor};
  --pd-text: ${({ $p }) => $p.displayText};
  --pd-button: ${({ $p }) => $p.buttonColor};
  --pd-eject: ${({ $p }) => $p.ejectColor};
  --pd-led: ${({ $p }) => $p.ledColor};

  position: relative;
  padding-top: 58px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: var(--pd-text);

  @media (max-width: 480px) {
    padding-top: 48px;
  }
`;

const Body = styled.div`
  position: relative;
  clip-path: ${BODY_CLIP};
  padding: 14px 16px 16px;
  background:
    linear-gradient(155deg, rgba(255,255,255,0.10) 0%, transparent 35%),
    color-mix(in srgb, var(--pd-shell) 22%, #0e0c1a 78%);
  box-shadow: 0 12px 26px rgba(0,0,0,0.45);
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 480px) {
    padding: 12px 12px 14px;
  }
`;

const BodyEdge = styled.div`
  position: absolute;
  inset: 0;
  clip-path: ${BODY_CLIP};
  pointer-events: none;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.16), inset 0 0 0 1px color-mix(in srgb, var(--pd-shell) 45%, transparent), inset 0 -3px 8px rgba(0,0,0,0.4);
`;

const Screw = styled.span`
  position: absolute;
  width: 6px;
  height: 6px;
  z-index: 3;
  ${screwCss}
  ${({ $pos }) => $pos}
`;

// The disc lid physically protrudes above the body — a real bulge, not a
// flush rectangle. Its own thick bezel simulates the clear plastic lid.
const DiscBulge = styled.div`
  position: absolute;
  top: 0;
  left: 20px;
  width: 108px;
  height: 108px;
  border-radius: 50%;
  padding: 6px;
  background: ${({ $p }) => glassPanel($p.shellTint, 'raised')};
  box-shadow: ${bevelRaised(1)}, 0 10px 18px rgba(0,0,0,0.5);
  z-index: 2;

  @media (max-width: 480px) {
    width: 90px;
    height: 90px;
    left: 14px;
  }
`;

const DiscWindow = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  background: radial-gradient(circle at 40% 35%, rgba(255,255,255,0.18), transparent 55%), #0a0812;
  box-shadow: inset 0 3px 10px rgba(0,0,0,0.7);
`;

const Disc = styled.div`
  position: absolute;
  inset: 6%;
  border-radius: 50%;
  background:
    repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--pd-shine) 22%, transparent) 0deg 3deg, transparent 3deg 11deg),
    conic-gradient(from 90deg, color-mix(in srgb, var(--pd-shine) 40%, transparent), transparent 30%, transparent 70%, color-mix(in srgb, var(--pd-shine) 30%, transparent)),
    radial-gradient(circle at 35% 30%, var(--pd-shine), var(--pd-disc) 62%);
  animation: ${spin} 2.4s linear infinite;
  animation-play-state: ${({ $spinning }) => ($spinning ? 'running' : 'paused')};

  &::after {
    content: '';
    position: absolute;
    inset: 40%;
    border-radius: 50%;
    background: var(--pd-disc);
    border: 1px solid rgba(0,0,0,0.6);
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.6);
  }
`;

const LaserArm = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  width: 46%;
  height: 2px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--pd-laser) 70%, transparent) 60%, var(--pd-laser));
  transform-origin: 0 50%;
  transform: rotate(${({ $deg }) => $deg}deg);
  z-index: 2;

  &::after {
    content: '';
    position: absolute;
    right: -2px;
    top: 50%;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--pd-laser);
    box-shadow: 0 0 6px var(--pd-laser);
    transform: translateY(-50%);
    animation: ${laserPulse} 1.1s ease-in-out infinite;
  }
`;

const InfoPanel = styled.div`
  margin-left: 96px;
  min-width: 0;
  padding: 8px 10px 6px;
  border-radius: 6px;
  background: rgba(8, 6, 16, 0.55);
  border: 1px solid color-mix(in srgb, var(--pd-shell) 40%, transparent);

  @media (max-width: 480px) {
    margin-left: 78px;
  }
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

const RailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 9px;
  font-family: 'Consolas', monospace;
`;

const Rail = styled.div`
  position: relative;
  flex: 1;
  height: 7px;
  border-radius: 4px;
  background: #08060c;
  box-shadow: ${bevelSunken(0.7)};
  cursor: pointer;
`;

const RailFill = styled.div`
  position: absolute;
  inset: 0;
  width: ${({ $pct }) => $pct}%;
  border-radius: 4px;
  background: color-mix(in srgb, var(--pd-shell) 70%, transparent);
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
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: ${({ $p }) => glossPlastic($p.buttonColor)};
  color: var(--pd-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: ${bevelRaised(0.85)};

  &:active { box-shadow: ${bevelSunken(0.85)}; transform: translateY(1px); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const PlayButton = styled(CtlButton)`
  width: 38px;
  height: 38px;
`;

const EjectButton = styled(CtlButton)`
  color: ${({ $open }) => ($open ? '#2a0004' : 'var(--pd-eject)')};
  background: ${({ $open, $p }) => ($open
    ? `linear-gradient(180deg, var(--pd-eject), color-mix(in srgb, var(--pd-eject) 60%, #000))`
    : glossPlastic($p.buttonColor))};
`;

const ListenButton = styled(CtlButton)`
  color: ${({ $active }) => ($active ? '#012018' : 'var(--pd-led)')};
  background: ${({ $active, $p }) => ($active
    ? `linear-gradient(180deg, var(--pd-led), color-mix(in srgb, var(--pd-led) 55%, #000))`
    : glossPlastic($p.buttonColor))};
`;

const VolWheel = styled.div`
  position: relative;
  width: 54px;
  height: 14px;
  border-radius: 7px;
  background: #08060c;
  box-shadow: ${bevelSunken(0.6)};
  cursor: ew-resize;
  touch-action: none;
  overflow: hidden;
`;

const VolFill = styled.div`
  position: absolute;
  inset: 0;
  width: ${({ $pct }) => $pct}%;
  background: color-mix(in srgb, var(--pd-shell) 70%, transparent);
`;

const QueuePanel = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 14px;
  background: rgba(10, 8, 20, 0.96);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 4;
`;

const QueueHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  letter-spacing: 0.06em;
  opacity: 0.85;
`;

const QueueList = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const QueueItem = styled.button`
  text-align: left;
  border: none;
  background: ${({ $active }) => ($active ? 'color-mix(in srgb, var(--pd-shell) 35%, transparent)' : 'transparent')};
  color: var(--pd-text);
  border-radius: 4px;
  padding: 5px 7px;
  font-size: 11px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover { background: color-mix(in srgb, var(--pd-shell) 22%, transparent); }
`;

export default function PrismDiscSkin({
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
  queue = [],
  queueIndex = 0,
  onSelectTrack = () => {},
  palette = defaultPalette
}) {
  const railRef = useRef(null);
  const wheelRef = useRef(null);
  const draggingVol = useRef(false);
  const [queueOpen, setQueueOpen] = useState(false);

  const playing = isActive && isPlaying;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const armDeg = -90 + progress * 180;

  const seek = (clientX) => {
    if (!duration) return;
    onSeek(ratioFromClientX(railRef, clientX) * duration);
  };

  const onVolDown = useCallback((e) => {
    draggingVol.current = true;
    safeSetPointerCapture(e.currentTarget, e.pointerId);
    onVolumeChange(ratioFromClientX(wheelRef, e.clientX));
  }, [onVolumeChange]);
  const onVolMove = useCallback((e) => {
    if (!draggingVol.current) return;
    onVolumeChange(ratioFromClientX(wheelRef, e.clientX));
  }, [onVolumeChange]);
  const onVolUp = useCallback(() => { draggingVol.current = false; }, []);

  return (
    <Wrap $p={palette}>
      <DiscBulge $p={palette}>
        <DiscWindow>
          <Disc $spinning={playing} />
          <LaserArm $deg={armDeg} />
        </DiscWindow>
      </DiscBulge>

      <Body $p={palette}>
        <BodyEdge />
        <Screw $pos="top: 62px; right: 12px;" />
        <Screw $pos="bottom: 12px; right: 30px;" />

        {queueOpen && (
          <QueuePanel>
            <QueueHeader>
              <span>COLA · {queue.length}</span>
              <CtlButton $p={palette} type="button" onClick={() => setQueueOpen(false)} aria-label="Cerrar cola" style={{ width: 22, height: 22 }}>×</CtlButton>
            </QueueHeader>
            <QueueList>
              {queue.length === 0 && <TrackSub>Sin pistas en cola.</TrackSub>}
              {queue.map((t, i) => (
                <QueueItem key={t.id ?? i} type="button" $active={i === queueIndex} onClick={() => { onSelectTrack(i); setQueueOpen(false); }} title={t.title}>
                  {i + 1}. {t.title}
                </QueueItem>
              ))}
            </QueueList>
          </QueuePanel>
        )}

        <InfoPanel>
          {track ? (
            <>
              <TrackTitle title={track.title}>{track.title}</TrackTitle>
              <TrackSub>{modeLabel}{track.owner_username ? ` · ${track.owner_username}` : ''}</TrackSub>
            </>
          ) : (
            <TrackSub>{mode === 'favorites' ? 'SIN FAVORITAS' : mode === 'radio' ? 'RADIO SIN SEÑAL' : 'NO DISC'}</TrackSub>
          )}
        </InfoPanel>

        <RailRow>
          <span>{fmtTime(currentTime)}</span>
          <Rail ref={railRef} role="slider" aria-label="Progreso" aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={currentTime} onClick={(e) => seek(e.clientX)}>
            <RailFill $pct={progress * 100} />
          </Rail>
          <span>{fmtTime(duration)}</span>
        </RailRow>

        <ControlRow>
          <TransportGroup>
            <CtlButton $p={palette} type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
              <SkipBack size={12} />
            </CtlButton>
            <EjectButton $p={palette} type="button" $open={queueOpen} onClick={() => setQueueOpen((v) => !v)} aria-label="Abrir cola" aria-pressed={queueOpen} title="Eject / Cola">
              <DoorOpen size={13} />
            </EjectButton>
          </TransportGroup>

          <TransportGroup style={{ justifyContent: 'center' }}>
            <PlayButton $p={palette} type="button" onClick={onTogglePlay} aria-label={playing ? 'Pausar' : 'Reproducir'} disabled={!track}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </PlayButton>
          </TransportGroup>

          <TransportGroup>
            <ListenButton $p={palette} type="button" onClick={onToggleEar} $active={isActive} aria-label={ariaLabel} aria-pressed={isActive} title="Profile Listen">
              <Ear size={13} />
            </ListenButton>
            <CtlButton $p={palette} type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
              <SkipForward size={12} />
            </CtlButton>
          </TransportGroup>
        </ControlRow>

        <RailRow style={{ justifyContent: 'flex-end' }}>
          <Disc3 size={11} style={{ opacity: 0.6 }} />
          <VolWheel
            ref={wheelRef}
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
            <VolFill $pct={volume * 100} />
          </VolWheel>
        </RailRow>
      </Body>
    </Wrap>
  );
}
