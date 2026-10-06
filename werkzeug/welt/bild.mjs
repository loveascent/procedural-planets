// Bildprüfung Welt-Schicht auf der RTX 5080: startet eigenes unsichtbares Chrome, lädt welt.html, fährt Szenen an und speichert Bilder.
// Aufruf:  node werkzeug/welt/bild.mjs <Basis-URL, z. B. http://127.0.0.1:5203/welt.html> <Ausgabeordner> [Szenen, kommagetrennt]
// Bricht ab, wenn der Adapter nicht NVIDIA ist. Gibt Konsolenfehler und die Statuszeile aus.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [base, ausDir, filter = ''] = process.argv.slice(2);
if (!base || !ausDir) { console.error('Aufruf: node bild.mjs <URL> <Ausgabeordner> [Filter]'); process.exit(1); }
mkdirSync(ausDir, { recursive: true });
const chromePfad = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profil = mkdtempSync(join(tmpdir(), 'welt-profil-'));
const port = 9800 + Math.floor(Math.random() * 150);
const chrome = spawn(chromePfad, ['--headless=new', `--user-data-dir=${profil}`, `--remote-debugging-port=${port}`, '--enable-unsafe-webgpu',
  '--force_high_performance_gpu', '--use-angle=d3d11', '--hide-scrollbars', '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const ende = async (code) => { try { chrome.kill(); } catch { /* beendet */ } await warte(300); process.exit(code); };

let ziel;
for (let i = 0; i < 60 && !ziel; i++) { await warte(250); try { ziel = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { /* noch nicht bereit */ } }
if (!ziel) { console.error('Chrome startet nicht'); await ende(2); }
const ws = new WebSocket(ziel.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const offen = new Map(); const fehler = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && offen.has(m.id)) { offen.get(m.id)(m); offen.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') fehler.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) fehler.push(m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
});
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; offen.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ausw = async (expr) => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'Fehler in Seite'); return r.result?.result?.value; };
await cdp('Runtime.enable'); await cdp('Page.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await cdp('Page.navigate', { url: base });
await warte(2500);
const vendor = await ausw("navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }).then((a) => a.info.vendor + ' ' + a.info.architecture)");
console.log('Adapter:', vendor);
if (!/nvidia/i.test(vendor)) { console.error('ABBRUCH: kein NVIDIA-Adapter (nur RTX 5080 erlaubt)'); await ende(3); }

const foto = async (name) => {
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(ausDir, name + '.png'), Buffer.from(r.result.data, 'base64'));
  console.log('Bild', name, '|', await ausw('document.getElementById("welt-status").textContent'));
};
// Szenen: js = Ausdruck in der Seite, danach `sek` Sekunden Echtzeit warten
const szenen = [
  ['01_gesamt', "welt.ste.gesamtansicht(); welt.kam.gier=0.6; welt.kam.neigung=0.5", 6],
  ['02_sonne', "welt.setzeFokus(welt.w.koerper[0].id, 60)", 3],
  ['03_innen', "welt.setzeFokus(welt.w.koerper.find(k=>k.art==='gestein').id)", 3],
  ['04_gas', "welt.setzeFokus(welt.w.koerper.find(k=>k.art==='gas').id)", 3],
  ['05_gas_mit_mond', "(() => { const m = welt.w.koerper.find(k=>k.art==='mond' && welt.w.koerper.find(p=>p.id===k.eltern).art==='gas'); const p = welt.w.koerper.find(x=>x.id===m.eltern); welt.setzeFokus(p.id, p.r*14); })()", 3],
  ['06_einschlag_vorher', "(() => { const p = welt.w.koerper.find(k=>k.art==='gestein'); welt.ste.waehle(p.id); welt.setzeFokus(p.id, p.r*9); welt.E.tempoLog = Math.log10(0.25); welt.wirkt('tempoLog'); welt.ste.asteroid(p.id, 120, 0.8, 'gestein'); })()", 1.25],
  ['07_einschlag', "0", 0.35],
  ['08_truemmer', "0", 1.5],
];
const nur = filter ? filter.split(',') : null;
for (const [name, js, sek] of szenen) {
  if (nur && !nur.some((f) => name.includes(f))) continue;
  try { await ausw(js); } catch (e) { fehler.push('Szene ' + name + ': ' + e.message); }
  await warte(sek * 1000);
  await foto(name);
}
if (process.env.JS) { console.log('JS:', JSON.stringify(await ausw(process.env.JS))); await warte(800); await foto('js'); }
console.log('Konsole:', fehler.length ? '\n' + [...new Set(fehler)].join('\n') : 'keine Fehler');
await ende(fehler.length ? 4 : 0);
