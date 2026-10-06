// Verlauf, Speichern und Planeten-Code (Rückgängig/Wiederholen, benannte Speicherplätze, Code zum Weitergeben).
import type { App } from './app';
import { t } from '../i18n';
import { canvas } from './dom';
import { Preset } from '../presets';
import { S } from './zustand';

export function snapshot(a: App): string {
  const { paused: _paused, ...rest } = S;
  return JSON.stringify({ v: 1, s: rest, preset: a.preset });
}

/** Nach jeder Änderung (kurz verzögert) einen Stand merken. */
export function remember(a: App) {
  clearTimeout(a.hTimer);
  a.hTimer = window.setTimeout(() => {
    const snap = a.snapshot();
    if (a.history[a.hIndex] === snap) return;
    a.history = a.history.slice(0, a.hIndex + 1);
    a.history.push(snap);
    if (a.history.length > 100) a.history.shift();
    a.hIndex = a.history.length - 1;
    a.updateUndoButtons();
  }, 400);
}

export function undo(a: App) {
if (a.hIndex > 0) { a.hIndex--; a.restore(a.history[a.hIndex]); a.updateUndoButtons(); }
}

export function redo(a: App) {
if (a.hIndex < a.history.length - 1) { a.hIndex++; a.restore(a.history[a.hIndex]); a.updateUndoButtons(); }
}

export function updateUndoButtons(a: App) {
  const u = document.getElementById('btn-undo') as HTMLButtonElement | null;
  const r = document.getElementById('btn-redo') as HTMLButtonElement | null;
  if (u) u.disabled = a.hIndex <= 0;
  if (r) r.disabled = a.hIndex >= a.history.length - 1;
}

/** Einen gespeicherten Stand anwenden; nur neu starten, wenn sich der Planet geändert hat. */
export function restore(a: App, json: string) {
  const snap = JSON.parse(json) as { v: number; s: Partial<typeof S>; preset: Preset };
  const prev = { ...S };
  const prevPreset = JSON.stringify(a.preset);
  // Codes aus v0.3.0 hatten "Schienen": in Strömung + Darstellung übersetzen.
  const old = snap.s as Partial<typeof S> & { track?: string };
  const compat: Partial<typeof S> = old.track === 'fluid' ? { flow: 'fluid', look: 'dye' } : old.track === 'particles' ? { flow: 'curl', look: 'pure' } : {};
  delete old.track;
  Object.assign(S, old, compat, { paused: prev.paused });
  a.buildPipes(S.seamless);
  a.dpr = S.pixelDensity;
  if (prev.retro !== S.retro) a.spin = -a.spin;
  a.usePreset(snap.preset);
  if (prev.velRes !== S.velRes || prev.curlRes !== S.curlRes) a.allocVel();
  if (prev.dyeRes !== S.dyeRes) a.allocDye();
  if (prev.particles !== S.particles) a.allocParticles();
  if (prevPreset !== JSON.stringify(snap.preset) || prev.retro !== S.retro) a.needsInit = true;
  if (prev.flow !== S.flow || prev.look !== S.look) a.needsDye = true;
  if (prev.quality !== S.quality) { a.buildUI(); return; }
  canvas.classList.toggle('map', S.map);
  a.updateVisibility();
  a.panel.refresh();
}

export function encode(_a: App, json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return 'FGP1:' + btoa(bin);
}

