// sichtbarkeit
import type { App } from '../app';

export function updateVisibility(app: App) {
  const fluid = app.flowMode() === 'fluid', look = app.lookMode();
  for (const k of ['jetRelax', 'omega', 'turbulence', 'turbScale', 'confinement', 'drag', 'iterations', 'velRes', 'bfecc', 'stormSpawn', 'kickLife', 'stormHold']) app.panel.visible(k, fluid);
  for (const k of ['curlStrength', 'curlFreq', 'curlSpeed', 'curlOctaves', 'vortexCount', 'vortexStrength', 'curlRes']) app.panel.visible(k, !fluid);
  for (const k of ['particles', 'lifetime', 'opacity', 'blur', 'viewFocus']) app.panel.visible(k, look !== 'dye');
  app.panel.visible('fade', look === 'pure');
  for (const k of ['bandRelax', 'fineStripes', 'convection', 'stormTint']) app.panel.visible(k, look !== 'pure');
  // Abschnitte ohne sichtbare Regler ganz ausblenden
  for (const d of document.querySelectorAll<HTMLDetailsElement>('#panel-body details')) {
    const rows = [...d.querySelectorAll<HTMLElement>('.row')];
    d.hidden = rows.length > 0 && rows.every((r) => r.hidden);
  }
}
