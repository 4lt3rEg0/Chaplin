"""
Segments one player-cell region from a master sheet into individual asset
pieces via alpha-channel connected-component analysis (no manual pixel
picking, no AI, no cloud). For each detected piece:
  1. tight-crop to its real alpha bounding box (no eyeballed coordinates)
  2. add a small consistent padding
  3. save as its own PNG with alpha intact

Also emits a debug contact sheet (each detected component numbered) so the
segmentation can be visually verified before pieces are assigned semantic
names.
"""
import sys
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

PAD = 6


def tight_bbox(alpha, x0, y0, x1, y1, threshold=10):
    region = alpha[y0:y1, x0:x1]
    ys, xs = np.where(region > threshold)
    if len(xs) == 0:
        return None
    return (x0 + int(xs.min()), y0 + int(ys.min()), x0 + int(xs.max()) + 1, y0 + int(ys.max()) + 1)


def find_components(im, x0, y0, x1, y1, min_area=40, dilate=2):
    """Connected components of non-transparent pixels within a region,
    returned as (bbox, area) tuples in FULL-IMAGE coordinates."""
    arr = np.array(im)
    alpha = arr[:, :, 3]
    region = (alpha[y0:y1, x0:x1] > 10).astype(np.uint8)
    if dilate:
        region = ndimage.binary_dilation(region, iterations=dilate).astype(np.uint8)
    labeled, n = ndimage.label(region)
    comps = []
    for i in range(1, n + 1):
        ys, xs = np.where(labeled == i)
        if len(xs) < min_area:
            continue
        bx0, bx1 = int(xs.min()), int(xs.max()) + 1
        by0, by1 = int(ys.min()), int(ys.max()) + 1
        comps.append({
            "bbox": (x0 + bx0, y0 + by0, x0 + bx1, y0 + by1),
            "area": int(len(xs)),
        })
    comps.sort(key=lambda c: -c["area"])
    return comps


def save_debug_contact_sheet(im, comps, out_path, region=None):
    canvas = im.crop(region) if region else im.copy()
    ox, oy = (region[0], region[1]) if region else (0, 0)
    draw = ImageDraw.Draw(canvas)
    for i, c in enumerate(comps):
        x0, y0, x1, y1 = c["bbox"]
        draw.rectangle([x0 - ox, y0 - oy, x1 - ox, y1 - oy], outline=(255, 0, 0, 255), width=2)
        draw.text((x0 - ox + 2, y0 - oy + 2), str(i), fill=(255, 0, 0, 255))
    canvas.save(out_path)


def extract_piece(im, bbox, out_path, pad=PAD):
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    piece = im.crop((x0, y0, x1, y1))
    piece.save(out_path)
    return (x0, y0, x1 - x0, y1 - y0)


if __name__ == "__main__":
    sheet = sys.argv[1]
    x0, y0, x1, y1 = map(int, sys.argv[2:6])
    out_debug = sys.argv[6]
    min_area = int(sys.argv[7]) if len(sys.argv) > 7 else 40
    dilate = int(sys.argv[8]) if len(sys.argv) > 8 else 2
    threshold = int(sys.argv[9]) if len(sys.argv) > 9 else 10
    im = Image.open(sheet).convert("RGBA")
    arr = np.array(im)
    alpha = arr[:, :, 3]
    region = (alpha[y0:y1, x0:x1] > threshold).astype(np.uint8)
    if dilate:
        region = ndimage.binary_dilation(region, iterations=dilate).astype(np.uint8)
    labeled, n = ndimage.label(region)
    comps = []
    for i in range(1, n + 1):
        ys, xs = np.where(labeled == i)
        if len(xs) < min_area:
            continue
        bx0, bx1 = int(xs.min()), int(xs.max()) + 1
        by0, by1 = int(ys.min()), int(ys.max()) + 1
        comps.append({"bbox": (x0 + bx0, y0 + by0, x0 + bx1, y0 + by1), "area": int(len(xs))})
    comps.sort(key=lambda c: -c["area"])
    save_debug_contact_sheet(im, comps, out_debug, region=(x0, y0, x1, y1))
    print(json.dumps([c["bbox"] + (c["area"],) for c in comps], indent=2))
