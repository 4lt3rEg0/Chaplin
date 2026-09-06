import React, { useMemo, useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Ear } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime } from '../shared';

/*
 * PAGER//BEAT — skin #5. A pocket pager: a real SVG belt-clip loop and stub
 * antenna protrude above a rounded case, physical VOL+/VOL- keys protrude
 * from the right edge — a silhouette that reads as "pager clipped to a
 * belt", nothing like the disc, tank, gauges or deck. The D-pad has real
 * transport functions; long titles marquee-scroll like a real dot-matrix
 * pager; the LED tells real state (off/blink/solid).
 */

const VIEW_W = 320;
const VIEW_H = 380;

const scrollText = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;
const blink = keyframes`
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0.15; }
`;

const MARQUEE_THRESHOLD = 16;

const Wrap = styled.div`
  --pb-case: ${({ $p }) => $p.caseColor};
  --pb-lcd: ${({ $p }) => $p.lcdBack};
  --pb-pixel: ${({ $p }) => $p.pixelColor};
  --pb-led: ${({ $p }) => $p.ledColor};
  --pb-button: ${({ $p }) => $p.buttonColor};
  --pb-dpad: ${({ $p }) => $p.dpadColor};
  --pb-accent: ${({ $p }) => $p.accentColor};

  position: relative;
  width: 100%;
  max-width: 320px;
  aspect-ratio: ${VIEW_W} / ${VIEW_H};
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: var(--pb-accent);
  filter: drop-shadow(0 12px 16px rgba(0, 0, 0, 0.45));
`;

