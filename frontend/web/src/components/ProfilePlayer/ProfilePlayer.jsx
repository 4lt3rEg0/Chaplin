import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import api from '../../services/api';
import { usePlayer } from '../../context/PlayerContext';
import { useSkin } from '../../context/SkinContext';
import { useAuth } from '../../context/AuthContext';
import { normalizeTrackSrc, areSameSrc } from '../../utils/mediaUrl';
import { PLAYER_SKINS, DEFAULT_PLAYER_SKIN, resolvePlayerPalette } from './reconstructed';

const MODE_LABELS = {
  all: 'Reproduciendo toda la música',
  favorites: 'Reproduciendo favoritas',
  radio: 'Radio Chaplin'
};

const Wrapper = styled.div`
  margin: 14px 0 22px;
  display: flex;
  justify-content: center;

  @media (max-width: 480px) {
    margin: 10px 0 16px;
  }
`;

/**
 * Independent, always-mounted-once-visited profile player. Owns its own
 * <audio> element (never touches the global PlayerContext's audio node) so it
 * can play alongside — or, per the no-overlap rule, instead of — whatever the
 * global player is doing. `previousPlaybackSnapshotRef` is the only bridge
 * back to the global player: it remembers exactly what to restore once the
 * profile listening session ends.
 *
 * "Profile listening" (isActive, toggled by the ear/LISTEN control) and
 * "playing" (isPlaying, toggled by the play/pause transport) are
 * deliberately separate: the play/pause button can pause the profile's own
 * audio without handing playback back to the global player — only the ear
 * control fully engages/disengages the handoff.
 */
