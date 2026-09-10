import React, { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, ListOrdered, Repeat, Repeat1, Shuffle } from 'lucide-react';
import './dream-collection.css';

const orders = { ordered: ['Orden normal', ListOrdered], one: ['Repetir canción', Repeat1], all: ['Repetir lista', Repeat], shuffle: ['Aleatorio', Shuffle] };
const fmt = n => { const t = Number.isFinite(n) ? Math.max(0, n) : 0; return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; };
const box = ([x,y,w,h]) => ({left:`${x}%`,top:`${y}%`,width:`${w}%`,height:`${h}%`});
function keyStyle(rect) {
  const [x,y,w,h] = rect;
  return {...box(rect),backgroundSize:`${10000/w}% ${10000/h}%`,backgroundPosition:`${100*x/(100-w)}% ${100*y/(100-h)}%`};
}

export default function RenderedDreamSkin({ design, track, isPlaying=false, currentTime=0, duration=0, volume=.8, hasQueue=false, onTogglePlay, onPrev, onNext, onSeek, onVolumeChange, getAnalyser, playbackOrder='ordered', onCyclePlaybackOrder, playbackError='' }) {
  const canvas = useRef(null), getter = useRef(getAnalyser);
  getter.current = getAnalyser;
  useEffect(() => {
    const ctx=canvas.current.getContext('2d');
    let raf, bins; const peaks=new Float32Array(36);
    function draw() {
      const a=isPlaying ? getter.current?.() : null;
      if(a){if(bins?.length!==a.frequencyBinCount)bins=new Uint8Array(a.frequencyBinCount);a.getByteFrequencyData(bins);}
      ctx.clearRect(0,0,432,100);
      for(let i=0;i<36;i++){
        let level=0;
        if(a)for(let b=Math.floor(i*bins.length/36);b<Math.max(Math.floor(i*bins.length/36)+1,Math.floor((i+1)*bins.length/36));b++)level=Math.max(level,bins[b]/255);
        peaks[i]=Math.max(level,peaks[i]-.028);
        const gradient=ctx.createLinearGradient(0,100,0,0);gradient.addColorStop(0,design.accent);gradient.addColorStop(1,'#f0ffff');
        ctx.fillStyle=gradient;ctx.shadowColor=design.accent;ctx.shadowBlur=5;
        for(let y=0;y<level*94;y+=5)ctx.fillRect(i*12,96-y,6,3);
        ctx.shadowBlur=0;if(peaks[i]>.03)ctx.fillRect(i*12,96-peaks[i]*94,6,2);
      }
      if(isPlaying||peaks.some(p=>p>0))raf=requestAnimationFrame(draw);
    }
    draw();return()=>cancelAnimationFrame(raf);
  },[isPlaying,design.accent]);
  const seekable=Number.isFinite(duration)&&duration>0;
  const progress=seekable?Math.max(0,Math.min(100,currentTime/duration*100)):0;
  const [orderLabel,OrderIcon]=orders[playbackOrder]||orders.ordered;
  const [prev,play,next,order,knob]=design.controls;
  return <div className="dc-player" data-skin-root data-dream-skin={design.id} style={{'--dc-art':`url("${design.asset}")`,'--dc-accent':design.accent,'--dc-ink':design.ink||'#1b2636',aspectRatio:design.aspectRatio||1.5}}>
    <img className="dc-shell" src={design.asset} alt="" draggable="false" />
    <div className="dc-screen" style={box(design.screen)}>
      <div className="dc-state"><i className={isPlaying?'dc-led on':'dc-led'} />{isPlaying?'PLAYING':'STANDBY'}</div>
      <div className="dc-title" title={track?.title}>{track?.title||design.label}</div>
      <div className="dc-artist">{track?.artist||track?.owner_username||'CHAPLIN'}</div>
      <canvas width="432" height="100" className="dc-spectrum" ref={canvas} aria-label="Espectro del audio real" />
      <div className="dc-time">{fmt(currentTime)} / {fmt(duration)}</div>
      <input className="dc-seek" type="range" aria-label="Posición de reproducción" min="0" max={seekable?duration:1} step="0.1" value={seekable?Math.max(0,Math.min(duration,currentTime)):0} disabled={!seekable} onChange={e=>onSeek?.(+e.target.value)} style={{'--dc-progress':`${progress}%`}} />
    </div>
    <button type="button" className="dc-key" style={keyStyle(prev)} aria-label="Canción anterior" disabled={!hasQueue} onClick={onPrev}><SkipBack aria-hidden="true" /></button>
    <button type="button" className="dc-key" style={keyStyle(play)} aria-label={isPlaying?'Pausar':'Reproducir'} aria-pressed={isPlaying} disabled={!track} onClick={onTogglePlay}>{isPlaying?<Pause aria-hidden="true"/>:<Play aria-hidden="true"/>}</button>
    <button type="button" className="dc-key" style={keyStyle(next)} aria-label="Canción siguiente" disabled={!hasQueue} onClick={onNext}><SkipForward aria-hidden="true" /></button>
    <button type="button" className="dc-key dc-order" style={keyStyle(order)} aria-label={`Modo de reproducción: ${orderLabel}`} title={`${orderLabel} · Pulsa para cambiar`} disabled={!onCyclePlaybackOrder} onClick={onCyclePlaybackOrder}><OrderIcon aria-hidden="true" /></button>
    <div className="dc-knob" style={box(knob)}><span className="dc-pointer" style={{transform:`rotate(${-135+volume*270}deg)`}}><i/></span><input type="range" min="0" max="1" step="0.01" value={volume} onChange={e=>onVolumeChange?.(+e.target.value)} aria-label="Volumen" aria-valuetext={`${Math.round(volume*100)} por ciento`} /></div>
    {(playbackError||!track)&&<p className="dc-message" role="status">{playbackError||'Añade canciones a tu lista o elige Radio Chaplin en Configuración.'}</p>}
  </div>;
}
