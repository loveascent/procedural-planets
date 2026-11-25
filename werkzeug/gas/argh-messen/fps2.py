"""Bildrate je Konfiguration (rAF-Zaehler 5 s), Jupiter, Pixeldichte 2, Chrome RTX 5080 headless. Ausgabe: Tabelle."""
import sys, json
from playwright.sync_api import sync_playwright
FOTO = "/e/Claude/gasriese-volumen-demo/karten/jupiter_4k_solarsystemscope.jpg".replace("/e/", "E:/")
BASE = {"arghMix":0.211,"arghDensity":30,"arghAniso":0.22,"arghRelax":0.05,"sunAngle":65,"exposure":1.4,"pixelDensity":2,"autoQuality":False}
CONF = [
 ("aus (ohne Argh)",                         {}, False, 0),
 ("Standard K=10 Schatten 8 (voller Planet)", {"arghOn":True}, False, 0),
 ("Standard K=10 Schatten 8 (Nahbild)",      {"arghOn":True}, False, 4),
 ("hart K=0 (voller Planet)",                {"arghOn":True,"arghSoft":0}, False, 0),
 ("K=3 Schatten 4 (voller Planet)",          {"arghOn":True,"arghSoft":3,"arghShadow":4}, False, 0),
 ("K=3 Schatten 4 (Nahbild)",                {"arghOn":True,"arghSoft":3,"arghShadow":4}, False, 4),
 ("K=12 Schatten 16 (voller Planet)",        {"arghOn":True,"arghSoft":12,"arghShadow":16}, False, 0),
]
ARGS = ["--enable-unsafe-webgpu","--force_high_performance_gpu","--ignore-gpu-blocklist","--mute-audio","--disable-frame-rate-limit","--disable-gpu-vsync"]
JS = """()=>new Promise(r=>{let n=0,t0=performance.now();const f=()=>{n++; if(performance.now()-t0<5000) requestAnimationFrame(f); else r([n,(performance.now()-t0)]);};requestAnimationFrame(f);})"""
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True, args=ARGS)
    for name, ui, foto, wheel in CONF:
        pg = b.new_page(viewport={"width":1280,"height":720})
        pg.goto("http://localhost:5174/?body=gas")
        for _ in range(240):
            if pg.evaluate("!!window.gasPlanet"): break
            pg.wait_for_timeout(250)
        pg.wait_for_timeout(2500)
        if foto: pg.set_input_files("#ctl-arghFoto", FOTO); pg.wait_for_timeout(500)
        o = dict(BASE); o.update(ui)
        pg.evaluate("(o)=>{const g=window.gasPlanet; for(const k of Object.keys(o)){ g.settings[k]=o[k]; g.onChange(k);} }", o)
        pg.wait_for_timeout(5000)
        if wheel:
            pg.mouse.move(470,360)
            for _ in range(wheel): pg.mouse.wheel(0,-120); pg.wait_for_timeout(60)
        pg.wait_for_timeout(3000)
        n, ms = pg.evaluate(JS)
        size = pg.evaluate("[document.getElementById('view').width, document.getElementById('view').height]")
        print(f"{name:36s} {n/(ms/1000):6.1f} fps  ({1000*ms/1000/n if n else 0:5.2f} ms)  Canvas {size[0]}x{size[1]}")
        pg.close()
    b.close()
