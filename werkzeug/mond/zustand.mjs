// Diagnose: lädt den Mond und druckt alle 3 s den Zustand (Bilder, Karte, Himmel, Meldungen).
import { createRequire } from 'node:module';
const require = createRequire((process.env.NODE_PATH || '/usr/lib/node_modules') + '/');
const pw = require('playwright');
const [url, n = '20'] = process.argv.slice(2);
const b = await pw.chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=swiftshader', '--use-vulkan=swiftshader', '--disable-vulkan-surface', '--enable-webgpu-developer-features', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 740, height: 500 } });
p.on('console', (m) => { if (m.type() !== 'log') console.log('[' + m.type() + ']', m.text().slice(0, 600)); });
p.on('pageerror', (e) => console.log('EXC', e.message));
await p.goto(url);
for (let i = 0; i < Number(n); i++) {
  await new Promise((r) => setTimeout(r, 3000));
  console.log(i, await p.evaluate(() => { const m = window.mond; if (!m) return 'kein mond'; const o = m.motor; return JSON.stringify({ bereit: m.bereit, karte: o.bereit, aktiv: o.bake.aktiv, face: o.bake.face, sky: o.sky.ready, frames: window.__frames, status: document.getElementById('status').textContent.slice(0, 300), fps: document.getElementById('fps').textContent }); }));
}
await b.close();
