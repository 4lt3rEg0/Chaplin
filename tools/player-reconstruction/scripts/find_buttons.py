import numpy as np
from PIL import Image

def find_buttons():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    rgb = np.array(img.convert('RGB'))
    
    # Let's inspect row y=255 (accessory buttons row in current code) from x=20 to x=200
    print("Row y=255 slice (x=20..200):")
    row_y255 = rgb[255, :]
    for x in range(20, 201, 5):
        r, g, b = row_y255[x]
        print(f"x={x:3d}: RGB=[{r:3d}, {g:3d}, {b:3d}]")
        
    # Let's inspect row y=300 (transport buttons row in current code) from x=40 to x=260
    print("\nRow y=300 slice (x=40..260):")
    row_y300 = rgb[300, :]
    for x in range(40, 261, 5):
        r, g, b = row_y300[x]
        print(f"x={x:3d}: RGB=[{r:3d}, {g:3d}, {b:3d}]")

if __name__ == '__main__':
    find_buttons()
