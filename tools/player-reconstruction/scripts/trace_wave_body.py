"""
Extracts the wave ribbon's BODY silhouette (its full filled shape, not just
the brightest specular core) from the reference image.

HSV color thresholding alone cannot separate the ribbon's darker mid-tone
fill from the water below or the bezel above: measured stats show all three
share the same hue family (H~98-102) with heavily overlapping V/S ranges
(confirmed by direct pixel sampling — this is a real finding, not a guess).

Instead this uses luminance-gradient edges (Canny) within a tight ROI to
find the ribbon's upper and lower boundary curves directly — the transition
from ribbon-to-display (above) and ribbon-to-water (below) is a real, sharp
brightness edge even where the ribbon's own fill brightness varies.
"""
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw

REPO_ROOT = Path(__file__).resolve().parents[3]
TOOL_ROOT = REPO_ROOT / "tools" / "player-reconstruction"
REF = TOOL_ROOT / "references" / "aqua-flow" / "reference.png"
OUT_JSON = TOOL_ROOT / "geometry" / "wave_body.json"
OUT_OVERLAY = TOOL_ROOT / "geometry" / "wave_body_overlay.png"
OUT_EDGES = TOOL_ROOT / "geometry" / "wave_body_edges.png"

ROI_Y0, ROI_Y1 = 85, 245
ROI_X0, ROI_X1 = 15, 628

def main():
    im = Image.open(REF).convert("RGB")
    gray = np.array(im.convert("L"))
    h, w = gray.shape
    roi = gray[ROI_Y0:ROI_Y1, ROI_X0:ROI_X1]

    blur = cv2.GaussianBlur(roi, (3, 3), 0)
    edges = cv2.Canny(blur, 25, 70)

    kernel = np.ones((3, 3), np.uint8)
    edges = cv2.dilate(edges, kernel, iterations=1)
    edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)

    full_edges = np.zeros((h, w), dtype=np.uint8)
    full_edges[ROI_Y0:ROI_Y1, ROI_X0:ROI_X1] = edges
    Image.fromarray(full_edges).save(OUT_EDGES)

    contours, hierarchy = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    results = []
    for c in contours[:8]:
        area = cv2.contourArea(c)
        if area < 400:
            continue
        raw_points = len(c)
        epsilon = 0.0012 * cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, epsilon, True)
        pts = [(int(p[0][0]) + ROI_X0, int(p[0][1]) + ROI_Y0) for p in approx]
        x, y, bw, bh = cv2.boundingRect(c)
        results.append({
            "area": area, "rawPoints": raw_points, "simplifiedPoints": len(pts),
            "bbox": [x + ROI_X0, y + ROI_Y0, bw, bh], "points": pts,
        })

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    overlay = im.copy()
    draw = ImageDraw.Draw(overlay)
    colors = [(255,0,0),(0,255,0),(255,255,0),(255,0,255),(0,255,255),(255,128,0),(128,0,255),(0,128,255)]
    for i, r in enumerate(results):
        pts = r["points"]
        draw.line(pts + [pts[0]], fill=colors[i % len(colors)], width=1)
    overlay.save(OUT_OVERLAY)

    for i, r in enumerate(results):
        print(f"contour {i}: area={r['area']:.0f} bbox={r['bbox']} rawPoints={r['rawPoints']} simplifiedPoints={r['simplifiedPoints']}")

if __name__ == "__main__":
    main()
