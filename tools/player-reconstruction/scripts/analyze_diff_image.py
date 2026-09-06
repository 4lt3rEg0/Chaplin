import numpy as np
from PIL import Image

def analyze_diff():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    live_path = 'tools/player-reconstruction/screenshots/aqua-flow-live.png'
    
    ref = Image.open(ref_path).convert('RGB')
    live = Image.open(live_path).convert('RGB').resize(ref.size, Image.LANCZOS)
    
    ref_arr = np.array(ref).astype(float)
    live_arr = np.array(live).astype(float)
    
    diff = np.abs(ref_arr - live_arr)
    mean_diff = diff.mean(axis=2)
    
    # Let's find contiguous regions where mean_diff > 40
    # To keep it simple, we can divide the image into 20x20 blocks and find blocks with mean_diff > 45
    h, w = mean_diff.shape
    bh, bw = 20, 20
    rows = h // bh
    cols = w // bw
    
    print("Blocks with high average differences (> 40):")
    print("-" * 60)
    for r in range(rows):
        for c in range(cols):
            block = mean_diff[r*bh:(r+1)*bh, c*bw:(c+1)*bw]
            val = block.mean()
            if val > 40:
                # Let's get the center coordinates of this block
                bx = c*bw + bw//2
                by = r*bh + bh//2
                ref_color = ref_arr[by, bx].astype(int)
                live_color = live_arr[by, bx].astype(int)
                print(f"Block at x={bx:3d}, y={by:3d} (r={r}, c={c}): diff={val:5.1f} | Ref={ref_color.tolist()} Live={live_color.tolist()}")
    print("-" * 60)

if __name__ == '__main__':
    analyze_diff()
