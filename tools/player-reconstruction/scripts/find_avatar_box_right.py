import numpy as np
from PIL import Image

def find_avatar_box_right():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    rgb = np.array(img.convert('RGB'))
    
    # Let's inspect row y=80 from x=160 to x=240
    row_y80 = rgb[80, :]
    print("Transition at y=80 (x=160..240):")
    for x in range(160, 241):
        r, g, b = row_y80[x]
        print(f"x={x:3d}: RGB=[{r:3d}, {g:3d}, {b:3d}]")

if __name__ == '__main__':
    find_avatar_box_right()
