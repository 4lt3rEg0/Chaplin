import React, { useEffect, useRef } from 'react';
import { ListOrdered, Repeat, Repeat1, Shuffle } from 'lucide-react';
import artwork from './liquid-chrome-transparent.png';
import './liquid-chrome.css';

const time = (n) => `${Math.floor((Number.isFinite(n) ? n : 0) / 60)}:${String(Math.floor((Number.isFinite(n) ? n : 0) % 60)).padStart(2, '0')}`;

const ORDERS = { ordered: ['Orden normal', ListOrdered], one: ['Repetir canción', Repeat1], all: ['Repetir lista', Repeat], shuffle: ['Aleatorio', Shuffle] };
export default function LiquidChromeSkin({ track, isPlaying = false, currentTime = 0, duration = 0, volume = .8, onTogglePlay, onPrev, onNext, onSeek, onVolumeChange, getAnalyser, hasQueue = false, modeLabel = 'CHAPLIN SESSIONS', playbackOrder = 'ordered', onCyclePlaybackOrder, playbackError = '' }) {
  const [orderLabel, OrderIcon] = ORDERS[playbackOrder] || ORDERS.ordered;
  const canvasRef = useRef(null);
  const analyserGetter = useRef(getAnalyser);
  analyserGetter.current = getAnalyser;
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let frame;
    let bins;
    const peaks = new Float32Array(40);
    const draw = () => {
      const analyser = isPlaying ? analyserGetter.current?.() : null;
      if (analyser) {
        if (bins?.length !== analyser.frequencyBinCount) bins = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(bins);
      }
      ctx.clearRect(0, 0, 480, 120);
      for (let i = 0; i < 40; i++) {
        let energy = 0;
        if (analyser) {
          const start = Math.floor(i * bins.length / 40);
          const end = Math.max(start + 1, Math.floor((i + 1) * bins.length / 40));
          for (let b = start; b < end; b++) energy = Math.max(energy, bins[b] / 255);
        }
        peaks[i] = Math.max(energy, peaks[i] - .025);
        const height = Math.round(energy * 108);
        const gradient = ctx.createLinearGradient(0, 120, 0, 0);
        gradient.addColorStop(0, '#066d97'); gradient.addColorStop(.65, '#47d9ff'); gradient.addColorStop(1, '#e4ffff');
        ctx.fillStyle = gradient; ctx.shadowColor = '#39dfff'; ctx.shadowBlur = isPlaying ? 7 : 0;
        for (let y = 0; y < height; y += 5) ctx.fillRect(i * 12, 116 - y, 5, 3);
        ctx.shadowBlur = 0; ctx.fillStyle = '#a7f2ff';
        if (peaks[i] > .02) ctx.fillRect(i * 12, 116 - peaks[i] * 108, 5, 2);
      }
      if (isPlaying || peaks.some(p => p > 0)) frame = requestAnimationFrame(draw);
    };
    draw(); return () => cancelAnimationFrame(frame);
  }, [isPlaying]);
  const seekable = Number.isFinite(duration) && duration > 0;
  const progress = seekable ? Math.min(100, Math.max(0, currentTime / duration * 100)) : 0;
  return <div className="lc-player" data-skin-root data-liquid-chrome style={{ '--lc-art': `url("${artwork}")` }}>
    <img className="lc-shell" src={artwork} alt="" draggable="false" />
    <div className="lc-screen">
      <div className="lc-cover" aria-hidden="true"><img src={artwork} alt="" /></div>
      <div className="lc-metadata"><div className="lc-title" title={track?.title}>{track?.title || 'Liquid Chrome'}</div><div className="lc-artist">{track?.artist || track?.owner_username || 'Selecciona tu música'}</div></div>
      <canvas className="lc-spectrum" width="480" height="120" ref={canvasRef} aria-label="Espectro del audio real" />
      <div className="lc-time">{time(currentTime)} / {time(duration)}</div>
      <div className="lc-source"><i className={isPlaying ? 'lc-led is-on' : 'lc-led'} />{isPlaying ? 'PLAYING' : 'STANDBY'}</div>
      <input className="lc-seek" type="range" min="0" max={seekable ? duration : 1} step="0.1" value={seekable ? Math.min(currentTime, duration) : 0} disabled={!seekable} aria-label="Posición de reproducción" onChange={e => onSeek?.(Number(e.target.value))} style={{ '--progress': `${progress}%` }} />
    </div>
    <button type="button" className="lc-key lc-prev" aria-label="Canción anterior" title={hasQueue ? 'Canción anterior' : 'Solo hay una canción o la lista está vacía'} disabled={!hasQueue} onClick={onPrev} />
    <button type="button" className="lc-key lc-play" aria-label={isPlaying ? 'Pausar' : 'Reproducir'} aria-pressed={isPlaying} disabled={!track} onClick={onTogglePlay}>{isPlaying && <span className="lc-pause-face"><span>Ⅱ</span></span>}</button>
    <button type="button" className="lc-key lc-next" aria-label="Canción siguiente" title={hasQueue ? 'Canción siguiente' : 'Solo hay una canción o la lista está vacía'} disabled={!hasQueue} onClick={onNext} />
    <button type="button" className="lc-order" onClick={onCyclePlaybackOrder} aria-label={`Modo de reproducción: ${orderLabel}`} title={`${orderLabel} · Pulsa para cambiar`} disabled={!onCyclePlaybackOrder}><OrderIcon aria-hidden="true" /><span>{orderLabel}</span></button>
    <div className="lc-knob" title={`Volumen ${Math.round(volume * 100)}%`}>
      <div className="lc-knob-pointer" style={{ transform: `rotate(${-135 + volume * 270}deg)` }}><i /></div>
      <input type="range" min="0" max="1" step="0.01" value={volume} aria-label="Volumen" aria-valuetext={`${Math.round(volume * 100)} por ciento`} onChange={e => onVolumeChange?.(Number(e.target.value))} />
    </div>
    <span className="lc-sr">{modeLabel}</span>
    {(playbackError || !track) && <div className="lc-status" role="status">{playbackError || 'Lista vacía. Añade música o elige Radio Chaplin en Configuración.'}</div>}
  </div>;
}
