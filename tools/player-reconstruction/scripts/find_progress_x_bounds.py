import numpy as np
from PIL import Image

def find_progress_x_bounds():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    rgb = np.array(img.convert('RGB'))
    
    # We inspect y=140 from x=140 to x=610
    row_y140 = rgb[140, :]
    print("Row y=140 values around bounds:")
    for x in range(140, 611, 5):
        r, g, b = row_y140[x]
        print(f"x={x:3d}: RGB=[{r:3d}, {g:3d}, {b:3d}]")

if __name__ == '__main__':
    find_progress_x_bounds()
