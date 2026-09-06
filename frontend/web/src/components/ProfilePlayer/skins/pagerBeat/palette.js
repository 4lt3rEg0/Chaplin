// PAGER//BEAT — monochrome pixel-LCD pager/PDA. The casing plastic and LCD
// backlight tint are what "sync with theme" moves; the pixel glyph color
// stays legible against its own backlight rather than being flattened.
export const id = 'pagerBeat';
export const label = 'Pager//Beat';

export const defaultPalette = {
  caseColor: '#2b2e28',
  lcdBack: '#9fb87a',
  pixelColor: '#1c2414',
  ledColor: '#ff5a3c',
  buttonColor: '#3a3d34',
  dpadColor: '#232620',
  accentColor: '#c7d9a0'
};

export const colorSchema = [
  { key: 'caseColor', label: 'Carcasa' },
  { key: 'lcdBack', label: 'Fondo LCD' },
  { key: 'pixelColor', label: 'Píxel / texto' },
  { key: 'ledColor', label: 'LED indicador' },
  { key: 'buttonColor', label: 'Botones' },
  { key: 'dpadColor', label: 'D-pad' },
  { key: 'accentColor', label: 'Acento' }
];

export function themeMapping(theme) {
  const primary = theme?.colors?.primary || defaultPalette.lcdBack;
  const secondary = theme?.colors?.secondary || defaultPalette.ledColor;
  return {
    caseColor: theme?.colors?.surfaceAlt || defaultPalette.caseColor,
    lcdBack: primary,
    pixelColor: theme?.colors?.background || defaultPalette.pixelColor,
    ledColor: secondary,
    buttonColor: theme?.colors?.surfaceAlt || defaultPalette.buttonColor,
    dpadColor: theme?.colors?.background || defaultPalette.dpadColor,
    accentColor: primary
  };
}
