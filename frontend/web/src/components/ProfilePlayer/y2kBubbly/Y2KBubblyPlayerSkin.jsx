import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { fmtTime } from '../shared/audioControls';

/*
 * Y2K Bubbly player family — three variants built to match a specific
 * reference mockup (gel blob body, marbled swirl screen, bubble-letter
 * title, labeled pill buttons). No PNG reference is traced here — the
 * swirl texture is a real SVG feTurbulence filter (procedural, tintable,
 * animatable), never a raster photo; the "bubble" decorations are CSS
 * radial-gradient circles, not sprite images.
 */

let filterSeed = 0;

const BUBBLES = [
  { x: 78, y: 14, s: 16 }, { x: 88, y: 30, s: 9 }, { x: 8, y: 68, s: 12 },
  { x: 92, y: 66, s: 8 }, { x: 46, y: 88, s: 10 }, { x: 20, y: 20, s: 7 },
];

function SwirlFilter({ id, tint }) {
  const seed = React.useMemo(() => ++filterSeed, []);
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="turbulence" baseFrequency="0.01 0.025" numOctaves="2" seed={seed} result="noise" />
      <feColorMatrix in="noise" type="matrix" values={tint} result="tinted" />
      <feComponentTransfer in="tinted">
        <feFuncA type="linear" slope="0.9" intercept="0" />
      </feComponentTransfer>
    </filter>
  );
}

const Bubbles = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;
const Bubble = styled.span`
  position: absolute;
  left: ${({ $x }) => $x}%;
  top: ${({ $y }) => $y}%;
  width: ${({ $s }) => $s}px;
  height: ${({ $s }) => $s}px;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.15) 55%, rgba(255, 255, 255, 0.05) 75%);
  border: 1px solid rgba(255, 255, 255, 0.5);
`;

function BubbleField() {
  return (
    <Bubbles aria-hidden="true">
      {BUBBLES.map((b, i) => <Bubble key={i} $x={b.x} $y={b.y} $s={b.s} />)}
    </Bubbles>
  );
}

const shimmer = keyframes`
  0%, 60% { transform: translateX(-130%) rotate(8deg); }
  100% { transform: translateX(130%) rotate(8deg); }
`;

const Wrap = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 320px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  user-select: none;
`;

const OuterStroke = styled.div`
  width: 100%;
  border-radius: 42px;
  padding: 6px;

  ${({ $variant }) => $variant === 'cyber-acid-jelly' && css`
    box-shadow: 0 0 26px 3px color-mix(in srgb, var(--glow) 65%, transparent);
    background: color-mix(in srgb, var(--glow) 12%, transparent);
  `}
  ${({ $variant }) => $variant === 'trans-tech-jelly' && css`
    backdrop-filter: blur(8px);
    background: rgba(255, 255, 255, 0.03);
    box-shadow: 0 0 22px 2px color-mix(in srgb, var(--glow) 45%, transparent);
  `}
`;

const GelBody = styled.div`
  position: relative;
  border-radius: 40% 40% 34% 34% / 52% 52% 26% 26%;
  padding: 18px 18px 14px;
  overflow: hidden;
  background-image:
    radial-gradient(circle at 50% -25%, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 46%),
    linear-gradient(135deg, var(--colorTop), var(--colorBottom));
  box-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.28), inset 0 -4px 10px rgba(255, 255, 255, 0.45);

  ${({ $variant }) => $variant === 'trans-tech-jelly' && css`
    border-radius: 30px;
    background-image:
      radial-gradient(circle at 50% -25%, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 46%),
      linear-gradient(160deg, var(--colorTop), var(--colorBottom));
    border: 1px solid color-mix(in srgb, var(--glow) 55%, transparent);
  `}

  &::after {
    content: '';
    position: absolute;
    top: -40%;
    left: -20%;
    width: 55%;
    height: 220%;
    background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, 0.35) 48%, transparent 66%);
    pointer-events: none;
  }
  @media (prefers-reduced-motion: no-preference) {
    &::after { animation: ${shimmer} 8s ease-in-out infinite; }
  }
