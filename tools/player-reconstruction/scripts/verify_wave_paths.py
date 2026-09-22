"""Renders the fitted Bezier paths (waveGeometry.js) directly over the
reference PNG via PIL, to verify the fit visually without a browser."""
import re
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

REPO_ROOT = Path(__file__).resolve().parents[3]
TOOL_ROOT = REPO_ROOT / "tools" / "player-reconstruction"
REF = TOOL_ROOT / "references" / "aqua-flow" / "reference.png"
GEOM_JS = REPO_ROOT / "frontend" / "web" / "src" / "components" / "ProfilePlayer" / "reconstructed" / "aquaFlow" / "waveGeometry.js"
OUT = TOOL_ROOT / "geometry" / "wave_paths_fit_overlay.png"


def parse_path_d(d):
    """Minimal M/C/Z path parser -> list of (cmd, [floats])."""
    tokens = re.findall(r"[MCZ]|-?\d+\.?\d*", d)
    cmds = []
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t == "M":
            cmds.append(("M", [float(tokens[i+1]), float(tokens[i+2])]))
            i += 3
        elif t == "C":
            cmds.append(("C", [float(x) for x in tokens[i+1:i+7]]))
            i += 7
        elif t == "Z":
            cmds.append(("Z", []))
            i += 1
        else:
            i += 1
    return cmds


def flatten(cmds, steps=20):
    pts = []
    cur = None
    for cmd, args in cmds:
        if cmd == "M":
            cur = (args[0], args[1])
            pts.append(cur)
        elif cmd == "C":
            p0 = cur
            c1 = (args[0], args[1]); c2 = (args[2], args[3]); p1 = (args[4], args[5])
            for s in range(1, steps + 1):
                t = s / steps
                mt = 1 - t
                x = mt**3*p0[0] + 3*mt**2*t*c1[0] + 3*mt*t**2*c2[0] + t**3*p1[0]
                y = mt**3*p0[1] + 3*mt**2*t*c1[1] + 3*mt*t**2*c2[1] + t**3*p1[1]
                pts.append((x, y))
            cur = p1
        elif cmd == "Z":
            if pts:
                pts.append(pts[0])
    return pts


def main():
    with open(GEOM_JS, encoding="utf-8") as f:
        src = f.read()

    body_d = re.search(r'AQUA_WAVE_BODY_PATH = "([^"]+)"', src).group(1)
    highlight_ds = re.findall(r'"(M [^"]+Z)"', src.split("AQUA_WAVE_HIGHLIGHT_PATHS")[1])

    im = Image.open(REF).convert("RGB")
    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    body_pts = flatten(parse_path_d(body_d))
    draw.polygon(body_pts, fill=(0, 255, 0, 70), outline=(0, 255, 0, 255))

    colors = [(255, 0, 0, 255), (255, 140, 0, 255), (255, 0, 255, 255)]
    for i, hd in enumerate(highlight_ds):
        pts = flatten(parse_path_d(hd))
        draw.line(pts, fill=colors[i % len(colors)], width=2)

    result = Image.alpha_composite(im.convert("RGBA"), overlay)
    result.convert("RGB").save(OUT)
    print("saved", OUT)


if __name__ == "__main__":
    main()
