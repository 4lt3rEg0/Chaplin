import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { normalizeTrackSrc, areSameSrc } from "../utils/mediaUrl";

const PlayerContext = createContext(null);

const PERSONAL_KEY = "chaplin_personal_playlist";
const CHAPLIN_KEY = "chaplin_radio_playlist";
const PLAYER_SYNC_KEY = "chaplin_player_sync_event";
const PLAYER_OWNER_KEY = "chaplin_player_owner";
const ENABLE_PLAYER_SYNC = true;
const SYNC_ALLOWED_EVENT_TYPES = new Set(["STOP_AUDIO", "TIME"]);

const EMPTY_VISUALIZER_STATE = Object.freeze({
  sub: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, air: 0,
  rms: 0, centroid: 0.28, flux: 0, kick: 0, snare: 0,
  highTransient: 0, pulse: 0, beat: 0, trackProgress: 0, active: false
});

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const sanitizeVisualizerState = (value = {}) => ({
  ...EMPTY_VISUALIZER_STATE,
  ...Object.fromEntries(
    Object.keys(EMPTY_VISUALIZER_STATE)
      .filter((key) => key !== "active")
      .map((key) => [key, Number.isFinite(Number(value[key])) ? clamp01(Number(value[key])) : EMPTY_VISUALIZER_STATE[key]])
  ),
  active: Boolean(value.active)
});

const safeJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const readPlaylist = (key) => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(key);
  return raw ? safeJson(raw, []) : [];
};

const writePlaylist = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
};

