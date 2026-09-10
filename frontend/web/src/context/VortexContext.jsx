import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getTheme, updateTheme } from '../services/themeService';

const VortexContext = createContext();

const STORAGE_KEY = 'chaplin_vortex';

const FALLBACK_STATE = {
  vortexColor: '#E5E5E5',
  finishType: 'chrome',
  backgroundStyle: 'video01',
  autoSyncEnabled: false,
  animationEnabled: true,
  visualizerPreset: 'chaplin_hyper',
  reactivity: 1,
  deformIntensity: 1,
  motionIntensity: 1,
  bassBoost: 1,
  trebleBoost: 1
};

const VISUALIZER_PRESETS = {
  xp_frx: {
    reactivity: 0.8,
    deformIntensity: 0.7,
    motionIntensity: 0.75,
    bassBoost: 0.9,
    trebleBoost: 0.8
  },
  win7_aero: {
    reactivity: 0.95,
    deformIntensity: 0.9,
    motionIntensity: 0.9,
    bassBoost: 0.95,
    trebleBoost: 0.95
  },
  winamp_milk: {
    reactivity: 1.2,
    deformIntensity: 1.25,
    motionIntensity: 1.2,
    bassBoost: 1.15,
    trebleBoost: 1.25
  },
  chaplin_hyper: {
    reactivity: 1.05,
    deformIntensity: 1.1,
    motionIntensity: 1.05,
    bassBoost: 1.05,
    trebleBoost: 1.1
  }
};

export const BACKGROUND_STYLE_OPTIONS = [
  'dataTunnel',
  ...Array.from({ length: 38 }, (_, index) => `video${String(index + 1).padStart(2, '0')}`),
  'vortex',
  'hourglass',
  'rain',
  'sphere',
  'lavaLamp',
  'aeroHalo',
  'fluidCurtain',
  'prismBloom',
  'oceanHorizon',
  'liquidTornado',
  'glassHourglass',
  'cosmicTelescope',
  'energyGridFloor',
  'neuralWeb',
  'auroraSky',
  'liquidChromeWaves',
  'rainfieldNeon',
  'plasmaSphere',
  'fractalBloom',
  'nightVisionLandscape'
];

export const VISUALIZER_VIDEO_OPTIONS = [
  ...Array.from({ length: 38 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    return {
      id: `video${number}`,
      label: `Visualizer ${number}`,
      src: `/visualizers/visualizer${number}.mp4`,
      // A real extracted frame (a few KB), not a re-encode of the video
      // itself — lets the picker grid show every option instantly without
      // fetching any byte of the actual (up to ~170MB) file until one is
      // actually selected. See BackgroundThumb.jsx.
      poster: `/visualizers/posters/visualizer${number}.jpg`
    };
  })
];

const THEME_BACKGROUND_PRESETS = {
  y2k:          { finishType: 'pearlescent', backgroundStyle: 'video01' },
  cyberpunk:    { finishType: 'glossy',      backgroundStyle: 'video02' },
  chrome:       { finishType: 'chrome',      backgroundStyle: 'sphere' },
  neo3d:        { finishType: 'glossy',      backgroundStyle: 'video03' },
  void4d:       { finishType: 'pearlescent', backgroundStyle: 'video04' },
  crystalcave:  { finishType: 'pearlescent', backgroundStyle: 'video05' },
  pixelmon:     { finishType: 'glossy',      backgroundStyle: 'video06' },
  sunsetarcade: { finishType: 'glossy',      backgroundStyle: 'video07' },
  frostedgarden:{ finishType: 'pearlescent', backgroundStyle: 'video08' },
  crimsonstudio:{ finishType: 'glossy',      backgroundStyle: 'video09' }
};

