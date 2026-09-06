import AquaFlowSkin from './AquaFlowSkin';

export const id = 'aqua-flow';
export const label = 'Aqua Flow';
export const component = AquaFlowSkin;
export const sourceFile = 'sheet-ij1a1r.png';
export const sourceCell = 'r0c3';
export const referenceWidth = 632;
export const referenceHeight = 367;
export const aspectRatio = referenceWidth / referenceHeight;
export const maxWidth = 480;
export const referenceImage = '/dev-reference/aqua-flow/reference.png';

// Measured directly from the isolated reference via
// scripts/visual-regression/aqua-flow/sample_palette.py — see
// measured_palette.json for the sampled boxes. Not eyeballed.
export const defaultPalette = {
  shell: '#33768d',
  bezel: '#87b2c6',
  display: '#0d3f5e',
  wave: '#1c8ab8',
  water: '#12708f',
  button: '#a7c0dc',
  buttonShadow: '#236593',
  pill: '#2f71a4',
  ledOff: '#3c426a',
  ledOn: '#3ddb8a',
  text: '#eaf7ff',
  accent: '#5ad4f5'
};

export const colorSchema = [
  { key: 'shell', label: 'Carcasa (gel)', material: 'gel' },
  { key: 'bezel', label: 'Barra de titulo', material: 'chrome' },
  { key: 'display', label: 'Cristal del display', material: 'glass' },
  { key: 'wave', label: 'Ola central', material: 'liquid' },
  { key: 'water', label: 'Agua de fondo', material: 'liquid' },
  { key: 'button', label: 'Botones', material: 'chrome' },
  { key: 'accent', label: 'Acento / progreso', material: 'accent' },
  { key: 'text', label: 'Texto', material: 'text' }
];

export function themeMapping(theme) {
  const primary = theme?.colors?.primary || defaultPalette.wave;
  const secondary = theme?.colors?.secondary || defaultPalette.accent;
  return {
    shell: theme?.colors?.surfaceAlt || defaultPalette.shell,
    bezel: primary,
    display: theme?.colors?.background || defaultPalette.display,
    wave: primary,
    water: primary,
    button: theme?.colors?.surfaceAlt || defaultPalette.button,
    buttonShadow: defaultPalette.buttonShadow,
    pill: primary,
    ledOff: defaultPalette.ledOff,
    ledOn: secondary,
    text: theme?.colors?.text || defaultPalette.text,
    accent: secondary
  };
}
