// Prüft die Trennung der Bausteine im Gesteinsplaneten (Quelle|Verfahren|nach dem Vorbild von app/check.mjs im Branch amazing-edison):
//  (1) Ein Baustein-Ordner src/rocky/<name>/ importiert nur aus sich selbst, aus logik/, shader/ und den gemeinsamen
//      Dateien (../../i18n, ../../ui, ../../shell, ../../sky/…). Nie aus einem anderen Baustein-Ordner.
//  (2) Nur main.js kennt alle Bausteine (und verdrahtet sie).
//  (3) Shader-Dateien: Meldung, welche keine Quelle|Verfahren|nach /Lizenz/Formel-Angabe im Kopf haben (Hinweis, noch kein Fehler).
// Aufruf: node werkzeug/trennung.mjs   – Exit 0 = Trennung eingehalten.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, relative, dirname, sep } from 'node:path';
const root = resolve('src/rocky');
const frei = new Set(['logik', 'shader']);
let fehler = 0; const ohneQuelle|Verfahren|nach  = [];
const walk = (d) => readdirSync(d).flatMap((x) => { const p = join(d, x); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });
for (const datei of walk(root)) {
  const rel = relative(root, datei).split(sep);
  const text = readFileSync(datei, 'utf8');
  const baustein = rel.length > 1 ? rel[0] : null;
  if (rel[0] === 'shader') {
    if (!/Quelle|Verfahren|nach |Verfahren|nach |eigene Umsetzung|Datenlayout|Quadtree|Copyright|MIT|\(19\d\d\)|\(20\d\d\)|Formel|[∂∇Σ]/.test(text.split('\n').slice(0, 14).join('\n')) ) ohneQuelle.push(rel.join('/'));
    continue;
  }
  for (const m of text.matchAll(/(?:import[^'"]*?from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g)) {
    if (!m[1].startsWith('.')) continue;
    const ziel = relative(root, resolve(dirname(datei), m[1].split('?')[0])).split(sep);
    if (ziel[0] === '..') continue;                                   // gemeinsame Dateien außerhalb von rocky (i18n, ui, shell, sky)
    if (baustein && ziel[0] !== baustein && !frei.has(ziel[0])) { console.log(`FEHLER ${rel.join('/')} importiert anderen Baustein: ${m[1]}`); fehler++; }
  }
}
if (ohneQuelle|Verfahren|nach .length) console.log('Hinweis, Shader ohne erkennbare Quelle/Formel im Kopf:\n  ' + ohneQuelle.join('\n  '));
console.log(fehler ? `${fehler} Fehler` : 'OK: Bausteine importieren nur sich selbst, logik/ und shader/');
process.exit(fehler ? 1 : 0);
