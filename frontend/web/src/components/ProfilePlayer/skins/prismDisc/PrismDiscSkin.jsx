import React, { useCallback, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Disc3, DoorOpen, Ear, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, ratioFromClientX, safeSetPointerCapture } from '../shared';

/*
 * PRISM DISC — skin #4. Translucent portable MiniDisc player. The disc spins
 * for real while playing (frozen mid-rotation on pause, not reset), a laser
 * dot tracks progress across the read rail, and Eject is a genuine control:
 * it opens the real queue/playlist instead of being decorative.
 */

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const laserPulse = keyframes`
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
`;

const Shell = styled.div`
  --pd-shell: ${({ $p }) => $p.shellTint};
  --pd-disc: ${({ $p }) => $p.discBase};
  --pd-shine: ${({ $p }) => $p.discShine};
  --pd-laser: ${({ $p }) => $p.laserColor};
  --pd-text: ${({ $p }) => $p.displayText};
  --pd-button: ${({ $p }) => $p.buttonColor};
  --pd-eject: ${({ $p }) => $p.ejectColor};
  --pd-led: ${({ $p }) => $p.ledColor};

  position: relative;
  padding: 14px;
  border-radius: 18px;
  background:
    linear-gradient(155deg, rgba(255,255,255,0.14), transparent 40%),
    color-mix(in srgb, var(--pd-shell) 22%, #0e0c1a 78%);
  border: 1px solid color-mix(in srgb, var(--pd-shell) 45%, transparent);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 10px 24px rgba(0,0,0,0.4);
  color: var(--pd-text);
  font-family: 'Segoe UI', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 480px) {
    padding: 10px;
    gap: 8px;
  }
`;

const TopRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
`;

const DiscWindow = styled.div`
  position: relative;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  flex-shrink: 0;
  background: radial-gradient(circle at 40% 35%, rgba(255,255,255,0.25), transparent 55%), color-mix(in srgb, var(--pd-shell) 30%, transparent);
  border: 1px solid color-mix(in srgb, var(--pd-shell) 50%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  @media (max-width: 480px) {
    width: 56px;
    height: 56px;
  }
`;

const Disc = styled.div`
  width: 88%;
  height: 88%;
  border-radius: 50%;
  background:
    repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--pd-shine) 25%, transparent) 0deg 4deg, transparent 4deg 12deg),
    radial-gradient(circle at 35% 30%, var(--pd-shine), var(--pd-disc) 60%);
  animation: ${spin} 2.4s linear infinite;
  animation-play-state: ${({ $spinning }) => ($spinning ? 'running' : 'paused')};
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset: 42%;
    border-radius: 50%;
    background: var(--pd-disc);
    border: 1px solid rgba(0,0,0,0.5);
  }
`;

const Display = styled.div`
  min-width: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(8, 6, 16, 0.55);
  border: 1px solid color-mix(in srgb, var(--pd-shell) 40%, transparent);
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
  height: 6px;
  border-radius: 3px;
  background: rgba(255,255,255,0.08);
  cursor: pointer;
`;

const RailFill = styled.div`
  position: absolute;
  inset: 0;
  width: ${({ $pct }) => $pct}%;
  border-radius: 3px;
  background: color-mix(in srgb, var(--pd-shell) 70%, transparent);
