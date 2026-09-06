import numpy as np
from PIL import Image

def inspect_wave_colors():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    rgb = np.array(img.convert('RGB'))
    
    # We inspect column x=300 from y=160 to y=220
    print("Vertical slice at x=300 (y=160..220):")
    for y in range(160, 221):
        r, g, b = rgb[y, 300]
        print(f"y={y}: RGB=[{r:3d}, {g:3d}, {b:3d}] - hex=#{r:02x}{g:02x}{b:02x}")

if __name__ == '__main__':
    inspect_wave_colors()
