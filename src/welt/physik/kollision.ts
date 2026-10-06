// Kollisionen: Kugel–Kugel-Test, dann je nach Aufprallgeschwindigkeit im Verhältnis zur Fluchtgeschwindigkeit
//   · langsam → Verschmelzung (Impuls und Masse erhalten, Volumen addiert sich),
//   · schnell → Zerschlagung: der leichtere Körper bricht in Trümmer, vom schwereren fliegt Auswurf weg,
//     der Rest wird aufgenommen; der Impuls des Schwereren folgt aus der Erhaltung (Summe bleibt exakt).
// Die Sonne verschluckt alles. Trümmer, die einen Körper berühren, werden von ihm aufgenommen.
import type { Koerper, Welt, V3 } from './koerper.ts';
import { DICHTE, entferneTruemmer, fuegeTruemmerHinzu } from './koerper.ts';
import { leinhardtStewart } from './leinhardt.ts';

export interface KollisionsOptionen {
  /** Aus: es wird immer verschmolzen (keine Trümmer). */
  truemmer: boolean;
  /** An: Ausgang nach Leinhardt & Stewart (2012) (`leinhardt.ts`); aus: der frühere Eigenbau mit fester Schwelle (1,5 × v_esc). */
  ls12: boolean;
}

const KLEINSTE_TRUEMMER = 1 / 40;   // kleinste Trümmermasse = Gesamtmasse/40 (Childs & Steffen: M_min als Parameter)
const TRUEMMER_TEMPO = 0.5;          // Emsenhuber et al. 2024 (PSJ, arXiv:2401.17356): typische Fluchtgeschwindigkeit der Trümmer ≈ halbe Aufprallgeschwindigkeit (Childs & Steffen 2022 nahmen 1,1 × v_esc an, das ist deutlich zu langsam)
const RESTITUTION = 0.5;             // Abprall (Hit-and-Run): harte Kugeln mit Rückstoßzahl, wie REBOUND „hardsphere“

const AUFPRALL_ZERSCHLAGEN = 1.5; // v_rel / v_esc, ab hier bricht der leichtere Körper
const BREITE = 3;                 // Spanne bis zur vollen Zerstörung

const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

function zufallsRichtung(w: Welt): V3 {
  const z = 2 * w.zufall() - 1, a = 2 * Math.PI * w.zufall(), s = Math.sqrt(1 - z * z);
  return [s * Math.cos(a), s * Math.sin(a), z];
}

function entferne(w: Welt, k: Koerper, neuerElter: Koerper) {
  w.koerper.splice(w.koerper.indexOf(k), 1);
  for (const o of w.koerper) if (o.eltern === k.id) o.eltern = neuerElter.id;
}

function verschmelze(w: Welt, gross: Koerper, klein: Koerper) {
  const M = gross.m + klein.m;
  for (let c = 0; c < 3; c++) {
    gross.p[c] = (gross.m * gross.p[c] + klein.m * klein.p[c]) / M;
    gross.v[c] = (gross.m * gross.v[c] + klein.m * klein.v[c]) / M;
  }
  gross.r = Math.cbrt(gross.r ** 3 + klein.r ** 3);
  gross.m = M;
  entferne(w, klein, gross);
}