`;

const Laser = styled.div`
  position: absolute;
  top: 50%;
  left: ${({ $pct }) => $pct}%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--pd-laser);
  box-shadow: 0 0 6px var(--pd-laser);
  transform: translate(-50%, -50%);
  animation: ${laserPulse} 1.1s ease-in-out infinite;
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
  border: 1px solid rgba(0,0,0,0.5);
  background: linear-gradient(180deg, color-mix(in srgb, var(--pd-button) 140%, #666), var(--pd-button));
  color: var(--pd-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.35);

  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const PlayButton = styled(CtlButton)`
  width: 38px;
  height: 38px;
`;

const EjectButton = styled(CtlButton)`
  border-color: color-mix(in srgb, var(--pd-eject) 55%, #000);
  color: ${({ $open }) => ($open ? '#2a0004' : 'var(--pd-eject)')};
  background: ${({ $open }) => ($open
    ? 'linear-gradient(180deg, var(--pd-eject), color-mix(in srgb, var(--pd-eject) 60%, #000))'
    : 'linear-gradient(180deg, color-mix(in srgb, var(--pd-button) 140%, #666), var(--pd-button))')};
`;

const ListenButton = styled(CtlButton)`
  border-color: color-mix(in srgb, var(--pd-led) 55%, #000);
  color: ${({ $active }) => ($active ? '#012018' : 'var(--pd-led)')};
  background: ${({ $active }) => ($active
    ? 'linear-gradient(180deg, var(--pd-led), color-mix(in srgb, var(--pd-led) 55%, #000))'
    : 'linear-gradient(180deg, color-mix(in srgb, var(--pd-button) 140%, #666), var(--pd-button))')};
`;

const VolWheel = styled.div`
  position: relative;
  width: 54px;
  height: 14px;
  border-radius: 7px;
  background: rgba(255,255,255,0.08);
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
  border-radius: 18px;
  background: rgba(10, 8, 20, 0.94);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 3;
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
    <Shell $p={palette}>
      {queueOpen && (
        <QueuePanel>
          <QueueHeader>
            <span>COLA · {queue.length}</span>
            <CtlButton type="button" onClick={() => setQueueOpen(false)} aria-label="Cerrar cola" style={{ width: 22, height: 22 }}>
              ×
            </CtlButton>
          </QueueHeader>
          <QueueList>
            {queue.length === 0 && <TrackSub>Sin pistas en cola.</TrackSub>}
            {queue.map((t, i) => (
              <QueueItem
                key={t.id ?? i}
                type="button"
                $active={i === queueIndex}
                onClick={() => { onSelectTrack(i); setQueueOpen(false); }}
                title={t.title}
              >
                {i + 1}. {t.title}
              </QueueItem>
            ))}
          </QueueList>
        </QueuePanel>
      )}

      <TopRow>
        <DiscWindow>
          <Disc $spinning={playing} />
        </DiscWindow>
        <Display>
          {track ? (
            <>
              <TrackTitle title={track.title}>{track.title}</TrackTitle>
              <TrackSub>{modeLabel}{track.owner_username ? ` · ${track.owner_username}` : ''}</TrackSub>
            </>
          ) : (
            <TrackSub>{mode === 'favorites' ? 'SIN FAVORITAS' : mode === 'radio' ? 'RADIO SIN SEÑAL' : 'NO DISC'}</TrackSub>
          )}
        </Display>
      </TopRow>

      <RailRow>
        <span>{fmtTime(currentTime)}</span>
        <Rail ref={railRef} role="slider" aria-label="Progreso" aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={currentTime} onClick={(e) => seek(e.clientX)}>
          <RailFill $pct={progress * 100} />
          <Laser $pct={progress * 100} />
        </Rail>
        <span>{fmtTime(duration)}</span>
      </RailRow>

      <ControlRow>
        <TransportGroup>
          <CtlButton type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
            <SkipBack size={12} />
          </CtlButton>
          <EjectButton
            type="button"
            $open={queueOpen}
            onClick={() => setQueueOpen((v) => !v)}
            aria-label="Abrir cola"
            aria-pressed={queueOpen}
            title="Eject / Cola"
          >
            <DoorOpen size={13} />
          </EjectButton>
        </TransportGroup>

        <TransportGroup style={{ justifyContent: 'center' }}>
          <PlayButton type="button" onClick={onTogglePlay} aria-label={playing ? 'Pausar' : 'Reproducir'} disabled={!track}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </PlayButton>
        </TransportGroup>

        <TransportGroup>
          <ListenButton
            type="button"
            onClick={onToggleEar}
            $active={isActive}
            aria-label={ariaLabel}
            aria-pressed={isActive}
            title="Profile Listen"
          >
            <Ear size={13} />
          </ListenButton>
          <CtlButton type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
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
    </Shell>
  );
}
