"""
Final extraction for Y2K Bubblegum Gloss (Assets (6).png, top-left cell).
Uses the bboxes discovered by extract_pipeline.py's strict-mask detection
(tools/player-assets/_debug2/components.json), crops ALWAYS from the
original RGBA (glow/antialiasing preserved), trims only fully-transparent
outer rows/cols, and writes real production assets + manifest.json.
"""
import json
import numpy as np
from PIL import Image

SHEET = r"O:\ODriveO\OneDrive\Desktop\repros\Assets\Assets (6).png"
OUT = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\frontend\web\src\assets\profilePlayers\bubblegum-gloss"
PAD = 5


def trim_transparent(im, origin=(0, 0)):
    """Returns (trimmed_image, (abs_x, abs_y)) — abs placement in the
    ORIGINAL sheet's coordinate space, so the manifest can position the
    piece back exactly where it was cut from."""
    arr = np.array(im)
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 0)
    if len(xs) == 0:
        return im, origin
    x0, y0 = int(xs.min()), int(ys.min())
    x1, y1 = int(xs.max()) + 1, int(ys.max()) + 1
    return im.crop((x0, y0, x1, y1)), (origin[0] + x0, origin[1] + y0)


def extract(sheet, bbox, pad=PAD):
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(sheet.width, x1 + pad)
    y1 = min(sheet.height, y1 + pad)
    piece = sheet.crop((x0, y0, x1, y1))
    piece, placement = trim_transparent(piece, origin=(x0, y0))
    return piece, placement


def avg_color_hex(sheet, bbox, shrink=10):
    x0, y0, x1, y1 = bbox
    x0 += shrink; y0 += shrink; x1 -= shrink; y1 -= shrink
    region = np.array(sheet.crop((x0, y0, x1, y1)))
    mask = region[:, :, 3] > 200
    if mask.sum() == 0:
        mask = region[:, :, 3] > 0
    rgb = region[:, :, :3][mask].mean(axis=0)
    return "#{:02x}{:02x}{:02x}".format(int(rgb[0]), int(rgb[1]), int(rgb[2]))


def main():
    import os
    for sub in ["shell", "screen", "controls", "decoration"]:
        os.makedirs(f"{OUT}/{sub}", exist_ok=True)

    sheet = Image.open(SHEET).convert("RGBA")

    placements = {}

    pieces = {
        "shell/screen-fused.png": (28, 66, 321, 274),
        "screen/background-alt.png": (328, 78, 473, 258),
        "controls/prev.png": (28, 285, 95, 353),
        "controls/play.png": (101, 285, 168, 353),
        "controls/pause.png": (175, 284, 246, 355),
        "controls/next.png": (253, 285, 321, 353),
        "controls/volume.png": (328, 285, 394, 353),
    }
    for name, bbox in pieces.items():
        piece, placement = extract(sheet, bbox)
        piece.save(f"{OUT}/{name}")
        placements[name] = {"x": placement[0], "y": placement[1], "width": piece.width, "height": piece.height}
        print(name, piece.size, placement)

    # slider: thumb-free baseline strip (left portion, x=0-200 local -> sheet 28-228,
    # y baseline 6-34 local -> sheet 445-473) stretched via CSS in the component;
    # thumb bulge (local x=205-245,y=0-40 -> sheet 233-273,439-479).
    track, track_pl = extract(sheet, (28, 445, 228, 473), pad=3)
    track.save(f"{OUT}/controls/slider-track.png")
    placements["controls/slider-track.png"] = {"x": track_pl[0], "y": track_pl[1], "width": track.width, "height": track.height}
    print("controls/slider-track.png", track.size, track_pl)

    thumb, thumb_pl = extract(sheet, (233, 439, 273, 479), pad=4)
    thumb.save(f"{OUT}/controls/slider-thumb.png")
    placements["controls/slider-thumb.png"] = {"x": thumb_pl[0], "y": thumb_pl[1], "width": thumb.width, "height": thumb.height}
    print("controls/slider-thumb.png", thumb.size, thumb_pl)

    # decoration bubbles: union of the scattered bubble components
    # Individually-placed pastes (not a rectangular-union crop): the union
    # bbox of these bubbles also overlaps the unused icon-row volume glyph
    # in the source sheet, which a plain rectangular crop would pull in.
    # excludes (409,384,425,400) and (449,384,468,404): those are that
    # glyph's sound-wave arcs, not bubbles.
    bubble_boxes = [
        (416, 338, 461, 384), (396, 410, 463, 477), (358, 451, 385, 478),
        (441, 483, 465, 508), (338, 441, 354, 459),
        (340, 469, 349, 479),
    ]
    ux0 = min(b[0] for b in bubble_boxes); uy0 = min(b[1] for b in bubble_boxes)
    ux1 = max(b[2] for b in bubble_boxes); uy1 = max(b[3] for b in bubble_boxes)
    pad = 4
    canvas = Image.new("RGBA", (ux1 - ux0 + pad * 2, uy1 - uy0 + pad * 2), (0, 0, 0, 0))
    for bx0, by0, bx1, by1 in bubble_boxes:
        piece = sheet.crop((bx0 - 2, by0 - 2, bx1 + 2, by1 + 2))
        canvas.alpha_composite(piece, (bx0 - ux0 - 2 + pad, by0 - uy0 - 2 + pad))
    bubbles, bubbles_pl = trim_transparent(canvas, origin=(ux0 - pad, uy0 - pad))
    bubbles.save(f"{OUT}/decoration/bubbles.png")
    placements["decoration/bubbles.png"] = {"x": bubbles_pl[0], "y": bubbles_pl[1], "width": bubbles.width, "height": bubbles.height}
    print("decoration/bubbles.png", bubbles.size, "source", (ux0, uy0, ux1, uy1))

    # recolor swatches -> real measured palette tokens (not image assets)
    swatches = {
        "gelPink": (222, 496, 262, 536),
        "gelBlue": (270, 496, 309, 536),
        "accentPurple": (316, 496, 356, 536),
        "accentPale": (364, 496, 403, 537),
    }
    palette = {k: avg_color_hex(sheet, v) for k, v in swatches.items()}
    print("palette", palette)

    with open(f"{OUT}/_extracted_palette.json", "w") as f:
        json.dump(palette, f, indent=2)
    with open(f"{OUT}/_placements.json", "w") as f:
        json.dump(placements, f, indent=2)


if __name__ == "__main__":
    main()
