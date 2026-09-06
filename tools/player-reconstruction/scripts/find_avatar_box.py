import numpy as np
from PIL import Image

def find_avatar_box():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    rgb = np.array(img.convert('RGB'))
    
    # We want to find where the left light-blue region ends on y=80.
    # Let's print colors for x=110 to x=160
    row_y80 = rgb[80, :]
    print("Transition at y=80 (x=110..160):")
    for x in range(110, 161):
        r, g, b = row_y80[x]
        print(f"x={x:3d}: RGB=[{r:3d}, {g:3d}, {b:3d}]")

if __name__ == '__main__':
    find_avatar_box()
