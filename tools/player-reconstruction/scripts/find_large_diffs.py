import numpy as np
from PIL import Image

def find_diffs():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    live_path = 'tools/player-reconstruction/screenshots/aqua-flow-live.png'
    
    ref = Image.open(ref_path).convert('RGB')
    live = Image.open(live_path).convert('RGB').resize(ref.size, Image.LANCZOS)
    
    ref_arr = np.array(ref).astype(float)
    live_arr = np.array(live).astype(float)
    
    diff = np.abs(ref_arr - live_arr)
    mean_diff = diff.mean(axis=2)
    
    # Let's segment the image into an 8x8 grid and print the average difference in each cell
    h, w = mean_diff.shape
    gh, gw = h // 8, w // 8
    
    print("Average difference per grid cell (8x8 grid):")
    print("Each cell size roughly:", gw, "x", gh)
    print("-" * 50)
    for r in range(8):
        row_str = []
        for c in range(8):
            cell = mean_diff[r*gh:(r+1)*gh, c*gw:(c+1)*gw]
            row_str.append(f"{cell.mean():5.1f}")
        print(" | ".join(row_str))
    print("-" * 50)

if __name__ == '__main__':
    find_diffs()
