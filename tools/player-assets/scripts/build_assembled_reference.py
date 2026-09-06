"""
Builds assembled-reference.png: the real sheet pixels for the Y2K
Bubblegum Gloss cell, with ONLY the non-player sheet metadata (catalog
label badge, the unused icon-row control set, the recolor-swatch/legend
band) masked to transparent — real content, real positions, nothing
invented, nothing shifted. This is the positional/proportion AUTHORITY
for the manifest, distinct from reconstructed-from-assets.png (built
purely from the separated asset files by render_from_manifest.py).
"""
from PIL import Image
import numpy as np

REF = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\tools\player-assets\references\bubblegum-gloss.png"
OUT = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\frontend\web\src\assets\profilePlayers\bubblegum-gloss\asset-sheet-cropped.png"
# NOTE: this is an ASSET SHEET crop (catalog layout, metadata masked out),
# NOT a picture of the assembled player. Do not treat its output as a
# composition/position reference — see manifest.json's _CRITICAL_NOTE.

# Regions to remove (sheet metadata, never part of the physical player),
# each padded a few px beyond its measured bbox (components.json) so no
# fringe pixels survive.
MASK_RECTS = [
    (30, 6, 392, 62),      # catalog_label_01 ("1. Y2K BUBBLEGUM GLOSS" badge)
    (23, 361, 92, 432),    # unused icon-row: rewind
    (96, 361, 167, 432),   # unused icon-row: play
    (171, 360, 241, 433),  # unused icon-row: pause
    (246, 361, 316, 432),  # unused icon-row: fast-forward
    (326, 361, 397, 432),  # unused icon-row: volume/speaker
    (23, 490, 210, 542),   # RECOLOR MASK / ACCENT gradient bar + text
    (218, 491, 266, 540),  # recolor swatch 1
    (266, 491, 313, 540),  # recolor swatch 2
    (312, 491, 360, 540),  # recolor swatch 3
    (360, 492, 407, 541),  # recolor swatch 4
]


def main():
    im = Image.open(REF).convert("RGBA")
    arr = np.array(im)
    for (x0, y0, x1, y1) in MASK_RECTS:
        arr[y0:y1, x0:x1, 3] = 0
    Image.fromarray(arr).save(OUT)
    print("saved", OUT, im.size)


if __name__ == "__main__":
    main()
