// Prüft die Welt-Physik ohne Grafik: node werkzeug/welt/physik_pruefen.ts
import { erzeugeSystem, STANDARD_SYSTEM } from '../../src/welt/physik/system.ts';
import { weltSchritt, TEILSCHRITT } from '../../src/welt/physik/schritt.ts';
import { summen, finde } from '../../src/welt/physik/koerper.ts';
import { energie } from '../../src/welt/physik/gravitation.ts';
import { leinhardtStewart, qSternRD, qSternGleichMasse } from '../../src/welt/physik/leinhardt.ts';
import { DICHTE } from '../../src/welt/physik/koerper.ts';
import { werfeAuf, planetGegenPlanet } from '../../src/welt/physik/szenarien.ts';

let fehler = 0;
const ok = (b: boolean, t: string, info = '') => { console.log((b ? 'ok    ' : 'FEHLER ') + t + (info ? '  ' + info : '')); if (!b) fehler++; };
const lauf = (w: any, sek: number, s: any) => { for (let t = 0; t < sek; t += 1 / 60) weltSchritt(w, 1 / 60, 1, s); };
const S = { planetenZiehen: false, kollision: true, truemmer: true, ls12: true };
const dist = (a: any, b: any) => Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]);

// 1. Bahnen bleiben stabil (Planeten um Sonne, Monde um Planeten)
{
  const w = erzeugeSystem({ ...STANDARD_SYSTEM, seed: 3 });
  const sonne = w.koerper[0];
  const plan = w.koerper.filter((k) => k.eltern === sonne.id);
  const monde = w.koerper.filter((k) => k.art === 'mond');
  const d0 = plan.map((p) => dist(p, sonne)); const m0 = monde.map((m) => dist(m, finde(w, m.eltern)!));
  const n0 = w.koerper.length;
  lauf(w, 60, S);
  const dp = Math.max(...plan.map((p, i) => Math.abs(dist(p, sonne) / d0[i] - 1)));
  const dm = Math.max(...monde.map((m, i) => Math.abs(dist(m, finde(w, m.eltern)!) / m0[i] - 1)));
  ok(plan.length === 20, '20 Planeten', `(${plan.length}, ${monde.length} Monde, ${n0} Körper)`);
  ok(dp < 0.15, 'Planetenbahnen stabil (60 s, Schalter Planeten-ziehen aus)', `max Abweichung ${(dp * 100).toFixed(2)} %`);
  ok(dm < 0.30, 'Mondbahnen stabil', `max Abweichung ${(dm * 100).toFixed(2)} %`);
  ok(w.koerper.length === n0, 'keine ungewollten Kollisionen im Ruhesystem');
  const s = summen(w); ok(Math.hypot(...s.P) < 1e-6 * s.m, 'Gesamtimpuls bleibt ≈ 0', `|P|=${Math.hypot(...s.P).toExponential(2)}`);
}
// 2. n-Körper-Energie
{
  const w = erzeugeSystem({ ...STANDARD_SYSTEM, seed: 5, planeten: 6, monde: false });
  const e0 = energie(w); lauf(w, 20, { ...S, planetenZiehen: true, kollision: false });
  const e1 = energie(w);
  ok(Math.abs(e1 / e0 - 1) < 1e-3, 'Energie im n-Körper-Modus erhalten', `Δ=${((e1 / e0 - 1) * 100).toExponential(2)} %`);
}
// 3. Zerschlagung: Masse, Impuls, Drehimpuls erhalten
{
  const w = erzeugeSystem({ ...STANDARD_SYSTEM, seed: 7, planeten: 8, monde: false });
  const ziel = w.koerper.find((k) => k.art === 'gestein')!;
  const a = summen(w);
  const stein = werfeAuf(w, ziel.id, { radius: 0.5, tempo: 120, abstand: 20 })!;
  const b = summen(w);
  const nK = w.koerper.length;
  lauf(w, 1.0, { ...S, planetenZiehen: false });
  const c = summen(w);
  ok(w.koerper.length < nK || w.truemmer.n > 0, 'Einschlag löst aus', `Trümmer ${w.truemmer.n}, Körper ${nK}→${w.koerper.length}`);
  ok(w.ereignisse.some((e) => e.art === 'zerschlagen'), 'Ereignis „zerschlagen“', w.ereignisse.map((e) => e.art + ':' + e.text).join(' | '));
  const rel = (x: number, y: number) => Math.abs(x - y) / (Math.abs(y) + 1e-9);
  ok(rel(c.m, b.m) < 1e-9, 'Masse erhalten', `${rel(c.m, b.m).toExponential(1)}`);
  void a; void stein;
}
// 3b. Impulserhaltung im Aufprallmoment exakt (ohne Gravitation: Sonne weit weg => Zeit sehr kurz)
{
  const w = erzeugeSystem({ ...STANDARD_SYSTEM, seed: 9, planeten: 4, monde: false });
  const ziel = w.koerper.find((k) => k.art === 'gestein' || k.art === 'gas')!;
  werfeAuf(w, ziel.id, { radius: 0.4, tempo: 200, abstand: ziel.r + 0.4 + 0.5 });
  const vor = summen(w);
  weltSchritt(w, TEILSCHRITT * 6, 1, { ...S, planetenZiehen: false });
  const nach = summen(w);
  const dP = Math.hypot(nach.P[0] - vor.P[0], nach.P[1] - vor.P[1], nach.P[2] - vor.P[2]);
  ok(w.truemmer.n > 0, 'Trümmer entstanden', `${w.truemmer.n}`);
  ok(dP / nach.m < 0.02, 'Impuls im Aufprall erhalten', `ΔP/M=${(dP / nach.m).toExponential(2)}`);
  ok(Math.abs(nach.m / vor.m - 1) < 1e-12, 'Masse im Aufprall exakt');
}
// 4. Langsam → Verschmelzung
{
  const w = erzeugeSystem({ ...STANDARD_SYSTEM, seed: 11, planeten: 4, monde: false });
  const ziel = w.koerper.find((k) => k.art === 'gestein' || k.art === 'gas')!;
  werfeAuf(w, ziel.id, { radius: 0.4, tempo: 4, abstand: 4 });
  const m0 = summen(w).m; const n0 = w.koerper.length;
  lauf(w, 20, S);
  ok(w.ereignisse.some((e) => e.art === 'verschmelzen'), 'langsamer Einschlag verschmilzt', w.ereignisse.map((e) => e.art).join(','));
  ok(w.koerper.length === n0 - 1 && w.truemmer.n === 0, 'ein Körper weniger, keine Trümmer');
  ok(Math.abs(summen(w).m / m0 - 1) < 1e-12, 'Masse erhalten');
}
// 5. Planet gegen Planet
{
  const w = erzeugeSystem({ ...STANDARD_SYSTEM, seed: 13, planeten: 6, monde: false });
  const pl = w.koerper.filter((k) => k.eltern === 1);
  planetGegenPlanet(w, pl[2].id, pl[3].id, 60);
  const n0 = w.koerper.length;
  lauf(w, 30, S);
  ok(w.koerper.length < n0 || w.ereignisse.length > 0, 'Planet-gegen-Planet führt zu Kollision', `Körper ${n0}→${w.koerper.length}, Ereignisse ${w.ereignisse.length}`);
}
// 6. Sonne verschluckt
{
  const w = erzeugeSystem({ ...STANDARD_SYSTEM, seed: 15, planeten: 3, monde: false });
  const ziel = w.koerper.find((k) => k.art === 'sonne')!;
  werfeAuf(w, ziel.id, { radius: 1, tempo: 40, abstand: 30 });
  lauf(w, 3, S);
  ok(w.ereignisse.some((e) => e.art === 'sonne'), 'Sonne verschluckt Einschlagskörper');
}
// 7. Schalter aus: ohne Kollision keine Ereignisse; ohne Trümmer nur Verschmelzen
{
  const w = erzeugeSystem({ ...STANDARD_SYSTEM, seed: 17, planeten: 4, monde: false });
  const ziel = w.koerper.find((k) => k.art === 'gestein' || k.art === 'gas')!;
  werfeAuf(w, ziel.id, { radius: 0.4, tempo: 200, abstand: 10 });
  lauf(w, 2, { ...S, truemmer: false });
  ok(w.truemmer.n === 0 && w.ereignisse.every((e) => e.art !== 'zerschlagen'), 'Baustein Trümmer aus → nur Verschmelzen');
  const w2 = erzeugeSystem({ ...STANDARD_SYSTEM, seed: 17, planeten: 4, monde: false });
  werfeAuf(w2, w2.koerper.find((k) => k.art === 'gestein' || k.art === 'gas')!.id, { radius: 0.4, tempo: 200, abstand: 10 });
  lauf(w2, 2, { ...S, kollision: false });
  ok(w2.ereignisse.length === 0, 'Baustein Kollision aus → keine Ereignisse');
}
// 8. Leinhardt & Stewart 2012: Formeln gegen sich selbst und gegen die Randfälle der Veröffentlichung
{
  const G = 1, rho = DICHTE, m = 100, r = Math.cbrt(m / rho / (4 / 3 * Math.PI));
  const mt = 2 * m, rC1 = Math.cbrt((3 * mt) / (4 * Math.PI * rho));
  const q1 = qSternRD(mt, 1, G, rho), q6 = qSternGleichMasse(rC1, G, rho, 1.9);
  ok(Math.abs(q1 / q6 - 1) < 1e-12, 'LS12: Q*_RD (Gl. 4) = Gl. (6) für gleiche Massen', `${q1.toFixed(4)} vs ${q6.toFixed(4)}`);
  const vKrit = Math.sqrt(8 * q1);  // zentral, gleiche Massen: Q_R = Mtot V²/8
  const a = leinhardtStewart({ mp: m, mt: m, rp: r, rt: r, v: vKrit, b: 0, G, rho1: rho });
  ok(Math.abs(a.mLr / mt - 0.5) < 1e-9 && a.ausgang === 'erosion', 'LS12: bei Q_R = Q* bleibt die Hälfte der Masse (Definition der Zerstörung)', `Rest ${(a.mLr / mt).toFixed(4)} ${a.ausgang}`);
  const c = leinhardtStewart({ mp: m, mt: m, rp: r, rt: r, v: vKrit * Math.sqrt(1.8), b: 0, G, rho1: rho });
  const d = leinhardtStewart({ mp: m, mt: m, rp: r, rt: r, v: vKrit * Math.sqrt(1.8 + 1e-6), b: 0, G, rho1: rho });
  ok(Math.abs(c.mLr / mt - 0.1) < 1e-6 && Math.abs(d.mLr / mt - 0.1) < 1e-4, 'LS12: stetiger Übergang bei Q_R/Q* = 1,8 (Gl. 11 ↔ 12)', `${(c.mLr / mt).toFixed(5)} / ${(d.mLr / mt).toFixed(5)}`);
  const s = leinhardtStewart({ mp: m, mt: m, rp: r, rt: r, v: vKrit * 5, b: 0, G, rho1: rho });
  ok(s.ausgang === 'superkatastrophal' && s.mLr < 0.1 * mt, 'LS12: sehr schneller Stoß ist superkatastrophal', `${(s.mLr / mt).toFixed(4)}`);
  const lang = leinhardtStewart({ mp: m, mt: 5 * m, rp: r, rt: r * 1.7, v: 0.2 * Math.sqrt(2 * G * 6 * m / (2.7 * r)), b: 0.1, G, rho1: rho });
  ok(lang.ausgang === 'verschmelzen', 'LS12: langsamer Stoß verschmilzt');
  const streif = leinhardtStewart({ mp: m, mt: 5 * m, rp: r, rt: r * 1.7, v: 6 * Math.sqrt(2 * G * 6 * m / (2.7 * r)), b: 0.95, G, rho1: rho });
  ok(streif.ausgang === 'abprall', 'LS12: schneller streifender Stoß = Hit-and-Run', `v/vHr = ${(6 * Math.sqrt(2 * G * 6 * m / (2.7 * r)) / streif.vHr).toFixed(2)}`);
  const streifLangsam = leinhardtStewart({ mp: m, mt: 5 * m, rp: r, rt: r * 1.7, v: 0.5 * Math.sqrt(2 * G * 6 * m / (2.7 * r)), b: 0.95, G, rho1: rho });
  ok(streifLangsam.ausgang === 'verschmelzen', 'LS12: langsamer streifender Stoß = Graze-and-merge');
}
// 9. LS12 im Spiel: Erhaltung und Ausgang
{
  const w = erzeugeSystem({ ...STANDARD_SYSTEM, seed: 21, planeten: 5, monde: false });
  const ziel = w.koerper.find((k) => k.art === 'gestein' || k.art === 'gas')!;
  werfeAuf(w, ziel.id, { radius: ziel.r * 0.8, tempo: 400, abstand: ziel.r * 1.8 + 0.5 });
  const vor = summen(w);
  weltSchritt(w, TEILSCHRITT * 8, 1, S);
  const nach = summen(w);
  const dP = Math.hypot(nach.P[0] - vor.P[0], nach.P[1] - vor.P[1], nach.P[2] - vor.P[2]);
  const ev = w.ereignisse.map((e) => e.art).join(',');
  ok(w.truemmer.n > 0 && ev.includes('zerschlagen'), 'LS12 im Spiel: schneller großer Einschlag erzeugt Trümmer', `${w.truemmer.n} Trümmer, ${ev}`);
  ok(Math.abs(nach.m / vor.m - 1) < 1e-12, 'LS12 im Spiel: Masse erhalten');
  ok(dP / nach.m < 0.02, 'LS12 im Spiel: Impuls erhalten', `ΔP/M=${(dP / nach.m).toExponential(2)}`);
}
// 10. Keine Billard-Geschwindigkeiten: nach gezielten Einschlägen fliegt kein Körper mit absurdem Tempo davon
{
  let maxV = 0;
  for (let s = 1; s <= 16; s++) {
    const w = erzeugeSystem({ ...STANDARD_SYSTEM, seed: s, monde: s % 2 === 0 });
    const ziel = w.koerper.find((k) => k.art === 'gestein')!;
    werfeAuf(w, ziel.id, { radius: 0.3 + 0.2 * (s % 5), tempo: 120 + 40 * (s % 4) });
    for (let t = 0; t < 3; t += 1 / 60) weltSchritt(w, 1 / 60, 1, S);
    for (const k of w.koerper) if (k.art !== 'sonne') maxV = Math.max(maxV, Math.hypot(...k.v));
  }
  ok(maxV < 250, 'Nach Einschlägen fliegt kein Körper mit absurdem Tempo davon', `größtes Tempo ${maxV.toFixed(0)}`);
}
console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Prüfungen bestanden');
process.exit(fehler ? 1 : 0);
