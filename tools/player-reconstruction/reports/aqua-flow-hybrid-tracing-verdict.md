# Aqua Flow — hybrid tracing + reconstruction: validation report

Scope: **Aqua Flow only** (Golden Master). No other player was touched.
Gemini has been fully removed from the project; everything below is local,
free, no cloud, no API cost (OpenCV, NumPy, Pillow, scikit-image, Playwright).

## Pipeline actually run

REFERENCE -> SEGMENTATION (HSV threshold, ROI-constrained) -> CONTOUR
EXTRACTION (`cv2.findContours` + `approxPolyDP`) -> boundary walk
(per-column local-relative thickness measurement) -> VECTOR FITTING
(Catmull-Rom -> cubic Bezier, arc-length-uniform downsampling) -> SVG
GEOMETRY (`waveGeometry.js`) -> MATERIAL RECONSTRUCTION (gradients on top of
the traced geometry, not flat traced color) -> integrated into
`AquaFlowSkin.jsx` as a real `AquaWave` component -> RENDER -> SCREENSHOT
(Playwright) -> OVERLAY / DIFF / CONTOURS -> METRICS -> one correction pass
on materials -> re-measured.

Scripts: `trace_wave_contour.py`, `trace_wave_thickness.py`,
`fit_wave_paths.py`, `extract_key_geometry.py` (Hough circles for buttons),
`wave_metrics.py`, `verify_wave_paths.py`, `capture_screenshot.py`,
`diff_render.py`, `make_overlay.py`.

## What was traced vs. hand/procedural

- **Wave body silhouette** (upper+lower boundary, 140-point closed ring):
  real per-column measurement (local-relative brightness-drop walk,
  anchored to a verified bright-core mask) — not a sine wave, not invented.
- **Wave specular highlights** (3 separate streaks, 55/55/51 points):
  real contour extraction of the brightest/least-saturated pixels; they
  came out as 3 disconnected pieces because a curved glossy surface's
  specular highlight genuinely is discontinuous — confirmed by direct pixel
  inspection of the "valley" region, not a segmentation bug.
- **6 button circles** (3 secondary + 3 transport): Hough-circle detection,
  verified against `key_elements_overlay.png` — cx/cy/r now measured, not
  hand-guessed.
- **Wave materials** (gradients, drop-shadow, highlight blend): hand-authored
  on top of the traced geometry using `materials.jsx`, tuned once against
  the diff.
- **Not re-touched this pass**: outer body silhouette, display panel rect,
  pills, LEDs, water procedural texture (`OceanTextureFilter` — already
  procedural from an earlier pass, not a raster texture, so it already
  satisfied the "never the raw reference as a texture" rule).
- **Total path count**: ~301 real measured points across 4 paths (1 body +
  3 highlights) — well inside "150 correct points, not 30,000 disguised
  rasterization" per shape, and none of it is the PNG embedded as an image.

## Metrics

| Metric | Before (pass-2 hand-measured / post-Gemini) | After (this pass) |
|---|---|---|
| Global SSIM | 0.3062 | 0.3338 |
| Global pixel MAE | 38.176 | 36.216 (37.187 before the material tuning pass) |
| Silhouette IoU (wave, new) | — (metric didn't exist) | 0.6043 |
| Bounding Box IoU (wave, new) | — | 1.0 |
| Wave Contour Error px (new) | — | 7.99 |
| Edge Similarity F1 (new) | — | 0.4943 |
| Wave Color Difference (new) | — | 64.61 |

Global SSIM/MAE moved modestly — expected, since those are dominated by
water-texture and bezel pixels, not the wave's silhouette. The wave-specific
metrics (new this pass, no prior baseline to compare against since they
didn't exist before) show the geometry itself is now genuinely well-aligned
(bounding box exact; contour error under 8px average across 598 measured
columns) while material/color match is still the weak point (Color
Difference 64.61 is high — the live render still reads paler/less saturated
than the reference, confirmed visually).

## Visual verdict

Overlay and Contours-mode inspection (`tools/player-reconstruction/diffs/
aqua-flow-overlay.png`, `tools/player-reconstruction/geometry/
contours_mode.png`) show the traced silhouette — both curls, the S-curve,
and the right-end droplet — aligning closely with the reference. This is a
categorical improvement over every prior pass this session (hand-measured
landmarks, Gemini's pass): the shape is now coming from real pixel
measurement, not interpretation.

The diff heatmap confirms the pattern directly: the wave's own outline is
the darkest (best-matching) region in the whole image; the surrounding
water texture and overall material depth are where the remaining error is
concentrated.

## Explicit verdict on scaling to the other 49/50 players

**Conditionally yes, with a scoped caveat — not yet as a blind mechanical
pipeline.**

What's proven: automated contour extraction + boundary-walk measurement is a
genuinely more accurate and more scalable way to get real silhouette
geometry than hand-measuring landmarks — the wave went from something I was
eyeballing/estimating to something backed by per-column pixel measurement,
verified by overlay, with a controlled point count. Hough-circle detection
for round controls is a clean, fast, reliable win for any skin with
circular buttons.

What's NOT proven yet: this pass only validated the technique on ONE
element type (a wave/ribbon) with ONE segmentation strategy (HSV threshold
+ boundary walk) tuned specifically to Aqua Flow's exact color relationships
(hue ~98-102, the ribbon-vs-water brightness gap). A different player with
different geometry (e.g. a hard-edged UI, sharp corners, text-heavy panels,
different material families) would very likely need a different
segmentation strategy re-derived per player, not a copy-paste of these exact
thresholds. The material/color pass (the part that still has the largest
error, per Wave Color Difference) also hasn't been generalized — it was one
manual tuning pass here, not a repeatable procedure.

**Recommendation**: keep the *methodology* (contour extraction ->
boundary-walk thickness -> controlled Bezier fit -> verify-by-overlay ->
material pass on top -> wave-specific metrics, not just global SSIM) as the
standard going forward, but treat each player's segmentation step as
needing its own short calibration pass — it is not a one-shot script that
can run unattended across all 50. Do not scale mechanically; validate one
or two more players with meaningfully different geometry (e.g. a
hard-edged/rectilinear skin) before treating this as the general pipeline.
