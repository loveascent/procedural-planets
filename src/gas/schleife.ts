// Hauptschleife: Bild für Bild (Vorrechnen, Schritte, Darstellung), Start der Rechnung, Vorspulen.
import type { App } from './app';
import { fpsEl, showLoading, loadBar } from './dom';
import { t } from '../i18n';
import { S, MAX_LOAD_MS, DT } from './zustand';

export function starteSchleife(app: App) {
  const loop = async (now: number) => {
    const real = Math.min((now - app.last) / 1000, 0.1);
    app.last = now;
    app.resize();
    app.initIfNeeded();
    if (app.warm > 0 && !S.paused) {
      await app.warmBatch();
    } else {
      app.fpsAcc += real; app.fpsFrames++;
      if (app.fpsAcc > 0.5) {
        const lapse = S.timeScale !== 1 ? ` · ${t('Zeitraffer', 'time lapse')} ${app.achieved.toFixed(1)}×` : '';
        app.fpsNow = Math.round(app.fpsFrames / app.fpsAcc);
        fpsEl.textContent = `${app.fpsNow} fps${lapse}`;
        app.fpsAcc = 0; app.fpsFrames = 0;
      }
      app.frameOnce(real);
      app.adaptScale(real);
      // Filmstreifen: das eben gezeichnete Bild abgreifen, solange es noch gültig ist.
      if (app.grab) { const g = app.grab; app.grab = null; await g(); }
      // Im Testmodus bremst kein Canvas die Bildrate, also auf die GPU warten.
      if (app.offscreen) await app.device.queue.onSubmittedWorkDone();
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

export function initIfNeeded(app: App) {
  if (!app.needsInit && !app.needsDye) return;
  const init = app.device.createCommandEncoder();
  if (app.needsInit) { app.time = 0; app.stepAcc = 0; }
  app.writeSim(0, true);
  app.initFields(init, app.needsInit);
  app.device.queue.submit([init.finish()]);
  // Neue Farbe braucht etwas Zeit, bis die Strömung sie verwirbelt hat.
  app.warm = app.needsInit ? app.warmSteps : Math.max(app.warm, Math.min(300, app.warmSteps));
  app.warmTotal = app.warm;
  app.warmStart = performance.now();
  app.manualSkip = false;
  const fresh = app.needsInit;
  app.needsInit = false;
  app.needsDye = false;
  showLoading(true);
  app.restored = false;
  if (fresh && S.remember) void app.loadState();
}

/** Vorrechnen: viele Schritte ohne Rendern, GPU-Zeit messen, Qualität kalibrieren. */
export async function warmBatch(app: App) {
  const n = app.warmRate;
  const t0 = performance.now();
  for (let k = 0; k < n && app.warm > 0; k++, app.warm--) app.submitStep();
  await app.device.queue.onSubmittedWorkDone();
  const ms = (performance.now() - t0) / Math.max(n, 1);
  app.stepMs = app.stepMs > 0 ? app.stepMs * 0.7 + ms * 0.3 : ms;
  app.warmRate = Math.min(1024, Math.max(1, Math.round(40 / app.stepMs)));
  const done = app.warmTotal - app.warm;
  if (S.autoQuality && !app.calibrated && done >= 90) app.calibrate();
  // Ladezeit begrenzen: nicht länger als ~5 s vorrechnen, auch auf langsamen GPUs.
  if (done >= 90 && !app.offscreen && !app.manualSkip) {
    const left = Math.max(0, Math.floor((MAX_LOAD_MS - (performance.now() - app.warmStart)) / app.stepMs));
    if (app.warm > left) { app.warm = left; app.warmTotal = done + left; }
  }
  loadBar.style.width = `${Math.round((100 * (app.warmTotal - app.warm)) / Math.max(app.warmTotal, 1))}%`;
  fpsEl.textContent = '– fps';
  if (app.warm === 0) { showLoading(false); app.manualSkip = false; if (!app.restored) void app.saveState(); app.faceMainStorm(); }
}

/** Vorspulen: Sekunden Simulationszeit ohne Bild vorausrechnen, ohne Ladezeit-Grenze. */
export function skip(app: App, seconds: number) {
  const steps = Math.round(seconds / DT);
  app.warm = steps; app.warmTotal = steps;
  app.warmStart = performance.now();
  app.manualSkip = true;
  showLoading(true);
}
