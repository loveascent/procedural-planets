"""Erzeugt die Fotos fuer die README (docs/images/argh-*.png): Standardwerte, Chrome auf der RTX 5080, nie im Browser-Pane.
Voraussetzung: `npx vite --port 5174` im Repo. Aufruf: python bilder_readme.py"""
import pathlib
from playwright.sync_api import sync_playwright
OUT = pathlib.Path(__file__).resolve().parents[3] / "docs" / "images"
FOTO = "E:/Claude/gasriese-volumen-demo/karten/jupiter_4k_solarsystemscope.jpg"
ARGS = ["--enable-unsafe-webgpu", "--force_high_performance_gpu", "--ignore-gpu-blocklist", "--mute-audio"]
BASIS = {"arghOn": True, "arghSource": "karte", "sunAngle": 65, "exposure": 1.4, "pixelDensity": 2, "autoQuality": False}
# Name, Reglerwerte, Foto, Zoom-Schritte (Mausrad)
SZENEN = [
    ("argh-jupiter",        {"preset": "Jupiter"}, False, 0),
    ("argh-jupiter-nah",    {"preset": "Jupiter"}, False, 8),
    ("argh-jupiter-foto",   {"preset": "Jupiter"}, True, 8),
    ("argh-saturn",         {"preset": "Saturn"}, False, 0),
    ("argh-neptun",         {"preset": "Neptun"}, False, 0),
    ("argh-abtast-fest",         {"preset": "Jupiter", "arghAbtast": "fest"}, True, 8),
    ("argh-abtast-zufall",       {"preset": "Jupiter", "arghAbtast": "zufall"}, True, 8),
    ("argh-abtast-verschachtelt", {"preset": "Jupiter", "arghAbtast": "verschachtelt"}, True, 8),
]
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True, args=ARGS)
    for name, ui, foto, zoom in SZENEN:
        pg = b.new_page(viewport={"width": 1280, "height": 720})
        pg.goto("http://localhost:5174/?body=gas")
        for _ in range(240):
            if pg.evaluate("!!window.gasPlanet"): break
            pg.wait_for_timeout(250)
        pg.wait_for_timeout(2500)
        if foto: pg.set_input_files("#ctl-arghFoto", FOTO); pg.wait_for_timeout(500)
        o = dict(BASIS); o.update(ui)
        vorlage = o.pop("preset")   # ueber das Menue waehlen, damit Farben und Planet wirklich wechseln
        pg.locator("select", has=pg.locator("option", has_text="Neptun")).first.select_option(label=vorlage); pg.wait_for_timeout(2500)
        pg.evaluate("(o)=>{const g=window.gasPlanet; for(const k of Object.keys(o)){ g.settings[k]=o[k]; g.onChange(k);} }", o)
        pg.wait_for_timeout(9000)
        pg.mouse.move(470, 360)
        for _ in range(zoom): pg.mouse.wheel(0, -120); pg.wait_for_timeout(60)
        pg.wait_for_timeout(2500)
        pg.screenshot(path=str(OUT / f"{name}.png"), clip={"x": 0, "y": 0, "width": 940, "height": 720})
        print(name, pg.evaluate("window.gasPlanet.settings.preset"), pg.evaluate("document.getElementById('fps')?.textContent"))
        pg.close()
    b.close()
