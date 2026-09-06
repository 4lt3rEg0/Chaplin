import numpy as np
from PIL import Image

def find_edges():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    alpha = np.array(img.split()[-1])
    
    # Let's find first row with alpha > 10
    first_row = -1
    for y in range(img.height):
        if np.any(alpha[y, :] > 10):
            first_row = y
            break
            
    # Last row with alpha > 10
    last_row = -1
    for y in range(img.height - 1, -1, -1):
        if np.any(alpha[y, :] > 10):
            last_row = y
            break
            
    # First col with alpha > 10
    first_col = -1
    for x in range(img.width):
        if np.any(alpha[:, x] > 10):
            first_col = x
            break
            
    # Last col with alpha > 10
    last_col = -1
    for x in range(img.width - 1, -1, -1):
        if np.any(alpha[:, x] > 10):
            last_col = x
            break
            
    print(f"Edges where alpha > 10: Row {first_row}..{last_row}, Col {first_col}..{last_col}")
    
    # Let's see the alpha values along Row 15, Col 15..45
    print("\nAlpha values along row 15:")
    print(" ".join([str(alpha[15, x]) for x in range(15, 45)]))

if __name__ == '__main__':
    find_edges()
