# Y2K Bubblegum Gloss — asset-pipeline Golden Master

## Fuente
`Assets (6).png` (master sheet, one of 4 real detailed-breakdown sheets —
`Assets (1)-(4)` are unlabeled auxiliary decoration/material sheets,
`Assets (5)` is a compact 15-player overview/legend, `Assets (6)-(8)` are
the detailed per-player breakdown sheets), cell region `(0, 0, 483, 560)`
(top-left, "1. Y2K BUBBLEGUM GLOSS").

## Canvas
483 × 560 (matches the source cell 1:1 — every layer below is placed at
its real extracted coordinate in that space, not re-measured or guessed).

## Assets extraídos (reales, del sheet — ninguno redibujado)
- `shell/screen-fused.png` — pantalla + bisel + mini-transporte (◁⏸▶▶),
  fusionados en el arte original (sin hueco alpha entre ellos — confirmado
  con detección de bandas + máscara estricta ≥160, ver Fase de extracción).
  Se mantienen como una sola capa visual estática por esa razón física, no
  por comodidad — ver "Decisiones" abajo.
- `screen/background-alt.png` — el duplicado limpio del swirl (sin bisel),
  guardado por si se necesita como textura reutilizable en el futuro; no
  se usa en el componente actual.
- `controls/{prev,play,pause,next,volume}.png` — los 5 botones-píldora con
  etiqueta de texto real (PREV/PLAY/PAUSE/NEXT/VOLUME), cada uno su propio
  PNG con alpha real, separados vía connected-components sobre máscara
  estricta (sin fusión por glow).
- `controls/slider-track.png` + `controls/slider-thumb.png` — separados
  geométricamente (track = franja ancha y baja; thumb = bulto redondo que
  se detectó por altura de columna anómala). El track exportado es la
  franja limpia SIN el thumb horneado (thumb realmente ocluye esos
  píxeles en el arte fuente, no hay forma de recuperarlos); se usa
  `background-size: 100% 100%` para estirarlo al ancho real del track.
- `decoration/bubbles.png` — 6 burbujas compuestas individualmente sobre
  lienzo transparente (no un crop rectangular — el rectángulo que las
  contendría se solapa con el botón de volumen del icon-row no usado).

## NO usado de este sheet
- El icon-row (rewind/play/pause/fastforward/speaker redondos, sin
  etiqueta de texto) — redundante con los 5 botones-píldora ya reales;
  se dejó sin extraer para no tener controles muertos duplicados.
- El badge de título "1. Y2K BUBBLEGUM GLOSS" — metadata de catálogo
  (Fase 2), nunca fue parte del hardware.
- La leyenda "RECOLOR MASK / ACCENT" y su barra degradada — metadata de
  leyenda; sus 4 swatches SÍ se muestrearon como color real (ver
  `manifest.json.palette`), pero como datos, no como imagen.

## Decisiones (por qué, no solo qué)
**Mini-transporte no interactivo.** Los 3 iconos pequeños (◁⏸▶▶) están
horneados dentro de `screen-fused.png` porque literalmente tocan el bisel
de la pantalla en el arte original (confirmado: ni con umbral estricto
192 se separan). Separarlos a la fuerza dañaría el material. En vez de
poner hitboxes invisibles sobre ellos (prohibido), toda la funcionalidad
real de prev/play-pause/next vive en los 5 botones-píldora, que SÍ son
assets independientes y reales. El mini-transporte queda como decoración
fiel al diseño original, no como control fantasma.

**Shell/carcasa exterior:** este sheet no incluye un asset con forma de
cápsula/gel para el cuerpo completo del player — solo piezas internas.
No se inventó uno; el fondo del componente es transparente y el "cuerpo"
visual lo aportan la pantalla + botones + burbujas tal como aparecen en
la referencia.

## Canvas / capas — ver `manifest.json`
Coordenadas reales de extracción para cada capa/control/slider, más
`screenBounds` (área segura de texto dinámico dentro de `screen-fused.png`,
excluyendo la columna del mini-transporte).

## Contenido dinámico
`track.title`, `artist`, `currentTime`/`duration` son texto React real
posicionado sobre `screenBounds` — nunca el texto horneado del sheet (que
de hecho no existe en esta celda; la celda no tiene texto de pista
falso).

## Recoloreado
`manifest.json.palette` trae 4 tokens medidos directamente del swatch del
propio sheet (`gelPink #fb82d9`, `gelBlue #29d0f7`, `accentPurple #a28ff1`,
`accentPale #bcd7ed`). Hoy no se consumen (los botones/pantalla son PNG
fijos, no hay máscara de material independiente), quedan documentados
para una futura pasada de recoloreado real (requeriría generar accent-mask
por pieza, no hecho en este pase).

## Limitaciones conocidas
- El slider-track estirado (`background-size:100% 100%`) puede verse
  ligeramente distinto a como se ve en el sheet original a anchos de
  pista muy distintos al original (206px) — aceptable a los tamaños de
  uso real del player.
- No hay estados hover/pressed/active provistos por el sheet (solo un
  estado "idle" por pieza); los estados interactivos se logran con
  transform/filter en CSS sobre el PNG real (Fase 13), no con arte nuevo.
- Sin asset de shell exterior (ver "Decisiones").

## Audio / backend
Usa exclusivamente los props/handlers existentes de Chaplin
(`onTogglePlay`, `onPrev`, `onNext`, `onSeek`, `onVolumeChange`, etc.) —
ningún backend ni motor de audio nuevo.
