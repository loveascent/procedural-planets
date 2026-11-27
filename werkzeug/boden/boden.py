"""Bodennähe prüfen – nur Chrome auf der RTX 5080 (Abbruch, wenn der Adapter nicht NVIDIA ist).
Aufruf: python werkzeug/boden/boden.py <Basis-URL> <Ausgabeordner> [seed]
Fährt eine Zoomfolge vom Orbit bis auf Augenhöhe, misst fps (Zähler der Seite, Median aus mehreren Ablesungen), Kachelzahl und
weggeschnittene Kacheln (Frustum), Abstand über dem Boden, und speichert je Stufe ein Bild. Dazu Vergleiche Frustum an/aus.
Braucht Python mit Playwright."""
import sys, json, re, statistics, pathlib
from playwright.sync_api import sync_playwright

BASE = sys.argv[1].rstrip('/')
OUT = pathlib.Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
SEED = sys.argv[3] if len(sys.argv) > 3 else '12345678'
ARGS = ["--enable-unsafe-webgpu", "--force_high_performance_gpu", "--ignore-gpu-blocklist", "--mute-audio",
        "--disable-gpu-vsync", "--disable-frame-rate-limit"]   # ohne Takt-Bremse, sonst zeigt der Zähler höchstens die Bildwiederholrate

def fps(pg, n=6):
    werte = []
    for _ in range(n):
        pg.wait_for_timeout(550)
        m = re.match(r"(\d+) fps · ([\d.]+) ms", pg.inner_text('#fps'))
        if m: werte.append(float(m.group(2)))
    return statistics.median(werte) if werte else None

