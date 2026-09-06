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

    apc = manifest.get("assembledPlayerCoordinates")
    use_apc = bool(apc and apc.get("available"))
    canvas_size = (apc["canvas"]["width"], apc["canvas"]["height"]) if use_apc else (manifest["canvas"]["width"], manifest["canvas"]["height"])
    canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))

    assets = sorted(manifest["assets"], key=lambda a: a["zIndex"])
    for a in assets:
        path = os.path.join(player_dir, a["file"])
        piece = Image.open(path).convert("RGBA")
        if piece.size != (a["width"], a["height"]):
            piece = piece.resize((a["width"], a["height"]), Image.LANCZOS)
        xy = apc["positions"][a["id"]] if use_apc and a["id"] in apc["positions"] else a
        canvas.alpha_composite(piece, (xy["x"], xy["y"]))

    canvas.save(out_path)
    print(f"reconstructed {len(assets)} assets -> {out_path} ({'assembledPlayerCoordinates' if use_apc else 'sourceSheetPosition'})")
    return manifest


if __name__ == "__main__":
    player_dir = sys.argv[1]
    out_path = sys.argv[2]
    render(player_dir, out_path)
