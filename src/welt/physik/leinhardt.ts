// Kollisionsausgang nach Leinhardt & Stewart (2012), „Collisions between Gravity-Dominated Bodies. I. Outcome Regimes and Scaling Laws“,
// ApJ 745, 79 (arXiv:1109.4588), mit der Umsetzung als N-Körper-Modul von Childs & Steffen (2022), „Collisional fragmentation and bulk
// composition tracking in REBOUND“ (arXiv:2201.05714), als Gegenprobe. Gleichungsnummern beziehen sich auf die erste Quelle.
//
// Was hier aus den Quellen stammt: Q_R (3), Q*_RD (4)–(8), schräger Stoß Q'*_RD (9), größter Rest M_lr (11)/(12) mit η = −1.5,
// Hit-and-Run-Grenze (13) mit c1..c4, Streifwinkel b_crit, Überlappmasse α. Nicht aus den Quellen (eigene Festlegung, im Code markiert):
// der Übergang „v < v_esc → Verschmelzen“ und die Trümmerzahl über die kleinste Trümmermasse.
// Einheiten: beliebig, solange G, Dichte und Radien dazu passen; ρ1 ist die Dichte der Körper dieser Welt (Gleichung nutzt R_C1 für ρ1).

export type LsAusgang = 'verschmelzen' | 'abprall' | 'teilweise' | 'erosion' | 'superkatastrophal';

export interface LsEingabe {
  /** Massen und Radien: Projektil = leichterer Körper, Ziel = schwererer */
  mp: number; mt: number; rp: number; rt: number;
  /** Relativgeschwindigkeit beim Kontakt */
  v: number;
  /** Stoßparameter b = sin(Winkel) zwischen Verbindungslinie und Relativgeschwindigkeit, 0 = zentral, 1 = streifend */
  b: number;
  G: number;
  /** Dichte der Körper (Bezugsdichte ρ1 der Gleichungen) */
  rho1: number;
  /** Materialparameter: c* = 1.9 (Planeten, flüssig), 5 (feste Planetesimale); μ̄ = 0.36 */
  cStern?: number;
  muBar?: number;
}

export interface LsErgebnis {
  ausgang: LsAusgang;
  /** Masse des größten Rests (Anteil an Gesamtmasse × Gesamtmasse); bei Abprall = Ziel */
  mLr: number;
  qR: number;
  qStern: number;
  vEsc: number;
  /** Grenzgeschwindigkeit Hit-and-Run (nur bei streifendem Stoß belegt, sonst 0) */
  vHr: number;
}

const C1 = 2.43, C2 = -0.0408, C3 = 1.86, C4 = 1.08;

/** Q*_RD für zentralen Stoß gleicher Massen, Gl. (6): c*·(4/5)·π·ρ1·G·R_C1². */
export function qSternGleichMasse(rC1: number, G: number, rho1: number, cStern: number): number {
  return cStern * 0.8 * Math.PI * rho1 * G * rC1 * rC1;
}

/** Q*_RD für beliebiges Massenverhältnis γ = Mp/Mt, Gl. (4)–(8). */
export function qSternRD(mtot: number, gamma: number, G: number, rho1: number, cStern = 1.9, muBar = 0.36): number {
  const rC1 = Math.cbrt((3 * mtot) / (4 * Math.PI * rho1));
  const vStern1 = Math.sqrt((32 * Math.PI * cStern) / 5) * Math.sqrt(rho1 * G) * rC1;                 // (5)
  const qg = 0.125 * Math.pow((32 * Math.PI * cStern) / 5, (3 * muBar) / 2);                        // (7)
  const vStern = Math.pow(0.25 * ((gamma + 1) ** 2) / gamma, 1 / (3 * muBar)) * vStern1;             // (8)
  return qg * Math.pow(rho1 * G, (3 * muBar) / 2) * Math.pow(rC1, 3 * muBar) * Math.pow(vStern, 2 - 3 * muBar); // (4)
}

export function leinhardtStewart(e: LsEingabe): LsErgebnis {
  const cStern = e.cStern ?? 1.9, muBar = e.muBar ?? 0.36;
  const { mp, mt, rp, rt, v, b, G, rho1 } = e;
  const mtot = mp + mt;
  const gamma = mp / mt;
  const vEsc = Math.sqrt((2 * G * mtot) / (rp + rt));
  const mu = (mp * mt) / mtot;                                                     // (1)
  const qR = (mu * v * v) / (2 * mtot);                                            // (3)
  // Überlappende Projektilmasse α, Gl. (14): Kugelkappe der Länge l
  const l = (rp + rt) * (1 - b);
  const alpha = l >= 2 * rp ? 1 : Math.max(1e-6, (3 * rp * l * l - l * l * l) / (4 * rp * rp * rp));
  const muAlpha = (alpha * mp * mt) / (alpha * mp + mt);                           // (2)
  const q0 = qSternRD(mtot, gamma, G, rho1, cStern, muBar);
  const qStern = Math.pow(mu / muAlpha, 2 - (3 * muBar) / 2) * q0;                  // (9)

  // Streifender Stoß: Grenze b_crit = R_t/(R_t+R_p); darüber Graze-and-merge oder Hit-and-Run, Gl. (13)
  const bCrit = rt / (rt + rp);
  if (b > bCrit) {
    const zeta = (mt - mp) / mtot;
    const f = Math.pow(1 - b, 2.5);
    const vHr = vEsc * (C1 * zeta * zeta * f + C2 * zeta * zeta + C3 * f + C4);
    return { ausgang: v < vHr ? 'verschmelzen' : 'abprall', mLr: v < vHr ? mtot : mt, qR, qStern, vEsc, vHr };
  }
  // Eigene Festlegung (nicht aus den Quellen): unterhalb der Fluchtgeschwindigkeit bleibt alles zusammen.
  if (v < vEsc) return { ausgang: 'verschmelzen', mLr: mtot, qR, qStern, vEsc, vHr: 0 };

  const x = qR / qStern;
  let anteil: number, ausgang: LsAusgang;
  if (x < 1.8) {
    anteil = 1 - 0.5 * x;                                                          // (11)
    ausgang = anteil * mtot > mt * (1 + 1e-9) ? 'teilweise' : 'erosion';
  } else {
    anteil = 0.1 * Math.pow(x / 1.8, -1.5);                                        // (12), η = −1.5
    ausgang = 'superkatastrophal';
  }
  return { ausgang, mLr: Math.min(anteil, 1) * mtot, qR, qStern, vEsc, vHr: 0 };
}
