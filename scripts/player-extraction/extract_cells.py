import os
from pathlib import Path
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[2]
SRC = REPO_ROOT / "assets-source" / "profile-players" / "source"
OUT = REPO_ROOT / "frontend" / "web" / "public" / "assets" / "profile-players" / "generated" / "_raw"
OUT.mkdir(parents=True, exist_ok=True)

# margin as a fraction of cell width/height, expanded outward on every side
MARGIN = 0.045

SHEETS = {
    "5vjode": dict(file="sheet-5vjode.png", cols=5, rows=3),
    "g3ry50": dict(file="sheet-g3ry50.png", cols=4, rows=3),
    "ij1a1r": dict(file="sheet-ij1a1r.png", cols=4, rows=3),
    "osk7ri": dict(file="sheet-osk7ri.png", cols=4, rows=3),
}

def extract(name, cfg):
    im = Image.open(SRC / cfg["file"]).convert("RGBA")
    w, h = im.size
    cw = w / cfg["cols"]
    ch = h / cfg["rows"]
    mx = cw * MARGIN
    my = ch * MARGIN
    sheet_out = os.path.join(OUT, name)
    os.makedirs(sheet_out, exist_ok=True)
    for r in range(cfg["rows"]):
        for c in range(cfg["cols"]):
            x0 = max(0, c * cw - mx)
            y0 = max(0, r * ch - my)
            x1 = min(w, (c + 1) * cw + mx)
            y1 = min(h, (r + 1) * ch + my)
            crop = im.crop((int(x0), int(y0), int(x1), int(y1)))
            crop.save(Path(sheet_out) / f"r{r}c{c}.png")
    print(name, "done", cfg["cols"] * cfg["rows"], "cells")

for name, cfg in SHEETS.items():
    extract(name, cfg)
