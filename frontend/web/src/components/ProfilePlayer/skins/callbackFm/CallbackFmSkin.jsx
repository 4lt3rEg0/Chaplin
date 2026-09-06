import React, { useEffect, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Phone, PhoneOff, Star } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, ratioFromClientX, safeSetPointerCapture } from '../shared';
import { glossPlastic, matteRubber, bevelRaised, bevelSunken, screwCss } from '../materials';

/*
 * CALLBACK//FM — skin #7. An answering machine with its handset resting in
 * a molded cradle on top — the handset silhouette alone must read as "this
 * is a phone" even in solid black. Every reinterpretation stays functional:
 * PICK UP/HANG UP is the real profile-listen handoff, HOLD is the real
 * pause state, MEM is the real Track.is_favorited flag, keys 1-9 are real
 * speed-dial jumps into the queue.
 */

const ringPulse = keyframes`
  0%, 100% { box-shadow: 0 0 5px 1px var(--cf-line); }
  50% { box-shadow: 0 0 13px 4px var(--cf-line); }
`;

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

const Wrap = styled.div`
  --cf-case: ${({ $p }) => $p.caseColor};
  --cf-display-back: ${({ $p }) => $p.displayBack};
  --cf-display-text: ${({ $p }) => $p.displayText};
  --cf-line: ${({ $p }) => $p.lineColor};
  --cf-keypad: ${({ $p }) => $p.keypadColor};
  --cf-mem: ${({ $p }) => $p.memColor};
  --cf-button: ${({ $p }) => $p.buttonColor};

  position: relative;
  padding-top: 34px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: var(--cf-display-text);

  @media (max-width: 480px) {
    padding-top: 28px;
  }
`;

// The handset: two bulbous ends + a bridge, tilted, resting in a cradle
// dent molded into the base's top edge — the "this is unmistakably a
// phone" silhouette cue.
const Cradle = styled.div`
  position: absolute;
  top: 20px;
  left: 20%;
  right: 20%;
  height: 22px;
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  background: color-mix(in srgb, var(--cf-case) 70%, #000);
  box-shadow: inset 0 3px 6px rgba(0,0,0,0.5);
  z-index: 0;
`;

const Handset = styled.div`
  position: absolute;
  top: -6px;
  left: 50%;
  width: 74%;
  height: 34px;
  transform: translateX(-50%) rotate(-4deg);
  z-index: 2;
  filter: drop-shadow(0 6px 6px rgba(0,0,0,0.4));

  &::before, &::after {
    content: '';
    position: absolute;
    top: 0;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: ${({ $p }) => glossPlastic($p.caseColor)};
    box-shadow: ${bevelRaised(0.8)};
  }
  &::before { left: 0; }
  &::after { right: 0; }
`;

const HandsetBar = styled.div`
  position: absolute;
  top: 10px;
  left: 24px;
  right: 24px;
  height: 14px;
  border-radius: 8px;
  background: ${({ $p }) => glossPlastic($p.caseColor)};
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.25);
`;

const Base = styled.div`
  position: relative;
  z-index: 1;
  border-radius: 12px;
  padding: 30px 14px 14px;
  background: ${({ $p }) => glossPlastic($p.caseColor)};
  box-shadow: ${bevelRaised(1)}, 0 12px 22px rgba(0,0,0,0.45);
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 480px) {
    padding: 26px 10px 10px;
    gap: 8px;
  }
`;

const Screw = styled.span`
  position: absolute;
  width: 6px;
  height: 6px;
  z-index: 2;
  ${screwCss}
  ${({ $pos }) => $pos}
`;

const DisplayBezel = styled.div`
  padding: 4px;
  border-radius: 6px;
  background: ${({ $p }) => matteRubber($p.keypadColor)};
  box-shadow: ${bevelSunken(0.8)};
`;

const Display = styled.div`
  padding: 8px 10px;
  border-radius: 3px;
  background: var(--cf-display-back);
  font-family: 'Consolas', monospace;
`;

const CallerRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 9px;
  letter-spacing: 0.06em;
  opacity: 0.8;
`;

const CallerName = styled.div`
  font-size: 13px;
  font-weight: 700;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TrackLine = styled.div`
  font-size: 10px;
  opacity: 0.85;
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TimerRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 9px;
  margin-top: 5px;
`;

const SeekBar = styled.div`
  flex: 1;
  height: 5px;
  margin: 0 6px;
  border-radius: 3px;
  background: rgba(255,255,255,0.1);
  cursor: pointer;
  overflow: hidden;
`;

const SeekFill = styled.div`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: var(--cf-display-text);
`;

const MessageCounter = styled.div`
  position: absolute;
  top: 8px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'Consolas', monospace;
  font-size: 9px;
  opacity: 0.75;
  z-index: 2;
`;

