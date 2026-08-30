const recipe = (id, name, family, values = {}) => ({
  id,
  name,
  family,
  microtexture: 'none',
  roughness: 0.5,
  specular: 0.35,
  translucency: 0,
  depth: 0.45,
  grain: 0.2,
  highlight: 'linear-gradient(110deg, transparent 18%, rgba(255,255,255,.16) 42%, transparent 66%)',
  texture: 'none',
  borderMode: 'soft',
  shadowMode: 'ambient',
  ...values
});

export const MATERIAL_PROFILES = {
  default: recipe('default', 'Default Glass', 'glass', { microtexture: 'micro haze', roughness: .26, specular: .72, translucency: .68, texture: 'radial-gradient(circle at 20% 0%, rgba(255,255,255,.16), transparent 42%)' }),
  holofoil: recipe('holofoil', 'Holo Foil', 'foil', { microtexture: 'micro prism', roughness: .2, specular: .88, texture: 'repeating-linear-gradient(118deg, rgba(104,244,255,.13) 0 5px, rgba(255,118,216,.12) 5px 10px, rgba(255,225,117,.1) 10px 15px)', borderMode: 'embossed' }),
  bubblechrome: recipe('bubblechrome', 'Bubble Chrome', 'chrome', { roughness: .08, specular: 1, depth: .9, texture: 'radial-gradient(ellipse at 24% 12%, rgba(255,255,255,.78), transparent 20%), linear-gradient(145deg, rgba(255,255,255,.32), rgba(3,5,9,.62) 44%, rgba(185,215,255,.35) 72%, rgba(0,0,0,.74))', borderMode: 'liquid' }),
  frostline: recipe('frostline', 'Frostline', 'frosted', { microtexture: 'ice grain', roughness: .78, translucency: .5, texture: 'repeating-radial-gradient(circle at 20% 10%, rgba(255,255,255,.1) 0 1px, transparent 2px 7px)' }),
  mintcircuit: recipe('mintcircuit', 'Mint Circuit', 'enamel', { roughness: .25, specular: .68, texture: 'linear-gradient(90deg, transparent 48%, rgba(145,255,218,.13) 49% 51%, transparent 52%), linear-gradient(0deg, transparent 48%, rgba(145,255,218,.09) 49% 51%, transparent 52%)' }),
  oceanfilm: recipe('oceanfilm', 'Ocean Film', 'film', { roughness: .18, specular: .75, translucency: .7, texture: 'radial-gradient(ellipse at 22% 15%, rgba(132,255,240,.2), transparent 30%), radial-gradient(ellipse at 76% 72%, rgba(68,144,255,.2), transparent 36%)' }),
  amberflux: recipe('amberflux', 'Amber Flux', 'resin', { roughness: .22, specular: .68, translucency: .58, texture: 'radial-gradient(circle at 18% 24%, rgba(255,255,255,.22) 0 1px, transparent 2px), radial-gradient(circle at 72% 68%, rgba(255,210,116,.17) 0 2px, transparent 3px)' }),
  electricpaper: recipe('electricpaper', 'Electric Paper', 'paper', { roughness: .86, specular: .12, microtexture: 'fibers', texture: 'repeating-linear-gradient(8deg, rgba(255,255,255,.045) 0 1px, transparent 1px 5px)', shadowMode: 'print' }),
  auroraweb: recipe('auroraweb', 'Aurora Web', 'veined-glass', { roughness: .3, specular: .68, translucency: .52, texture: 'repeating-radial-gradient(ellipse at 10% 20%, transparent 0 14px, rgba(112,255,220,.08) 15px, transparent 18px)' }),
  analogmist: recipe('analogmist', 'Analog Mist', 'smoke', { roughness: .65, translucency: .42, texture: 'radial-gradient(ellipse at 18% 15%, rgba(255,255,255,.1), transparent 48%), radial-gradient(ellipse at 78% 80%, rgba(120,130,155,.12), transparent 52%)' }),
  satinorb: recipe('satinorb', 'Satin Orb', 'satin', { roughness: .46, specular: .62, microtexture: 'directional fibers', highlight: 'linear-gradient(104deg, transparent 24%, rgba(255,255,255,.3) 45%, rgba(255,255,255,.04) 58%, transparent 74%)', texture: 'repeating-linear-gradient(102deg, rgba(255,255,255,.025) 0 1px, transparent 1px 4px)' }),
  pokebox: recipe('pokebox', 'PC Box', 'abs', { roughness: .42, specular: .45, microtexture: 'mold grain', texture: 'linear-gradient(90deg, transparent 0 92%, rgba(0,0,0,.18) 92% 94%, rgba(255,255,255,.08) 94%)', borderMode: 'inset-seam' }),
  arcadefoil: recipe('arcadefoil', 'Arcade Foil', 'laminate', { roughness: .2, specular: .78, texture: 'repeating-linear-gradient(125deg, rgba(255,255,255,.12) 0 4px, transparent 4px 11px)', borderMode: 'convex' }),
  pearlstatic: recipe('pearlstatic', 'Pearl Static', 'pearl', { roughness: .32, specular: .7, texture: 'radial-gradient(circle, rgba(255,255,255,.08) 0 1px, transparent 1.5px)', microtexture: 'static grain' }),
  solarfloppy: recipe('solarfloppy', 'Solar Floppy', 'abs-label', { roughness: .5, specular: .38, texture: 'linear-gradient(180deg, rgba(255,220,130,.13) 0 28%, transparent 28%), linear-gradient(90deg, transparent 8%, rgba(210,220,225,.16) 8% 16%, transparent 16%)', borderMode: 'hardware' }),
  duskpixel: recipe('duskpixel', 'Dusk Pixel', 'pixel-enamel', { roughness: .28, specular: .6, texture: 'linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px)', microtexture: '8px grid' }),
  plasmafax: recipe('plasmafax', 'Plasma Fax', 'thermal-polymer', { roughness: .36, specular: .56, translucency: .28, texture: 'radial-gradient(circle, rgba(255,255,255,.09) 0 1px, transparent 1.5px)', microtexture: 'dot print' }),
  carbon: recipe('carbon', 'Carbon Matrix', 'carbon-rubber', { roughness: .82, specular: .2, texture: 'repeating-linear-gradient(45deg, rgba(255,255,255,.045) 0 2px, transparent 2px 6px), repeating-linear-gradient(-45deg, rgba(0,0,0,.16) 0 2px, transparent 2px 6px)', borderMode: 'equipment' }),
  deepmatrix: recipe('deepmatrix', 'Deep Matrix', 'composite', { roughness: .95, specular: .08, texture: 'radial-gradient(circle, rgba(255,255,255,.035) 0 1px, transparent 1.5px)', shadowMode: 'deep' }),
  ultraviolet: recipe('ultraviolet', 'Ultraviolet Tape', 'coated-polymer', { roughness: .48, specular: .42, texture: 'repeating-linear-gradient(90deg, rgba(255,255,255,.03) 0 1px, transparent 1px 6px)', borderMode: 'uv-edge' }),
  cobaltdeck: recipe('cobaltdeck', 'Cobalt Deck', 'anodized-metal', { roughness: .38, specular: .58, texture: 'repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0 1px, transparent 1px 3px)', borderMode: 'machined' }),
  scarletpanel: recipe('scarletpanel', 'Scarlet Panel', 'lacquer', { roughness: .18, specular: .78, highlight: 'linear-gradient(180deg, rgba(255,255,255,.3), transparent 34%, rgba(0,0,0,.22))', borderMode: 'industrial' }),
  glacierrack: recipe('glacierrack', 'Glacier Rack', 'cold-metal', { roughness: .34, specular: .62, texture: 'repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 1px, transparent 1px 3px)', borderMode: 'rack' }),
  ironstudio: recipe('ironstudio', 'Iron Studio', 'steel', { roughness: .48, specular: .48, texture: 'repeating-linear-gradient(0deg, rgba(255,255,255,.028) 0 1px, transparent 1px 3px)', borderMode: 'machined' }),
  laserlobby: recipe('laserlobby', 'Laser Lobby', 'smoked-tech', { roughness: .16, specular: .72, texture: 'linear-gradient(90deg, transparent 20%, rgba(255,90,120,.15) 20% 20.6%, transparent 20.6% 74%, rgba(90,210,255,.12) 74% 74.5%, transparent 74.5%)', borderMode: 'light-rail' }),
  plush: recipe('plush', 'Soft Plush', 'textile', { roughness: .96, specular: .05, texture: 'radial-gradient(circle, rgba(255,255,255,.035) 0 1px, transparent 1.4px)', microtexture: 'microfiber', shadowMode: 'soft' }),
  velvetglass: recipe('velvetglass', 'Velvet Glass', 'velvet-glass', { roughness: .58, specular: .42, translucency: .24, texture: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,.12) 48%, transparent 74%)' }),
  citruslab: recipe('citruslab', 'Citrus Lab', 'citrus-polymer', { roughness: .28, specular: .68, texture: 'radial-gradient(circle, rgba(255,255,255,.055) 0 1px, transparent 2px)', microtexture: 'orange peel' }),
  candyhaze: recipe('candyhaze', 'Candy Haze', 'gummy-resin', { roughness: .3, specular: .56, translucency: .6, texture: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,.2), transparent 36%), radial-gradient(ellipse at 80% 70%, rgba(255,180,220,.16), transparent 42%)' }),
  dreamshell: recipe('dreamshell', 'Dream Shell', 'nacre', { roughness: .24, specular: .78, texture: 'conic-gradient(from 130deg at 28% 18%, rgba(118,245,255,.13), rgba(255,158,223,.16), rgba(255,246,184,.13), rgba(118,245,255,.13))' }),
  toffeeplastic: recipe('toffeeplastic', 'Toffee Plastic', 'vintage-abs', { roughness: .52, specular: .34, texture: 'radial-gradient(circle, rgba(255,255,255,.035) 0 1px, transparent 1.6px)', microtexture: 'molded grain' }),
  marshmallow: recipe('marshmallow', 'Marshmallow Beam', 'silicone', { roughness: .92, specular: .1, texture: 'linear-gradient(90deg, transparent 18%, rgba(110,245,255,.18) 18% 19%, transparent 19% 78%, rgba(110,245,255,.12) 78% 79%, transparent 79%)' }),
  crtgrid: recipe('crtgrid', 'CRT Grid', 'phosphor-screen', { roughness: .3, specular: .58, texture: 'repeating-linear-gradient(0deg, rgba(255,255,255,.04) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(90,255,180,.025) 0 1px, transparent 1px 4px)', borderMode: 'bezel' }),
  neonmesh: recipe('neonmesh', 'Neon Mesh', 'woven-light', { roughness: .62, specular: .34, texture: 'repeating-linear-gradient(45deg, rgba(90,255,235,.08) 0 1px, transparent 1px 6px), repeating-linear-gradient(-45deg, rgba(255,90,190,.055) 0 1px, transparent 1px 6px)' }),
  emberwire: recipe('emberwire', 'Ember Wire', 'charred-rubber', { roughness: .9, specular: .1, texture: 'repeating-linear-gradient(112deg, transparent 0 12px, rgba(255,116,64,.1) 12px 13px, transparent 13px 27px)' }),
  holofax: recipe('holofax', 'Holo Fax', 'office-foil', { roughness: .4, specular: .58, texture: 'radial-gradient(circle, rgba(255,255,255,.07) 0 1px, transparent 1.5px), linear-gradient(120deg, rgba(110,240,255,.08), rgba(255,170,225,.08))' }),
  bluewire: recipe('bluewire', 'Blue Wireframe', 'blueprint', { roughness: .9, specular: .08, texture: 'linear-gradient(90deg, rgba(120,190,255,.09) 1px, transparent 1px), linear-gradient(rgba(120,190,255,.09) 1px, transparent 1px)', microtexture: 'technical grid', shadowMode: 'print' }),
  lunarterminal: recipe('lunarterminal', 'Lunar Terminal', 'blasted-metal', { roughness: .84, specular: .22, texture: 'radial-gradient(circle, rgba(255,255,255,.04) 0 1px, transparent 1.5px)', microtexture: 'lunar grain' }),
  obsidianmono: recipe('obsidianmono', 'Obsidian Mono', 'obsidian', { roughness: .08, specular: .94, texture: 'linear-gradient(116deg, transparent 30%, rgba(255,255,255,.25) 48%, transparent 56%), radial-gradient(circle at 70% 30%, rgba(255,255,255,.04), transparent 20%)', shadowMode: 'black-deep' }),
  monochromeplus: recipe('monochromeplus', 'Monochrome Plus', 'ceramic-metal', { roughness: .42, specular: .48, texture: 'radial-gradient(circle, rgba(255,255,255,.035) 0 1px, transparent 1.5px)', borderMode: 'polished-edge' })
};

