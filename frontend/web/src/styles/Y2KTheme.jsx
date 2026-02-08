import { createGlobalStyle } from 'styled-components';

export const Y2KTheme = {
  colors: {
    primary: '#00ff88',
    secondary: '#ff00ff',
    tertiary: '#0000ff',
    background: '#0a0a0f',
    surface: '#151525',
    text: '#e0e0e0',
    textSecondary: '#666',
    border: '#00ff8866',
    error: '#ff0055',
    success: '#00ff88',
    warning: '#ffaa00'
  },
  fonts: {
    primary: "'Orbitron', monospace",
    secondary: "'Courier New', monospace",
    ui: "'Michroma', sans-serif"
  },
  effects: {
    glow: '0 0 10px',
    glowStrong: '0 0 30px',
    scanLines: `repeating-linear-gradient(
      0deg,
      rgba(0, 255, 136, 0.03) 0px,
      rgba(0, 255, 136, 0.03) 1px,
      transparent 1px,
      transparent 2px
    )`,
    grid: `linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
           linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)`,
    noise: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
  },
  animations: {
    glitch: `glitch 0.3s infinite`,
    flicker: `flicker 0.5s infinite`,
    scan: `scan 2s linear infinite`,
    pulse: `pulse 2s infinite`
  }
};

export const GlobalStyles = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Michroma&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    background: ${Y2KTheme.colors.background};
    color: ${Y2KTheme.colors.text};
    font-family: ${Y2KTheme.fonts.secondary};
    overflow-x: hidden;

    /* Efecto CRT */
    &::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${Y2KTheme.effects.noise};
      opacity: 0.02;
      pointer-events: none;
      z-index: 9999;
    }

    &::after {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${Y2KTheme.effects.scanLines};
      pointer-events: none;
      z-index: 9998;
      mix-blend-mode: overlay;
      animation: ${Y2KTheme.animations.scan};
    }
  }

  /* Scrollbar estilo Y2K */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(0, 255, 136, 0.05);
  }

  ::-webkit-scrollbar-thumb {
    background: ${Y2KTheme.colors.primary};
    border-radius: 4px;

    &:hover {
      background: ${Y2KTheme.colors.secondary};
      box-shadow: 0 0 10px ${Y2KTheme.colors.secondary};
    }
  }

  /* Animaciones */
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
      box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.7);
      transform: scale(1);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(0, 255, 136, 0);
      transform: scale(1.05);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(0, 255, 136, 0);
      transform: scale(1);
    }
  }

  /* Estilos de texto */
  h1, h2, h3, h4, h5, h6 {
    font-family: ${Y2KTheme.fonts.primary};
    text-shadow: ${Y2KTheme.effects.glow} ${Y2KTheme.colors.primary};
    letter-spacing: 1px;
  }

  a {
    color: ${Y2KTheme.colors.primary};
    text-decoration: none;
    transition: all 0.3s;

    &:hover {
      color: ${Y2KTheme.colors.secondary};
      text-shadow: ${Y2KTheme.effects.glowStrong} ${Y2KTheme.colors.secondary};
    }
  }

  button {
    font-family: ${Y2KTheme.fonts.ui};
    letter-spacing: 1px;
  }

  /* Clases de utilidad */
  .glitch-effect {
    animation: ${Y2KTheme.animations.glitch};
  }

  .flicker-effect {
    animation: ${Y2KTheme.animations.flicker};
  }

  .pulse-effect {
    animation: ${Y2KTheme.animations.pulse};
  }

  .neon-border {
    border: 2px solid ${Y2KTheme.colors.primary};
    box-shadow:
      inset 0 0 10px ${Y2KTheme.colors.primary},
      0 0 20px ${Y2KTheme.colors.primary};
  }

  .neon-text {
    color: ${Y2KTheme.colors.primary};
    text-shadow:
      0 0 5px ${Y2KTheme.colors.primary},
      0 0 10px ${Y2KTheme.colors.primary},
      0 0 20px ${Y2KTheme.colors.primary};
  }
`;