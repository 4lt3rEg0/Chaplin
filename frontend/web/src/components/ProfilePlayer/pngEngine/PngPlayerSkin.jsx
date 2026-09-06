import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import {
  Play, Pause, SkipBack, SkipForward, Star, Headphones
} from 'lucide-react';
import { fmtTime, ratioFromClientX, ratioFromClientY, safeSetPointerCapture } from '../shared/audioControls';

/*
 * Generic renderer for PNG-sourced players. It never draws its own shell —
 * every pixel of the device comes from manifest.asset (a real exported PNG
 * derived from the user's canonical source sheets). This component only
 * positions transparent hitboxes and dynamic text/LED overlays on top, at
 * the coordinates recorded in the manifest. Coordinates are stored in the
 * manifest as fractions (0..1) of the asset's natural width/height so the
 * overlay always lines up regardless of render size.
 */

const isDebugOn = () => {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('playerDebug') === '1';
  } catch {
    return false;
  }
};

const Wrap = styled.div`
  position: relative;
  width: 100%;
  max-width: ${({ $maxWidth }) => $maxWidth || 480}px;
  aspect-ratio: ${({ $ar }) => $ar || 1.6};
  filter: drop-shadow(0 14px 20px rgba(0, 0, 0, 0.45));
  user-select: none;
`;

const BaseImg = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
`;

const TintLayer = styled.div`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background-color: ${({ $color }) => $color};
  mix-blend-mode: ${({ $blend }) => $blend || 'color'};
  -webkit-mask-image: ${({ $mask }) => `url(${$mask})`};
  mask-image: ${({ $mask }) => `url(${$mask})`};
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  opacity: ${({ $opacity }) => ($opacity == null ? 1 : $opacity)};
`;

const box = (region) => ({
  left: `${region.x * 100}%`,
  top: `${region.y * 100}%`,
  width: `${region.w * 100}%`,
  height: `${region.h * 100}%`
});

const HitBox = styled.button`
  position: absolute;
  border: none;
  background: ${({ $debug }) => ($debug ? 'rgba(255,0,80,0.28)' : 'transparent')};
  outline: ${({ $debug }) => ($debug ? '1px solid rgba(255,0,80,0.9)' : 'none')};
  padding: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  &:disabled { cursor: not-allowed; }
  &:active:not(:disabled) { filter: brightness(0.72) saturate(1.15); }
`;

const DebugTag = styled.span`
  position: absolute;
  top: -1px;
  left: 1px;
  font-size: 8px;
  font-family: monospace;
  color: #fff;
  background: rgba(255, 0, 80, 0.9);
  padding: 0 2px;
  pointer-events: none;
  line-height: 1.3;
`;

const DisplayText = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: ${({ $justify }) => $justify || 'center'};
  align-items: ${({ $align }) => $align || 'flex-start'};
  overflow: hidden;
  pointer-events: none;
  color: ${({ $color }) => $color || '#eafff2'};
  font-family: ${({ $font }) => $font || "'Consolas', monospace"};
  line-height: 1.25;
`;

const DisplayLine = styled.div`
  font-size: ${({ $size }) => $size || 'clamp(7px, 1.6vw, 10px)'};
  font-weight: ${({ $weight }) => $weight || 600};
  opacity: ${({ $opacity }) => ($opacity == null ? 1 : $opacity)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`;

const Led = styled.div`
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  background: ${({ $on, $color }) => ($on ? $color : 'rgba(255,255,255,0.12)')};
  box-shadow: ${({ $on, $color }) => ($on ? `0 0 6px 1px ${$color}` : 'none')};
  transition: background 0.15s ease, box-shadow 0.15s ease;
`;

const VolumeTrack = styled.div`
  position: absolute;
  cursor: ${({ $vertical }) => ($vertical ? 'ns-resize' : 'ew-resize')};
  touch-action: none;
`;