export const HUD_GRAMMARS = {
  aero: { id: 'aero', name: 'Aero Instrumentation', corner: 'round', line: 'soft', ornament: 'float', marker: 'orb', density: 'low' },
  tactical: { id: 'tactical', name: 'Tactical Edge', corner: 'cut', line: 'thin', ornament: 'bracket', marker: 'tick', density: 'medium' },
  industrial: { id: 'industrial', name: 'Industrial Instrument', corner: 'hard', line: 'double', ornament: 'gauge', marker: 'lamp', density: 'high' },
  collector: { id: 'collector', name: 'Collector', corner: 'badge', line: 'packaging', ornament: 'serial', marker: 'slot', density: 'medium' },
  studio: { id: 'studio', name: 'Studio Console', corner: 'rack', line: 'rail', ornament: 'meter', marker: 'led', density: 'high' },
  editorial: { id: 'editorial', name: 'Editorial Future', corner: 'none', line: 'rule', ornament: 'caption', marker: 'index', density: 'low' },
  gothic: { id: 'gothic', name: 'Gothic Tech', corner: 'point', line: 'architectural', ornament: 'glyph', marker: 'crest', density: 'medium' },
  comic: { id: 'comic', name: 'Comic System', corner: 'panel', line: 'ink', ornament: 'caption', marker: 'burst', density: 'medium' },
  scientific: { id: 'scientific', name: 'Scientific Minimal', corner: 'precise', line: 'hairline', ornament: 'measure', marker: 'datum', density: 'low' }
};

