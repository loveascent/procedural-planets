// Bildprüfung Gasriese: feste Szenen (szenen.mjs) auf der RTX 5080, vollständig deterministisch.
// Aufruf:  node werkzeug/gas/bild.mjs <Basis-URL> <Ausgabeordner> [Szenen-Filter, kommagetrennt]
// Bricht ab, wenn der Adapter nicht NVIDIA ist. Bildtakt, Uhr und Zufall werden vor dem Laden der Seite ersetzt:
//   requestAnimationFrame läuft nur, wenn dieses Werkzeug ein Bild anstößt (window.__frame), performance.now ist eine feste Uhr,
//   Math.random ist ein festes Zufallsfolge (mulberry32). Dadurch sind zwei Läufe mit gleichem Code bitgleich (gemessen: siehe LIES.txt).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const { szenen, WARM } = await import(process.env.BILD_SZENEN ? pathToFileURL(resolve(process.env.BILD_SZENEN)).href : './szenen.mjs');
const [base, ausDir, filter = ''] = process.argv.slice(2);
if (!base || !ausDir) { console.error('Aufruf: node bild.mjs <Basis-URL> <Ausgabeordner> [Filter]'); process.exit(1); }
mkdirSync(ausDir, { recursive: true });
const chromePfad = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profil = mkdtempSync(join(tmpdir(), 'gas-profil-'));
const port = 9500 + Math.floor(Math.random() * 300);
const chrome = spawn(chromePfad, ['--headless=new', `--user-data-dir=${profil}`, `--remote-debugging-port=${port}`, '--enable-unsafe-webgpu',
  '--force_high_performance_gpu', '--use-angle=d3d11', '--hide-scrollbars', '--window-size=1100,760', 'about:blank'], { stdio: 'ignore' });
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const ende = async (code) => { try { chrome.kill(); } catch { /* schon beendet */ } await warte(300); process.exit(code); };

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
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') fehler.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
});
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; offen.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ausw = async (expr) => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'Fehler in Seite'); return r.result?.result?.value; };
await cdp('Runtime.enable'); await cdp('Page.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 1000, height: 720, deviceScaleFactor: 1, mobile: false });

// vor jedem Laden: Uhr, Bildtakt und Zufall festlegen
await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `
  (() => {
    window.__fakeNow = 0;
    performance.now = () => window.__fakeNow;
    let s = 0x9E3779B9;
    Math.random = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    crypto.getRandomValues = (a) => { for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 4294967296) >>> 0; return a; };
    window.__cb = null;
    window.requestAnimationFrame = (cb) => { window.__cb = cb; return 1; };
    window.__frame = async () => { const cb = window.__cb; window.__cb = null; if (cb) { window.__fakeNow += 1000 / 60; await cb(window.__fakeNow); } };
  })();
` });

await cdp('Page.navigate', { url: base });
await warte(2500);
const vendor = await ausw("navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }).then((a) => a.info.vendor + ' ' + a.info.architecture)");
console.log('Adapter:', vendor);
if (!/nvidia/i.test(vendor)) { console.error('ABBRUCH: kein NVIDIA-Adapter (nur RTX 5080 erlaubt)'); await ende(3); }

const setzen = `(set) => {
  for (const [k, v] of Object.entries(set)) {
    const el = document.getElementById('ctl-' + k);
    if (!el) throw new Error('Regler fehlt: ' + k);
    if (el.type === 'checkbox') { if (el.checked !== v) { el.checked = v; el.dispatchEvent(new Event('change', { bubbles: true })); } }
    else if (el.tagName === 'SELECT') { el.value = String(v); el.dispatchEvent(new Event('change', { bubbles: true })); }
    else { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
  }
}`;
let nGut = 0;
for (const s of szenen.filter((x) => filter.split(',').some((f) => x.name.includes(f)))) {
  try {
    await cdp('Page.navigate', { url: base.replace(/#.*$/, '') + `?lauf=${nGut}-${s.name}#offscreen&warm=${WARM}` });
    await warte(1500);
    for (let i = 0; i < 100 && !(await ausw('!!window.gasPlanet && !!window.__frame')); i++) await warte(300);
    const url = await ausw(`(async () => {
      for (let i = 0; i < 3; i++) await window.__frame();
      (${setzen})(${JSON.stringify(s.set)});
      const done = () => document.getElementById('loading').classList.contains('done');
      let n = 0;
      while (n++ < 4000 && !(done() && window.gasPlanet.frame() > 0)) await window.__frame();
      for (let i = 0; i < ${s.frames}; i++) await window.__frame();
      return await window.gasPlanet.capture();
    })()`);
    if (!url || !url.startsWith('data:image/png')) { const d = await ausw(`JSON.stringify({ lade: document.getElementById('loading')?.className, frame: window.gasPlanet?.frame(), status: document.getElementById('status')?.textContent, hash: location.hash, cb: !!window.__cb })`); throw new Error('kein Bild ' + d); }
    writeFileSync(join(ausDir, s.name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
    nGut++; console.log('ok  ', s.name);
  } catch (e) { console.log('FEHLER', s.name, String(e.message).slice(0, 200)); fehler.push(s.name + ': ' + e.message); }
}
if (fehler.length) console.log('Fehler/Ausnahmen:\n' + fehler.slice(0, 10).join('\n'));
console.log(`${nGut} Bilder in ${ausDir}`);
await ende(fehler.length ? 4 : 0);
