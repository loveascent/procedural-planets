// sichtbarkeit
import type { App } from '../app';

export function updateVisibility(app: App) {
  const fluid = app.flowMode() === 'fluid', look = app.lookMode();
  for (const k of ['jetRelax', 'omega', 'turbulence', 'turbScale', 'confinement', 'drag', 'iterations', 'velRes', 'bfecc', 'stormSpawn', 'kickLife', 'stormHold']) app.panel.visible(k, fluid);
  for (const k of ['curlStrength', 'curlFreq', 'curlSpeed', 'curlOctaves', 'vortexCount', 'vortexStrength', 'curlRes']) app.panel.visible(k, !fluid);
  for (const k of ['particles', 'lifetime', 'opacity', 'blur', 'viewFocus']) app.panel.visible(k, look !== 'dye');
  app.panel.visible('fade', look === 'pure');
  for (const k of ['bandRelax', 'fineStripes', 'convection', 'stormTint']) app.panel.visible(k, look !== 'pure');
  // Baustein Argh-Volumen: Regler nur, wenn er an ist; die der Karte nur bei „Karte über Wind“
  const argh = app.S.arghOn, karte = argh && app.S.arghSource === 'karte';
  for (const k of ['arghMix', 'arghDensity', 'arghAniso', 'arghSource', 'arghSoft', 'arghShadow']) app.panel.visible(k, argh);
  for (const k of ['arghFoto', 'arghRefQuelle', 'arghRefRes', 'arghRelax', 'arghFlow']) app.panel.visible(k, karte);
  // Mit dem Argh-Volumen entfällt die glatte Oberfläche: ihre Module (Relief, Tiefe, Parallaxe, Dämmerung, Randschimmer, Randverdunkelung) sind ausgehängt
  for (const k of ['relief', 'reliefMulti', 'reliefCoarse', 'reliefFine', 'reliefSize', 'reliefAdapt', 'depthOn', 'depthStrength', 'depthSource', 'pomOn', 'pomHeight', 'pomShadow', 'twilight', 'rimGlow', 'limb']) app.panel.visible(k, !argh);
  // Abschnitte ohne sichtbare Regler ganz ausblenden
  for (const d of document.querySelectorAll<HTMLDetailsElement>('#panel-body details')) {
    const rows = [...d.querySelectorAll<HTMLElement>('.row')];
    d.hidden = rows.length > 0 && rows.every((r) => r.hidden);
  }
}