const safeParse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const readStoredVortex = () => {
  if (typeof window === 'undefined') {
    return FALLBACK_STATE;
  }

  const parsed = safeParse(window.localStorage.getItem(STORAGE_KEY));

  if (!parsed) {
    return FALLBACK_STATE;
  }

  const legacyMap = { flames: 'rain', lava: 'lavaLamp' };
  const storedBackgroundStyle = legacyMap[parsed.backgroundStyle] ?? parsed.backgroundStyle;
  const safeBackgroundStyle = BACKGROUND_STYLE_OPTIONS.includes(storedBackgroundStyle)
    ? storedBackgroundStyle
    : FALLBACK_STATE.backgroundStyle;
  const isVideoStyle = /^video\d{2}$/.test(safeBackgroundStyle);
  const safeAutoSyncEnabled = isVideoStyle
    ? false
    : (parsed.autoSyncEnabled ?? FALLBACK_STATE.autoSyncEnabled);

  return {
    vortexColor: parsed.vortexColor || FALLBACK_STATE.vortexColor,
    finishType: parsed.finishType || FALLBACK_STATE.finishType,
    backgroundStyle: safeBackgroundStyle,
    autoSyncEnabled: safeAutoSyncEnabled,
    animationEnabled: parsed.animationEnabled ?? FALLBACK_STATE.animationEnabled,
    visualizerPreset: parsed.visualizerPreset || FALLBACK_STATE.visualizerPreset,
    reactivity: parsed.reactivity ?? FALLBACK_STATE.reactivity,
    deformIntensity: parsed.deformIntensity ?? FALLBACK_STATE.deformIntensity,
    motionIntensity: parsed.motionIntensity ?? FALLBACK_STATE.motionIntensity,
    bassBoost: parsed.bassBoost ?? FALLBACK_STATE.bassBoost,
    trebleBoost: parsed.trebleBoost ?? FALLBACK_STATE.trebleBoost
  };
};

export const useVortex = () => {
  const context = useContext(VortexContext);
  if (!context) {
    throw new Error('useVortex must be used within a VortexProvider');
  }
  return context;
};

