import numpy as np
from PIL import Image

def analyze_contour():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    alpha = np.array(img.split()[-1])
    
    print("Contour coordinates (row: left_x -> right_x):")
    # For every 15 rows, print where alpha > 50 starts and ends
    for y in range(0, img.height, 15):
        row_alpha = alpha[y, :]
        cols = np.where(row_alpha > 50)[0]
        if len(cols) > 0:
            print(f"Row {y:3d}: {cols[0]:3d} -> {cols[-1]:3d} (width: {cols[-1] - cols[0] + 1:3d})")
        else:
            print(f"Row {y:3d}: empty")

if __name__ == '__main__':
    analyze_contour()
