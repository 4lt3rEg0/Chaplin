# Especificación Técnica de UI — Y2K Bubbly Music Players

**Alcance:** tarea nueva e independiente del trabajo de reconstrucción de Aqua
Flow / catálogo de 51 players (que sigue basado en tracing de PNG). Estos
tres players **no tienen imagen de referencia** — se construyen 100% desde
CSS/HTML, sin generación de imagen ni tracing.

Cubre los tres primeros players de la familia **Y2K Bubbly**:

1. **Player 1 — Y2K Bubblegum Gloss**
2. **Player 2 — Cyber-Acid Jelly**
3. **Player 3 — Trans-Tech Jelly**

Es una especificación de **Vista (View)**: define DOM, CSS y variables de
theming. No incluye lógica de audio ni estado — ver la sección 4 para cómo
se conecta con un backend/controlador real.

---

## 1. Arquitectura de Componentes (Modelo DOM)

Cada reproductor es un único componente contenedor con tres capas anidadas.
La estructura es idéntica entre los tres players; lo que cambia entre ellos
son únicamente las variables CSS de la sección 3.

```html
<div class="y2k-player-container player-1">

  <!-- CAPA 1: Borde exterior + efecto de resplandor/vidrio -->
  <div class="ui-outer-stroke">

    <!-- CAPA 2: Cuerpo de gel (la cápsula de plástico) -->
    <div class="ui-gel-body">

      <!-- Pantalla / display -->
      <div class="ui-screen-display">
        <div class="visual-swirl-texture" aria-hidden="true"></div>
        <h1 class="track-title">BLISS POP 03</h1>
        <p class="track-artist">—</p>
      </div>

      <!-- Barra de controles -->
      <div class="ui-controls-bar">
        <!-- Transporte principal -->
        <button class="ui-btn ui-btn--lg prev" type="button" aria-label="Anterior"></button>
        <button class="ui-btn ui-btn--lg pause" type="button" aria-label="Pausar" aria-pressed="true"></button>
        <button class="ui-btn ui-btn--lg next" type="button" aria-label="Siguiente"></button>

        <!-- Transporte secundario / accesorios -->
        <button class="ui-btn ui-btn--sm rewind" type="button" aria-label="Retroceder"></button>
        <button class="ui-btn ui-btn--sm play" type="button" aria-label="Reproducir"></button>
        <button class="ui-btn ui-btn--sm forward" type="button" aria-label="Avanzar"></button>
        <button class="ui-btn ui-btn--sm volume" type="button" aria-label="Volumen" aria-haspopup="true"></button>
      </div>

    </div> <!-- /ui-gel-body -->

  </div> <!-- /ui-outer-stroke -->

  <span class="header-label">1. Y2K BUBBLEGUM GLOSS</span>
</div>
```

**Notas de estructura:**

- Los botones son elementos `<button>` reales (no `<div>` con `onclick`),
  para que teclado/lector de pantalla funcionen sin trabajo extra.
- `.visual-swirl-texture` es una capa puramente decorativa
  (`aria-hidden="true"`) — el contenido real (`.track-title`,
  `.track-artist`) vive encima, nunca dentro del texto horneado de una
  imagen.
- `.header-label` queda fuera de `.ui-outer-stroke` porque es una etiqueta
  de catálogo/demo, no parte del "hardware" del reproductor — en producción
  probablemente no exista o se reemplace por el nombre real del skin en el
  selector de temas.

---

## 2. Especificación de Estilos CSS y Shading (Modelo Visual)

### A. Contenedor principal — `.y2k-player-container`

```css
.y2k-player-container {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 420px;
  font-family: 'Segoe UI', system-ui, sans-serif;
}
```

### B. Borde exterior — `.ui-outer-stroke`

Define el contorno y el efecto de "marca" de cada player (glow, vidrio,
etc.). El `border-radius` alto da la forma de cápsula que comparten los
tres.

```css
.ui-outer-stroke {
  border-radius: 999px;
  padding: 6px;
  background: var(--outer-stroke-bg, transparent);
}
```

| Player | Efecto adicional |
| --- | --- |
| 1 — Bubblegum Gloss | Ninguno (borde limpio, el brillo vive en `.ui-gel-body`) |
| 2 — Cyber-Acid Jelly | `box-shadow: 0 0 15px var(--neon-green);` (resplandor neón) |
| 3 — Trans-Tech Jelly | `backdrop-filter: blur(5px);` + fondo semitransparente (vidrio esmerilado) |

### C. Cuerpo de gel — `.ui-gel-body` (la pieza clave del volumen 3D)

