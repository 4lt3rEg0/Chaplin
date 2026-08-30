// Named look presets, Instagram-style. Each `tone` is a CSS filter fragment
// layered under the user's own brightness/contrast/saturation sliders (see
// MediaEditor's composeFilter) so a preset sets the "look" while the sliders
// still control exposure on top of it.
export const FILTER_PRESETS = [
  { id: 'original', name: 'Original', tone: '' },
  { id: 'clarendon', name: 'Clarendon', tone: 'saturate(1.35)' },
  { id: 'gingham', name: 'Gingham', tone: 'sepia(0.15)' },
  { id: 'moon', name: 'Moon', tone: 'grayscale(1)' },
  { id: 'lark', name: 'Lark', tone: 'saturate(1.1)' },
  { id: 'reyes', name: 'Reyes', tone: 'sepia(0.22)' },
  { id: 'juno', name: 'Juno', tone: 'sepia(0.1) saturate(1.4)' },
  { id: 'slumber', name: 'Slumber', tone: 'sepia(0.2) saturate(0.8)' },
  { id: 'crema', name: 'Crema', tone: 'sepia(0.3)' },
  { id: 'ludwig', name: 'Ludwig', tone: 'sepia(0.08) saturate(1.05)' },
  { id: 'aden', name: 'Aden', tone: 'hue-rotate(-20deg) saturate(0.85)' },
  { id: 'perpetua', name: 'Perpetua', tone: 'saturate(1.1)' },
  { id: 'amaro', name: 'Amaro', tone: 'sepia(0.1) saturate(1.3)' },
  { id: 'mayfair', name: 'Mayfair', tone: 'sepia(0.05) saturate(1.15)' },
  { id: 'rise', name: 'Rise', tone: 'sepia(0.2) saturate(0.9)' },
  { id: 'hudson', name: 'Hudson', tone: 'hue-rotate(-10deg) saturate(1.1)' },
  { id: 'valencia', name: 'Valencia', tone: 'sepia(0.25) saturate(1.1)' },
  { id: 'xpro', name: 'X-Pro II', tone: 'sepia(0.15) saturate(1.4)' },
  { id: 'sierra', name: 'Sierra', tone: 'sepia(0.1) saturate(0.9)' },
  { id: 'nashville', name: 'Nashville', tone: 'sepia(0.2) hue-rotate(-5deg) saturate(1.2)' },
  { id: 'bn', name: 'Blanco y Negro', tone: 'grayscale(1)' },
  { id: 'sepiaclasico', name: 'Sepia', tone: 'sepia(0.8)' },
  { id: 'frio', name: 'Frío', tone: 'hue-rotate(15deg) saturate(1.1)' },
  { id: 'calido', name: 'Cálido', tone: 'hue-rotate(-15deg) sepia(0.1)' }
];

export const getPreset = (id) => FILTER_PRESETS.find((p) => p.id === id) || FILTER_PRESETS[0];
