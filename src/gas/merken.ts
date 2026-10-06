// Modul „Zustand merken“: eingeschwungenen Zustand im Browser speichern (IndexedDB) und wieder laden.
import type { App } from './app';
import { showLoading } from './dom';
import { S, VIEW_ONLY, CubeField } from './zustand';

/** Schlüssel: alle Regler, die die Rechnung beeinflussen, plus Lauf-Nummer. Andere Werte = anderer Zustand. */
export function stateKey(app: App): string {
  const o: Record<string, unknown> = { run: app.runSeed, warm: app.warmSteps };
  for (const [k, v] of Object.entries(S)) if (!VIEW_ONLY.has(k)) o[k] = v;
  return JSON.stringify(o);
}

export function db(_app: App): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const q = indexedDB.open('procedural-planets', 1);
    q.onupgradeneeded = () => q.result.createObjectStore('state');
    q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
  });
}

export function fieldsToKeep(app: App): CubeField[] {
  return [app.vel[app.vc], app.prs[app.pc], app.dye[app.dc], app.flow].filter((f): f is CubeField => !!f);
}

export async function readField(app: App, f: CubeField): Promise<ArrayBuffer> {
  const bpr = Math.ceil((f.n * 8) / 256) * 256;
  const buf = app.device.createBuffer({ size: bpr * f.n * 6, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const enc = app.device.createCommandEncoder();
  enc.copyTextureToBuffer({ texture: f.tex }, { buffer: buf, bytesPerRow: bpr, rowsPerImage: f.n }, [f.n, f.n, 6]);
  app.device.queue.submit([enc.finish()]);
  await buf.mapAsync(GPUMapMode.READ);
  const out = buf.getMappedRange().slice(0);
  buf.destroy();
  return out;
}

export async function saveState(app: App) {
  if (!S.remember || app.offscreen) return;
  try {
    const key = app.stateKey();
    const fields = await Promise.all(app.fieldsToKeep().map((f) => app.readField(f)));
    const db = await app.db();
    const tx = db.transaction('state', 'readwrite');
    const st = tx.objectStore('state');
    st.clear();  // nur den letzten Zustand behalten (Speicherplatz)
    st.put({ fields, time: app.time, storms: app.storms, vc: app.vc, pc: app.pc, dc: app.dc }, key);
  } catch (e) { console.warn('Zustand merken:', e); }
}

export async function loadState(app: App) {
  try {
    const key = app.stateKey();
    const db = await app.db();
    const rec = await new Promise<any>((res, rej) => { const q = db.transaction('state').objectStore('state').get(key); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
    if (!rec || key !== app.stateKey()) return;
    const fs = app.fieldsToKeep();
    if (rec.fields.length !== fs.length) return;
    fs.forEach((f, i) => {
      const bpr = Math.ceil((f.n * 8) / 256) * 256;
      if (rec.fields[i].byteLength !== bpr * f.n * 6) throw new Error('size');
      app.device.queue.writeTexture({ texture: f.tex }, rec.fields[i], { bytesPerRow: bpr, rowsPerImage: f.n }, [f.n, f.n, 6]);
    });
    app.time = rec.time; app.storms = rec.storms;
    app.restored = true;
    app.warm = 0; app.warmTotal = 0;
    showLoading(false);
    app.faceMainStorm();
  } catch (e) { console.warn('Zustand laden:', e); }
}
