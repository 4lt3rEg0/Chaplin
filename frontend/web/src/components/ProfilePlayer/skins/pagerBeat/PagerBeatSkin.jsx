import React, { useMemo, useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Ear } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime } from '../shared';
import { glossPlastic, matteRubber, bevelRaised, bevelSunken, screwCss } from '../materials';

/*
 * PAGER//BEAT — skin #6. A chunky ABS-plastic pager: asymmetric molded
 * corners, a belt clip tab physically protruding from the case, a deeply
 * recessed dot-matrix LCD, rubber D-pad buttons that actually depress, and
 * a speaker grille of real drilled holes — not a green rectangle in a card.
 */

const scrollText = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const blink = keyframes`
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0.15; }
`;

const MARQUEE_THRESHOLD = 18;

const Wrap = styled.div`
  position: relative;
  padding-left: 14px;

  @media (max-width: 480px) {
    padding-left: 10px;
  }
`;

const ClipTab = styled.div`
  position: absolute;
  left: 0;
  top: 22px;
  width: 16px;
  height: 46px;
  border-radius: 5px 0 0 5px;
  background: ${({ $p }) => matteRubber($p.caseColor)};
  box-shadow: -2px 2px 6px rgba(0,0,0,0.4), inset 1px 0 0 rgba(255,255,255,0.08);
  z-index: 0;

  @media (max-width: 480px) {
    height: 38px;
  }
`;

const Case = styled.div`
  position: relative;
  z-index: 1;
  border-radius: 10px 16px 26px 26px;
  padding: 14px;
  background: ${({ $p }) => glossPlastic($p.caseColor)};
  box-shadow: ${bevelRaised(1)}, 0 12px 22px rgba(0,0,0,0.4);
  color: ${({ $p }) => $p.accentColor};
  font-family: 'Segoe UI', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 480px) {
    padding: 10px;
    gap: 8px;
  }
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 9px;
  letter-spacing: 0.08em;
  opacity: 0.8;
`;

const SpeakerGrille = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 3px);
  grid-auto-rows: 3px;
  gap: 2px;
`;

const SpeakerHole = styled.span`
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.15), #000 70%);
  box-shadow: inset 0 1px 1px rgba(0,0,0,0.7);
`;

const Led = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $on, $c }) => ($on ? $c : 'rgba(255,255,255,0.15)')};
  box-shadow: ${({ $on, $c }) => ($on ? `0 0 5px ${$c}` : 'none')};
  animation: ${({ $blink }) => ($blink ? css`${blink} 1s steps(1) infinite` : 'none')};
`;

const LcdBezel = styled.div`
  padding: 4px;
  border-radius: 4px;
  background: ${({ $p }) => matteRubber($p.dpadColor)};
  box-shadow: ${bevelSunken(0.9)};
`;

const Lcd = styled.div`
  position: relative;
  padding: 8px 8px 10px;
  border-radius: 2px;
  background:
    repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 3px),
    ${({ $p }) => $p.lcdBack};
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.45);
  color: ${({ $p }) => $p.pixelColor};
  font-family: 'Consolas', 'Courier New', monospace;
  overflow: hidden;
`;

const MarqueeWrap = styled.div`
  overflow: hidden;
  white-space: nowrap;
`;

const MarqueeInner = styled.div`
  display: inline-block;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  ${({ $scroll }) => $scroll && css`animation: ${scrollText} 6s linear infinite;`}
`;

const SubLine = styled.div`
  font-size: 10px;
  letter-spacing: 0.04em;
  opacity: 0.85;
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StatusLine = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  margin-top: 6px;
  opacity: 0.9;
`;

const ProgressDots = styled.div`
  display: flex;
  gap: 2px;
  margin-top: 5px;
  cursor: pointer;
`;

const Dot = styled.span`
  flex: 1;
  height: 4px;
  background: ${({ $lit, $p }) => ($lit ? $p.pixelColor : 'transparent')};
  border: 1px solid ${({ $p }) => $p.pixelColor};
  opacity: ${({ $lit }) => ($lit ? 0.9 : 0.35)};
`;

const BottomRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
`;

const DPad = styled.div`
  position: relative;
  width: 68px;
  height: 68px;
  flex-shrink: 0;
  border-radius: 50%;
  background: ${({ $p }) => matteRubber($p.dpadColor)};
  box-shadow: ${bevelSunken(0.5)};
