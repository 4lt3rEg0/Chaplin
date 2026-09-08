import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

/*
 * GENERIC PLAYER ENGINE — renders ANY skin that follows the shared
 * manifest schema (assets[]: id/file/type/x/y/width/height/zIndex/
 * interactive/action/recolorGroup). This is the "Skin Engine + Player"
 * half of the architecture Skin Studio's editor half feeds: Skin Studio
 * never draws pixels itself beyond the editor chrome — this component is
 * what actually renders a skin, both in Skin Studio's own Preview mode
 * and (once a skin is real) as a real profile player.
 *
 * Functional zones (type starting with "functional-") don't come from an
 * image file — they render LIVE data (title/time/progress/spectrum/
 * volume) positioned at their manifest x/y/width/height like any other
 * element. Everything else (`type: "control"` etc.) renders its `file`
 * as a real clickable image wired to the matching action.
 */

const ACTIONS = {
  previous: (p) => p.onPrev,
  play: (p) => () => { if (!(p.isActive && p.isPlaying)) p.onTogglePlay(); },
  pause: (p) => () => { if (p.isActive && p.isPlaying) p.onTogglePlay(); },
  next: (p) => p.onNext,
  'toggle-play': (p) => p.onTogglePlay,
  favorite: (p) => p.onToggleFavorite,
};

const Wrap = styled.div`
  position: relative;
  width: 100%;
  max-width: ${(p) => p.$maxWidth || 480}px;
  aspect-ratio: ${(p) => p.$cw} / ${(p) => p.$ch};
  font-family: 'Segoe UI', system-ui, sans-serif;
  user-select: none;
  overflow: visible;
`;

const El = styled.div`
  position: absolute;
`;

const ImgEl = styled.img`
  width: 100%;
  height: 100%;
  object-fit: fill;
  display: block;
  pointer-events: none;
`;

const BtnEl = styled.button`
  position: absolute;
  inset: 0;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
  transition: transform 0.08s ease, filter 0.08s ease;
  &:hover:not(:disabled) { filter: brightness(1.08); }
  &:active:not(:disabled) { transform: scale(0.96); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
  &[aria-pressed='true'] { filter: drop-shadow(0 0 6px rgba(255,255,255,0.85)); }
`;

const TimeText = styled.div`
  font-family: 'Consolas', monospace;
  color: ${(p) => p.$color || '#fff'};
  font-size: ${(p) => p.$fontSize || 11}px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%; height: 100%;
`;

const TitleText = styled.div`
  color: ${(p) => p.$color || '#fff'};
  font-weight: 700;
  font-size: ${(p) => p.$fontSize || 13}px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  width: 100%; height: 100%;
`;

const ProgressTrack = styled.div`
  position: relative;
  width: 100%; height: 100%;
  border-radius: 999px;
  background: rgba(0,0,0,0.35);
  cursor: pointer;
  overflow: hidden;
`;
const ProgressFill = styled.div`
  position: absolute; inset: 0; height: 100%;
  width: ${(p) => p.$pct}%;
  background: ${(p) => p.$color || 'linear-gradient(90deg,#5ad4f5,#2b9ed6)'};
`;

const SpectrumWrap = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  width: 100%; height: 100%;
`;
const SpectrumBar = styled.div`
  flex: 1;
  min-height: 2px;
  background: ${(p) => p.$color || '#5ad4f5'};
  border-radius: 2px;
`;

const VolumeThumbEl = styled.div`
  position: absolute;
  width: 100%; height: 100%;
  border-radius: 50%;
  background: ${(p) => p.$color || '#fff'};
  pointer-events: none;
