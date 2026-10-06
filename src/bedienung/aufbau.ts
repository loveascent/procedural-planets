// Aufbau des Panels: Abschnitte, Zeilen, eigene Elemente, Sichtbarkeit.
import type { Panel } from '../ui';
import { t } from '../i18n';

export function section(app: Panel, title: string, note?: string, open = true): Panel {
  const d = document.createElement('details');
  d.open = open;
  const sum = document.createElement('summary');
  sum.textContent = title;
  d.append(sum);
  if (note) {
    const p = document.createElement('p');
    p.className = 'note';
    p.textContent = note;
    d.append(p);
  }
  app.body.append(d);
  app.current = d;
  return app;
}

export function row(app: Panel, key: string, label: string, hint: string): { row: HTMLElement; lab: HTMLLabelElement; out: HTMLOutputElement } {
  const row = document.createElement('div');
  row.className = 'row';
  const lab = document.createElement('label');
  lab.htmlFor = `ctl-${key}`;
  lab.textContent = label;
  const out = document.createElement('output');
  out.htmlFor = `ctl-${key}`;
  row.append(lab, out);
  const reset = app.defaults && key in app.defaults ? t(' Doppelklick auf den Namen setzt nur diesen Regler zurück.', ' Double-click the name to reset just app control.') : '';
  const info = document.createElement('button');
  info.type = 'button';
  info.className = 'info';
  // Kreis mit „i“ als Vektor-Symbol, folgt der Textfarbe
  info.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="4.8" r="1" fill="currentColor"/><path d="M8 7.2v4.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  info.setAttribute('aria-label', `${t('Erklärung', 'Explanation')}: ${label}`);
  info.addEventListener('click', (e) => { e.preventDefault(); app.openDetail(label, `${hint}<p class="reset-hint">${reset}</p>`); });
  lab.after(info);
  const short = app.short(hint);
  const show = () => app.showTip(row, short);
  // Doppelklick auf den Namen: nur diesen Regler auf den Standard zurücksetzen
  lab.addEventListener('dblclick', (e) => {
    if (!app.defaults || !(key in app.defaults)) return;
    e.preventDefault();
    app.s[key] = app.defaults[key];
    app.refresh();
    app.onChange(key);
  });
  row.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(); });
  row.addEventListener('pointerleave', () => app.hideTip());
  row.addEventListener('focusin', show);
  row.addEventListener('focusout', () => app.hideTip());
  (app.current ?? app.body).append(row);
  return { row, lab, out };
}

/** Beliebiges eigenes Element in den aktuellen Abschnitt setzen. */
export function custom(app: Panel, el: HTMLElement): Panel {
  (app.current ?? app.body).append(el);
  return app;
}

/** Blendet Regler ein/aus, z. B. Partikel-Regler nur im Partikel-Modus. */
export function visible(app: Panel, key: string, on: boolean) {
  for (const b of app.bindings) if (b.key === key) b.row.hidden = !on;
}

/** Regler, die im aktuellen Modus nichts bewirken: ausgegraut und nicht bedienbar. */
export function disable(app: Panel, key: string, off: boolean) {
  for (const b of app.bindings) if (b.key === key) {
    b.row.classList.toggle('off', off);
    for (const el of b.row.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select')) el.disabled = off;
  }
}
