import { MATERIAL_PROFILES } from './visualIdentitySystem';

export const resolveShapeRadius = (shape, fallback = '20px') => {
  switch (shape) {
    case 'sharp':
      return '4px';
    case 'squircle':
      return '22px';
    case 'chamfer':
      return '10px';
    case 'oval':
      return '44px';
    case 'cloud':
      return '38% 42% 35% 45% / 42% 36% 44% 38%';
    case 'organic':
      return '34px 58px 42px 64px / 48px 38px 62px 40px';
    case 'faceted':
      return '3px';
    case 'circle':
      return '50%';
    default:
      return fallback;
  }
};

export const resolveWidgetRadius = (shape) => {
  switch (shape) {
    case 'sharp':
      return '6px';
    case 'squircle':
      return '14px';
    case 'pill':
      return '999px';
    case 'oval':
      return '20px';
    case 'cloud':
      return '30px';
    default:
      return '12px';
  }
};

export const resolveShapeClipPath = (shape) => {
  if (shape === 'chamfer' || shape === 'faceted') {
    const cut = shape === 'faceted' ? '22px' : '12px';
    return `polygon(${cut} 0, calc(100% - ${cut}) 0, 100% ${cut}, 100% calc(100% - ${cut}), calc(100% - ${cut}) 100%, ${cut} 100%, 0 calc(100% - ${cut}), 0 ${cut})`;
  }

  if (shape === 'squircle') {
    return 'polygon(8% 0, 92% 0, 100% 8%, 100% 92%, 92% 100%, 8% 100%, 0 92%, 0 8%)';
  }

  return 'none';
};

export const resolveMaterialOverlay = (material) => {
  const profile = MATERIAL_PROFILES[material];
  if (profile) {
    return `${profile.highlight}, ${profile.texture}`;
  }

  switch (material) {
    case 'metal':
      return 'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(192,198,212,0.12) 22%, rgba(30,34,42,0.16) 55%, rgba(255,255,255,0.1) 100%)';
    case 'mirror':
      return 'linear-gradient(128deg, rgba(255,255,255,0.34) 0%, rgba(206,224,255,0.2) 30%, rgba(141,160,206,0.1) 60%, rgba(255,255,255,0.26) 100%)';
    case 'rubber':
      return 'repeating-linear-gradient(145deg, rgba(255,255,255,0.03) 0 3px, rgba(0,0,0,0.04) 3px 7px)';
    case 'cloud':
      return 'radial-gradient(circle at 18% 18%, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.06) 38%, transparent 58%), radial-gradient(circle at 78% 28%, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.05) 34%, transparent 56%), linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04))';
    case 'lacquer':
      return 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.02) 40%, rgba(0,0,0,0.14) 100%)';
    default:
      return 'linear-gradient(160deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02) 45%, rgba(0,0,0,0.08) 100%)';
  }
};

export const resolveCardTexture = (material) => {
  const profile = MATERIAL_PROFILES[material];
  if (profile) {
    return profile.texture;
  }

  if (material === 'metal') {
    return 'repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 4px)';
  }

  if (material === 'rubber') {
    return 'radial-gradient(circle at 10% 20%, rgba(255,255,255,0.04), transparent 20%), radial-gradient(circle at 90% 70%, rgba(0,0,0,0.15), transparent 24%)';
  }

  if (material === 'mirror') {
    return 'linear-gradient(90deg, rgba(255,255,255,0.0), rgba(255,255,255,0.28), rgba(255,255,255,0.0))';
  }

  if (material === 'cloud') {
    return 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.14), transparent 24%), radial-gradient(circle at 64% 36%, rgba(255,255,255,0.1), transparent 26%), radial-gradient(circle at 45% 72%, rgba(255,255,255,0.08), transparent 22%)';
  }

  return 'none';
};
