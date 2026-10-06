// Geräteklassen, automatische Qualität und Bildgröße.
import type { App } from './app';
import { t } from '../i18n';
import { loadNote, canvas } from './dom';
import { QUALITY, S, STEP_BUDGET_MS, AUTO_TIERS } from './zustand';

export function applyQuality(a: App, fromUI: boolean) {
  const q = QUALITY[S.quality];
  if (fromUI && q) {
    const f = S.look === 'dye' && q.fluid ? q.fluid : null;
    S.velRes = f ? f.velRes : q.velRes; S.dyeRes = q.dyeRes; S.curlRes = q.curlRes; S.particles = q.particles;
    S.pixelDensity = f ? f.dpr : q.dpr;
    if (q.iterations) S.iterations = q.iterations;
  }
  a.dpr = S.pixelDensity;
  a.allocVel();
  a.allocDye();
  a.allocParticles();
}

/** Einmal pro Start: passt ein Simulationsschritt nicht ins Budget, eine Stufe herunter. */
export function calibrate(a: App) {
  a.calibrated = true;
  if (a.stepMs <= STEP_BUDGET_MS || a.downgrades >= 3) return;
  const idx = AUTO_TIERS.findIndex(([, dye]) => dye < S.dyeRes);
  if (idx < 0) return;
  [S.velRes, S.dyeRes] = AUTO_TIERS[idx];
  a.downgrades++;
  a.allocVel();
  a.allocDye();
  a.panel.refresh();
  a.warmStart = performance.now();
  loadNote.textContent = t(`Qualität für 60 fps angepasst (${S.velRes}² / ${S.dyeRes}²)`, `Quality adjusted for 60 fps (${S.velRes}² / ${S.dyeRes}²)`);
}

/** Dynamische Render-Auflösung: unter 56 fps kleiner, bei stabilen 60 fps langsam wieder größer. */
export function adaptScale(a: App, real: number) {
  if (!S.autoQuality) { a.renderScale = 1; return; }
  a.scaleAcc += real; a.scaleFrames++;
  if (a.scaleAcc < 1) return;
  const fps = a.scaleFrames / a.scaleAcc;
  a.scaleAcc = 0; a.scaleFrames = 0;
  if (fps < 56) { a.renderScale = Math.max(0.5, a.renderScale - 0.1); a.goodSeconds = 0; }
  else if (++a.goodSeconds >= 3 && a.renderScale < 1) { a.renderScale = Math.min(1, a.renderScale + 0.05); a.goodSeconds = 0; }
}

export function resize(a: App) {
  // Pixeldichte direkt aus dem Regler: über der Bildschirmdichte = Supersampling (schärfer, teurer).
  const dpr = a.dpr * (S.autoQuality ? a.renderScale : 1);
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
}
