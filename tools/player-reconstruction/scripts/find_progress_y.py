import numpy as np
from PIL import Image

def find_progress_y():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    rgb = np.array(img.convert('RGB'))
    
    # We inspect y=125 to 155, x=195 to 595
    print("Row Analysis in display bottom (y=125..155):")
    for y in range(125, 156):
        row_slice = rgb[y, 195:595]
        mean_color = row_slice.mean(axis=0)
        std_color = row_slice.std(axis=0).mean()
        # Let's print row stats
        print(f"y={y:3d}: Mean RGB=[{mean_color[0]:3.1f}, {mean_color[1]:3.1f}, {mean_color[2]:3.1f}] std={std_color:.2f}")

if __name__ == '__main__':
    find_progress_y()
