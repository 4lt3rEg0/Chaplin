import AeroAmpSkin from './AeroAmpSkin';

export const id = 'aero-amp';
export const label = 'AeroAmp';
export const component = AeroAmpSkin;
export const referenceWidth = 600;
export const referenceHeight = 300;
export const aspectRatio = referenceWidth / referenceHeight;
export const maxWidth = 460;
// Original composition — no traced reference sheet. Designed from a written
// Frutiger Aero / Y2K "translucent gel toy" brief (icy blue jelly plastic
// shell, chrome buttons, bubble/star decoration, pixel LCD).
export const sourceFile = null;
export const sourceCell = null;
export const referenceImage = null;
export const referenceIsAssetSheet = false;

export const defaultPalette = {
  shell: '#bfe9ff',
  shellDeep: '#5fa8d4',
  bezel: '#eef9ff',
  display: '#dff3fb',
  screenPixel: '#1c3f57',
  text: '#0d3450',
  accent: '#ff8fd6',
  accentSoft: '#c9b6ff',
  button: '#f2fdff',
  buttonShadow: '#5aa9c9',
  bubble: '#ffffff',
  ledOff: '#7fb8cf',
  ledOn: '#7cffb2'
};

export const colorSchema = [
  { key: 'shell', label: 'Carcasa (gel)', material: 'gel' },
  { key: 'shellDeep', label: 'Carcasa (sombra)', material: 'gel' },
  { key: 'bezel', label: 'Marco del display', material: 'chrome' },
  { key: 'display', label: 'Cristal LCD', material: 'glass' },
  { key: 'screenPixel', label: 'Pixel LCD (mascota)', material: 'text' },
  { key: 'accent', label: 'Acento (progreso)', material: 'accent' },
  { key: 'accentSoft', label: 'Acento secundario', material: 'accent' },
  { key: 'button', label: 'Botones', material: 'chrome' },
  { key: 'text', label: 'Texto LCD', material: 'text' }
];

export function themeMapping(theme) {
  const primary = theme?.colors?.primary || defaultPalette.accent;
  const secondary = theme?.colors?.secondary || defaultPalette.accentSoft;
  return {
    shell: theme?.colors?.surfaceAlt || defaultPalette.shell,
    shellDeep: defaultPalette.shellDeep,
    bezel: theme?.colors?.surface || defaultPalette.bezel,
    display: defaultPalette.display,
    screenPixel: defaultPalette.screenPixel,
    text: theme?.colors?.text || defaultPalette.text,
    accent: primary,
    accentSoft: secondary,
    button: theme?.colors?.surfaceAlt || defaultPalette.button,
    buttonShadow: defaultPalette.buttonShadow,
    bubble: defaultPalette.bubble,
    ledOff: defaultPalette.ledOff,
    ledOn: secondary
  };
}
