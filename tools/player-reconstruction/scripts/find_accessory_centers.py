import numpy as np
from PIL import Image

def find_accessory_centers():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    rgb = np.array(img.convert('RGB'))
    
    # Let's inspect rows y=230 to y=270, x=30 to x=220
    # Let's look for circular boundaries or bright highlights that look like small round buttons.
    # We can print the exact average of colors in local 10x10 blocks to find the high contrast regions.
    print("Slicing y=250..260, x=30..190:")
    for y in range(248, 262, 2):
        row_str = []
        for x in range(30, 191, 10):
            r, g, b = rgb[y, x]
            row_str.append(f"x={x}:{r:02x}{g:02x}{b:02x}")
        print(f"y={y}: " + " | ".join(row_str))

if __name__ == '__main__':
    find_accessory_centers()
