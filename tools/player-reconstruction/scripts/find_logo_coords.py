import numpy as np
from PIL import Image

def find_logo():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    rgb = np.array(img.convert('RGB'))
    
    # Search for golden-yellow pixels
    # R > 200, G > 150, B < 120
    y_indices, x_indices = np.where((rgb[5:38, 10:100, 0] > 200) & (rgb[5:38, 10:100, 1] > 150) & (rgb[5:38, 10:100, 2] < 120))
    if len(y_indices) > 0:
        y_logo = y_indices + 5
        x_logo = x_indices + 10
        print(f"Golden logo pixels found:")
        print(f"y range: {y_logo.min()}..{y_logo.max()}")
        print(f"x range: {x_logo.min()}..{x_logo.max()}")
        # Let's print unique (x, y) coordinates to see the shape
        print("Traced logo coordinates:")
        for idx in range(0, len(x_logo), max(1, len(x_logo)//20)):
            print(f"x={x_logo[idx]}, y={y_logo[idx]} -> RGB={rgb[y_logo[idx], x_logo[idx]].tolist()}")
    else:
        print("No golden logo pixels found.")

if __name__ == '__main__':
    find_logo()
