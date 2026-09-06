import AquaFlowSkin from './AquaFlowSkin';

export const id = 'aqua-flow';
export const label = 'Aqua Flow';
export const component = AquaFlowSkin;
export const sourceFile = 'sheet-ij1a1r.png';
export const sourceCell = 'r0c3';
export const aspectRatio = 640 / 380;
export const maxWidth = 480;
export const referenceImage = '/assets/profile-players/generated/aqua-flow-ij1a1r/cutout.png';

export const defaultPalette = {
  shell: '#4a9fd4',
  bezel: '#8fd0ee',
  display: '#0f2a3a',
  text: '#eaf7ff',
  wave: '#3fc8e8',
  accent: '#7dd8ff',
  button: '#5fb8dc'
};

export const colorSchema = [
  { key: 'shell', label: 'Carcasa (gel)', material: 'gel' },
  { key: 'bezel', label: 'Marco cromado', material: 'chrome' },
  { key: 'display', label: 'Cristal del display', material: 'glass' },
  { key: 'wave', label: 'Ola central', material: 'liquid' },
  { key: 'accent', label: 'Acento / progreso', material: 'accent' },
  { key: 'button', label: 'Botones', material: 'chrome' },
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
    accent: secondary,
    button: primary,
    text: theme?.colors?.text || defaultPalette.text
  };
}
