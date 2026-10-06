// Auswahlfeld.
import type { Panel } from '../ui';

export function select(app: Panel, key: string, label: string, options: [string, string][], hint: string): Panel {
  const { row, out } = app.row(key, label, hint);
  out.remove();
  const sel = document.createElement('select');
  sel.id = `ctl-${key}`;
  for (const [value, text] of options) {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = text;
    sel.append(o);
  }
  row.classList.add('row-select');
  row.append(sel);
  const update = () => { sel.value = String(app.s[key]); };
  sel.addEventListener('change', () => {
    const num = Number(sel.value);
    app.s[key] = typeof app.s[key] === 'number' && !Number.isNaN(num) ? num : sel.value;
    app.onChange(key);
  });
  app.bindings.push({ key, update, row });
  update();
  return app;
}