function zerschlage(w: Welt, gross: Koerper, klein: Koerper, vrel: number, vesc: number) {
  const f = Math.min(1, Math.max(0, (vrel / vesc - AUFPRALL_ZERSCHLAGEN) / BREITE));
  const mTrKlein = klein.m * (0.3 + 0.7 * f);
  const mAuswurf = Math.min(klein.m * f * 0.6, gross.m * 0.1);
  const mAufnahme = klein.m - mTrKlein;
  const mSumme = mTrKlein + mAuswurf;
  // Gesamtimpuls vorher (Körper)
  const P: V3 = [0, 0, 0];
  for (let c = 0; c < 3; c++) P[c] = gross.m * gross.v[c] + klein.m * klein.v[c];
  const nWunsch = Math.round(14 + 120 * f);
  const frei = w.truemmer.max - w.truemmer.n;
  const n = Math.min(nWunsch, frei);
  const mGross = gross.m + mAufnahme - mAuswurf;
  if (n < 1 || mGross <= 0) { verschmelze(w, gross, klein); return; }
  const vescGross = Math.sqrt((2 * gross.m) / gross.r);
  const kontakt: V3 = [0, 0, 0];
  for (let c = 0; c < 3; c++) kontakt[c] = gross.p[c] + (klein.p[c] - gross.p[c]);
  const raus = norm([kontakt[0] - gross.p[0], kontakt[1] - gross.p[1], kontakt[2] - gross.p[2]]);
  const mEin = mSumme / n;
  const Pd: V3 = [0, 0, 0];
  const kicks: V3[] = [], pos: V3[] = [];
  const art = klein.art === 'gas' ? 1 : klein.art === 'sonne' ? 2 : 0;
  for (let i = 0; i < n; i++) {
    const z = zufallsRichtung(w);
    const dir = norm([raus[0] + 0.9 * z[0], raus[1] + 0.9 * z[1], raus[2] + 0.9 * z[2]]);
    const abstand = gross.r * 1.03 + w.zufall() * klein.r;
    const p: V3 = [gross.p[0] + dir[0] * abstand, gross.p[1] + dir[1] * abstand, gross.p[2] + dir[2] * abstand];
    const kick = vescGross * (0.5 + 1.3 * w.zufall()) * (0.5 + 0.5 * f);
    const erbe = 0.35;
    const v: V3 = [0, 0, 0];
    for (let c = 0; c < 3; c++) v[c] = gross.v[c] + dir[c] * kick + (klein.v[c] - gross.v[c]) * erbe;
    kicks.push(v); pos.push(p);
  }
  // mittleren Kick abziehen (siehe loeseLS12): der Rest behält ungefähr die Geschwindigkeit des Schwerpunkts
  const vcm: V3 = [P[0] / (gross.m + klein.m), P[1] / (gross.m + klein.m), P[2] / (gross.m + klein.m)];
  const mittel: V3 = [0, 0, 0];
  for (const v of kicks) for (let c = 0; c < 3; c++) mittel[c] += (v[c] - vcm[c]) / n;
  for (let i = 0; i < n; i++) {
    const v: V3 = [kicks[i][0] - mittel[0], kicks[i][1] - mittel[1], kicks[i][2] - mittel[2]];
    fuegeTruemmerHinzu(w, pos[i], v, mEin, art);
    for (let c = 0; c < 3; c++) Pd[c] += mEin * v[c];
  }
  // Masse des Schwereren: Radius über Volumenanteil, Geschwindigkeit aus der Impulserhaltung
  const dV = (mAufnahme - mAuswurf) / klein.m * klein.r ** 3;
  gross.r = Math.cbrt(Math.max(gross.r ** 3 + dV, 1e-6));
  gross.m = mGross;
  for (let c = 0; c < 3; c++) gross.v[c] = (P[c] - Pd[c]) / gross.m;
  entferne(w, klein, gross);
}

/** Abprall zweier Körper an der Berührnormalen (Impuls erhalten), danach auf Berührabstand getrennt. */
function prallAb(a: Koerper, b: Koerper) {
  const n: V3 = norm([b.p[0] - a.p[0], b.p[1] - a.p[1], b.p[2] - a.p[2]]);
  const vn = (a.v[0] - b.v[0]) * n[0] + (a.v[1] - b.v[1]) * n[1] + (a.v[2] - b.v[2]) * n[2];
  if (vn <= 0) return;
  const J = ((1 + RESTITUTION) * vn) / (1 / a.m + 1 / b.m);
  for (let c = 0; c < 3; c++) { a.v[c] -= (J / a.m) * n[c]; b.v[c] += (J / b.m) * n[c]; }
  const tief = a.r + b.r - Math.hypot(b.p[0] - a.p[0], b.p[1] - a.p[1], b.p[2] - a.p[2]);
  if (tief > 0) for (let c = 0; c < 3; c++) { a.p[c] -= n[c] * tief * (b.m / (a.m + b.m)); b.p[c] += n[c] * tief * (a.m / (a.m + b.m)); }
}

