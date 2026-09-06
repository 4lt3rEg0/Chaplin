import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { fmtTime, ratioFromClientX, safeSetPointerCapture } from '../../shared/audioControls';
import manifest from '../../../../assets/profilePlayers/bubblegum-gloss/manifest.json';

import screenFusedImg from '../../../../assets/profilePlayers/bubblegum-gloss/screen/screen-frame-nominitransport.png';
import bgAltImg from '../../../../assets/profilePlayers/bubblegum-gloss/screen/background-alt.png';
import miniPrevImg from '../../../../assets/profilePlayers/bubblegum-gloss/controls/mini-prev.png';
import miniPauseImg from '../../../../assets/profilePlayers/bubblegum-gloss/controls/mini-pause.png';
import miniNextImg from '../../../../assets/profilePlayers/bubblegum-gloss/controls/mini-next.png';
import prevImg from '../../../../assets/profilePlayers/bubblegum-gloss/controls/prev.png';
import playImg from '../../../../assets/profilePlayers/bubblegum-gloss/controls/play.png';
import pauseImg from '../../../../assets/profilePlayers/bubblegum-gloss/controls/pause.png';
import nextImg from '../../../../assets/profilePlayers/bubblegum-gloss/controls/next.png';
import volumeImg from '../../../../assets/profilePlayers/bubblegum-gloss/controls/volume.png';
import sliderTrackImg from '../../../../assets/profilePlayers/bubblegum-gloss/controls/slider-track.png';
import sliderThumbImg from '../../../../assets/profilePlayers/bubblegum-gloss/controls/slider-thumb.png';
import bubble01Img from '../../../../assets/profilePlayers/bubblegum-gloss/decoration/bubble-01.png';
import bubble02Img from '../../../../assets/profilePlayers/bubblegum-gloss/decoration/bubble-02.png';
import bubble03Img from '../../../../assets/profilePlayers/bubblegum-gloss/decoration/bubble-03.png';
import bubble04Img from '../../../../assets/profilePlayers/bubblegum-gloss/decoration/bubble-04.png';
import bubble05Img from '../../../../assets/profilePlayers/bubblegum-gloss/decoration/bubble-05.png';
import bubble06Img from '../../../../assets/profilePlayers/bubblegum-gloss/decoration/bubble-06.png';

/*
 * AQUA/GEL asset-pipeline Golden Master — GENERIC MANIFEST COMPOSITOR.
 *
 * Renders manifest.json#assets: every piece is a REAL PNG traced back to
 * Assets (6).png (or, for the fuller slider, the verified individual
 * per-piece delivery) — nothing is redrawn or approximated with CSS.
 *
 * IMPORTANT (see manifest.json's _CRITICAL_NOTE): Assets (6).png is an
 * ASSET SHEET (a catalog layout of available pieces), not a picture of
 * the assembled player. The x/y this component reads is
 * sourceSheetPosition — where each piece was found on the sheet — NOT a
 * validated assembledPlayerPosition (manifest.json#assembledPlayerCoordinates
 * is currently unavailable). That is why this renders as a parts layout
 * rather than a single mounted device. Do not "fix" this by inventing a
 * shell or by repositioning pieces without a real assembled reference —
 * per explicit instruction, this component's visual output stays as-is
 * until one is supplied.
 *
 * Still missing (see manifest.json#missingAssets, each with why): a real
 * shell-base/shadow/highlight/accent-mask, a separable screen-frame vs.
 * screen-background/glass/highlight, glow/specular/rim-light. None of
 * these are faked here — do not add CSS for them without a real asset.
 */

const ASSET_MODULES = {
  'screen-fused': screenFusedImg,
  'screen-background-alt': bgAltImg,
  'mini-prev': miniPrevImg,
  'mini-pause': miniPauseImg,
  'mini-next': miniNextImg,
  prev: prevImg,
  play: playImg,
  pause: pauseImg,
  next: nextImg,
  volume: volumeImg,
  'slider-track': sliderTrackImg,
  'slider-thumb': sliderThumbImg,
  'bubble-01': bubble01Img,
  'bubble-02': bubble02Img,
  'bubble-03': bubble03Img,
  'bubble-04': bubble04Img,
  'bubble-05': bubble05Img,
  'bubble-06': bubble06Img,
};

const CW = manifest.canvas.width;
const CH = manifest.canvas.height;
const pct = (v, total) => `${(v / total) * 100}%`;
const box = (a) => ({ left: pct(a.x, CW), top: pct(a.y, CH), width: pct(a.width, CW), height: pct(a.height, CH) });
const byId = (id) => manifest.assets.find((a) => a.id === id);

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

  img { width: 100%; height: 100%; object-fit: contain; pointer-events: none; border-radius: 50%; }

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

  const { screen } = manifest;
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

  const screenFused = byId('screen-fused');
  const sliderTrack = byId('slider-track');
  const sliderThumb = byId('slider-thumb');
  const decorations = manifest.assets.filter((a) => a.type === 'decoration');
  const bigButtons = ['prev', 'play', 'pause', 'next'].map(byId);
  const miniButtons = ['mini-prev', 'mini-pause', 'mini-next'].map(byId);
  const volumeAsset = byId('volume');

  return (
    <Wrap data-skin-root="bubblegum-gloss">
      <Layer src={ASSET_MODULES[screenFused.id]} style={box(screenFused)} alt="" />

      {miniButtons.map((a) => {
        const h = ACTION_HANDLERS[a.action];
        return (
          <CtrlBtn key={a.id} type="button" style={box(a)} aria-label={h.ariaLabel} aria-pressed={h.ariaPressed} onClick={h.onClick} disabled={h.disabled}>
            <img src={ASSET_MODULES[a.id]} alt="" />
          </CtrlBtn>
        );
      })}

      <ScreenText style={box(screen)}>
        <TitleLine>{title}</TitleLine>
        <ArtistLine>{artist}</ArtistLine>
        <TimeLine>{fmtTime(currentTime)} / {fmtTime(duration)}</TimeLine>
      </ScreenText>

      {bigButtons.map((a) => {
        const h = ACTION_HANDLERS[a.action];
        return (
          <CtrlBtn key={a.id} type="button" style={box(a)} aria-label={h.ariaLabel} aria-pressed={h.ariaPressed} onClick={h.onClick} disabled={h.disabled}>
            <img src={ASSET_MODULES[a.id]} alt="" />
          </CtrlBtn>
        );
      })}

      <div style={{ position: 'absolute', ...box(volumeAsset) }}>
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

      <SliderTrack
        ref={volRef}
        role="slider" aria-label="Volumen" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(volume * 100)}
        style={box(sliderTrack)}
        onPointerDown={(e) => { setDragging(true); safeSetPointerCapture(e.currentTarget, e.pointerId); setVolFromClientX(e.clientX); }}
        onPointerMove={(e) => { if (dragging) setVolFromClientX(e.clientX); }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      />
      <SliderThumb
        src={ASSET_MODULES['slider-thumb']} alt="" $size={(sliderThumb.width / CW) * 100}
        style={{
          left: pct(sliderTrack.x + sliderTrack.trackInsetX + volume * (sliderTrack.width - sliderTrack.trackInsetX * 2), CW),
          top: pct(sliderThumb.y + sliderThumb.height / 2, CH),
        }}
      />

      {decorations.map((d) => (
        <Layer key={d.id} src={ASSET_MODULES[d.id]} style={box(d)} alt="" />
      ))}
    </Wrap>
  );
}
