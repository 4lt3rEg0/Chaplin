// AETHER//ENGINE — steampunk brass/copper engine fused with Y2K hardware.
// The panel and rivets stay brass in every mode; gauge, gear and readout
// tokens are what theme-sync actually moves — never a flat copper texture
// slapped over an otherwise generic UI.
export const id = 'aetherEngine';
export const label = 'Aether//Engine';

export const defaultPalette = {
  brassPanel: '#3a2413',
  copperAccent: '#c8793a',
  gearColor: '#8a5a2a',
  gaugeFace: '#241608',
  needleColor: '#ff6a3d',
  displayText: '#ffd9a8',
  linkColor: '#3ad6ff',
  buttonColor: '#4a3018'
};

export const colorSchema = [
  { key: 'brassPanel', label: 'Panel de latón' },
  { key: 'copperAccent', label: 'Acento cobre' },
  { key: 'gearColor', label: 'Engranajes' },
  { key: 'gaugeFace', label: 'Esfera del manómetro' },
  { key: 'needleColor', label: 'Aguja' },
  { key: 'displayText', label: 'Texto' },
  { key: 'linkColor', label: 'Ether Link (Profile Listen)' },
  { key: 'buttonColor', label: 'Botones' }
];

export function themeMapping(theme) {
  const primary = theme?.colors?.primary || defaultPalette.copperAccent;
  const secondary = theme?.colors?.secondary || defaultPalette.linkColor;
  return {
    brassPanel: theme?.colors?.background || defaultPalette.brassPanel,
    copperAccent: primary,
    gearColor: theme?.colors?.surfaceAlt || defaultPalette.gearColor,
    gaugeFace: theme?.colors?.background || defaultPalette.gaugeFace,
    needleColor: primary,
    displayText: primary,
    linkColor: secondary,
    buttonColor: theme?.colors?.surfaceAlt || defaultPalette.buttonColor
  };
}
