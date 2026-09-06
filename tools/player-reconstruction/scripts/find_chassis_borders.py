import numpy as np
from PIL import Image

def find_chassis_borders():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    rgb = np.array(img.convert('RGB'))
    
    print("Vertical slice at x=300 (y=0..46):")
    for y in range(47):
        r, g, b = rgb[y, 300]
        print(f"y={y:2d}: RGB=[{r:3d}, {g:3d}, {b:3d}] - hex=#{r:02x}{g:02x}{b:02x}")

if __name__ == '__main__':
    find_chassis_borders()
