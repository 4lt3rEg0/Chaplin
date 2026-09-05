import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import api from '../../services/api';
import { usePlayer } from '../../context/PlayerContext';
import { useSkin } from '../../context/SkinContext';
import { normalizeTrackSrc, areSameSrc } from '../../utils/mediaUrl';
import { PLAYER_SKINS, DEFAULT_PLAYER_SKIN, resolvePlayerPalette } from './skins';

const MODE_LABELS = {
  all: 'Reproduciendo toda la música',
  favorites: 'Reproduciendo favoritas',
  radio: 'Radio Chaplin'
};

const Wrapper = styled.div`
  margin: 14px 0 22px;

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
 * "playing" (isPlaying, toggled by the skin's own play/pause transport) are
 * deliberately separate: a skin's play/pause button can pause the profile's
 * own audio without handing playback back to the global player — only the
 * ear control fully engages/disengages the handoff.
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
  const { playerSkinId, playerColorMode, playerCustomPalettes, appTheme } = useSkin();

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
    const clamped = Math.max(0, Math.min(1, next));
    const audio = audioElRef.current;
    if (audio) audio.volume = clamped;
    setVolume(clamped);
  }, []);

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

  const skinEntry = PLAYER_SKINS[playerSkinId] || PLAYER_SKINS[DEFAULT_PLAYER_SKIN];
  const SkinComponent = skinEntry.component;
  const palette = useMemo(
    () => resolvePlayerPalette(skinEntry.id, playerColorMode, playerCustomPalettes, appTheme),
    [skinEntry.id, playerColorMode, playerCustomPalettes, appTheme]
  );

  const ariaLabel = useMemo(() => (
    isActive ? 'Detener reproducción del perfil' : 'Escuchar la música de este perfil'
  ), [isActive]);

  if (!source) {
    return null;
  }

  return (
    <Wrapper data-profile-player>
      <SkinComponent
        track={track}
        mode={mode}
        modeLabel={modeLabel}
        isActive={isActive}
        isPlaying={isPlaying}
        hasQueue={tracks.length > 1}
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
        palette={palette}
      />
    </Wrapper>
  );
}
