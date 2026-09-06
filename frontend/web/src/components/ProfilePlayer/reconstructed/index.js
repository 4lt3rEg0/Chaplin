/*
 * Registry for hand-reconstructed player skins. Each skin is a REAL
 * component (SVG geometry + CSS + real DOM controls) that traces a sketch
 * from the user's canonical sheets (O:\...\repros, mirrored at
 * assets-source/) — the sketch is a blueprint, never the rendered body.
 * See reconstructed/<id>/manifest.js for sourceFile/sourceCell traceability
 * and reconstructed/<id>/AquaFlowSkin.jsx-style component for the build.
 *
 * Only manifests with status 'ready' (declared per-module below) are
 * exposed to real users; this file is intentionally explicit (no
 * import.meta.glob) since each entry is real, audited work, not a
 * generated stub.
 */
import * as aquaFlow from './aquaFlow/manifest';

const SKIN_MODULES = [aquaFlow];

export const PLAYER_SKINS = SKIN_MODULES.reduce((acc, mod) => {
  acc[mod.id] = {
    id: mod.id,
    label: mod.label,
    component: mod.component,
    aspectRatio: mod.aspectRatio,
    maxWidth: mod.maxWidth,
    referenceWidth: mod.referenceWidth,
    referenceHeight: mod.referenceHeight,
    sourceFile: mod.sourceFile,
    sourceCell: mod.sourceCell,
    referenceImage: mod.referenceImage,
    colorSchema: mod.colorSchema,
    defaultPalette: mod.defaultPalette,
    themeMapping: mod.themeMapping
  };
  return acc;
}, {});

export const PLAYER_SKIN_LIST = Object.values(PLAYER_SKINS);
export const DEFAULT_PLAYER_SKIN = PLAYER_SKIN_LIST[0]?.id || null;

export function resolvePlayerPalette(skinId, colorMode, customPalettes, theme) {
  const skin = PLAYER_SKINS[skinId] || PLAYER_SKINS[DEFAULT_PLAYER_SKIN];
  if (!skin) return {};
  if (colorMode === 'custom') {
    return { ...skin.defaultPalette, ...(customPalettes?.[skin.id] || {}) };
  }
  if (colorMode === 'theme') {
    return { ...skin.defaultPalette, ...skin.themeMapping(theme || {}) };
  }
  return { ...skin.defaultPalette };
}
