"""
Finalizes one player from its rembg cutout: blurs the baked-text display
region(s) (coords given in the CUTOUT's own pixel frame) so the AI garbage
text becomes an unreadable smear while the glass/gradient/reflection
underneath survives, then saves as base.png. The silhouette itself (incl.
protrusions) is already correct from rembg_batch.py — this step never
touches alpha/shape.
"""
import json
import os
import sys
from pathlib import Path
from PIL import Image, ImageFilter

REPO_ROOT = Path(__file__).resolve().parents[2]
GEN = REPO_ROOT / "frontend" / "web" / "public" / "assets" / "profile-players" / "generated"


def blur_regions(im, boxes, radius=10):
    for box in boxes:
        x0, y0, x1, y1 = box
        region = im.crop((x0, y0, x1, y1))
        blurred = region.filter(ImageFilter.GaussianBlur(radius))
        im.paste(blurred, (x0, y0))
    return im


def finalize(player_id, blur_boxes, blur_radius=10, trim=None, source="cutout"):
    src = os.path.join(GEN, player_id, f"{source}.png")
    im = Image.open(src).convert("RGBA")
    if trim:
        l, t, r, b = trim
        im = im.crop((l, t, im.width - r, im.height - b))
    im = blur_regions(im, blur_boxes, blur_radius)
    dst = os.path.join(GEN, player_id, "base.png")
    im.save(dst)
    print(player_id, "->", im.size, "saved", dst)
    return im.size


if __name__ == "__main__":
    cfg_path = sys.argv[1]
    with open(cfg_path, encoding="utf-8") as f:
        cfg = json.load(f)
    finalize(cfg["id"], [tuple(b) for b in cfg["blurBoxes"]], cfg.get("blurRadius", 10), cfg.get("trim"), cfg.get("source", "cutout"))
