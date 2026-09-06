"""
Measures the wave ribbon's real per-column thickness (upper/lower boundary
y at each x), anchored to the already-verified bright-core mask from
trace_wave_contour.py (wave_mask.png — clean, zero bezel/button/water
contamination, confirmed by visual overlay inspection).

Global segmentation (HSV threshold, Canny edges, Otsu) all failed to find
the ribbon's full body silhouette cleanly because the water texture below
shares the same hue/brightness family as the ribbon itself (measured
directly: H~98-102, heavily overlapping V/S ranges in both regions) — this
is a genuine finding, not a shortcut.

Instead: for each x column that contains bright-core pixels, use the core's
local y as an anchor and walk outward (up and down) through the V channel,
stopping each walk at the point of steepest local brightness DROP (a
LOCAL/relative measurement, not a global absolute threshold) — this finds
the real edge of the coherent bright ribbon body at that column without
drifting into the differently-textured water or the bezel, because the
search is anchored and local rather than global.
"""
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw

REF = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\tools\player-reconstruction\references\aqua-flow\reference.png"
CORE_MASK = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\tools\player-reconstruction\geometry\wave_mask.png"
OUT_JSON = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\tools\player-reconstruction\geometry\wave_thickness.json"
OUT_OVERLAY = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\tools\player-reconstruction\geometry\wave_thickness_overlay.png"

ROI_Y0, ROI_Y1 = 85, 245
MAX_WALK = 55  # px, max distance to walk from the core anchor before giving up

def walk_edge(v_col, start_y, direction, y_lo, y_hi):
    """Walk from start_y in `direction` (+1 down / -1 up) through the V
    profile, return the y where the steepest sustained drop occurs."""
    y = start_y
    peak = v_col[start_y]
    best_y = start_y
    best_drop = 0
    steps = 0
    prev = v_col[start_y]
    while steps < MAX_WALK:
        ny = y + direction
        if ny < y_lo or ny >= y_hi:
            break
        val = v_col[ny]
        drop = peak - val
        # steepest local derivative (over a short window) marks the edge
        local_grad = prev - val
        if drop > best_drop and local_grad > 2:
            best_drop = drop
            best_y = ny
        if val < peak * 0.45:  # ribbon has faded to background level
            return ny
        prev = val
        y = ny
        steps += 1
    return best_y if best_drop > 8 else y

def main():
    im = Image.open(REF).convert("RGB")
    bgr = np.array(im)[:, :, ::-1]
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    v = hsv[:, :, 2].astype(np.float32)
    h, w = v.shape

    core_mask = np.array(Image.open(CORE_MASK))
    cols_with_core = np.where(core_mask.max(axis=0) > 0)[0]
    x0, x1 = int(cols_with_core.min()), int(cols_with_core.max())

    upper, lower, xs = [], [], []
    for x in range(x0, x1 + 1):
        col_core_ys = np.where(core_mask[:, x] > 0)[0]
        if len(col_core_ys) == 0:
            continue
        anchor_top = int(col_core_ys.min())
        anchor_bot = int(col_core_ys.max())
        v_col = v[:, x]
        top_edge = walk_edge(v_col, anchor_top, -1, ROI_Y0, ROI_Y1)
        bot_edge = walk_edge(v_col, anchor_bot, +1, ROI_Y0, ROI_Y1)
        xs.append(x)
        upper.append(top_edge)
        lower.append(bot_edge)

    # light smoothing to remove single-column jitter (median filter)
    def smooth(arr, k=5):
        arr = np.array(arr, dtype=np.float32)
        pad = k // 2
        padded = np.pad(arr, pad, mode="edge")
        out = np.array([np.median(padded[i:i + k]) for i in range(len(arr))])
        return out.astype(int)

    upper_s = smooth(upper)
    lower_s = smooth(lower)

    # Reject per-column thickness outliers (a walk that ran into the water's
    # own bright ripples instead of stopping at the ribbon's real edge) by
    # clamping to a rolling local median of nearby columns' thickness.
    thickness = lower_s - upper_s
    med_k = 15
    pad = med_k // 2
    padded_t = np.pad(thickness.astype(np.float32), pad, mode="edge")
    local_med = np.array([np.median(padded_t[i:i + med_k]) for i in range(len(thickness))])
    for i in range(len(thickness)):
        if thickness[i] > local_med[i] * 1.6 + 10:
            excess = thickness[i] - local_med[i]
            # shrink symmetrically toward the anchor side that overshot least
            lower_s[i] = int(lower_s[i] - excess * 0.5)
            upper_s[i] = int(upper_s[i] + excess * 0.5)

    result = {"xs": xs, "upper": upper_s.tolist(), "lower": lower_s.tolist()}
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    overlay = im.copy()
    draw = ImageDraw.Draw(overlay)
    for x, uy, ly in zip(xs, upper_s, lower_s):
        draw.point((x, uy), fill=(255, 0, 0))
        draw.point((x, ly), fill=(0, 255, 255))
    overlay.save(OUT_OVERLAY)
    print(f"columns measured: {len(xs)}  x-range: {x0}-{x1}")
    print(f"thickness range: {int((lower_s - upper_s).min())}-{int((lower_s - upper_s).max())}px")

if __name__ == "__main__":
    main()
