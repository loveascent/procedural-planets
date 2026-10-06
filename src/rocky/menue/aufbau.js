import { Panel } from '../../ui';
import { t, lang } from '../../i18n';
import { initShell } from '../../shell';
import { controls, addItem, itemByKey } from './regler.js';

// Menü: dasselbe Panel wie beim Gasriesen (ⓘ-Erklärung, Blase beim Drüberfahren, Doppelklick = zurücksetzen).
// Regler des anderen Stils stehen ausgegraut in einem eigenen Abschnitt ganz unten.
// Alles, was dem Planeten gehört, kommt über `ext` herein; dieser Baustein kennt weder GPU noch Karten.
// ext: { S, DEF, getPP, newSeed, setStyle, changed, randomSeed, lutCanvas, coarse, $, kopflos }
export function createMenu(ext) {
  const { S, DEF, newSeed, setStyle, changed, randomSeed, lutCanvas, coarse, $ } = ext;
  let panel = null;
  const openState = {};
  function buildUI() {
    const PP = ext.getPP();
    const root = $('panel-body');
    for (const d of root.querySelectorAll('details')) if (d.dataset.id) openState[d.dataset.id] = d.open;
    root.innerHTML = '';
    DEF.sea = PP.water;
    panel = new Panel(root, S, (k) => { if (k === 'style') { setStyle(S.style, true); return; } changed(itemByKey(k)); }, DEF);
    const secs = controls();
    const inactive = [];
    // Kopf: Stil und Seed
    panel.section(t('Stil & Seed', 'Style & seed'), undefined, true);
    panel.select('style', t('Stil', 'Style'), [['plus', t('+20 % besser', '+20 % better')], ['orig', 'Original 1:1 (colordodge)']],
      t('Original 1:1: genau wie das three.js-Vorbild von colordodge. +20 % besser: dieselbe Grundform mit echter Physik für Licht, Wasser, Luft und Gelände.',
        'Original 1:1: exactly like colordodge\'s three.js model. +20 % better: the same base shape with real physics for light, water, air and terrain.'));
    const sr = document.createElement('div');
    sr.className = 'seedrow';
    sr.innerHTML = `<label for="seed">seed</label><input id="seed" type="text" inputmode="numeric" autocomplete="off" spellcheck="false"><button id="rnd" type="button">${t('Zufall', 'Randomize')}</button>`;
    panel.custom(sr);
    sr.querySelector('#seed').value = S.seed;
    sr.querySelector('#seed').addEventListener('change', (e) => newSeed(e.target.value));
    sr.querySelector('#rnd').addEventListener('click', () => newSeed(randomSeed()));
    for (const sec of secs) {
      const act = sec.items.filter((it) => !it.mode || it.mode === S.style);
      for (const it of sec.items) if (it.mode && it.mode !== S.style) inactive.push(it);
      if (!act.length) continue;
      panel.section(sec.title, undefined, sec.id in openState ? openState[sec.id] : !!sec.open);
      root.lastElementChild.dataset.id = sec.id;
      for (const it of act) addItem(panel, it);
      if (sec.id === 'debug') panel.custom(lutCanvas);
    }
    if (inactive.length) {
      panel.section(S.style === 'orig' ? t('Nur in „+20 % besser“', 'Only in “+20 % better”') : t('Nur in „Original 1:1“', 'Only in “Original 1:1”'),
        t('Diese Regler wirken im gewählten Stil nicht.', 'These controls have no effect in the chosen style.'), !!openState.inactive);
      root.lastElementChild.dataset.id = 'inactive';
      root.lastElementChild.classList.add('inactive');
      for (const it of inactive) { addItem(panel, it); panel.disable(it.k, true); }
    }
    if (!ext.kopflos) {   // Kopf, Titel und Fußzeile gehören der Seite des Gesteinsplaneten, nicht der eingebetteten Instanz
    initShell('rocky');
    $('t-title').textContent = t('Gesteinsplanet', 'Rocky planet');
    $('version').textContent = __VERSION__;
    $('panel-title').textContent = t('Regler', 'Controls');
    $('t-hint').textContent = coarse ? t('wischen: drehen · zwei Finger: zoomen', 'swipe: turn · pinch: zoom') : t('ziehen: drehen · Rad: zoomen', 'drag: turn · wheel: zoom');
    $('mode-tag').textContent = S.style === 'orig' ? 'Original 1:1 (colordodge)' : t('+20 % besser', '+20 % better');
    $('credits').innerHTML = t(
      'Echtzeit-WebGPU, keine Bilddateien. Grundform nach <a href="https://github.com/colordodge/ProceduralPlanet" target="_blank" rel="noopener">colordodge/ProceduralPlanet</a> (WTFPL). Idee: loveascent. <a href="https://github.com/loveascent/procedural-planets" target="_blank" rel="noopener">Quellcode</a>',
      'Real-time WebGPU, no image files. Base shape after <a href="https://github.com/colordodge/ProceduralPlanet" target="_blank" rel="noopener">colordodge/ProceduralPlanet</a> (WTFPL). Idea: loveascent. <a href="https://github.com/loveascent/procedural-planets" target="_blank" rel="noopener">Source code</a>');
    document.documentElement.lang = lang;
    }
  }
  return { buildUI, get panel() { return panel; } };
}
