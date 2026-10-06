// Szenarien: Einschlagskörper auf Kollisionskurs, Planet-gegen-Planet, Mond ins Planetensystem.
import { fuegeHinzu, finde, masseVonRadius, type Art, type Koerper, type V3, type Welt } from './koerper.ts';

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);

/**
 * Wirft einen freien Körper auf `ziel`. Er startet `abstand` entfernt aus Richtung `richtung` (relativ zum Ziel)
 * und fliegt mit Relativgeschwindigkeit `tempo` direkt auf das Ziel zu.
 */
export function werfeAuf(w: Welt, zielId: number, opt: { radius: number; tempo: number; art?: Art; abstand?: number; richtung?: V3; name?: string }): Koerper | undefined {
  const z = finde(w, zielId);
  if (!z) return undefined;
  const art = opt.art ?? 'gestein';
  const abstand = opt.abstand ?? Math.max(30, z.r * 12);
  let d = opt.richtung ?? ((): V3 => { const a = w.zufall() * 6.283; return [Math.cos(a), (w.zufall() - 0.5) * 0.4, Math.sin(a)]; })();
  const l = len(d) || 1; d = [d[0] / l, d[1] / l, d[2] / l];
  const p: V3 = [z.p[0] + d[0] * abstand, z.p[1] + d[1] * abstand, z.p[2] + d[2] * abstand];
  const v: V3 = [z.v[0] - d[0] * opt.tempo, z.v[1] - d[1] * opt.tempo, z.v[2] - d[2] * opt.tempo];
  return fuegeHinzu(w, { name: opt.name ?? 'Einschlagskörper', art, m: masseVonRadius(opt.radius), r: opt.radius, p, v, eltern: -1, frei: true, spin: 0, spinRate: 0.5, tilt: 0, seed: Math.floor(w.zufall() * 2 ** 31) });
}

/** Planet gegen Planet: der Nachbar `anderId` bekommt Kurs auf `zielId` mit Relativgeschwindigkeit `tempo`. */
export function planetGegenPlanet(w: Welt, zielId: number, anderId: number, tempo: number): boolean {
  const a = finde(w, zielId), b = finde(w, anderId);
  if (!a || !b || a === b) return false;
  const d = sub(a.p, b.p); const l = len(d) || 1;
  b.frei = true; b.eltern = -1;
  b.v = [a.v[0] + (d[0] / l) * tempo, a.v[1] + (d[1] / l) * tempo, a.v[2] + (d[2] / l) * tempo];
  return true;
}

/** Nächster Nachbar (kleinster Abstand) unter den Planeten. */
export function naechsterPlanet(w: Welt, id: number): Koerper | undefined {
  const a = finde(w, id);
  if (!a) return undefined;
  let best: Koerper | undefined, bd = Infinity;
  for (const k of w.koerper) {
    if (k === a || k.art === 'sonne' || k.art === 'mond') continue;
    const d = len(sub(k.p, a.p));
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}
