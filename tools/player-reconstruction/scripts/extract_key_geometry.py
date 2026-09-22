"""
Extracts geometry for the remaining key structural elements: outer body
silhouette (row-by-row left/right bounds -> a real, slightly-tapered
rounded shape, not a plain CSS rect), the display panel rectangle, and the
transport/secondary button circles (via Hough circle detection, the
appropriate classical-CV tool for real circular controls).

Each result is verified via an overlay drawn directly on the reference.
"""
import json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw

REPO_ROOT = Path(__file__).resolve().parents[3]
TOOL_ROOT = REPO_ROOT / "tools" / "player-reconstruction"
REF = TOOL_ROOT / "references" / "aqua-flow" / "reference.png"
OUT_JSON = TOOL_ROOT / "geometry" / "key_elements.json"
OUT_OVERLAY = TOOL_ROOT / "geometry" / "key_elements_overlay.png"


def body_silhouette(gray, alpha):
    """Row-by-row left/right bound of the non-transparent body."""
    h, w = alpha.shape
    rows = []
    for y in range(0, h, 4):
        xs = np.where(alpha[y] > 20)[0]
        if len(xs) == 0:
            continue
        rows.append((y, int(xs.min()), int(xs.max())))
    return rows


def display_panel(bgr):
    """The display panel is a distinct dark-navy rectangle in the upper-left
    area, low V, moderate-low S, bordered by a brighter bezel/glass edge."""
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    v = hsv[:, :, 2]
    region = v[30:90, 20:260]
    mask = (region < 130).astype(np.uint8) * 255
    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    c = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(c)
    return [x + 20, y + 30, w, h]


def hough_pass(gray, min_r, max_r, param2, min_dist):
    blur = cv2.GaussianBlur(gray, (5, 5), 1.2)
    circles = cv2.HoughCircles(
        blur, cv2.HOUGH_GRADIENT, dp=1.2, minDist=min_dist,
        param1=80, param2=param2, minRadius=min_r, maxRadius=max_r,
    )
    out = []
    if circles is not None:
        for c in circles[0]:
            x, y, r = c
            out.append([round(float(x), 1), round(float(y), 1), round(float(r), 1)])
    return out


def buttons(gray):
    # Transport row (prev/play/next): larger circles, well-separated.
    transport = [b for b in hough_pass(gray, 25, 36, 32, 40) if 280 < b[1] < 320 and b[0] < 260]
    # Secondary icon row (equalizer/playlist/other): smaller circles.
    secondary = [b for b in hough_pass(gray, 14, 20, 22, 20) if 220 < b[1] < 245 and b[0] < 220]
    return transport, secondary


def main():
    im = Image.open(REF).convert("RGBA")
    arr = np.array(im)
    alpha = arr[:, :, 3]
    bgr = arr[:, :, :3][:, :, ::-1].copy()
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    rows = body_silhouette(gray, alpha)
    panel = display_panel(bgr)
    transport, secondary = buttons(gray)

    result = {"bodyRows": rows, "displayPanel": panel, "transportButtons": transport, "secondaryButtons": secondary}
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    overlay = im.convert("RGB").copy()
    draw = ImageDraw.Draw(overlay)
    for y, xl, xr in rows:
        draw.point((xl, y), fill=(255, 0, 0))
        draw.point((xr, y), fill=(255, 0, 0))
    if panel:
        x, y, pw, ph = panel
        draw.rectangle([x, y, x + pw, y + ph], outline=(0, 255, 0), width=2)
    for x, y, r in transport:
        draw.ellipse([x - r, y - r, x + r, y + r], outline=(255, 255, 0), width=2)
    for x, y, r in secondary:
        draw.ellipse([x - r, y - r, x + r, y + r], outline=(255, 0, 255), width=2)
    overlay.save(OUT_OVERLAY)

    print(f"body rows: {len(rows)}")
    print(f"display panel: {panel}")
    print(f"transport buttons: {len(transport)} -> {transport}")
    print(f"secondary buttons: {len(secondary)} -> {secondary}")


if __name__ == "__main__":
    main()
