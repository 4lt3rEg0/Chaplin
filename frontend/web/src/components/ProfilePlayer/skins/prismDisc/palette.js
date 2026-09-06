// PRISM DISC — translucent portable MiniDisc/CD player. The shell keeps its
// see-through plastic feel in every mode; disc, laser and text tokens are
// what actually moves when synced to the app theme.
export const id = 'prismDisc';
export const label = 'Prism Disc';

export const defaultPalette = {
  shellTint: '#6a4dff',
  discBase: '#1a1a24',
  discShine: '#c9c4ff',
  laserColor: '#ff3b4e',
  displayText: '#d8d4ff',
  buttonColor: '#241f3a',
  ejectColor: '#ff3b4e',
  ledColor: '#7dffcb'
};

export const colorSchema = [
  { key: 'shellTint', label: 'Carcasa translúcida' },
  { key: 'discBase', label: 'Disco' },
  { key: 'discShine', label: 'Brillo del disco' },
  { key: 'laserColor', label: 'Láser' },
  { key: 'displayText', label: 'Texto del display' },
  { key: 'buttonColor', label: 'Botones' },
  { key: 'ejectColor', label: 'Eject (cola)' },
  { key: 'ledColor', label: 'LED' }
];

export function themeMapping(theme) {
  const primary = theme?.colors?.primary || defaultPalette.shellTint;
  const secondary = theme?.colors?.secondary || defaultPalette.laserColor;
  return {
    shellTint: primary,
    discBase: theme?.colors?.background || defaultPalette.discBase,
    discShine: theme?.colors?.text || defaultPalette.discShine,
    laserColor: secondary,
    displayText: primary,
    buttonColor: theme?.colors?.surfaceAlt || defaultPalette.buttonColor,
    ejectColor: secondary,
    ledColor: primary
  };
}
