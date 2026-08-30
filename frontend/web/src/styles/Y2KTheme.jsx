import { createGlobalStyle } from 'styled-components';
import {
  resolveCardTexture,
  resolveMaterialOverlay,
  resolveShapeClipPath,
  resolveShapeRadius
} from './hudTokens';
import { LEGACY_LAYOUT_MAP, resolveIdentity } from './visualIdentitySystem';

const NOISE_TEXTURE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

export const THEME_PRESETS = {
  y2k: {
    id: 'y2k',
    name: 'Y2K Mirage',
    tagline: 'Cromo líquido y nostalgia de internet tardío',
    accent: '#7af7ff',
    secondary: '#ff7bd5',
    background: '#060816',
    surface: '#11172b',
    surfaceAlt: '#18203a',
    text: '#f4fbff',
    textSecondary: '#9fb4cb',
    border: 'rgba(122, 247, 255, 0.26)',
    borderStrong: 'rgba(255, 123, 213, 0.42)',
    pageGradient: 'radial-gradient(circle at top, rgba(122, 247, 255, 0.20), transparent 34%), linear-gradient(180deg, #060816 0%, #0a1020 48%, #05070f 100%)',
    heroGradient: 'linear-gradient(135deg, rgba(122, 247, 255, 0.18), rgba(255, 123, 213, 0.18))',
    chromeGradient: 'linear-gradient(135deg, #eff9ff 0%, #8de8ff 22%, #fff2fb 48%, #8cc1ff 74%, #fefefe 100%)',
    fonts: {
      primary: "'Orbitron', 'Trebuchet MS', sans-serif",
      secondary: "'Space Grotesk', 'Segoe UI', sans-serif",
      ui: "'Michroma', 'Segoe UI', sans-serif"
    }
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Alley',
    tagline: 'Neón ácido, lluvia digital y señal clandestina',
    accent: '#36ff9d',
    secondary: '#ff5ab3',
    background: '#05070b',
    surface: '#101716',
    surfaceAlt: '#162220',
    text: '#f3fff9',
    textSecondary: '#8db9ad',
    border: 'rgba(54, 255, 157, 0.24)',
    borderStrong: 'rgba(255, 90, 179, 0.34)',
    pageGradient: 'radial-gradient(circle at top right, rgba(54, 255, 157, 0.14), transparent 26%), radial-gradient(circle at 15% 25%, rgba(255, 90, 179, 0.18), transparent 24%), linear-gradient(180deg, #040507 0%, #0b1012 46%, #040506 100%)',
    heroGradient: 'linear-gradient(135deg, rgba(54, 255, 157, 0.18), rgba(255, 90, 179, 0.18))',
    chromeGradient: 'linear-gradient(135deg, #dffff0 0%, #4cffb5 24%, #ffb6dd 52%, #1e5143 75%, #f7fff7 100%)',
    fonts: {
      primary: "'Orbitron', 'Arial Black', sans-serif",
      secondary: "'Rajdhani', 'Segoe UI', sans-serif",
      ui: "'Michroma', 'Segoe UI', sans-serif"
    }
  },
  chrome: {
    id: 'chrome',
    name: 'Chrome Idol',
    tagline: 'Superficie espejada, brillo industrial y volumen 3D',
    accent: '#d8f6ff',
    secondary: '#7ce0ff',
    background: '#050608',
    surface: '#121418',
    surfaceAlt: '#1b1f26',
    text: '#f7fbff',
    textSecondary: '#aeb8c4',
    border: 'rgba(216, 246, 255, 0.22)',
    borderStrong: 'rgba(124, 224, 255, 0.36)',
    pageGradient: 'radial-gradient(circle at top, rgba(216, 246, 255, 0.18), transparent 34%), linear-gradient(180deg, #050608 0%, #11141a 42%, #030406 100%)',
    heroGradient: 'linear-gradient(135deg, rgba(216, 246, 255, 0.18), rgba(124, 224, 255, 0.14))',
    chromeGradient: 'linear-gradient(135deg, #ffffff 0%, #b7c3d2 18%, #fcffff 40%, #8c99a8 58%, #eef5ff 76%, #ffffff 100%)',
    fonts: {
      primary: "'Orbitron', 'Segoe UI', sans-serif",
      secondary: "'Space Grotesk', 'Segoe UI', sans-serif",
      ui: "'Michroma', 'Segoe UI', sans-serif"
    }
  },
  neo3d: {
    id: 'neo3d',
    name: 'Neo 3D Bloom',
    tagline: 'Burbuja plástica, volumen cálido y superficies translúcidas',
    accent: '#ffb347',
    secondary: '#7af7ff',
    background: '#120b08',
    surface: '#241713',
    surfaceAlt: '#31211b',
    text: '#fff6ef',
    textSecondary: '#d3b7aa',
    border: 'rgba(255, 179, 71, 0.26)',
    borderStrong: 'rgba(122, 247, 255, 0.30)',
    pageGradient: 'radial-gradient(circle at top left, rgba(255, 179, 71, 0.20), transparent 28%), radial-gradient(circle at 80% 20%, rgba(122, 247, 255, 0.14), transparent 24%), linear-gradient(180deg, #120b08 0%, #1d1310 44%, #090607 100%)',
    heroGradient: 'linear-gradient(135deg, rgba(255, 179, 71, 0.20), rgba(122, 247, 255, 0.12))',
    chromeGradient: 'linear-gradient(135deg, #fff2dc 0%, #ffcb75 24%, #fffaf0 48%, #7af7ff 74%, #fff6e3 100%)',
    fonts: {
      primary: "'Orbitron', 'Trebuchet MS', sans-serif",
      secondary: "'Space Grotesk', 'Segoe UI', sans-serif",
      ui: "'Michroma', 'Segoe UI', sans-serif"
    }
  },
  void4d: {
    id: 'void4d',
    name: 'Void 4D Signal',
    tagline: 'Profundidad irreal, capas lumínicas y distorsión espacial',
    accent: '#70ffd9',
    secondary: '#ff8d6b',
    background: '#03050a',
    surface: '#0d1420',
    surfaceAlt: '#152134',
    text: '#effcff',
    textSecondary: '#9ab1c8',
    border: 'rgba(112, 255, 217, 0.24)',
    borderStrong: 'rgba(255, 141, 107, 0.34)',
    pageGradient: 'radial-gradient(circle at 20% 20%, rgba(112, 255, 217, 0.16), transparent 18%), radial-gradient(circle at 80% 18%, rgba(255, 141, 107, 0.18), transparent 20%), linear-gradient(180deg, #020409 0%, #08111c 42%, #020306 100%)',
    heroGradient: 'linear-gradient(135deg, rgba(112, 255, 217, 0.18), rgba(255, 141, 107, 0.16))',
    chromeGradient: 'linear-gradient(135deg, #edfffb 0%, #70ffd9 22%, #fff3ef 46%, #8bb9ff 70%, #fdfefe 100%)',
    fonts: {
      primary: "'Orbitron', 'Segoe UI', sans-serif",
      secondary: "'Space Grotesk', 'Segoe UI', sans-serif",
      ui: "'Michroma', 'Segoe UI', sans-serif"
    }
  },
  crystalcave: {
    id: 'crystalcave',
    name: 'Crystal Cave',
    tagline: 'Cian glacial, reflejos prismáticos y brillo de cueva marina',
    accent: '#8ff4ff',
    secondary: '#6d9dff',
    background: '#050d1a',
    surface: '#10213b',
    surfaceAlt: '#1a2f52',
    text: '#eef8ff',
    textSecondary: '#9bb7d6',
    border: 'rgba(143, 244, 255, 0.24)',
    borderStrong: 'rgba(109, 157, 255, 0.34)',
    pageGradient: 'radial-gradient(circle at 15% 10%, rgba(143, 244, 255, 0.22), transparent 30%), radial-gradient(circle at 80% 20%, rgba(109, 157, 255, 0.22), transparent 28%), linear-gradient(180deg, #050d1a 0%, #0a1630 46%, #040913 100%)',
    heroGradient: 'linear-gradient(135deg, rgba(143, 244, 255, 0.20), rgba(109, 157, 255, 0.18))',
    chromeGradient: 'linear-gradient(135deg, #f5ffff 0%, #8ff4ff 24%, #e4ecff 52%, #88bbff 76%, #ffffff 100%)',
    fonts: {
      primary: "'Audiowide', 'Orbitron', sans-serif",
      secondary: "'Space Grotesk', 'Segoe UI', sans-serif",
      ui: "'Michroma', 'Segoe UI', sans-serif"
    }
  },
  pixelmon: {
    id: 'pixelmon',
    name: 'Pixel Monster Box',
    tagline: 'Inspirado en cajas de PC retro: limpio, brillante y coleccionable',
    accent: '#ffcb05',
    secondary: '#3d7dca',
    background: '#0e1933',
    surface: '#1e2d54',
    surfaceAlt: '#2f4478',
    text: '#f7fbff',
    textSecondary: '#c8d5f0',
    border: 'rgba(255, 203, 5, 0.26)',
    borderStrong: 'rgba(61, 125, 202, 0.34)',
    pageGradient: 'radial-gradient(circle at top, rgba(255, 203, 5, 0.18), transparent 32%), linear-gradient(180deg, #0d1730 0%, #17284d 48%, #0a1328 100%)',
    heroGradient: 'linear-gradient(135deg, rgba(255, 203, 5, 0.20), rgba(61, 125, 202, 0.20))',
    chromeGradient: 'linear-gradient(135deg, #fff9df 0%, #ffd94a 22%, #f4f9ff 50%, #6fa5f5 76%, #ffffff 100%)',
    fonts: {
      primary: "'Press Start 2P', 'Orbitron', sans-serif",
      secondary: "'VT323', 'Space Grotesk', sans-serif",
      ui: "'Press Start 2P', 'Segoe UI', sans-serif"
    }
  },
  sunsetarcade: {
    id: 'sunsetarcade',
    name: 'Sunset Arcade',
    tagline: 'Atardecer sintético, rejilla noventera y neón cálido',
    accent: '#ff8a5c',
    secondary: '#ff4ecd',
    background: '#110a1f',
    surface: '#24153e',
    surfaceAlt: '#321f52',
    text: '#fff5fd',
    textSecondary: '#d6b9d0',
    border: 'rgba(255, 138, 92, 0.24)',
    borderStrong: 'rgba(255, 78, 205, 0.34)',
    pageGradient: 'radial-gradient(circle at 50% -10%, rgba(255, 138, 92, 0.34), transparent 34%), linear-gradient(180deg, #140a20 0%, #1f1230 42%, #0c0816 100%)',
    heroGradient: 'linear-gradient(135deg, rgba(255, 138, 92, 0.20), rgba(255, 78, 205, 0.18))',
    chromeGradient: 'linear-gradient(135deg, #fff2ed 0%, #ff9f71 24%, #ffd9f7 52%, #ff5dd4 74%, #fff7fd 100%)',
    fonts: {
      primary: "'Audiowide', 'Orbitron', sans-serif",
      secondary: "'Rajdhani', 'Segoe UI', sans-serif",
      ui: "'Michroma', 'Segoe UI', sans-serif"
    }
  },
  frostedgarden: {
    id: 'frostedgarden',
    name: 'Frosted Garden',
    tagline: 'Verde menta, perla opalina y superficies suaves de vidrio',
    accent: '#7fffd4',
    secondary: '#9ce6ff',
    background: '#081513',
    surface: '#132925',
    surfaceAlt: '#1c3a34',
    text: '#eefef9',
    textSecondary: '#a2cec0',
    border: 'rgba(127, 255, 212, 0.24)',
    borderStrong: 'rgba(156, 230, 255, 0.34)',
    pageGradient: 'radial-gradient(circle at 20% 15%, rgba(127, 255, 212, 0.22), transparent 30%), linear-gradient(180deg, #081513 0%, #10211d 42%, #060d0b 100%)',
    heroGradient: 'linear-gradient(135deg, rgba(127, 255, 212, 0.18), rgba(156, 230, 255, 0.16))',
    chromeGradient: 'linear-gradient(135deg, #effff8 0%, #9effdd 24%, #f3fffb 46%, #a6e6ff 76%, #ffffff 100%)',
    fonts: {
      primary: "'Orbitron', 'Trebuchet MS', sans-serif",
      secondary: "'Space Grotesk', 'Segoe UI', sans-serif",
      ui: "'Michroma', 'Segoe UI', sans-serif"
    }
  },
  crimsonstudio: {
    id: 'crimsonstudio',
    name: 'Crimson Studio',
    tagline: 'Rojo estudio, negro lacado y paneles de mezcla premium',
    accent: '#ff4f6d',
    secondary: '#ffb86b',
    background: '#140609',
    surface: '#2a1118',
    surfaceAlt: '#3a1a23',
    text: '#fff0f3',
    textSecondary: '#d8a6b0',
    border: 'rgba(255, 79, 109, 0.24)',
    borderStrong: 'rgba(255, 184, 107, 0.34)',
    pageGradient: 'radial-gradient(circle at 80% 5%, rgba(255, 79, 109, 0.30), transparent 35%), linear-gradient(180deg, #15060a 0%, #240d14 45%, #090305 100%)',
    heroGradient: 'linear-gradient(135deg, rgba(255, 79, 109, 0.20), rgba(255, 184, 107, 0.14))',
    chromeGradient: 'linear-gradient(135deg, #fff0f2 0%, #ff738a 24%, #ffe6d0 52%, #ffb86b 74%, #fff7ef 100%)',
    fonts: {
      primary: "'Orbitron', 'Segoe UI', sans-serif",
      secondary: "'Rajdhani', 'Segoe UI', sans-serif",
      ui: "'Michroma', 'Segoe UI', sans-serif"
    }
  }
};

