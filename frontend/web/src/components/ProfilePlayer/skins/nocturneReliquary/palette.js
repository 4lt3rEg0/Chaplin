// NOCTURNE//RELIQUARY — gothic architecture (arches, tracery, stained glass)
// fused with Y2K hardware. Stonework stays put across modes; the glass and
// gem tokens are what theme-sync actually re-tints — jewel tones, never a
// flat red/black "goth" palette.
export const id = 'nocturneReliquary';
export const label = 'Nocturne//Reliquary';

export const defaultPalette = {
  stoneColor: '#1a1826',
  traceryColor: '#4a4468',
  glassBlue: '#3d6bff',
  glassGold: '#e8b93f',
  glassViolet: '#8a4dff',
  displayText: '#cfc8ff',
  gemColor: '#e8b93f',
  buttonColor: '#2a2740'
};

export const colorSchema = [
  { key: 'stoneColor', label: 'Piedra' },
  { key: 'traceryColor', label: 'Tracería' },
  { key: 'glassBlue', label: 'Vitral azul' },
  { key: 'glassGold', label: 'Vitral dorado' },
  { key: 'glassViolet', label: 'Vitral violeta' },
  { key: 'displayText', label: 'Texto' },
  { key: 'gemColor', label: 'Gema (favorito)' },
  { key: 'buttonColor', label: 'Botones' }
];

export function themeMapping(theme) {
  const primary = theme?.colors?.primary || defaultPalette.glassBlue;
  const secondary = theme?.colors?.secondary || defaultPalette.glassGold;
  return {
    stoneColor: theme?.colors?.background || defaultPalette.stoneColor,
    traceryColor: theme?.colors?.surfaceAlt || defaultPalette.traceryColor,
    glassBlue: primary,
    glassGold: secondary,
    glassViolet: theme?.colors?.text || defaultPalette.glassViolet,
    displayText: primary,
    gemColor: secondary,
    buttonColor: theme?.colors?.surfaceAlt || defaultPalette.buttonColor
  };
}