export function decode(_a: App, code: string): string {
  const raw = code.trim().replace(/^FGP1:/, '');
  const bin = atob(raw);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function loadSaves(_a: App): { name: string; code: string }[] {
  try { return JSON.parse(localStorage.getItem('fgp-saves') || '[]'); } catch { return []; }
}

export function storeSaves(_a: App, list: { name: string; code: string }[]) {
  try { localStorage.setItem('fgp-saves', JSON.stringify(list)); } catch { /* Speicher gesperrt */ }
}

/** Abschnitt "Speichern": Verlauf, benannte Speicherplätze, Code zum Weitergeben. */
export function buildSaveSection(a: App) {
  const box = document.createElement('div');
  box.className = 'save-box';
  box.innerHTML = `
    <div class="row row-buttons">
      <button id="btn-undo" type="button">${t('↶ Rückgängig', '↶ Undo')}</button>
      <button id="btn-redo" type="button">${t('↷ Wiederholen', '↷ Redo')}</button>
    </div>
    <div class="row row-save">
      <input id="save-name" type="text" maxlength="40" placeholder="${t('Name, z. B. Mein Jupiter', 'Name, e.g. My Jupiter')}">
      <button id="btn-save" type="button">${t('Speichern', 'Save')}</button>
    </div>
    <div class="row row-save">
      <select id="save-list"></select>
      <button id="btn-load" type="button">${t('Laden', 'Load')}</button>
      <button id="btn-delete" type="button" aria-label="${t('Gespeicherten Stand löschen', 'Delete saved state')}">✕</button>
    </div>
    <div class="row row-save">
      <input id="code-in" type="text" placeholder="${t('Planeten-Code einfügen', 'Paste planet code')}">
      <button id="btn-code-load" type="button">${t('Laden', 'Load')}</button>
    </div>
    <div class="row row-buttons">
      <button id="btn-code-copy" type="button">${t('Planeten-Code kopieren', 'Copy planet code')}</button>
    </div>
    <p class="note" id="save-msg" aria-live="polite"></p>`;
  a.panel.custom(box);
  const $ = <T extends HTMLElement>(id: string) => box.querySelector('#' + id) as T;
  const msg = (text: string) => { $('save-msg').textContent = text; };
  const fill = () => {
    const sel = $<HTMLSelectElement>('save-list');
    const list = a.loadSaves();
    sel.innerHTML = list.length ? '' : `<option value="">${t('noch nichts gespeichert', 'nothing saved yet')}</option>`;
    list.forEach((e, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = e.name; sel.append(o); });
  };
  fill();
  $('btn-undo').addEventListener('click', () => a.undo());
  $('btn-redo').addEventListener('click', () => a.redo());
  $('btn-save').addEventListener('click', () => {
    const input = $<HTMLInputElement>('save-name');
    const name = input.value.trim() || `${a.preset.name} · ${new Date().toLocaleString()}`;
    const list = a.loadSaves().filter((e) => e.name !== name);
    list.unshift({ name, code: a.encode(a.snapshot()) });
    a.storeSaves(list.slice(0, 50));
    fill();
    input.value = '';
    msg(t(`Gespeichert: ${name} (nur in diesem Browser).`, `Saved: ${name} (in a browser only).`));
  });
  $('btn-load').addEventListener('click', () => {
    const i = Number($<HTMLSelectElement>('save-list').value);
    const e = a.loadSaves()[i];
    if (!e) return;
    a.restore(a.decode(e.code));
    a.remember();
    msg(t(`Geladen: ${e.name}`, `Loaded: ${e.name}`));
  });
  $('btn-delete').addEventListener('click', () => {
    const i = Number($<HTMLSelectElement>('save-list').value);
    const list = a.loadSaves();
    if (!list[i]) return;
    const [gone] = list.splice(i, 1);
    a.storeSaves(list);
    fill();
    msg(t(`Gelöscht: ${gone.name}`, `Deleted: ${gone.name}`));
  });
  $('btn-code-copy').addEventListener('click', () => {
    const code = a.encode(a.snapshot());
    const input = $<HTMLInputElement>('code-in');
    navigator.clipboard.writeText(code)
      .then(() => msg(t('Code kopiert. Einfügen und „Laden“ stellt genau diesen Planeten wieder her.', 'Code copied. Paste it and press “Load” to restore exactly a planet.')))
      .catch(() => { input.value = code; input.select(); msg(t('Code steht im Feld oben, markiert zum Kopieren.', 'The code is in the field above, selected for copying.')); });
  });
  $('btn-code-load').addEventListener('click', () => {
    try {
      a.restore(a.decode($<HTMLInputElement>('code-in').value));
      a.remember();
      msg(t('Planet aus Code geladen.', 'Planet loaded from code.'));
    } catch {
      msg(t('Das ist kein gültiger Planeten-Code. Er beginnt mit FGP1:', 'That is not a valid planet code. It starts with FGP1:'));
    }
  });
  a.updateUndoButtons();
}
