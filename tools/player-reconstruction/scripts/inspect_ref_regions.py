import numpy as np
from PIL import Image

def analyze_layout():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    alpha = np.array(img.split()[-1])
    rgb = np.array(img.convert('RGB'))
    
    # 1. Look for horizontal structures.
    # We can average RGB color along rows to find transition boundaries.
    row_means = rgb.mean(axis=1) # average of rows (y)
    row_alphas = alpha.mean(axis=1)
    
    print("Row Analysis (Top to Bottom):")
    # Let's print rows with high transitions or check for boundaries.
    transitions = np.diff(row_means, axis=0).mean(axis=1)
    for y in range(1, len(transitions)):
        if abs(transitions[y-1]) > 5:
            print(f"Row {y}: val={row_means[y].astype(int)}, alpha={row_alphas[y]:.1f}")
            
    # Let's find specific horizontal lines.
    # Title bar / bezel?
    # Display panel top and bottom boundaries.
    # Wave body region.
    # Bottom button area.
    
if __name__ == '__main__':
    analyze_layout()
