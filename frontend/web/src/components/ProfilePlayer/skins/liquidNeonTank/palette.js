// LIQUID NEON TANK — translucent tech-aquarium module. The tank glass and
// bracket metal stay put across modes; the liquid and glow tokens are what
// theme-sync actually moves, keeping the fluid's material identity intact.
export const id = 'liquidNeonTank';
export const label = 'Liquid Neon Tank';

export const defaultPalette = {
  tankGlass: '#0a2230',
  bracketMetal: '#2a2f36',
  liquidCyan: '#22e6ff',
  liquidMagenta: '#ff2ee0',
  bubbleColor: '#bdfcff',
  displayText: '#bdfcff',
  valveColor: '#22e6ff',
  ledColor: '#ff2ee0'
};

export const colorSchema = [
  { key: 'tankGlass', label: 'Cristal del tanque' },
  { key: 'bracketMetal', label: 'Soportes metálicos' },
  { key: 'liquidCyan', label: 'Líquido cian' },
  { key: 'liquidMagenta', label: 'Líquido magenta' },
  { key: 'bubbleColor', label: 'Burbujas' },
  { key: 'displayText', label: 'Texto del display' },
  { key: 'valveColor', label: 'Válvula (Profile Listen)' },
  { key: 'ledColor', label: 'Indicador LED' }
];

export function themeMapping(theme) {
  const primary = theme?.colors?.primary || defaultPalette.liquidCyan;
  const secondary = theme?.colors?.secondary || defaultPalette.liquidMagenta;
  return {
    tankGlass: theme?.colors?.background || defaultPalette.tankGlass,
    bracketMetal: theme?.colors?.surfaceAlt || defaultPalette.bracketMetal,
    liquidCyan: primary,
    liquidMagenta: secondary,
    bubbleColor: theme?.colors?.text || defaultPalette.bubbleColor,
    displayText: primary,
    valveColor: primary,
    ledColor: secondary
  };
}
