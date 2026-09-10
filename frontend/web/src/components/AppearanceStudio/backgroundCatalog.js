import { VISUALIZER_VIDEO_OPTIONS } from '../../context/VortexContext';

// Every selectable background gets a REAL preview: video-backed styles show an
// actual decoded frame from their own asset file (seeked, not a placeholder);
// procedural/generative styles are mapped to one of a handful of reusable CSS
// pattern renderers (BackgroundThumb) chosen to resemble what that background
// actually looks like, so the catalog never shows a blank/text-only card.
const VIDEO_ENTRIES = VISUALIZER_VIDEO_OPTIONS.map(({ id, label, src, poster }) => ({
  id, label, kind: 'video', src, poster
}));

const CSS_ENTRIES = [
  { id: 'oceanHorizon', label: 'Ocean Horizon', pattern: 'wave', colorA: '#0a2b4d', colorB: '#4fd6ff' },
  { id: 'liquidTornado', label: 'Liquid Tornado', pattern: 'swirl', colorA: '#3a0d5c', colorB: '#ff5fd1' },
  { id: 'glassHourglass', label: 'Glass Hourglass', pattern: 'blob', colorA: '#3a2a1a', colorB: '#ffd27a' },
  { id: 'cosmicTelescope', label: 'Cosmic Telescope', pattern: 'particles', colorA: '#050614', colorB: '#e8ecff' },
  { id: 'energyGridFloor', label: 'Energy Grid Floor', pattern: 'grid', colorA: '#050806', colorB: '#39ff88' },
  { id: 'neuralWeb', label: 'Neural Web', pattern: 'particles', colorA: '#08131a', colorB: '#4fe3ff' },
  { id: 'auroraSky', label: 'Aurora Sky', pattern: 'bands', colorA: '#0b1f2e', colorB: '#5cffb0' },
  { id: 'liquidChromeWaves', label: 'Liquid Chrome Waves', pattern: 'wave', colorA: '#20242b', colorB: '#e8f0f5' },
  { id: 'rainfieldNeon', label: 'Rainfield Neon', pattern: 'rain', colorA: '#04030a', colorB: '#ff2fd0' },
  { id: 'plasmaSphere', label: 'Plasma Sphere', pattern: 'orb', colorA: '#2a0845', colorB: '#ff4fd8' },
  { id: 'dataTunnel', label: 'Fractal Tunnel', pattern: 'grid', colorA: '#000000', colorB: '#00e5ff' },
  { id: 'fractalBloom', label: 'Fractal Bloom', pattern: 'swirl', colorA: '#1a0a2e', colorB: '#ffb84f' },
  { id: 'nightVisionLandscape', label: 'Night Vision Landscape', pattern: 'bands', colorA: '#020a02', colorB: '#7bff4f' },
  { id: 'vortex', label: 'Vórtice', pattern: 'swirl', colorA: '#031a1a', colorB: '#2de8d0' },
  { id: 'hourglass', label: 'Arena', pattern: 'blob', colorA: '#2a1a08', colorB: '#f2b34a' },
  { id: 'rain', label: 'Lluvia', pattern: 'rain', colorA: '#02040a', colorB: '#7ee8ff' },
  { id: 'sphere', label: 'Esfera', pattern: 'orb', colorA: '#0a0a2a', colorB: '#8a7bff' },
  { id: 'lavaLamp', label: 'Lava', pattern: 'blob', colorA: '#1a0303', colorB: '#ff5a2d' },
  { id: 'aeroHalo', label: 'Halo Aero', pattern: 'orb', colorA: '#08182a', colorB: '#bfe8ff' },
  { id: 'fluidCurtain', label: 'Cortina Fluida', pattern: 'bands', colorA: '#170a2a', colorB: '#d17bff' },
  { id: 'prismBloom', label: 'Prisma Bloom', pattern: 'swirl', colorA: '#0a0a12', colorB: '#ff7bd5' }
];

export const BACKGROUND_CATALOG = [...CSS_ENTRIES, ...VIDEO_ENTRIES];

export const findBackgroundEntry = (id) => BACKGROUND_CATALOG.find((entry) => entry.id === id) || CSS_ENTRIES[0];
