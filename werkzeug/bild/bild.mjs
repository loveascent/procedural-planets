// Bildprüfung Gesteinsplanet: rendert die festen Szenen (szenen.mjs) mit fester Zeit/Drehung/Kamera auf der RTX 5080.
// Aufruf:  node werkzeug/bild/bild.mjs <Basis-URL> <Ausgabeordner> [Szenen-Filter]
//   Basis-URL = gebaute Seite, z. B. per `npx vite preview --port 5199` → http://localhost:5199/
// Bricht vor dem Laden ab, wenn der Adapter nicht NVIDIA ist (iGPU nie benutzen). Profil liegt im Temp-Ordner, nie im Repo.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
// BILD_SZENEN=<Datei>: andere Szenenliste (für Versuche), sonst szenen.mjs
const { szenen } = await import(process.env.BILD_SZENEN ? pathToFileURL(resolve(process.env.BILD_SZENEN)).href : './szenen.mjs');

const [base, ausDir, filter = ''] = process.argv.slice(2);
if (!base || !ausDir) { console.error('Aufruf: node bild.mjs <Basis-URL> <Ausgabeordner> [Filter]'); process.exit(1); }
mkdirSync(ausDir, { recursive: true });
const chromePfad = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profil = mkdtempSync(join(tmpdir(), 'bild-profil-'));
const port = 9400 + Math.floor(Math.random() * 300);
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
// Die Seite rechnet im Test nur, was dieses Werkzeug anstößt: requestAnimationFrame läuft nie (Zeit steht auf 0, bis shot() sie setzt),
// Zufall ist eine feste Folge. So sind zwei Läufe desselben Codes bitgleich (vorher streuten die Wirbel je nach Ladezeit).
await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { window.requestAnimationFrame = () => 0; let s = 0x9E3779B9; Math.random = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();` });

const gpu = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).Browser;
await cdp('Page.navigate', { url: base }); await warte(2500);
const vendor = await ausw("navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }).then((a) => a.info.vendor + ' ' + a.info.architecture)");
console.log('Adapter:', vendor, '|', gpu);
if (!/nvidia/i.test(vendor)) { console.error('ABBRUCH: kein NVIDIA-Adapter (nur RTX 5080 erlaubt)'); await ende(3); }

const nachSeed = new Map();
for (const s of szenen.filter((x) => filter.split(',').some((f) => x.name.includes(f)))) { if (!nachSeed.has(s.seed)) nachSeed.set(s.seed, []); nachSeed.get(s.seed).push(s); }
let nGut = 0;
for (const [seed, liste] of nachSeed) {
  await cdp('Page.navigate', { url: `${base.replace(/\/$/, '')}/index.html?body=rocky&scale=1&seed=${seed}` });
  await warte(1500);
  for (let i = 0; i < 120; i++) { if (await ausw('!!(window.planets)')) break; await warte(500); }
  await ausw('window.planets.finish()');
  for (const s of liste) {
    try {
      const url = await ausw(`(async () => {
        const P = window.planets, S = P.S, alt = {};
        for (const k of Object.keys(Object.assign({}, ...${JSON.stringify(s.schritte || [s.set])}))) alt[k] = S[k];
        for (const schritt of ${JSON.stringify(s.schritte || [s.set])}) { for (const [k, v] of Object.entries(schritt)) P.set(k, v); await P.finish(); await new Promise((r) => setTimeout(r, 300)); await P.finish(); }
        const bild = P.shot(${JSON.stringify(s.shot)});
        for (const [k, v] of Object.entries(alt)) P.set(k, v);
        await P.finish();
        return bild;
      })()`);
      writeFileSync(join(ausDir, s.name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
      nGut++; console.log('ok  ', s.name);
    } catch (e) { console.log('FEHLER', s.name, String(e.message).slice(0, 200)); fehler.push(s.name + ': ' + e.message); }
  }
}
if (fehler.length) console.log('Fehler/Ausnahmen:\n' + fehler.slice(0, 10).join('\n'));
console.log(`${nGut} Bilder in ${ausDir}`);
await ende(fehler.length ? 4 : 0);
