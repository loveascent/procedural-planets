"""Gras gegen Vergleichsfotos messen. Aufruf: python grasmass.py bild1 [bild2 ...]
Bereich: untere 55 % des Bildes (Gras), ohne linke obere Ecke (Zähler). Kennzahlen je Bild:
 L = mittlere Helligkeit, S = mittlere Sättigung, H = mittlerer Farbton (Grad), Kontrast = Std der Helligkeit,
 Glanz = Anteil Pixel mit V > 0,8 und S < 0,45 (helle, entsättigte Halmflächen), Lücke = Anteil Pixel nicht grün (H außerhalb 60–160° oder S < 0,15),
 Fein = mittlerer Betrag des Helligkeitsgradienten (Halmdichte/Struktur)."""
import sys
import numpy as np
from PIL import Image
for p in sys.argv[1:]:
    im = np.asarray(Image.open(p).convert('RGB'), dtype=np.float32) / 255
    h = im.shape[0]; im = im[int(h * 0.45):]
    hsv = np.asarray(Image.fromarray((im * 255).astype(np.uint8)).convert('HSV'), dtype=np.float32) / 255
    H, S, V = hsv[..., 0] * 360, hsv[..., 1], hsv[..., 2]
    L = im @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    gy, gx = np.gradient(L)
    glanz = np.mean((V > 0.8) & (S < 0.45)); luecke = np.mean((H < 60) | (H > 160) | (S < 0.15))
    print(f"{p.split('/')[-1][:28]:28s} L {L.mean():.3f}  S {S.mean():.2f}  H {H.mean():5.1f}  Kontrast {L.std():.3f}  Glanz {glanz:.3f}  Lücke {luecke:.3f}  Fein {np.hypot(gx, gy).mean():.4f}")