export default function ProfilePlayer({ username, avatarUrl, skinIdOverride }) {
  const {
    current: globalCurrent,
    playing: globalPlaying,
    volume: globalVolume,
    pause: pauseGlobal,
    play: playGlobal,
    seek: seekGlobal,
    setVolume: setGlobalVolume
  } = usePlayer();
  const { playerSkinId: configuredSkinId, playerColorMode, playerCustomPalettes, appTheme } = useSkin();
  const playerSkinId = skinIdOverride || configuredSkinId;
  const usesSavedPlaylist = Boolean(PLAYER_SKINS[playerSkinId]?.livePlayback);
  const { user: authUser } = useAuth();
  const isOwner = Boolean(authUser?.username) && authUser.username === username;

  const [source, setSource] = useState(null); // { mode, owner_username, tracks }
  const [trackIndex, setTrackIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [playbackOrder, setPlaybackOrder] = useState('ordered');
  const [playbackError, setPlaybackError] = useState('');
  const cyclePlaybackOrder = () => setPlaybackOrder(previous => {
    const orders = ['ordered', 'one', 'all', 'shuffle'];
    return orders[(orders.indexOf(previous) + 1) % orders.length];
  });

  const audioElRef = useRef(null);
  if (!audioElRef.current && typeof window !== 'undefined') {
    audioElRef.current = new Audio();
    audioElRef.current.preload = 'none';
    audioElRef.current.volume = 0.8;
    // Required for createMediaElementSource() below to yield real (non-zeroed)
    // AnalyserNode data when the media route is cross-origin (5173 -> 8000 in
    // dev) — without it the browser silently zeroes analyser output as an
    // anti-fingerprinting measure, even though playback itself works fine.
    audioElRef.current.crossOrigin = 'anonymous';
  }

  const previousPlaybackSnapshotRef = useRef(null);
  const isActiveRef = useRef(false);
  isActiveRef.current = isActive;

  // Real Web Audio analyser, built lazily off the profile's own <audio>
  // element so skins can drive a genuine frequency-reactive visualizer
  // instead of a fake independent animation. Created at most once per
  // mount (an HTMLMediaElement can only ever get one
  // MediaElementAudioSourceNode) and resumed on every play — AudioContext
  // starts 'suspended' until a user gesture, and play() is always reached
  // from one (click/keyboard on the transport). Must route through to
  // ctx.destination or audio would go silent, since createMediaElementSource
  // detaches the element from its default output.
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const getAnalyser = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const audio = audioElRef.current;
    if (!audio) return null;
    if (!analyserRef.current) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        const ctx = new Ctx();
        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
      } catch {
        return null;
      }
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return analyserRef.current;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSource(null);
    setTrackIndex(0);
    setPlaybackError('');
    // Rendered skins play the saved personal playlist, not an unrelated
    // list of uploaded public tracks. Keep the existing visitor contract.
    const ownerMode = authUser?.profile_playback_mode || 'all';
    const ownSavedPlaylist = usesSavedPlaylist && isOwner;
    const endpoint = ownSavedPlaylist
      ? (ownerMode === 'radio' ? '/playlists/chaplin-radio' : '/playlists/mine/personal')
      : `/users/${encodeURIComponent(username)}/profile-playback`;
    api.get(endpoint)
      .then(({ data }) => {
        if (cancelled) return;
        if (ownSavedPlaylist) {
          const ownerTracks = data.tracks || [];
          setSource({ mode: ownerMode, owner_username: username, tracks: ownerMode === 'favorites' ? ownerTracks.filter(t => t.is_favorited) : ownerTracks });
        } else setSource(data);
      })
      .catch(() => {
        if (!cancelled) {
          setSource({ mode: 'all', owner_username: username, tracks: [] });
          setPlaybackError('No se pudo cargar la música. Comprueba tu sesión y la conexión.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [username, usesSavedPlaylist, isOwner, authUser?.profile_playback_mode]);

  const tracks = source?.tracks || [];
  const track = tracks[trackIndex] || null;
  const trackRef = useRef(track);
  trackRef.current = track;
  const mode = source?.mode || 'all';
  const modeLabel = MODE_LABELS[mode] || MODE_LABELS.all;
  const hasQueue = tracks.length > 1;

  // Update the mounted player after successful playlist edits.
  useEffect(() => {
    const updatePlaylist = (event) => {
      if (!usesSavedPlaylist || !isOwner) return;
      const ownerMode = authUser?.profile_playback_mode || 'all';
      if (event.detail?.kind !== (ownerMode === 'radio' ? 'radio' : 'personal')) return;
      const incoming = event.detail.tracks || [];
      const nextTracks = ownerMode === 'favorites' ? incoming.filter(t => t.is_favorited) : incoming;
      const nextIndex = nextTracks.findIndex(t => t.id === track?.id);
      if (nextIndex < 0) {
        audioElRef.current?.pause();
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
      }
      setTrackIndex(Math.max(0, nextIndex));
      setSource({ mode: ownerMode, owner_username: username, tracks: nextTracks });
    };
    window.addEventListener('chaplin-playlist-updated', updatePlaylist);
    return () => window.removeEventListener('chaplin-playlist-updated', updatePlaylist);
  }, [usesSavedPlaylist, isOwner, username, authUser?.profile_playback_mode, track?.id]);

  const stopOwnAudio = useCallback(() => {
    const audio = audioElRef.current;
    if (audio) {
      audio.pause();
    }
    setIsPlaying(false);
  }, []);

  const restoreGlobalPlayback = useCallback(() => {
    const snapshot = previousPlaybackSnapshotRef.current;
    previousPlaybackSnapshotRef.current = null;
    if (!snapshot) return;
    if (snapshot.wasPlaying && snapshot.src) {
      playGlobal(snapshot.src, snapshot.trackMeta, { silent: true });
    }
    if (typeof snapshot.volume === 'number') {
      setGlobalVolume(snapshot.volume);
    }
  }, [playGlobal, setGlobalVolume]);

  const playOwnTrackAt = useCallback((index) => {
    const target = tracks[index];
    const audio = audioElRef.current;
    if (!target || !audio) return;
    const resolvedSrc = normalizeTrackSrc(target.media_url || target.src);
    if (!resolvedSrc) { setPlaybackError('Esta canción no tiene un archivo de audio disponible.'); return; }
    setPlaybackError('');
    if (!areSameSrc(audio.src, resolvedSrc)) {
      setCurrentTime(0);
      setDuration(0);
      audio.src = resolvedSrc;
      audio.load();
    }
    getAnalyser();
    audio.play().then(() => setIsPlaying(true)).catch(() => {
      setIsPlaying(false); setPlaybackError('No se pudo reproducir el archivo. Pulsa play para reintentar.');
    });
    setTrackIndex(index);
  }, [tracks, getAnalyser]);

  const activate = useCallback(() => {
    if (isActiveRef.current || tracks.length === 0) return;
    previousPlaybackSnapshotRef.current = {
      src: globalCurrent?.src || null,
      trackMeta: globalCurrent || null,
      wasPlaying: globalPlaying,
      volume: globalVolume
    };
    pauseGlobal({ silent: true });
    isActiveRef.current = true;
    setIsActive(true);
    playOwnTrackAt(trackIndex);
  }, [tracks.length, globalCurrent, globalPlaying, globalVolume, pauseGlobal, playOwnTrackAt, trackIndex]);

  const deactivate = useCallback(() => {
    if (!isActiveRef.current) return;
    stopOwnAudio();
    setIsActive(false);
    restoreGlobalPlayback();
  }, [stopOwnAudio, restoreGlobalPlayback]);

  const toggleEar = useCallback(() => {
    if (isActiveRef.current) {
      deactivate();
    } else {
      activate();
    }
  }, [activate, deactivate]);

  // Distinct from the ear control: pauses/resumes the profile's own audio
  // without ever touching the global player's handoff/snapshot. If the
  // session isn't engaged yet, pressing play engages it (same as the ear).
  const togglePlayPause = useCallback(() => {
    if (!isActiveRef.current) {
      activate();
      return;
    }
    const audio = audioElRef.current;
    if (!audio) return;
    if (audio.paused) {
      getAnalyser();
      if (audio.ended) audio.currentTime = 0;
      setPlaybackError('');
      audio.play().then(() => setIsPlaying(true)).catch(() => setPlaybackError('No se pudo reanudar el audio.'));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [activate, getAnalyser]);

  const goToOffset = useCallback((offset) => {
    if (tracks.length === 0) return;
    const nextIndex = usesSavedPlaylist && playbackOrder === 'shuffle' && tracks.length > 1
      ? (trackIndex + 1 + Math.floor(Math.random() * (tracks.length - 1))) % tracks.length
      : (trackIndex + offset + tracks.length) % tracks.length;
    setTrackIndex(nextIndex);
    if (isActiveRef.current) {
      playOwnTrackAt(nextIndex);
    }
  }, [tracks.length, trackIndex, playOwnTrackAt, usesSavedPlaylist, playbackOrder]);

  // Absolute jump — backs any skin's real queue/playlist UI (e.g. a disc
  // player's eject-to-open-queue) rather than only relative prev/next.
  const selectTrack = useCallback((index) => {
    if (index < 0 || index >= tracks.length) return;
    setTrackIndex(index);
    if (isActiveRef.current) {
      playOwnTrackAt(index);
    }
  }, [tracks.length, playOwnTrackAt]);

  const handleSeek = useCallback((time) => {
    const audio = audioElRef.current;
    if (!audio || !Number.isFinite(time) || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const target = Math.max(0, Math.min(time, audio.duration));
    audio.currentTime = target;
    setCurrentTime(target);
  }, []);

  const handleVolumeChange = useCallback((next) => {
    if (!Number.isFinite(next)) return;
    const clamped = Math.max(0, Math.min(1, next));
    const audio = audioElRef.current;
    if (audio) audio.volume = clamped;
    setVolume(clamped);
  }, []);

  // Real, persisted favorite flag (Track.is_favorited) — only the profile's
  // owner is authorized to change it (backend enforces this too, 403 otherwise).
  // Visitors still see the current state; the control is just non-interactive.
  const toggleFavorite = useCallback(() => {
    if (!isOwner || !track) return;
    const next = !track.is_favorited;
    setSource((prev) => (prev ? {
      ...prev,
      tracks: prev.tracks.map((t, i) => (i === trackIndex ? { ...t, is_favorited: next } : t))
    } : prev));
    api.put(`/tracks/${track.id}`, { is_favorited: next }).catch(() => {
      setSource((prev) => (prev ? {
        ...prev,
        tracks: prev.tracks.map((t, i) => (i === trackIndex ? { ...t, is_favorited: !next } : t))
      } : prev));
    });
  }, [isOwner, track, trackIndex]);

  // Leaving the profile (unmount) or switching to a different profile
  // (username change) must never leave the profile audio "ghosting" in the
  // background. Previously this always called restoreGlobalPlayback(),
  // which only resumes whatever was playing globally BEFORE the ear was
  // engaged — usually nothing, so navigating away while a profile track
  // was actively playing just killed the music outright. Now: if the
  // profile's own audio was really playing at the moment of teardown, hand
  // that exact track/position off to the global player instead, so it
  // keeps going across navigation like any normal persistent player.
  useEffect(() => {
    return () => {
      if (isActiveRef.current) {
        const audio = audioElRef.current;
        const wasPlaying = Boolean(audio && !audio.paused && !audio.ended);
        const ownTrack = trackRef.current;
        const ownSrc = audio?.src || null;
        const ownTime = audio?.currentTime || 0;
        stopOwnAudio();
        setIsActive(false);
        if (wasPlaying && ownTrack && ownSrc) {
          playGlobal(ownSrc, ownTrack, { silent: true }).then((ok) => {
            if (ok) seekGlobal(ownTime, { silent: true });
          });
        } else {
          restoreGlobalPlayback();
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, usesSavedPlaylist, isOwner, authUser?.profile_playback_mode]);

  // Preload only metadata so the seek slider can be used before first play.
  // Legacy skins retain their original loading policy.
  useEffect(() => {
    if (!usesSavedPlaylist) return;
    const audio = audioElRef.current;
    const src = normalizeTrackSrc(track?.media_url || track?.src);
    if (!audio || !src || areSameSrc(audio.src, src)) return;
    audio.preload = 'metadata';
    audio.src = src;
    setCurrentTime(0); setDuration(0);
    audio.load();
  }, [usesSavedPlaylist, track?.media_url, track?.src]);

  useEffect(() => {
    const audio = audioElRef.current;
    if (!audio) return undefined;
    const onEnded = () => {
      if (usesSavedPlaylist) {
        if (playbackOrder === 'one') {
          audio.currentTime = 0; playOwnTrackAt(trackIndex); return;
        }
        if (playbackOrder === 'all') {
          audio.currentTime = 0; goToOffset(1); return;
        }
        if (playbackOrder === 'shuffle' && tracks.length > 1) { goToOffset(1); return; }
        // 'ordered' (the default): keep advancing through the list and
        // loop back to the start instead of stopping dead after the last
        // track — a profile player should keep playing on its own, not
        // require the visitor to press play again every time it reaches
        // the end of the list.
        goToOffset(1); return;
      }
      if (tracks.length <= 1) {
        setIsPlaying(false);
        return;
      }
      goToOffset(1);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onLoadedMetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlaying = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => { setIsPlaying(false); setPlaybackError('El archivo de audio no está disponible.'); };
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => {
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks.length, goToOffset, usesSavedPlaylist, playbackOrder, playOwnTrackAt, trackIndex]);

  // Full teardown on real unmount (component leaving the tree entirely) —
  // guards against the audio element surviving via a stale ref.
  useEffect(() => () => {
    audioElRef.current?.pause();
    audioCtxRef.current?.close().catch(() => {});
  }, []);

  const ariaLabel = useMemo(() => (
    isActive ? 'Detener reproducción del perfil' : 'Escuchar la música de este perfil'
  ), [isActive]);

  const skinEntry = PLAYER_SKINS[playerSkinId] || PLAYER_SKINS[DEFAULT_PLAYER_SKIN];
  const palette = useMemo(
    () => (skinEntry ? resolvePlayerPalette(skinEntry.id, playerColorMode, playerCustomPalettes, appTheme) : null),
    [skinEntry, playerColorMode, playerCustomPalettes, appTheme]
  );

  if (!source || !skinEntry) {
    return null;
  }

  const SkinComponent = skinEntry.component;

  return (
    <Wrapper data-profile-player>
      <SkinComponent
        manifest={skinEntry}
        avatarUrl={avatarUrl}
        track={track}
        mode={mode}
        modeLabel={modeLabel}
        isActive={isActive}
        isPlaying={isPlaying}
        hasQueue={hasQueue}
        onToggleEar={toggleEar}
        onTogglePlay={togglePlayPause}
        onPrev={() => goToOffset(-1)}
        onNext={() => goToOffset(1)}
        ariaLabel={ariaLabel}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        onSeek={handleSeek}
        isFavorited={Boolean(track?.is_favorited)}
        canFavorite={isOwner}
        onToggleFavorite={toggleFavorite}
        queue={tracks}
        queueIndex={trackIndex}
        onSelectTrack={selectTrack}
        palette={palette}
        getAnalyser={getAnalyser}
        playbackOrder={playbackOrder}
        onCyclePlaybackOrder={cyclePlaybackOrder}
        playbackError={playbackError}
      />
    </Wrapper>
  );
}
