"""Nachtrand: vergroesserter Ausschnitt der dunklen Silhouette je Konfiguration (Treppenstufen?). Chrome RTX 5080, headless."""
import pathlib
from playwright.sync_api import sync_playwright
OUT = pathlib.Path(__file__).parent / "bilder"
ARGS = ["--enable-unsafe-webgpu", "--force_high_performance_gpu", "--ignore-gpu-blocklist", "--mute-audio"]
BASIS = {"sunAngle": 65, "pixelDensity": 2, "autoQuality": False}
KONF = [("aus", {}), ("verschachtelt", {"arghOn": True, "arghAbtast": "verschachtelt"}), ("fest", {"arghOn": True, "arghAbtast": "fest"}),
        ("hart", {"arghOn": True, "arghSoft": 0}), ("zufall", {"arghOn": True, "arghAbtast": "zufall"})]
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True, args=ARGS)
    for name, ui in KONF:
        pg = b.new_page(viewport={"width": 1280, "height": 720}, device_scale_factor=3)
        pg.goto("http://localhost:5174/?body=gas")
        for _ in range(240):
            if pg.evaluate("!!window.gasPlanet"): break
            pg.wait_for_timeout(250)
        pg.wait_for_timeout(2500)
        o = dict(BASIS); o.update(ui)
        pg.evaluate("(o)=>{const g=window.gasPlanet; for(const k of Object.keys(o)){ g.settings[k]=o[k]; g.onChange(k);} }", o)
        pg.wait_for_timeout(6000)
        pg.screenshot(path=str(OUT / f"nr_{name}.png"), clip={"x": 170, "y": 240, "width": 160, "height": 160})
        pg.close()
    b.close()