const EXTRA_VARIANT_BLUEPRINTS = [
  { id: 'neonmesh', name: 'Neon Mesh', texture: 'Malla luminosa de club', layoutTemplate: 'retrogrid', cardShape: 'chamfer', widgetShape: 'sharp', material: 'metal', frame: 'double', radius: '9px', padding: '16px' },
  { id: 'velvetglass', name: 'Velvet Glass', texture: 'Vidrio aterciopelado con bloom', layoutTemplate: 'soft', cardShape: 'rounded', widgetShape: 'pill', material: 'glass', frame: 'solid', radius: '24px', padding: '24px' },
  { id: 'arcadefoil', name: 'Arcade Foil', texture: 'Laminado brillante de maquina arcade', layoutTemplate: 'collector', cardShape: 'oval', widgetShape: 'pill', material: 'mirror', frame: 'double', radius: '28px', padding: '24px' },
  { id: 'deepmatrix', name: 'Deep Matrix', texture: 'Trama oscura con brillo espectral', layoutTemplate: 'studio', cardShape: 'sharp', widgetShape: 'sharp', material: 'rubber', frame: 'solid', radius: '7px', padding: '16px' },
  { id: 'bubblechrome', name: 'Bubble Chrome', texture: 'Cromado burbuja con reflejos suaves', layoutTemplate: 'classic', cardShape: 'cloud', widgetShape: 'cloud', material: 'mirror', frame: 'solid', radius: '32px', padding: '26px' },
  { id: 'frostline', name: 'Frostline', texture: 'Escarcha lineal y brillo polar', layoutTemplate: 'classic', cardShape: 'squircle', widgetShape: 'oval', material: 'glass', frame: 'solid', radius: '20px', padding: '20px' },
  { id: 'ultraviolet', name: 'Ultraviolet Tape', texture: 'Cinta UV de estudio nocturno', layoutTemplate: 'studio', cardShape: 'chamfer', widgetShape: 'sharp', material: 'lacquer', frame: 'double', radius: '10px', padding: '17px' },
  { id: 'citruslab', name: 'Citrus Lab', texture: 'Acido citrico y plastico pop', layoutTemplate: 'soft', cardShape: 'rounded', widgetShape: 'pill', material: 'cloud', frame: 'solid', radius: '22px', padding: '24px' },
  { id: 'lunarterminal', name: 'Lunar Terminal', texture: 'Terminal lunar granulada', layoutTemplate: 'minimal', cardShape: 'sharp', widgetShape: 'sharp', material: 'metal', frame: 'solid', radius: '8px', padding: '16px' },
  { id: 'candyhaze', name: 'Candy Haze', texture: 'Neblina dulce iridiscente', layoutTemplate: 'soft', cardShape: 'cloud', widgetShape: 'pill', material: 'cloud', frame: 'solid', radius: '30px', padding: '26px' },
  { id: 'cobaltdeck', name: 'Cobalt Deck', texture: 'Consola cobalt con vetas tecnicas', layoutTemplate: 'studio', cardShape: 'chamfer', widgetShape: 'squircle', material: 'metal', frame: 'double', radius: '11px', padding: '18px' },
  { id: 'emberwire', name: 'Ember Wire', texture: 'Cableado rojo incandescente', layoutTemplate: 'retrogrid', cardShape: 'sharp', widgetShape: 'sharp', material: 'rubber', frame: 'solid', radius: '6px', padding: '16px' },
  { id: 'mintcircuit', name: 'Mint Circuit', texture: 'PCB menta con pistas holograficas', layoutTemplate: 'classic', cardShape: 'squircle', widgetShape: 'squircle', material: 'lacquer', frame: 'double', radius: '18px', padding: '20px' },
  { id: 'oceanfilm', name: 'Ocean Film', texture: 'Pelicula marina translúcida', layoutTemplate: 'classic', cardShape: 'oval', widgetShape: 'pill', material: 'glass', frame: 'solid', radius: '28px', padding: '22px' },
  { id: 'pearlstatic', name: 'Pearl Static', texture: 'Perla con estatica retro', layoutTemplate: 'collector', cardShape: 'rounded', widgetShape: 'oval', material: 'mirror', frame: 'double', radius: '20px', padding: '24px' },
  { id: 'scarletpanel', name: 'Scarlet Panel', texture: 'Panel rojo de cabina analogica', layoutTemplate: 'studio', cardShape: 'chamfer', widgetShape: 'sharp', material: 'lacquer', frame: 'solid', radius: '10px', padding: '18px' },
  { id: 'amberflux', name: 'Amber Flux', texture: 'Flujo ambar con resina brillante', layoutTemplate: 'classic', cardShape: 'rounded', widgetShape: 'pill', material: 'lacquer', frame: 'solid', radius: '22px', padding: '22px' },
  { id: 'solarfloppy', name: 'Solar Floppy', texture: 'Etiqueta disquete con brillo solar', layoutTemplate: 'collector', cardShape: 'squircle', widgetShape: 'squircle', material: 'metal', frame: 'double', radius: '16px', padding: '18px' },
  { id: 'glacierrack', name: 'Glacier Rack', texture: 'Rack azul hielo de data center', layoutTemplate: 'studio', cardShape: 'sharp', widgetShape: 'sharp', material: 'metal', frame: 'solid', radius: '7px', padding: '16px' },
  { id: 'obsidianmono', name: 'Obsidian Mono', texture: 'Monocromo obsidiana con grano fino', layoutTemplate: 'minimal', cardShape: 'chamfer', widgetShape: 'sharp', material: 'rubber', frame: 'solid', radius: '9px', padding: '16px' },
  { id: 'electricpaper', name: 'Electric Paper', texture: 'Papel electrico brillante', layoutTemplate: 'classic', cardShape: 'rounded', widgetShape: 'oval', material: 'cloud', frame: 'double', radius: '21px', padding: '23px' },
  { id: 'holofax', name: 'Holo Fax', texture: 'Fax holografico de oficina cyber', layoutTemplate: 'retrogrid', cardShape: 'squircle', widgetShape: 'pill', material: 'mirror', frame: 'double', radius: '18px', padding: '20px' },
  { id: 'dreamshell', name: 'Dream Shell', texture: 'Concha perlada dreamy', layoutTemplate: 'soft', cardShape: 'cloud', widgetShape: 'cloud', material: 'cloud', frame: 'solid', radius: '34px', padding: '26px' },
  { id: 'duskpixel', name: 'Dusk Pixel', texture: 'Pixel dusk con luces de neón', layoutTemplate: 'collector', cardShape: 'sharp', widgetShape: 'squircle', material: 'lacquer', frame: 'double', radius: '10px', padding: '18px' },
  { id: 'auroraweb', name: 'Aurora Web', texture: 'Telaraña auroral con brillo suave', layoutTemplate: 'classic', cardShape: 'rounded', widgetShape: 'pill', material: 'glass', frame: 'solid', radius: '23px', padding: '24px' },
  { id: 'ironstudio', name: 'Iron Studio', texture: 'Mesa de mezcla de hierro pulido', layoutTemplate: 'studio', cardShape: 'chamfer', widgetShape: 'sharp', material: 'metal', frame: 'solid', radius: '9px', padding: '17px' },
  { id: 'toffeeplastic', name: 'Toffee Plastic', texture: 'Plastico toffee de carcasa noventera', layoutTemplate: 'soft', cardShape: 'oval', widgetShape: 'pill', material: 'lacquer', frame: 'solid', radius: '28px', padding: '24px' },
  { id: 'bluewire', name: 'Blue Wireframe', texture: 'Wireframe azul de blueprint', layoutTemplate: 'retrogrid', cardShape: 'sharp', widgetShape: 'sharp', material: 'rubber', frame: 'double', radius: '7px', padding: '16px' },
  { id: 'marshmallow', name: 'Marshmallow Beam', texture: 'Nube blanca con beam cian', layoutTemplate: 'soft', cardShape: 'cloud', widgetShape: 'pill', material: 'cloud', frame: 'solid', radius: '32px', padding: '26px' },
  { id: 'plasmafax', name: 'Plasma Fax', texture: 'Plasma granular estilo impresora', layoutTemplate: 'collector', cardShape: 'squircle', widgetShape: 'oval', material: 'mirror', frame: 'double', radius: '18px', padding: '20px' },
  { id: 'analogmist', name: 'Analog Mist', texture: 'Neblina analogica de cinta', layoutTemplate: 'classic', cardShape: 'rounded', widgetShape: 'oval', material: 'glass', frame: 'solid', radius: '20px', padding: '22px' },
  { id: 'monochromeplus', name: 'Monochrome Plus', texture: 'Escala de grises premium', layoutTemplate: 'minimal', cardShape: 'chamfer', widgetShape: 'sharp', material: 'metal', frame: 'solid', radius: '8px', padding: '16px' },
  { id: 'laserlobby', name: 'Laser Lobby', texture: 'Loby de laser cruzado', layoutTemplate: 'studio', cardShape: 'sharp', widgetShape: 'squircle', material: 'rubber', frame: 'double', radius: '8px', padding: '17px' },
  { id: 'satinorb', name: 'Satin Orb', texture: 'Orbita satinada con reflejo tenue', layoutTemplate: 'classic', cardShape: 'oval', widgetShape: 'pill', material: 'mirror', frame: 'solid', radius: '28px', padding: '24px' }
];

