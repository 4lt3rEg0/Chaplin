import numpy as np
from PIL import Image

def find_corners():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    alpha = np.array(img.split()[-1])
    rgb = np.array(img.convert('RGB'))
    
    # We want to find the corner shapes. Let's print the alpha values for a 15x15 grid in the top-left
    print("Top-Left Alpha Grid (y=0..15, x=0..15):")
    for y in range(16):
        row = [f"{alpha[y, x]:3d}" for x in range(16)]
        print(" ".join(row))
        
    print("\nTop-Left Color Grid (y=0..10, x=0..10, RGB):")
    for y in range(11):
        row = []
        for x in range(11):
            r, g, b = rgb[y, x]
            a = alpha[y, x]
            if a < 10:
                row.append("  .  ")
            else:
                row.append(f"{r:02x}{g:02x}{b:02x}")
        print(" ".join(row))

if __name__ == '__main__':
    find_corners()
