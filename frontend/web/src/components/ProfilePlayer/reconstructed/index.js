/*
 * Registry for real player-skin components. Two families live here:
 *  - reconstructed/<id>: traces a sketch from the user's canonical sheets
 *    (O:\...\repros, mirrored at assets-source/) — the sketch is a
 *    blueprint, never the rendered body. See reconstructed/<id>/manifest.js
 *    for sourceFile/sourceCell traceability.
 *  - y2kBubbly/<id>: no PNG reference — built directly from
 *    docs/design-specs/y2k-bubbly-players.md (pure CSS gel/glow shading).
 *
 * This file is intentionally explicit (no import.meta.glob) since each
 * entry is real, audited work, not a generated stub.
 */
import * as aquaFlow from './aquaFlow/manifest';
import * as bubblegumGloss from '../y2kBubbly/bubblegumGloss.manifest';
import * as cyberAcidJelly from '../y2kBubbly/cyberAcidJelly.manifest';
import * as transTechJelly from '../y2kBubbly/transTechJelly.manifest';

const SKIN_MODULES = [aquaFlow, bubblegumGloss, cyberAcidJelly, transTechJelly];

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
