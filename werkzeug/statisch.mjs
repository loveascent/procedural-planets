// Statische Prüfung auf undefinierte Namen in src/rocky/** (fängt vergessene Zugriffe nach einem Schnitt, die ein Lauf nicht trifft).
// Aufruf: node werkzeug/statisch.mjs   – Exit 0 = sauber. WebGPU-Konstanten (GPUTextureUsage …) und __VERSION__ sind Browser-/Build-Globale.
import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const walk = (d) => readdirSync(d).flatMap((x) => { const p = join(d, x); return statSync(p).isDirectory() ? (x === 'shader' ? [] : walk(p)) : p.endsWith('.js') ? [p] : []; });
const dateien = walk('src/rocky');
let aus = '';
try { execSync(`npx tsc --allowJs --checkJs --noEmit --target es2022 --module esnext --moduleResolution bundler --skipLibCheck --lib es2022,dom ${dateien.join(' ')}`, { stdio: 'pipe' }); }
catch (e) { aus = String(e.stdout); }
const treffer = aus.split('\n').filter((l) => /TS2304|TS2552|TS18004|TS2448|TS2454/.test(l) && !/GPU(Texture|Buffer|MapMode|ShaderStage|ColorWrite)|__VERSION__/.test(l) && l.startsWith('src/rocky'));
console.log(treffer.length ? treffer.join('\n') : 'OK: keine undefinierten Namen in src/rocky');
process.exit(treffer.length ? 1 : 0);
