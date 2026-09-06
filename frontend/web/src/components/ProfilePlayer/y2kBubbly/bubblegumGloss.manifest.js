import React from 'react';
import Y2KBubblyPlayerSkin from './Y2KBubblyPlayerSkin';

export const id = 'bubblegum-gloss';
export const label = 'Y2K Bubblegum Gloss';
export const component = (props) => React.createElement(Y2KBubblyPlayerSkin, { ...props, variant: 'bubblegum-gloss' });
export const aspectRatio = 300 / 340;
export const maxWidth = 320;

// No hay PNG de referencia para esta familia (docs/design-specs/
// y2k-bubbly-players.md) — todo es CSS real, nada trazado.
export const defaultPalette = {
  colorTop: '#ffc4d6',
  colorBottom: '#35b7ff',
  textColor: '#ffffff',
  btnBg: 'linear-gradient(155deg, #ff8fd0, #c71585)',
  btnIcon: '#ffffff',
};

export const colorSchema = [
  { key: 'colorTop', label: 'Gel (arriba)', material: 'gel' },
  { key: 'colorBottom', label: 'Gel (abajo)', material: 'gel' },
  { key: 'textColor', label: 'Texto / display', material: 'text' },
  { key: 'btnIcon', label: 'Iconos de botones', material: 'accent' },
];

export function themeMapping(theme) {
  const primary = theme?.colors?.primary || defaultPalette.colorTop;
  const secondary = theme?.colors?.secondary || defaultPalette.colorBottom;
  return {
    colorTop: primary,
    colorBottom: secondary,
    textColor: theme?.colors?.text || defaultPalette.textColor,
    btnIcon: theme?.colors?.text || defaultPalette.btnIcon,
  };
}