`;

// Real spectrum: pulls frequency bins mapped to N bands (log-ish spread
// across bass/mid/high) instead of just the first N raw FFT bins.
function useSpectrum(audioEl, bands, enabled) {
  const [levels, setLevels] = useState(() => new Array(bands).fill(0));
  const rafRef = useRef(null);
  const analyserRef = useRef(null);
  const dataRef = useRef(null);

  useEffect(() => {
    if (!enabled || !audioEl) return undefined;
    let ctx;
    try {
      ctx = window.__skinStudioAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
      window.__skinStudioAudioCtx = ctx;
      if (!audioEl.__skinStudioSource) {
        const src = ctx.createMediaElementSource(audioEl);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        src.connect(analyser);
        analyser.connect(ctx.destination);
        audioEl.__skinStudioSource = src;
        audioEl.__skinStudioAnalyser = analyser;
      }
      analyserRef.current = audioEl.__skinStudioAnalyser;
      dataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
    } catch {
      return undefined;
    }

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      if (!analyserRef.current || !dataRef.current) return;
      analyserRef.current.getByteFrequencyData(dataRef.current);
      const bins = dataRef.current;
      const usable = Math.floor(bins.length * 0.7); // skip the mostly-silent top end
      const next = new Array(bands).fill(0).map((_, i) => {
        // log-ish spread: lower bands sample fewer/lower bins (bass), higher
        // bands sample a wider spread of higher bins.
        const t0 = Math.pow(i / bands, 1.6);
        const t1 = Math.pow((i + 1) / bands, 1.6);
        const i0 = Math.max(0, Math.floor(t0 * usable));
        const i1 = Math.max(i0 + 1, Math.floor(t1 * usable));
        let sum = 0;
        for (let j = i0; j < i1 && j < bins.length; j++) sum += bins[j];
        return sum / Math.max(1, i1 - i0) / 255;
      });
      setLevels(next);
    };
    tick();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [audioEl, bands, enabled]);

  return levels;
}

export default function GenericPlayerEngine({
  manifest,
  assetUrl,
  track,
  isActive,
  isPlaying,
  hasQueue,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek = () => {},
  onVolumeChange = () => {},
  currentTime = 0,
  duration = 0,
  volume = 0.8,
  isFavorited = false,
  onToggleFavorite = () => {},
  audioElRef, // optional: real <audio> element for live spectrum
  maxWidth,
}) {
  const APC = manifest.assembledPlayerCoordinates;
  const canvas = (APC && APC.available) ? APC.canvas : manifest.canvas;
  const positions = (APC && APC.available) ? APC.positions : {};
  const CW = canvas.width;
  const CH = canvas.height;
  const pct = (v, total) => `${(v / total) * 100}%`;
  const resolvedPos = (a) => positions[a.id] || a;
  const boxStyle = (a) => {
    const p = resolvedPos(a);
    return { left: pct(p.x, CW), top: pct(p.y, CH), width: pct(a.width, CW), height: pct(a.height, CH), zIndex: a.zIndex ?? 0 };
  };

  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const ratioFromClientX = (ref, clientX) => {
    const el = ref.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const spectrumAsset = manifest.assets.find((a) => a.type === 'functional-spectrum');
  const bands = spectrumAsset?.bands || 12;
  const levels = useSpectrum(audioElRef?.current, bands, !!audioElRef);

  const playing = isActive && isPlaying;
  const title = track?.title || 'Sin reproducción';
  const artist = track?.owner_username ? `@${track.owner_username}` : '';
  const fmtTime = (s) => {
    if (!Number.isFinite(s)) return '00:00';
    const safe = Math.max(0, Math.floor(s));
    return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
  };

  const sorted = [...manifest.assets].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  return (
    <Wrap $cw={CW} $ch={CH} $maxWidth={maxWidth} data-skin-root={manifest.id}>
      {sorted.map((a) => {
        if (a.hidden) return null;
        const style = boxStyle(a);

        if (a.type === 'control') {
          const handler = ACTIONS[a.action]?.({ onPrev, onNext, onTogglePlay, isActive, isPlaying, onToggleFavorite });
          const disabled = a.action === 'previous' || a.action === 'next' ? !hasQueue : !track;
          const pressed = a.action === 'play' ? !playing : a.action === 'pause' ? playing : a.action === 'favorite' ? isFavorited : undefined;
          return (
            <El key={a.id} style={style}>
              <BtnEl type="button" aria-label={a.id} aria-pressed={pressed} onClick={handler} disabled={disabled}>
                {a.file && <ImgEl src={assetUrl(a.file)} alt="" />}
              </BtnEl>
            </El>
          );
        }
        if (a.type === 'functional-time') {
          return <El key={a.id} style={style}><TimeText $color={a.color} $fontSize={a.fontSize}>{fmtTime(currentTime)} / {fmtTime(duration)}</TimeText></El>;
        }
        if (a.type === 'functional-title') {
          return <El key={a.id} style={style}><TitleText $color={a.color} $fontSize={a.fontSize}>{title}{artist ? ` — ${artist}` : ''}</TitleText></El>;
        }
        if (a.type === 'functional-progress') {
          const p = duration ? (currentTime / duration) * 100 : 0;
          return (
            <El key={a.id} style={style}>
              <ProgressTrack onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onSeek(((e.clientX - r.left) / r.width) * duration); }}>
                <ProgressFill $pct={p} $color={a.color} />
              </ProgressTrack>
            </El>
          );
        }
        if (a.type === 'functional-spectrum') {
          return (
            <El key={a.id} style={style}>
              <SpectrumWrap>
                {levels.map((v, i) => <SpectrumBar key={i} $color={a.color} style={{ height: `${Math.max(6, v * 100)}%` }} />)}
              </SpectrumWrap>
            </El>
          );
        }
        if (a.type === 'functional-volume-track') {
          return (
            <El key={a.id} ref={trackRef} style={style}>
              <ProgressTrack
                onPointerDown={(e) => { setDragging(true); e.currentTarget.setPointerCapture(e.pointerId); onVolumeChange(ratioFromClientX(trackRef, e.clientX)); }}
                onPointerMove={(e) => { if (dragging) onVolumeChange(ratioFromClientX(trackRef, e.clientX)); }}
                onPointerUp={() => setDragging(false)}
              >
                <ProgressFill $pct={volume * 100} $color={a.color} />
              </ProgressTrack>
            </El>
          );
        }
        if (a.type === 'functional-volume-thumb') {
          const trackAsset = manifest.assets.find((x) => x.type === 'functional-volume-track');
          const tp = trackAsset ? resolvedPos(trackAsset) : { x: 0 };
          const left = trackAsset ? tp.x + volume * trackAsset.width : resolvedPos(a).x;
          return <El key={a.id} style={{ ...style, left: pct(left - a.width / 2, CW) }}><VolumeThumbEl $color={a.color} /></El>;
        }

        // plain image layer (screen/decoration/etc.)
        return <El key={a.id} style={style}>{a.file && <ImgEl src={assetUrl(a.file)} alt="" />}</El>;
      })}
    </Wrap>
  );
}
