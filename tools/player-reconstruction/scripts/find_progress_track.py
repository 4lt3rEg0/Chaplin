import numpy as np
from PIL import Image

def find_progress_track():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    rgb = np.array(img.convert('RGB'))
    
    # We want to find accent-colored pixels in the display region (y=38..158).
    # Accent color in defaultPalette is 'accent': '#5ad4f5' (RGB around [90, 212, 245]).
    # Let's search for pixels where G > 180 and B > 200 in the display region
    y_indices, x_indices = np.where((rgb[38:158, :, 1] > 180) & (rgb[38:158, :, 2] > 200))
    
    # Filter x-indices to be on the right side of the display (x > 192)
    right_indices = np.where(x_indices > 192)[0]
    if len(right_indices) > 0:
        y_right = y_indices[right_indices] + 38
        x_right = x_indices[right_indices]
        print(f"Accent pixels found on the right side:")
        print(f"y range: {y_right.min()}..{y_right.max()}")
        print(f"x range: {x_right.min()}..{x_right.max()}")
    else:
        print("No accent pixels found on the right side of the display.")

if __name__ == '__main__':
    find_progress_track()
