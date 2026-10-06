// Schalter (Kontrollkästchen).
import type { Panel } from '../ui';

export function toggle(app: Panel, key: string, label: string, hint: string): Panel {
  const { row, lab, out } = app.row(key, label, hint);
  out.remove();
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = `ctl-${key}`;
  row.classList.add('row-toggle');
  lab.prepend(input);
  const update = () => { input.checked = Boolean(app.s[key]); };
  input.addEventListener('change', () => { app.s[key] = input.checked; app.onChange(key); });
  app.bindings.push({ key, update, row });
  update();
  return app;
}
