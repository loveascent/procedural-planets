"""Spielball in Bodennähe prüfen – nur Chrome auf der RTX 5080 (Abbruch, wenn der Adapter nicht NVIDIA ist). Kopie-Muster von boden.py.
Aufruf: python werkzeug/boden/spieler.py <Basis-URL> <Ausgabeordner> [seed]
Grasland auf Augenhöhe, S.spieler an, Tasten per page.keyboard (W 1,5 s, Leertaste, A), Bilder: Ball im Gras, im Sprung, Ball im Meer.
Misst ms je Bild (Zähler der Seite) und zählt Konsolenfehler. Braucht Python mit Playwright."""
import sys, json, re, statistics, pathlib, os
from playwright.sync_api import sync_playwright

BASE = sys.argv[1].rstrip('/')
OUT = pathlib.Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
SEED = sys.argv[3] if len(sys.argv) > 3 else '12345678'
ARGS = ["--enable-unsafe-webgpu", "--force_high_performance_gpu", "--ignore-gpu-blocklist", "--mute-audio",
        "--disable-gpu-vsync", "--disable-frame-rate-limit"]

def ms(pg, n=6):
    werte = []
    for _ in range(n):
        pg.wait_for_timeout(550)
        m = re.match(r"(\d+) fps · ([\d.]+) ms", pg.inner_text('#fps'))
        if m: werte.append(float(m.group(2)))
    return statistics.median(werte) if werte else None

def info(pg): return pg.evaluate("window.planets.info")

