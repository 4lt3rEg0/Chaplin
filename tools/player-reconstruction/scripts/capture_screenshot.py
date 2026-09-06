"""
Captures a pixel-exact screenshot of a Player Lab stage element at its
canonical reference size, using Playwright headless Chromium (the app must
already be running, e.g. via `preview_start` -> http://localhost:8000).
"""
import sys
from playwright.sync_api import sync_playwright

def capture(skin_id, out_path, base_url="http://localhost:8000"):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1000, "height": 900})
        page.goto(f"{base_url}/dev/player-lab/{skin_id}", wait_until="networkidle")
        page.wait_for_selector("[data-player-lab-stage]")
        # ensure LIVE mode
        page.get_by_role("button", name="LIVE", exact=True).click()
        page.wait_for_timeout(300)
        stage = page.locator("[data-player-lab-stage]")
        stage.screenshot(path=out_path)
        browser.close()
    print("saved", out_path)

if __name__ == "__main__":
    skin_id = sys.argv[1]
    out_path = sys.argv[2]
    capture(skin_id, out_path)
