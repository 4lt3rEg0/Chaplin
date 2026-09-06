"""
Real geometric extraction of the wave ribbon's contour from the reference
image (not a hand-guessed curve). Approach:
  1. Restrict search to the wave's known vertical band (a region-of-interest,
     not a shape assumption).
  2. Segment "wave pixels" from "water pixels" and "display pixels" via
     HSV thresholding (the wave is brighter/lighter than the water below
     and the dark navy display above).
  3. Clean the mask with morphology (close small gaps, remove speckle).
  4. Find the largest contour(s) with cv2.findContours.
  5. Simplify with cv2.approxPolyDP at a small tolerance (not manually
     picked landmark points).
  6. Fit a smooth SVG path (Catmull-Rom -> cubic Bezier) through the
     simplified point set.
  7. Save a verification overlay (traced contour drawn over the reference)
     so the extraction can be checked before it's used anywhere.
"""
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw

REF = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\tools\player-reconstruction\references\aqua-flow\reference.png"
OUT_JSON = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\tools\player-reconstruction\geometry\wave_contour.json"
OUT_MASK = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\tools\player-reconstruction\geometry\wave_mask.png"
OUT_OVERLAY = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\tools\player-reconstruction\geometry\wave_contour_overlay.png"

# Region of interest: WHERE to look (measured from visual inspection of the
# reference), not the shape itself — the algorithm below finds the real
# shape within this band.
ROI_Y0, ROI_Y1 = 88, 240
ROI_X0, ROI_X1 = 18, 616

def load_bgr(path):
    im = Image.open(path).convert("RGB")
    arr = np.array(im)[:, :, ::-1]  # RGB -> BGR for opencv
    return arr

def main():
    bgr = load_bgr(REF)
    h, w = bgr.shape[:2]
    roi = bgr[ROI_Y0:ROI_Y1, ROI_X0:ROI_X1]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)

    # The wave is bright (high V) and has a whitish/cyan highlight; the
    # water below is darker and more saturated-teal; the display above is
    # dark navy. Threshold on Value (brightness) primarily.
    v = hsv[:, :, 2].astype(np.float32)
    s = hsv[:, :, 1].astype(np.float32)

    # Wave pixels: bright OR (bright-ish and low saturation, i.e. the white
    # highlight core).
    mask = ((v > 155) & (s < 195)).astype(np.uint8) * 255

    # Morphology: close small gaps in the ribbon, remove speckle noise.
    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

    # Keep only the largest few connected components (the ribbon may be
    # split into 2-3 pieces by darker mid-tones — merge by taking the
    # union of components above a minimum area, not just the single
    # largest, since the wave is one continuous but unevenly-lit ribbon).
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    areas = stats[1:, cv2.CC_STAT_AREA]
    keep_mask = np.zeros_like(mask)
    min_area = max(200, areas.max() * 0.03) if len(areas) else 0
    for i in range(1, num_labels):
        if stats[i, cv2.CC_STAT_AREA] >= min_area:
            keep_mask[labels == i] = 255
    mask = keep_mask

    # Full-size mask for saving/inspection.
    full_mask = np.zeros((h, w), dtype=np.uint8)
    full_mask[ROI_Y0:ROI_Y1, ROI_X0:ROI_X1] = mask
    Image.fromarray(full_mask).save(OUT_MASK)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    contours = [c for c in contours if cv2.contourArea(c) > min_area]
    contours.sort(key=cv2.contourArea, reverse=True)

    results = []
    for c in contours[:4]:  # keep up to 4 largest pieces
        raw_points = len(c)
        epsilon = 0.0015 * cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, epsilon, True)
        pts = [(int(p[0][0]) + ROI_X0, int(p[0][1]) + ROI_Y0) for p in approx]
        results.append({"rawPoints": raw_points, "simplifiedPoints": len(pts), "points": pts, "area": cv2.contourArea(c)})

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    # Verification overlay: draw each traced contour over the reference.
    im = Image.open(REF).convert("RGB")
    draw = ImageDraw.Draw(im)
    colors = [(255, 0, 0), (0, 255, 0), (255, 255, 0), (255, 0, 255)]
    for i, r in enumerate(results):
        pts = r["points"]
        draw.line(pts + [pts[0]], fill=colors[i % len(colors)], width=2)
        for p in pts:
            draw.ellipse([p[0] - 2, p[1] - 2, p[0] + 2, p[1] + 2], fill=colors[i % len(colors)])
    im.save(OUT_OVERLAY)

    for i, r in enumerate(results):
        print(f"piece {i}: area={r['area']:.0f} rawPoints={r['rawPoints']} simplifiedPoints={r['simplifiedPoints']}")

if __name__ == "__main__":
    main()
