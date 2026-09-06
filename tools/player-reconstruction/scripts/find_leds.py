import numpy as np
from PIL import Image

def find_leds():
    ref_path = 'tools/player-reconstruction/references/aqua-flow/reference.png'
    img = Image.open(ref_path)
    rgb = np.array(img.convert('RGB'))
    
    # We inspect x=500..560, y=55..75
    # Let's search for pixels with distinctive LED colors.
    for y in range(55, 76):
        for x in range(500, 561):
            r, g, b = map(int, rgb[y, x])
            # If color is close to ledPurple (60, 66, 106) or ledGreen (41, 137, 101)
            is_purple = (abs(r - 60) < 20 and abs(g - 66) < 20 and abs(b - 106) < 20)
            is_green = (abs(r - 41) < 20 and abs(g - 137) < 20 and abs(b - 101) < 20)
            if is_purple or is_green:
                name = "purple" if is_purple else "green"
                print(f"LED pixel found ({name}) at x={x}, y={y}: RGB=[{r}, {g}, {b}]")

if __name__ == '__main__':
    find_leds()