with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True, args=ARGS)
    vw, vh = (int(x) for x in os.environ.get("ANSICHT", "1280x720").split("x"))
    pg = b.new_page(viewport={"width": vw, "height": vh})
    pg.add_init_script("""(() => { const q = GPUQueue.prototype, s = q.submit; let offen = 0; const raf = window.requestAnimationFrame.bind(window);
      q.submit = function (c) { offen++; const r = s.call(this, c); this.onSubmittedWorkDone().then(() => { offen--; }); return r; };
      window.requestAnimationFrame = cb => offen >= 3 ? setTimeout(() => window.requestAnimationFrame(cb), 0) : raf(cb); })()""")
    fehler = []
    pg.on("console", lambda m: fehler.append(m.text[:400]) if m.type == "error" else None)
    pg.on("pageerror", lambda e: fehler.append(str(e)[:400]))
    pg.on("response", lambda r: print("  HTTP", r.status, r.url) if r.status >= 400 else None)
    pg.goto(f"{BASE}/index.html?body=rocky&seed={SEED}&quality={os.environ.get('QUAL', '1')}")
    ad = pg.evaluate("navigator.gpu.requestAdapter({powerPreference:'high-performance'}).then(a=>a.info.vendor+' '+a.info.architecture)")
    print("Adapter:", ad)
    if 'nvidia' not in ad.lower(): print("ABBRUCH: kein NVIDIA-Adapter"); b.close(); sys.exit(3)
    for _ in range(240):
        if pg.evaluate("!!window.planets"): break
        pg.wait_for_timeout(250)
    pg.evaluate("window.planets.finish()")
    pg.evaluate("window.planets.S.rotate = false")
    pg.evaluate("window.planets.finish()")
    # wie boden.py: ein unwirksamer Wert (Drehung ist aus) ändert die Signatur → jedes Bild wird wirklich gezeichnet (sonst höchstens ~30 Hz, Wind-Takt)
    pg.evaluate("(() => { let n = 0; const f = () => { window.planets.S.spin = 1 + (n++ % 2) * 1e-3; requestAnimationFrame(f); }; f(); })()")

    def stellen(yaw, pitch):
        """Kamera auf Augenhöhe über das Gelände an (yaw, pitch); Bodenhöhe aus csBoden braucht zwei Bilder"""
        for _ in range(4):
            pg.evaluate(f"(() => {{ const P = window.planets; const h = P.info && P.info.bodenGueltig ? P.info.bodenH : 0; P.shot({{ yaw: {yaw}, pitch: {pitch}, dist: 1 + 1.7/6371000 + h, time: 4, blickPitch: -0.1 }}); }})()")
            pg.wait_for_timeout(250)

    def tasten(taste, sek):
        pg.keyboard.down(taste); pg.wait_for_timeout(int(sek * 1000)); pg.keyboard.up(taste)

    erg = {}
    # 1. Gras
    stellen(-0.76, -0.12)
    erg['boden_unter_kamera_m'] = round(info(pg)['bodenH'] * 6371000, 2)
    pg.evaluate("window.planets.set('spieler', false)")   # sicher aus
    erg['ms_ohne_ball_gleiche_schleife'] = ms(pg); erg['kacheln_ohne_ball'] = info(pg)['kacheln']
    pg.keyboard.press('b')   # Taste B schaltet ein
    pg.wait_for_timeout(1500)
    i0 = info(pg); print("nach B:", json.dumps(i0['spieler']), "ballH_m", round(i0['ballH'] * 6371000, 2), "Wasser", i0['ballWasser'], "gueltig", i0['ballGueltig'])
    erg['spieler_an_per_B'] = pg.evaluate("window.planets.S.spieler")
    pg.screenshot(path=str(OUT / "1-ball-start.png"))
    tasten('w', 1.5)
    pg.wait_for_timeout(300)
    i1 = info(pg)
    erg['strecke_nach_W_m'] = round(i1['spieler']['strecke'], 2)
    erg['rollwinkel_rad'] = round(i1['spieler']['roll'], 2)
    erg['erwartet_strecke_m'] = 9.0
    pg.screenshot(path=str(OUT / "2-ball-im-gras.png"))
    tasten('a', 0.6)
    pg.wait_for_timeout(200)
    pg.screenshot(path=str(OUT / "3-ball-seitwaerts.png"))
    # Sprung: Leertaste, nach 280 ms ist der Ball oben (5 m/s: Scheitel bei 0,51 s, Höhe 1,27 m)
    pg.keyboard.down('Space'); pg.wait_for_timeout(120); pg.keyboard.up('Space')
    hs = []
    for _ in range(14):
        pg.wait_for_timeout(60); hs.append(round(info(pg)['spieler']['h'], 2))
        if len(hs) == 5: pg.screenshot(path=str(OUT / "4-ball-im-sprung.png"))
    erg['sprung_hoehen_m'] = hs
    pg.wait_for_timeout(1200)
    erg['nach_landung_h'] = round(info(pg)['spieler']['h'], 3)
    # Nahaufnahme: Rad = Abstand 2 m
    pg.mouse.move(vw // 2, vh // 2)
    for _ in range(6): pg.mouse.wheel(0, -400)
    pg.wait_for_timeout(500)
    pg.screenshot(path=str(OUT / "5-ball-nah.png"))
    erg['ms_gras_ball'] = ms(pg); erg['kacheln_ball'] = info(pg)['kacheln']
    # von oben: Maus nach unten ziehen hebt die Kamera (elev), so sieht man den Kreis, in dem das Gras vom Ball weg gebogen ist
    pg.mouse.move(vw // 3, 100); pg.mouse.down(); pg.mouse.move(vw // 3, 600, steps=10); pg.mouse.up()
    pg.wait_for_timeout(500)
    pg.screenshot(path=str(OUT / "5b-ball-von-oben.png"))
    pg.mouse.move(vw // 3, 600); pg.mouse.down(); pg.mouse.move(vw // 3, 100, steps=10); pg.mouse.up()
    pg.mouse.wheel(0, 760)   # Abstand zurück auf ~5 m
    # 2. Meer
    pg.keyboard.press('b'); pg.wait_for_timeout(300)   # aus
    erg['spieler_aus_per_B'] = not pg.evaluate("window.planets.S.spieler")
    gefunden = None
    for yaw, pitch in [(-0.92, -0.3), (-1.2, -0.2), (-1.0, 0.2), (-0.6, -0.5), (-1.5, 0.0), (-0.9, 0.35), (-1.3, -0.4), (-0.4, 0.2), (-1.7, 0.1), (-0.8, 0.6), (-1.1, -0.7)]:
        stellen(yaw, pitch)
        pg.keyboard.press('b'); pg.wait_for_timeout(1200)
        i = info(pg)
        print("Meersuche", yaw, pitch, "ballWasser", i['ballWasser'], "gueltig", i['ballGueltig'])
        if i['ballGueltig'] and i['ballWasser']: gefunden = (yaw, pitch); break
        pg.keyboard.press('b'); pg.wait_for_timeout(300)
    erg['meer_gefunden'] = gefunden
    if gefunden:
        pg.wait_for_timeout(800)
        pg.screenshot(path=str(OUT / "6-ball-im-meer.png"))
        hw = []
        for _ in range(8): pg.wait_for_timeout(250); hw.append(round(info(pg)['spieler']['h'], 3))
        erg['wasser_h_m'] = hw   # Soll: um −0,5 m ± 0,1
        pg.keyboard.down('Space'); pg.wait_for_timeout(150); pg.keyboard.up('Space'); pg.wait_for_timeout(200)
        erg['wasser_h_nach_Leertaste'] = round(info(pg)['spieler']['h'], 3)
        s0 = info(pg)['spieler']['strecke']; tasten('w', 1.0)
        erg['wasser_strecke_1s_m'] = round(info(pg)['spieler']['strecke'] - s0, 2)   # Soll ~3
        pg.screenshot(path=str(OUT / "7-ball-meer-schwimmt.png"))
        erg['ms_meer_ball'] = ms(pg)
    print(json.dumps(erg, indent=1, ensure_ascii=False))
    (OUT / 'messung.json').write_text(json.dumps(erg, indent=1, ensure_ascii=False), encoding='utf-8')
    print("Konsolenfehler:", len(fehler)); [print("  ", f) for f in fehler[:8]]
    b.close()
