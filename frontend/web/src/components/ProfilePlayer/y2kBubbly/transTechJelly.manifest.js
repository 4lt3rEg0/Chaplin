import React from 'react';
import Y2KBubblyPlayerSkin from './Y2KBubblyPlayerSkin';

export const id = 'trans-tech-jelly';
export const label = 'Trans-Tech Jelly';
export const component = (props) => React.createElement(Y2KBubblyPlayerSkin, { ...props, variant: 'trans-tech-jelly' });
export const aspectRatio = 300 / 340;
export const maxWidth = 320;

export const defaultPalette = {
  colorTop: 'rgba(255,255,255,0.22)',
  colorBottom: 'rgba(110,110,140,0.12)',
  textColor: '#5df9ff',
  btnBg: 'rgba(255,255,255,0.06)',
  btnIcon: '#5df9ff',
};

export const colorSchema = [
  { key: 'textColor', label: 'Glow cian / texto', material: 'accent' },
  { key: 'btnIcon', label: 'Iconos de botones', material: 'accent' },
];

export function themeMapping(theme) {
  const secondary = theme?.colors?.secondary || defaultPalette.textColor;
  return {
    colorTop: defaultPalette.colorTop,
    colorBottom: defaultPalette.colorBottom,
    textColor: secondary,
    btnIcon: secondary,
  };
}
