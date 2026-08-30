// Lightweight, dependency-free manifest of the audio-reactive background style ids.
// Kept separate from ChaplinAudioBackgroundCanvas.jsx so App.jsx can check
// `CHAPLIN_AUDIO_STYLE_SET.has(styleId)` synchronously without eagerly importing
// the (heavy) visualizer components themselves. The actual canvas/component tree
// is lazy-loaded — see App.jsx and ChaplinAudioBackgroundCanvas.jsx.
export const CHAPLIN_AUDIO_STYLE_IDS = [
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
  'dataTunnel',
  'fractalBloom',
  'nightVisionLandscape'
];

export const CHAPLIN_AUDIO_STYLE_SET = new Set(CHAPLIN_AUDIO_STYLE_IDS);
