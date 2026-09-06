import sys
from PIL import Image, ImageDraw

path = sys.argv[1]
out = sys.argv[2]
im = Image.open(path).convert("RGB")
w, h = im.size
draw = ImageDraw.Draw(im)
step = 50
for x in range(0, w, step):
    draw.line([(x, 0), (x, h)], fill=(255, 0, 0), width=1)
    draw.text((x + 2, 2), str(x), fill=(255, 255, 0))
for y in range(0, h, step):
    draw.line([(0, y), (w, y)], fill=(0, 255, 0), width=1)
    draw.text((2, y + 2), str(y), fill=(255, 255, 0))
im.save(out)
print(w, h)
