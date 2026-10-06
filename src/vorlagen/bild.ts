import { TABLE } from './tabellen';
// Farben aus einem Planetenfoto: mittlere Farbe je Breitengrad wird zur Bandfarbe.
/**
 * Misst Bandfarben aus einem Bild: für jede Breite die mittlere Farbe der Bildzeile.
 * Funktioniert mit flachen Karten und mit Fotos der Planetenscheibe (schwarzer Raum und
 * dunkler Rand werden ignoriert, genutzt wird die Mitte jeder Zeile).
 */
export async function bandsFromImage(file: File): Promise<[number, string][]> {
  const bmp = await createImageBitmap(file);
  const w = 256, h = Math.max(64, Math.round((256 * bmp.height) / bmp.width));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(bmp, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h).data;
  const lum = (i: number) => 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2];
  // Oberste und unterste Zeile mit Planet finden (Foto der Scheibe hat schwarzen Rand).
  const rowHasPlanet = (y: number) => { let n = 0; for (let x = 0; x < w; x++) if (lum((y * w + x) * 4) > 18) n++; return n > w * 0.02; };
  let top = 0, bottom = h - 1;
  while (top < h - 1 && !rowHasPlanet(top)) top++;
  while (bottom > top && !rowHasPlanet(bottom)) bottom--;
  const out: [number, string][] = [];
  for (let k = 0; k < TABLE; k++) {
    const lat = 90 - (180 * k) / (TABLE - 1);
    const y = Math.round(top + ((bottom - top) * k) / (TABLE - 1));
    let x0 = 0, x1 = w - 1;
    while (x0 < w - 1 && lum((y * w + x0) * 4) <= 18) x0++;
    while (x1 > x0 && lum((y * w + x1) * 4) <= 18) x1--;
    const mid = (x0 + x1) / 2, half = Math.max(1, (x1 - x0) * 0.2);
    let r = 0, gg = 0, b = 0, n = 0;
    for (let x = Math.floor(mid - half); x <= Math.ceil(mid + half); x++) {
      const i = (y * w + Math.min(w - 1, Math.max(0, x))) * 4;
      r += px[i]; gg += px[i + 1]; b += px[i + 2]; n++;
    }
    const to = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
    out.push([lat, `#${to(r)}${to(gg)}${to(b)}`]);
  }
  return out.reverse();
}
