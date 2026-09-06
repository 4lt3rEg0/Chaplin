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
 * AQUA/GEL asset-pipeline Golden Master. Every visual piece here (screen
 * frame, buttons, slider, bubbles) is a REAL PNG extracted from the master
 * sheet (tools/player-assets/scripts/extract_bubblegum_gloss.py), not a
 * CSS/SVG re-interpretation — the material/gel/gloss came from the sheet's
 * own art. React only handles composition, layout, and interaction. See
 * assets/profilePlayers/bubblegum-gloss/manifest.json for the canonical
 * canvas + per-layer placement this component reads, and its sibling
 * README.md for what was extracted vs. what stays baked-in and why.
 */

const CW = manifest.canvas.width;
const CH = manifest.canvas.height;
const pct = (v, total) => `${(v / total) * 100}%`;
const box = (x, y, w, h) => ({ left: pct(x, CW), top: pct(y, CH), width: pct(w, CW), height: pct(h, CH) });

const Wrap = styled.div`
  position: relative;
  width: 100%;
  max-width: 420px;
  aspect-ratio: ${CW} / ${CH};
  font-family: 'Segoe UI', system-ui, sans-serif;
  user-select: none;
  filter: drop-shadow(0 10px 16px rgba(90, 20, 70, 0.35));
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

  const { layers, screen, controls, slider } = manifest;
  const screenFused = layers.find((l) => l.id === 'screen-fused');
  const bubbles = layers.find((l) => l.id === 'bubbles');

  const title = track ? track.title : (mode === 'favorites' ? 'Sin favoritas' : mode === 'radio' ? 'Radio sin señal' : 'Sin reproducción');
  const artist = track?.owner_username ? `@${track.owner_username}` : modeLabel;

  const setVolFromClientX = (clientX) => onVolumeChange(ratioFromClientX(volRef, clientX));

  return (
    <Wrap data-skin-root="bubblegum-gloss">
      <Layer src={screenFusedImg} style={box(screenFused.x, screenFused.y, screenFused.width, screenFused.height)} alt="" />

      <ScreenText style={box(screen.x, screen.y, screen.width, screen.height)}>
        <TitleLine>{title}</TitleLine>
        <ArtistLine>{artist}</ArtistLine>
        <TimeLine>{fmtTime(currentTime)} / {fmtTime(duration)}</TimeLine>
      </ScreenText>

      <CtrlBtn
        type="button" style={box(controls.prev.x, controls.prev.y, controls.prev.width, controls.prev.height)}
        aria-label="Anterior" onClick={onPrev} disabled={!hasQueue}
      ><img src={prevImg} alt="" /></CtrlBtn>

      <CtrlBtn
        type="button" style={box(controls.play.x, controls.play.y, controls.play.width, controls.play.height)}
        aria-label="Reproducir" aria-pressed={!playing}
        onClick={() => { if (!playing) onTogglePlay(); }} disabled={!track}
      ><img src={playImg} alt="" /></CtrlBtn>

      <CtrlBtn
        type="button" style={box(controls.pause.x, controls.pause.y, controls.pause.width, controls.pause.height)}
        aria-label="Pausar" aria-pressed={playing}
        onClick={() => { if (playing) onTogglePlay(); }} disabled={!track}
      ><img src={pauseImg} alt="" /></CtrlBtn>

      <CtrlBtn
        type="button" style={box(controls.next.x, controls.next.y, controls.next.width, controls.next.height)}
        aria-label="Siguiente" onClick={onNext} disabled={!hasQueue}
      ><img src={nextImg} alt="" /></CtrlBtn>

      <div style={{ position: 'absolute', ...box(controls.volume.x, controls.volume.y, controls.volume.width, controls.volume.height) }}>
        <CtrlBtn
          type="button" style={{ position: 'absolute', inset: 0 }}
          aria-label="Volumen" aria-haspopup="true" aria-expanded={volumeOpen}
          onClick={() => setVolumeOpen((o) => !o)}
        ><img src={volumeImg} alt="" /></CtrlBtn>
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
        style={box(slider.track.x, slider.track.y, slider.track.width, slider.track.height)}
        onPointerDown={(e) => { setDragging(true); safeSetPointerCapture(e.currentTarget, e.pointerId); setVolFromClientX(e.clientX); }}
        onPointerMove={(e) => { if (dragging) setVolFromClientX(e.clientX); }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      />
      <SliderThumb
        src={sliderThumbImg} alt="" $size={(slider.thumb.width / CW) * 100}
        style={{
          left: pct(slider.track.x + slider.trackInsetX + volume * (slider.track.width - slider.trackInsetX * 2), CW),
          top: pct(slider.track.y + slider.track.height / 2, CH),
        }}
      />

      <Layer src={bubblesImg} style={box(bubbles.x, bubbles.y, bubbles.width, bubbles.height)} alt="" />
    </Wrap>
  );
}
