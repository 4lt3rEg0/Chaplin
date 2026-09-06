import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { fmtTime, ratioFromClientX, safeSetPointerCapture } from '../../shared/audioControls';
import manifest from '../../../../assets/profilePlayers/bubblegum-gloss/manifest.json';

import screenFusedImg from '../../../../assets/profilePlayers/bubblegum-gloss/shell/screen-fused.png';
import bubblesImg from '../../../../assets/profilePlayers/bubblegum-gloss/decoration/bubbles.png';
import prevImg from '../../../../assets/profilePlayers/bubblegum-gloss/controls/prev.png';
import playImg from '../../../../assets/profilePlayers/bubblegum-gloss/controls/play.png';
import pauseImg from '../../../../assets/profilePlayers/bubblegum-gloss/controls/pause.png';
import nextImg from '../../../../assets/profilePlayers/bubblegum-gloss/controls/next.png';
import volumeImg from '../../../../assets/profilePlayers/bubblegum-gloss/controls/volume.png';
import sliderTrackImg from '../../../../assets/profilePlayers/bubblegum-gloss/controls/slider-track.png';
import sliderThumbImg from '../../../../assets/profilePlayers/bubblegum-gloss/controls/slider-thumb.png';

/*
 * AQUA/GEL asset-pipeline Golden Master — GENERIC SLOT COMPOSITOR.
 *
 * This component renders manifest.json#slots + #decorations: every piece
 * is a REAL PNG extracted from the master sheet, nothing is redrawn or
 * approximated with CSS. A slot renders ONLY when manifest marks it
 * `present: true` — a missing slot (shell-base, screen-frame,
 * screen-glass, glow, specular, rim-light, an accent-mask, etc.) renders
 * NOTHING, never a gradient/box-shadow stand-in. See manifest.json#slots
 * for the full architecture (present vs. still-missing pieces, and why)
 * and README.md for extraction detail.
 *
 * STOP CONDITION (explicit instruction): do not visually improve this
 * player further — no invented shell, no duplicated decorations, no
 * approximated material — until real shell/screen/decoration/glow assets
 * are supplied. When an assembled-reference.png exists, it becomes the
 * absolute authority for composition/proportion/alignment/scale/position,
 * superseding the sheet-native coordinates this component uses today.
 */

const ASSET_MODULES = {
  'screen-fused-interim': screenFusedImg,
  prev: prevImg,
  play: playImg,
  pause: pauseImg,
  next: nextImg,
  volume: volumeImg,
  'slider-track': sliderTrackImg,
  'slider-thumb': sliderThumbImg,
  'bubbles-cluster-01': bubblesImg,
};

const CW = manifest.canvas.width;
const CH = manifest.canvas.height;
const pct = (v, total) => `${(v / total) * 100}%`;
const box = (s) => ({ left: pct(s.x, CW), top: pct(s.y, CH), width: pct(s.width, CW), height: pct(s.height, CH) });

const Wrap = styled.div`
  position: relative;
  width: 100%;
  max-width: 420px;
  aspect-ratio: ${CW} / ${CH};
  font-family: 'Segoe UI', system-ui, sans-serif;
  user-select: none;
`;

const Layer = styled.img`
  position: absolute;
  pointer-events: none;
  width: 100%;
  height: 100%;
  object-fit: fill;
  opacity: ${(p) => p.$opacity ?? 1};
  mix-blend-mode: ${(p) => p.$blendMode || 'normal'};
`;

const ScreenText = styled.div`
  position: absolute;
  pointer-events: none;
  color: #6a1450;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const TitleLine = styled.div`
  font-weight: 800;
  font-size: clamp(11px, 3.2vw, 17px);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ArtistLine = styled.div`
  font-size: clamp(8px, 2vw, 11px);
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
`;

const TimeLine = styled.div`
  font-family: 'Consolas', monospace;
  font-size: clamp(7px, 1.8vw, 10px);
  opacity: 0.8;
  margin-top: 4px;
`;

const CtrlBtn = styled.button`
  position: absolute;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.08s ease, filter 0.08s ease;

  img { width: 100%; height: 100%; object-fit: contain; pointer-events: none; }

  &:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.06); }
  &:active:not(:disabled) { transform: translateY(2px); filter: brightness(0.94); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid #6a1450; outline-offset: 2px; border-radius: 50%; }
  &[aria-pressed='true'] { filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.9)); }
`;

const SliderTrack = styled.div`
  position: absolute;
  cursor: pointer;
  background-image: url(${sliderTrackImg});
  background-size: 100% 100%;
`;

const SliderThumb = styled.img`
  position: absolute;
  width: ${(p) => p.$size}%;
  transform: translate(-50%, -50%);
  pointer-events: none;
`;

const VolumePopover = styled.div`
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 6, 26, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  padding: 8px 10px;
  display: ${(p) => (p.$open ? 'flex' : 'none')};
  z-index: 5;
`;