export const LAYOUT_COMPOSITIONS = {
  balanced: { id: 'balanced', name: 'Balanced Profile', desktop: 'balanced', mobile: 'hero-primary-secondary', maxWidth: 1320 },
  edge: { id: 'edge', name: 'Edge Command', desktop: 'peripheral', mobile: 'hero-strips-content', maxWidth: 1480 },
  collector: { id: 'collector', name: 'Collector Showcase', desktop: 'showcase', mobile: 'hero-carousel-stack', maxWidth: 1400 },
  studio: { id: 'studio', name: 'Studio Rack', desktop: 'rack', mobile: 'channel-stack', maxWidth: 1480 },
  constellation: { id: 'constellation', name: 'Floating Constellation', desktop: 'floating', mobile: 'hero-islands', maxWidth: 1380 },
  editorial: { id: 'editorial', name: 'Editorial Spread', desktop: 'spread', mobile: 'magazine', maxWidth: 1320 },
  comic: { id: 'comic', name: 'Comic Mosaic', desktop: 'mosaic', mobile: 'narrative-stack', maxWidth: 1360 },
  terminal: { id: 'terminal', name: 'Terminal Matrix', desktop: 'matrix', mobile: 'dense-slots', maxWidth: 1500 },
  organic: { id: 'organic', name: 'Organic Garden', desktop: 'flow', mobile: 'breathing-stack', maxWidth: 1240 },
  shrine: { id: 'shrine', name: 'Hero Shrine', desktop: 'hero-orbit', mobile: 'hero-first', maxWidth: 1380 },
  gallery: { id: 'gallery', name: 'Minimal Gallery', desktop: 'gallery', mobile: 'essential-only', maxWidth: 1080 },
  arcade: { id: 'arcade', name: 'Arcade Board', desktop: 'zones', mobile: 'marquee-stack', maxWidth: 1400 }
};

