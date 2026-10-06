// Regler (Schieber) mit Zahlenanzeige, schwere Regler wirken erst beim Loslassen.
import { Panel } from '../ui';

export function range(app: Panel, key: string, label: string, min: number, max: number, step: number, hint: string, fmt: (v: number) => string = (v) => String(v)): Panel {
  const { row, out } = app.row(key, label, hint);
  const input = document.createElement('input');
  input.type = 'range';
  input.id = `ctl-${key}`;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  row.append(input);
  const update = () => { input.value = String(app.s[key]); out.textContent = fmt(Number(app.s[key])); };
  // Teure Regler (Auflösungen, Partikelzahl): beim Ziehen nur die Zahl zeigen, erst beim Loslassen
  // umbauen. Sonst legt jeder Zwischenwert neue GPU-Speicher an und es ruckelt massiv.
  const heavy = Panel.heavy.has(key);
  input.addEventListener('input', () => {
    out.textContent = fmt(Number(input.value));
    if (heavy) return;
    app.s[key] = Number(input.value); app.onChange(key);
  });
  if (heavy) input.addEventListener('change', () => { app.s[key] = Number(input.value); app.onChange(key); });
  app.bindings.push({ key, update, row });
  update();
  return app;
}
