import json
import os
import shutil

ROOT = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\frontend\web\public\assets\profile-players"
RAW = os.path.join(ROOT, "generated", "_raw")
GEN = os.path.join(ROOT, "generated")
MANIFEST_DIR = r"C:\Users\MaxJokerExtrem\Desktop\Chaplin\frontend\web\src\components\ProfilePlayer\pngPlayers\manifests"
os.makedirs(MANIFEST_DIR, exist_ok=True)

with open(os.path.join(RAW, "inventory.json"), encoding="utf-8") as f:
    inv = json.load(f)

for p in inv["players"]:
    pid = p["id"]
    sheet = p["sheet"]
    cell = p["cell"]
    src = os.path.join(RAW, sheet, f"{cell}.png")
    dst_dir = os.path.join(GEN, pid)
    os.makedirs(dst_dir, exist_ok=True)
    shutil.copyfile(src, os.path.join(dst_dir, "raw.png"))
    manifest_path = os.path.join(MANIFEST_DIR, f"{pid}.json")
    if not os.path.exists(manifest_path):
        manifest = {
            "id": pid,
            "label": p["label"],
            "sourceSheet": sheet,
            "sourceCell": cell,
            "status": "raw-extracted",
            "asset": f"/assets/profile-players/generated/{pid}/base.png",
            "aspectRatio": None,
            "controls": {},
            "displayRegions": [],
            "ledRegions": [],
            "colorRegions": [],
            "capabilities": {
                "hasFavorite": False,
                "hasVolume": False,
                "hasProfileListen": False,
                "hasVisualizer": False
            }
        }
        with open(manifest_path, "w", encoding="utf-8") as mf:
            json.dump(manifest, mf, indent=2, ensure_ascii=False)

print("registry built:", len(inv["players"]), "players ->", GEN)
