"""
Runs background removal on every extracted raw cell, then auto-trims to the
bounding box of the surviving (non-transparent) silhouette with a small
padding — this is what makes each player's real silhouette (including
protrusions like stars, chains, antennas) the actual asset boundary, instead
of a guessed rectangle. Output: generated/<id>/cutout.png
"""
import json
import os
from PIL import Image
from rembg import remove, new_session

GEN = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\frontend\web\public\assets\profile-players\generated"
RAW = os.path.join(GEN, "_raw")

with open(os.path.join(RAW, "inventory.json"), encoding="utf-8") as f:
    inv = json.load(f)

PAD = 6

def trim(im, pad=PAD):
    alpha = im.split()[3]
    bbox = alpha.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))

def main():
    session = new_session("u2net")
    for p in inv["players"]:
        pid = p["id"]
        dst_dir = os.path.join(GEN, pid)
        dst = os.path.join(dst_dir, "cutout.png")
        if os.path.exists(dst):
            continue
        src = os.path.join(dst_dir, "raw.png")
        im = Image.open(src).convert("RGBA")
        out = remove(im, session=session)
        out = trim(out)
        out.save(dst)
        print(pid, "->", out.size)

if __name__ == "__main__":
    main()
