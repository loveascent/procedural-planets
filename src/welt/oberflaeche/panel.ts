// Bedienfeld der Welt-Seite: Zeit, Ansicht, Szenarien, Bausteine (Schalter), Info. Nur DOM, keine Physik und keine Grafik.
import { BAUSTEINE, type Schalter } from '../bausteine.ts';
import type { Art, Koerper, Welt } from '../physik/koerper.ts';

export interface Steuerung {
  schalter: Schalter;
  setzeSchalter(key: string, an: boolean): void;
  tempo(): number; setzeTempo(t: number): void;
  pause(): boolean; setzePause(p: boolean): void;
  koerper(): Koerper[]; auswahl(): number | null; fokus(): number | null;
  waehle(id: number | null): void;
  fliegeHin(id: number): void; gesamtansicht(): void;
  welt(): Welt;
  seed(): number; neuesSystem(seed: number): void;
  asteroid(zielId: number | null, tempo: number, radius: number, art: Art): number | null;
  planetGegenNachbar(tempo: number): boolean;
  info(): { fps: number; teilschritte: number; voll: string[]; punkte: number; backen: number; koerper: number; truemmer: number; zeit: number; verworfen: number; ereignisse: number };
}

const el = <T extends HTMLElement>(tag: string, attr: Record<string, string> = {}, text = ''): T => {
  const e = document.createElement(tag) as T;
  for (const [k, v] of Object.entries(attr)) e.setAttribute(k, v);
  if (text) e.textContent = text;
  return e;
};

