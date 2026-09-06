import React, { useEffect, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Phone, PhoneOff, Star } from 'lucide-react';
import { defaultPalette } from './palette';
import { fmtTime, ratioFromClientX, safeSetPointerCapture } from '../shared';

/*
 * CALLBACK//FM — skin #6. Landline answering-machine / switchboard. Every
 * reinterpretation is functional, not cosmetic: PICK UP/HANG UP is the real
 * profile-listen handoff, HOLD is the real pause state, MEM is the real
 * Track.is_favorited flag, and keys 1-9 are real speed-dial jumps into the
 * actual queue (disabled past the queue's length, never fake extensions).
 */

const ringPulse = keyframes`
  0%, 100% { box-shadow: 0 0 5px 1px var(--cf-line); }
  50% { box-shadow: 0 0 13px 4px var(--cf-line); }
`;

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

const Shell = styled.div`
  --cf-case: ${({ $p }) => $p.caseColor};
  --cf-display-back: ${({ $p }) => $p.displayBack};
  --cf-display-text: ${({ $p }) => $p.displayText};
  --cf-line: ${({ $p }) => $p.lineColor};
  --cf-keypad: ${({ $p }) => $p.keypadColor};
  --cf-mem: ${({ $p }) => $p.memColor};
  --cf-button: ${({ $p }) => $p.buttonColor};

  position: relative;
  padding: 14px;
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(255,255,255,0.08), transparent 35%), var(--cf-case);
  border: 1px solid rgba(0,0,0,0.55);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 20px rgba(0,0,0,0.4);
  color: var(--cf-display-text);
  font-family: 'Segoe UI', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 480px) {
    padding: 10px;
    gap: 8px;
  }
`;

const Display = styled.div`
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--cf-display-back);
  border: 1px solid color-mix(in srgb, var(--cf-display-text) 30%, transparent);
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
  border: 1px solid color-mix(in srgb, var(--cf-line) 55%, #000);
  background: ${({ $active }) => ($active
    ? 'linear-gradient(180deg, color-mix(in srgb, var(--cf-line) 55%, #063), color-mix(in srgb, var(--cf-line) 25%, #011))'
    : 'linear-gradient(180deg, #2a2a24, #1a1a16)')};
  color: ${({ $active }) => ($active ? '#04180a' : 'var(--cf-line)')};
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  animation: ${({ $active }) => ($active ? css`${ringPulse} 2s ease-in-out infinite` : 'none')};

  &:active { transform: translateY(1px); }
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
  border: 1px solid color-mix(in srgb, var(--cf-mem) 50%, #000);
  background: ${({ $on }) => ($on
    ? 'linear-gradient(180deg, color-mix(in srgb, var(--cf-mem) 55%, #400), color-mix(in srgb, var(--cf-mem) 25%, #100))'
    : 'linear-gradient(180deg, #2a2a24, #1a1a16)')};
  color: ${({ $on }) => ($on ? '#fff0ec' : 'var(--cf-mem)')};
  font-size: 8px;
  font-weight: 700;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ disabled }) => (disabled ? 0.4 : 1)};
`;

const StatusText = styled.div`
  font-size: 9px;
  text-align: center;
  opacity: 0.8;
  min-height: 11px;
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

const Keypad = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
`;

const Key = styled.button`
  padding: 7px 0;
  border-radius: 5px;
  border: 1px solid rgba(0,0,0,0.5);
  background: linear-gradient(180deg, color-mix(in srgb, var(--cf-keypad) 150%, #555), var(--cf-keypad));
  color: var(--cf-display-text);
  font-family: 'Consolas', monospace;
  font-size: 11px;
  cursor: pointer;
  position: relative;

  &:active { transform: translateY(1px); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
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
    <Shell $p={palette}>
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

      <MidRow>
        <LineButton
          type="button"
          onClick={onToggleEar}
          $active={isActive}
          aria-label={ariaLabel}
          aria-pressed={isActive}
          title="Profile Listen"
        >
          {isActive ? <PhoneOff size={15} /> : <Phone size={15} />}
          {isActive ? 'HANG UP' : 'PICK UP'}
        </LineButton>

        <StatusText>
          {memFlash ? 'MEMORY SAVED' : track ? `LINE 1 · ${playing ? 'TALKING' : isActive ? 'HOLD' : 'READY'}` : 'NO CALLER'}
        </StatusText>

        <MemButton
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

      <Keypad>
        {KEYS.map((key) => {
          const digit = key === '0' ? 9 : /\d/.test(key) ? Number(key) - 1 : -1;
          const isSpeedDial = digit >= 0;
          const disabled = isSpeedDial && digit >= queue.length;
          return (
            <Key key={key} type="button" onClick={() => pressKey(key)} disabled={disabled} aria-label={key === '*' ? 'MEM' : key === '#' ? 'Reiniciar' : `Línea ${key}`}>
              {key}
            </Key>
          );
        })}
      </Keypad>

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
    </Shell>
  );
}
