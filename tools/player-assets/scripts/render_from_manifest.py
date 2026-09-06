"""
Reconstructs a player PURELY from its manifest.json + asset files (no
React, no browser) — proves the assets + coordinates alone are enough to
rebuild the player, independent of the app code.
"""
import json
import sys
import os
from PIL import Image


def render(player_dir, out_path):
    with open(os.path.join(player_dir, "manifest.json"), encoding="utf-8") as f:
        manifest = json.load(f)

    canvas = Image.new("RGBA", (manifest["canvas"]["width"], manifest["canvas"]["height"]), (0, 0, 0, 0))

    assets = sorted(manifest["assets"], key=lambda a: a["zIndex"])
    for a in assets:
        path = os.path.join(player_dir, a["file"])
        piece = Image.open(path).convert("RGBA")
        if piece.size != (a["width"], a["height"]):
            piece = piece.resize((a["width"], a["height"]), Image.LANCZOS)
        canvas.alpha_composite(piece, (a["x"], a["y"]))

    canvas.save(out_path)
    print(f"reconstructed {len(assets)} assets -> {out_path}")
    return manifest


if __name__ == "__main__":
    player_dir = sys.argv[1]
    out_path = sys.argv[2]
    render(player_dir, out_path)
