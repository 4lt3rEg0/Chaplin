// Token-based palette for the Obsidian Amber skin. `defaultPalette` is the
// skin's own factory look; `colorSchema` declares which tokens the user can
// repaint from Settings (label shown in the UI); `themeMapping` derives a
// palette from the app's active theme WITHOUT flattening the skin's material
// feel — the dark chrome shell stays dark, only the glass/glow/text/LED
// tokens pick up the theme's accent colors.
export const id = 'obsidianAmber';
export const label = 'Obsidian Amber';

export const defaultPalette = {
  metalPrimary: '#17171a',
  metalSecondary: '#2c2c31',
  glassAmber: '#ffb347',
  displayText: '#ffcf7d',
  ledColor: '#ff8a1e',
  buttonColor: '#333338',
  glowColor: '#ffb347',
  listenColor: '#ffd27a'
};

export const colorSchema = [
  { key: 'metalPrimary', label: 'Carcasa principal' },
  { key: 'metalSecondary', label: 'Metal secundario' },
  { key: 'glassAmber', label: 'Cristal ámbar' },
  { key: 'displayText', label: 'Texto del display' },
  { key: 'ledColor', label: 'LED' },
  { key: 'buttonColor', label: 'Botones' },
  { key: 'glowColor', label: 'Brillo (glow)' },
  { key: 'listenColor', label: 'Profile Listen' }
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
