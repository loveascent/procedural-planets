import sys, json, pathlib
from playwright.sync_api import sync_playwright
OUT = pathlib.Path(__file__).parent / "bilder"
P = dict(rotZ=0,mixF=0.211,rampT=0.133,invert=0,R=100,hue=0.48,sat=1.16,val=0.53,dichte=0.30,aniso=0.22,atmD=0.03,sunS=10,sunAz=101,sunEl=8,expo=1.75,dist=360,fov=26,schritt=0.30,spp=1,skala=1,maxS=256,bloom=0,korn=0,vign=0,chroma=0,grade=0,sterne=1.5,format=0)
P.update(json.loads(sys.argv[2]) if len(sys.argv)>2 else {})
DATEI = sys.argv[3] if len(sys.argv)>3 else None
ARGS = ["--enable-unsafe-webgpu","--force_high_performance_gpu","--ignore-gpu-blocklist","--mute-audio"]
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True, args=ARGS)
    pg = b.new_page(viewport={"width":1280,"height":720})
    pg.on("pageerror", lambda e: print("pageerror:", str(e)[:300]))
    pg.goto("http://127.0.0.1:5210/")
    for _ in range(120):
        if pg.evaluate("!!window.__arg"): break
        pg.wait_for_timeout(250)
    pg.wait_for_timeout(1500)
    if DATEI: pg.set_input_files("#datei", DATEI); pg.wait_for_timeout(1500)
    pg.evaluate("(o)=>window.__arg.setze(o)", P)
    for _ in range(240):
        s = pg.evaluate("window.__arg.stand()")
        if s["fertig"]: break
        pg.wait_for_timeout(500)
    print(json.dumps(s))
    pg.screenshot(path=str(OUT / (sys.argv[1] + ".png")))
    b.close()
