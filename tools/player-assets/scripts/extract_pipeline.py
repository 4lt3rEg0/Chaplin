"""
Asset extraction pipeline for one master-sheet cell, following the
corrected methodology: a STRICT high-alpha mask is used only to find
component geometry (glow/shadow/antialiasing never define segmentation);
the final crop always comes from the original RGBA so material quality is
preserved. Bands are found via a real horizontal alpha projection, not
hardcoded coordinates. Components are grouped semantically (containment /
tight parent-child), never by raw proximity.
"""
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ALPHA_THRESHOLD = 160
MIN_AREA = 20
BAND_GAP_MIN = 6  # consecutive near-empty rows to call a band separator


def load_region(sheet_path, box):
    im = Image.open(sheet_path).convert("RGBA")
    return im.crop(box), im  # cropped region + full sheet (for reference)


def detection_mask(region_rgba, threshold=ALPHA_THRESHOLD):
    arr = np.array(region_rgba)
    return (arr[:, :, 3] >= threshold).astype(np.uint8)


def find_bands(mask, gap_min=BAND_GAP_MIN):
    row_sum = mask.sum(axis=1)
    empty = row_sum == 0
    bands = []
    y = 0
    h = len(empty)
    while y < h:
        if not empty[y]:
            y0 = y
            while y < h and not empty[y]:
                y += 1
            bands.append((y0, y))
        else:
            gap_start = y
            while y < h and empty[y]:
                y += 1
            if y - gap_start < gap_min and bands:
                # too short a gap to be a real separator: merge into previous band
                y0, y1 = bands[-1]
                bands[-1] = (y0, y)
    return bands


def components_in_band(mask, y0, y1, min_area=MIN_AREA):
    band_mask = mask[y0:y1, :]
    labeled, n = ndimage.label(band_mask)  # 4-connectivity, no dilation
    comps = []
    for i in range(1, n + 1):
        ys, xs = np.where(labeled == i)
        if len(xs) < min_area:
            kind = "possible-decoration"
        else:
            kind = "component"
        bx0, bx1 = int(xs.min()), int(xs.max()) + 1
        by0, by1 = int(ys.min()), int(ys.max()) + 1
        comps.append({
            "bbox": (bx0, y0 + by0, bx1, y0 + by1),
            "area": int(len(xs)),
            "kind": kind,
        })
    return comps


def bbox_center(b):
    x0, y0, x1, y1 = b
    return ((x0 + x1) / 2, (y0 + y1) / 2)


def bbox_contains(outer, inner, slack=2):
    ox0, oy0, ox1, oy1 = outer
    ix0, iy0, ix1, iy1 = inner
    return ix0 >= ox0 - slack and iy0 >= oy0 - slack and ix1 <= ox1 + slack and iy1 <= oy1 + slack


def group_components(comps):
    """Merge only on containment (one bbox fully inside another, e.g. an
    icon glyph inside its button body) — never on raw proximity."""
    comps = sorted(comps, key=lambda c: -(c["bbox"][2] - c["bbox"][0]) * (c["bbox"][3] - c["bbox"][1]))
    groups = []
    used = [False] * len(comps)
    for i, c in enumerate(comps):
        if used[i]:
            continue
        group = [c]
        used[i] = True
        for j, c2 in enumerate(comps):
            if used[j] or j == i:
                continue
            if bbox_contains(c["bbox"], c2["bbox"]):
                group.append(c2)
                used[j] = True
        x0 = min(g["bbox"][0] for g in group)
        y0 = min(g["bbox"][1] for g in group)
        x1 = max(g["bbox"][2] for g in group)
        y1 = max(g["bbox"][3] for g in group)
        groups.append({"bbox": (x0, y0, x1, y1), "area": sum(g["area"] for g in group), "members": len(group)})
    return groups


def draw_boxes(base_rgba, boxes, color=(255, 0, 0, 255), label=True):
    canvas = base_rgba.copy()
    draw = ImageDraw.Draw(canvas)
    for i, b in enumerate(boxes):
        x0, y0, x1, y1 = b["bbox"] if isinstance(b, dict) else b
        draw.rectangle([x0, y0, x1, y1], outline=color, width=1)
        if label:
            draw.text((x0 + 1, y0 + 1), str(i), fill=color)
    return canvas


def checkerboard(size, cell=10):
    w, h = size
    board = Image.new("RGB", size, (200, 200, 200))
    draw = ImageDraw.Draw(board)
    for y in range(0, h, cell):
        for x in range(0, w, cell):
            if (x // cell + y // cell) % 2 == 0:
                draw.rectangle([x, y, x + cell, y + cell], fill=(230, 230, 230))
    return board.convert("RGBA")


if __name__ == "__main__":
    import sys
    sheet_path = sys.argv[1]
    box = tuple(map(int, sys.argv[2:6]))
    out_dir = sys.argv[6]

    region, full = load_region(sheet_path, box)
    mask = detection_mask(region)

    Image.fromarray((mask * 255).astype(np.uint8)).save(f"{out_dir}/debug_detection_mask.png")

    bands = find_bands(mask)
    band_debug = region.copy()
    draw = ImageDraw.Draw(band_debug)
    for i, (y0, y1) in enumerate(bands):
        draw.rectangle([0, y0, region.width - 1, y1 - 1], outline=(0, 255, 0, 255), width=2)
        draw.text((2, y0 + 2), f"band{i}", fill=(0, 255, 0, 255))
    band_debug.save(f"{out_dir}/debug_bands.png")

    all_comps = []
    for (y0, y1) in bands:
        all_comps.extend(components_in_band(mask, y0, y1))

    real_comps = [c for c in all_comps if c["kind"] == "component"]
    deco_comps = [c for c in all_comps if c["kind"] == "possible-decoration"]

    comp_debug = draw_boxes(region, real_comps, color=(255, 0, 0, 255))
    comp_debug = draw_boxes(comp_debug, deco_comps, color=(0, 150, 255, 255), label=False)
    comp_debug.save(f"{out_dir}/debug_components.png")

    groups = group_components(real_comps)
    grouped_debug = draw_boxes(region, groups, color=(255, 0, 255, 255))
    grouped_debug.save(f"{out_dir}/debug_grouped_components.png")

    result = {
        "bands": bands,
        "components": [{"bbox": c["bbox"], "area": c["area"]} for c in real_comps],
        "decorations": [{"bbox": c["bbox"], "area": c["area"]} for c in deco_comps],
        "groups": [{"bbox": g["bbox"], "area": g["area"], "members": g["members"]} for g in groups],
    }
    with open(f"{out_dir}/components.json", "w") as f:
        json.dump(result, f, indent=2)

    print(f"bands: {len(bands)}")
    print(f"real components: {len(real_comps)}, decoration-candidates: {len(deco_comps)}")
    print(f"groups (final asset candidates): {len(groups)}")
