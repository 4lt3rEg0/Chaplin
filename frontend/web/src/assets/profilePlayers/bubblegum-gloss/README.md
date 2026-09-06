# Y2K Bubblegum Gloss — asset pack (piece library, NOT yet assembled)

## ⚠ CORRECCIÓN CONCEPTUAL CRÍTICA (leer antes que nada)
`Assets (6).png` es un **ASSET SHEET** (catálogo de piezas dispuestas para
que se vean/seleccionen todas), **no una foto del reproductor ya montado**.
Su disposición es de catálogo, no la geometría real del dispositivo final.

Cada `x`/`y` en `manifest.json` es `sourceSheetPosition` (dónde se
encontró la pieza en la sheet) — **no** es `assembledPlayerPosition`. Ese
segundo sistema de coordenadas **no existe todavía** (ver
`manifest.json#assembledPlayerCoordinates`, `available: false`).

`BubblegumGlossSkin.jsx` sigue renderizando con `sourceSheetPosition` sin
cambios (orden explícita: no tocar el Live) — por eso el Live se ve como
un despiece (bloque de pantalla, botones más abajo, slider más abajo,
burbujas aparte) y no como un producto físico único. Esto está documentado
a propósito, no oculto. No se hará ninguna composición nueva hasta recibir
una referencia real del player YA MONTADO.

`asset-sheet-cropped.png` (antes mal llamado `assembled-reference.png`)
es la celda de la sheet con la metadata de catálogo enmascarada — es un
contact-sheet de piezas, no un plano de montaje. Player Lab ya no lo
presenta como "REFERENCE"; el modo se llama "ASSET SHEET" y muestra un
aviso explícito.

## Fuente
`Assets (6).png` (master sheet original, ya no existe en disco — fue
sustituida por las carpetas `chaplin_assets_0N` del usuario; se conserva
una copia de la celda 1 en `tools/player-assets/references/
bubblegum-gloss.png`), celda `(0,0,483,560)`.

## assembled-reference.png
Los píxeles reales de la celda, con SOLO la metadata de catálogo
enmascarada a transparente (badge de título, fila de iconos no usada,
leyenda "RECOLOR MASK/ACCENT"). Es la autoridad posicional — nunca se usa
como player final.

## 18 assets de producción reales (manifest.json#assets)
- `screen/screen-frame-nominitransport.png` — pantalla+bisel+swirl, con
  3 agujeros circulares reales (no sintéticos) donde antes estaban los
  mini-controles horneados.
- `screen/background-alt.png` — textura limpia alternativa (no consumida
  hoy).
- `controls/mini-{prev,pause,next}.png` — **nuevos**: separados de la
  pantalla vía detección de círculos de Hough + perforación de alpha
  circular verificada por overlay antes de usarse. Antes eran decoración
  horneada; ahora son botones reales, independientes, clicables.
- `controls/{prev,play,pause,next,volume}.png` — píldoras con texto,
  contenido verificado pixel a pixel.
- `controls/slider-track.png` + `slider-thumb.png` — separados, thumb
  se mueve en React.
- `decoration/bubble-01.png` … `bubble-06.png` — **6 burbujas
  individuales reales** (4 de la entrega externa + 2 recuperadas
  directamente de la segmentación de este proyecto, ninguna duplicada).

## Corrección de nombres (fuente externa)
En `O:\...\chaplin_assets_06_ALL_INDIVIDUAL_FLAT\`, verifiqué cada PNG
por contenido real (no por nombre) y until-encontré un shuffle de 3
archivos en la fila de píldoras con texto:
`button_prev_labeled.png` mostraba PAUSE, `button_play_labeled.png`
mostraba PREV, `button_pause_labeled.png` mostraba PLAY. Los renombré
físicamente ahí (con nombre temporal para evitar colisión) para que el
nombre coincida con el contenido real. NEXT y VOLUME ya estaban
correctos. Este proyecto nunca usó esos 3 archivos con nombre erróneo —
mis propios `prev/play/pause/next/volume.png` fueron extraídos y
verificados por mí desde el principio.

## Piezas investigadas y confirmadas ausentes (manifest.json#missingAssets)
Ninguna fue inventada. Cada una se buscó activamente antes de marcarse
ausente:
- **shell-base/shadow/highlight/accent-mask**: no existe una carcasa
  unificada en ningún archivo accesible. Comparé explícitamente contra
  la celda equivalente "Bubble Gum Pop" de `chaplin_assets_05` (diseño
  relacionado pero visualmente distinto) — su pieza `shell_or_frame_01.png`
  resultó ser el mismo alcance (pantalla+mini-transporte), no un cuerpo
  completo (ver `tools/player-assets/_compare_shell_vs_screenfused.png`).
- **screen-frame separado del background**: el swirl llega hasta pocos
  píxeles del borde del bisel sin banda lisa separable (verificado por
  muestreo de color en varias líneas horizontales) — forzar una
  separación ahí fabricaría un límite que no existe en el arte.
- **glow / specular / rim-light**: no existe un pase separado de brillo
  en ninguna fuente accesible.

## Validación (reconstruction-validation/)
`render_from_manifest.py` reconstruye el player SOLO a partir de
manifest.json + los 18 assets (sin React) → `reconstructed-from-assets.png`.
Comparado contra `assembled-reference.png`:

- **pixelMAE: 3.63** (bajó de 14.33 tras corregir un bug real: mi primer
  intento de separar el mini-transporte perforó agujeros sobre la celda
  COMPLETA de 483×560 en vez de recortar solo la región de pantalla de
  303×218, causando que el asset final se renderizara aplastado/
  superpuesto en el player real — corregido en
  `separate_mini_transport.py`).
- Error residual (2.5% de píxeles, diff>40) concentrado en bordes/
  antialiasing de burbujas y círculos recortados — no hay una zona de
  fallo estructural grande.

## Nota sobre verificación visual
Durante esta pasada, mi lectura visual del preview de `overlay.png`
mostró (incorrectamente, dos veces) contenido que la inspección directa
de píxeles (numpy) demostró que no existía en el archivo real. Antes de
reportar cualquier resultado a partir de ahí, verifiqué por 3 vías
independientes (muestreo puntual, conteo de banda, conteo global fuera
de zona esperada) que los archivos reales están limpios. El bug real
(mini-transporte aplastado) sí lo until-confirmé con una captura en vivo
del navegador, no solo con lectura de imagen estática.

## Audio / backend
Sin cambios: usa los props/handlers existentes de Chaplin.
