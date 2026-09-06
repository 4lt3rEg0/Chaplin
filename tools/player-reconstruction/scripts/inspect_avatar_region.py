import numpy as np
from PIL import Image

def analyze_avatar_region():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    rgb = np.array(img.convert('RGB'))
    
    # We crop the left part of the display: x=14..150, y=38..158
    crop = rgb[38:158, 14:150]
    print("Crop shape:", crop.shape)
    
    # Let's find the average color of this region, and if there's any bounding box inside it
    # We can calculate gradients/transitions in both directions to see if there's a frame.
    row_means = crop.mean(axis=1)
    col_means = crop.mean(axis=0)
    
    # Print the standard deviation to see if it's mostly uniform (meaning no separate square) or highly structured
    print("Row standard deviation:", row_means.std())
    print("Col standard deviation:", col_means.std())
    
    # Let's sample a few points
    print("Color at left edge (x=30, y=80):", rgb[80, 30])
    print("Color at center (x=300, y=80):", rgb[80, 300])
    print("Color at right side of display (x=550, y=80):", rgb[80, 550])

if __name__ == '__main__':
    analyze_avatar_region()