export const VortexProvider = ({ children }) => {
  const initialState = useMemo(() => readStoredVortex(), []);

  const [vortexColor, setVortexColor] = useState(initialState.vortexColor);
  const [finishType, setFinishType] = useState(initialState.finishType);
  const [backgroundStyle, setBackgroundStyle] = useState(initialState.backgroundStyle);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(initialState.autoSyncEnabled);
  const [animationEnabled, setAnimationEnabled] = useState(initialState.animationEnabled);
  const [visualizerPreset, setVisualizerPreset] = useState(initialState.visualizerPreset);
  const [reactivity, setReactivity] = useState(initialState.reactivity);
  const [deformIntensity, setDeformIntensity] = useState(initialState.deformIntensity);
  const [motionIntensity, setMotionIntensity] = useState(initialState.motionIntensity);
  const [bassBoost, setBassBoost] = useState(initialState.bassBoost);
  const [trebleBoost, setTrebleBoost] = useState(initialState.trebleBoost);
  const [loadedFromBackend, setLoadedFromBackend] = useState(false);

  // ===== Fondo preview (Settings → Apariencia slides) =====
  // Mirrors SkinContext's isPreviewingTheme/themeSnapshotRef mechanism so the
  // unified preview carousel can recolor/re-fondo live without persisting
  // anything until the user explicitly confirms.
  const [isPreviewingVortex, setIsPreviewingVortex] = useState(false);
  const vortexSnapshotRef = useRef(null);

  // Temporary override applied while viewing another user's public profile
  // (Profile Owner Environment). Shape matches the backend's PublicBackgroundEnvironment:
  // { style, finish, visualizerPreset, reactivity, deformIntensity, motionIntensity, bassBoost, trebleBoost }.
  // Never persisted — it only changes what this context resolves to while active.
  const [profileOverride, setProfileOverride] = useState(null);

  /* ===== LOAD from backend (server-side preferences win over the local cache) ===== */
  useEffect(() => {
    let cancelled = false;

    const loadFromBackend = async () => {
      try {
        const data = await getTheme();
        if (!cancelled && data) {
          if (typeof data.vortex_color === 'string') setVortexColor(data.vortex_color);
          if (typeof data.vortex_finish_type === 'string') setFinishType(data.vortex_finish_type);
          if (
            typeof data.vortex_background_style === 'string' &&
            BACKGROUND_STYLE_OPTIONS.includes(data.vortex_background_style)
          ) {
            setBackgroundStyle(data.vortex_background_style);
          }
          if (typeof data.vortex_visualizer_preset === 'string') setVisualizerPreset(data.vortex_visualizer_preset);
          if (Number.isFinite(Number(data.vortex_reactivity))) setReactivity(Number(data.vortex_reactivity));
          if (Number.isFinite(Number(data.vortex_deform_intensity))) setDeformIntensity(Number(data.vortex_deform_intensity));
          if (Number.isFinite(Number(data.vortex_motion_intensity))) setMotionIntensity(Number(data.vortex_motion_intensity));
          if (Number.isFinite(Number(data.vortex_bass_boost))) setBassBoost(Number(data.vortex_bass_boost));
          if (Number.isFinite(Number(data.vortex_treble_boost))) setTrebleBoost(Number(data.vortex_treble_boost));
        }
      } catch {
        // keep whatever the local cache already provided
      } finally {
        if (!cancelled) setLoadedFromBackend(true);
      }
    };

    loadFromBackend();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== SAVE to backend once the initial load has settled ===== */
  useEffect(() => {
    if (!loadedFromBackend || isPreviewingVortex) return;

    updateTheme({
      vortex_color: vortexColor,
      vortex_finish_type: finishType,
      vortex_background_style: backgroundStyle,
      vortex_visualizer_preset: visualizerPreset,
      vortex_reactivity: reactivity,
      vortex_deform_intensity: deformIntensity,
      vortex_motion_intensity: motionIntensity,
      vortex_bass_boost: bassBoost,
      vortex_treble_boost: trebleBoost
    }).catch(() => {
      // best-effort: localStorage already has the up-to-date value regardless
    });
  }, [
    loadedFromBackend,
    vortexColor,
    finishType,
    backgroundStyle,
    visualizerPreset,
    reactivity,
    deformIntensity,
    motionIntensity,
    bassBoost,
    trebleBoost,
    isPreviewingVortex
  ]);

  useEffect(() => {
    if (typeof window === 'undefined' || isPreviewingVortex) {
      return;
    }

    const snapshot = {
      vortexColor,
      finishType,
      backgroundStyle,
      autoSyncEnabled,
      animationEnabled,
      visualizerPreset,
      reactivity,
      deformIntensity,
      motionIntensity,
      bassBoost,
      trebleBoost
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [
    vortexColor,
    finishType,
    backgroundStyle,
    autoSyncEnabled,
    animationEnabled,
    visualizerPreset,
    reactivity,
    deformIntensity,
    motionIntensity,
    bassBoost,
    trebleBoost,
    isPreviewingVortex
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const onStorage = (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) {
        return;
      }

      const next = safeParse(event.newValue);

      if (!next) {
        return;
      }

      setVortexColor(next.vortexColor || FALLBACK_STATE.vortexColor);
      setFinishType(next.finishType || FALLBACK_STATE.finishType);
      setBackgroundStyle(
        BACKGROUND_STYLE_OPTIONS.includes(next.backgroundStyle)
          ? next.backgroundStyle
          : FALLBACK_STATE.backgroundStyle
      );
      setAutoSyncEnabled(next.autoSyncEnabled ?? FALLBACK_STATE.autoSyncEnabled);
      setAnimationEnabled(next.animationEnabled ?? FALLBACK_STATE.animationEnabled);
      setVisualizerPreset(next.visualizerPreset || FALLBACK_STATE.visualizerPreset);
      setReactivity(next.reactivity ?? FALLBACK_STATE.reactivity);
      setDeformIntensity(next.deformIntensity ?? FALLBACK_STATE.deformIntensity);
      setMotionIntensity(next.motionIntensity ?? FALLBACK_STATE.motionIntensity);
      setBassBoost(next.bassBoost ?? FALLBACK_STATE.bassBoost);
      setTrebleBoost(next.trebleBoost ?? FALLBACK_STATE.trebleBoost);
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const syncFromTheme = useCallback((themeId, accentColor) => {
    const preset = THEME_BACKGROUND_PRESETS[themeId] || THEME_BACKGROUND_PRESETS.y2k;

    setVortexColor(accentColor || FALLBACK_STATE.vortexColor);
    setFinishType(preset.finishType);
    setBackgroundStyle(preset.backgroundStyle);
  }, []);

  const applyVisualizerPreset = useCallback((presetId) => {
    const preset = VISUALIZER_PRESETS[presetId] || VISUALIZER_PRESETS.chaplin_hyper;

    setVisualizerPreset(presetId);
    setReactivity(preset.reactivity);
    setDeformIntensity(preset.deformIntensity);
    setMotionIntensity(preset.motionIntensity);
    setBassBoost(preset.bassBoost);
    setTrebleBoost(preset.trebleBoost);
  }, []);

  const vortexFieldSetters = {
    vortexColor: setVortexColor,
    finishType: setFinishType,
    backgroundStyle: setBackgroundStyle,
    autoSyncEnabled: setAutoSyncEnabled,
    animationEnabled: setAnimationEnabled,
    visualizerPreset: setVisualizerPreset,
    reactivity: setReactivity,
    deformIntensity: setDeformIntensity,
    motionIntensity: setMotionIntensity,
    bassBoost: setBassBoost,
    trebleBoost: setTrebleBoost
  };
  const vortexFieldValues = {
    vortexColor, finishType, backgroundStyle, autoSyncEnabled, animationEnabled,
    visualizerPreset, reactivity, deformIntensity, motionIntensity, bassBoost, trebleBoost
  };

  const beginVortexPreview = useCallback(() => {
    vortexSnapshotRef.current = { ...vortexFieldValues };
    setIsPreviewingVortex(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vortexColor, finishType, backgroundStyle, autoSyncEnabled, animationEnabled, visualizerPreset, reactivity, deformIntensity, motionIntensity, bassBoost, trebleBoost]);

  const cancelVortexPreview = useCallback(() => {
    const snapshot = vortexSnapshotRef.current;
    if (snapshot) {
      Object.entries(snapshot).forEach(([key, value]) => {
        vortexFieldSetters[key]?.(value);
      });
    }
    vortexSnapshotRef.current = null;
    setIsPreviewingVortex(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commitVortexPreview = useCallback(() => {
    vortexSnapshotRef.current = null;
    setIsPreviewingVortex(false);
  }, []);

  const effectiveFinishType = profileOverride?.finish || finishType;
  const effectiveBackgroundStyle = (profileOverride?.style && BACKGROUND_STYLE_OPTIONS.includes(profileOverride.style))
    ? profileOverride.style
    : backgroundStyle;
  const effectiveVisualizerPreset = profileOverride?.visualizerPreset || visualizerPreset;
  const effectiveReactivity = Number.isFinite(profileOverride?.reactivity) ? profileOverride.reactivity : reactivity;
  const effectiveDeformIntensity = Number.isFinite(profileOverride?.deformIntensity) ? profileOverride.deformIntensity : deformIntensity;
  const effectiveMotionIntensity = Number.isFinite(profileOverride?.motionIntensity) ? profileOverride.motionIntensity : motionIntensity;
  const effectiveBassBoost = Number.isFinite(profileOverride?.bassBoost) ? profileOverride.bassBoost : bassBoost;
  const effectiveTrebleBoost = Number.isFinite(profileOverride?.trebleBoost) ? profileOverride.trebleBoost : trebleBoost;

  const value = useMemo(() => ({
    vortexColor,
    setVortexColor,
    finishType: effectiveFinishType,
    setFinishType,
    backgroundStyle: effectiveBackgroundStyle,
    setBackgroundStyle,
    profileOverride,
    setProfileOverride,
    syncFromTheme,
    autoSyncEnabled,
    setAutoSyncEnabled,
    animationEnabled,
    setAnimationEnabled,
    visualizerPreset: effectiveVisualizerPreset,
    setVisualizerPreset,
    reactivity: effectiveReactivity,
    setReactivity,
    deformIntensity: effectiveDeformIntensity,
    setDeformIntensity,
    motionIntensity: effectiveMotionIntensity,
    setMotionIntensity,
    bassBoost: effectiveBassBoost,
    setBassBoost,
    trebleBoost: effectiveTrebleBoost,
    setTrebleBoost,
    applyVisualizerPreset,
    visualizerPresets: VISUALIZER_PRESETS,
    isPreviewingVortex,
    beginVortexPreview,
    cancelVortexPreview,
    commitVortexPreview
  }), [
    vortexColor,
    effectiveFinishType,
    effectiveBackgroundStyle,
    profileOverride,
    syncFromTheme,
    autoSyncEnabled,
    animationEnabled,
    effectiveVisualizerPreset,
    effectiveReactivity,
    effectiveDeformIntensity,
    effectiveMotionIntensity,
    effectiveBassBoost,
    effectiveTrebleBoost,
    applyVisualizerPreset,
    isPreviewingVortex,
    beginVortexPreview,
    cancelVortexPreview,
    commitVortexPreview
  ]);

  return (
    <VortexContext.Provider value={value}>
      {children}
    </VortexContext.Provider>
  );
};