const EXTRA_THEME_VARIANTS = EXTRA_VARIANT_BLUEPRINTS.reduce((acc, blueprint, index) => {
  const step = (index % 5) * 0.02;

  acc[blueprint.id] = {
    id: blueprint.id,
    name: blueprint.name,
    texture: blueprint.texture,
    layoutTemplate: blueprint.layoutTemplate,
    leftOrder: ['contact', 'genres', 'actions', 'background', 'playlist'],
    rightOrder: ['friends', 'stats'],
    centerOrder: ['header', 'feed'],
    cardShape: blueprint.cardShape,
    widgetShape: blueprint.widgetShape,
    material: blueprint.material,
    cardRadius: blueprint.radius,
    cardPadding: blueprint.padding,
    cardFrame: blueprint.frame,
    pageOverlay: `radial-gradient(circle at ${15 + index}% ${10 + (index % 7) * 9}%, rgba(255,255,255,0.05), transparent 34%), linear-gradient(155deg, rgba(255,255,255,0.015), rgba(0,0,0,0.08))`,
    cardBg: ({ accent, secondary }) => `linear-gradient(${130 + index}deg, ${withAlpha(accent, 0.18 + step)} 0%, ${withAlpha(secondary, 0.14 + step * 0.7)} 38%, rgba(6,9,16,0.96) 100%)`,
    cardBorder: ({ accent, secondary }) => withAlpha(index % 2 === 0 ? accent : secondary, 0.24 + step),
    cardShadow: ({ accent }) => `0 12px 40px ${withAlpha(accent, 0.11 + step)}`
  };

  return acc;
}, {});

