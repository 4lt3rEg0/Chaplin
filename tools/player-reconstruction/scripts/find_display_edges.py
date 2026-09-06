import numpy as np
from PIL import Image

def find_display_edges():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    rgb = np.array(img.convert('RGB'))
    
    # Let's inspect row y=80.
    # The display is navy blue, and we know color_display is around [40, 79, 112].
    # Let's print the RGB values of a horizontal slice at y=80, from x=10 to x=622
    row_y80 = rgb[80, :]
    
    # We want to find where it transitions from the outer gel/shell to the dark display panel background
    # Let's print transitions (difference in colors) or just print the actual values near the left edge (x=10..40)
    print("Left display transition (x=10..40, y=80):")
    for x in range(10, 41):
        r, g, b = row_y80[x]
        print(f"x={x:2d}: RGB=[{r:3d}, {g:3d}, {b:3d}]")
        
    print("\nRight display transition (x=590..622, y=80):")
    for x in range(590, 623):
        r, g, b = row_y80[x]
        print(f"x={x:2d}: RGB=[{r:3d}, {g:3d}, {b:3d}]")

if __name__ == '__main__':
    find_display_edges()
