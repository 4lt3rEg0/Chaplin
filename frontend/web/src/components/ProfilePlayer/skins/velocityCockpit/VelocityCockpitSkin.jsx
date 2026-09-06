import React, { useCallback, useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Ear, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, ratioFromAngle, safeSetPointerCapture } from '../shared';

/*
 * VELOCITY COCKPIT — skin #3. An instrument cluster read as a music player:
 * the main dial is literal song progress (needle sweep + lit tick arc), the
 * secondary dial is volume (drag like a real gauge), and "profile listen" is
 * a guarded toggle switch built into the panel, not a floating button.
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

const Shell = styled.div`
  --vc-panel: ${({ $p }) => $p.dashPanel};
  --vc-face: ${({ $p }) => $p.gaugeFace};
  --vc-needle: ${({ $p }) => $p.needleColor};
  --vc-tick: ${({ $p }) => $p.tickColor};
  --vc-text: ${({ $p }) => $p.displayText};
  --vc-switch: ${({ $p }) => $p.switchColor};
  --vc-button: ${({ $p }) => $p.buttonColor};
  --vc-accent: ${({ $p }) => $p.accentColor};

  position: relative;
  padding: 14px;
  border-radius: 12px;
  background:
    linear-gradient(160deg, rgba(255,255,255,0.06), transparent 35%),
    linear-gradient(180deg, color-mix(in srgb, var(--vc-panel) 120%, #000), var(--vc-panel));
  border: 1px solid rgba(0,0,0,0.6);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 20px rgba(0,0,0,0.4);
  color: var(--vc-text);
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
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
`;

const GaugeWrap = styled.div`
  position: relative;
  width: 78px;
  height: 78px;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;

  @media (max-width: 480px) {
    width: 64px;
    height: 64px;
  }
`;

const GaugeRing = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(
    var(--vc-tick) ${({ $pct }) => $pct * 0.72}%,
    rgba(255,255,255,0.08) 0
  );
  transform: rotate(126deg);
  mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px));
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px));
`;

const GaugeFace = styled.div`
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 32%, color-mix(in srgb, var(--vc-face) 140%, #fff 6%), var(--vc-face) 70%);
  border: 1px solid rgba(0,0,0,0.6);
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.6);
`;

const Needle = styled.div`
  position: absolute;
  left: 50%;
  bottom: 50%;
  width: 2px;
  height: 30%;
  background: linear-gradient(180deg, var(--vc-needle), transparent);
  transform-origin: 50% 100%;
  transform: translateX(-50%) rotate(${({ $deg }) => $deg}deg);
  animation: ${css`${needleFlick} 2.6s ease-in-out infinite`};

  @media (max-width: 480px) {
    height: 26%;
  }
`;

const GaugeHub = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vc-needle);
  transform: translate(-50%, -50%);
  box-shadow: 0 0 4px var(--vc-needle);
`;

const GaugeLabel = styled.span`
  position: absolute;
  bottom: -3px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 7px;
  letter-spacing: 0.08em;
  opacity: 0.6;
  font-family: 'Consolas', monospace;
`;

const Display = styled.div`
  min-width: 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: linear-gradient(160deg, rgba(255,255,255,0.04), transparent 40%), #0c0c0e;
  border: 1px solid color-mix(in srgb, var(--vc-accent) 35%, transparent);
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

const SwitchButton = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 5px;
  border: 1px solid rgba(0,0,0,0.7);
  background: linear-gradient(180deg, color-mix(in srgb, var(--vc-button) 130%, #555), var(--vc-button));
  color: var(--vc-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);

  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const PlayButton = styled(SwitchButton)`
  width: 40px;
  height: 40px;
  border-radius: 50%;
`;

const ListenSwitch = styled.button`
  position: relative;
  width: 44px;
  height: 26px;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--vc-switch) 55%, #000);
  background: ${({ $active }) => ($active
    ? 'linear-gradient(180deg, color-mix(in srgb, var(--vc-switch) 55%, #200), color-mix(in srgb, var(--vc-switch) 22%, #000))'
    : 'linear-gradient(180deg, #201414, #100c0c)')};
  color: ${({ $active }) => ($active ? '#1a0500' : 'var(--vc-switch)')};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  animation: ${({ $active }) => ($active ? css`${switchGlow} 2s ease-in-out infinite` : 'none')};

  &:active { transform: translateY(1px); }
`;

function useGaugeDrag(ref, value, onChange) {
  const draggingRef = useRef(false);
  const onPointerDown = useCallback((e) => {
    draggingRef.current = true;
    safeSetPointerCapture(e.currentTarget, e.pointerId);
    onChange(ratioFromAngle(ref, e.clientX, e.clientY, START_DEG, SWEEP_DEG));
  }, [onChange, ref]);
  const onPointerMove = useCallback((e) => {
    if (!draggingRef.current) return;
    onChange(ratioFromAngle(ref, e.clientX, e.clientY, START_DEG, SWEEP_DEG));
  }, [onChange, ref]);
  const onPointerUp = useCallback(() => { draggingRef.current = false; }, []);
  return { onPointerDown, onPointerMove, onPointerUp };
}

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

  const seekDrag = useGaugeDrag(progressGaugeRef, progress, (ratio) => {
    if (duration) onSeek(ratio * duration);
  });
  const volDrag = useGaugeDrag(volGaugeRef, volume, onVolumeChange);

  const playing = isActive && isPlaying;

  return (
    <Shell $p={palette}>
      <TopRow>
        <GaugeWrap
          ref={progressGaugeRef}
          role="slider"
          aria-label="Progreso"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={currentTime}
          onPointerDown={seekDrag.onPointerDown}
          onPointerMove={seekDrag.onPointerMove}
          onPointerUp={seekDrag.onPointerUp}
          onPointerLeave={seekDrag.onPointerUp}
        >
          <GaugeRing $pct={progress * 100} />
          <GaugeFace />
          <Needle $deg={progressDeg} />
          <GaugeHub />
          <GaugeLabel>PROG</GaugeLabel>
        </GaugeWrap>

        <Display>
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
        </Display>

        <GaugeWrap
          ref={volGaugeRef}
          role="slider"
          aria-label="Volumen"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(volume * 100)}
          onPointerDown={volDrag.onPointerDown}
          onPointerMove={volDrag.onPointerMove}
          onPointerUp={volDrag.onPointerUp}
          onPointerLeave={volDrag.onPointerUp}
        >
          <GaugeRing $pct={volume * 100} />
          <GaugeFace />
          <Needle $deg={volDeg} />
          <GaugeHub />
          <GaugeLabel>VOL</GaugeLabel>
        </GaugeWrap>
      </TopRow>

      <ControlRow>
        <TransportGroup>
          <SwitchButton type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
            <SkipBack size={13} />
          </SwitchButton>
          <ListenSwitch
            type="button"
            onClick={onToggleEar}
            $active={isActive}
            aria-label={ariaLabel}
            aria-pressed={isActive}
            title="Profile Listen"
          >
            <Ear size={14} />
          </ListenSwitch>
        </TransportGroup>

        <TransportGroup style={{ justifyContent: 'center' }}>
          <PlayButton
            type="button"
            onClick={onTogglePlay}
            aria-label={playing ? 'Pausar' : 'Reproducir'}
            disabled={!track}
          >
            {playing ? <Pause size={17} /> : <Play size={17} />}
          </PlayButton>
        </TransportGroup>

        <TransportGroup>
          <SwitchButton type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
            <SkipForward size={13} />
          </SwitchButton>
        </TransportGroup>
      </ControlRow>
    </Shell>
  );
}
