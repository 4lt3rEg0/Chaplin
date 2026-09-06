// VELOCITY COCKPIT — automotive/aviation instrument cluster. Panel and
// gauge-face stay dark carbon in every mode; needle, tick and accent
// tokens are what theme-sync actually moves, keeping the dashboard read.
export const id = 'velocityCockpit';
export const label = 'Velocity Cockpit';

export const defaultPalette = {
  dashPanel: '#131316',
  gaugeFace: '#1c1c20',
  needleColor: '#ff4d2e',
  tickColor: '#ff4d2e',
  displayText: '#ffdcae',
  switchColor: '#ff4d2e',
  buttonColor: '#26262b',
  accentColor: '#ff4d2e'
};

export const colorSchema = [
  { key: 'dashPanel', label: 'Panel del salpicadero' },
  { key: 'gaugeFace', label: 'Esfera del reloj' },
  { key: 'needleColor', label: 'Aguja' },
  { key: 'tickColor', label: 'Marcas del dial' },
  { key: 'displayText', label: 'Texto del display' },
  { key: 'switchColor', label: 'Interruptor (Profile Listen)' },
  { key: 'buttonColor', label: 'Botones' },
  { key: 'accentColor', label: 'Acento' }
];

export function themeMapping(theme) {
  const primary = theme?.colors?.primary || defaultPalette.needleColor;
  const secondary = theme?.colors?.secondary || primary;
  return {
    dashPanel: theme?.colors?.background || defaultPalette.dashPanel,
    gaugeFace: theme?.colors?.surfaceAlt || defaultPalette.gaugeFace,
    needleColor: primary,
    tickColor: primary,
    displayText: primary,
    switchColor: secondary,
    buttonColor: theme?.colors?.surfaceAlt || defaultPalette.buttonColor,
    accentColor: primary
  };
}