/** Ausgang nach Leinhardt & Stewart 2012: größter Rest bleibt am Ziel, der Rest der Masse wird zu gleich schweren Trümmern. */
function loeseLS12(w: Welt, ziel: Koerper, proj: Koerper, vrel: number, b: number): 'verschmelzen' | 'zerschlagen' | 'abprall' {
  const erg = leinhardtStewart({ mp: proj.m, mt: ziel.m, rp: proj.r, rt: ziel.r, v: vrel, b, G: 1, rho1: DICHTE });
  if (erg.ausgang === 'abprall') { prallAb(ziel, proj); return 'abprall'; }
  if (erg.ausgang === 'verschmelzen') { verschmelze(w, ziel, proj); return 'verschmelzen'; }
  const mtot = ziel.m + proj.m;
  const mTr = mtot - erg.mLr;
  const nWunsch = Math.floor(mTr / (mtot * KLEINSTE_TRUEMMER));
  const n = Math.min(nWunsch, w.truemmer.max - w.truemmer.n, 160);
  if (n < 1) { verschmelze(w, ziel, proj); return 'verschmelzen'; }
  const P: V3 = [0, 0, 0];
  for (let c = 0; c < 3; c++) P[c] = ziel.m * ziel.v[c] + proj.m * proj.v[c];
  const pSchwer: V3 = [(ziel.m * ziel.p[0] + proj.m * proj.p[0]) / mtot, (ziel.m * ziel.p[1] + proj.m * proj.p[1]) / mtot, (ziel.m * ziel.p[2] + proj.m * proj.p[2]) / mtot];
  const rRest = Math.cbrt(erg.mLr / DICHTE);
  const raus = norm([proj.p[0] - ziel.p[0], proj.p[1] - ziel.p[1], proj.p[2] - ziel.p[2]]);
  const mEin = mTr / n, vT = Math.max(TRUEMMER_TEMPO * vrel, erg.vEsc);
  const Pd: V3 = [0, 0, 0];
  const kicks: V3[] = [], pos: V3[] = [];
  const art = proj.art === 'gas' || ziel.art === 'gas' ? 1 : 0;
  for (let i = 0; i < n; i++) {
    const z = zufallsRichtung(w);
    const dir = norm([raus[0] + 0.9 * z[0], raus[1] + 0.9 * z[1], raus[2] + 0.9 * z[2]]);
    const abstand = rRest * 1.03 + w.zufall() * proj.r;
    const p: V3 = [pSchwer[0] + dir[0] * abstand, pSchwer[1] + dir[1] * abstand, pSchwer[2] + dir[2] * abstand];
    const v: V3 = [P[0] / mtot + dir[0] * vT, P[1] / mtot + dir[1] * vT, P[2] / mtot + dir[2] * vT];
    kicks.push(v);
    pos.push(p);
  }
  // Auswurf bewegt sich im Mittel mit dem Schwerpunkt: den mittleren Kick abziehen, sonst bekommt ein kleiner Rest
  // (Masse klein, Impuls aus ungleichen Kicks) eine unsinnig hohe Geschwindigkeit
  const mittel: V3 = [0, 0, 0];
  for (const v of kicks) for (let c = 0; c < 3; c++) mittel[c] += (v[c] - P[c] / mtot) / n;
  for (let i = 0; i < n; i++) {
    const v: V3 = [kicks[i][0] - mittel[0], kicks[i][1] - mittel[1], kicks[i][2] - mittel[2]];
    fuegeTruemmerHinzu(w, pos[i], v, mEin, art);
    for (let c = 0; c < 3; c++) Pd[c] += mEin * v[c];
  }
  ziel.m = erg.mLr; ziel.r = rRest;
  for (let c = 0; c < 3; c++) { ziel.p[c] = pSchwer[c]; ziel.v[c] = (P[c] - Pd[c]) / ziel.m; }
  entferne(w, proj, ziel);
  return 'zerschlagen';
}

