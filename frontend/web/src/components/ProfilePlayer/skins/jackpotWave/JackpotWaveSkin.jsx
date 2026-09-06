import React, { useCallback, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, ratioFromClientX, safeSetPointerCapture } from '../shared';

/*
 * JACKPOT//WAVE — skin #7. Arcade cabinet marquee. Reels show real track
 * data (mode / title / owner) instead of gambling symbols — there is no
 * randomness anywhere here. The lever's real function is "next track"; the
 * big START button is the real profile-listen handoff; credit bulbs are a
 * real, clickable progress meter.
 */

const chase = keyframes`
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
`;

const startGlow = keyframes`
  0%, 100% { box-shadow: 0 0 8px 2px var(--jw-start); }
  50% { box-shadow: 0 0 18px 6px var(--jw-start); }
`;

const pullLever = keyframes`
  0% { transform: rotate(0deg); }
  40% { transform: rotate(28deg); }
  100% { transform: rotate(0deg); }
`;

const BULBS = 14;

const Shell = styled.div`
  --jw-cabinet: ${({ $p }) => $p.cabinetColor};
  --jw-marquee: ${({ $p }) => $p.marqueeColor};
  --jw-reel-glass: ${({ $p }) => $p.reelGlass};
  --jw-reel-text: ${({ $p }) => $p.reelText};
  --jw-start: ${({ $p }) => $p.startColor};
  --jw-bulb: ${({ $p }) => $p.bulbColor};
  --jw-button: ${({ $p }) => $p.buttonColor};

  position: relative;
  padding: 12px 14px 14px;
  border-radius: 14px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--jw-cabinet) 130%, #000), var(--jw-cabinet));
  border: 1px solid rgba(0,0,0,0.6);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 20px rgba(0,0,0,0.45);
  color: var(--jw-reel-text);
  font-family: 'Segoe UI', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 8px;

  @media (max-width: 480px) {
    padding: 10px;
    gap: 6px;
  }
`;

const Marquee = styled.div`
  display: flex;
  justify-content: center;
  gap: 3px;
  padding: 3px 0 5px;
`;

const MarqueeBulb = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--jw-marquee);
  animation: ${({ $active, $i }) => ($active ? css`${chase} ${900 + ($i % 4) * 120}ms ease-in-out infinite` : 'none')};
  opacity: ${({ $active }) => ($active ? 1 : 0.35)};
`;

const ReelsWindow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.6fr 1fr;
  gap: 5px;
  padding: 8px;
  border-radius: 8px;
  background: var(--jw-reel-glass);
  border: 2px solid color-mix(in srgb, var(--jw-marquee) 45%, #000);
`;

const Reel = styled.div`
  padding: 5px 4px;
  border-radius: 4px;
  background: rgba(0,0,0,0.3);
  font-family: 'Consolas', monospace;
  font-size: 10px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--jw-reel-text);
`;

const CreditRow = styled.div`
  display: flex;
  gap: 3px;
  padding: 3px 2px;
  cursor: pointer;
`;

const Bulb = styled.span`
  flex: 1;
  height: 6px;
  border-radius: 50%;
  background: ${({ $lit }) => ($lit ? 'var(--jw-bulb)' : 'rgba(255,255,255,0.1)')};
  box-shadow: ${({ $lit }) => ($lit ? '0 0 5px var(--jw-bulb)' : 'none')};
`;

const ControlRow = styled.div`
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  align-items: center;
  gap: 8px;
`;

