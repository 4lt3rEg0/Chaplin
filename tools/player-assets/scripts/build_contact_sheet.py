"""Contact sheet: every extracted asset for a player on checkerboard, named."""
import sys
import os
from PIL import Image, ImageDraw


def checkerboard(size, cell=10):
    w, h = size
    board = Image.new("RGBA", size, (255, 255, 255, 255))
    px = board.load()
    for y in range(h):
        for x in range(w):
            if (x // cell + y // cell) % 2 == 0:
                px[x, y] = (222, 222, 222, 255)
    return board


def main(player_dir, out_path):
    files = []
    for root, _, names in os.walk(player_dir):
        for n in names:
            if n.lower().endswith(".png"):
                files.append(os.path.join(root, n))
    files.sort()

    cell_w, cell_h = 180, 160
    cols = 4
    rows = (len(files) + cols - 1) // cols
    sheet = checkerboard((cell_w * cols, cell_h * rows))
    draw = ImageDraw.Draw(sheet)

    for i, f in enumerate(files):
        im = Image.open(f).convert("RGBA")
        cx, cy = (i % cols) * cell_w, (i // cols) * cell_h
        scale = min((cell_w - 20) / im.width, (cell_h - 40) / im.height, 1.0)
        w, h = int(im.width * scale), int(im.height * scale)
        thumb = im.resize((w, h), Image.LANCZOS)
        px = cx + (cell_w - w) // 2
        py = cy + 10
        sheet.alpha_composite(thumb, (px, py))
        name = os.path.relpath(f, player_dir)
        draw.text((cx + 6, cy + cell_h - 26), name, fill=(0, 0, 0, 255))
        draw.rectangle([cx, cy, cx + cell_w - 1, cy + cell_h - 1], outline=(150, 150, 150, 255))

    sheet.convert("RGB").save(out_path)
    print(f"saved {out_path} ({len(files)} assets)")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
