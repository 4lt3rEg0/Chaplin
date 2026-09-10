import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '../../../../context/PlayerContext';
import { useAuth } from '../../../../context/AuthContext';
import api from '../../../../services/api';
import { normalizeTrackSrc } from '../../../../utils/mediaUrl';
import LiquidChromeSkin from './LiquidChromeSkin';

const shape = t => ({ id: t.id, src: normalizeTrackSrc(t.src || t.media_url), title: t.title || 'Sin título', artist: t.artist || t.owner_username || 'Chaplin' });
export default function LiquidChromeDemo() {
  const p = usePlayer();
  const { user } = useAuth();
  const [source, setSource] = useState('personal');
  const [lists, setLists] = useState({ personal: [], chaplin: [] });
  const [messages, setMessages] = useState({ personal: 'Cargando lista personal…', chaplin: 'Cargando radio…' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([api.get('/playlists/mine/personal'), api.get('/playlists/chaplin-radio')]).then(results => {
      if (cancelled) return;
      const next = {}, status = {};
      ['personal', 'chaplin'].forEach((key, i) => {
        const result = results[i];
        next[key] = result.status === 'fulfilled' ? (result.value.data.tracks || []).map(shape).filter(t => t.src) : [];
        status[key] = result.status === 'rejected' ? (key === 'personal' && !user ? 'Inicia sesión para cargar tu lista personal.' : 'No se pudo cargar esta lista. Comprueba que el servidor está disponible.') : next[key].length ? '' : 'Esta lista todavía no tiene canciones.';
      });
      setLists(next); setMessages(status); setLoading(false);
      p.setPersonalPlaylist(next.personal); p.setChaplinRadioTracks(next.chaplin);
    });
    return () => { cancelled = true; };
  }, [user?.id]);
  const tracks = lists[source];
  const getAnalyser = useCallback(() => p.analyserRef.current, [p.analyserRef]);
  const start = async (index = 0, selectedSource = source) => {
    const list = lists[selectedSource];
    if (!list[index]) return;
    setError(''); p.replaceQueue(list, index); p.setActiveSource(selectedSource);
    const ok = await p.play(list[index].src, { ...list[index], queueIndex: index, fromQueue: true });
    if (!ok) setError('No se pudo reproducir este archivo. Comprueba su disponibilidad y vuelve a pulsar play.');
  };
  const belongs = p.activeSource === source && tracks.some(t => t.src === p.current?.src);
  const toggle = async () => {
    if (belongs && p.playing) p.pause();
    else if (belongs) { if (!await p.play(p.current.src, p.current)) setError('No se pudo reanudar el audio.'); }
    else await start();
  };
  const selectSource = key => {
    if (key === source) return;
    p.pause(); setSource(key); setError('');
  };
  return <main className="lc-demo">
    <h1>LIQUID CHROME</h1>
    <div className="lc-toolbar" aria-label="Fuente de música">
      <button aria-pressed={source === 'personal'} onClick={() => selectSource('personal')}>Mi lista personal · {lists.personal.length}</button>
      <button aria-pressed={source === 'chaplin'} onClick={() => selectSource('chaplin')}>Radio Chaplin · {lists.chaplin.length}</button>
      <Link to="/radio">Gestionar música</Link>
    </div>
    <LiquidChromeSkin track={belongs ? p.current : tracks[0]} isPlaying={belongs && p.playing} currentTime={belongs ? p.currentTime : 0} duration={belongs ? p.duration : 0} volume={p.muted ? 0 : p.volume} onTogglePlay={toggle} onPrev={() => belongs ? p.previous() : start(tracks.length - 1)} onNext={() => belongs ? p.next() : start(Math.min(1, tracks.length - 1))} hasQueue={tracks.length > 1} onSeek={p.seek} onVolumeChange={p.setVolume} getAnalyser={getAnalyser} />
    <p role="status">{error || messages[source] || `${tracks.length} canciones · Pantalla y espectro conectados al audio. Arrastra el mando horizontalmente o usa las flechas para ajustar el volumen.`}</p>
    <div className="lc-toolbar"><button onClick={() => p.toggleMute()} aria-pressed={p.muted}>Silencio</button><button onClick={() => p.toggleShuffle()} aria-pressed={p.shuffleEnabled}>Aleatorio</button><button onClick={() => p.cycleRepeatMode()}>Repetir: {p.repeatMode === 'off' ? 'no' : p.repeatMode === 'all' ? 'lista' : 'canción'}</button></div>
    {!loading && <ol className="lc-queue">{tracks.map((t, i) => <li key={`${t.id}-${i}`}><button aria-current={belongs && p.current?.src === t.src} onClick={() => start(i)}>{String(i + 1).padStart(2, '0')} · {t.title} — {t.artist}</button></li>)}</ol>}
  </main>;
}