const CabButton = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.6);
  background: linear-gradient(180deg, color-mix(in srgb, var(--jw-button) 150%, #777), var(--jw-button));
  color: var(--jw-reel-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const LeverWrap = styled.div`
  position: relative;
  width: 20px;
  height: 32px;
  display: flex;
  justify-content: center;
`;

const LeverArm = styled.button`
  position: absolute;
  bottom: 0;
  width: 4px;
  height: 26px;
  border-radius: 2px;
  background: linear-gradient(180deg, #888, #333);
  transform-origin: bottom center;
  border: none;
  cursor: pointer;
  padding: 0;
  animation: ${({ $pulling }) => ($pulling ? css`${pullLever} 380ms ease-out` : 'none')};

  &::after {
    content: '';
    position: absolute;
    top: -6px;
    left: 50%;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--jw-start);
    transform: translateX(-50%);
    box-shadow: 0 0 5px var(--jw-start);
  }
`;

const StartButton = styled.button`
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--jw-start) 60%, #000);
  background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--jw-start) 80%, white 10%), var(--jw-start) 70%);
  color: #2a0008;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.04em;
  cursor: pointer;
  animation: ${({ $active }) => ($active ? css`${startGlow} 1.6s ease-in-out infinite` : 'none')};
  opacity: ${({ $active }) => ($active ? 1 : 0.85)};

  &:active { transform: translateY(1px); }
`;

const VolKnobWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const VolTrack = styled.div`
  position: relative;
  width: 44px;
  height: 10px;
  border-radius: 5px;
  background: rgba(255,255,255,0.08);
  cursor: ew-resize;
  touch-action: none;
  overflow: hidden;
`;

const VolFill = styled.div`
  position: absolute;
  inset: 0;
  width: ${({ $pct }) => $pct}%;
  background: var(--jw-marquee);
  opacity: 0.7;
`;

export default function JackpotWaveSkin({
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
  const creditRef = useRef(null);
  const volRef = useRef(null);
  const draggingVol = useRef(false);
  const [pulling, setPulling] = useState(false);

  const playing = isActive && isPlaying;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const litBulbs = Math.round(progress * BULBS);

  const pullTheLever = () => {
    if (!hasQueue) return;
    setPulling(true);
    onNext();
    setTimeout(() => setPulling(false), 380);
  };

  const seekFromBulbs = (clientX) => {
    if (!duration) return;
    onSeek(ratioFromClientX(creditRef, clientX) * duration);
  };

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

  const modeReel = mode === 'favorites' ? 'FAV' : mode === 'radio' ? 'RADIO' : 'ALL';

  return (
    <Shell $p={palette}>
      <Marquee>
        {Array.from({ length: 10 }, (_, i) => <MarqueeBulb key={i} $i={i} $active={playing} />)}
      </Marquee>

      <ReelsWindow>
        <Reel>{modeReel}</Reel>
        <Reel title={track?.title}>{track ? track.title : 'SIN CRÉDITOS'}</Reel>
        <Reel title={track?.owner_username}>{track?.owner_username || '---'}</Reel>
      </ReelsWindow>

      <CreditRow ref={creditRef} role="slider" aria-label="Progreso" aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={currentTime} onClick={(e) => seekFromBulbs(e.clientX)}>
        {Array.from({ length: BULBS }, (_, i) => <Bulb key={i} $lit={i < litBulbs} />)}
      </CreditRow>

      <ControlRow>
        <CabButton type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
          <SkipBack size={12} />
        </CabButton>

        <LeverWrap>
          <LeverArm type="button" onClick={pullTheLever} $pulling={pulling} disabled={!hasQueue} aria-label="Palanca: siguiente pista" title="Tirar de la palanca" />
        </LeverWrap>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
          <CabButton type="button" onClick={onTogglePlay} disabled={!track} aria-label={playing ? 'Pausar' : 'Reproducir'}>
            {playing ? <Pause size={13} /> : <Play size={13} />}
          </CabButton>
          <VolKnobWrap>
            <Volume2 size={11} style={{ opacity: 0.6 }} />
            <VolTrack
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
            </VolTrack>
          </VolKnobWrap>
        </div>

        <StartButton
          type="button"
          onClick={onToggleEar}
          $active={isActive}
          aria-label={ariaLabel}
          aria-pressed={isActive}
          title="Profile Listen"
        >
          {isActive ? 'STOP' : 'START'}
        </StartButton>
      </ControlRow>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, opacity: 0.6, fontFamily: 'Consolas, monospace' }}>
        <span>{fmtTime(currentTime)}</span>
        <span>{modeLabel}</span>
        <span>{fmtTime(duration)}</span>
      </div>
    </Shell>
  );
}
