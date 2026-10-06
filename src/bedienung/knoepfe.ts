// Knöpfe und Datei-Auswahl.
import type { Panel } from '../ui';

export function buttons(app: Panel, items: [string, string, () => void][], hints: Record<string, string> = {}): Panel {
  const row = document.createElement('div');
  row.className = 'row row-buttons';
  for (const [id, text, fn] of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.id = id;
    b.textContent = text;
    b.addEventListener('click', fn);
    if (hints[id]) {
      b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') app.showTip(b, app.short(hints[id])); });
      b.addEventListener('pointerleave', () => app.hideTip());
      b.addEventListener('focus', () => app.showTip(b, app.short(hints[id])));
      b.addEventListener('blur', () => app.hideTip());
    }
    row.append(b);
  }
  (app.current ?? app.body).append(row);
  return app;
}

export function file(app: Panel, id: string, label: string, hint: string, onFile: (f: File) => void): Panel {
  const { row, lab, out } = app.row(id, label, hint);
  out.remove();
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.id = `ctl-${id}`;
  input.className = 'file';
  lab.htmlFor = input.id;
  row.classList.add('row-file');
  row.append(input);
  input.addEventListener('change', () => { if (input.files?.[0]) onFile(input.files[0]); input.value = ''; });
  return app;
}
