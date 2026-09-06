import numpy as np
from PIL import Image

def find_horizontal_bars():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    rgb = np.array(img.convert('RGB'))
    
    # We search for horizontal bars on the right side of the display (x from 195 to 595, y from 38 to 158)
    # A horizontal bar is a y-level where the colors are relatively uniform along x and different from row above and below.
    # Let's calculate standard deviation of colors along x for each y
    crop_display = rgb[38:158, 195:595]
    for idx, y in enumerate(range(38, 158)):
        row = crop_display[idx]
        std = row.std(axis=0).mean()
        mean_color = row.mean(axis=0)
        # If std is low, it means it's a solid line or bar
        if std < 15:
            print(f"y={y:3d}: Mean RGB=[{mean_color[0]:3.1f}, {mean_color[1]:3.1f}, {mean_color[2]:3.1f}] std={std:.2f}")

if __name__ == '__main__':
    find_horizontal_bars()
