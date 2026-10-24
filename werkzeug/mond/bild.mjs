// Bildprüfung Mond: rendert Szenen headless (WebGPU, auch ohne GPU per SwiftShader) und speichert PNG.
// Aufruf:  node werkzeug/mond/bild.mjs <Basis-URL> <Ausgabeordner> [name=Abfrage;yaw,pitch,dist;breite x hoehe ...]
//   z. B.   node werkzeug/mond/bild.mjs http://localhost:5173 /tmp/out "erdmond=typ=erdmond&res=512;0,0.1,3.4;900x700"
// CHROME=<Pfad zu chrome> setzen. Fehler der Seite und WebGPU erscheinen in der Ausgabe.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(process.env.NODE_PATH ? process.env.NODE_PATH + '/' : '/usr/lib/node_modules/');
const pw = require('playwright');
const [base, aus, ...szenen] = process.argv.slice(2);
mkdirSync(aus, { recursive: true });
const b = await pw.chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=swiftshader', '--use-vulkan=swiftshader', '--disable-vulkan-surface', '--enable-webgpu-developer-features', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
for (const sz of szenen) {
  const [kopf, cam = '0,0.12,3.4', gr = '900x700', extra = ''] = sz.split(';');
  const [name, abfrage = ''] = [kopf.slice(0, kopf.indexOf('=')), kopf.slice(kopf.indexOf('=') + 1)];
  const [W, H] = gr.split('x').map(Number);
  const p = await b.newPage({ viewport: { width: W + 340, height: H } });
  const fehler = [];
  p.on('console', (m) => { if (m.type() === 'info' && process.env.LAUT) console.log('  ' + m.text().slice(0, 300));
    if (m.type() === 'error' || m.type() === 'warning') { fehler.push(m.text().slice(0, 600)); if (process.env.LAUT) console.log('  [' + m.type() + ']', m.text().slice(0, 500)); } });
  p.on('pageerror', (e) => fehler.push('EXC ' + e.message));
  const t0 = Date.now();
  await p.goto(`${base}/index.html?body=moon&${abfrage}`);
  try { await p.waitForFunction(() => window.mond && window.mond.bereit, null, { timeout: 420000, polling: 500 }); }
  catch (e) { console.log(name, 'TIMEOUT', fehler.slice(0, 5).join('\n')); await p.close(); continue; }
  const [yaw, pitch, dist] = cam.split(',').map(Number);
  const skala = Number(new URLSearchParams(extra).get('skala') || 1);
  const t1 = Date.now();
  const url = await p.evaluate(async ([w, h, yaw, pitch, dist, sk]) => { window.mond.kamera(yaw, pitch, dist); window.mond.halt(0.4); return window.mond.foto(w, h, sk); }, [W, H, yaw, pitch, dist, skala]);
  writeFileSync(`${aus}/${name}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(name, `ok  Karte ${((t1 - t0) / 1000).toFixed(1)} s, Bild ${((Date.now() - t1) / 1000).toFixed(1)} s`, fehler.length ? '\n  ' + fehler.slice(0, 6).join('\n  ') : '');
  await p.close();
}
await b.close();
