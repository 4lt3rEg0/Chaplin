import BubblegumGlossSkin from './BubblegumGlossSkin';
import rawManifest from '../../../../assets/profilePlayers/bubblegum-gloss/manifest.json';

export const id = rawManifest.id;
export const label = rawManifest.label;
export const component = BubblegumGlossSkin;
export const aspectRatio = rawManifest.canvas.width / rawManifest.canvas.height;
export const maxWidth = 420;
export const referenceWidth = rawManifest.canvas.width;
export const referenceHeight = rawManifest.canvas.height;
export const sourceFile = rawManifest.source.sheet;
export const sourceCell = 'r0c0';
export const referenceImage = '/dev-reference/bubblegum-gloss/reference.png';

// Measured directly from the sheet's own RECOLOR MASK / ACCENT swatch
// legend (extract_bubblegum_gloss.py) — not invented. No shell-shaped
// asset exists in the sheet to recolor, so these tokens exist for
// future material-tinting work rather than being consumed yet.
export const defaultPalette = { ...rawManifest.palette };
delete defaultPalette._note;

export const colorSchema = [
  { key: 'gelPink', label: 'Gel (rosa)', material: 'gel' },
  { key: 'gelBlue', label: 'Gel (azul)', material: 'gel' },
  { key: 'accentPurple', label: 'Acento', material: 'accent' },
  { key: 'accentPale', label: 'Acento pálido', material: 'accent' },
];

export function themeMapping(theme) {
  return {
    gelPink: theme?.colors?.primary || defaultPalette.gelPink,
    gelBlue: theme?.colors?.secondary || defaultPalette.gelBlue,
    accentPurple: defaultPalette.accentPurple,
    accentPale: defaultPalette.accentPale,
  };
}