`;

const MiniTransport = styled.div`
  position: absolute;
  top: 18px;
  left: 16px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MiniBtn = styled.button`
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--miniBtnBg);
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.35), inset 0 1.5px 2px rgba(255, 255, 255, 0.55), inset 0 -1.5px 2px rgba(0, 0, 0, 0.25);
  svg { width: 50%; height: 50%; fill: var(--btnText); }
  &:hover:not(:disabled) { filter: brightness(1.12); }
  &:active:not(:disabled) {
    transform: translateY(1px);
    box-shadow: inset 0 1.5px 2px rgba(0, 0, 0, 0.4), inset 0 -1.5px 2px rgba(255, 255, 255, 0.5);
  }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const ScreenDisplay = styled.div`
  position: relative;
  margin-left: 40px;
  border-radius: 22px;
  padding: 14px 16px;
  overflow: hidden;
  min-height: 92px;
  background: linear-gradient(160deg, color-mix(in srgb, var(--colorTop) 55%, #fff), color-mix(in srgb, var(--colorBottom) 65%, #fff));
  box-shadow: inset 0 3px 10px rgba(0, 0, 0, 0.25), 0 1px 0 rgba(255, 255, 255, 0.5);
  display: flex;
  flex-direction: column;
  justify-content: center;

  ${({ $variant }) => $variant === 'trans-tech-jelly' && css`
    margin-left: 0;
    background: linear-gradient(160deg, #0c1022, #171233);
    box-shadow: inset 0 3px 10px rgba(0, 0, 0, 0.55);
  `}
`;

const SwirlSvg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: ${({ $opacity }) => $opacity ?? 0.8};
`;

const TrackTitle = styled.h2`
  position: relative;
  z-index: 1;
  margin: 0;
  font-family: ${({ $variant }) => ($variant === 'trans-tech-jelly' ? "'Orbitron', 'Segoe UI', sans-serif" : "'Baloo 2', 'Segoe UI', sans-serif")};
  font-weight: 800;
  font-size: 19px;
  letter-spacing: 0.5px;
  line-height: 1.15;
  color: var(--titleColor);
  text-shadow: var(--titleShadow);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TrackArtist = styled.p`
  position: relative;
  z-index: 1;
  margin: 4px 0 0;
  font-family: 'Consolas', monospace;
  font-size: 10.5px;
  color: var(--textColor);
  opacity: 0.85;
`;

const ButtonBar = styled.div`
  width: 92%;
  margin-top: -14px;
  border-radius: 999px;
  padding: 12px 10px 10px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background-image:
    radial-gradient(circle at 50% -40%, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0) 55%),
    linear-gradient(160deg, color-mix(in srgb, var(--colorTop) 70%, #fff), var(--colorBottom));
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.25), inset 0 -2px 5px rgba(255, 255, 255, 0.4), 0 6px 10px rgba(0, 0, 0, 0.35);
  position: relative;
  z-index: 1;

  ${({ $variant }) => $variant === 'trans-tech-jelly' && css`
    background-image: none;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid color-mix(in srgb, var(--glow) 50%, transparent);
    box-shadow: 0 0 14px color-mix(in srgb, var(--glow) 35%, transparent);
  `}
`;

const PillBtn = styled.button`
  border: none;
  border-radius: 50%;
  cursor: pointer;
  width: 46px;
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background: var(--btnBg);
  color: var(--btnText);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.02em;
  box-shadow: 0 3px 5px rgba(0, 0, 0, 0.35), inset 0 2px 2px rgba(255, 255, 255, 0.6), inset 0 -2px 2px rgba(0, 0, 0, 0.2);
  transition: transform 0.08s ease, box-shadow 0.08s ease, filter 0.08s ease;

  svg { width: 45%; height: 45%; fill: var(--btnText); }

  &:hover:not(:disabled) { filter: brightness(1.1); }
  &:focus-visible { outline: 2px solid var(--textColor); outline-offset: 2px; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:active:not(:disabled), &[aria-pressed='true'] {
    transform: translateY(2px);
    box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.4), inset 0 -2px 2px rgba(255, 255, 255, 0.5);
  }

  ${({ $variant, $glow }) => $variant === 'cyber-acid-jelly' && css`
    box-shadow: 0 0 8px color-mix(in srgb, var(--glow) ${$glow ? 90 : 50}%, transparent), 0 3px 5px rgba(0, 0, 0, 0.4);
  `}
  ${({ $variant, $glow }) => $variant === 'trans-tech-jelly' && css`
    border: 1px solid color-mix(in srgb, var(--glow) 70%, transparent);
    background: ${$glow ? 'color-mix(in srgb, var(--glow) 30%, rgba(255,255,255,0.08))' : 'rgba(255,255,255,0.06)'};
    box-shadow: 0 0 ${$glow ? 14 : 6}px color-mix(in srgb, var(--glow) 60%, transparent);
  `}
`;

const VARIANTS = {
  'bubblegum-gloss': {
    colorTop: '#ffc4dc', colorBottom: '#3fbcff', textColor: '#7a1050',
    titleColor: '#ffffff', titleShadow: '0 2px 0 #e0509c, 0 3px 6px rgba(0,0,0,0.25)',
    btnBg: 'linear-gradient(155deg, #ff8fd0, #c71585)', btnText: '#ffffff',
    miniBtnBg: 'linear-gradient(155deg, #ff8fd0, #d1338e)',
    tint: '0 0 0 0 1  0 0 0 0 0.45  0 0 0 0 0.75  0.5 0.5 0.5 0 0',
  },
  'cyber-acid-jelly': {
    colorTop: '#c6ff5e', colorBottom: '#fff34d', textColor: '#204d00',
    titleColor: '#f4ffd8', titleShadow: '0 0 6px #9dff33, 0 2px 4px rgba(0,0,0,0.35)',
    btnBg: 'linear-gradient(160deg, #333333, #0c0c0c)', btnText: '#9dff33',
    miniBtnBg: 'linear-gradient(160deg, #2f7a12, #163d06)',
    glow: '#7cfc00',
    tint: '0 0 0 0 0.3  0 0 0 0 0.85  0 0 0 0 0.05  0.55 0.55 0.55 0 0',
  },
  'trans-tech-jelly': {
    colorTop: 'rgba(120,110,220,0.28)', colorBottom: 'rgba(40,180,220,0.16)', textColor: '#bdeeff',
    titleColor: '#eafcff', titleShadow: '0 0 10px #5df9ff, 0 0 2px #fff',
    btnBg: 'rgba(255,255,255,0.06)', btnText: '#bfe9ff',
    glow: '#7fd8ff',
    tint: '0 0 0 0 0.35  0 0 0 0 0.6  0 0 0 0 0.95  0.4 0.4 0.4 0 0',
  },
};

const ICONS = {
  prev: 'M6 6h1.8v12H6zM18 6.6 9 12l9 5.4z',
  pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
  play: 'M6 4.5 19 12 6 19.5z',
  next: 'M16.2 6h1.8v12h-1.8zM6 6.6 15 12l-9 5.4z',
  volume: 'M4 9h4l5-4v14l-5-4H4zM16 8.5a4 4 0 0 1 0 7',
};

function Icon({ name, stroke }) {
  if (name === 'volume') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9h4l5-4v14l-5-4H4z" />
        <path d="M16 8.5a4 4 0 0 1 0 7" fill="none" stroke={stroke || 'currentColor'} strokeWidth="1.6" />
      </svg>
    );
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS[name]} /></svg>;
}

export default function Y2KBubblyPlayerSkin({
  variant,
  track,
  mode,
  modeLabel,
  isActive,
  isPlaying,
  hasQueue,
  onTogglePlay,
  onPrev,
  onNext,
  currentTime = 0,
  duration = 0,
  onSeek = () => {},
  volume = 0.8,
  onVolumeChange = () => {},
  palette,
}) {
  const v = { ...VARIANTS[variant] || VARIANTS['bubblegum-gloss'], ...(palette || {}) };
  const playing = isActive && isPlaying;
  const filterId = React.useId().replace(/:/g, '');
  const [volumeOpen, setVolumeOpen] = React.useState(false);

  const cssVars = {
    '--colorTop': v.colorTop, '--colorBottom': v.colorBottom, '--textColor': v.textColor,
    '--titleColor': v.titleColor, '--titleShadow': v.titleShadow,
    '--btnBg': v.btnBg, '--btnText': v.btnText, '--miniBtnBg': v.miniBtnBg || v.btnBg,
    '--glow': v.glow || v.textColor,
  };

  const title = track ? track.title : (mode === 'favorites' ? 'Sin favoritas' : mode === 'radio' ? 'Radio sin señal' : 'Sin reproducción');
  const artist = track?.owner_username ? `@${track.owner_username}` : modeLabel;
  const isTechy = variant === 'trans-tech-jelly';

  return (
    <Wrap style={cssVars} data-skin-root={variant}>
      <OuterStroke $variant={variant}>
        <GelBody $variant={variant}>
          {!isTechy && (
            <MiniTransport>
              <MiniBtn type="button" aria-label="Anterior" onClick={onPrev} disabled={!hasQueue}><Icon name="prev" /></MiniBtn>
              <MiniBtn
                type="button" aria-label={playing ? 'Pausar' : 'Reproducir'}
                onClick={onTogglePlay} disabled={!track}
              ><Icon name={playing ? 'pause' : 'play'} /></MiniBtn>
              <MiniBtn type="button" aria-label="Siguiente" onClick={onNext} disabled={!hasQueue}><Icon name="next" /></MiniBtn>
            </MiniTransport>
          )}

          <ScreenDisplay $variant={variant}>
            <SwirlSvg $opacity={isTechy ? 0.35 : 0.85} aria-hidden="true">
              <defs><SwirlFilter id={`swirl-${filterId}`} tint={v.tint} /></defs>
              <rect width="100%" height="100%" filter={`url(#swirl-${filterId})`} />
            </SwirlSvg>
            <BubbleField />
            <TrackTitle $variant={variant}>{title}</TrackTitle>
            <TrackArtist>{artist} — {fmtTime(currentTime)} / {fmtTime(duration)}</TrackArtist>
          </ScreenDisplay>
        </GelBody>

        <ButtonBar $variant={variant}>
          <PillBtn $variant={variant} type="button" aria-label="Anterior" onClick={onPrev} disabled={!hasQueue}>
            {isTechy ? <Icon name="prev" /> : 'PREV'}
          </PillBtn>
          <PillBtn
            $variant={variant} type="button" aria-label="Reproducir" aria-pressed={!playing}
            onClick={() => { if (!playing) onTogglePlay(); }} disabled={!track}
          >
            {isTechy ? <Icon name="play" /> : 'PLAY'}
          </PillBtn>
          <PillBtn
            $variant={variant} $glow={playing} type="button" aria-label="Pausar" aria-pressed={playing}
            onClick={() => { if (playing) onTogglePlay(); }} disabled={!track}
          >
            {isTechy ? <Icon name="pause" /> : 'PAUSE'}
          </PillBtn>
          <PillBtn $variant={variant} type="button" aria-label="Siguiente" onClick={onNext} disabled={!hasQueue}>
            {isTechy ? <Icon name="next" /> : 'NEXT'}
          </PillBtn>
          <div style={{ position: 'relative' }}>
            <PillBtn
              $variant={variant} type="button" aria-label="Volumen" aria-haspopup="true" aria-expanded={volumeOpen}
              onClick={() => setVolumeOpen((o) => !o)}
            >
              {isTechy ? <Icon name="volume" stroke={v.btnText} /> : 'VOL'}
            </PillBtn>
            {volumeOpen && (
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(10,8,24,0.92)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 10px', zIndex: 4,
              }}>
                <input type="range" min="0" max="1" step="0.01" value={volume} style={{ width: 70 }}
                  onChange={(e) => onVolumeChange(Number(e.target.value))} aria-label="Nivel de volumen" />
              </div>
            )}
          </div>
        </ButtonBar>
      </OuterStroke>
    </Wrap>
  );
}
