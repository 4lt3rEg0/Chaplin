// JACKPOT//WAVE — arcade cabinet / slot machine marquee. Cabinet wood/panel
// stays put across modes; marquee bulbs, reel glass and the START button are
// what theme-sync moves.
export const id = 'jackpotWave';
export const label = 'Jackpot//Wave';

export const defaultPalette = {
  cabinetColor: '#231421',
  marqueeColor: '#ffd23f',
  reelGlass: '#160b1c',
  reelText: '#ffe9a8',
  startColor: '#ff3b5c',
  bulbColor: '#ffd23f',
  buttonColor: '#3a2140'
};

export const colorSchema = [
  { key: 'cabinetColor', label: 'Gabinete' },
  { key: 'marqueeColor', label: 'Marquesina' },
  { key: 'reelGlass', label: 'Cristal de los rodillos' },
  { key: 'reelText', label: 'Texto de los rodillos' },
  { key: 'startColor', label: 'Botón START (Profile Listen)' },
  { key: 'bulbColor', label: 'Bombillas de crédito' },
  { key: 'buttonColor', label: 'Botones' }
];

export function themeMapping(theme) {
  const primary = theme?.colors?.primary || defaultPalette.marqueeColor;
  const secondary = theme?.colors?.secondary || defaultPalette.startColor;
  return {
    cabinetColor: theme?.colors?.surfaceAlt || defaultPalette.cabinetColor,
    marqueeColor: primary,
    reelGlass: theme?.colors?.background || defaultPalette.reelGlass,
    reelText: primary,
    startColor: secondary,
    bulbColor: primary,
    buttonColor: theme?.colors?.surfaceAlt || defaultPalette.buttonColor
  };
}