const CounterDot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${({ $lit, $c }) => ($lit ? $c : 'rgba(255,255,255,0.15)')};
  box-shadow: ${({ $lit, $c }) => ($lit ? `0 0 4px ${$c}` : 'none')};
`;

const MidRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
`;

const LineButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 56px;
  height: 40px;
  border-radius: 8px;
  border: none;
  background: ${({ $active, $p }) => ($active
    ? `linear-gradient(180deg, color-mix(in srgb, var(--cf-line) 55%, #063), color-mix(in srgb, var(--cf-line) 25%, #011))`
    : glossPlastic($p.buttonColor))};
  color: ${({ $active }) => ($active ? '#04180a' : 'var(--cf-line)')};
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  box-shadow: ${bevelRaised(0.85)};
  animation: ${({ $active }) => ($active ? css`${ringPulse} 2s ease-in-out infinite` : 'none')};

  &:active { box-shadow: ${bevelSunken(0.85)}; transform: translateY(1px); }
`;

const MemButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 48px;
  height: 40px;
  border-radius: 8px;
  border: none;
  background: ${({ $on, $p }) => ($on
    ? `linear-gradient(180deg, color-mix(in srgb, var(--cf-mem) 55%, #400), color-mix(in srgb, var(--cf-mem) 25%, #100))`
    : glossPlastic($p.buttonColor))};
  color: ${({ $on }) => ($on ? '#fff0ec' : 'var(--cf-mem)')};
  font-size: 8px;
  font-weight: 700;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ disabled }) => (disabled ? 0.4 : 1)};
  box-shadow: ${bevelRaised(0.85)};

  &:active { box-shadow: ${({ disabled }) => (disabled ? bevelRaised(0.85) : bevelSunken(0.85))}; }
`;

const StatusText = styled.div`
  font-size: 9px;
  text-align: center;
  opacity: 0.8;
  min-height: 11px;
`;

const KeypadBezel = styled.div`
  padding: 6px;
  border-radius: 8px;
  background: ${({ $p }) => matteRubber($p.keypadColor)};
  box-shadow: ${bevelSunken(0.6)};
`;

const Keypad = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
`;

const Key = styled.button`
  padding: 7px 0;
  border-radius: 5px;
  border: none;
  background: ${({ $p }) => glossPlastic($p.buttonColor)};
  color: var(--cf-display-text);
  font-family: 'Consolas', monospace;
  font-size: 11px;
  cursor: pointer;
  position: relative;
  box-shadow: ${bevelRaised(0.7)};

  &:active { box-shadow: ${bevelSunken(0.7)}; transform: translateY(1px); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`;

const RingerWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 8px;
  letter-spacing: 0.05em;
  opacity: 0.75;
`;

const RingerTrack = styled.div`
  position: relative;
  width: 60px;
  height: 10px;
  border-radius: 5px;
  background: rgba(255,255,255,0.08);
  cursor: ew-resize;
  touch-action: none;
  overflow: hidden;
`;

const RingerFill = styled.div`
  position: absolute;
  inset: 0;
  width: ${({ $pct }) => $pct}%;
  background: var(--cf-display-text);
  opacity: 0.6;
