import sys
from PIL import Image, ImageDraw

SRC = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\assets-source\profile-players\source"
OUT = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\scripts\player-extraction\_debug"

SHEETS = {
    "5vjode": dict(file="sheet-5vjode.png", cols=5, rows=3, top=0, bottom=0, left=0, right=0),
    "g3ry50": dict(file="sheet-g3ry50.png", cols=4, rows=3, top=0, bottom=0, left=0, right=0),
    "ij1a1r": dict(file="sheet-ij1a1r.png", cols=4, rows=3, top=0, bottom=0, left=0, right=0),
    "osk7ri": dict(file="sheet-osk7ri.png", cols=4, rows=3, top=0, bottom=0, left=0, right=0),
}

def probe(name, cfg):
    im = Image.open(f"{SRC}\\{cfg['file']}").convert("RGB")
    w, h = im.size
    draw = ImageDraw.Draw(im)
    left, right, top, bottom = cfg["left"], cfg["right"], cfg["top"], cfg["bottom"]
    cw = (w - left - right) / cfg["cols"]
    ch = (h - top - bottom) / cfg["rows"]
    for c in range(cfg["cols"] + 1):
        x = left + c * cw
        draw.line([(x, 0), (x, h)], fill=(255, 0, 0), width=4)
    for r in range(cfg["rows"] + 1):
        y = top + r * ch
        draw.line([(0, y), (w, y)], fill=(0, 255, 0), width=4)
    im.save(f"{OUT}\\grid-{name}.png")
    print(name, w, h, "cell", cw, ch)

for name, cfg in SHEETS.items():
    probe(name, cfg)
