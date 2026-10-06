// knopfleiste
import type { App } from '../app';
import { canvas } from '../dom';
import { S, DEFAULTS } from '../zustand';
import { t } from '../../i18n';

/** Immer sichtbare Knopfleiste oben im Panel. */
export function buildToolbar(app: App) {
  const bar = document.getElementById('toolbar');
  if (!bar) return;
  bar.innerHTML = '';
  const mk = (id: string, label: string, title: string, fn: () => void) => {
    const b = document.createElement('button');
    b.type = 'button'; b.id = id; b.textContent = label; b.title = title;
    b.addEventListener('click', fn);
    bar.append(b);
    return b;
  };
  mk('btn-warm', t('⏩ 20 s', '⏩ 20 s'), t('20 Sekunden Simulationszeit vorspulen: sofort den eingeschwungenen Zustand sehen.', 'Skip 20 seconds of simulation time: see the settled state right away.'),
    () => app.skip(20));
  mk('btn-warm60', t('⏩ 60 s', '⏩ 60 s'), t('60 Sekunden Simulationszeit vorspulen.', 'Skip 60 seconds of simulation time.'), () => app.skip(60));
  mk('btn-warm600', t('⏩ 600 s', '⏩ 600 s'), t('10 Minuten Simulationszeit vorspulen. Dauert je nach Grafikkarte einige Sekunden.', 'Skip 10 minutes of simulation time. Takes a few seconds depending on the GPU.'), () => app.skip(600));
  const pause = mk('btn-pause', S.paused ? t('▶ Weiter', '▶ Resume') : t('⏸ Pause', '⏸ Pause'), t('Simulation anhalten oder weiterlaufen lassen.', 'Pause or resume the simulation.'), () => {
    S.paused = !S.paused;
    pause.textContent = S.paused ? t('▶ Weiter', '▶ Resume') : t('⏸ Pause', '⏸ Pause');
  });
  mk('btn-reset', t('↻ Neuer Lauf', '↻ New run'), t('Gleicher Planet, gleiche Regler, neu gewürfelte Turbulenz.', 'Same planet, same controls, freshly rolled turbulence.'),
    () => { app.runSeed = Math.floor(Math.random() * 100000); app.needsInit = true; });
}

export function resetSettings(app: App) {
  const keep = { preset: S.preset, quality: S.quality, velRes: S.velRes, dyeRes: S.dyeRes, curlRes: S.curlRes, particles: S.particles, seed: S.seed,
    rndFamily: S.rndFamily, rndBands: S.rndBands, rndStorms: S.rndStorms, rndRings: S.rndRings };
  const retroChanged = S.retro !== DEFAULTS.retro;
  Object.assign(S, DEFAULTS, keep);
  app.applyPreset();
  if (retroChanged) app.spin = -app.spin;
  canvas.classList.toggle('map', S.map);
  app.updateVisibility();
  app.panel.refresh();
  app.buildToolbar();
  app.remember();
}
