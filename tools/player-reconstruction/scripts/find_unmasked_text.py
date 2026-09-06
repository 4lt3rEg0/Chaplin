import numpy as np
from PIL import Image

def find_unmasked():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    rgb = np.array(img.convert('RGB'))
    
    # We inspect x=20..148, y=46..150
    # Let's find columns where there is high contrast / standard deviation.
    crop = rgb[46:150, 20:148]
    print("Crop std:", crop.std(axis=0).mean(axis=1))
    
    # Let's see if there are very bright or very dark pixels
    bright_pixels = np.where((crop[..., 0] > 180) & (crop[..., 1] > 180) & (crop[..., 2] > 180))
    print(f"Number of bright white pixels in this region: {len(bright_pixels[0])}")

if __name__ == '__main__':
    find_unmasked()
