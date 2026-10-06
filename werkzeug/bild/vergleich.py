"""Vergleicht zwei Bildordner (gleiche Dateinamen) aus bild.mjs.
Aufruf:  python werkzeug/bild/vergleich.py <ordnerA> <ordnerB> [sammelbild.png]
Gibt je Szene die Zahl abweichender Pixel aus (Summe der Kanalabweichung > Schwelle) und schreibt EIN Sammelbild
(Raster, je Szene: A | B | Abweichung ×8), damit eine Betrachtung genügt. Exit 0 = alles gleich, 1 = Abweichungen.
"""
import sys, os
from PIL import Image, ImageChops, ImageDraw

SCHWELLE = 6          # Summe über R+G+B; kleiner = Rundungsrauschen
TOLERANZ = 100        # bis zu so vielen abweichenden Pixeln je Szene = gleich. Beide Prüfwerkzeuge (Gesteins- und Gasriese) sind deterministisch: gleicher Code = 0 Pixel (Partikel-Szenen des Gasriesen bis ~70)
a_dir, b_dir = sys.argv[1], sys.argv[2]
aus = sys.argv[3] if len(sys.argv) > 3 else None
namen = sorted(f for f in os.listdir(a_dir) if f.endswith('.png') and os.path.exists(os.path.join(b_dir, f)))
fehlt = sorted(set(os.listdir(a_dir)) ^ set(os.listdir(b_dir)))
kacheln, schlecht = [], 0
if fehlt: print('FEHLER: Bilder nur in einem Ordner (gelten als Abweichung):', ', '.join(fehlt)); schlecht += len(fehlt)
if not namen: print('FEHLER: keine gemeinsamen Bilder'); sys.exit(2)
for n in namen:
    A = Image.open(os.path.join(a_dir, n)).convert('RGB'); B = Image.open(os.path.join(b_dir, n)).convert('RGB')
    if A.size != B.size: print(f'{n}: Größe verschieden {A.size} {B.size}'); schlecht += 1; continue
    d = ImageChops.difference(A, B)
    px = d.load(); w, h = d.size
    zahl = sum(1 for y in range(h) for x in range(w) if sum(px[x, y]) > SCHWELLE)
    maxd = max(max(c for c in px[x, y]) for y in range(0, h, 3) for x in range(0, w, 3))
    print(f'{n:28s} abweichende Pixel: {zahl:7d}  (max Kanal ~{maxd})')
    if zahl > TOLERANZ: schlecht += 1
    if aus and zahl > TOLERANZ:
        t = (A.width // 3, A.height // 3)
        dd = d.point(lambda v: min(255, v * 8)).resize(t)
        k = Image.new('RGB', (t[0] * 3, t[1] + 14)); k.paste(A.resize(t), (0, 14)); k.paste(B.resize(t), (t[0], 14)); k.paste(dd, (t[0] * 2, 14))
        ImageDraw.Draw(k).text((3, 1), n, fill=(255, 220, 120)); kacheln.append(k)
if aus and kacheln:
    sp = 2; z = (len(kacheln) + sp - 1) // sp; kw, kh = kacheln[0].size
    S = Image.new('RGB', (kw * sp, kh * z))
    for i, k in enumerate(kacheln): S.paste(k, ((i % sp) * kw, (i // sp) * kh))
    S.save(aus); print('Sammelbild:', aus)
print('ALLES GLEICH' if not schlecht else f'{schlecht} Szene(n) weichen ab')
sys.exit(1 if schlecht else 0)
