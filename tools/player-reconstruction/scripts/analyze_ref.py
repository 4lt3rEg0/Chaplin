from PIL import Image
import numpy as np
import json

def analyze():
    img_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(img_path)
    w, h = img.size
    alpha = np.array(img.split()[-1])
    rgb = np.array(img.convert('RGB'))

    results = {}
    results['dimensions'] = [w, h]

    # Non-transparent bounding box
    mask = alpha > 50
    non_zero = np.argwhere(mask)
    if len(non_zero) > 0:
        ymin, xmin = non_zero.min(axis=0)
        ymax, xmax = non_zero.max(axis=0)
        results['bbox'] = [int(xmin), int(ymin), int(xmax), int(ymax)]
    
    # Let's inspect some pixel regions to see the exact coordinates of UI elements.
    # We can search for the "Display Panel": typically a dark-blue rectangle in the upper half.
    # Display panel in Aqua Flow is a prominent dark-blue horizontal bar.
    # Let's find columns and rows where we have dark blue pixels.
    # Let's say dark-blue is R < 40, G < 90, B > 50 (to detect navy/blue).
    db_mask = (rgb[..., 0] < 50) & (rgb[..., 1] < 100) & (rgb[..., 2] > 60) & (rgb[..., 2] < 150) & (alpha > 200)
    db_pixels = np.argwhere(db_mask)
    if len(db_pixels) > 0:
        db_ymin, db_xmin = db_pixels.min(axis=0)
        db_ymax, db_xmax = db_pixels.max(axis=0)
        results['display_navy_bbox'] = [int(db_xmin), int(db_ymin), int(db_xmax), int(db_ymax)]

    # Let's sample colors from a few specific coordinates to see what the actual palette values are:
    # 1. Bezel/Title bar (top center): say x=300, y=20
    results['color_bezel'] = rgb[20, 300].tolist()
    # 2. Main display background (center of display): say x=300, y=80
    results['color_display'] = rgb[80, 300].tolist()
    # 3. Wave color (center of wave): say x=300, y=190
    results['color_wave'] = rgb[190, 300].tolist()
    # 4. Water background (bottom center): say x=300, y=340
    results['color_water'] = rgb[340, 300].tolist()
    # 5. Buttons (e.g. transport play button in bottom left): say x=150, y=300
    results['color_button'] = rgb[300, 150].tolist()
    # 6. Shell/Gel color (top left corner inner): say x=50, y=50
    results['color_shell'] = rgb[50, 50].tolist()

    # Let's detect where the avatar region / album art is.
    # In the first attempt, the album art was placed at x=20, y=46, w=118, h=104.
    # Let's inspect the reference image around there. Is there a vertical/horizontal boundary or an empty square?
    # In Winamp/Aqua Flow, is there a prominent square on the left side of the display?
    # Let's analyze a crop of x from 14 to 150, y from 38 to 158.
    
    with open('tools/player-reconstruction/reports/analysis.json', 'w') as f:
        json.dump(results, f, indent=2)

if __name__ == '__main__':
    analyze()
