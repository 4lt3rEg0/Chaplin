import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import { Ear, Heart, Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import api from '../../services/api';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import { normalizeTrackSrc, areSameSrc } from '../../utils/mediaUrl';

const MODE_LABELS = {
  all: 'Reproduciendo toda la música',
  favorites: 'Reproduciendo favoritas',
  radio: 'Radio Chaplin'
};

const fmtTime = (value) => {
  if (!Number.isFinite(value)) return '00:00';
  const safe = Math.max(0, Math.floor(value));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const Wrapper = styled.div`
  margin: 14px 0 22px;
  padding: 14px 16px;
  border-radius: 12px;
  background: ${({ theme }) => theme.card?.bg || 'rgba(255,255,255,0.04)'};
  border: 1px solid ${({ theme }) => theme.card?.border || theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 480px) {
    margin: 10px 0 16px;
    padding: 10px 12px;
    gap: 8px;
  }
`;

const InfoRow = styled.div`
  min-width: 0;
`;

const TrackTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TrackSub = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textSecondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
`;

const ProgressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-variant-numeric: tabular-nums;
`;

const ProgressTrack = styled.div`
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: ${({ theme }) => theme.colors.border};
  cursor: pointer;
  position: relative;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  position: absolute;
  inset: 0;
  width: ${({ $pct }) => $pct}%;
  background: ${({ theme }) => theme.colors.primary};
`;

const ControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const IconButton = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt || 'transparent'};
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;

  &:hover:not(:disabled) { border-color: ${({ theme }) => theme.colors.primary}; }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const PlayButton = styled(IconButton)`
  width: 38px;
  height: 38px;
  background: ${({ theme }) => theme.colors.primary};
  border-color: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.background};
`;

const ListenButton = styled(IconButton)`
  ${({ $active, theme }) => $active && `
    background: ${theme.colors.primary};
    border-color: ${theme.colors.primary};
    color: ${theme.colors.background};
  `}
`;

const FavoriteButton = styled(IconButton)`
  ${({ $on, theme }) => $on && `color: ${theme.colors.primary}; border-color: ${theme.colors.primary};`}
`;

const VolumeGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;

  @media (max-width: 480px) {
    display: none;
  }
`;

const VolumeSlider = styled.input`
  width: 70px;
  accent-color: ${({ theme }) => theme.colors.primary};
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
export default function ProfilePlayer({ username }) {
  const {
    current: globalCurrent,
    playing: globalPlaying,
    volume: globalVolume,
    pause: pauseGlobal,
    play: playGlobal,
    setVolume: setGlobalVolume
  } = usePlayer();
  const { user: authUser } = useAuth();
  const isOwner = Boolean(authUser?.username) && authUser.username === username;

  const [source, setSource] = useState(null); // { mode, owner_username, tracks }
  const [trackIndex, setTrackIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  const audioElRef = useRef(null);
  if (!audioElRef.current && typeof window !== 'undefined') {
    audioElRef.current = new Audio();
    audioElRef.current.preload = 'none';
    audioElRef.current.volume = 0.8;
  }

  const previousPlaybackSnapshotRef = useRef(null);
  const isActiveRef = useRef(false);
  isActiveRef.current = isActive;

  useEffect(() => {
    let cancelled = false;
    setSource(null);
    setTrackIndex(0);

    api.get(`/users/${encodeURIComponent(username)}/profile-playback`)
      .then(({ data }) => {
        if (!cancelled) setSource(data);
      })
      .catch(() => {
        if (!cancelled) setSource({ mode: 'all', owner_username: username, tracks: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  const tracks = source?.tracks || [];
  const track = tracks[trackIndex] || null;
  const mode = source?.mode || 'all';
  const modeLabel = MODE_LABELS[mode] || MODE_LABELS.all;
  const hasQueue = tracks.length > 1;

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
    const resolvedSrc = normalizeTrackSrc(target.media_url);
    if (!areSameSrc(audio.src, resolvedSrc)) {
      audio.src = resolvedSrc;
      audio.load();
    }
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    setTrackIndex(index);
  }, [tracks]);

  const activate = useCallback(() => {
    if (isActiveRef.current || tracks.length === 0) return;
    previousPlaybackSnapshotRef.current = {
      src: globalCurrent?.src || null,
      trackMeta: globalCurrent || null,
      wasPlaying: globalPlaying,
      volume: globalVolume
    };
    pauseGlobal({ silent: true });
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
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [activate]);

  const goToOffset = useCallback((offset) => {
    if (tracks.length === 0) return;
    const nextIndex = (trackIndex + offset + tracks.length) % tracks.length;
    setTrackIndex(nextIndex);
    if (isActiveRef.current) {
      playOwnTrackAt(nextIndex);
    }
  }, [tracks.length, trackIndex, playOwnTrackAt]);

  const handleSeek = useCallback((time) => {
    const audio = audioElRef.current;
    if (!audio || !Number.isFinite(time)) return;
    audio.currentTime = time;
    setCurrentTime(time);
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
  // background — always tear down and hand playback control back globally.
  useEffect(() => {
    return () => {
      if (isActiveRef.current) {
        stopOwnAudio();
        setIsActive(false);
        restoreGlobalPlayback();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  useEffect(() => {
    const audio = audioElRef.current;
    if (!audio) return undefined;
    const onEnded = () => {
      if (tracks.length <= 1) {
        setIsPlaying(false);
        return;
      }
      goToOffset(1);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onLoadedMetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks.length, goToOffset]);

  // Full teardown on real unmount (component leaving the tree entirely) —
  // guards against the audio element surviving via a stale ref.
  useEffect(() => () => {
    audioElRef.current?.pause();
  }, []);

  const ariaLabel = useMemo(() => (
    isActive ? 'Detener reproducción del perfil' : 'Escuchar la música de este perfil'
  ), [isActive]);

  const progressRef = useRef(null);
  const seekFromClientX = (clientX) => {
    const el = progressRef.current;
    if (!el || !duration) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    handleSeek(ratio * duration);
  };
  const progressPct = duration > 0 ? Math.min(1, currentTime / duration) * 100 : 0;
  const playing = isActive && isPlaying;

  if (!source) {
    return null;
  }

  return (
    <Wrapper data-profile-player>
      <InfoRow>
        {track ? (
          <>
            <TrackTitle title={track.title}>{track.title}</TrackTitle>
            <TrackSub>{modeLabel}{track.owner_username ? ` · ${track.owner_username}` : ''}</TrackSub>
          </>
        ) : (
          <TrackSub>{mode === 'favorites' ? 'Sin favoritas' : mode === 'radio' ? 'Radio sin señal' : 'Sin audio disponible'}</TrackSub>
        )}
      </InfoRow>

      <ProgressRow>
        <span>{fmtTime(currentTime)}</span>
        <ProgressTrack
          ref={progressRef}
          role="slider"
          aria-label="Progreso"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={currentTime}
          onClick={(e) => seekFromClientX(e.clientX)}
        >
          <ProgressFill $pct={progressPct} />
        </ProgressTrack>
        <span>{fmtTime(duration)}</span>
      </ProgressRow>

      <ControlRow>
        <IconButton type="button" onClick={() => goToOffset(-1)} disabled={!hasQueue} aria-label="Anterior">
          <SkipBack size={14} />
        </IconButton>
        <PlayButton type="button" onClick={togglePlayPause} disabled={!track} aria-label={playing ? 'Pausar' : 'Reproducir'}>
          {playing ? <Pause size={17} /> : <Play size={17} />}
        </PlayButton>
        <IconButton type="button" onClick={() => goToOffset(1)} disabled={!hasQueue} aria-label="Siguiente">
          <SkipForward size={14} />
        </IconButton>
        <ListenButton type="button" onClick={toggleEar} $active={isActive} aria-label={ariaLabel} aria-pressed={isActive} title="Escuchar perfil">
          <Ear size={14} />
        </ListenButton>
        <FavoriteButton
          type="button"
          onClick={toggleFavorite}
          disabled={!isOwner || !track}
          $on={Boolean(track?.is_favorited)}
          aria-pressed={Boolean(track?.is_favorited)}
          aria-label="Favorito"
          title={isOwner ? 'Favorito' : 'Solo el dueño puede marcar favoritos'}
        >
          <Heart size={14} fill={track?.is_favorited ? 'currentColor' : 'none'} />
        </FavoriteButton>

        <VolumeGroup>
          <Volume2 size={14} />
          <VolumeSlider
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => handleVolumeChange(Number(e.target.value) / 100)}
            aria-label="Volumen"
          />
        </VolumeGroup>
      </ControlRow>
    </Wrapper>
  );
}
