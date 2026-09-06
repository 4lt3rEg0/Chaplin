// OBSIDIAN AMBER — black-chrome Hi-Fi deck. `defaultPalette` is the skin's
// own factory look; `colorSchema` declares which tokens the user can repaint
// from Settings; `themeMapping` derives a palette from the app's active
// theme WITHOUT flattening the material — the metal chassis stays metal,
// only glass/display/LED/button tokens pick up the theme's accent colors.
export const id = 'obsidianAmber';
export const label = 'Obsidian Amber';

export const defaultPalette = {
  metalPrimary: '#1b1b1e',
  metalSecondary: '#333338',
  glassAmber: '#ffb347',
  displayText: '#ffcf7d',
  ledColor: '#ff8a1e',
  buttonColor: '#2a2a2f',
  glowColor: '#ffb347',
  listenColor: '#ffd27a'
};

export const colorSchema = [
  { key: 'metalPrimary', label: 'Metal principal' },
  { key: 'metalSecondary', label: 'Metal secundario' },
  { key: 'glassAmber', label: 'Cristal ámbar' },
  { key: 'displayText', label: 'Texto del display' },
  { key: 'ledColor', label: 'LED / VU' },
  { key: 'buttonColor', label: 'Botones' },
  { key: 'glowColor', label: 'Brillo (glow)' },
  { key: 'listenColor', label: 'PROFILE LISTEN' }
];

export function themeMapping(theme) {
  const primary = theme?.colors?.primary || defaultPalette.glassAmber;
  const secondary = theme?.colors?.secondary || primary;
  return {
    metalPrimary: theme?.colors?.background || defaultPalette.metalPrimary,
    metalSecondary: theme?.colors?.surfaceAlt || defaultPalette.metalSecondary,
    glassAmber: primary,
    displayText: primary,
    ledColor: secondary,
    buttonColor: theme?.colors?.surfaceAlt || defaultPalette.buttonColor,
    glowColor: primary,
    listenColor: secondary
  };
}
