import React, { useCallback, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Disc3, DoorOpen, Ear, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, safeSetPointerCapture, ratioFromClientX } from '../shared';

/*
 * PRISM DISC — skin #4. A translucent optical player where a real SVG disc
 * window dominates the object, bulging out of the top of an octagonally
 * chamfered shell (the silhouette is "disc + body", not a rectangle with a
 * circle icon). The disc is built from concentric SVG rings (not a raster
 * image) and spins for real while playing, freezing exactly where it was on
 * pause; a laser sled arm sweeps across it as a real, draggable seek
 * control. Eject opens the real queue.
 */

const VIEW_W = 460;
const VIEW_H = 320;
const DISC_CX = 150, DISC_CY = 108, DISC_R = 100;

const BODY_PATH = 'M 54 100 L 406 100 L 430 124 L 430 276 L 406 300 L 54 300 L 30 276 L 30 124 Z';

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;
const laserPulse = keyframes`0%, 100% { opacity: 0.65; } 50% { opacity: 1; }`;

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
  width: 100%;
  max-width: 460px;
  aspect-ratio: ${VIEW_W} / ${VIEW_H};
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: var(--pd-text);
  filter: drop-shadow(0 14px 18px rgba(0, 0, 0, 0.45));
`;

const BodySvg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
`;

const BodyFill = styled.path`
  fill: url(#pd-shell-grad);
  stroke: color-mix(in srgb, var(--pd-shell) 50%, transparent);
`;
const DiscWindowRing = styled.circle`
  fill: url(#pd-window-grad);
  stroke: color-mix(in srgb, var(--pd-shell) 55%, transparent);
  stroke-width: 3;
`;
const DiscGroup = styled.g`
  animation: ${spin} 2.4s linear infinite;
  animation-play-state: ${({ $spinning }) => ($spinning ? 'running' : 'paused')};
  transform-origin: ${DISC_CX}px ${DISC_CY}px;
`;
const DiscRing = styled.circle`
  fill: none;
  stroke: color-mix(in srgb, var(--pd-shine) 30%, transparent);
`;
const DiscBase = styled.circle`
  fill: url(#pd-disc-grad);
`;
const DiscHub = styled.circle`
  fill: var(--pd-disc);
  stroke: rgba(0, 0, 0, 0.5);
`;
const LaserArm = styled.line`
  stroke: var(--pd-laser);
  stroke-width: 2;
  filter: drop-shadow(0 0 3px var(--pd-laser));
  transform-origin: ${DISC_CX}px ${DISC_CY}px;
`;
const LaserDot = styled.circle`
  fill: var(--pd-laser);
  animation: ${laserPulse} 1.1s ease-in-out infinite;
`;
const DisplayBacking = styled.rect`
  fill: rgba(8, 6, 16, 0.7);
  stroke: color-mix(in srgb, var(--pd-shell) 40%, transparent);
`;
const Screw = styled.circle`
  fill: url(#pd-screw-grad);
`;

const pct = (v, total) => `${(v / total) * 100}%`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

const LaserHit = styled.div`
  position: absolute;
  left: ${pct(DISC_CX - DISC_R, VIEW_W)};
  top: ${pct(DISC_CY - DISC_R, VIEW_H)};
  width: ${pct(DISC_R * 2, VIEW_W)};
  height: ${pct(DISC_R * 2, VIEW_H)};
  border-radius: 50%;
  pointer-events: auto;
  cursor: pointer;
`;

const DisplayText = styled.div`
  position: absolute;
  left: ${pct(270, VIEW_W)};
  top: ${pct(150, VIEW_H)};
  width: ${pct(140, VIEW_W)};
  height: ${pct(74, VIEW_H)};
  padding: 6px 8px;
  overflow: hidden;
  font-family: 'Consolas', monospace;
`;
const TrackTitle = styled.div`
  font-size: clamp(9px, 2vw, 12px);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const TrackSub = styled.div`
  font-size: clamp(7px, 1.4vw, 9px);
  opacity: 0.75;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const TimeRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: clamp(7px, 1.2vw, 8px);
  opacity: 0.8;
  margin-top: 4px;
`;
const EmptyText = styled.div`
  font-size: clamp(9px, 1.6vw, 11px);
  opacity: 0.7;
