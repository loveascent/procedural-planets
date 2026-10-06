import { clamp } from '../logik/zufall.js';
import { t } from '../../i18n';


// Hauptschleife: Bildgröße, Auflösungs-Automatik (60 fps halten), ein Schritt je Bild, Rückleseprobe für Prüfbilder.
// ext: { canvas, urlScale, coarse, pointers, cam, runJobs, $, OFFSCREEN, render, RS, buildUI, regenerate, newSeed, changed, fitDist, Q, dynScale*, jobs*, perfAcc*, perfN*, perfT*, last*, spin*, simTime*, device*, budget*, jobDone*, jobTotal*, fpsAcc*, fpsN*, fpsT*, regenBusy*, PP* }  (* = lebender Zustand, per Getter/Setter)
export function createSchleife(ext) {
  const { S, canvas, urlScale, coarse, pointers, cam, runJobs, $, OFFSCREEN, render, RS, buildUI, regenerate, newSeed, changed, fitDist, Q } = ext;
  function resize() {
    const r = canvas.getBoundingClientRect();
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (urlScale) dpr *= urlScale;
    else if (S.quality > 0) dpr *= S.quality;
    else {
      dpr *= ext.dynScale;
      const px = r.width * r.height * dpr * dpr;
      const cap = coarse ? 3.6e6 : 17e6;
      if (px > cap) dpr *= Math.sqrt(cap / px);
    }
    const w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }
  function adaptScale(dt, now) {
    if (S.quality > 0 || urlScale || ext.jobs.length) return;
    ext.perfAcc += dt; ext.perfN++;
    if (now - ext.perfT < 1200) return;
    const ms = 1000 * ext.perfAcc / Math.max(ext.perfN, 1);
    ext.perfAcc = 0; ext.perfN = 0; ext.perfT = now;
    // Starke Grafikkarten: über 100 % hinaus (Supersampling), bis die Bildrate gegen 60 fällt
    if (S.quality === -1) {  // wie v21: nie über 100 %, erst unter ~40 fps herunter
      if (ms > 24 && ext.dynScale > 0.45) ext.dynScale = Math.max(0.45, ext.dynScale * 0.85);
      else if (ms < 14 && ext.dynScale < 1) ext.dynScale = Math.min(1, ext.dynScale * 1.1);
      return;
    }
    const top = coarse ? 1 : 2;
    if (ms > (coarse ? 24 : 17.5) && ext.dynScale > 0.45) ext.dynScale = Math.max(0.45, ext.dynScale * 0.85);
    else if (ms < (coarse ? 14 : 11) && ext.dynScale < top) ext.dynScale = Math.min(top, ext.dynScale * 1.08);
  }
  function step(now) {
    const dt = Math.min(0.1, (now - ext.last) / 1000);
    ext.last = now;
    adaptScale(dt, now);
    resize();
    if (!pointers.size) {
      cam.yaw += cam.vYaw; cam.pitch = clamp(cam.pitch + cam.vPitch, -1.45, 1.45);
      cam.vYaw *= 0.92; cam.vPitch *= 0.92;
    }
    if (S.rotate) ext.spin += S.spin * Math.PI / 180 * dt * Math.pow(clamp((cam.dist - 1) / 1.2, 0, 1), S.spinZoom);
    ext.simTime += dt;
    const enc = ext.device.createCommandEncoder();
    // Erzeugung im Zeitbudget
    if (ext.jobs.length) {
      ext.budget = dt < 0.03 ? Math.min(ext.budget * 1.3, 8e6) : dt > 0.05 ? Math.max(ext.budget * 0.6, 32768) : ext.budget;
      runJobs(enc, ext.budget);
    }
    const gb = $('genbar');
    if (ext.jobs.length) {
      gb.hidden = false;
      $('gen-text').textContent = `${t('Erzeuge Planet', 'Generating planet')} ${Math.round(100 * ext.jobDone / Math.max(ext.jobTotal, 1))} %`;
      $('gen-fill').style.width = `${100 * ext.jobDone / Math.max(ext.jobTotal, 1)}%`;
    } else gb.hidden = true;
    if (!OFFSCREEN) render(enc);          // im Testmodus nur für Fotos zeichnen
    ext.device.queue.submit([enc.finish()]);
    ext.fpsAcc += dt; ext.fpsN++;
    if (now - ext.fpsT > 500) { $('fps').textContent = `${Math.round(ext.fpsN / Math.max(ext.fpsAcc, 1e-3))} fps · ${(1000 * ext.fpsAcc / Math.max(ext.fpsN, 1)).toFixed(2)} ms`; ext.fpsAcc = 0; ext.fpsN = 0; ext.fpsT = now; }
    requestAnimationFrame(step);
  }
  
  // Offscreen-Bild zurücklesen und als PNG liefern
  async function readOut(enc) {
    const w = RS.w, h = RS.h, bpr = Math.ceil(w * 4 / 256) * 256;
    const buf = ext.device.createBuffer({ size: bpr * h, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    enc.copyTextureToBuffer({ texture: RS.out }, { buffer: buf, bytesPerRow: bpr }, [w, h]);
    ext.device.queue.submit([enc.finish()]);
    await buf.mapAsync(GPUMapMode.READ);
    const src = new Uint8Array(buf.getMappedRange());
    const img = new ImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(src.subarray(y * bpr, y * bpr + w * 4), y * w * 4);
    buf.unmap(); buf.destroy();
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').putImageData(img, 0, 0);
    return c.toDataURL('image/png');
  }
  
  // Schnittstelle für Tests und Bildschirmfotos
  const planetsApi = {
    S, get busy() { return ext.jobs.length > 0 || ext.regenBusy > 0; },
    set(k, v) { S[k] = v; if (k === 'style') { buildUI(); regenerate(); } else if (k === 'seed') newSeed(v); else changed({ k }); buildUI(); },
    async finish() {
      await ext.variantenNachziehen();   // Baustein-Varianten fertig übersetzt und eingesetzt, bevor Bilder entstehen
      while (ext.regenBusy > 0 || ext.jobs.length) {
        if (ext.regenBusy > 0) { await new Promise((r) => setTimeout(r, 20)); continue; }
        const enc = ext.device.createCommandEncoder();
        runJobs(enc, Infinity);
        ext.device.queue.submit([enc.finish()]);
      }
      await ext.variantenNachziehen();
      await ext.device.queue.onSubmittedWorkDone();
    },
    shot(opt = {}) {
      if (opt.spin !== undefined) ext.spin = opt.spin;
      if (opt.time !== undefined) ext.simTime = opt.time;
      if (opt.yaw !== undefined) cam.yaw = opt.yaw;
      if (opt.pitch !== undefined) cam.pitch = opt.pitch;
      // Kamera auf das Zentrum der Milchstraße richten (für Testbilder)
      if (opt.core && RS.galCore) { const c = RS.galCore; cam.yaw = Math.atan2(-c[0], -c[2]); cam.pitch = clamp(Math.asin(-c[1]), -1.45, 1.45); }
      if (opt.dist !== undefined) { cam.dist = cam.tDist = opt.dist; cam.zoomed = true; }
      else if (!cam.zoomed) { cam.dist = cam.tDist = fitDist(canvas.width / canvas.height); }
      const enc = ext.device.createCommandEncoder();
      render(enc);
      if (!OFFSCREEN) { ext.device.queue.submit([enc.finish()]); return canvas.toDataURL('image/png'); }
      return readOut(enc);
    },
  };
  
  S.sea = S.sea < 0 ? ext.PP.water : S.sea;
  if (!Q.get('cover')) S.cover = ext.PP.cloudCover;
  buildUI();
  // Start, sobald alle Pipelines übersetzt sind
  return { step, planetsApi };
}
