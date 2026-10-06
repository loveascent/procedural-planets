// Geräteklassen, automatische Qualität und Bildgröße.
import type { App } from './app';
import { t } from '../i18n';
import { loadNote, canvas } from './dom';
import { QUALITY, STEP_BUDGET_MS, AUTO_TIERS } from './zustand';

export function applyQuality(a: App, fromUI: boolean) {
  const q = QUALITY[a.S.quality];
  if (fromUI && q) {
    const f = a.S.look === 'dye' && q.fluid ? q.fluid : null;
    a.S.velRes = f ? f.velRes : q.velRes; a.S.dyeRes = q.dyeRes; a.S.curlRes = q.curlRes; a.S.particles = q.particles;
    a.S.pixelDensity = f ? f.dpr : q.dpr;
    if (q.iterations) a.S.iterations = q.iterations;
  }
  a.dpr = a.S.pixelDensity;
  a.allocVel();
  a.allocDye();
  a.allocParticles();
}

/** Einmal pro Start: passt ein Simulationsschritt nicht ins Budget, eine Stufe herunter. */
export function calibrate(a: App) {
  a.calibrated = true;
  if (a.stepMs <= STEP_BUDGET_MS || a.downgrades >= 3) return;
  const idx = AUTO_TIERS.findIndex(([, dye]) => dye < a.S.dyeRes);
  if (idx < 0) return;
  [a.S.velRes, a.S.dyeRes] = AUTO_TIERS[idx];
  a.downgrades++;
  a.allocVel();
  a.allocDye();
  a.panel.refresh();
  a.warmStart = performance.now();
  loadNote.textContent = t(`Qualität für 60 fps angepasst (${a.S.velRes}² / ${a.S.dyeRes}²)`, `Quality adjusted for 60 fps (${a.S.velRes}² / ${a.S.dyeRes}²)`);
}

/** Dynamische Render-Auflösung: unter 56 fps kleiner, bei stabilen 60 fps langsam wieder größer. */
export function adaptScale(a: App, real: number) {
  if (!a.S.autoQuality) { a.renderScale = 1; return; }
  a.scaleAcc += real; a.scaleFrames++;
  if (a.scaleAcc < 1) return;
  const fps = a.scaleFrames / a.scaleAcc;
  a.scaleAcc = 0; a.scaleFrames = 0;
  if (fps < 56) { a.renderScale = Math.max(0.5, a.renderScale - 0.1); a.goodSeconds = 0; }
  else if (++a.goodSeconds >= 3 && a.renderScale < 1) { a.renderScale = Math.min(1, a.renderScale + 0.05); a.goodSeconds = 0; }
}

export function resize(a: App) {
  if (a.kopflos) return;   // eingebettet: Größe legt die Welt fest
  // Pixeldichte direkt aus dem Regler: über der Bildschirmdichte = Supersampling (schärfer, teurer).
  const dpr = a.dpr * (a.S.autoQuality ? a.renderScale : 1);
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
}