export const TYPOGRAPHY_PROFILES = {
  aero: { id: 'aero', name: 'Aero Soft', display: "'Trebuchet MS', 'Segoe UI', sans-serif", body: "'Segoe UI', sans-serif", ui: "'Segoe UI', sans-serif", mono: "'Consolas', monospace" },
  technical: { id: 'technical', name: 'Technical Condensed', display: "'Arial Narrow', 'Rajdhani', sans-serif", body: "'Segoe UI', sans-serif", ui: "'Arial Narrow', sans-serif", mono: "'Consolas', monospace" },
  luxury: { id: 'luxury', name: 'Digital Editorial', display: "'Georgia', serif", body: "'Segoe UI', sans-serif", ui: "'Trebuchet MS', sans-serif", mono: "'Consolas', monospace" },
  playful: { id: 'playful', name: 'Playful Object', display: "'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif", body: "'Trebuchet MS', sans-serif", ui: "'Arial Rounded MT Bold', sans-serif", mono: "'Consolas', monospace" },
  precise: { id: 'precise', name: 'Scientific Precise', display: "'Arial Narrow', sans-serif", body: "'Segoe UI', sans-serif", ui: "'Arial Narrow', sans-serif", mono: "'Consolas', monospace" },
  pixel: { id: 'pixel', name: 'Collector Pixel', display: "'Press Start 2P', 'Consolas', monospace", body: "'Trebuchet MS', sans-serif", ui: "'VT323', 'Consolas', monospace", mono: "'Consolas', monospace" },
  arcade: { id: 'arcade', name: 'Arcade Energy', display: "'Arial Black', 'Trebuchet MS', sans-serif", body: "'Trebuchet MS', sans-serif", ui: "'Arial Narrow', sans-serif", mono: "'Consolas', monospace" },
  studio: { id: 'studio', name: 'Studio Utility', display: "'Arial Narrow', sans-serif", body: "'Segoe UI', sans-serif", ui: "'Arial Narrow', sans-serif", mono: "'Consolas', monospace" }
};

