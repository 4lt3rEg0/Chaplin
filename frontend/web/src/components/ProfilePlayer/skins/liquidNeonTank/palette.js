// LIQUID NEON TANK — translucent tech-aquarium tank. The shell itself stays
// glassy/translucent in every mode; only the liquid, glow and text tokens
// move, so "theme sync" re-tints the fluid without turning the tank opaque.
export const id = 'liquidNeonTank';
export const label = 'Liquid Neon Tank';

export const defaultPalette = {
  tankGlass: '#0a2230',
  liquidCyan: '#22e6ff',
  liquidMagenta: '#ff2ee0',
  bubbleColor: '#bdfcff',
  displayText: '#bdfcff',
  valveColor: '#22e6ff',
  buttonColor: '#0e3444',
  ledColor: '#ff2ee0'
};

export const colorSchema = [
  { key: 'tankGlass', label: 'Cristal del tanque' },
  { key: 'liquidCyan', label: 'Líquido cian' },
  { key: 'liquidMagenta', label: 'Líquido magenta' },
  { key: 'bubbleColor', label: 'Burbujas' },
  { key: 'displayText', label: 'Texto del display' },
  { key: 'valveColor', label: 'Válvula (Profile Listen)' },
  { key: 'buttonColor', label: 'Botones' },
  { key: 'ledColor', label: 'Indicador LED' }
];

export function themeMapping(theme) {
  const primary = theme?.colors?.primary || defaultPalette.liquidCyan;
  const secondary = theme?.colors?.secondary || defaultPalette.liquidMagenta;
  return {
    tankGlass: theme?.colors?.background || defaultPalette.tankGlass,
    liquidCyan: primary,
    liquidMagenta: secondary,
    bubbleColor: theme?.colors?.text || defaultPalette.bubbleColor,
    displayText: primary,
    valveColor: primary,
    buttonColor: theme?.colors?.surfaceAlt || defaultPalette.buttonColor,
    ledColor: secondary
  };
}
