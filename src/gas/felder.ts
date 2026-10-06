// Würfelkarten-Felder (Wind, Druck, Farbstoff, Partikelpuffer) anlegen, mit Rückfall bei zu wenig Grafikspeicher.
import type { App } from './app';
import { t } from '../i18n';
import { loadNote } from './dom';
import { CubeField, S } from './zustand';

export function cubeField(a: App, n: number): CubeField {
  const tex = a.device.createTexture({
    size: [n, n, 6],
    format: 'rgba16float',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
  });
  return {
    tex, n,
    cube: tex.createView({ dimension: 'cube' }),
    store: tex.createView({ dimension: '2d-array' }),
  };
}

export function allocVel(a: App) {
  for (const f of [...a.vel, ...a.prs]) f.tex.destroy();
  a.aux?.tex.destroy(); a.div?.tex.destroy(); a.flow?.tex.destroy();
  const n = S.velRes;
  a.device.pushErrorScope('out-of-memory');
  a.vel = [a.cubeField(n), a.cubeField(n)];
  a.prs = [a.cubeField(n), a.cubeField(n)];
  a.aux = a.cubeField(n);
  a.div = a.cubeField(n);
  a.flow = a.cubeField(S.curlRes);
  a.needsInit = true;
  // Zu wenig Grafikspeicher: Auflösung halbieren statt abzustürzen.
  a.device.popErrorScope().then((err) => {
    if (!err) return;
    if (S.curlRes > 256) S.curlRes = Math.max(256, (S.curlRes / 2) | 0); else S.velRes = Math.max(32, (S.velRes / 2) | 0);
    a.memoryNote();
    a.allocVel();
  });
}

export function memoryNote(a: App) {
  a.panel?.refresh();
  const el = document.getElementById('diag-msg') ?? loadNote;
  el.textContent = t('Nicht genug Grafikspeicher: Auflösung automatisch halbiert.', 'Not enough GPU memory: resolution halved automatically.');
}

export function allocDye(a: App) {
  for (const f of a.dye) f.tex.destroy();
  a.device.pushErrorScope('out-of-memory');
  a.dye = [a.cubeField(S.dyeRes), a.cubeField(S.dyeRes)];
  a.device.popErrorScope().then((err) => {
    if (!err || S.dyeRes <= 128) return;
    S.dyeRes = Math.max(128, (S.dyeRes / 2) | 0);
    a.memoryNote();
    a.allocDye();
  });
  // Nur die Wolkenfarbe neu aufsetzen, der Wind läuft weiter.
  a.needsDye = true;
}

export function allocParticles(a: App) {
  const want = Math.min(S.particles, Math.floor(a.device.limits.maxStorageBufferBindingSize / 32));
  S.particles = want;
  if (want <= a.partCapacity) return;
  a.parts?.destroy();
  a.device.pushErrorScope('out-of-memory');
  a.parts = a.device.createBuffer({ size: want * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  a.partCapacity = want;
  // Zu wenig Grafikspeicher: halbieren statt abzustürzen, und im Regler anzeigen.
  a.device.popErrorScope().then((err) => {
    if (!err || want <= 16384) return;
    a.partCapacity = 0;
    S.particles = Math.max(16384, Math.floor(want / 2 / 16384) * 16384);
    a.allocParticles();
    a.panel?.refresh();
    loadNote.textContent = t(`Nicht genug Grafikspeicher: ${S.particles} Partikel`, `Not enough GPU memory: ${S.particles} particles`);
  });
}
