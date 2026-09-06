import React, { useMemo, useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Ear } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime } from '../shared';

/*
 * PAGER//BEAT — skin #5. Monochrome pixel-LCD pager. The D-pad has real
 * transport functions (left/right = prev/next, up/down = volume, center =
 * play/pause) instead of being decorative, long titles marquee-scroll like
 * a real dot-matrix pager, and the LED tells real state (off/blink/solid).
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

const Shell = styled.div`
  --pb-case: ${({ $p }) => $p.caseColor};
  --pb-lcd: ${({ $p }) => $p.lcdBack};
  --pb-pixel: ${({ $p }) => $p.pixelColor};
  --pb-led: ${({ $p }) => $p.ledColor};
  --pb-button: ${({ $p }) => $p.buttonColor};
  --pb-dpad: ${({ $p }) => $p.dpadColor};
  --pb-accent: ${({ $p }) => $p.accentColor};

  position: relative;
  padding: 14px;
  border-radius: 16px;
  background: linear-gradient(160deg, rgba(255,255,255,0.06), transparent 35%), var(--pb-case);
  border: 1px solid rgba(0,0,0,0.6);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 20px rgba(0,0,0,0.4);
  color: var(--pb-accent);
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
  opacity: 0.7;
`;

const Led = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $on }) => ($on ? 'var(--pb-led)' : 'rgba(255,255,255,0.15)')};
  box-shadow: ${({ $on }) => ($on ? '0 0 5px var(--pb-led)' : 'none')};
  animation: ${({ $blink }) => ($blink ? css`${blink} 1s steps(1) infinite` : 'none')};
`;

const Lcd = styled.div`
  position: relative;
  padding: 8px 8px 10px;
  border-radius: 4px;
  background:
    repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 3px),
    var(--pb-lcd);
  border: 2px solid #14150f;
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.35);
  color: var(--pb-pixel);
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
  ${({ $scroll }) => $scroll && css`
    animation: ${scrollText} 6s linear infinite;
  `}
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
  background: ${({ $lit }) => ($lit ? 'var(--pb-pixel)' : 'transparent')};
  border: 1px solid var(--pb-pixel);
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
`;

const DButton = styled.button`
  position: absolute;
  width: 24px;
  height: 22px;
  border: 1px solid rgba(0,0,0,0.6);
  background: linear-gradient(180deg, color-mix(in srgb, var(--pb-dpad) 150%, #555), var(--pb-dpad));
  color: var(--pb-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`;

const DUp = styled(DButton)`
  top: 0; left: 22px; border-radius: 4px 4px 0 0;
`;
const DDown = styled(DButton)`
  bottom: 0; left: 22px; border-radius: 0 0 4px 4px;
`;
const DLeft = styled(DButton)`
  left: 0; top: 23px; border-radius: 4px 0 0 4px;
`;
const DRight = styled(DButton)`
  right: 0; top: 23px; border-radius: 0 4px 4px 0;
`;
const DCenter = styled.button`
  position: absolute;
  left: 22px;
  top: 23px;
  width: 24px;
  height: 22px;
  border-radius: 3px;
  border: 1px solid rgba(0,0,0,0.6);
  background: linear-gradient(180deg, color-mix(in srgb, var(--pb-led) 60%, #222), color-mix(in srgb, var(--pb-led) 25%, #111));
  color: #fff;
  font-size: 8px;
  font-weight: 700;
  cursor: pointer;

  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`;

const ListenButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--pb-led) 55%, #000);
  background: ${({ $active }) => ($active
    ? 'linear-gradient(180deg, var(--pb-led), color-mix(in srgb, var(--pb-led) 50%, #000))'
    : 'linear-gradient(180deg, color-mix(in srgb, var(--pb-button) 140%, #666), var(--pb-button))')};
  color: ${({ $active }) => ($active ? '#210a00' : 'var(--pb-accent)')};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;

  &:active { transform: translateY(1px); }
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
    <Shell $p={palette}>
      <HeaderRow>
        <span>PAGER//BEAT</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Led $on={isActive} $blink={playing} />
          {isActive ? (playing ? 'ON AIR' : 'HOLD') : 'STANDBY'}
        </span>
      </HeaderRow>

      <Lcd>
        <MarqueeWrap>
          <MarqueeInner $scroll={needsMarquee}>{marqueeText}</MarqueeInner>
        </MarqueeWrap>
        {track && <SubLine>{modeLabel}{track.owner_username ? ` · ${track.owner_username}` : ''}</SubLine>}
        <StatusLine>
          <span>{fmtTime(currentTime)}</span>
          <span>{fmtTime(duration)}</span>
        </StatusLine>
        <ProgressDots ref={dotsRef} role="slider" aria-label="Progreso" aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={currentTime} onClick={(e) => seekFromDots(e.clientX)}>
          {Array.from({ length: SEGMENTS }, (_, i) => <Dot key={i} $lit={i < litDots} />)}
        </ProgressDots>
      </Lcd>

      <BottomRow>
        <DPad>
          <DUp type="button" onClick={() => onVolumeChange(Math.min(1, volume + VOL_STEP))} aria-label="Subir volumen">
            <ChevronUp size={12} />
          </DUp>
          <DDown type="button" onClick={() => onVolumeChange(Math.max(0, volume - VOL_STEP))} aria-label="Bajar volumen">
            <ChevronDown size={12} />
          </DDown>
          <DLeft type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
            <ChevronLeft size={12} />
          </DLeft>
          <DRight type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
            <ChevronRight size={12} />
          </DRight>
          <DCenter type="button" onClick={onTogglePlay} disabled={!track} aria-label={playing ? 'Pausar' : 'Reproducir'}>
            {playing ? 'II' : '>'}
          </DCenter>
        </DPad>

        <span style={{ fontSize: 8, opacity: 0.55, textAlign: 'center', letterSpacing: '0.06em' }}>
          {Math.round(volume * 100)}%
        </span>

        <ListenButton
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
    </Shell>
  );
}
