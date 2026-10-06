// Menü des Gasriesen: Regler, Erklärungen, Steckbrief, Knopfleiste, Sprachwechsel.
import type { App } from './app';
import type { MenueKontext } from './menue/kontext';
import { abschnittPlanet } from './menue/planet';
import { abschnittZufall } from './menue/zufall';
import { abschnittVerfahren } from './menue/verfahren';
import { abschnittZeit } from './menue/zeit';
import { abschnittWind } from './menue/wind';
import { abschnittStuerme } from './menue/stuerme';
import { abschnittWolkenfarbe } from './menue/wolkenfarbe';
import { abschnittCurl } from './menue/curl';
import { abschnittPartikel } from './menue/partikel';
import { abschnittRelief } from './menue/relief';
import { abschnittLicht } from './menue/licht';
import { abschnittGpu } from './menue/gpu';
import { Panel } from '../ui';
import { t } from '../i18n';
import { Key, S, DEFAULTS } from './zustand';

export function buildUI(app: App) {
  const root = document.getElementById('panel-body') as HTMLElement;
  root.innerHTML = '';
  const on = (key: string) => app.onChange(key as Key);
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  const f2 = (v: number) => v.toFixed(2);
  const f3 = (v: number) => v.toFixed(3);
  const n = (v: number) => (v >= 1e6 ? `${(v / 1048576).toFixed(v % 1048576 ? 2 : 0)} ${t('Mio.', 'M')}` : v >= 1e3 ? `${Math.round(v / 1024)} k` : String(v));
  // Formel unter dem Erklärtext: was im Code wirklich gerechnet wird.
  const fx = (f: string) => `<code class="fx">${f}</code>`;
  const presetName = (name: string) => ({ Neptun: t('Neptun', 'Neptune'), 'Heißer Jupiter': t('Heißer Jupiter', 'Hot Jupiter') } as Record<string, string>)[name] ?? name;
  // Alle Regler gehen immer bis zum Maximum; "Gerät" setzt nur die Startwerte.
  const lim = { velRes: 1024, dyeRes: 8192, curlRes: 4096, particles: 67108864 };

  app.panel = new Panel(root, S as unknown as Record<string, number | string | boolean>, on, DEFAULTS as unknown as Record<string, number | string | boolean>);
  const k: MenueKontext = { app, pct, f2, f3, n, fx, presetName, lim };
  const p = app.panel;
  abschnittPlanet(p, k);
  abschnittZufall(p, k);
  abschnittVerfahren(p, k);
  abschnittZeit(p, k);
  abschnittWind(p, k);
  abschnittStuerme(p, k);
  abschnittWolkenfarbe(p, k);
  abschnittCurl(p, k);
  abschnittPartikel(p, k);
  abschnittRelief(p, k);
  abschnittLicht(p, k);
  abschnittGpu(p, k);
  app.panel.section(t('Speichern und Rückgängig', 'Save and undo'), t('Strg+Z / Strg+Y machen Änderungen rückgängig. Doppelklick auf einen Reglernamen setzt nur diesen zurück.', 'Ctrl+Z / Ctrl+Y undo and redo. Double-click a control name to reset just that control.'));
  app.buildSaveSection();
  app.panel.section(t('Diagnose', 'Diagnostics'), undefined, false)
    .buttons([
      ['btn-film', t('🎞 Filmstreifen aufnehmen', '🎞 Record film strip'), () => app.recordFilmstrip()],
      ['btn-selftest', t('Kanten-Selbsttest', 'Seam self-test'), () => app.runSelftest()],
    ], {
      'btn-film': t('Nimmt 8 Bilder im Abstand von 2 s auf und speichert sie als ein PNG mit Einstellungen und fps. Zeigt Bewegung, die ein einzelnes Standbild nicht zeigt. Gut zum Anhängen an ein GitHub-Issue.',
        'Takes 8 frames 2 s apart and saves them as one PNG with settings and fps. Shows motion a single still cannot. Good for attaching to a GitHub issue.'),
      'btn-selftest': t('Misst auf deiner Grafikkarte, ob die Cubemap-Abtastung an Würfelkanten nahtlos ist. Wenn nicht, schaltet er die exakte Abtastung ein.',
        'Measures on your GPU whether cube-map sampling is seamless at cube edges. If not, it turns on exact sampling.'),
    })
    .toggle('seamless', t('Exakte Kanten', 'Exact edges'),
      t('Tastet an Würfelkanten die Nachbartexel einzeln ab, statt der Hardware zu vertrauen. Nur nötig, wenn der Selbsttest eine Naht findet; kostet etwas Leistung.',
        'Samples neighbouring texels one by one at cube edges instead of trusting the hardware. Only needed if the self-test finds a seam; costs some performance.'))
    .custom(app.diagNote());
  app.buildToolbar();
  app.updateVisibility();
  app.applyStaticText();
}








