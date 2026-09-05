import ObsidianAmberSkin from './obsidianAmber/ObsidianAmberSkin';
import * as obsidianAmberPalette from './obsidianAmber/palette';

/*
 * Registry for the Chaplin profile player skin collection. Each entry is:
 *   { id, label, component, colorSchema, defaultPalette, themeMapping }
 * `component` only ever receives presentation props + a resolved `palette`
 * object — it never touches SkinContext, audio state, or persistence itself.
 * Adding skin #2+ later is just adding another entry here; nothing else in
 * ProfilePlayer.jsx, Settings.jsx or AppearanceDemo.jsx needs to change.
 */
export const PLAYER_SKINS = {
  [obsidianAmberPalette.id]: {
    id: obsidianAmberPalette.id,
    label: obsidianAmberPalette.label,
    component: ObsidianAmberSkin,
    colorSchema: obsidianAmberPalette.colorSchema,
    defaultPalette: obsidianAmberPalette.defaultPalette,
    themeMapping: obsidianAmberPalette.themeMapping
  }
};

export const PLAYER_SKIN_LIST = Object.values(PLAYER_SKINS);
export const DEFAULT_PLAYER_SKIN = obsidianAmberPalette.id;

/* Resolves the actual palette object a skin should render with, given the
   user's chosen color mode. Mirrors the persisted/preview/render philosophy
   used elsewhere in Chaplin: this is the single source of truth both the
   real ProfilePlayer and the Settings demo call into. */
export function resolvePlayerPalette(skinId, colorMode, customPalettes, theme) {
  const skin = PLAYER_SKINS[skinId] || PLAYER_SKINS[DEFAULT_PLAYER_SKIN];
  if (colorMode === 'custom') {
    return { ...skin.defaultPalette, ...(customPalettes?.[skin.id] || {}) };
  }
  if (colorMode === 'theme') {
    return { ...skin.defaultPalette, ...skin.themeMapping(theme || {}) };
  }
  return { ...skin.defaultPalette };
}
