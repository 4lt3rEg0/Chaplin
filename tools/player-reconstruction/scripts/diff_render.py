"""
Compares a live render against its reference: pixel MAE, SSIM, and a visual
diff image. Dynamic regions (real track text, time, artwork) are masked out
before scoring, since those never need to pixel-match the reference's own
baked (fake) content — see MASK_REGIONS per skin.
"""
import sys
import json
import numpy as np
from PIL import Image, ImageDraw
from skimage.metrics import structural_similarity as ssim

MASK_REGIONS = {
    # x0, y0, x1, y1 in reference-pixel coordinates — covers the display's
    # real text area (title/artist/time), which legitimately differs from
    # the reference's baked garbage text and must not count against fidelity.
    "aqua-flow": [(148, 52, 600, 100)]
}

def load_rgb(path, size=None):
    im = Image.open(path).convert("RGB")
    if size and im.size != size:
        im = im.resize(size, Image.LANCZOS)
    return im

def apply_mask(arr, regions, fill=(0, 0, 0)):
    arr = arr.copy()
    for (x0, y0, x1, y1) in regions:
        arr[y0:y1, x0:x1] = fill
    return arr

def main(skin_id, reference_path, live_path, out_diff_path):
    ref = load_rgb(reference_path)
    live = load_rgb(live_path, size=ref.size)

    ref_arr = np.array(ref)
    live_arr = np.array(live)

    regions = MASK_REGIONS.get(skin_id, [])
    ref_masked = apply_mask(ref_arr, regions)
    live_masked = apply_mask(live_arr, regions)

    mae = float(np.mean(np.abs(ref_masked.astype(float) - live_masked.astype(float))))
    ssim_score = float(ssim(ref_masked, live_masked, channel_axis=2))

    diff = np.abs(ref_masked.astype(int) - live_masked.astype(int)).astype(np.uint8)
    diff_gray = diff.mean(axis=2)
    heat = np.zeros_like(ref_masked)
    heat[..., 0] = np.clip(diff_gray * 3, 0, 255)  # red channel intensity = magnitude of difference
    diff_img = Image.fromarray(heat.astype(np.uint8))
    blend = Image.blend(live.convert("RGB"), diff_img, 0.6)

    draw = ImageDraw.Draw(blend)
    for (x0, y0, x1, y1) in regions:
        draw.rectangle([x0, y0, x1, y1], outline=(0, 255, 0), width=2)
    blend.save(out_diff_path)

    result = {"skin": skin_id, "pixelMAE": round(mae, 3), "ssim": round(ssim_score, 4), "maskedRegions": regions, "diffImage": out_diff_path}
    print(json.dumps(result, indent=2))
    return result

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
