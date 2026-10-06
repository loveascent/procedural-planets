// Misst, wie stark die Bahnelemente von Teilschritt zu Teilschritt schwanken (Zittern der Bahnlinien): node werkzeug/welt/linien_ruhe.ts
import { erzeugeSystem, STANDARD_SYSTEM } from '../../src/welt/physik/system.ts';
import { weltSchritt } from '../../src/welt/physik/schritt.ts';
import { bahnelemente } from '../../src/welt/zeichnen/spuren.ts';
import { finde } from '../../src/welt/physik/koerper.ts';

const w = erzeugeSystem({ ...STANDARD_SYSTEM, seed: 3 });
const S = { planetenZiehen: false, kollision: true, truemmer: true, ls12: true };
const sonne = w.koerper[0];
let schlechtestA = 0, schlechtestE = 0, schlechtestMond = 0;
const erste = new Map<number, any>();
for (const k of w.koerper) { if (k.art === 'sonne') continue; const z = (k.eltern >= 0 ? finde(w, k.eltern) : sonne)!; erste.set(k.id, bahnelemente(k, z)); }
for (let i = 0; i < 600; i++) {
  weltSchritt(w, 1 / 60, 1, S);
  for (const k of w.koerper) {
    if (k.art === 'sonne') continue;
    const z = (k.eltern >= 0 ? finde(w, k.eltern) : sonne)!;
    const el = bahnelemente(k, z), e0 = erste.get(k.id);
    if (!el || !e0) continue;
    const da = Math.abs(el.a / e0.a - 1), de = Math.abs(el.e - e0.e);
    if (k.art === 'mond') schlechtestMond = Math.max(schlechtestMond, da); else { schlechtestA = Math.max(schlechtestA, da); schlechtestE = Math.max(schlechtestE, de); }
  }
}
console.log(`Planeten: max Schwankung a ${(schlechtestA * 100).toFixed(3)} %, e ${schlechtestE.toFixed(4)}; Monde: max a ${(schlechtestMond * 100).toFixed(2)} %`);