`;

const ControlRow = styled.div`
  position: absolute;
  left: ${pct(46, VIEW_W)};
  top: ${pct(232, VIEW_H)};
  width: ${pct(368, VIEW_W)};
  height: ${pct(56, VIEW_H)};
  display: grid;
  grid-template-columns: auto auto 1fr auto auto;
  align-items: center;
  gap: 3%;
  pointer-events: auto;
`;

const CtlButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: radial-gradient(circle at 32% 28%, rgba(255,255,255,0.25), transparent 55%), color-mix(in srgb, var(--pd-button) 65%, #444);
  color: var(--pd-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);

  svg { width: 45%; height: 45%; }
  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const PlayButton = styled(CtlButton)`
  width: 52px;
  height: 52px;
`;

const EjectButton = styled(CtlButton)`
  color: ${({ $open }) => ($open ? '#2a0004' : 'var(--pd-eject)')};
  background: ${({ $open }) => ($open
    ? 'linear-gradient(180deg, var(--pd-eject), color-mix(in srgb, var(--pd-eject) 60%, #000))'
    : 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.25), transparent 55%), color-mix(in srgb, var(--pd-button) 65%, #444)')};
`;

const ListenButton = styled(CtlButton)`
  color: ${({ $active }) => ($active ? '#012018' : 'var(--pd-led)')};
  background: ${({ $active }) => ($active
    ? 'linear-gradient(180deg, var(--pd-led), color-mix(in srgb, var(--pd-led) 55%, #000))'
    : 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.25), transparent 55%), color-mix(in srgb, var(--pd-button) 65%, #444)')};
`;

const VolWheelWrap = styled.div`
  grid-column: 5;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const VolWheel = styled.div`
  position: relative;
  width: 54px;
  height: 14px;
  border-radius: 7px;
  background: #08060c;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.7);
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
  inset: 6% 6%;
  border-radius: 14px;
  background: rgba(10, 8, 20, 0.96);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: auto;
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

const LASER_MIN_DEG = -50;
const LASER_MAX_DEG = 50;

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
  const volRef = useRef(null);
  const draggingVol = useRef(false);
  const [queueOpen, setQueueOpen] = useState(false);

  const playing = isActive && isPlaying;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const laserDeg = LASER_MIN_DEG + progress * (LASER_MAX_DEG - LASER_MIN_DEG);
  const laserRad = ((laserDeg - 90) * Math.PI) / 180;
  const laserEnd = {
    x: DISC_CX + Math.cos(laserRad) * (DISC_R - 8),
    y: DISC_CY + Math.sin(laserRad) * (DISC_R - 8)
  };

  const laserHitRef = useRef(null);
  const draggingLaser = useRef(false);

  const seekFromAngle = (clientX, clientY) => {
    if (!duration) return;
    const rectEl = laserHitRef.current;
    if (!rectEl) return;
    const r = rectEl.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let deg = (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI + 90;
    const clamped = Math.max(LASER_MIN_DEG, Math.min(LASER_MAX_DEG, deg));
    const ratio = (clamped - LASER_MIN_DEG) / (LASER_MAX_DEG - LASER_MIN_DEG);
    onSeek(ratio * duration);
  };
  const onLaserDown = (e) => { draggingLaser.current = true; safeSetPointerCapture(e.currentTarget, e.pointerId); seekFromAngle(e.clientX, e.clientY); };
  const onLaserMove = (e) => { if (draggingLaser.current) seekFromAngle(e.clientX, e.clientY); };
  const onLaserUp = () => { draggingLaser.current = false; };

  const onVolDown = useCallback((e) => {
    draggingVol.current = true;
    safeSetPointerCapture(e.currentTarget, e.pointerId);
    onVolumeChange(ratioFromClientX(volRef, e.clientX));
  }, [onVolumeChange]);
  const onVolMove = useCallback((e) => {
    if (!draggingVol.current) return;
    onVolumeChange(ratioFromClientX(volRef, e.clientX));
  }, [onVolumeChange]);
  const onVolUp = useCallback(() => { draggingVol.current = false; }, []);

  return (
    <Wrap $p={palette}>
      <BodySvg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="pd-shell-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="20%" style={{ stopColor: 'color-mix(in srgb, var(--pd-shell) 30%, #0e0c1a)' }} />
            <stop offset="100%" style={{ stopColor: 'color-mix(in srgb, var(--pd-shell) 14%, #0a0814)' }} />
          </linearGradient>
          <radialGradient id="pd-window-grad" cx="38%" cy="32%" r="70%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="60%" style={{ stopColor: 'color-mix(in srgb, var(--pd-shell) 22%, transparent)' }} />
            <stop offset="100%" stopColor="#08060e" />
          </radialGradient>
          <radialGradient id="pd-disc-grad" cx="35%" cy="30%" r="65%">
            <stop offset="0%" style={{ stopColor: 'var(--pd-shine)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--pd-disc)' }} />
          </radialGradient>
          <radialGradient id="pd-screw-grad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#9a9a9e" />
            <stop offset="100%" stopColor="#151517" />
          </radialGradient>
        </defs>

        <BodyFill d={BODY_PATH} />
        <Screw cx={44} cy={288} r={4} />
        <Screw cx={416} cy={288} r={4} />

        <DiscWindowRing cx={DISC_CX} cy={DISC_CY} r={DISC_R} />
        <DiscGroup $spinning={playing}>
          <DiscBase cx={DISC_CX} cy={DISC_CY} r={DISC_R - 10} />
          <DiscRing cx={DISC_CX} cy={DISC_CY} r={DISC_R - 22} strokeWidth={1} />
          <DiscRing cx={DISC_CX} cy={DISC_CY} r={DISC_R - 38} strokeWidth={1} />
          <DiscRing cx={DISC_CX} cy={DISC_CY} r={DISC_R - 54} strokeWidth={1} />
          <DiscHub cx={DISC_CX} cy={DISC_CY} r={16} />
        </DiscGroup>
        <LaserArm x1={DISC_CX} y1={DISC_CY} x2={laserEnd.x} y2={laserEnd.y} />
        <LaserDot cx={laserEnd.x} cy={laserEnd.y} r={3} />

        <DisplayBacking x={268} y={148} width={144} height={78} rx={4} />
      </BodySvg>

      <Overlay>
        <LaserHit
          ref={laserHitRef}
          role="slider"
          aria-label="Progreso"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={currentTime}
          onPointerDown={onLaserDown}
          onPointerMove={onLaserMove}
          onPointerUp={onLaserUp}
          onPointerLeave={onLaserUp}
        />

        {queueOpen && (
          <QueuePanel>
            <QueueHeader>
              <span>COLA · {queue.length}</span>
              <CtlButton type="button" onClick={() => setQueueOpen(false)} aria-label="Cerrar cola" style={{ width: 22, height: 22 }}>×</CtlButton>
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

        <DisplayText>
          {track ? (
            <>
              <TrackTitle title={track.title}>{track.title}</TrackTitle>
              <TrackSub>{modeLabel}{track.owner_username ? ` · ${track.owner_username}` : ''}</TrackSub>
              <TimeRow><span>{fmtTime(currentTime)}</span><span>{fmtTime(duration)}</span></TimeRow>
            </>
          ) : (
            <EmptyText>{mode === 'favorites' ? 'SIN FAV' : mode === 'radio' ? 'SIN SEÑAL' : 'NO DISC'}</EmptyText>
          )}
        </DisplayText>

        <ControlRow>
          <CtlButton type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
            <SkipBack />
          </CtlButton>
          <EjectButton type="button" $open={queueOpen} onClick={() => setQueueOpen((v) => !v)} aria-label="Abrir cola" aria-pressed={queueOpen} title="Eject / Cola">
            <DoorOpen />
          </EjectButton>
          <PlayButton type="button" onClick={onTogglePlay} disabled={!track} aria-label={playing ? 'Pausar' : 'Reproducir'} style={{ justifySelf: 'center' }}>
            {playing ? <Pause /> : <Play />}
          </PlayButton>
          <ListenButton type="button" onClick={onToggleEar} $active={isActive} aria-label={ariaLabel} aria-pressed={isActive} title="Profile Listen">
            <Ear />
          </ListenButton>
          <CtlButton type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
            <SkipForward />
          </CtlButton>
        </ControlRow>

        <VolWheelWrap style={{ position: 'absolute', left: pct(300, VIEW_W), top: pct(296, VIEW_H) }}>
          <Disc3 size={11} style={{ opacity: 0.6 }} />
          <VolWheel
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
            <VolFill $pct={volume * 100} />
          </VolWheel>
        </VolWheelWrap>
      </Overlay>
    </Wrap>
  );
}
