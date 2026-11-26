// Hauptschleife: Bild für Bild (Vorrechnen, Schritte, Darstellung), Start der Rechnung, Vorspulen.
import type { App } from './app';
import { fpsEl, showLoading, loadBar } from './dom';
import { t } from '../i18n';
import { MAX_LOAD_MS, DT, PROBE_STEPS } from './zustand';
import { zuFrueh } from '../grafik/menue';
import { ruht } from './grafik/pfad';
import { abschliessen } from './grafik/sim';

export function starteSchleife(app: App) {
  const loop = async (now: number) => {
    // Bildraten-Deckel; im Hintergrundfenster höchstens 10 fps, wenn „Stillstand sparen“ an ist
    if (zuFrueh(app.S.fxCap, now, app.last) || (app.S.fxIdle && !document.hasFocus() && zuFrueh(10, now, app.last))) { requestAnimationFrame(loop); return; }
    const real = Math.min((now - app.last) / 1000, 0.1);
    app.last = now;
    app.resize();
    app.initIfNeeded();
    if (app.stepMs === 0 && !app.S.paused) await messeSchritt(app);
    if (app.warm > 0 && !app.S.paused) {
      await app.warmBatch();
    } else {
      app.fpsAcc += real; app.fpsFrames++;
      if (app.fpsAcc > 0.5) {
        const lapse = app.S.timeScale !== 1 ? ` · ${t('Zeitraffer', 'time lapse')} ${app.achieved.toFixed(1)}×` : '';
        app.fpsNow = Math.round(app.fpsFrames / app.fpsAcc);
        const echt = app.gfx && app.gfx.echtJe > 1 ? ` · ${t('davon echt gerechnet', 'really rendered')} ${Math.round(app.fpsNow / app.gfx.echtJe)}` : '';
        fpsEl.textContent = `${app.fpsNow} fps${echt}${lapse}`;
        app.fpsAcc = 0; app.fpsFrames = 0;
      }
      if (app.S.fxIdle && ruht(app)) fpsEl.textContent = t('Standbild (nicht neu gezeichnet)', 'still image (not redrawn)');
      else app.frameOnce(real);
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
  abschliessen(app);
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
  showLoading(app.warm > 0);
  app.restored = false;
  if (fresh && app.S.remember) void app.loadState();
}

/** Ohne Einschwingen: einmal wenige Schritte messen, damit „60 fps halten“ die Stufe wählen kann
 *  und die Schritte je Bild (darstellung.ts) eine gemessene Schrittzeit haben. */
async function messeSchritt(app: App) {
  abschliessen(app);
  // Erst zwei Schritte ungemessen: der allererste enthält das Übersetzen der Shader (iGPU gemessen: 313 ms statt ~25 ms je Schritt)
  app.submitStep(); app.submitStep();
  await app.device.queue.onSubmittedWorkDone();
  // Kleinste von drei Messungen: eine fremde Last auf der Grafikkarte (anderer Tab, Messläufe) darf die Automatik nicht
  // zum Abstufen bringen, denn das senkt die Farbauflösung sichtbar. Die kleinste Zeit ist die, die der Schritt selbst braucht.
  let best = Infinity;
  for (let m = 0; m < 3; m++) {
    const t0 = performance.now();
    for (let k = 0; k < PROBE_STEPS; k++) app.submitStep();
    await app.device.queue.onSubmittedWorkDone();
    best = Math.min(best, (performance.now() - t0) / PROBE_STEPS);
  }
  app.stepMs = Math.max(0.01, best);
  if (app.S.autoQuality && !app.calibrated) app.calibrate();
}

/** Vorrechnen: viele Schritte ohne Rendern, GPU-Zeit messen, Qualität kalibrieren. */
export async function warmBatch(app: App) {
  abschliessen(app);
  const n = app.warmRate;
  const t0 = performance.now();
  for (let k = 0; k < n && app.warm > 0; k++, app.warm--) app.submitStep();
  await app.device.queue.onSubmittedWorkDone();
  const ms = (performance.now() - t0) / Math.max(n, 1);
  app.stepMs = app.stepMs > 0 ? app.stepMs * 0.7 + ms * 0.3 : ms;
  app.warmRate = Math.min(1024, Math.max(1, Math.round(40 / app.stepMs)));
  const done = app.warmTotal - app.warm;
  if (app.S.autoQuality && !app.calibrated && done >= 90) app.calibrate();
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