export const SHAPE_CONTENT_PROFILES = {
  rounded: { id: 'rounded', insetX: '22px', insetY: '20px', titleInset: '2px', controlInset: '0px', cornerInset: '16px', minHeight: '72px' },
  squircle: { id: 'squircle', insetX: '30px', insetY: '24px', titleInset: '4px', controlInset: '2px', cornerInset: '24px', minHeight: '78px' },
  sharp: { id: 'sharp', insetX: '18px', insetY: '16px', titleInset: '0px', controlInset: '0px', cornerInset: '8px', minHeight: '64px' },
  chamfer: { id: 'chamfer', insetX: '28px', insetY: '22px', titleInset: '5px', controlInset: '3px', cornerInset: '22px', minHeight: '72px' },
  faceted: { id: 'faceted', insetX: '34px', insetY: '27px', titleInset: '7px', controlInset: '4px', cornerInset: '28px', minHeight: '80px' },
  oval: { id: 'oval', insetX: '34px', insetY: '22px', titleInset: '4px', controlInset: '3px', cornerInset: '26px', minHeight: '78px' },
  pill: { id: 'pill', insetX: '38px', insetY: '18px', titleInset: '4px', controlInset: '4px', cornerInset: '30px', minHeight: '68px' },
  cloud: { id: 'cloud', insetX: '38px', insetY: '30px', titleInset: '8px', controlInset: '5px', cornerInset: '32px', minHeight: '88px' },
  organic: { id: 'organic', insetX: '42px', insetY: '32px', titleInset: '8px', controlInset: '5px', cornerInset: '34px', minHeight: '92px' }
};