const VolumeFill = styled.div`
  position: absolute;
  pointer-events: none;
  ${({ $shape, $vertical, $pct, $color }) => {
    if ($shape === 'circle') {
      return `inset:0; border-radius:50%; background: radial-gradient(circle, ${$color} 0%, transparent 72%); opacity: ${0.15 + ($pct / 100) * 0.55};`;
    }
    return $vertical
      ? `left:0; right:0; bottom:0; height:${$pct}%; background:${$color}; opacity:0.85;`
      : `top:0; bottom:0; left:0; width:${$pct}%; background:${$color}; opacity:0.85;`;
  }}
`;

const AvatarImg = styled.img`
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
`;

const AvatarFallback = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
  color: rgba(255, 255, 255, 0.6);
  font-size: clamp(9px, 2vw, 14px);
  font-weight: 700;
  pointer-events: none;
`;

function iconFor(name) {
  switch (name) {
    case 'play': return Play;
    case 'pause': return Pause;
    case 'prev': return SkipBack;
    case 'next': return SkipForward;
    case 'favorite': return Star;
    case 'profileListen': return Headphones;
    default: return null;
  }
}

export default function PngPlayerSkin({
  manifest,
  asset,
  avatarUrl,
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
  onSeek = () => {},
  volume = 0.8,
  onVolumeChange = () => {},
  isFavorited = false,
  canFavorite = false,
  onToggleFavorite = () => {},
  queue = [],
  onSelectTrack = () => {},
  palette
}) {
  const debug = isDebugOn();
  const playing = isActive && isPlaying;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const volTrackRef = useRef(null);
  const [draggingVol, setDraggingVol] = useState(false);
  const controls = manifest.controls || {};
  const displayRegions = manifest.displayRegions || [];
  const imageRegions = manifest.imageRegions || [];
  const ledRegions = manifest.ledRegions || [];
  const colorRegions = (manifest.colorRegions || []).filter((r) => r.mask);
  const progressControl = controls.progress;
  const progressRef = useRef(null);

  const seek = (clientX) => {
    if (!duration || !progressRef.current) return;
    onSeek(ratioFromClientX(progressRef, clientX) * duration);
  };

  const setVolFromClient = (clientX, clientY) => {
    if (!volTrackRef.current) return;
    const ratio = controls.volume?.vertical
      ? ratioFromClientY(volTrackRef, clientY)
      : ratioFromClientX(volTrackRef, clientX);
    onVolumeChange(Math.round(ratio * 100) / 100);
  };

  const renderControl = (key, control, { label, onClick, disabled, active, iconName }) => {
    if (!control) return null;
    const Icon = iconFor(iconName);
    return (
      <HitBox
        key={key}
        type="button"
        style={box(control)}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active}
        $debug={debug}
        data-active={active ? 'true' : undefined}
      >
        {debug && <DebugTag>{key}</DebugTag>}
        {Icon && !debug && (
          <Icon size="60%" style={{ opacity: 0, pointerEvents: 'none' }} aria-hidden />
        )}
      </HitBox>
    );
  };

  return (
    <Wrap $ar={manifest.aspectRatio} $maxWidth={manifest.maxWidth} data-player-id={manifest.id}>
      <BaseImg src={asset} alt="" draggable={false} />

      {imageRegions.map((region) => {
        const src = region.source === 'avatar' ? avatarUrl : null;
        return (
          <div key={region.id} style={{ position: 'absolute', overflow: 'hidden', ...box(region) }}>
            {src ? <AvatarImg src={src} alt="" draggable={false} /> : <AvatarFallback>{(track?.owner_username || '?').slice(0, 1).toUpperCase()}</AvatarFallback>}
          </div>
        );
      })}

      {palette?.colorMode !== 'original' && colorRegions.map((region) => (
        <TintLayer
          key={region.id}
          $mask={region.mask}
          $color={palette?.regionColors?.[region.id] || region.defaultColor}
          $blend={region.blend}
          $opacity={region.opacity}
        />
      ))}

      {displayRegions.map((region) => (
        <DisplayText key={region.id} style={box(region)} $align={region.align} $justify={region.justify} $color={region.color} $font={region.font}>
          {region.lines.map((line, i) => {
            let content = '';
            if (line.field === 'title') content = track ? track.title : (mode === 'favorites' ? 'Sin favoritas' : mode === 'radio' ? 'Radio sin señal' : 'Sin reproducción');
            else if (line.field === 'artist') content = track?.owner_username ? `@${track.owner_username}` : modeLabel;
            else if (line.field === 'time') content = `${fmtTime(currentTime)} / ${fmtTime(duration)}`;
            else if (line.field === 'status') content = playing ? 'PLAY' : isActive ? 'PAUSE' : 'IDLE';
            else if (line.field === 'static') content = line.text || '';
            return (
              <DisplayLine key={i} $size={line.size} $weight={line.weight} $opacity={line.opacity}>
                {content}
              </DisplayLine>
            );
          })}
        </DisplayText>
      ))}

      {ledRegions.map((region) => {
        let on = false;
        if (region.activeWhen === 'isPlaying') on = playing;
        else if (region.activeWhen === 'isActive') on = isActive;
        else if (region.activeWhen === 'isFavorited') on = isFavorited;
        else if (region.activeWhen === 'hasQueue') on = hasQueue;
        else if (region.activeWhen === 'always') on = true;
        return <Led key={region.id} style={box(region)} $on={on} $color={region.color} title={region.label} />;
      })}

      {progressControl && (
        <VolumeTrack
          ref={progressRef}
          style={box(progressControl)}
          role="slider"
          aria-label="Progreso"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={currentTime}
          onClick={(e) => seek(e.clientX)}
        >
          <VolumeFill $pct={progress * 100} $color={progressControl.color || palette?.accent || '#7dd8ff'} $vertical={progressControl.vertical} $shape={progressControl.shape} />
        </VolumeTrack>
      )}

      {controls.volume && (
        <VolumeTrack
          ref={volTrackRef}
          style={box(controls.volume)}
          role="slider"
          aria-label="Volumen"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(volume * 100)}
          $vertical={controls.volume.vertical}
          onPointerDown={(e) => { setDraggingVol(true); safeSetPointerCapture(e.currentTarget, e.pointerId); setVolFromClient(e.clientX, e.clientY); }}
          onPointerMove={(e) => { if (draggingVol) setVolFromClient(e.clientX, e.clientY); }}
          onPointerUp={() => setDraggingVol(false)}
          onPointerCancel={() => setDraggingVol(false)}
        >
          <VolumeFill $pct={volume * 100} $color={controls.volume.color || palette?.accent || '#7dd8ff'} $vertical={controls.volume.vertical} $shape={controls.volume.shape} />
        </VolumeTrack>
      )}

      {renderControl('playPause', controls.playPause, {
        label: playing ? 'Pausar' : 'Reproducir', onClick: onTogglePlay, disabled: !track, active: playing, iconName: playing ? 'pause' : 'play'
      })}
      {renderControl('previous', controls.previous, {
        label: 'Anterior', onClick: onPrev, disabled: !hasQueue, iconName: 'prev'
      })}
      {renderControl('next', controls.next, {
        label: 'Siguiente', onClick: onNext, disabled: !hasQueue, iconName: 'next'
      })}
      {renderControl('favorite', controls.favorite, {
        label: 'Favorito', onClick: onToggleFavorite, disabled: !canFavorite || !track, active: isFavorited, iconName: 'favorite'
      })}
      {renderControl('profileListen', controls.profileListen, {
        label: ariaLabel, onClick: onToggleEar, active: isActive, iconName: 'profileListen'
      })}

      {Array.isArray(controls.speedDial) && controls.speedDial.map((control, i) => (
        renderControl(`speedDial-${i}`, control, {
          label: `Pista ${i + 1}`, onClick: () => onSelectTrack(i), disabled: i >= queue.length
        })
      ))}
    </Wrap>
  );
}
