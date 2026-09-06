// LIFE//SIGN — medical monitor / oscilloscope. The bezel and screen glass
// stay dark clinical in every mode; the trace, grid and readout tokens are
// what theme-sync actually moves.
export const id = 'lifeSign';
export const label = 'Life//Sign';

export const defaultPalette = {
  bezelColor: '#101418',
  screenBack: '#04120e',
  traceColor: '#39ff8a',
  gridColor: '#0d3324',
  readoutText: '#7dffc0',
  monitorColor: '#39ff8a',
  buttonColor: '#1c2420'
};

export const colorSchema = [
  { key: 'bezelColor', label: 'Carcasa del monitor' },
  { key: 'screenBack', label: 'Fondo de pantalla' },
  { key: 'traceColor', label: 'Trazo ECG' },
  { key: 'gridColor', label: 'Rejilla' },
  { key: 'readoutText', label: 'Texto de lectura' },
  { key: 'monitorColor', label: 'MONITOR (Profile Listen)' },
  { key: 'buttonColor', label: 'Botones' }
];

export function themeMapping(theme) {
  const primary = theme?.colors?.primary || defaultPalette.traceColor;
  const secondary = theme?.colors?.secondary || primary;
  return {
    bezelColor: theme?.colors?.surfaceAlt || defaultPalette.bezelColor,
    screenBack: theme?.colors?.background || defaultPalette.screenBack,
    traceColor: primary,
    gridColor: theme?.colors?.surfaceAlt || defaultPalette.gridColor,
    readoutText: primary,
    monitorColor: secondary,
    buttonColor: theme?.colors?.surfaceAlt || defaultPalette.buttonColor
  };
}