export function kollisionen(w: Welt, o: KollisionsOptionen, dt: number) {
  // Schleife bis keine Berührung mehr (nach Verschmelzung kann ein Nachbar berührt werden)
  for (let runde = 0; runde < 8; runde++) {
    let getroffen = false;
    const K = w.koerper;
    for (let i = 0; i < K.length && !getroffen; i++) {
      for (let j = i + 1; j < K.length; j++) {
        const a = K[i], b = K[j];
        const dx = b.p[0] - a.p[0], dy = b.p[1] - a.p[1], dz = b.p[2] - a.p[2];
        const R = a.r + b.r;
        const vx = b.v[0] - a.v[0], vy = b.v[1] - a.v[1], vz = b.v[2] - a.v[2];
        const v2 = vx * vx + vy * vy + vz * vz;
        // Durchgeflogen? Engster Abstand innerhalb des letzten Teilschritts (verhindert Tunneln bei hohem Tempo)
        const tau = v2 > 0 ? Math.min(dt, Math.max(0, (dx * vx + dy * vy + dz * vz) / v2)) : 0;
        const ex = dx - vx * tau, ey = dy - vy * tau, ez = dz - vz * tau;
        const dmin2 = ex * ex + ey * ey + ez * ez;
        if (dmin2 >= R * R) continue;
        // Hat sich der Abstand schon zu Beginn des Teilschritts vergrößert (frisch aufgelöst)? Dann nicht erneut auslösen.
        if ((dx - vx * dt) * vx + (dy - vy * dt) * vy + (dz - vz * dt) * vz > 0 && v2 > 0) continue;
        // Zurück auf den Zeitpunkt der Berührung
        if (tau > 0) for (let c = 0; c < 3; c++) { a.p[c] -= a.v[c] * tau; b.p[c] -= b.v[c] * tau; }
        const gross = a.m >= b.m ? a : b, klein = gross === a ? b : a;
        const vrel = Math.sqrt(v2);
        const vesc = Math.sqrt((2 * (a.m + b.m)) / R);
        const mu = (a.m * b.m) / (a.m + b.m);
        const energie = 0.5 * mu * vrel * vrel;
        const staerke = Math.min(1, Math.log10(1 + energie) / 7);
        const ort: V3 = [klein.p[0], klein.p[1], klein.p[2]];
        const text = `${klein.name} → ${gross.name}`;
        if (gross.art === 'sonne') {
          verschmelze(w, gross, klein);
          w.ereignisse.push({ zeit: w.zeit, ort, staerke, text, art: 'sonne' });
        } else if (o.ls12 && o.truemmer) {
          // Stoßparameter b = sin(Winkel): Abstand der Bahngeraden vom Zentrum (senkrecht zur Relativgeschwindigkeit) / Summe der Radien
          const bb = Math.min(1, Math.hypot(ey * vz - ez * vy, ez * vx - ex * vz, ex * vy - ey * vx) / (Math.max(vrel, 1e-12) * R));
          const aus = loeseLS12(w, gross, klein, vrel, bb);
          w.ereignisse.push({ zeit: w.zeit, ort, staerke, text, art: aus });
        } else if (o.truemmer && vrel / vesc > AUFPRALL_ZERSCHLAGEN) {
          zerschlage(w, gross, klein, vrel, vesc);
          w.ereignisse.push({ zeit: w.zeit, ort, staerke, text, art: 'zerschlagen' });
        } else {
          verschmelze(w, gross, klein);
          w.ereignisse.push({ zeit: w.zeit, ort, staerke, text, art: 'verschmelzen' });
        }
        // Nach Kollision keine Bildinterpolation über den Sprung hinweg
        for (const k of [a, b]) { k.pv[0] = k.p[0]; k.pv[1] = k.p[1]; k.pv[2] = k.p[2]; k.spinV = k.spin; }
        getroffen = true;
        break;
      }
    }
    if (!getroffen) break;
  }
}

/** Trümmer: von Körpern aufnehmen lassen; sehr ferne entfernen. Gibt die Zahl aufgenommener zurück. */
export function truemmerAufnehmen(w: Welt, ferneGrenze = 6000): number {
  const t = w.truemmer, K = w.koerper;
  let aufgenommen = 0;
  for (let i = t.n - 1; i >= 0; i--) {
    const px = t.p[3 * i], py = t.p[3 * i + 1], pz = t.p[3 * i + 2];
    let weg = false;
    for (let j = 0; j < K.length; j++) {
      const b = K[j];
      const dx = px - b.p[0], dy = py - b.p[1], dz = pz - b.p[2];
      if (dx * dx + dy * dy + dz * dz < b.r * b.r) {
        const M = b.m + t.m[i];
        for (let c = 0; c < 3; c++) b.v[c] = (b.m * b.v[c] + t.m[i] * t.v[3 * i + c]) / M;
        b.r = b.r * Math.cbrt(M / b.m);
        b.m = M;
        weg = true; aufgenommen++;
        break;
      }
    }
    if (!weg && px * px + py * py + pz * pz > ferneGrenze * ferneGrenze) { w.verworfen += t.m[i]; weg = true; }
    if (weg) entferneTruemmer(t, i);
  }
  return aufgenommen;
}
