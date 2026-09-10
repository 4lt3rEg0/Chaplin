/*
 * Registry for real player-skin components. Two families live here:
 *  - reconstructed/<id>: traces a sketch from the user's canonical sheets
 *    (O:\...\repros, mirrored at assets-source/) — the sketch is a
 *    blueprint, never the rendered body. See reconstructed/<id>/manifest.js
 *    for sourceFile/sourceCell traceability.
 *  - assetPlayers/<id>: reconstructed from real extracted PNG pieces (a
 *    master asset sheet segmented into shell/screen/controls/decoration
 *    layers via tools/player-assets/), composed by real React/CSS — never
 *    a full-player screenshot with hitboxes on top. See
 *    assetPlayers/<id>/manifest.json for the source region + per-layer
 *    placement data.
 *
 * This file is intentionally explicit (no import.meta.glob) since each
 * entry is real, audited work, not a generated stub.
 */
import * as aquaFlow from './aquaFlow/manifest';
import * as bubblegumGloss from '../assetPlayers/bubblegumGloss/manifest';
import * as aeroAmp from './aeroAmp/manifest';

import * as liquidChrome from '../renderConcepts/liquid-chrome/manifest';
import { DREAM_SKINS } from '../renderConcepts/dream-collection';
const SKIN_MODULES = [aquaFlow, bubblegumGloss, aeroAmp, liquidChrome, ...DREAM_SKINS];

export const PLAYER_SKINS = SKIN_MODULES.reduce((acc, mod) => {
  acc[mod.id] = {
    id: mod.id,
    livePlayback: Boolean(mod.livePlayback || mod.id === 'liquid-chrome'),
    label: mod.label,
    component: mod.component,
    aspectRatio: mod.aspectRatio,
    maxWidth: mod.maxWidth,
    referenceWidth: mod.referenceWidth,
    referenceHeight: mod.referenceHeight,
    sourceFile: mod.sourceFile,
    sourceCell: mod.sourceCell,
    referenceImage: mod.referenceImage,
    referenceIsAssetSheet: mod.referenceIsAssetSheet || false,
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