```css
.ui-gel-body {
  position: relative;
  border-radius: 999px;
  overflow: hidden;
  padding: 20px 24px;
  background:
    radial-gradient(circle at 50% -20%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 50%),
    linear-gradient(to bottom, var(--color-top), var(--color-bottom));
  background-image: var(--screen-texture), /* ver nota */
    radial-gradient(circle at 50% -20%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 50%),
    linear-gradient(to bottom, var(--color-top), var(--color-bottom));
  background-blend-mode: overlay, normal, normal;
  box-shadow:
    inset 0 2px 5px rgba(0, 0, 0, 0.3),      /* bisel oscuro, borde inferior interno */
    inset 0 -2px 5px rgba(255, 255, 255, 0.5); /* bisel claro, borde superior interno */
}
```

Desglose de las tres técnicas que dan el efecto "gel/plástico":

1. **Bisel (volumen del borde):** las dos sombras `inset` de signo opuesto
   simulan la curvatura física del borde de la cápsula — clara arriba
   (donde pega la luz), oscura abajo (donde cae en sombra propia).
2. **Reflejo especular (el "brillo de plástico mojado"):** el
   `radial-gradient` centrado arriba y desplazado hacia afuera
   (`-20%` en Y) simula un punto de luz que rebota en una superficie
   convexa. Es la textura que hace que se lea como plástico *duro y
   curvo*, no como un fondo plano.
3. **Textura de fondo:** la imagen de `--screen-texture` (swirl, circuito,
   etc.) va en la capa de más atrás, mezclada con `background-blend-mode`
   para que no tape el bisel ni el brillo.

> Nota de implementación: `background-image` con múltiples capas +
> `background-blend-mode` es más robusto que apilar pseudo-elementos
> cuando el número de capas es fijo (3), pero si `--screen-texture` va a
> animarse independientemente (loop, parallax), usar un `::before` dedicado
> para la textura y dejar el brillo/gradiente en el elemento base.

### D. Pantalla / display — `.ui-screen-display`

```css
.ui-screen-display {
  position: relative;
  border-radius: 24px;
  padding: 14px 18px;
  margin-bottom: 16px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.15);
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.35);
  color: var(--text-color);
}

.visual-swirl-texture {
  position: absolute;
  inset: 0;
  background-image: var(--screen-texture);
  background-size: cover;
  opacity: 0.5;
  pointer-events: none;
}

.track-title {
  position: relative;
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  position: relative;
  margin: 2px 0 0;
  font-size: 11px;
  opacity: 0.75;
}
```

### E. Botones — `.ui-btn` (elementos 3D flotantes)

Los botones **no son planos**: son esferas independientes que parecen
flotar sobre el cuerpo de gel, con su propio bisel y su propia sombra
proyectada.

```css
.ui-btn {
  position: relative;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--btn-bg-color);
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.4),              /* elevación: sombra proyectada sobre el gel */
    inset 0 2px 3px rgba(255, 255, 255, 0.6),  /* bisel: brillo superior interno */
    inset 0 -2px 3px rgba(0, 0, 0, 0.2);       /* bisel: sombra inferior interna */
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.ui-btn--lg { width: 56px; height: 56px; }
.ui-btn--sm { width: 38px; height: 38px; }

.ui-btn svg,
.ui-btn::before {
  color: var(--btn-icon-color);
  fill: var(--btn-icon-color);
}

/* Estados */
.ui-btn:hover:not(:disabled) {
  filter: brightness(1.08);
}

.ui-btn:focus-visible {
  outline: 2px solid var(--text-color);
  outline-offset: 3px;
}

.ui-btn:active:not(:disabled),
.ui-btn[aria-pressed="true"] {
  transform: translateY(2px);
  box-shadow:
    0 2px 3px rgba(0, 0, 0, 0.35),
    inset 0 2px 3px rgba(0, 0, 0, 0.4),        /* bisel invertido: ahora hundido */
    inset 0 -2px 3px rgba(255, 255, 255, 0.6);
}

.ui-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

**Iconografía:** SVG en línea (no PNG), color controlado por
`var(--btn-icon-color)` vía `fill`/`stroke` — nunca un ícono "quemado" en
un bitmap, para que el theming pueda recolorearlo sin regenerar assets.

---

## 3. Variables de Theming por Player

Conectar un player nuevo o cambiar de tema es únicamente redefinir este
bloque de variables sobre `.y2k-player-container.player-N` — ninguna otra
regla CSS cambia.

| Variable | Player 1 — Bubblegum Gloss | Player 2 — Cyber-Acid Jelly | Player 3 — Trans-Tech Jelly |
| --- | --- | --- | --- |
| `--color-top` | `#FFB6C1` (rosa claro) | `#7CFC00` (verde lima) | `rgba(255,255,255,0.20)` (vidrio) |
| `--color-bottom` | `#00BFFF` (azul cielo) | `#FFFF00` (amarillo) | `rgba(100,100,100,0.10)` |
| `--text-color` | `#FFFFFF` | `#006400` (verde oscuro) | `#00FFFF` (cian neón) |
| `--screen-texture` | `url(swirl-pastel.png)` | `url(swirl-acid.png)` | `url(circuit-data.png)` |
| `--btn-bg-color` | `linear-gradient(#FF69B4, #C71585)` | metálico oscuro (`linear-gradient(#2b2b2b,#111)`) + `box-shadow` glow verde | transparente + `border: 1px solid var(--text-color)` + glow cian |
| `--btn-icon-color` | `#FFFFFF` | `#7CFC00` | `#00FFFF` |
| `--outer-stroke-bg` / efecto | ninguno | `box-shadow: 0 0 15px #7CFC00` | `backdrop-filter: blur(5px)` |
| `--neon-green` (solo Player 2) | — | `#7CFC00` | — |

