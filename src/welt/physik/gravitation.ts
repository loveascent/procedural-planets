// Gravitation: Newton, Leapfrog (Kick-Drift-Kick, symplektisch). Körper ziehen sich nach der Regel in `paarZieht`,
// Trümmer sind Testteilchen und fühlen alle Körper. Weichzeichner `EPS` verhindert Singularitäten bei Beinahe-Treffern.
import type { Koerper, Welt } from './koerper.ts';

export const EPS = 0.05;

export interface GravOptionen {
  /** Alle Körper ziehen sich gegenseitig (Chaos). Aus: Planeten spüren nur Sonne + eigene Monde (+ freie Körper). */
  planetenZiehen: boolean;
}

/** Zieht Körper b auf Körper a? (Kraftpaar wird immer symmetrisch behandelt.) */
export function paarZieht(a: Koerper, b: Koerper, o: GravOptionen): boolean {
  if (o.planetenZiehen) return true;
  if (a.art === 'sonne' || b.art === 'sonne') return true;
  if (a.frei || b.frei) return true;
  return a.eltern === b.id || b.eltern === a.id;
}

/**
 * Im Ruhemodus (planetenZiehen aus) spürt ein Mond die Sonne am Ort seines Planeten, nicht an seinem eigenen:
 * keine Gezeitenkraft der Sonne, damit Monde in der Nähe ihres Planeten stabil bleiben (sonst müssten sie
 * innerhalb weniger Planetenradien kreisen, weil Planeten hier viel kleiner im Verhältnis zur Hill-Kugel sind).
 */
export function beschleunigungen(w: Welt, o: GravOptionen, acc: Float64Array) {
  const K = w.koerper, n = K.length;
  acc.fill(0, 0, 3 * n);
  const idx = new Map<number, number>();
  if (!o.planetenZiehen) for (let i = 0; i < n; i++) idx.set(K[i].id, i);
  for (let i = 0; i < n; i++) {
    const a = K[i];
    for (let j = i + 1; j < n; j++) {
      const b = K[j];
      if (!paarZieht(a, b, o)) continue;
      let ap = a.p, bp = b.p;
      if (!o.planetenZiehen) {
        if (a.art === 'sonne' && b.art === 'mond' && !b.frei) { const e = idx.get(b.eltern); if (e !== undefined && K[e].art !== 'sonne') bp = K[e].p; }
        else if (b.art === 'sonne' && a.art === 'mond' && !a.frei) { const e = idx.get(a.eltern); if (e !== undefined && K[e].art !== 'sonne') ap = K[e].p; }
      }
      const dx = bp[0] - ap[0], dy = bp[1] - ap[1], dz = bp[2] - ap[2];
      const d2 = dx * dx + dy * dy + dz * dz + EPS * EPS;
      const inv = 1 / (d2 * Math.sqrt(d2));
      const fa = b.m * inv, fb = a.m * inv;
      acc[3 * i] += dx * fa; acc[3 * i + 1] += dy * fa; acc[3 * i + 2] += dz * fa;
      acc[3 * j] -= dx * fb; acc[3 * j + 1] -= dy * fb; acc[3 * j + 2] -= dz * fb;
    }
  }
}

let accPuffer = new Float64Array(0);

/** Ein Leapfrog-Schritt für Körper und Trümmer. */
export function gravitationsSchritt(w: Welt, dt: number, o: GravOptionen) {
  const K = w.koerper, n = K.length;
  if (accPuffer.length < 3 * n) accPuffer = new Float64Array(3 * n + 96);
  const acc = accPuffer;
  const t = w.truemmer;
  const truemmerKick = (h: number) => {
    for (let i = 0; i < t.n; i++) {
      const px = t.p[3 * i], py = t.p[3 * i + 1], pz = t.p[3 * i + 2];
      let ax = 0, ay = 0, az = 0;
      for (let j = 0; j < n; j++) {
        const b = K[j];
        const dx = b.p[0] - px, dy = b.p[1] - py, dz = b.p[2] - pz;
        const d2 = dx * dx + dy * dy + dz * dz + EPS * EPS;
        const f = b.m / (d2 * Math.sqrt(d2));
        ax += dx * f; ay += dy * f; az += dz * f;
      }
      t.v[3 * i] += ax * h; t.v[3 * i + 1] += ay * h; t.v[3 * i + 2] += az * h;
    }
  };
  beschleunigungen(w, o, acc);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) K[i].v[k] += 0.5 * dt * acc[3 * i + k];
  truemmerKick(0.5 * dt);
  for (let i = 0; i < n; i++) { const k = K[i]; for (let c = 0; c < 3; c++) k.p[c] += dt * k.v[c]; k.spin += k.spinRate * dt; }
  for (let i = 0; i < t.n; i++) for (let c = 0; c < 3; c++) { t.p[3 * i + c] += dt * t.v[3 * i + c]; }
  beschleunigungen(w, o, acc);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) K[i].v[k] += 0.5 * dt * acc[3 * i + k];
  truemmerKick(0.5 * dt);
  w.zeit += dt;
}

/** Gesamtenergie nur der Körper (Kinetik + Potenzial über alle Paare; für Tests mit planetenZiehen = true). */
export function energie(w: Welt): number {
  let e = 0;
  const K = w.koerper;
  for (let i = 0; i < K.length; i++) {
    const a = K[i];
    e += 0.5 * a.m * (a.v[0] ** 2 + a.v[1] ** 2 + a.v[2] ** 2);
    for (let j = i + 1; j < K.length; j++) {
      const b = K[j];
      const d = Math.sqrt((a.p[0] - b.p[0]) ** 2 + (a.p[1] - b.p[1]) ** 2 + (a.p[2] - b.p[2]) ** 2 + EPS * EPS);
      e -= (a.m * b.m) / d;
    }
  }
  return e;
}
