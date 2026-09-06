import React, { useCallback, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, ratioFromClientX, safeSetPointerCapture } from '../shared';
import { glossPlastic, matteRubber, bevelRaised, bevelSunken, screwCss } from '../materials';

/*
 * JACKPOT//WAVE — skin #8. A mini arcade cabinet: a separate lit marquee
 * sign sits atop a trapezoidal cabinet body that flares out into an angled
 * control deck — not a rectangle with a row of lights. Reels show real
 * track data only (no randomness anywhere); the lever's real function is
 * "next track"; the big lit button is the real profile-listen handoff.
 */

const chase = keyframes`0%, 100% { opacity: 0.35; } 50% { opacity: 1; }`;
const startGlow = keyframes`
  0%, 100% { box-shadow: 0 0 8px 2px var(--jw-start); }
  50% { box-shadow: 0 0 18px 6px var(--jw-start); }
`;
const pullLever = keyframes`
  0% { transform: rotate(0deg); }
  40% { transform: rotate(30deg); }
  100% { transform: rotate(0deg); }
`;

const BULBS = 12;
const CABINET_CLIP = 'polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)';

const Wrap = styled.div`
  --jw-cabinet: ${({ $p }) => $p.cabinetColor};
  --jw-marquee: ${({ $p }) => $p.marqueeColor};
  --jw-reel-glass: ${({ $p }) => $p.reelGlass};
  --jw-reel-text: ${({ $p }) => $p.reelText};
  --jw-start: ${({ $p }) => $p.startColor};
  --jw-bulb: ${({ $p }) => $p.bulbColor};
  --jw-button: ${({ $p }) => $p.buttonColor};

  font-family: 'Segoe UI', system-ui, sans-serif;
  color: var(--jw-reel-text);
`;

const Marquee = styled.div`
  position: relative;
  border-radius: 16px 16px 4px 4px;
  padding: 6px 14px;
  background: ${({ $p }) => glossPlastic($p.cabinetColor)};
  box-shadow: ${bevelRaised(0.8)};
  display: flex;
  justify-content: center;
  gap: 4px;
  z-index: 1;
`;

const MarqueeBulb = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--jw-marquee);
  animation: ${({ $active, $i }) => ($active ? css`${chase} ${900 + ($i % 4) * 120}ms ease-in-out infinite` : 'none')};
  opacity: ${({ $active }) => ($active ? 1 : 0.35)};
  box-shadow: ${({ $active }) => ($active ? '0 0 4px var(--jw-marquee)' : 'none')};
`;

const Cabinet = styled.div`
  position: relative;
  clip-path: ${CABINET_CLIP};
  margin-top: -4px;
  padding: 16px 24px 18px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--jw-cabinet) 60%, #000) 0%, var(--jw-cabinet) 60%);
  box-shadow: 0 12px 22px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 480px) {
    padding: 12px 16px 14px;
  }
`;

const CabinetEdge = styled.div`
  position: absolute;
  inset: 0;
  clip-path: ${CABINET_CLIP};
  pointer-events: none;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(0,0,0,0.5);
`;

const Screw = styled.span`
  position: absolute;
  width: 6px;
  height: 6px;
  z-index: 2;
  ${screwCss}
  ${({ $pos }) => $pos}
`;

const ReelsBezel = styled.div`
  padding: 4px;
  border-radius: 8px;
  background: ${({ $p }) => matteRubber($p.cabinetColor)};
  box-shadow: ${bevelSunken(0.7)};
`;

const ReelsWindow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.6fr 1fr;
  gap: 5px;
  padding: 6px;
  border-radius: 5px;
  background: var(--jw-reel-glass);
  box-shadow: inset 0 3px 8px rgba(0,0,0,0.6);
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

// The angled control deck — visually a separate, tilted panel the lever
// and buttons are mounted into, distinct from the cabinet face above it.
const Deck = styled.div`
  margin: 4px -10px -14px;
  padding: 12px 20px 14px;
  border-radius: 10px 10px 0 0;
  background: ${({ $p }) => matteRubber($p.buttonColor)};
  box-shadow: inset 0 3px 6px rgba(0,0,0,0.4), 0 -1px 0 rgba(255,255,255,0.05);
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  align-items: center;
  gap: 10px;
