"""Bildrate je Konfiguration (rAF-Zaehler 5 s), Jupiter, Pixeldichte 2, Chrome RTX 5080 headless. Ausgabe: Tabelle."""
import sys, json
from playwright.sync_api import sync_playwright
FOTO = "/e/Claude/gasriese-volumen-demo/karten/jupiter_4k_solarsystemscope.jpg".replace("/e/", "E:/")
BASE = {"arghMix":0.211,"arghDensity":30,"arghAniso":0.22,"arghRelax":0.05,"sunAngle":65,"exposure":1.4,"pixelDensity":2,"autoQuality":False}
CONF = [
 ("aus (ohne Argh)",              {}, False),
 ("B hart  (Farbstoff, K=0)",     {"arghOn":True,"arghSource":"dye","arghSoft":0}, False),
 ("B weich (Farbstoff, K=8)",     {"arghOn":True,"arghSource":"dye","arghSoft":8}, False),
 ("A hart  (Foto, K=0)",          {"arghOn":True,"arghSource":"karte","arghSoft":0}, True),
 ("A weich (Foto, K=4)",          {"arghOn":True,"arghSource":"karte","arghSoft":4}, True),
 ("A weich (Foto, K=8)",          {"arghOn":True,"arghSource":"karte","arghSoft":8}, True),
 ("A weich (Foto, K=8, Schatten 8)", {"arghOn":True,"arghSource":"karte","arghSoft":8,"arghShadow":8}, True),
]
ARGS = ["--enable-unsafe-webgpu","--force_high_performance_gpu","--ignore-gpu-blocklist","--mute-audio","--disable-frame-rate-limit","--disable-gpu-vsync"]
JS = """()=>new Promise(r=>{let n=0,t0=performance.now();const f=()=>{n++; if(performance.now()-t0<5000) requestAnimationFrame(f); else r([n,(performance.now()-t0)]);};requestAnimationFrame(f);})"""
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True, args=ARGS)
    for name, ui, foto in CONF:
        pg = b.new_page(viewport={"width":1280,"height":720})
        pg.goto("http://localhost:5174/?body=gas")
        for _ in range(240):
            if pg.evaluate("!!window.gasPlanet"): break
            pg.wait_for_timeout(250)
        pg.wait_for_timeout(2500)
        if foto: pg.set_input_files("#ctl-arghFoto", FOTO); pg.wait_for_timeout(500)
        o = dict(BASE); o.update(ui)
        pg.evaluate("(o)=>{const g=window.gasPlanet; for(const k of Object.keys(o)){ g.settings[k]=o[k]; g.onChange(k);} }", o)
        pg.wait_for_timeout(9000)
        n, ms = pg.evaluate(JS)
        size = pg.evaluate("[document.getElementById('view').width, document.getElementById('view').height]")
        print(f"{name:36s} {n/(ms/1000):6.1f} fps  ({1000*ms/1000/n if n else 0:5.2f} ms)  Canvas {size[0]}x{size[1]}")
        pg.close()
    b.close()