export function baueOberflaeche(s: Steuerung) {
  const wurzel = document.getElementById('panel') as HTMLElement;
  const abschnitt = (titel: string, offen = true) => {
    const d = el<HTMLDetailsElement>('details'); d.open = offen;
    d.appendChild(el('summary', {}, titel));
    wurzel.appendChild(d);
    return d;
  };
  const zeile = (p: HTMLElement) => { const z = el('div', { class: 'z' }); p.appendChild(z); return z; };
  const knopf = (p: HTMLElement, text: string, fn: () => void, titel = '') => { const b = el<HTMLButtonElement>('button', titel ? { title: titel } : {}, text); b.addEventListener('click', fn); p.appendChild(b); return b; };
  const regler = (p: HTMLElement, name: string, min: number, max: number, wert: number, fmt: (v: number) => string, fn: (v: number) => void, step = 0.01) => {
    const z = zeile(p);
    const l = el('label', {}, name); const out = el('span', { class: 'w' }, fmt(wert));
    const i = el<HTMLInputElement>('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(wert) });
    i.addEventListener('input', () => { const v = parseFloat(i.value); out.textContent = fmt(v); fn(v); });
    l.appendChild(out); z.appendChild(l); z.appendChild(i);
    return i;
  };

  // --- Zeit ---
  const zeit = abschnitt('Zeit');
  regler(zeit, 'Tempo', -1.3, 1.6, Math.log10(s.tempo()), (v) => `×${Math.pow(10, v).toFixed(2)}`, (v) => s.setzeTempo(Math.pow(10, v)));
  const z1 = zeile(zeit);
  const pauseKnopf = knopf(z1, 'Pause', () => { s.setzePause(!s.pause()); pauseKnopf.textContent = s.pause() ? 'Weiter' : 'Pause'; });

  // --- Ansicht ---
  const ansicht = abschnitt('Ansicht');
  const auswahlFeld = el<HTMLSelectElement>('select');
  ansicht.appendChild(auswahlFeld);
  auswahlFeld.addEventListener('change', () => { const id = parseInt(auswahlFeld.value, 10); if (id) s.waehle(id); });
  const z2 = zeile(ansicht);
  knopf(z2, 'Hinfliegen', () => { const id = s.auswahl(); if (id !== null) s.fliegeHin(id); }, 'Taste F oder Doppelklick');
  knopf(z2, 'Gesamtansicht', () => s.gesamtansicht(), 'Taste Esc');
  const infoKasten = el('div', { class: 'info' }); ansicht.appendChild(infoKasten);

  // --- Szenarien ---
  const sz = abschnitt('Kollisionen auslösen');
  let tempoStoss = 120, radiusStoss = 0.6;
  regler(sz, 'Einschlagtempo', 5, 400, tempoStoss, (v) => v.toFixed(0), (v) => { tempoStoss = v; }, 1);
  regler(sz, 'Größe des Brockens', 0.2, 3, radiusStoss, (v) => v.toFixed(2), (v) => { radiusStoss = v; }, 0.05);
  const z3 = zeile(sz);
  knopf(z3, 'Gesteinsbrocken → Auswahl', () => s.asteroid(null, tempoStoss, radiusStoss, 'gestein'));
  knopf(z3, 'Gasbrocken → Auswahl', () => s.asteroid(null, tempoStoss, Math.max(radiusStoss, 1.2), 'gas'));
  const z4 = zeile(sz);
  knopf(z4, 'Auswahl gegen Nachbarplanet', () => s.planetGegenNachbar(Math.max(20, tempoStoss * 0.5)), 'Der nächste Nachbar bekommt Kurs auf die Auswahl');
  const z5 = zeile(sz);
  const seedFeld = el<HTMLInputElement>('input', { type: 'number', value: String(s.seed()), min: '1', step: '1' });
  seedFeld.style.width = '5.5em';
  z5.appendChild(seedFeld);
  knopf(z5, 'Neues System', () => s.neuesSystem(Math.max(1, parseInt(seedFeld.value, 10) || 1)));
  knopf(z5, 'Würfeln', () => { seedFeld.value = String(1 + Math.floor(Math.random() * 99999)); s.neuesSystem(parseInt(seedFeld.value, 10)); });
  const ereignisKasten = el('div', { class: 'ereignisse' }); sz.appendChild(ereignisKasten);

  // --- Bausteine ---
  const bs = abschnitt('Bausteine (einzeln schaltbar)');
  for (const b of BAUSTEINE) {
    const z = el('label', { class: 'bs', title: b.text });
    const c = el<HTMLInputElement>('input', { type: 'checkbox' }); c.checked = s.schalter[b.schluessel];
    c.addEventListener('change', () => s.setzeSchalter(b.schluessel, c.checked));
    z.appendChild(c); z.appendChild(el('span', {}, b.name + (b.wirkt === 'neustart' ? ' ↻' : '')));
    bs.appendChild(z);
  }
  bs.appendChild(el('div', { class: 'klein' }, '↻ = erzeugt das System neu. Aus = der Baustein wird nicht aufgerufen bzw. nicht mitkompiliert.'));

  // --- Aktualisieren ---
  let listeKey = '';
  const hudStatus = document.getElementById('status') as HTMLElement;
  setInterval(() => {
    const K = s.koerper();
    const key = K.map((k) => k.id).join(',');
    if (key !== listeKey) {
      listeKey = key;
      auswahlFeld.textContent = '';
      auswahlFeld.appendChild(el('option', { value: '0' }, '– Körper wählen –'));
      for (const k of K) auswahlFeld.appendChild(el('option', { value: String(k.id) }, (k.art === 'mond' ? '   ' : '') + k.name));
    }
    const a = s.auswahl();
    auswahlFeld.value = String(a ?? 0);
    const k = a === null ? undefined : K.find((x) => x.id === a);
    infoKasten.textContent = k
      ? `${k.name} · ${{ sonne: 'Stern', gas: 'Gasriese', gestein: 'Gesteinsplanet', mond: 'Mond' }[k.art]} · Radius ${k.r.toFixed(2)} · Masse ${k.m.toFixed(0)} · Tempo ${Math.hypot(k.v[0], k.v[1], k.v[2]).toFixed(1)}`
      : 'Klick auf einen Körper wählt ihn, Doppelklick fliegt hin.';
    const w = s.welt();
    ereignisKasten.textContent = w.ereignisse.slice(-5).reverse().map((e) => `${e.zeit.toFixed(1)} s · ${{ verschmelzen: 'verschmolzen', zerschlagen: 'zerschlagen', sonne: 'in die Sonne', truemmer: 'Trümmer' }[e.art]} · ${e.text}`).join('\n');
    const i = s.info();
    hudStatus.textContent = `${i.fps.toFixed(0)} fps · ${i.koerper} Körper · ${i.truemmer} Trümmer · voll: ${i.voll.join(', ') || '–'} · Punkte: ${i.punkte}${i.backen ? ` · backe ${i.backen}` : ''} · t ${i.zeit.toFixed(0)} s`;
  }, 250);
}