with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True, args=ARGS)
    import os
    vw, vh = (int(x) for x in os.environ.get("ANSICHT", "1280x720").split("x"))
    pg = b.new_page(viewport={"width": vw, "height": vh})
    # Der Zähler misst rAF-Abstände; ohne Gegendruck schickt die Seite Bilder schneller ab, als die Karte sie schafft (Warteschlange ~1 s tief) und zeigt
    # dann Unsinn (gedeckelt ~11,6 ms oder viel zu schnell). Darum höchstens 3 Abgaben gleichzeitig offen: das nächste Bild erst, wenn die Karte eins fertig hat.
    pg.add_init_script("""(() => { const q = GPUQueue.prototype, s = q.submit; let offen = 0; const raf = window.requestAnimationFrame.bind(window);
      q.submit = function (c) { offen++; const r = s.call(this, c); this.onSubmittedWorkDone().then(() => { offen--; }); return r; };
      window.requestAnimationFrame = cb => offen >= 3 ? setTimeout(() => window.requestAnimationFrame(cb), 0) : raf(cb); })()""")
    fehler = []
    pg.on("console", lambda m: fehler.append(m.text[:400]) if m.type == "error" else None)
    pg.on("pageerror", lambda e: fehler.append(str(e)[:400]))
    pg.goto(f"{BASE}/index.html?body=rocky&seed={SEED}&quality={os.environ.get('QUAL', '1')}")
    ad = pg.evaluate("navigator.gpu.requestAdapter({powerPreference:'high-performance'}).then(a=>a.info.vendor+' '+a.info.architecture)")
    print("Adapter:", ad)
    if 'nvidia' not in ad.lower(): print("ABBRUCH: kein NVIDIA-Adapter"); b.close(); sys.exit(3)
    for _ in range(240):
        if pg.evaluate("!!window.planets"): break
        pg.wait_for_timeout(250)
    pg.evaluate("window.planets.finish()")
    pg.evaluate("window.planets.S.rotate = false")
    zusatz = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {}
    for k, v in zusatz.items():
        if not k.startswith('_'): pg.evaluate(f"window.planets.set({json.dumps(k)}, {json.dumps(v)})")
    pg.evaluate("window.planets.finish()")
    yaw, pitch = zusatz.get('_yaw', 0.25), zusatz.get('_pitch', 0.12)
    if zusatz.get('_suche'):
        # Land mit Gras suchen: Raster aus Drehung/Neigung in 12 km Höhe, Bodenhöhe aus csBoden; Gras braucht Höhe über dem Strand
        beste = None
        # nur Tagseite: Sonne bei Azimut −58° (Standard sunAz) → Kamera-Drehung um −1,0 rad
        for i in range(31):
            for j in range(-5, 6):
                y, pt = -2.2 + i * 0.08, j * 0.12
                for _ in range(2):
                    pg.evaluate(f"window.planets.shot({{ yaw: {y}, pitch: {pt}, dist: 1.002, time: 4 }})"); pg.wait_for_timeout(40)
                h = pg.evaluate("window.planets.info.bodenH")
                if 0.018 * 0.02 < h < 0.018 * 0.06 and (beste is None or abs(y + 1.0) + abs(pt) < abs(beste[0] + 1.0) + abs(beste[1])): beste = (y, pt, h)
        if zusatz.get('_gruen'):
            # unter den Landstellen die grünste (Bild von oben aus 12 km, Mittel G / (R + B))
            kand = []
            for i in range(0, 31, 2):
                for j in range(-5, 6):
                    y, pt = -2.2 + i * 0.08, j * 0.12
                    for _ in range(2):
                        pg.evaluate(f"window.planets.shot({{ yaw: {y}, pitch: {pt}, dist: 1.002, time: 4 }})"); pg.wait_for_timeout(40)
                    h = pg.evaluate("window.planets.info.bodenH")
                    if 0.018 * 0.014 < h < 0.018 * 0.05:
                        g = pg.evaluate(f"""(async () => {{ const u = window.planets.shot({{ yaw: {y}, pitch: {pt}, dist: 1.002, time: 4 }});
                          const im = new Image(); im.src = u; await im.decode(); const c = document.createElement('canvas'); c.width = c.height = 16;
                          const x = c.getContext('2d'); x.drawImage(im, 0, 0, 16, 16); const d = x.getImageData(0, 0, 16, 16).data;
                          let r = 0, gg = 0, b = 0; for (let k = 0; k < d.length; k += 4) {{ r += d[k]; gg += d[k + 1]; b += d[k + 2]; }} return gg / (r + b + 1); }})()""")
                        kand.append((g, y, pt, h))
            kand.sort(reverse=True)
            print("grünste Stellen:", kand[:3])
            if kand: beste = (kand[0][1], kand[0][2], kand[0][3])
        print("Land gefunden:", beste)
        if beste: yaw, pitch = beste[0], beste[1]
    stufen = [('orbit', 3.4), ('nah-1.3', 1.3), ('nah-1.05', 1.05), ('nah-1.01', 1.01), ('1000km', 1 + 1000 / 6371), ('100km', 1 + 100 / 6371),
              ('10km', 1 + 10 / 6371), ('1km', 1 + 1 / 6371), ('100m', 1 + 0.1 / 6371), ('boden', 1.0)]
    if os.environ.get('STUFEN'): stufen = [x for x in stufen if x[0] in os.environ['STUFEN'].split(',')]
    ergebnis = []
    # Stillstand-Erkennung der Schleife überlisten: ein unwirksamer Wert (Drehung ist aus) ändert die Signatur → jedes Bild wird wirklich gezeichnet
    pg.evaluate("(() => { let n = 0; const f = () => { window.planets.S.spin = 1 + (n++ % 2) * 1e-3; requestAnimationFrame(f); }; f(); })()")
    for name, dist in stufen:
        for fr in (True, False):
            pg.evaluate(f"window.planets.S.frustum = {str(fr).lower()}")
            # dist über dem Boden: Bodenhöhe kommt aus csBoden (ein Bild später) → zweimal setzen
            for _ in range(3):
                pg.evaluate(f"(() => {{ const P = window.planets; const h = P.info && P.info.bodenGueltig ? P.info.bodenH : 0; P.shot({{ yaw: {yaw}, pitch: {pitch}, dist: {dist} + h, time: 4, blickPitch: {zusatz.get('_blick', 0)} }}); }})()")
                pg.wait_for_timeout(250)
            ms = fps(pg)
            info = pg.evaluate("window.planets.info") or dict(dist=0, bodenH=0, kacheln=None, kachelnWeg=None, gras=None)   # Referenzstand hat kein info
            r = dict(stufe=name, frustum=fr, ms=ms, fps=round(1000 / ms) if ms else None, ueberBoden_m=round((info['dist'] - 1 - info['bodenH']) * 6371000, 2), **{k: info[k] for k in ('kacheln', 'kachelnWeg', 'gras')})
            ergebnis.append(r); print(json.dumps(r, ensure_ascii=False))
            if fr: pg.screenshot(path=str(OUT / f"{name}.png"))
    (OUT / 'messung.json').write_text(json.dumps(ergebnis, indent=1, ensure_ascii=False), encoding='utf-8')
    if fehler: print("FEHLER:", *fehler[:8], sep="\n  ")
    b.close()
