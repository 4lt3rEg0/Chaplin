// CALLBACK//FM — landline answering-machine/switchboard. Casing plastic and
// keypad stay put across modes; the caller-ID glow and LINE indicator are
// what theme-sync actually re-tints.
export const id = 'callbackFm';
export const label = 'Callback//FM';

export const defaultPalette = {
  caseColor: '#3a352c',
  displayBack: '#1c1712',
  displayText: '#ffcf8a',
  lineColor: '#57ff8a',
  keypadColor: '#26221b',
  memColor: '#ff5a5a',
  buttonColor: '#4a4335'
};

export const colorSchema = [
  { key: 'caseColor', label: 'Carcasa del teléfono' },
  { key: 'displayBack', label: 'Fondo del display' },
  { key: 'displayText', label: 'Texto Caller-ID' },
  { key: 'lineColor', label: 'LÍNEA (Profile Listen)' },
  { key: 'keypadColor', label: 'Teclado numérico' },
  { key: 'memColor', label: 'MEM (favorito)' },
  { key: 'buttonColor', label: 'Botones' }
];

export function themeMapping(theme) {
  const primary = theme?.colors?.primary || defaultPalette.displayText;
  const secondary = theme?.colors?.secondary || defaultPalette.lineColor;
  return {
    caseColor: theme?.colors?.surfaceAlt || defaultPalette.caseColor,
    displayBack: theme?.colors?.background || defaultPalette.displayBack,
    displayText: primary,
    lineColor: secondary,
    keypadColor: theme?.colors?.background || defaultPalette.keypadColor,
    memColor: secondary,
    buttonColor: theme?.colors?.surfaceAlt || defaultPalette.buttonColor
  };
}
