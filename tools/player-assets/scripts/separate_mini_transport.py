"""
Separates the 3 mini-transport buttons (prev/pause/next) from
screen-fused.png via Hough-circle detection (real geometry, verified by
overlay before use — tools/player-assets/_check_minicircles.png), then
punches those circular regions to transparent in a copy of the source,
leaving a real (masked, not synthesized) screen-only layer with no
mini-transport baked in.
"""
import cv2
import numpy as np
from PIL import Image, ImageDraw

REF = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\tools\player-assets\references\bubblegum-gloss.png"
OUT_DIR = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\frontend\web\src\assets\profilePlayers\bubblegum-gloss"

# (cx, cy, r) in the reference's own 483x560 coordinate space, as verified
# by overlay against the real screen-fused.png circles.
CIRCLES = {
    "mini-prev": (68.6, 109.8, 24),
    "mini-pause": (68.6, 163.8, 24),
    "mini-next": (68.6, 226.2, 24),
}


def main():
    im = Image.open(REF).convert("RGBA")
    masked = im.copy()
    mdraw_alpha = np.array(masked)

    for name, (cx, cy, r) in CIRCLES.items():
        pad = 3
        x0, y0 = int(cx - r - pad), int(cy - r - pad)
        x1, y1 = int(cx + r + pad), int(cy + r + pad)
        piece = im.crop((x0, y0, x1, y1)).copy()
        # circular alpha mask so the crop isn't a square with corner pixels
        mask = Image.new("L", piece.size, 0)
        ImageDraw.Draw(mask).ellipse([pad, pad, piece.width - pad, piece.height - pad], fill=255)
        piece.putalpha(Image.composite(piece.split()[3], Image.new("L", piece.size, 0), mask))
        piece.save(f"{OUT_DIR}/controls/{name}.png")
        print(name, piece.size, (x0, y0))

        # punch a transparent hole (real masking) in the working copy
        yy, xx = np.ogrid[:mdraw_alpha.shape[0], :mdraw_alpha.shape[1]]
        dist = (xx - cx) ** 2 + (yy - cy) ** 2
        hole = dist <= (r + 1) ** 2
        mdraw_alpha[hole, 3] = 0

    # Crop down to just the screen-unit region (real bbox measured in
    # components.json) — the working copy above was punched on the FULL
    # 483x560 reference so circle coordinates stay in one consistent
    # space, but the actual asset must be just the screen unit.
    SCREEN_BBOX = (23, 61, 326, 279)
    screen_only = Image.fromarray(mdraw_alpha).crop(SCREEN_BBOX)
    screen_only.save(f"{OUT_DIR}/screen/screen-frame-nominitransport.png")
    print("saved screen-frame-nominitransport.png", screen_only.size)


if __name__ == "__main__":
    main()
