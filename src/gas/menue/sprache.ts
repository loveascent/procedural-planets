// sprache
import type { App } from '../app';
import { initShell } from '../../shell';
import { t, setLang, lang } from '../../i18n';

/** Feste Texte der Seite in der aktuellen Sprache. */
export function applyStaticText(app: App) {
  const ver = document.getElementById('version');
  if (ver) ver.textContent = __VERSION__;
  const set = (id: string, text: string) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set('hint', t('ziehen zum Drehen, Mausrad oder zwei Finger zum Zoomen', 'drag to rotate, scroll or pinch to zoom'));
  set('load-title', t('Atmosphäre wird eingeschwungen', 'Spinning up the atmosphere'));
  set('panel-title', t('Regler', 'Controls'));
  initShell('gas');
  const lb = document.getElementById('lang');
  if (lb) lb.setAttribute('aria-label', t('Sprache: Englisch', 'Language: German'));
  const credits = document.getElementById('credits');
  if (credits) credits.innerHTML = t(
    'Echtzeit-WebGPU, keine Bilddateien. Idee: loveascent. Verfahren nach <a href="https://mofu-dev.com/en/blog/stable-fluids/" target="_blank" rel="noopener">mofu</a>, <a href="https://jasper-r.github.io/gas-giant" target="_blank" rel="noopener">jasper-r</a> und Gaseous Giganticus. <a href="https://github.com/loveascent/procedural-planets" target="_blank" rel="noopener">Quellcode</a>',
    'Real-time WebGPU, no image files. Idea: loveascent. Methods after <a href="https://mofu-dev.com/en/blog/stable-fluids/" target="_blank" rel="noopener">mofu</a>, <a href="https://jasper-r.github.io/gas-giant" target="_blank" rel="noopener">jasper-r</a> and Gaseous Giganticus. <a href="https://github.com/loveascent/procedural-planets" target="_blank" rel="noopener">Source code</a>');
  app.updateInfo();
}

/** Sprache wechseln: Panel neu aufbauen, feste Texte ersetzen. */
export function toggleLang(app: App) {
  setLang(lang === 'de' ? 'en' : 'de');
  app.buildUI();
}