const CaseSvg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
`;

const ClipOuter = styled.rect`
  fill: url(#pb-clip-grad);
  stroke: rgba(0, 0, 0, 0.5);
`;
const ClipHole = styled.rect`
  fill: #050505;
`;
const Antenna = styled.rect`
  fill: url(#pb-clip-grad);
`;
const CaseFill = styled.rect`
  fill: url(#pb-case-grad);
  stroke: rgba(0, 0, 0, 0.6);
`;
const SideKey = styled.rect`
  fill: url(#pb-clip-grad);
  stroke: rgba(0, 0, 0, 0.5);
`;
const LcdBezel = styled.rect`
  fill: #14150f;
`;
const LcdBack = styled.rect`
  fill: var(--pb-lcd);
`;
const SpeakerHole = styled.circle`
  fill: rgba(0, 0, 0, 0.6);
`;

const pct = (v, total) => `${(v / total) * 100}%`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

const LedDot = styled.div`
  position: absolute;
  left: ${pct(38, VIEW_W)};
  top: ${pct(46, VIEW_H)};
  width: ${pct(10, VIEW_W)};
  height: ${pct(10, VIEW_H)};
  border-radius: 50%;
  background: ${({ $on }) => ($on ? 'var(--pb-led)' : 'rgba(255,255,255,0.15)')};
  box-shadow: ${({ $on }) => ($on ? '0 0 6px var(--pb-led)' : 'none')};
  animation: ${({ $blinking }) => ($blinking ? css`${blink} 1s steps(1) infinite` : 'none')};
`;

const LcdText = styled.div`
  position: absolute;
  left: ${pct(58, VIEW_W)};
  top: ${pct(98, VIEW_H)};
  width: ${pct(204, VIEW_W)};
  height: ${pct(94, VIEW_H)};
  padding: 6px 8px;
  overflow: hidden;
  font-family: 'Consolas', 'Courier New', monospace;
  color: var(--pb-pixel);
`;

const MarqueeWrap = styled.div`
  overflow: hidden;
  white-space: nowrap;
`;
const MarqueeInner = styled.div`
  display: inline-block;
  font-size: clamp(11px, 3vw, 14px);
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  ${({ $scroll }) => $scroll && css`animation: ${scrollText} 6s linear infinite;`}
`;
const SubLine = styled.div`
  font-size: clamp(8px, 2vw, 10px);
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
  font-size: clamp(7px, 1.6vw, 9px);
  margin-top: 6px;
  opacity: 0.9;
`;
const ProgressDots = styled.div`
  display: flex;
  gap: 2px;
  margin-top: 5px;
  pointer-events: auto;
  cursor: pointer;
`;
const Dot = styled.span`
  flex: 1;
  height: 4px;
  background: ${({ $lit }) => ($lit ? 'var(--pb-pixel)' : 'transparent')};
  border: 1px solid var(--pb-pixel);
  opacity: ${({ $lit }) => ($lit ? 0.9 : 0.35)};
`;

const DPad = styled.div`
  position: absolute;
  left: ${pct(88, VIEW_W)};
  top: ${pct(212, VIEW_H)};
  width: ${pct(96, VIEW_W)};
  height: ${pct(96, VIEW_H)};
  pointer-events: auto;
`;
const DButton = styled.button`
  position: absolute;
  border: none;
  background: linear-gradient(180deg, color-mix(in srgb, var(--pb-dpad) 65%, #555), var(--pb-dpad));
  color: var(--pb-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);

  svg { width: 55%; height: 55%; }
  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`;
const DUp = styled(DButton)`top: 0; left: 35%; width: 30%; height: 32%; border-radius: 6px 6px 0 0;`;
const DDown = styled(DButton)`bottom: 0; left: 35%; width: 30%; height: 32%; border-radius: 0 0 6px 6px;`;
const DLeft = styled(DButton)`left: 0; top: 34%; width: 32%; height: 30%; border-radius: 6px 0 0 6px;`;
const DRight = styled(DButton)`right: 0; top: 34%; width: 32%; height: 30%; border-radius: 0 6px 6px 0;`;
const DCenter = styled.button`
  position: absolute;
  left: 34%;
  top: 34%;
  width: 32%;
  height: 30%;
  border-radius: 4px;
  border: none;
  background: linear-gradient(180deg, color-mix(in srgb, var(--pb-led) 60%, #222), color-mix(in srgb, var(--pb-led) 25%, #111));
  color: #fff;
  font-size: clamp(8px, 1.8vw, 10px);
  font-weight: 700;
  cursor: pointer;
  pointer-events: auto;

  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`;

const VolReadout = styled.div`
  position: absolute;
  left: ${pct(0, VIEW_W)};
  top: ${pct(280, VIEW_H)};
  width: ${pct(80, VIEW_W)};
  text-align: center;
  font-size: clamp(7px, 1.6vw, 9px);
  opacity: 0.6;
  letter-spacing: 0.06em;
`;

const ListenWrap = styled.div`
  position: absolute;
  left: ${pct(48, VIEW_W)};
  top: ${pct(324, VIEW_H)};
  width: ${pct(224, VIEW_W)};
  display: flex;
  justify-content: center;
  pointer-events: auto;
`;

const ListenButton = styled.button`
  width: 46%;
  aspect-ratio: 3;
  border-radius: 8px;
  border: none;
  background: ${({ $active }) => ($active
    ? 'radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--pb-led) 90%, #fff), color-mix(in srgb, var(--pb-led) 50%, #000))'
    : 'linear-gradient(180deg, color-mix(in srgb, var(--pb-button) 65%, #666), var(--pb-button))')};
  color: ${({ $active }) => ($active ? '#210a00' : 'var(--pb-accent)')};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: clamp(8px, 1.8vw, 10px);
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.4);

  svg { width: 30%; height: 60%; }
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
    <Wrap $p={palette}>
      <CaseSvg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="pb-case-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--pb-case) 92%, #fff 8%)' }} />
            <stop offset="100%" style={{ stopColor: 'color-mix(in srgb, var(--pb-case) 60%, #000)' }} />
          </linearGradient>
          <linearGradient id="pb-clip-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8a8d86" />
            <stop offset="100%" stopColor="#2a2c26" />
          </linearGradient>
        </defs>

        <ClipOuter x={130} y={0} width={60} height={48} rx={10} />
        <ClipHole x={144} y={10} width={32} height={26} rx={6} />
        <Antenna x={272} y={8} width={7} height={34} rx={2} />

        <CaseFill x={20} y={40} width={280} height={324} rx={26} />
        <SideKey x={296} y={150} width={13} height={30} rx={3} />
        <SideKey x={296} y={188} width={13} height={30} rx={3} />

        <LcdBezel x={50} y={90} width={220} height={116} rx={6} />
        <LcdBack x={58} y={98} width={204} height={100} rx={3} />

        {Array.from({ length: 8 }, (_, i) => (
          <SpeakerHole key={i} cx={50 + (i % 4) * 8} cy={356 + Math.floor(i / 4) * 8} r={1.6} />
        ))}
      </CaseSvg>

      <Overlay>
        <LedDot $on={isActive} $blinking={playing} />

        <LcdText>
          <MarqueeWrap>
            <MarqueeInner $scroll={needsMarquee}>{marqueeText}</MarqueeInner>
          </MarqueeWrap>
          {track && <SubLine>{modeLabel}{track.owner_username ? ` · ${track.owner_username}` : ''}</SubLine>}
          <StatusLine>
            <span>{fmtTime(currentTime)}</span>
            <span>{isActive ? (playing ? 'ON AIR' : 'HOLD') : 'STANDBY'}</span>
            <span>{fmtTime(duration)}</span>
          </StatusLine>
          <ProgressDots ref={dotsRef} role="slider" aria-label="Progreso" aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={currentTime} onClick={(e) => seekFromDots(e.clientX)}>
            {Array.from({ length: SEGMENTS }, (_, i) => <Dot key={i} $lit={i < litDots} />)}
          </ProgressDots>
        </LcdText>

        <DPad>
          <DUp type="button" onClick={() => onVolumeChange(Math.min(1, volume + VOL_STEP))} aria-label="Subir volumen">
            <ChevronUp />
          </DUp>
          <DDown type="button" onClick={() => onVolumeChange(Math.max(0, volume - VOL_STEP))} aria-label="Bajar volumen">
            <ChevronDown />
          </DDown>
          <DLeft type="button" onClick={onPrev} disabled={!hasQueue} aria-label="Anterior">
            <ChevronLeft />
          </DLeft>
          <DRight type="button" onClick={onNext} disabled={!hasQueue} aria-label="Siguiente">
            <ChevronRight />
          </DRight>
          <DCenter type="button" onClick={onTogglePlay} disabled={!track} aria-label={playing ? 'Pausar' : 'Reproducir'}>
            {playing ? 'II' : '>'}
          </DCenter>
        </DPad>

        <VolReadout>{Math.round(volume * 100)}%</VolReadout>

        <ListenWrap>
          <ListenButton type="button" onClick={onToggleEar} $active={isActive} aria-label={ariaLabel} aria-pressed={isActive} title="Profile Listen">
            <Ear /> {isActive ? 'ON AIR' : 'LISTEN'}
          </ListenButton>
        </ListenWrap>
      </Overlay>
    </Wrap>
  );
}