export const THEME_IDENTITY_DEFAULTS = {
  y2k: { materialId: 'default', hudId: 'aero', layoutId: 'constellation', typographyId: 'aero', shapeId: 'squircle', density: 'airy', ornament: 2 },
  cyberpunk: { materialId: 'deepmatrix', hudId: 'tactical', layoutId: 'edge', typographyId: 'technical', shapeId: 'chamfer', density: 'compact', ornament: 2 },
  chrome: { materialId: 'bubblechrome', hudId: 'scientific', layoutId: 'shrine', typographyId: 'luxury', shapeId: 'oval', density: 'balanced', ornament: 1 },
  neo3d: { materialId: 'citruslab', hudId: 'collector', layoutId: 'collector', typographyId: 'playful', shapeId: 'cloud', density: 'balanced', ornament: 2 },
  void4d: { materialId: 'obsidianmono', hudId: 'scientific', layoutId: 'gallery', typographyId: 'precise', shapeId: 'chamfer', density: 'airy', ornament: 1 },
  crystalcave: { materialId: 'frostline', hudId: 'scientific', layoutId: 'shrine', typographyId: 'precise', shapeId: 'faceted', density: 'balanced', ornament: 2 },
  pixelmon: { materialId: 'pokebox', hudId: 'collector', layoutId: 'collector', typographyId: 'pixel', shapeId: 'squircle', density: 'compact', ornament: 3 },
  sunsetarcade: { materialId: 'arcadefoil', hudId: 'collector', layoutId: 'arcade', typographyId: 'arcade', shapeId: 'rounded', density: 'compact', ornament: 3 },
  frostedgarden: { materialId: 'oceanfilm', hudId: 'aero', layoutId: 'organic', typographyId: 'aero', shapeId: 'organic', density: 'airy', ornament: 1 },
  crimsonstudio: { materialId: 'scarletpanel', hudId: 'studio', layoutId: 'studio', typographyId: 'studio', shapeId: 'chamfer', density: 'compact', ornament: 2 }
};

export const LEGACY_LAYOUT_MAP = {
  classic: 'balanced', collector: 'collector', studio: 'studio', soft: 'organic', retrogrid: 'terminal', minimal: 'gallery'
};

export const resolveIdentity = (themeId, variantId, overrides = {}) => {
  const defaults = THEME_IDENTITY_DEFAULTS[themeId] || THEME_IDENTITY_DEFAULTS.y2k;
  const legacyMaterialId = variantId !== 'default' && MATERIAL_PROFILES[variantId] ? variantId : null;
  const materialId = MATERIAL_PROFILES[overrides.materialId] ? overrides.materialId : (legacyMaterialId || defaults.materialId);
  const hudId = HUD_GRAMMARS[overrides.hudId] ? overrides.hudId : defaults.hudId;
  const layoutId = LAYOUT_COMPOSITIONS[overrides.layoutId] ? overrides.layoutId : defaults.layoutId;
  const typographyId = TYPOGRAPHY_PROFILES[overrides.typographyId] ? overrides.typographyId : defaults.typographyId;
  const shapeId = SHAPE_CONTENT_PROFILES[overrides.shapeId] ? overrides.shapeId : defaults.shapeId;
  return {
    material: MATERIAL_PROFILES[materialId],
    hud: HUD_GRAMMARS[hudId],
    layout: LAYOUT_COMPOSITIONS[layoutId],
    typography: TYPOGRAPHY_PROFILES[typographyId],
    shapeId,
    shape: SHAPE_CONTENT_PROFILES[shapeId] || SHAPE_CONTENT_PROFILES.rounded,
    density: overrides.density || defaults.density,
    ornament: Number.isFinite(Number(overrides.ornament)) ? Math.max(0, Math.min(3, Number(overrides.ornament))) : defaults.ornament,
    materialIntensity: Number.isFinite(Number(overrides.materialIntensity)) ? Math.max(0, Math.min(1, Number(overrides.materialIntensity))) : 0.72
  };
};
