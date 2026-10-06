// Sonnensystem erzeugen: eine Sonne, N Planeten auf Kreisbahnen (leicht geneigt), je nach Schalter Monde.
// Kreisbahngeschwindigkeit v = sqrt(G·M/r) (G = 1). Gesamtimpuls wird auf 0 gesetzt (Schwerpunkt ruht).
import { fuegeHinzu, masseVonRadius, neueWelt, neuerZufall, type Art, type Koerper, type V3, type Welt } from './koerper.ts';

export const SONNEN_MASSE = 2e5;
export const SONNEN_RADIUS = 8;

export interface SystemOptionen {
  seed: number;
  planeten: number;
  monde: boolean;
  maxTruemmer: number;
}

export const STANDARD_SYSTEM: SystemOptionen = { seed: 1, planeten: 20, monde: true, maxTruemmer: 4000 };

const SILBEN = ['Ar', 'Bel', 'Cor', 'Dra', 'Eph', 'Fen', 'Gal', 'Hyr', 'Ith', 'Kor', 'Lum', 'Mer', 'Nox', 'Ori', 'Pyr', 'Qua', 'Rho', 'Syl', 'Tar', 'Ume', 'Vel', 'Xan', 'Yor', 'Zel'];
const ROEM = ['', ' II', ' III', ' IV'];

const kreis = (zentrumM: number, rel: V3, ebene: V3): V3 => {
  // Geschwindigkeit senkrecht zu rel in der Ebene mit Normale `ebene`
  const d = Math.hypot(rel[0], rel[1], rel[2]);
  const s = Math.sqrt(zentrumM / d);
  const cx = ebene[1] * rel[2] - ebene[2] * rel[1], cy = ebene[2] * rel[0] - ebene[0] * rel[2], cz = ebene[0] * rel[1] - ebene[1] * rel[0];
  const l = Math.hypot(cx, cy, cz) || 1;
  return [(cx / l) * s, (cy / l) * s, (cz / l) * s];
};

export function erzeugeSystem(opt: SystemOptionen): Welt {
  const w = neueWelt(opt.seed * 7919 + 13, opt.maxTruemmer);
  const R = neuerZufall(opt.seed);
  const sonne = fuegeHinzu(w, { name: 'Sonne', art: 'sonne', m: SONNEN_MASSE, r: SONNEN_RADIUS, p: [0, 0, 0], v: [0, 0, 0], eltern: -1, frei: false, spin: 0, spinRate: 0.05, tilt: 0.1, seed: opt.seed });
  const P: V3 = [0, 0, 0];
  for (let i = 0; i < opt.planeten; i++) {
    const a = 80 * Math.pow(1.11, i) * (0.97 + 0.06 * R());
    const winkel = R() * Math.PI * 2;
    const neig = (R() - 0.5) * 0.08;
    const gas = i >= 6 && (R() < 0.7 || i > 12);
    const art: Art = gas ? 'gas' : 'gestein';
    const r = gas ? 1.6 + 1.9 * R() : 0.45 + 1.15 * R();
    const rel: V3 = [Math.cos(winkel) * a, Math.sin(neig) * a, Math.sin(winkel) * a];
    const norm: V3 = [0, 1, 0];
    const v = kreis(SONNEN_MASSE, rel, norm);
    const name = SILBEN[Math.floor(R() * SILBEN.length)] + SILBEN[Math.floor(R() * SILBEN.length)].toLowerCase() + (i + 1 < 10 ? '' : '');
    const pl = fuegeHinzu(w, {
      name: `${name} ${i + 1}`, art, m: masseVonRadius(r), r, p: rel, v, eltern: sonne.id, frei: false,
      spin: R() * 6.28, spinRate: (0.15 + 0.6 * R()) * (gas ? 1.6 : 1) * (R() < 0.1 ? -1 : 1), tilt: (R() - 0.5) * 0.9, seed: Math.floor(R() * 2 ** 31),
    });
    P[0] += pl.m * v[0]; P[1] += pl.m * v[1]; P[2] += pl.m * v[2];
    if (!opt.monde) continue;
    const nMonde = gas ? 1 + Math.floor(R() * 4) : R() < 0.55 ? 1 + Math.floor(R() * 2) : 0;
    let abstand = r * (2.6 + R());
    for (let k = 0; k < nMonde; k++) {
      const rm = Math.min(r * 0.4, 0.12 + 0.28 * R());
      const ph = R() * Math.PI * 2;
      const relM: V3 = [Math.cos(ph) * abstand, (R() - 0.5) * 0.2 * abstand, Math.sin(ph) * abstand];
      const vM = kreis(pl.m, relM, [0, 1, 0]);
      const mond = fuegeHinzu(w, {
        name: pl.name + ROEM[k] + ' · Mond', art: 'mond', m: masseVonRadius(rm), r: rm,
        p: [pl.p[0] + relM[0], pl.p[1] + relM[1], pl.p[2] + relM[2]], v: [v[0] + vM[0], v[1] + vM[1], v[2] + vM[2]],
        eltern: pl.id, frei: false, spin: R() * 6.28, spinRate: 0.3 * R(), tilt: 0, seed: Math.floor(R() * 2 ** 31),
      });
      P[0] += mond.m * mond.v[0]; P[1] += mond.m * mond.v[1]; P[2] += mond.m * mond.v[2];
      abstand += rm * 3 + r * (0.9 + 0.5 * R());
    }
  }
  sonne.v = [-P[0] / sonne.m, -P[1] / sonne.m, -P[2] / sonne.m];
  return w;
}

export type { Koerper };