export const THEME_VARIANTS = {
  default: {
    id: 'default',
    name: 'Default Glass',
    texture: 'Suave con ruido fino',
    layoutTemplate: 'classic',
    leftOrder: ['contact', 'genres', 'actions', 'background', 'playlist'],
    rightOrder: ['friends', 'stats'],
    centerOrder: ['header', 'feed'],
    cardShape: 'rounded',
    widgetShape: 'rounded',
    material: 'glass',
    cardRadius: '20px',
    cardPadding: '24px',
    cardFrame: 'solid',
    pageOverlay: 'linear-gradient(145deg, rgba(255,255,255,0.02), rgba(0,0,0,0.05))',
    cardBg: ({ accent }) => `linear-gradient(165deg, ${withAlpha(accent, 0.2)}, rgba(8,12,20,0.94) 68%, rgba(5,7,12,0.98))`,
    cardBorder: ({ accent }) => withAlpha(accent, 0.24),
    cardShadow: ({ accent }) => `0 10px 40px ${withAlpha(accent, 0.14)}`
  },
  holofoil: {
    id: 'holofoil',
    name: 'Holo Foil',
    texture: 'Brillo iridiscente de carta',
    layoutTemplate: 'classic',
    leftOrder: ['genres', 'contact', 'actions', 'playlist', 'background'],
    rightOrder: ['stats', 'friends'],
    centerOrder: ['header', 'feed'],
    cardShape: 'oval',
    widgetShape: 'pill',
    material: 'mirror',
    cardRadius: '26px',
    cardPadding: '26px',
    cardFrame: 'double',
    pageOverlay: 'repeating-linear-gradient(120deg, rgba(255,255,255,0.03) 0 7px, rgba(255,255,255,0.00) 7px 14px)',
    cardBg: ({ accent, secondary }) => `linear-gradient(128deg, rgba(230,238,255,0.2) 0%, ${withAlpha(accent, 0.24)} 24%, ${withAlpha(secondary, 0.22)} 52%, rgba(10,14,24,0.92) 100%)`,
    cardBorder: ({ secondary }) => withAlpha(secondary, 0.28),
    cardShadow: ({ secondary }) => `0 12px 46px ${withAlpha(secondary, 0.16)}`
  },
  pokebox: {
    id: 'pokebox',
    name: 'PC Box',
    texture: 'Panel coleccionable estilo cajas',
    layoutTemplate: 'collector',
    leftOrder: ['playlist', 'actions', 'genres', 'contact', 'background'],
    rightOrder: ['friends', 'stats'],
    centerOrder: ['feed', 'header'],
    cardShape: 'squircle',
    widgetShape: 'squircle',
    material: 'lacquer',
    cardRadius: '14px',
    cardPadding: '18px',
    cardFrame: 'double',
    pageOverlay: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0 35%, rgba(0,0,0,0.1) 100%), radial-gradient(circle at top right, rgba(255,255,255,0.05), transparent 45%)',
    cardBg: ({ accent, secondary }) => `linear-gradient(180deg, ${withAlpha(accent, 0.24)} 0%, ${withAlpha(secondary, 0.24)} 26%, rgba(13,19,33,0.98) 100%)`,
    cardBorder: ({ accent }) => withAlpha(accent, 0.36),
    cardShadow: ({ accent }) => `0 14px 40px ${withAlpha(accent, 0.18)}`
  },
  carbon: {
    id: 'carbon',
    name: 'Carbon Matrix',
    texture: 'Patrón técnico diagonal',
    layoutTemplate: 'studio',
    leftOrder: ['actions', 'contact', 'background', 'playlist', 'genres'],
    rightOrder: ['stats', 'friends'],
    centerOrder: ['feed', 'header'],
    cardShape: 'chamfer',
    widgetShape: 'sharp',
    material: 'rubber',
    cardRadius: '10px',
    cardPadding: '18px',
    cardFrame: 'solid',
    pageOverlay: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 2px, rgba(0,0,0,0.04) 2px 6px)',
    cardBg: ({ accent }) => `linear-gradient(145deg, rgba(16,17,20,0.98) 0%, rgba(32,36,42,0.98) 40%, ${withAlpha(accent, 0.18)} 100%)`,
    cardBorder: ({ accent }) => withAlpha(accent, 0.28),
    cardShadow: ({ accent }) => `0 10px 34px ${withAlpha(accent, 0.14)}`
  },
  plush: {
    id: 'plush',
    name: 'Soft Plush',
    texture: 'Fondo suave de gradiente mullido',
    layoutTemplate: 'soft',
    leftOrder: ['contact', 'actions', 'genres', 'background', 'playlist'],
    rightOrder: ['friends', 'stats'],
    centerOrder: ['header', 'feed'],
    cardShape: 'cloud',
    widgetShape: 'pill',
    material: 'cloud',
    cardRadius: '28px',
    cardPadding: '26px',
    cardFrame: 'solid',
    pageOverlay: 'radial-gradient(circle at 10% 10%, rgba(255,255,255,0.05), transparent 38%), radial-gradient(circle at 90% 0%, rgba(255,255,255,0.03), transparent 42%)',
    cardBg: ({ accent }) => `linear-gradient(150deg, rgba(243,250,255,0.22) 0%, ${withAlpha(accent, 0.2)} 42%, rgba(82,107,142,0.82) 100%)`,
    cardBorder: ({ accent }) => withAlpha(accent, 0.22),
    cardShadow: ({ accent }) => `0 14px 42px ${withAlpha(accent, 0.10)}`
  },
  crtgrid: {
    id: 'crtgrid',
    name: 'CRT Grid',
    texture: 'Rejilla retro monitor',
    layoutTemplate: 'retrogrid',
    leftOrder: ['background', 'actions', 'contact', 'genres', 'playlist'],
    rightOrder: ['stats', 'friends'],
    centerOrder: ['feed', 'header'],
    cardShape: 'sharp',
    widgetShape: 'sharp',
    material: 'metal',
    cardRadius: '8px',
    cardPadding: '16px',
    cardFrame: 'solid',
    pageOverlay: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
    cardBg: ({ accent, secondary }) => `linear-gradient(180deg, rgba(198,205,218,0.18) 0%, ${withAlpha(accent, 0.14)} 18%, ${withAlpha(secondary, 0.12)} 52%, rgba(11,13,18,0.98) 100%)`,
    cardBorder: ({ secondary }) => withAlpha(secondary, 0.24),
    cardShadow: ({ secondary }) => `0 12px 36px ${withAlpha(secondary, 0.12)}`
  },
  ...EXTRA_THEME_VARIANTS
};