export default function BubblegumGlossSkin({
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
}) {
  const playing = isActive && isPlaying;
  const [volumeOpen, setVolumeOpen] = useState(false);
  const volRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const { slots, decorations, screen } = manifest;
  const setVolFromClientX = (clientX) => onVolumeChange(ratioFromClientX(volRef, clientX));

  const title = track ? track.title : (mode === 'favorites' ? 'Sin favoritas' : mode === 'radio' ? 'Radio sin señal' : 'Sin reproducción');
  const artist = track?.owner_username ? `@${track.owner_username}` : modeLabel;

  const ACTION_HANDLERS = {
    previous: { onClick: onPrev, disabled: !hasQueue, ariaLabel: 'Anterior' },
    play: { onClick: () => { if (!playing) onTogglePlay(); }, disabled: !track, ariaLabel: 'Reproducir', ariaPressed: !playing },
    pause: { onClick: () => { if (playing) onTogglePlay(); }, disabled: !track, ariaLabel: 'Pausar', ariaPressed: playing },
    next: { onClick: onNext, disabled: !hasQueue, ariaLabel: 'Siguiente' },
    toggleVolumePopover: { onClick: () => setVolumeOpen((o) => !o), ariaLabel: 'Volumen', ariaHaspopup: true, ariaExpanded: volumeOpen },
  };

  // Plain (non-interactive) present slots, rendered generically.
  const plainSlotIds = ['screen-fused-interim', 'shell-base', 'shell-shadow', 'shell-highlight', 'glow', 'specular', 'rim-light'];

  return (
    <Wrap data-skin-root="bubblegum-gloss">
      {plainSlotIds.map((id) => {
        const s = slots[id];
        if (!s?.present) return null;
        return <Layer key={id} src={ASSET_MODULES[id]} style={box(s)} $opacity={s.opacity} $blendMode={s.blendMode} alt="" />;
      })}

      <ScreenText style={box(screen)}>
        <TitleLine>{title}</TitleLine>
        <ArtistLine>{artist}</ArtistLine>
        <TimeLine>{fmtTime(currentTime)} / {fmtTime(duration)}</TimeLine>
      </ScreenText>

      {['prev', 'play', 'pause', 'next'].map((id) => {
        const s = slots[id];
        if (!s?.present) return null;
        const h = ACTION_HANDLERS[s.action];
        return (
          <CtrlBtn
            key={id} type="button" style={box(s)}
            aria-label={h.ariaLabel} aria-pressed={h.ariaPressed}
            onClick={h.onClick} disabled={h.disabled}
          ><img src={ASSET_MODULES[id]} alt="" /></CtrlBtn>
        );
      })}

      {slots.volume?.present && (
        <div style={{ position: 'absolute', ...box(slots.volume) }}>
          <CtrlBtn
            type="button" style={{ position: 'absolute', inset: 0 }}
            aria-label={ACTION_HANDLERS.toggleVolumePopover.ariaLabel}
            aria-haspopup={ACTION_HANDLERS.toggleVolumePopover.ariaHaspopup}
            aria-expanded={ACTION_HANDLERS.toggleVolumePopover.ariaExpanded}
            onClick={ACTION_HANDLERS.toggleVolumePopover.onClick}
          ><img src={ASSET_MODULES.volume} alt="" /></CtrlBtn>
          <VolumePopover $open={volumeOpen}>
            <input
              type="range" min="0" max="1" step="0.01" value={volume} style={{ width: 70 }}
              onChange={(e) => onVolumeChange(Number(e.target.value))} aria-label="Nivel de volumen"
            />
          </VolumePopover>
        </div>
      )}

      {slots['slider-track']?.present && (
        <SliderTrack
          ref={volRef}
          role="slider" aria-label="Volumen" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(volume * 100)}
          style={box(slots['slider-track'])}
          onPointerDown={(e) => { setDragging(true); safeSetPointerCapture(e.currentTarget, e.pointerId); setVolFromClientX(e.clientX); }}
          onPointerMove={(e) => { if (dragging) setVolFromClientX(e.clientX); }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
        />
      )}
      {slots['slider-thumb']?.present && (
        <SliderThumb
          src={ASSET_MODULES['slider-thumb']} alt="" $size={(slots['slider-thumb'].width / CW) * 100}
          style={{
            left: pct(slots['slider-track'].x + slots['slider-track'].trackInsetX + volume * (slots['slider-track'].width - slots['slider-track'].trackInsetX * 2), CW),
            top: pct(slots['slider-thumb'].y + slots['slider-thumb'].height / 2, CH),
          }}
        />
      )}

      {decorations.filter((d) => d.present).map((d) => (
        <Layer key={d.id} src={ASSET_MODULES[d.id]} style={box(d)} $opacity={d.opacity} $blendMode={d.blendMode} alt="" />
      ))}
    </Wrap>
  );
}
