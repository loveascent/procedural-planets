// Regler-Reaktionen des Gasriesen: was ein Regler auslöst.
import type { App } from './app';
import { canvas } from './dom';
import { newSeed } from '../presets';
import { Key, EDDY_BY_LOOK, RELIEF_BY_LOOK, QUALITY } from './zustand';

export function onChange(app: App, key: Key) {
  app.remember();
  switch (key) {
    case 'preset': if (app.S.preset === 'Zufall') app.S.seed = newSeed(); app.applyPreset(); app.sky.generate(String(app.S.seed) + app.S.preset); app.buildUI(); break;
    case 'rndFamily': case 'rndBands': case 'rndStorms': case 'rndRings':
      if (app.S.preset === 'Zufall') app.applyPreset();
      break;
    case 'quality': {
      // Geräteklasse: Startwerte und Reglergrenzen neu, Panel neu aufbauen.
      app.downgrades = 0; app.renderScale = 1;
      app.applyQuality(true);
      app.buildUI();
      break;
    }
    case 'contrast': app.writeTables(); break;
    case 'remember': try { localStorage.setItem('fgp-remember', app.S.remember ? '1' : '0'); } catch { /* gesperrt */ } if (app.S.remember && app.warm === 0) void app.saveState(); break;
    case 'fineStripes': app.needsDye = true; break;
    case 'velRes': case 'curlRes': app.allocVel(); break;
    case 'dyeRes': app.allocDye(); break;
    case 'particles': app.allocParticles(); break;
    case 'flow': case 'look': if (key === 'look') { const o = Object.values(EDDY_BY_LOOK); if (o.includes(app.S.eddyStrength)) app.S.eddyStrength = EDDY_BY_LOOK[app.S.look] ?? app.S.eddyStrength; if (Object.values(RELIEF_BY_LOOK).includes(app.S.relief)) app.S.relief = RELIEF_BY_LOOK[app.S.look] ?? app.S.relief; app.panel.refresh(); } app.updateVisibility(); app.needsDye = true; if (key === 'look' && QUALITY[app.S.quality]?.fluid) { app.applyQuality(true); app.panel.refresh(); } break;
    case 'retro': app.usePreset(app.preset); app.needsInit = true; break;
    case 'seamless': app.buildPipes(app.S.seamless); break;
    case 'map': canvas.classList.toggle('map', app.S.map); break;
    case 'autoQuality': app.renderScale = 1; break;
    case 'pixelDensity': app.dpr = app.S.pixelDensity; break;
  }
}
