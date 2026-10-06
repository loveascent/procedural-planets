// Kollisionen: Kugel–Kugel-Test, dann je nach Aufprallgeschwindigkeit im Verhältnis zur Fluchtgeschwindigkeit
//   · langsam → Verschmelzung (Impuls und Masse erhalten, Volumen addiert sich),
//   · schnell → Zerschlagung: der leichtere Körper bricht in Trümmer, vom schwereren fliegt Auswurf weg,
//     der Rest wird aufgenommen; der Impuls des Schwereren folgt aus der Erhaltung (Summe bleibt exakt).
// Die Sonne verschluckt alles. Trümmer, die einen Körper berühren, werden von ihm aufgenommen.
import type { Koerper, Welt, V3 } from './koerper.ts';
import { entferneTruemmer, fuegeTruemmerHinzu } from './koerper.ts';

export interface KollisionsOptionen {
  /** Aus: es wird immer verschmolzen (keine Trümmer). */
  truemmer: boolean;
}

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
    fuegeTruemmerHinzu(w, p, v, mEin, art);
    for (let c = 0; c < 3; c++) Pd[c] += mEin * v[c];
  }
  // Masse des Schwereren: Radius über Volumenanteil, Geschwindigkeit aus der Impulserhaltung
  const dV = (mAufnahme - mAuswurf) / klein.m * klein.r ** 3;
  gross.r = Math.cbrt(Math.max(gross.r ** 3 + dV, 1e-6));
  gross.m = mGross;
  for (let c = 0; c < 3; c++) gross.v[c] = (P[c] - Pd[c]) / gross.m;
  entferne(w, klein, gross);
}

export function kollisionen(w: Welt, o: KollisionsOptionen) {
  // Schleife bis keine Berührung mehr (nach Verschmelzung kann ein Nachbar berührt werden)
  for (let runde = 0; runde < 8; runde++) {
    let getroffen = false;
    const K = w.koerper;
    for (let i = 0; i < K.length && !getroffen; i++) {
      for (let j = i + 1; j < K.length; j++) {
        const a = K[i], b = K[j];
        const dx = b.p[0] - a.p[0], dy = b.p[1] - a.p[1], dz = b.p[2] - a.p[2];
        const R = a.r + b.r;
        if (dx * dx + dy * dy + dz * dz >= R * R) continue;
        const gross = a.m >= b.m ? a : b, klein = gross === a ? b : a;
        const vrel = Math.hypot(a.v[0] - b.v[0], a.v[1] - b.v[1], a.v[2] - b.v[2]);
        // Entfernen sich beide schon? (z. B. frisch gelöst) → nicht erneut auslösen
        if (dx * (b.v[0] - a.v[0]) + dy * (b.v[1] - a.v[1]) + dz * (b.v[2] - a.v[2]) > 0 && vrel > 0) continue;
        const vesc = Math.sqrt((2 * (a.m + b.m)) / R);
        const mu = (a.m * b.m) / (a.m + b.m);
        const energie = 0.5 * mu * vrel * vrel;
        const staerke = Math.min(1, Math.log10(1 + energie) / 7);
        const ort: V3 = [klein.p[0], klein.p[1], klein.p[2]];
        const text = `${klein.name} → ${gross.name}`;
        if (gross.art === 'sonne') {
          verschmelze(w, gross, klein);
          w.ereignisse.push({ zeit: w.zeit, ort, staerke, text, art: 'sonne' });
        } else if (o.truemmer && vrel / vesc > AUFPRALL_ZERSCHLAGEN) {
          zerschlage(w, gross, klein, vrel, vesc);
          w.ereignisse.push({ zeit: w.zeit, ort, staerke, text, art: 'zerschlagen' });
        } else {
          verschmelze(w, gross, klein);
          w.ereignisse.push({ zeit: w.zeit, ort, staerke, text, art: 'verschmelzen' });
        }
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