export const PlayerProvider = ({ children }) => {
  const tabIdRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const channelRef = useRef(null);
  const applyingRemoteRef = useRef(false);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const rafRef = useRef(0);
  const analyserRef = useRef({
    frequencyBinCount: 64,
    getByteFrequencyData: (array) => {
      if (!array) return;
      array.fill(0);
    }
  });
  const visualizerStateRef = useRef({ ...EMPTY_VISUALIZER_STATE });

  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [sessionPlaying, setSessionPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [forcedFollowerMute, setForcedFollowerMute] = useState(false);
  const [playbackOwner, setPlaybackOwner] = useState(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(PLAYER_OWNER_KEY);
  });
  const [repeatMode, setRepeatMode] = useState("off");
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [activeSource, setActiveSource] = useState("personal");
  const [personalPlaylist, setPersonalPlaylist] = useState(() => readPlaylist(PERSONAL_KEY));
  const [chaplinRadioTracks, setChaplinRadioTracks] = useState(() => readPlaylist(CHAPLIN_KEY));
  const queueRef = useRef([]);
  const queueIndexRef = useRef(0);
  const repeatModeRef = useRef("off");
  const shuffleEnabledRef = useRef(false);
  const currentRef = useRef(null);
  const lastTimeBroadcastRef = useRef(0);
  const playbackOwnerRef = useRef(playbackOwner);
  const playingRef = useRef(playing);
  const remoteVisualizerRef = useRef({ ...EMPTY_VISUALIZER_STATE });
  const ignoreNextPauseStateRef = useRef(false);
  const personalPlaylistRef = useRef(personalPlaylist);
  const chaplinRadioTracksRef = useRef(chaplinRadioTracks);
  const mutedRef = useRef(muted);
  const durationRef = useRef(duration);

  const isLocalOwner = useCallback(() => (
    !ENABLE_PLAYER_SYNC || !playbackOwnerRef.current || playbackOwnerRef.current === tabIdRef.current
  ), []);

  const broadcastCommand = useCallback((type, payload = {}) => {
    if (!ENABLE_PLAYER_SYNC) return;
    if (!SYNC_ALLOWED_EVENT_TYPES.has(type)) return;
    const event = {
      type,
      payload,
      source: tabIdRef.current,
      at: Date.now()
    };

    if (channelRef.current) {
      channelRef.current.postMessage(event);
      return;
    }

    try {
      window.localStorage.setItem(PLAYER_SYNC_KEY, JSON.stringify(event));
    } catch {
      // ignore
    }
  }, []);

  const claimPlaybackOwnership = useCallback((ownerId = tabIdRef.current) => {
    if (!ENABLE_PLAYER_SYNC) {
      setPlaybackOwner(tabIdRef.current);
      return;
    }

    setPlaybackOwner(ownerId);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(PLAYER_OWNER_KEY, ownerId);
      } catch {
        // ignore storage errors
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    if (!ENABLE_PLAYER_SYNC) {
      setPlaybackOwner(tabIdRef.current);
      setForcedFollowerMute(false);
      return undefined;
    }

    if ("BroadcastChannel" in window) {
      channelRef.current = new BroadcastChannel("chaplin-player-sync");
    }

    const onCommand = async (event) => {
      if (!event || event.source === tabIdRef.current) return;
      if (!SYNC_ALLOWED_EVENT_TYPES.has(event.type)) return;
      applyingRemoteRef.current = true;
      try {
        switch (event.type) {
          case "STOP_AUDIO":
            if (audioRef.current && !audioRef.current.paused) {
              ignoreNextPauseStateRef.current = true;
              audioRef.current.pause();
            }
            break;
          case "TIME":
            setCurrentTime(event.payload.currentTime || 0);
            if (typeof event.payload.duration === "number") {
              setDuration(event.payload.duration);
            }
            if (event.payload.energy && typeof event.payload.energy === "object") {
              remoteVisualizerRef.current = sanitizeVisualizerState(event.payload.energy);
            }
            break;
          default:
            break;
        }
      } finally {
        applyingRemoteRef.current = false;
      }
    };

    const onMessage = (msgEvent) => {
      onCommand(msgEvent.data);
    };

    const onStorage = (storageEvent) => {
      if (!storageEvent.key || !storageEvent.newValue) return;

      if (storageEvent.key === PLAYER_SYNC_KEY) {
        try {
          onCommand(JSON.parse(storageEvent.newValue));
        } catch {
          // ignore malformed payload
        }
        return;
      }

      if (storageEvent.key === PLAYER_OWNER_KEY) {
        const nextOwner = storageEvent.newValue || null;
        setPlaybackOwner(nextOwner);
        return;
      }

      if (storageEvent.key === PERSONAL_KEY) {
        setPersonalPlaylist(readPlaylist(PERSONAL_KEY));
        return;
      }

      if (storageEvent.key === CHAPLIN_KEY) {
        setChaplinRadioTracks(readPlaylist(CHAPLIN_KEY));
      }
    };

    channelRef.current?.addEventListener("message", onMessage);
    window.addEventListener("storage", onStorage);

    return () => {
      channelRef.current?.removeEventListener("message", onMessage);
      channelRef.current?.close();
      channelRef.current = null;
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    writePlaylist(PERSONAL_KEY, personalPlaylist);
  }, [personalPlaylist]);

  useEffect(() => {
    writePlaylist(CHAPLIN_KEY, chaplinRadioTracks);
  }, [chaplinRadioTracks]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    queueIndexRef.current = queueIndex;
  }, [queueIndex]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    shuffleEnabledRef.current = shuffleEnabled;
  }, [shuffleEnabled]);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    playbackOwnerRef.current = playbackOwner;
  }, [playbackOwner]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    personalPlaylistRef.current = personalPlaylist;
  }, [personalPlaylist]);

  useEffect(() => {
    chaplinRadioTracksRef.current = chaplinRadioTracks;
  }, [chaplinRadioTracks]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = volume;
    audioRef.current = audio;

    const AudioContextImpl = window.AudioContext || window.webkitAudioContext;
    if (AudioContextImpl) {
      const context = new AudioContextImpl();
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.68;
      const source = context.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(context.destination);
      audioContextRef.current = context;
      analyserRef.current = analyser;
    }

    const frequencyData = new Uint8Array(analyserRef.current.frequencyBinCount || 1024);
    const timeData = new Uint8Array(analyserRef.current.fftSize || 2048);
    const previousSpectrum = new Float32Array(frequencyData.length);
    let kickEnvelope = 0;
    let snareEnvelope = 0;
    let transientEnvelope = 0;
    let previousBass = 0;
    let previousHighMid = 0;
    const localState = { ...EMPTY_VISUALIZER_STATE };

    const sampleEnergy = () => {
      const analyser = analyserRef.current;
      if (!analyser || !analyser.frequencyBinCount) {
        rafRef.current = window.requestAnimationFrame(sampleEnergy);
        return;
      }

      analyser.getByteFrequencyData(frequencyData);
      analyser.getByteTimeDomainData(timeData);

      const nyquist = (audioContextRef.current?.sampleRate || 48000) * 0.5;
      const binForHz = (hz) => Math.max(0, Math.min(frequencyData.length - 1, Math.round((hz / nyquist) * frequencyData.length)));
      const band = (lowHz, highHz) => {
        const start = binForHz(lowHz);
        const end = Math.max(start + 1, binForHz(highHz));
        let total = 0;
        for (let index = start; index < end; index += 1) {
          total += frequencyData[index];
        }
        return clamp01(total / Math.max(1, end - start) / 255);
      };

      const sub = band(20, 60);
      const bass = band(60, 180);
      const lowMid = band(180, 500);
      const mid = band(500, 2000);
      const highMid = band(2000, 6000);
      const treble = band(6000, 12000);
      const air = band(12000, 20000);

      let squareSum = 0;
      for (let index = 0; index < timeData.length; index += 1) {
        const sample = (timeData[index] - 128) / 128;
        squareSum += sample * sample;
      }
      const rms = clamp01(Math.sqrt(squareSum / Math.max(1, timeData.length)) * 2.4);

      let weightedFrequency = 0;
      let spectralMass = 0;
      let positiveFlux = 0;
      for (let index = 1; index < frequencyData.length; index += 1) {
        const magnitude = frequencyData[index] / 255;
        spectralMass += magnitude;
        weightedFrequency += magnitude * index;
        positiveFlux += Math.max(0, magnitude - previousSpectrum[index]);
        previousSpectrum[index] = magnitude;
      }
      const centroid = spectralMass > 0 ? clamp01((weightedFrequency / spectralMass) / frequencyData.length * 2.2) : 0.28;
      const flux = clamp01(positiveFlux / frequencyData.length * 8.0);

      const bassAttack = Math.max(0, bass - previousBass);
      const highMidAttack = Math.max(0, highMid - previousHighMid);
      previousBass = bass;
      previousHighMid = highMid;
      kickEnvelope = Math.max(kickEnvelope * 0.86, clamp01(bassAttack * 7.5 + sub * 0.42 - mid * 0.12));
      snareEnvelope = Math.max(snareEnvelope * 0.80, clamp01(highMidAttack * 6.2 + highMid * 0.28 - sub * 0.08));
      transientEnvelope = Math.max(transientEnvelope * 0.74, clamp01(flux * 1.35 + treble * 0.18));
      const pulse = clamp01(sub * 0.24 + bass * 0.30 + lowMid * 0.18 + mid * 0.13 + highMid * 0.08 + rms * 0.22);
      const beat = clamp01(kickEnvelope * 0.72 + snareEnvelope * 0.28);
      const trackProgress = clamp01((audio.currentTime || 0) / Math.max(1, audio.duration || 0));

      localState.sub = sub;
      localState.bass = bass;
      localState.lowMid = lowMid;
      localState.mid = mid;
      localState.highMid = highMid;
      localState.treble = treble;
      localState.air = air;
      localState.rms = rms;
      localState.centroid = centroid;
      localState.flux = flux;
      localState.kick = kickEnvelope;
      localState.snare = snareEnvelope;
      localState.highTransient = transientEnvelope;
      localState.pulse = pulse;
      localState.beat = beat;
      localState.trackProgress = trackProgress;
      localState.active = !audio.paused;

      const isOwner = playbackOwnerRef.current === tabIdRef.current;
      if (!ENABLE_PLAYER_SYNC || isOwner) {
        visualizerStateRef.current = localState;
      } else {
        remoteVisualizerRef.current.active = playingRef.current;
        visualizerStateRef.current = remoteVisualizerRef.current;
      }

      rafRef.current = window.requestAnimationFrame(sampleEnergy);
    };

    rafRef.current = window.requestAnimationFrame(sampleEnergy);

    const onTime = () => {
      const nowTime = audio.currentTime || 0;
      setCurrentTime(nowTime);
      if (ENABLE_PLAYER_SYNC && playbackOwnerRef.current === tabIdRef.current) {
        const now = Date.now();
        if (now - lastTimeBroadcastRef.current > 220) {
          lastTimeBroadcastRef.current = now;
          const energy = visualizerStateRef.current || {};
          broadcastCommand("TIME", {
            currentTime: nowTime,
            duration: Number.isFinite(audio.duration) ? audio.duration : 0,
            energy: sanitizeVisualizerState({ ...energy, active: !audio.paused })
          });
        }
      }
    };

    const onDuration = () => setDuration(audio.duration || 0);
    const onPlay = () => {
      setPlaying(true);
      setSessionPlaying(true);
    };
    const onPause = () => {
      if (ignoreNextPauseStateRef.current) {
        ignoreNextPauseStateRef.current = false;
        return;
      }
      setPlaying(false);
      setSessionPlaying(false);
    };
    const onEnded = () => {
      const queueNow = queueRef.current || [];
      const queueIndexNow = queueIndexRef.current || 0;
      const repeatModeNow = repeatModeRef.current || "off";
      const shuffleNow = shuffleEnabledRef.current;
      const currentNow = currentRef.current;

      if (repeatModeNow === "one" && queueNow.length) {
        const track = queueNow[queueIndexNow] || currentNow;
        if (track?.src) {
          play(track.src, { ...track, queueIndex: queueIndexNow, fromQueue: true }, { silent: true });
          return;
        }
      }

      if (!queueNow.length) {
        setPlaying(false);
        setSessionPlaying(false);
        return;
      }

      const randomIndex = () => {
        if (queueNow.length <= 1) return queueIndexNow;
        let idx = queueIndexNow;
        while (idx === queueIndexNow) {
          idx = Math.floor(Math.random() * queueNow.length);
        }
        return idx;
      };

      const nextIndex = shuffleNow
        ? randomIndex()
        : queueIndexNow + 1;

      const hasNext = shuffleNow || nextIndex < queueNow.length;
      if (hasNext) {
        const finalIndex = shuffleNow
          ? nextIndex
          : (nextIndex < queueNow.length ? nextIndex : 0);
        if (!shuffleNow && nextIndex >= queueNow.length && repeatModeNow !== "all") {
          setPlaying(false);
          setSessionPlaying(false);
          return;
        }

        const nextTrack = queueNow[finalIndex];
        if (nextTrack) {
          setQueueIndex(finalIndex);
          play(nextTrack.src, { ...nextTrack, queueIndex: finalIndex, fromQueue: true }, { silent: true });
          return;
        }
      } else {
        setPlaying(false);
        setSessionPlaying(false);
      }
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close();
      }
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
    // Intentionally mount once: transport state is read via refs to avoid recreating audio engine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setForcedFollowerMute(false);
  }, [playbackOwner]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
  }, [volume, muted, forcedFollowerMute]);

  const play = useCallback(async (src, trackMeta = {}, options = {}) => {
    const { silent = false } = options;
    const audio = audioRef.current;
    if (!audio || !src) return false;
    const resolvedSrc = normalizeTrackSrc(src);

    if (!silent && !applyingRemoteRef.current) {
      claimPlaybackOwnership(tabIdRef.current);
      broadcastCommand("STOP_AUDIO");
    }

    if (audioContextRef.current?.state === "suspended") {
      try {
        await audioContextRef.current.resume();
      } catch {
        // ignore resume errors
      }
    }

    if (!areSameSrc(audio.src, resolvedSrc)) {
      audio.src = resolvedSrc;
      audio.load();
    }

    try {
      await audio.play();
      setPlaying(true);
      setSessionPlaying(true);
      setCurrent({
        id: trackMeta.id ?? resolvedSrc,
        src: resolvedSrc,
        title: trackMeta.title || trackMeta.content || "Untitled Track",
        artist: trackMeta.artist || trackMeta.owner_username || "Chaplin",
        ...trackMeta
      });
      if (typeof trackMeta.queueIndex === "number") {
        setQueueIndex(trackMeta.queueIndex);
      }

      if (!silent && !applyingRemoteRef.current) {
        broadcastCommand("PLAY", { src: resolvedSrc, trackMeta: { ...trackMeta, src: resolvedSrc } });
      }
      return true;
    } catch {
      try {
        await new Promise((resolve) => setTimeout(resolve, 120));
        await audio.play();
        if (!silent && !applyingRemoteRef.current) {
          broadcastCommand("PLAY", { src: resolvedSrc, trackMeta: { ...trackMeta, src: resolvedSrc } });
        }
        return true;
      } catch {
        setPlaying(false);
        setSessionPlaying(false);
        return false;
      }
    }
  }, [claimPlaybackOwnership, broadcastCommand]);

  const pause = useCallback((options = {}) => {
    const { silent = false } = options;
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
    setSessionPlaying(false);
    visualizerStateRef.current = {
      ...visualizerStateRef.current,
      active: false,
      pulse: 0
    };

    if (!silent && !applyingRemoteRef.current) {
      broadcastCommand("PAUSE");
    }
  }, [broadcastCommand]);

  const next = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (ENABLE_PLAYER_SYNC && !silent && !isLocalOwner()) {
      broadcastCommand("NEXT");
      return;
    }
    const queueNow = queueRef.current;
    const queueIndexNow = queueIndexRef.current;
    if (!queueNow.length) return;

    const nextIndex = shuffleEnabledRef.current
      ? (queueNow.length <= 1 ? queueIndexNow : (() => {
        let idx = queueIndexNow;
        while (idx === queueIndexNow) {
          idx = Math.floor(Math.random() * queueNow.length);
        }
        return idx;
      })())
      : (queueIndexNow + 1 >= queueNow.length ? (repeatModeRef.current === "all" ? 0 : queueNow.length - 1) : queueIndexNow + 1);

    const track = queueNow[nextIndex];
    setQueueIndex(nextIndex);
    await play(track.src, { ...track, queueIndex: nextIndex, fromQueue: true }, { silent: true });

    if (!silent && !applyingRemoteRef.current) {
      broadcastCommand("NEXT");
    }
  }, [isLocalOwner, broadcastCommand, play]);

  const previous = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (ENABLE_PLAYER_SYNC && !silent && !isLocalOwner()) {
      broadcastCommand("PREVIOUS");
      return;
    }
    const queueNow = queueRef.current;
    const queueIndexNow = queueIndexRef.current;
    if (!queueNow.length) return;
    const prevIndex = queueIndexNow - 1 < 0
      ? (repeatModeRef.current === "all" ? queueNow.length - 1 : 0)
      : queueIndexNow - 1;
    const track = queueNow[prevIndex];
    setQueueIndex(prevIndex);
    await play(track.src, { ...track, queueIndex: prevIndex, fromQueue: true }, { silent: true });

    if (!silent && !applyingRemoteRef.current) {
      broadcastCommand("PREVIOUS");
    }
  }, [isLocalOwner, broadcastCommand, play]);

  const seek = useCallback((seconds, options = {}) => {
    const { silent = false } = options;
    if (ENABLE_PLAYER_SYNC && !silent && !isLocalOwner()) {
      const targetFollower = Math.max(0, Number(seconds) || 0);
      setCurrentTime(targetFollower);
      broadcastCommand("SEEK", { seconds: targetFollower });
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    const target = Math.max(0, Math.min(Number(seconds) || 0, durationRef.current || 0));
    audio.currentTime = target;
    setCurrentTime(target);

    if (!silent && !applyingRemoteRef.current) {
      broadcastCommand("SEEK", { seconds: target });
    }
  }, [isLocalOwner, broadcastCommand]);

  const replaceQueue = useCallback((tracks, startIndex = 0) => {
    const normalized = (tracks || []).map((track, index) => ({
      id: track.id ?? `${index}-${track.src || track.media_url || "track"}`,
      src: normalizeTrackSrc(track.src || track.media_url),
      title: track.title || track.content || "Untitled Track",
      artist: track.artist || track.owner_username || "Chaplin"
    })).filter((track) => Boolean(track.src));

    setQueue(normalized);
    setQueueIndex(Math.max(0, Math.min(startIndex, Math.max(0, normalized.length - 1))));
  }, []);

  const playFromSource = useCallback(async (source, options = {}) => {
    const { silent = false } = options;
    const selected = source === "chaplin" ? chaplinRadioTracksRef.current : personalPlaylistRef.current;
    if (!selected?.length) {
      return false;
    }

    setActiveSource(source);
    replaceQueue(selected, 0);
    if (!silent && !applyingRemoteRef.current) {
      claimPlaybackOwnership(tabIdRef.current);
      broadcastCommand("STOP_AUDIO");
    }
    const ok = await play(selected[0].src, { ...selected[0], queueIndex: 0, fromQueue: true }, { silent: true });
    if (!silent && !applyingRemoteRef.current) {
      broadcastCommand("PLAY_SOURCE", { source });
    }
    return ok;
  }, [replaceQueue, claimPlaybackOwnership, broadcastCommand, play]);

  const setVolume = useCallback((value, options = {}) => {
    const { silent = false } = options;
    const next = typeof value === "string" ? Number(value) / 100 : Number(value);
    if (Number.isNaN(next)) return;
    setVolumeState(Math.max(0, Math.min(1, next)));
    if (next > 0 && mutedRef.current) {
      setMuted(false);
    }

    if (!silent && !applyingRemoteRef.current) {
      broadcastCommand("SET_VOLUME", { value: next });
    }
  }, [broadcastCommand]);

  const toggleMute = useCallback((options = {}) => {
    const { silent = false } = options;
    setMuted((prev) => !prev);
    if (!silent && !applyingRemoteRef.current) {
      broadcastCommand("TOGGLE_MUTE");
    }
  }, [broadcastCommand]);

  const toggleShuffle = useCallback((options = {}) => {
    const { silent = false } = options;
    setShuffleEnabled((prev) => !prev);
    if (!silent && !applyingRemoteRef.current) {
      broadcastCommand("TOGGLE_SHUFFLE");
    }
  }, [broadcastCommand]);

  const cycleRepeatMode = useCallback((options = {}) => {
    const { silent = false } = options;
    setRepeatMode((prev) => {
      if (prev === "off") return "all";
      if (prev === "all") return "one";
      return "off";
    });
    if (!silent && !applyingRemoteRef.current) {
      broadcastCommand("CYCLE_REPEAT");
    }
  }, [broadcastCommand]);

  const value = useMemo(() => ({
    current,
    playing,
    sessionPlaying,
    duration,
    currentTime,
    volume,
    play,
    pause,
    next,
    previous,
    seek,
    setVolume,
    muted,
    toggleMute,
    repeatMode,
    cycleRepeatMode,
    shuffleEnabled,
    toggleShuffle,
    analyserRef,
    visualizerStateRef,
    queue,
    replaceQueue,
    personalPlaylist,
    setPersonalPlaylist,
    chaplinRadioTracks,
    setChaplinRadioTracks,
    activeSource,
    setActiveSource,
    playFromSource,
    playbackOwner,
    isPlaybackOwner: ENABLE_PLAYER_SYNC ? (playbackOwner ? playbackOwner === tabIdRef.current : true) : true
  }), [
    current,
    playing,
    sessionPlaying,
    duration,
    currentTime,
    volume,
    muted,
    repeatMode,
    shuffleEnabled,
    queue,
    personalPlaylist,
    chaplinRadioTracks,
    activeSource,
    playbackOwner
  ]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
};

// Variante "segura": no lanza si se usa fuera de PlayerProvider.
// La usan los fondos 3D (Glass Hourglass, Liquid Tornado, Energy Grid Floor,
// Ocean Horizon, Cosmic Telescope) para leer datos de audio en tiempo real
// sin forzar que exista un PlayerProvider como ancestro.
export const usePlayerOptional = () => useContext(PlayerContext);
