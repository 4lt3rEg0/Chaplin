import React from 'react';
import Y2KBubblyPlayerSkin from './Y2KBubblyPlayerSkin';

export const id = 'cyber-acid-jelly';
export const label = 'Cyber-Acid Jelly';
export const component = (props) => React.createElement(Y2KBubblyPlayerSkin, { ...props, variant: 'cyber-acid-jelly' });
export const aspectRatio = 300 / 340;
export const maxWidth = 320;

export const defaultPalette = {
  colorTop: '#a6ff2e',
  colorBottom: '#fff200',
  textColor: '#0c3d00',
  btnBg: 'linear-gradient(160deg, #333333, #0c0c0c)',
  btnIcon: '#9dff33',
  accentGlow: '#7cfc00',
};

export const colorSchema = [
  { key: 'colorTop', label: 'Gel (arriba)', material: 'gel' },
  { key: 'colorBottom', label: 'Gel (abajo)', material: 'gel' },
  { key: 'accentGlow', label: 'Resplandor neón', material: 'accent' },
  { key: 'btnIcon', label: 'Iconos de botones', material: 'accent' },
];

export function themeMapping(theme) {
  const primary = theme?.colors?.primary || defaultPalette.colorTop;
  const secondary = theme?.colors?.secondary || defaultPalette.colorBottom;
  return {
    colorTop: primary,
    colorBottom: secondary,
    accentGlow: secondary,
    btnIcon: secondary,
    textColor: defaultPalette.textColor,
  };
}
