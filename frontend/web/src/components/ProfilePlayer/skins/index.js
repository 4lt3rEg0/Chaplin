import ObsidianAmberSkin from './obsidianAmber/ObsidianAmberSkin';
import * as obsidianAmberPalette from './obsidianAmber/palette';
import LiquidNeonTankSkin from './liquidNeonTank/LiquidNeonTankSkin';
import * as liquidNeonTankPalette from './liquidNeonTank/palette';
import VelocityCockpitSkin from './velocityCockpit/VelocityCockpitSkin';
import * as velocityCockpitPalette from './velocityCockpit/palette';
import PrismDiscSkin from './prismDisc/PrismDiscSkin';
import * as prismDiscPalette from './prismDisc/palette';
import PagerBeatSkin from './pagerBeat/PagerBeatSkin';
import * as pagerBeatPalette from './pagerBeat/palette';
import CallbackFmSkin from './callbackFm/CallbackFmSkin';
import * as callbackFmPalette from './callbackFm/palette';
import JackpotWaveSkin from './jackpotWave/JackpotWaveSkin';
import * as jackpotWavePalette from './jackpotWave/palette';
import LifeSignSkin from './lifeSign/LifeSignSkin';
import * as lifeSignPalette from './lifeSign/palette';
import NocturneReliquarySkin from './nocturneReliquary/NocturneReliquarySkin';
import * as nocturneReliquaryPalette from './nocturneReliquary/palette';
import AetherEngineSkin from './aetherEngine/AetherEngineSkin';
import * as aetherEnginePalette from './aetherEngine/palette';
import NeonHeartSkin from './neonHeart/NeonHeartSkin';
import * as neonHeartPalette from './neonHeart/palette';

/*
 * Registry for the Chaplin profile player skin collection. Each entry is:
 *   { id, label, component, colorSchema, defaultPalette, themeMapping }
 * `component` only ever receives presentation props + a resolved `palette`
 * object — it never touches SkinContext, audio state, or persistence itself.
 * Adding a new skin is: build its folder (Skin.jsx + palette.js), then add
 * one entry to SKIN_MODULES below — nothing else in ProfilePlayer.jsx,
 * Settings.jsx or AppearanceDemo.jsx needs to change.
 */
const SKIN_MODULES = [
  { component: ObsidianAmberSkin, palette: obsidianAmberPalette },
  { component: LiquidNeonTankSkin, palette: liquidNeonTankPalette },
  { component: VelocityCockpitSkin, palette: velocityCockpitPalette },
  { component: PrismDiscSkin, palette: prismDiscPalette },
  { component: PagerBeatSkin, palette: pagerBeatPalette },
  { component: CallbackFmSkin, palette: callbackFmPalette },
  { component: JackpotWaveSkin, palette: jackpotWavePalette },
  { component: LifeSignSkin, palette: lifeSignPalette },
  { component: NocturneReliquarySkin, palette: nocturneReliquaryPalette },
  { component: AetherEngineSkin, palette: aetherEnginePalette },
  { component: NeonHeartSkin, palette: neonHeartPalette }
];

export const PLAYER_SKINS = SKIN_MODULES.reduce((acc, { component, palette }) => {
  acc[palette.id] = {
    id: palette.id,
    label: palette.label,
    component,
    colorSchema: palette.colorSchema,
    defaultPalette: palette.defaultPalette,
    themeMapping: palette.themeMapping
  };
  return acc;
}, {});

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
