"""Generates a static 50/50 overlay blend of reference over live, for direct
silhouette/position comparison (separate from the red heatmap diff)."""
import sys
from PIL import Image

def main(reference_path, live_path, out_path, opacity=0.5):
    ref = Image.open(reference_path).convert("RGBA")
    live = Image.open(live_path).convert("RGBA")
    if live.size != ref.size:
        live = live.resize(ref.size, Image.LANCZOS)
    ref_faded = ref.copy()
    alpha = ref_faded.split()[3].point(lambda a: int(a * opacity))
    ref_faded.putalpha(alpha)
    out = live.copy()
    out.alpha_composite(ref_faded)
    out.convert("RGB").save(out_path)
    print("saved", out_path)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]) if len(sys.argv) > 4 else 0.5)