`;

const DButton = styled.button`
  position: absolute;
  width: 24px;
  height: 22px;
  border: none;
  background: ${({ $p }) => glossPlastic($p.dpadColor)};
  color: ${({ $p }) => $p.accentColor};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: ${bevelRaised(0.7)};

  &:active { box-shadow: ${bevelSunken(0.7)}; transform: translateY(1px); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`;

const DUp = styled(DButton)`top: 2px; left: 22px; border-radius: 4px 4px 0 0;`;
const DDown = styled(DButton)`bottom: 2px; left: 22px; border-radius: 0 0 4px 4px;`;
const DLeft = styled(DButton)`left: 2px; top: 23px; border-radius: 4px 0 0 4px;`;
const DRight = styled(DButton)`right: 2px; top: 23px; border-radius: 0 4px 4px 0;`;
const DCenter = styled.button`
  position: absolute;
  left: 22px;
  top: 23px;
  width: 24px;
  height: 22px;
  border-radius: 3px;
  border: none;
  background: ${({ $p }) => `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${$p.ledColor} 60%, #222), color-mix(in srgb, ${$p.ledColor} 30%, #111))`};
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: ${bevelRaised(0.7)};

  &:active { box-shadow: ${bevelSunken(0.7)}; transform: translateY(1px); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`;

const ListenButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: ${({ $active, $p }) => ($active
    ? `radial-gradient(circle at 35% 30%, ${$p.ledColor}, color-mix(in srgb, ${$p.ledColor} 50%, #000))`
    : glossPlastic($p.buttonColor))};
  color: ${({ $active }) => ($active ? '#210a00' : 'inherit')};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: ${bevelRaised(0.9)};

  &:active { box-shadow: ${bevelSunken(0.9)}; transform: translateY(1px); }
`;

const SEGMENTS = 12;
const VOL_STEP = 0.08;

export default function PagerBeatSkin({
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
  const dotsRef = useRef(null);
  const playing = isActive && isPlaying;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const litDots = Math.round(progress * SEGMENTS);

  const title = track?.title || (mode === 'favorites' ? 'SIN FAVORITAS' : mode === 'radio' ? 'RADIO SIN SEÑAL' : 'SIN MENSAJES');
  const needsMarquee = title.length > MARQUEE_THRESHOLD;
  const marqueeText = useMemo(() => (needsMarquee ? `${title}     ${title}` : title), [needsMarquee, title]);

  const seekFromDots = (clientX) => {
    const el = dotsRef.current;
    if (!el || !duration) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <Wrap>
      <ClipTab $p={palette} />
      <Case $p={palette}>
        <HeaderRow>
          <SpeakerGrille>{Array.from({ length: 8 }, (_, i) => <SpeakerHole key={i} />)}</SpeakerGrille>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Led $on={isActive} $blink={playing} $c={palette.ledColor} />
            {isActive ? (playing ? 'ON AIR' : 'HOLD') : 'STANDBY'}
          </span>
        </HeaderRow>

        <LcdBezel $p={palette}>
          <Lcd $p={palette}>
            <MarqueeWrap>
              <MarqueeInner $scroll={needsMarquee}>{marqueeText}</MarqueeInner>
            </MarqueeWrap>
            {track && <SubLine>{modeLabel}{track.owner_username ? ` · ${track.owner_username}` : ''}</SubLine>}
            <StatusLine>
              <span>{fmtTime(currentTime)}</span>
              <span>{fmtTime(duration)}</span>
            </StatusLine>
            <ProgressDots ref={dotsRef} role="slider" aria-label="Progreso" aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={currentTime} onClick={(e) => seekFromDots(e.clientX)}>
              {Array.from({ length: SEGMENTS }, (_, i) => <Dot key={i} $lit={i < litDots} $p={palette} />)}
            </ProgressDots>
          </Lcd>
        </LcdBezel>

        <BottomRow>
          <DPad $p={palette}>
            <DUp $p={palette} type="button" onClick={() => onVolumeChange(Math.min(1, volume + VOL_STEP))} aria-label="Subir volumen">
              <ChevronUp size={12} />
            </DUp>
            <DDown $p={palette} type="button" onClick={() => onVolumeChange(Math.max(0, volume - VOL_STEP))} aria-label="Bajar volumen">
              <ChevronDown size={12} />
            </DDown>
            <DLeft $p={palette} type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
              <ChevronLeft size={12} />
            </DLeft>
            <DRight $p={palette} type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
              <ChevronRight size={12} />
            </DRight>
            <DCenter $p={palette} type="button" onClick={onTogglePlay} disabled={!track} aria-label={playing ? 'Pausar' : 'Reproducir'}>
              {playing ? 'II' : '>'}
            </DCenter>
          </DPad>

          <span style={{ fontSize: 8, opacity: 0.65, textAlign: 'center', letterSpacing: '0.06em' }}>
            {Math.round(volume * 100)}%
          </span>

          <ListenButton
            $p={palette}
            type="button"
            onClick={onToggleEar}
            $active={isActive}
            aria-label={ariaLabel}
            aria-pressed={isActive}
            title="Profile Listen"
          >
            <Ear size={17} />
          </ListenButton>
        </BottomRow>
      </Case>
    </Wrap>
  );
}
