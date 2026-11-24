"""Messung Planet-Seite mit Argh-Baustein. Aufruf: python mess2.py <name> '<json settings>' [foto] [warte_ms] [kamera_json]
Setzt Regler wie das Menue (settings + onChange), laedt optional ein Foto in den Baustein 'Argh-Karte'. Chrome auf RTX 5080."""
import sys, json, pathlib
from playwright.sync_api import sync_playwright
NAME = sys.argv[1]; UI = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
FOTO = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "-" else None
WAIT = int(sys.argv[4]) if len(sys.argv) > 4 else 6000
OUT = pathlib.Path(__file__).parent / "bilder"; OUT.mkdir(exist_ok=True)
ARGS = ["--enable-unsafe-webgpu", "--force_high_performance_gpu", "--ignore-gpu-blocklist", "--mute-audio"]
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True, args=ARGS)
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.on("console", lambda m: print("console:", m.type, m.text[:500]) if m.type in ("error", "warning") and "powerPreference" not in m.text and "404" not in m.text else None)
    pg.on("pageerror", lambda e: print("pageerror:", str(e)[:500]))
    pg.goto("http://localhost:5174/?body=gas")
    for _ in range(240):
        if pg.evaluate("!!window.gasPlanet"): break
        pg.wait_for_timeout(250)
    print("Adapter:", pg.evaluate("navigator.gpu.requestAdapter({powerPreference:'high-performance'}).then(a=>a.info.vendor+' '+a.info.architecture)"))
    pg.wait_for_timeout(3000)
    if FOTO:
        pg.set_input_files("#ctl-arghFoto", FOTO); pg.wait_for_timeout(500)
    pg.evaluate("(o)=>{const g=window.gasPlanet; for(const k of Object.keys(o)){ g.settings[k]=o[k]; g.onChange(k);} }", UI)
    pg.wait_for_timeout(WAIT)
    import os
    if os.environ.get('CLICK'):
        pg.click('text='+os.environ['CLICK']); pg.wait_for_timeout(int(os.environ.get('NACH','20000')))
    import os
    if os.environ.get('WHEEL'):
        pg.mouse.move(470,360)
        for _ in range(int(os.environ['WHEEL'])): pg.mouse.wheel(0,-120); pg.wait_for_timeout(60)
        pg.wait_for_timeout(1500)
    f0 = pg.evaluate("window.gasPlanet.frame()"); pg.wait_for_timeout(3000); f1 = pg.evaluate("window.gasPlanet.frame()")
    print("Sim-Schritte/s:", round((f1 - f0) / 3, 1), "| Anzeige:", pg.evaluate("document.getElementById('fps')?.textContent"))
    print("Planet:", pg.evaluate("window.gasPlanet.settings.preset+\" seed \"+window.gasPlanet.settings.seed"))
    pg.screenshot(path=str(OUT / f"{NAME}.png"))
    b.close()