```css
.player-1 {
  --color-top: #FFB6C1;
  --color-bottom: #00BFFF;
  --text-color: #FFFFFF;
  --screen-texture: url('/assets/y2k-bubbly/swirl-pastel.png');
  --btn-bg-color: linear-gradient(#FF69B4, #C71585);
  --btn-icon-color: #FFFFFF;
}

.player-2 {
  --neon-green: #7CFC00;
  --color-top: #7CFC00;
  --color-bottom: #FFFF00;
  --text-color: #006400;
  --screen-texture: url('/assets/y2k-bubbly/swirl-acid.png');
  --btn-bg-color: linear-gradient(#2b2b2b, #111111);
  --btn-icon-color: #7CFC00;
  --outer-stroke-bg: transparent;
}
.player-2 .ui-outer-stroke { box-shadow: 0 0 15px var(--neon-green); }

.player-3 {
  --color-top: rgba(255, 255, 255, 0.20);
  --color-bottom: rgba(100, 100, 100, 0.10);
  --text-color: #00FFFF;
  --screen-texture: url('/assets/y2k-bubbly/circuit-data.png');
  --btn-bg-color: transparent;
  --btn-icon-color: #00FFFF;
}
.player-3 .ui-outer-stroke { backdrop-filter: blur(5px); }
.player-3 .ui-btn { border: 1px solid var(--text-color); box-shadow: 0 0 8px var(--text-color); }
```

> Los assets referenciados en `--screen-texture` (`swirl-pastel.png`,
> `swirl-acid.png`, `circuit-data.png`) no existen todavía en el proyecto —
> son placeholders de ruta. Se generan o encargan por separado; esta
> especificación no depende de tenerlos para poder maquetarse (puede
> arrancarse con `--screen-texture: none` y un color de fondo plano).

---

## 4. Integración con el backend (separación Vista / Controlador / Modelo)

Esta especificación define **solo la Vista**. La conexión real:

- **Controlador:** JavaScript escucha los `click` (o `pointerdown` para
  feedback más inmediato) de `.ui-btn` y llama a la API de audio real —
  Web Audio API o el elemento `<audio>` existente del proyecto. No debe
  crearse un motor de audio nuevo por player: los tres reutilizan el mismo
  backend de reproducción que ya usa el resto de la app.
- **Modelo/estado:** el título/artista de `.track-title` /`.track-artist`
  y el estado visual de play/pausa (`aria-pressed` en `.pause`/`.play`) se
  actualizan desde el estado real de reproducción (track actual, `isPlaying`),
  nunca con texto fijo de ejemplo.
- **Progreso/volumen:** esta spec no incluye todavía un control de
  progreso ni de volumen deslizante — solo el botón `.volume` como
  disparador. Si se necesita una barra real, sigue el mismo patrón que
  `.ui-screen-display` (contenedor con `box-shadow: inset` para el track +
  un `div` de relleno con `width` dinámico), y se añade en una iteración
  posterior de esta spec.

---

## 5. Responsive

- El contenedor usa `max-width` + `width: 100%`, igual que el resto de los
  skins del proyecto — no un tamaño fijo en `px`.
- `.ui-btn--lg` / `.ui-btn--sm` están en `px` fijos en esta versión; si el
  player debe escalar fluidamente en pantallas muy pequeñas, conviene
  moverlos a `clamp()` (p. ej. `width: clamp(40px, 12vw, 56px)`) en la
  implementación real — se deja anotado aquí en vez de fijarlo, porque
  afecta directamente el layout de `.ui-controls-bar` (gap, wrap).
