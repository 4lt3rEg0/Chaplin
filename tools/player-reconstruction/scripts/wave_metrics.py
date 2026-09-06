"""
Wave-specific fidelity metrics, decoupled from global SSIM/MAE (which are
dominated by water-texture and bezel color noise, not silhouette accuracy).

Computes, for the wave region only:
  - Silhouette IoU: intersection-over-union of the bright-core wave mask,
    extracted independently from the reference and from the live render via
    the SAME thresholding pipeline (trace_wave_contour.py's method).
  - Wave Contour Error: mean absolute vertical distance between the
    reference's measured upper/lower boundary curve (wave_thickness.json,
    ground truth) and the same boundary walked on the live render, over the
    x-range both have in common.
  - Bounding Box Error: IoU of the wave's overall bounding box.
"""
import json
import cv2
import numpy as np
from PIL import Image

REF = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\tools\player-reconstruction\references\aqua-flow\reference.png"
LIVE = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\tools\player-reconstruction\screenshots\aqua-flow-live.png"
THICKNESS_JSON = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\tools\player-reconstruction\geometry\wave_thickness.json"
OUT = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\tools\player-reconstruction\geometry\wave_fidelity_metrics.json"

ROI_Y0, ROI_Y1 = 88, 240
ROI_X0, ROI_X1 = 18, 616
MAX_WALK = 55


def core_mask(bgr):
    h, w = bgr.shape[:2]
    roi = bgr[ROI_Y0:ROI_Y1, ROI_X0:ROI_X1]
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    v = hsv[:, :, 2].astype(np.float32)
    s = hsv[:, :, 1].astype(np.float32)
    mask = ((v > 155) & (s < 195)).astype(np.uint8) * 255
    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    areas = stats[1:, cv2.CC_STAT_AREA]
    keep = np.zeros_like(mask)
    min_area = max(200, areas.max() * 0.03) if len(areas) else 0
    for i in range(1, num_labels):
        if stats[i, cv2.CC_STAT_AREA] >= min_area:
            keep[labels == i] = 255
    full = np.zeros((h, w), dtype=np.uint8)
    full[ROI_Y0:ROI_Y1, ROI_X0:ROI_X1] = keep
    return full


def walk_edge(v_col, start_y, direction, y_lo, y_hi):
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
        local_grad = prev - val
        if drop > best_drop and local_grad > 2:
            best_drop = drop
            best_y = ny
        if val < peak * 0.45:
            return ny
        prev = val
        y = ny
        steps += 1
    return best_y if best_drop > 8 else y


def boundary_from_mask(bgr, mask):
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    v = hsv[:, :, 2].astype(np.float32)
    cols = np.where(mask.max(axis=0) > 0)[0]
    if len(cols) == 0:
        return {}, {}
    upper, lower = {}, {}
    for x in range(int(cols.min()), int(cols.max()) + 1):
        ys = np.where(mask[:, x] > 0)[0]
        if len(ys) == 0:
            continue
        upper[x] = walk_edge(v[:, x], int(ys.min()), -1, ROI_Y0, ROI_Y1)
        lower[x] = walk_edge(v[:, x], int(ys.max()), +1, ROI_Y0, ROI_Y1)
    return upper, lower


def main():
    ref_im = Image.open(REF).convert("RGB")
    live_im = Image.open(LIVE).convert("RGB")
    if live_im.size != ref_im.size:
        live_im = live_im.resize(ref_im.size, Image.LANCZOS)

    ref_bgr = np.array(ref_im)[:, :, ::-1].copy()
    live_bgr = np.array(live_im)[:, :, ::-1].copy()

    ref_mask = core_mask(ref_bgr)
    live_mask = core_mask(live_bgr)

    inter = np.logical_and(ref_mask > 0, live_mask > 0).sum()
    union = np.logical_or(ref_mask > 0, live_mask > 0).sum()
    iou = float(inter / union) if union else 0.0

    def bbox(mask):
        ys, xs = np.where(mask > 0)
        if len(xs) == 0:
            return None
        return (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))

    ref_bb = bbox(ref_mask)
    live_bb = bbox(live_mask)

    def bbox_iou(a, b):
        if not a or not b:
            return 0.0
        x0 = max(a[0], b[0]); y0 = max(a[1], b[1])
        x1 = min(a[2], b[2]); y1 = min(a[3], b[3])
        inter_area = max(0, x1 - x0) * max(0, y1 - y0)
        area_a = (a[2] - a[0]) * (a[3] - a[1])
        area_b = (b[2] - b[0]) * (b[3] - b[1])
        union_area = area_a + area_b - inter_area
        return float(inter_area / union_area) if union_area else 0.0

    bb_iou = bbox_iou(ref_bb, live_bb)

    with open(THICKNESS_JSON) as f:
        d = json.load(f)
    ref_upper = dict(zip(d["xs"], d["upper"]))
    ref_lower = dict(zip(d["xs"], d["lower"]))

    live_upper, live_lower = boundary_from_mask(live_bgr, live_mask)

    common_x = sorted(set(ref_upper) & set(live_upper))
    if common_x:
        upper_err = np.mean([abs(ref_upper[x] - live_upper[x]) for x in common_x])
        lower_err = np.mean([abs(ref_lower[x] - live_lower[x]) for x in common_x])
        contour_err = float((upper_err + lower_err) / 2)
    else:
        contour_err = None

    # Edge similarity: F1 of Canny edges within a small tolerance band
    # (edges rarely land on the exact same pixel even for a good match, so
    # a dilated-tolerance F1 is the standard way to score this).
    def edge_map(bgr):
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        roi = gray[ROI_Y0:ROI_Y1, ROI_X0:ROI_X1]
        e = cv2.Canny(cv2.GaussianBlur(roi, (3, 3), 0), 40, 110)
        full = np.zeros(gray.shape, dtype=np.uint8)
        full[ROI_Y0:ROI_Y1, ROI_X0:ROI_X1] = e
        return full

    ref_edges = edge_map(ref_bgr)
    live_edges = edge_map(live_bgr)
    tol_kernel = np.ones((5, 5), np.uint8)
    ref_edges_dilated = cv2.dilate(ref_edges, tol_kernel)
    live_edges_dilated = cv2.dilate(live_edges, tol_kernel)
    tp = np.logical_and(live_edges > 0, ref_edges_dilated > 0).sum()
    fp = np.logical_and(live_edges > 0, ref_edges_dilated == 0).sum()
    fn = np.logical_and(ref_edges > 0, live_edges_dilated == 0).sum()
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    edge_f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0

    # Color difference: mean per-channel abs diff over the wave's own
    # silhouette (union of ref/live core masks), not the whole image — this
    # isolates the wave's own material color match from bezel/water noise.
    wave_region = np.logical_or(ref_mask > 0, live_mask > 0)
    ref_rgb = np.array(ref_im)
    live_rgb = np.array(live_im)
    color_diff = float(np.mean(np.abs(ref_rgb[wave_region].astype(float) - live_rgb[wave_region].astype(float))))

    result = {
        "silhouetteIoU": round(iou, 4),
        "boundingBoxIoU": round(bb_iou, 4),
        "waveContourErrorPx": round(contour_err, 2) if contour_err is not None else None,
        "edgeSimilarityF1": round(float(edge_f1), 4),
        "waveColorDifference": round(color_diff, 2),
        "commonColumns": len(common_x),
        "refBBox": ref_bb,
        "liveBBox": live_bb,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
