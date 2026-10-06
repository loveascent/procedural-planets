// Sortierung der Regler (alphabetisch) und Suchfeld.
import type { Panel } from '../ui';
import { t } from '../i18n';

/** Regler in jedem Abschnitt alphabetisch; Hinweistexte bleiben oben, Knopfzeilen unten. */
export function sortRows(app: Panel) {
  for (const d of app.body.querySelectorAll('details')) {
    const rows = [...d.children].filter((c) => c.classList.contains('row') && !c.classList.contains('row-buttons') && c.querySelector('label'));
    rows.sort((a, b) => app.labelOf(a).localeCompare(app.labelOf(b), undefined, { sensitivity: 'base' }));
    const first = [...d.children].find((c) => c.tagName !== 'SUMMARY' && !c.classList.contains('note'));
    const mark = document.createComment('');
    d.insertBefore(mark, first ?? null);
    for (const row of rows) d.insertBefore(row, mark);
    mark.remove();
  }
}

/** Suchfeld: zeigt nur Regler, deren Name mit dem Getippten beginnt („s“ → alle mit s, „sb“ → sba, sbc …). */
export function addSearch(app: Panel) {
  const box = document.createElement('input');
  box.type = 'search';
  box.className = 'panel-search';
  box.placeholder = t('Regler suchen …', 'Search controls …');
  box.setAttribute('aria-label', t('Regler suchen', 'Search controls'));
  app.body.prepend(box);
  const opened = new Map<HTMLDetailsElement, boolean>();
  box.addEventListener('input', () => {
    const q = box.value.trim().toLocaleLowerCase();
    for (const d of app.body.querySelectorAll('details')) {
      if (!opened.has(d)) opened.set(d, d.open);
      let any = false;
      for (const row of d.querySelectorAll<HTMLElement>(':scope > .row')) {
        const hit = !q || (!!row.querySelector('label') && app.labelOf(row).startsWith(q));
        row.classList.toggle('search-hide', !hit);
        any ||= hit;
      }
      for (const n of d.querySelectorAll<HTMLElement>(':scope > .note')) n.classList.toggle('search-hide', !!q);
      d.classList.toggle('search-hide', !!q && !any);
      d.open = q ? any : opened.get(d) ?? d.open;
    }
    if (!q) opened.clear();
  });
}
