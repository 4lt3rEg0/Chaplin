// NEON//HEART — cyberpunk cybernetic-heart core. The panel and circuit trace
// lines stay put across modes; the core, halo and link tokens are what
// theme-sync moves. Deliberately restrained — no glitch/katakana/hacker
// cliché, the core itself carries the identity.
export const id = 'neonHeart';
export const label = 'Neon//Heart';

export const defaultPalette = {
  panelColor: '#0c0616',
  circuitColor: '#39204f',
  coreColor: '#ff2e6d',
  haloColor: '#7a2eff',
  displayText: '#f2d9ff',
  linkColor: '#39e6ff',
  buttonColor: '#241536'
};

export const colorSchema = [
  { key: 'panelColor', label: 'Panel' },
  { key: 'circuitColor', label: 'Líneas de circuito' },
  { key: 'coreColor', label: 'Núcleo (corazón)' },
  { key: 'haloColor', label: 'Halo (progreso)' },
  { key: 'displayText', label: 'Texto' },
  { key: 'linkColor', label: 'Core Link (Profile Listen)' },
  { key: 'buttonColor', label: 'Botones' }
];

export function themeMapping(theme) {
  const primary = theme?.colors?.primary || defaultPalette.coreColor;
  const secondary = theme?.colors?.secondary || defaultPalette.linkColor;
  return {
    panelColor: theme?.colors?.background || defaultPalette.panelColor,
    circuitColor: theme?.colors?.surfaceAlt || defaultPalette.circuitColor,
    coreColor: primary,
    haloColor: secondary,
    displayText: primary,
    linkColor: secondary,
    buttonColor: theme?.colors?.surfaceAlt || defaultPalette.buttonColor
  };
}
