// Dauer-Sitzung für Bildprüfung: ein Browser, einmal geladen (die erste Zeichenpipeline braucht ohne echte GPU Minuten zum Übersetzen),
// dann beliebig viele Bilder per HTTP:  curl 'http://127.0.0.1:5190/foto?name=x&w=700&h=560&cam=0.3,0.1,3.4&set=krater_dichte:1.2,eis_an:1&typ=europa&skala=1'
// Start:  CHROME=… NODE_PATH=… node werkzeug/mond/sitzung.mjs <Seiten-URL> <Ausgabeordner> [Port]
import http from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire((process.env.NODE_PATH || '/usr/lib/node_modules') + '/');
const pw = require('playwright');
const [url, aus, port = '5190'] = process.argv.slice(2);
mkdirSync(aus, { recursive: true });
const b = await pw.chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=swiftshader', '--use-vulkan=swiftshader', '--disable-vulkan-surface', '--enable-webgpu-developer-features', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
const log = [];
p.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || m.type() === 'warning') log.push(t.slice(0, 800)); });
p.on('pageerror', (e) => log.push('EXC ' + e.message));
await p.goto(url);
await p.waitForFunction(() => window.mond, null, { timeout: 60000 });
console.log('Seite geladen');
let busy = Promise.resolve();
const srv = http.createServer((req, res) => {
  busy = busy.then(async () => {
    const q = new URL(req.url, 'http://x').searchParams;
    const t0 = Date.now();
    try {
      log.length = 0;
      const name = q.get('name') || 'bild';
      const [w, h] = [Number(q.get('w') || 700), Number(q.get('h') || 560)];
      const [yaw, pitch, dist] = (q.get('cam') || '0.3,0.12,3.4').split(',').map(Number);
      if (q.get('typ')) await p.evaluate((t) => window.mond.vorlage(t), q.get('typ'));
      for (const kv of (q.get('set') || '').split(',').filter(Boolean)) {
        const [k, v] = kv.split(':');
        await p.evaluate(([k, v]) => { const S = window.mond.S; const x = S[k]; return window.mond.setze(k, typeof x === 'boolean' ? v === '1' : typeof x === 'number' ? Number(v) : v); }, [k, v]);
      }
      await p.waitForFunction(() => window.mond.bereit, null, { timeout: 3600000, polling: 1000 });
      const png = await p.evaluate(async ([w, h, yaw, pitch, dist, sk]) => { window.mond.kamera(yaw, pitch, dist); window.mond.halt(0.4); return window.mond.foto(w, h, sk); }, [w, h, yaw, pitch, dist, Number(q.get('skala') || 1)]);
      writeFileSync(`${aus}/${name}.png`, Buffer.from(png.split(',')[1], 'base64'));
      res.end(`ok ${aus}/${name}.png ${((Date.now() - t0) / 1000).toFixed(1)} s\n${log.slice(0, 5).join('\n')}\n`);
    } catch (e) { res.end('FEHLER ' + e.message + '\n' + log.slice(0, 5).join('\n') + '\n'); }
  });
});
srv.listen(Number(port), '127.0.0.1', () => console.log('bereit auf', port));