const LEGACY_THEME_ALIASES = {
  hi5: 'y2k',
  msn: 'cyberpunk'
};

const hexToRgb = (hex) => {
  const normalized = (hex || '').replace('#', '');
  const safeHex = normalized.length === 3
    ? normalized.split('').map((chunk) => chunk + chunk).join('')
    : normalized.padEnd(6, '0').slice(0, 6);

  const value = Number.parseInt(safeHex, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
};

export const withAlpha = (hex, alpha) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const relativeLuminance = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

const ensureReadableText = (requested, background, fallback) => {
  if (!requested || !requested.startsWith('#') || !background?.startsWith('#')) return requested || fallback;
  const foregroundLuminance = relativeLuminance(requested);
  const backgroundLuminance = relativeLuminance(background);
  const contrast = (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
  return contrast >= 4.2 ? requested : fallback;
};

export const resolveThemeId = (themeId) => {
  if (THEME_PRESETS[themeId]) {
    return themeId;
  }

  return LEGACY_THEME_ALIASES[themeId] || 'y2k';
};

export const buildAppTheme = (
  themeId,
  accentOverride,
  animated = true,
  variantId = 'default',
  overrides = {}
) => {
  const preset = THEME_PRESETS[resolveThemeId(themeId)];
  const accent = accentOverride || preset.accent;
  const secondary = overrides.secondaryAccent || preset.secondary;
  const variant = THEME_VARIANTS[variantId] || THEME_VARIANTS.default;
  const identityOverrides = {
    ...overrides,
    layoutId: overrides.layoutId || (variant.id !== 'default' ? LEGACY_LAYOUT_MAP[variant.layoutTemplate] : ''),
    shapeId: overrides.shapeId || (variant.id !== 'default' ? variant.cardShape : '')
  };
  const identity = resolveIdentity(preset.id, variant.id, identityOverrides);
  const safeOpacity = Number.isFinite(Number(overrides.layoutOpacity))
    ? Math.max(0.1, Math.min(1, Number(overrides.layoutOpacity)))
    : 0.92;
  const cardBaseBackground = overrides.layoutBackground
    ? withAlpha(overrides.layoutBackground, safeOpacity)
    : variant.cardBg({ accent, secondary });
  const cardBorderColor = overrides.layoutBorder
    ? withAlpha(overrides.layoutBorder, Math.min(1, safeOpacity + 0.1))
    : variant.cardBorder({ accent, secondary });
  const textColor = ensureReadableText(overrides.layoutText, overrides.layoutBackground || preset.surface, preset.text);
  const textSecondaryColor = overrides.layoutTextSecondary || preset.textSecondary;
  const fallbackFont = overrides.fontFamily || '';
  const resolvedFonts = {
    primary: overrides.fontPrimary || fallbackFont || identity.typography.display || preset.fonts.primary,
    secondary: overrides.fontSecondary || fallbackFont || identity.typography.body || preset.fonts.secondary,
    ui: overrides.fontUi || fallbackFont || identity.typography.ui || preset.fonts.ui,
    mono: overrides.fontMono || identity.typography.mono
  };
  const overlayPage = variant.pageOverlay
    ? `${variant.pageOverlay}, ${preset.pageGradient}`
    : preset.pageGradient;

  return {
    meta: {
      id: preset.id,
      name: preset.name,
      tagline: preset.tagline,
      animated,
      variant: variant.id,
      identity: `${preset.id}:${identity.material.id}:${identity.hud.id}:${identity.layout.id}`
    },
    colors: {
      primary: accent,
      secondary,
      background: preset.background,
      surface: preset.surface,
      surfaceAlt: preset.surfaceAlt,
      text: textColor,
      textSecondary: textSecondaryColor,
      border: preset.border,
      borderStrong: preset.borderStrong,
      accentSoft: withAlpha(accent, 0.18),
      accentGlow: withAlpha(accent, 0.34),
      error: '#ff5b7a',
      success: accent,
      warning: '#ffb347'
    },
    gradients: {
      page: overlayPage,
      hero: preset.heroGradient,
      chrome: preset.chromeGradient,
      panel: `linear-gradient(180deg, ${withAlpha(accent, 0.12)}, rgba(5, 7, 12, 0.88))`
    },
    card: {
      bg: cardBaseBackground,
      border: cardBorderColor,
      shadow: variant.cardShadow({ accent, secondary }),
      opacity: safeOpacity,
      texture: variant.texture,
      variantName: variant.name,
      material: identity.material.id,
      materialFamily: identity.material.family,
      materialId: identity.material.id,
      materialProfile: identity.material,
      materialIntensity: identity.materialIntensity,
      shape: overrides.shapeId || identity.shapeId || variant.cardShape || 'rounded',
      shapeProfile: identity.shape,
      contentPadding: `${identity.shape.insetY} ${identity.shape.insetX}`,
      widgetShape: variant.widgetShape || variant.cardShape || 'rounded',
      radius: variant.cardRadius,
      padding: variant.cardPadding,
      frame: variant.cardFrame
    },
    profile: {
      layoutTemplate: identity.layout.id,
      layout: identity.layout,
      leftOrder: variant.leftOrder || ['contact', 'genres', 'actions', 'background', 'playlist'],
      rightOrder: variant.rightOrder || ['friends', 'stats'],
      centerOrder: variant.centerOrder || ['header', 'feed'],
      density: identity.density
    },
    hud: identity.hud,
    ornament: identity.ornament,
    fonts: resolvedFonts,
    effects: {
      glow: `0 0 10px ${withAlpha(accent, 0.42)}`,
      glowStrong: `0 0 30px ${withAlpha(accent, 0.55)}`,
      scanLines: `repeating-linear-gradient(0deg, ${withAlpha(accent, 0.03)} 0px, ${withAlpha(accent, 0.03)} 1px, transparent 1px, transparent 2px)`,
      grid: `linear-gradient(${withAlpha(accent, 0.08)} 1px, transparent 1px), linear-gradient(90deg, ${withAlpha(accent, 0.08)} 1px, transparent 1px)`,
      noise: NOISE_TEXTURE
    },
    animations: {
      glitch: 'glitch 0.3s infinite',
      flicker: 'flicker 0.5s infinite',
      scan: 'scan 2s linear infinite',
      pulse: 'pulse 2s infinite'
    }
  };
};

export const Y2KTheme = buildAppTheme('y2k');

export const GlobalStyles = createGlobalStyle`
  :root {
    --safe-top: env(safe-area-inset-top, 0px);
    --safe-right: env(safe-area-inset-right, 0px);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --safe-left: env(safe-area-inset-left, 0px);
    --material-intensity: ${({ theme }) => theme.card?.materialIntensity ?? 0.72};
    --layout-gap: ${({ theme }) => theme.profile?.density === 'compact' ? '14px' : theme.profile?.density === 'airy' ? '32px' : '22px'};
    --card-inset-x: ${({ theme }) => theme.card?.shapeProfile?.insetX || '22px'};
    --card-inset-y: ${({ theme }) => theme.card?.shapeProfile?.insetY || '20px'};
    --card-title-inset: ${({ theme }) => theme.card?.shapeProfile?.titleInset || '2px'};
    --card-control-inset: ${({ theme }) => theme.card?.shapeProfile?.controlInset || '0px'};
    --card-min-height: ${({ theme }) => theme.card?.shapeProfile?.minHeight || '72px'};
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    width: 100%;
    min-height: 100%;
  }

  body {
    background: ${({ theme }) => theme.gradients.page};
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.secondary};
    min-height: 100vh;
    min-height: 100dvh;
    overflow-x: hidden;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    overscroll-behavior-y: contain;
    transition: background 280ms ease, color 280ms ease;

    &::before {
      content: '';
      position: fixed;
      inset: 0;
      background: ${({ theme }) => theme.effects.noise};
      opacity: 0.02;
      pointer-events: none;
      z-index: 9999;
    }

    &::after {
      content: '';
      position: fixed;
      inset: 0;
      background: ${({ theme }) => theme.meta.animated ? theme.effects.scanLines : 'none'};
      pointer-events: none;
      z-index: 9998;
      mix-blend-mode: overlay;
      animation: ${({ theme }) => theme.meta.animated ? theme.animations.scan : 'none'};
    }
  }

  body.chaplin-video-bg {
    background: transparent !important;
  }

  body.chaplin-video-bg .chaplin-page-frame {
    background: transparent !important;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: 0.001ms !important;
    }
  }

  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => withAlpha(theme.colors.primary, 0.08)};
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.primary};
    border-radius: 4px;

    &:hover {
      background: ${({ theme }) => theme.colors.secondary};
      box-shadow: ${({ theme }) => theme.effects.glow};
    }
  }

  @keyframes glitch {
    0% { transform: translate(0); }
    20% { transform: translate(-2px, 2px); }
    40% { transform: translate(-2px, -2px); }
    60% { transform: translate(2px, 2px); }
    80% { transform: translate(2px, -2px); }
    100% { transform: translate(0); }
  }

  @keyframes flicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  @keyframes scan {
    0% { background-position: 0 0; }
    100% { background-position: 0 100%; }
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 ${({ theme }) => withAlpha(theme.colors.primary, 0.7)};
      transform: scale(1);
    }
    70% {
      box-shadow: 0 0 0 10px ${({ theme }) => withAlpha(theme.colors.primary, 0)};
      transform: scale(1.05);
    }
    100% {
      box-shadow: 0 0 0 0 ${({ theme }) => withAlpha(theme.colors.primary, 0)};
      transform: scale(1);
    }
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: ${({ theme }) => theme.fonts.primary};
    text-shadow: ${({ theme }) => theme.effects.glow};
    letter-spacing: 1px;
  }

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    transition: all 0.3s;

    &:hover {
      color: ${({ theme }) => theme.colors.secondary};
      text-shadow: ${({ theme }) => theme.effects.glowStrong};
    }
  }

  button {
    font-family: ${({ theme }) => theme.fonts.ui};
    letter-spacing: 1px;
    touch-action: manipulation;
  }

  .chaplin-identity-root :is(h1,h2,h3,h4,h5,h6,p,span,strong,small,label,li,button,a) {
    min-width: 0;
  }

  .chaplin-identity-root :is(h1,h2,h3,h4,strong,label) {
    overflow-wrap: break-word;
  }

  .chaplin-identity-root :is(p,span,small,li,a) {
    overflow-wrap: anywhere;
  }

  .chaplin-identity-root :is(button,a,input,select,textarea):focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.text};
    outline-offset: 3px;
    box-shadow: 0 0 0 5px ${({ theme }) => withAlpha(theme.colors.primary, .28)};
  }

  .chaplin-identity-root :is(button,input,select,textarea):disabled {
    opacity: .46;
    cursor: not-allowed;
    filter: saturate(.35);
  }

  input,
  textarea,
  select {
    font-size: 16px;
  }

  .glitch-effect { animation: ${({ theme }) => theme.animations.glitch}; }
  .flicker-effect { animation: ${({ theme }) => theme.animations.flicker}; }
  .pulse-effect { animation: ${({ theme }) => theme.animations.pulse}; }

  .neon-border {
    border: 2px solid ${({ theme }) => theme.colors.primary};
    box-shadow:
      inset 0 0 10px ${({ theme }) => theme.colors.primary},
      0 0 20px ${({ theme }) => theme.colors.primary};
  }

  .neon-text {
    color: ${({ theme }) => theme.colors.primary};
    text-shadow:
      0 0 5px ${({ theme }) => theme.colors.primary},
      0 0 10px ${({ theme }) => theme.colors.primary},
      0 0 20px ${({ theme }) => theme.colors.primary};
  }

  .chaplin-page-frame {
    min-height: 100vh;
    min-height: 100dvh;
    padding:
      calc(140px + var(--safe-top))
      calc(14px + var(--safe-right))
      calc(150px + var(--safe-bottom))
      calc(14px + var(--safe-left));
    position: relative;
    isolation: isolate;
  }

  .chaplin-page-frame::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: -1;
    background:
      radial-gradient(circle at 14% 18%, ${({ theme }) => withAlpha(theme.colors.primary, 0.17)}, transparent 34%),
      radial-gradient(circle at 86% 76%, ${({ theme }) => withAlpha(theme.colors.secondary, 0.16)}, transparent 38%),
      linear-gradient(165deg, rgba(255, 255, 255, 0.03), rgba(4, 7, 12, 0.14));
  }

  .chaplin-page-shell {
    width: min(var(--chaplin-shell-max, 1220px), 100%);
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }

  .chaplin-layout-gallery { --chaplin-shell-max: 1080px; }
  .chaplin-layout-organic { --chaplin-shell-max: 1240px; }
  .chaplin-layout-balanced,
  .chaplin-layout-editorial { --chaplin-shell-max: 1320px; }
  .chaplin-layout-constellation,
  .chaplin-layout-shrine,
  .chaplin-layout-collector,
  .chaplin-layout-arcade { --chaplin-shell-max: 1400px; }
  .chaplin-layout-edge,
  .chaplin-layout-studio,
  .chaplin-layout-terminal { --chaplin-shell-max: 1480px; }

  .chaplin-theme-panel {
    border: 1px ${({ theme }) => theme.card?.frame || 'solid'} ${({ theme }) => theme.card?.border || theme.colors.borderStrong};
    border-radius: ${({ theme }) => resolveShapeRadius(theme.card?.shape || 'rounded', theme.card?.radius || '20px')};
    clip-path: ${({ theme }) => resolveShapeClipPath(theme.card?.shape || 'rounded')};
    background: ${({ theme }) => theme.card?.bg || theme.gradients.panel};
    box-shadow: ${({ theme }) => theme.card?.shadow || '0 18px 54px rgba(0, 0, 0, 0.46)'};
    backdrop-filter: none;
    position: relative;
    overflow: hidden;
    min-width: 0;
    min-height: var(--card-min-height);
    padding: var(--card-inset-y) var(--card-inset-x);
  }

  .chaplin-theme-panel::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      ${({ theme }) => theme.card?.materialProfile?.texture || 'none'},
      ${({ theme }) => resolveMaterialOverlay(theme.card?.material || 'glass')};
    background-size: ${({ theme }) => theme.card?.materialProfile?.microtexture?.includes('grid') ? '12px 12px' : 'auto'};
    opacity: calc(0.28 + var(--material-intensity) * 0.68);
    pointer-events: none;
  }

  .chaplin-theme-panel::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      ${({ theme }) => theme.card?.materialProfile?.highlight || 'none'},
      ${({ theme }) => resolveCardTexture(theme.card?.material || 'glass')};
    opacity: calc(0.12 + var(--material-intensity) * 0.38);
    pointer-events: none;
  }

  .chaplin-density-airy .chaplin-theme-panel { padding: calc(${({ theme }) => theme.card?.padding || '22px'} + 4px); }
  .chaplin-density-compact .chaplin-theme-panel { padding: max(12px, calc(${({ theme }) => theme.card?.padding || '18px'} - 4px)); }

  .chaplin-hud-aero .chaplin-theme-panel {
    border-color: rgba(225, 249, 255, 0.42);
    box-shadow: inset 0 1px rgba(255,255,255,.2), 0 18px 48px rgba(26,64,108,.18);
  }
  .chaplin-hud-tactical .chaplin-theme-panel {
    border-left-width: 3px;
    border-right-color: transparent;
    box-shadow: -8px 0 0 -7px ${({ theme }) => theme.colors.primary}, 0 18px 38px rgba(0,0,0,.28);
  }
  .chaplin-hud-industrial .chaplin-theme-panel {
    border: 3px double ${({ theme }) => theme.card?.border};
    box-shadow: inset 0 0 0 2px rgba(0,0,0,.34), 0 12px 28px rgba(0,0,0,.3);
  }
  .chaplin-hud-collector .chaplin-theme-panel {
    outline: 1px solid ${({ theme }) => withAlpha(theme.colors.secondary, .34)};
    outline-offset: -7px;
    box-shadow: 0 7px 0 ${({ theme }) => withAlpha(theme.colors.primary, .18)}, 0 20px 38px rgba(0,0,0,.25);
  }
  .chaplin-hud-studio .chaplin-theme-panel {
    border-top: 4px solid ${({ theme }) => theme.colors.primary};
    background-image: linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
    background-size: 24px 100%;
  }
  .chaplin-hud-editorial .chaplin-theme-panel {
    border-width: 0 0 1px;
    border-radius: 0;
    clip-path: none;
    box-shadow: none;
  }
  .chaplin-hud-gothic .chaplin-theme-panel {
    clip-path: polygon(18px 0, calc(100% - 18px) 0, 100% 18px, 100% calc(100% - 28px), calc(100% - 28px) 100%, 28px 100%, 0 calc(100% - 28px), 0 18px);
    border-color: ${({ theme }) => withAlpha(theme.colors.primary, .46)};
  }
  .chaplin-hud-comic .chaplin-theme-panel {
    border: 2px solid ${({ theme }) => theme.colors.text};
    box-shadow: 6px 7px 0 ${({ theme }) => withAlpha(theme.colors.primary, .42)};
  }
  .chaplin-hud-scientific .chaplin-theme-panel {
    border-color: ${({ theme }) => withAlpha(theme.colors.text, .26)};
    border-radius: 2px;
    clip-path: none;
    box-shadow: inset 12px 0 0 -11px ${({ theme }) => theme.colors.primary};
  }

  .chaplin-theme-y2k .chaplin-page-frame::before { background: radial-gradient(circle at 18% 14%, rgba(255,255,255,.2), transparent 20%), radial-gradient(circle at 78% 68%, ${({ theme }) => withAlpha(theme.colors.secondary,.18)}, transparent 34%); }
  .chaplin-theme-cyberpunk .chaplin-page-frame::before { background: linear-gradient(90deg, ${({ theme }) => withAlpha(theme.colors.primary,.12)} 1px, transparent 1px), linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px); background-size: 72px 100%, 100% 28px; }
  .chaplin-theme-chrome .chaplin-page-frame::before { background: radial-gradient(ellipse at 50% 12%, rgba(255,255,255,.24), transparent 26%), linear-gradient(110deg, transparent 35%, rgba(255,255,255,.08), transparent 64%); }
  .chaplin-theme-neo3d .chaplin-page-frame::before { background: radial-gradient(circle at 16% 24%, ${({ theme }) => withAlpha(theme.colors.primary,.22)}, transparent 22%), radial-gradient(circle at 82% 64%, ${({ theme }) => withAlpha(theme.colors.secondary,.18)}, transparent 28%); }
  .chaplin-theme-void4d .chaplin-page-frame::before { background: radial-gradient(ellipse at 50% 40%, ${({ theme }) => withAlpha(theme.colors.primary,.09)}, transparent 32%); }
  .chaplin-theme-crystalcave .chaplin-page-frame::before { background: conic-gradient(from 210deg at 50% 20%, transparent, ${({ theme }) => withAlpha(theme.colors.primary,.12)}, transparent 20%, ${({ theme }) => withAlpha(theme.colors.secondary,.1)}, transparent 46%); }
  .chaplin-theme-pixelmon .chaplin-page-frame::before { background: linear-gradient(90deg, rgba(255,255,255,.04) 2px, transparent 2px), linear-gradient(rgba(255,255,255,.04) 2px, transparent 2px); background-size: 32px 32px; }
  .chaplin-theme-sunsetarcade .chaplin-page-frame::before { background: radial-gradient(ellipse at 50% 0%, ${({ theme }) => withAlpha(theme.colors.primary,.32)}, transparent 40%), linear-gradient(transparent 70%, ${({ theme }) => withAlpha(theme.colors.secondary,.12)}); }
  .chaplin-theme-frostedgarden .chaplin-page-frame::before { background: radial-gradient(ellipse at 10% 20%, ${({ theme }) => withAlpha(theme.colors.primary,.18)}, transparent 32%), radial-gradient(ellipse at 88% 72%, rgba(190,255,225,.11), transparent 38%); }
  .chaplin-theme-crimsonstudio .chaplin-page-frame::before { background: linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px), radial-gradient(ellipse at 80% 10%, ${({ theme }) => withAlpha(theme.colors.primary,.2)}, transparent 30%); background-size: 18px 100%, auto; }

  .chaplin-theme-panel > * {
    position: relative;
    z-index: 1;
  }

  @media (max-width: 640px) {
    .chaplin-page-frame {
      padding:
        calc(120px + var(--safe-top))
        calc(10px + var(--safe-right))
        calc(146px + var(--safe-bottom))
        calc(10px + var(--safe-left));
    }
  }
`;
