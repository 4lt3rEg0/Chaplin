import numpy as np
from PIL import Image

def find_avatar_height():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    rgb = np.array(img.convert('RGB'))
    
    # Let's inspect column x=100 from top to bottom (y=38 to y=158)
    col_x100 = rgb[38:158, 100]
    print("Vertical slice at x=100 (y=38..157):")
    for idx, y in enumerate(range(38, 158)):
        r, g, b = col_x100[idx]
        print(f"y={y:3d}: RGB=[{r:3d}, {g:3d}, {b:3d}]")

if __name__ == '__main__':
    find_avatar_height()