`;

export default function CallbackFmSkin({
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
  isFavorited = false,
  canFavorite = false,
  onToggleFavorite = () => {},
  queue = [],
  onSelectTrack = () => {},
  palette = defaultPalette
}) {
  const seekRef = useRef(null);
  const ringerRef = useRef(null);
  const draggingRinger = useRef(false);
  const [memFlash, setMemFlash] = useState(false);
  const playing = isActive && isPlaying;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  useEffect(() => {
    if (!memFlash) return undefined;
    const t = setTimeout(() => setMemFlash(false), 1800);
    return () => clearTimeout(t);
  }, [memFlash]);

  const seek = (clientX) => {
    const el = seekRef.current;
    if (!el || !duration) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  const pressKey = (key) => {
    if (key === '*') {
      if (canFavorite) { onToggleFavorite(); setMemFlash(true); }
      return;
    }
    if (key === '#') { onSeek(0); return; }
    const digit = key === '0' ? 9 : Number(key) - 1;
    if (digit >= 0 && digit < queue.length) onSelectTrack(digit);
  };

  const onRingerDown = (e) => {
    draggingRinger.current = true;
    safeSetPointerCapture(e.currentTarget, e.pointerId);
    onVolumeChange(ratioFromClientX(ringerRef, e.clientX));
  };
  const onRingerMove = (e) => {
    if (!draggingRinger.current) return;
    onVolumeChange(ratioFromClientX(ringerRef, e.clientX));
  };
  const onRingerUp = () => { draggingRinger.current = false; };

  return (
    <Wrap $p={palette}>
      <Cradle $p={palette} />
      <Handset $p={palette}>
        <HandsetBar $p={palette} />
      </Handset>

      <Base $p={palette}>
        <Screw $pos="bottom: 8px; left: 8px;" />
        <Screw $pos="bottom: 8px; right: 8px;" />
        <MessageCounter>
          {Array.from({ length: 3 }, (_, i) => <CounterDot key={i} $lit={i < (queue.length > 0 ? 1 : 0)} $c={palette.lineColor} />)}
          MSG
        </MessageCounter>

        <DisplayBezel $p={palette}>
          <Display>
            <CallerRow>
              <span>CALLER ID</span>
              <span>{isActive ? (playing ? 'LIVE' : 'ON HOLD') : 'IDLE'}</span>
            </CallerRow>
            <CallerName title={track?.owner_username}>
              {track ? (track.owner_username || 'DESCONOCIDO').toUpperCase() : mode === 'favorites' ? 'SIN FAVORITAS' : mode === 'radio' ? 'RADIO SIN SEÑAL' : 'SIN LLAMADAS'}
            </CallerName>
            {track && <TrackLine title={track.title}>{track.title} · {modeLabel}</TrackLine>}
            <TimerRow>
              <span>{fmtTime(currentTime)}</span>
              <SeekBar ref={seekRef} role="slider" aria-label="Progreso" aria-valuemin={0} aria-valuemax={duration || 0} aria-valuenow={currentTime} onClick={(e) => seek(e.clientX)}>
                <SeekFill $pct={progress * 100} />
              </SeekBar>
              <span>{fmtTime(duration)}</span>
            </TimerRow>
          </Display>
        </DisplayBezel>

        <MidRow>
          <LineButton $p={palette} type="button" onClick={onToggleEar} $active={isActive} aria-label={ariaLabel} aria-pressed={isActive} title="Profile Listen">
            {isActive ? <PhoneOff size={15} /> : <Phone size={15} />}
            {isActive ? 'HANG UP' : 'PICK UP'}
          </LineButton>

          <StatusText>
            {memFlash ? 'MEMORY SAVED' : track ? `LINE 1 · ${playing ? 'TALKING' : isActive ? 'HOLD' : 'READY'}` : 'NO CALLER'}
          </StatusText>

          <MemButton
            $p={palette}
            type="button"
            onClick={() => { if (canFavorite) { onToggleFavorite(); setMemFlash(true); } }}
            $on={isFavorited}
            disabled={!canFavorite || !track}
            aria-pressed={isFavorited}
            aria-label="Guardar en memoria (favorito)"
            title={canFavorite ? 'MEM' : 'Solo el dueño puede guardar en memoria'}
          >
            <Star size={13} fill={isFavorited ? 'currentColor' : 'none'} />
            MEM
          </MemButton>
        </MidRow>

        <KeypadBezel $p={palette}>
          <Keypad>
            {KEYS.map((key) => {
              const digit = key === '0' ? 9 : /\d/.test(key) ? Number(key) - 1 : -1;
              const isSpeedDial = digit >= 0;
              const disabled = isSpeedDial && digit >= queue.length;
              return (
                <Key $p={palette} key={key} type="button" onClick={() => pressKey(key)} disabled={disabled} aria-label={key === '*' ? 'MEM' : key === '#' ? 'Reiniciar' : `Línea ${key}`}>
                  {key}
                </Key>
              );
            })}
          </Keypad>
        </KeypadBezel>

        <RingerWrap>
          <span>RINGER</span>
          <RingerTrack
            ref={ringerRef}
            role="slider"
            aria-label="Volumen (ringer)"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(volume * 100)}
            onPointerDown={onRingerDown}
            onPointerMove={onRingerMove}
            onPointerUp={onRingerUp}
            onPointerLeave={onRingerUp}
          >
            <RingerFill $pct={volume * 100} />
          </RingerTrack>
          <span>{Math.round(volume * 100)}%</span>
        </RingerWrap>

        <MidRow style={{ gridTemplateColumns: '1fr auto 1fr', justifyItems: 'center' }}>
          <button type="button" onClick={onPrev} disabled={!hasQueue} style={{ fontSize: 9, background: 'none', border: 'none', color: 'var(--cf-display-text)', cursor: hasQueue ? 'pointer' : 'not-allowed', opacity: hasQueue ? 0.85 : 0.35 }}>
            ◄ ANTERIOR
          </button>
          <button type="button" onClick={onTogglePlay} disabled={!track} style={{ fontSize: 9, fontWeight: 700, background: 'none', border: 'none', color: 'var(--cf-line)', cursor: track ? 'pointer' : 'not-allowed', opacity: track ? 1 : 0.35 }}>
            {playing ? 'HOLD' : 'TALK'}
          </button>
          <button type="button" onClick={onNext} disabled={!hasQueue} style={{ fontSize: 9, background: 'none', border: 'none', color: 'var(--cf-display-text)', cursor: hasQueue ? 'pointer' : 'not-allowed', opacity: hasQueue ? 0.85 : 0.35 }}>
            SIGUIENTE ►
          </button>
        </MidRow>
      </Base>
    </Wrap>
  );
}
