import PngPlayerSkin from '../pngEngine/PngPlayerSkin';

/*
 * Registry for the PNG-sourced player collection. Every manifest here was
 * generated from the canonical source sheets the user supplied under
 * O:\...\repros (mirrored, untouched, at
 * public/assets/profile-players/source). Nothing in this folder invents a
 * visual design — manifests only record where the pre-existing artwork's
 * controls/displays/LEDs/recolorable regions already are. See
 * scripts/player-extraction for the extraction pipeline and
 * public/assets/profile-players/generated/_raw/inventory.json for
 * source-sheet/cell traceability of every id.
 *
 * A manifest only appears in the live, user-selectable list once its
 * status is "ready" (controls mapped, display/LED regions set, visually
 * verified) — everything else stays loaded for internal debug
 * (?playerDebug=1) but hidden from real users while still in progress.
 */
const manifestModules = import.meta.glob('./manifests/*.json', { eager: true });

const MANIFESTS = Object.values(manifestModules).map((mod) => mod.default || mod);

function buildColorSchema(manifest) {
  return (manifest.colorRegions || [])
    .filter((r) => r.mask)
    .map((r) => ({ key: r.id, label: r.label || r.id }));
}

function buildDefaultPalette(manifest) {
  const regionColors = {};
  (manifest.colorRegions || []).forEach((r) => {
    if (r.mask) regionColors[r.id] = r.defaultColor;
  });
  return { colorMode: 'original', regionColors };
}

function buildThemeMapping(manifest) {
  return (theme) => {
    const regionColors = {};
    (manifest.colorRegions || []).forEach((r) => {
      if (!r.mask) return;
      const themeColor = r.themeSlot && theme?.colors ? theme.colors[r.themeSlot] : null;
      regionColors[r.id] = themeColor || r.defaultColor;
    });
    return { colorMode: 'theme', regionColors };
  };
}

export const ALL_PNG_MANIFESTS = MANIFESTS;

export const PLAYER_SKINS = MANIFESTS.filter((m) => m.status === 'ready').reduce((acc, manifest) => {
  acc[manifest.id] = {
    id: manifest.id,
    label: manifest.label,
    component: PngPlayerSkin,
    manifest,
    colorSchema: buildColorSchema(manifest),
    defaultPalette: buildDefaultPalette(manifest),
    themeMapping: buildThemeMapping(manifest)
  };
  return acc;
}, {});

export const PLAYER_SKIN_LIST = Object.values(PLAYER_SKINS);
export const DEFAULT_PLAYER_SKIN = PLAYER_SKIN_LIST[0]?.id || null;

export function resolvePlayerPalette(skinId, colorMode, customPalettes, theme) {
  const skin = PLAYER_SKINS[skinId] || PLAYER_SKINS[DEFAULT_PLAYER_SKIN];
  if (!skin) return { colorMode: 'original', regionColors: {} };
  if (colorMode === 'custom') {
    const custom = customPalettes?.[skin.id] || {};
    return { colorMode: 'custom', regionColors: { ...skin.defaultPalette.regionColors, ...custom } };
  }
  if (colorMode === 'theme') {
    return skin.themeMapping(theme || {});
  }
  return skin.defaultPalette;
}

export function resolvePlayerAsset(manifest) {
  return manifest.asset;
}
