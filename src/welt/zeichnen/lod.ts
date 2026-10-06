// Detailstufen: Rechnen für sichtbare Größe auf dem Bildschirm.
//   punkt     – unter ~2 Pixel: nur ein Leuchtpunkt,
//   gebacken  – Kugel mit gebackener Oberfläche (statisch),
//   voll      – die nächsten Körper (höchstens `maxVoll`): lebendige Oberfläche (bewegte Bänder, Sonnenflackern).
// Anschlusspunkt für die echten Simulationen (Gasriese/Gesteinsplanet): `VolleStufe` – sie würden hier für die
// nächsten 1–3 Körper übernehmen, sobald diese Apps mehrfach instanzierbar sind (heute besitzen sie Leinwand und globalen Zustand).
import type { Koerper, V3 } from '../physik/koerper.ts';

export type Stufe = 'punkt' | 'gebacken' | 'voll';

export interface VolleStufe { bereit(k: Koerper): boolean }

export interface LodErgebnis { stufen: Map<number, Stufe>; voll: Koerper[] }

export function waehleStufen(koerper: Koerper[], auge: V3, pixelProRadiant: number, an: boolean, maxVoll = 3): LodErgebnis {
  const stufen = new Map<number, Stufe>();
  const kand: { k: Koerper; px: number }[] = [];
  for (const k of koerper) {
    const d = Math.hypot(k.p[0] - auge[0], k.p[1] - auge[1], k.p[2] - auge[2]);
    const px = (k.r / Math.max(d, 1e-6)) * pixelProRadiant;
    kand.push({ k, px });
  }
  kand.sort((a, b) => b.px - a.px);
  const voll: Koerper[] = [];
  for (const { k, px } of kand) {
    if (!an) { stufen.set(k.id, 'voll'); voll.push(k); continue; }
    if (k.art === 'sonne' && px >= 1.0) { stufen.set(k.id, 'voll'); voll.push(k); continue; }
    if (px < 1.0) stufen.set(k.id, 'punkt');
    else if (voll.filter((v) => v.art !== 'sonne').length < maxVoll && px > 30) { stufen.set(k.id, 'voll'); voll.push(k); }
    else stufen.set(k.id, 'gebacken');
  }
  return { stufen, voll };
}
