import { labelOf, short, showTip, hideTip, openDetail } from './bedienung/tipps';
import { sortRows, addSearch } from './bedienung/suche';
import { section, row, custom, visible, disable } from './bedienung/aufbau';
import { range } from './bedienung/regler';
import { select } from './bedienung/auswahl';
import { toggle } from './bedienung/schalter';
import { buttons, file } from './bedienung/knoepfe';

// Kleines Reglerpanel ohne Abhängigkeiten. Jeder Regler hat einen Erklärtext, der im
// Kasten "Was passiert hier?" erscheint, sobald man den Regler berührt.

export type Settings = Record<string, number | string | boolean>;

export interface Binding { key: string; update: () => void; row: HTMLElement }

export class Panel {
  static heavy = new Set(['velRes', 'dyeRes', 'curlRes', 'particles']);
  bindings: Binding[] = [];
  body: HTMLElement;
  tip: HTMLElement;        // kleine Blase beim Drüberfahren
  detail: HTMLElement;     // Erklärfenster in der Ecke (über ⓘ)
  current: HTMLElement | null = null;

  constructor(
    root: HTMLElement,
    public s: Settings,
    public onChange: (key: string) => void,
    public defaults?: Settings,
  ) {
    // Blase und Erklärfenster liegen fest über der Seite und verschieben nie die Regler.
    document.getElementById('tip')?.remove();
    document.getElementById('detail')?.remove();
    this.tip = document.createElement('div');
    this.tip.id = 'tip';
    this.tip.className = 'tip';
    this.tip.hidden = true;
    this.detail = document.createElement('section');
    this.detail.id = 'detail';
    this.detail.className = 'detail';
    this.detail.hidden = true;
    this.detail.setAttribute('aria-live', 'polite');
    document.body.append(this.tip, this.detail);
    this.body = document.createElement('div');
    this.body.className = 'controls';
    root.append(this.body);
    // Nach dem Aufbau (synchron durch den Aufrufer): Regler je Abschnitt alphabetisch sortieren und Suchfeld davor
    queueMicrotask(() => { this.sortRows(); this.addSearch(); });
  }

  labelOf(row: Element): string { return labelOf(this, row); }

  sortRows() { return sortRows(this); }

  addSearch() { return addSearch(this); }

  short(hint: string): string { return short(this, hint); }

  showTip(anchor: HTMLElement, text: string) { return showTip(this, anchor, text); }

  hideTip() { return hideTip(this); }

  openDetail(title: string, html: string) { return openDetail(this, title, html); }

  section(title: string, note?: string, open = true): Panel { return section(this, title, note, open); }

  row(key: string, label: string, hint: string): { row: HTMLElement; lab: HTMLLabelElement; out: HTMLOutputElement } { return row(this, key, label, hint); }

  range(key: string, label: string, min: number, max: number, step: number, hint: string, fmt: (v: number) => string = (v) => String(v)): Panel { return range(this, key, label, min, max, step, hint, fmt); }

  select(key: string, label: string, options: [string, string][], hint: string): Panel { return select(this, key, label, options, hint); }

  toggle(key: string, label: string, hint: string): Panel { return toggle(this, key, label, hint); }

  buttons(items: [string, string, () => void][], hints: Record<string, string> = {}): Panel { return buttons(this, items, hints); }

  file(id: string, label: string, hint: string, onFile: (f: File) => void): Panel { return file(this, id, label, hint, onFile); }

  custom(el: HTMLElement): Panel { return custom(this, el); }

  visible(key: string, on: boolean) { return visible(this, key, on); }

  disable(key: string, off: boolean) { return disable(this, key, off); }

    refresh() {
    for (const b of this.bindings) b.update();
  }
}
