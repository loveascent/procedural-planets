import sys, json
from playwright.sync_api import sync_playwright
ARGS = ["--enable-unsafe-webgpu","--force_high_performance_gpu","--ignore-gpu-blocklist","--mute-audio"]
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True, args=ARGS)
    pg = b.new_page(viewport={"width":1280,"height":720})
    pg.on("console", lambda m: print("console:", m.type, m.text[:300]) if m.type in ("info","error") and "404" not in m.text else None)
    pg.goto("http://localhost:5174/?body=gas")
    for _ in range(240):
        if pg.evaluate("!!window.gasPlanet"): break
        pg.wait_for_timeout(250)
    pg.wait_for_timeout(3000)
    pg.evaluate("(o)=>{const g=window.gasPlanet; for(const k of Object.keys(o)){ g.settings[k]=o[k]; g.onChange(k);} }", json.loads(sys.argv[1]))
    pg.wait_for_timeout(int(sys.argv[2]))
    b.close()