`;

const CabButton = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: ${({ $p }) => glossPlastic($p.buttonColor)};
  color: var(--jw-reel-text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: ${bevelRaised(0.85)};

  &:active { box-shadow: ${bevelSunken(0.85)}; transform: translateY(1px); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const LeverWrap = styled.div`
  position: relative;
  width: 22px;
  height: 34px;
  display: flex;
  justify-content: center;
`;

const LeverBase = styled.div`
  position: absolute;
  bottom: 0;
  width: 16px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #6a6a6e, #1a1a1c 70%);
  box-shadow: ${bevelRaised(0.6)};
`;

const LeverArm = styled.button`
  position: absolute;
  bottom: 4px;
  width: 4px;
  height: 26px;
  border-radius: 2px;
  background: linear-gradient(180deg, #999, #333);
  transform-origin: bottom center;
  border: none;
  cursor: pointer;
  padding: 0;
  animation: ${({ $pulling }) => ($pulling ? css`${pullLever} 380ms ease-out` : 'none')};

  &::after {
    content: '';
    position: absolute;
    top: -7px;
    left: 50%;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: var(--jw-start);
    transform: translateX(-50%);
    box-shadow: 0 0 5px var(--jw-start), inset -2px -2px 4px rgba(0,0,0,0.3), inset 2px 2px 3px rgba(255,255,255,0.3);
  }
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
  background: rgba(0,0,0,0.4);
  box-shadow: ${bevelSunken(0.5)};
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

const StartButton = styled.button`
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--jw-start) 80%, white 10%), var(--jw-start) 70%);
  color: #2a0008;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.04em;
  cursor: pointer;
  box-shadow: ${bevelRaised(1)};
  animation: ${({ $active }) => ($active ? css`${startGlow} 1.6s ease-in-out infinite` : 'none')};

  &:active { box-shadow: ${bevelSunken(1)}; transform: translateY(1px); }
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
    <Wrap $p={palette}>
      <Marquee $p={palette}>
        {Array.from({ length: 10 }, (_, i) => <MarqueeBulb key={i} $i={i} $active={playing} />)}
      </Marquee>

      <Cabinet $p={palette}>
        <CabinetEdge />
        <Screw $pos="top: 6px; left: 6px;" />
        <Screw $pos="top: 6px; right: 6px;" />

        <ReelsBezel $p={palette}>
          <ReelsWindow>
            <Reel>{modeReel}</Reel>
            <Reel title={track?.title}>{track ? track.title : 'SIN CRÉDITOS'}</Reel>
            <Reel title={track?.owner_username}>{track?.owner_username || '---'}</Reel>
          </ReelsWindow>
        </ReelsBezel>

        <CreditRow ref={creditRef} role="slider" aria-label="Progreso" aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={currentTime} onClick={(e) => seekFromBulbs(e.clientX)}>
          {Array.from({ length: BULBS }, (_, i) => <Bulb key={i} $lit={i < litBulbs} />)}
        </CreditRow>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, opacity: 0.6, fontFamily: 'Consolas, monospace' }}>
          <span>{fmtTime(currentTime)}</span>
          <span>{modeLabel}</span>
          <span>{fmtTime(duration)}</span>
        </div>

        <Deck $p={palette}>
          <CabButton $p={palette} type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
            <SkipBack size={12} />
          </CabButton>

          <LeverWrap>
            <LeverBase />
            <LeverArm type="button" onClick={pullTheLever} $pulling={pulling} disabled={!hasQueue} aria-label="Palanca: siguiente pista" title="Tirar de la palanca" />
          </LeverWrap>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
            <CabButton $p={palette} type="button" onClick={onTogglePlay} disabled={!track} aria-label={playing ? 'Pausar' : 'Reproducir'}>
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
        </Deck>
      </Cabinet>
    </Wrap>
  );
}
