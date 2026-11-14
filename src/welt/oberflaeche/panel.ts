// Bedienfeld der Welt: dasselbe Panel wie bei den Planeten-Seiten (Erklärungen, Doppelklick = zurücksetzen, Suche).
// Abschnitte: Zeit, Ansicht, Kollisionen, Qualität, Bausteine. Die Regler der echten Planeten kommen darunter aus ihren eigenen Menüs.
import { Panel, type Settings } from '../../ui.ts';
import { BAUSTEINE } from '../bausteine.ts';
import { FELS_BAUSTEINE, GAS_BAUSTEINE } from '../typBausteine.ts';
import type { Art, Koerper, Welt } from '../physik/koerper.ts';
import { alsCode, alsDatei, ausCode, ausDatei, legeAb, plaetze, type WeltStand } from '../speichern.ts';

export interface Steuerung {
  fakten(id: number): [string, string][];
  editorUrl(id: number): string | null;
  holeStand(name?: string): WeltStand;
  ladeStand(s: WeltStand): void;
  koerper(): Koerper[]; auswahl(): number | null; fokus(): number | null;
  waehle(id: number | null): void;
  fliegeHin(id: number): void; gesamtansicht(): void;
  welt(): Welt;
  seed(): number; neuesSystem(seed: number): void;
  asteroid(zielId: number | null, tempo: number, radius: number, art: Art): number | null;
  planetGegenNachbar(tempo: number): boolean;
  info(): { gas?: string; fels?: string; fps: number; teilschritte: number; voll: string[]; punkte: number; backen: number; koerper: number; truemmer: number; zeit: number; verworfen: number; ereignisse: number };
}

/** Startwerte der Zahlen-Einstellungen der Welt (die Schalter stehen in `bausteine.ts`). */
export const WELT_STANDARD = { nurAuswahl: false, einschwingen: 0, qualitaet: 'mittel', tempoLog: Math.log10(0.05), pause: false, aufl: 1, anPx: 90, stoss: 120, stossR: 0.6 };

const el = <T extends HTMLElement>(tag: string, attr: Record<string, string> = {}, text = ''): T => {
  const e = document.createElement(tag) as T;
  for (const [k, v] of Object.entries(attr)) e.setAttribute(k, v);
  if (text) e.textContent = text;
  return e;
};

export function baueOberflaeche(s: Steuerung, E: Settings, standard: Settings, wirkt: (key: string) => void) {
  const wurzel = document.getElementById('welt-menue') as HTMLElement;
  wurzel.innerHTML = '';
  const p = new Panel(wurzel, E, wirkt, standard);
  const hudStatus = document.getElementById('welt-status') as HTMLElement;

  p.section('Qualität (alle Planeten)', 'Ein Regler für alles: Auflösung der echten Planeten, ab wann ein Planet echt gerechnet wird, Gitter und Farbauflösung des Gasriesen, Kartenauflösung des Gesteinsplaneten. Die Feinregler stehen weiter unten im Menü des jeweiligen Planeten.')
    .select('qualitaet', 'Qualität', [['niedrig', 'Niedrig (schwache Grafikkarte)'], ['mittel', 'Mittel'], ['hoch', 'Hoch'], ['ultra', 'Ultra (RTX 4080/5080)']],
      'Niedrig rechnet nur ganz nahe Planeten echt und mit kleiner Auflösung; Ultra rechnet früher, schärfer und mit großen Gittern. Wirkt sofort auf die echten Planeten.');
  p.section('Zeit', 'Die Bahnen der Körper. Die Oberflächen der echten Planeten (Strömung, Wolken) laufen unabhängig davon in Echtzeit.')
    .range('tempoLog', 'Tempo der Bahnen', -2.5, 1.6, 0.05,
      'Wie schnell die Welt vergeht. Klein = man kann Monde und Einschläge in Ruhe ansehen; groß = die Planeten ziehen sichtbar ihre Bahn. Ändert nur die Zeit, nicht die Physik.',
      (v) => `×${Math.pow(10, v).toFixed(3)}`)
    .toggle('pause', 'Pause', 'Hält die Bahnen an (Leertaste). Kameraflug und die Oberflächen der echten Planeten laufen weiter.');

  // --- Ansicht ---
  const ansicht = el('div');
  const auswahlFeld = el<HTMLSelectElement>('select');
  auswahlFeld.addEventListener('change', () => { const id = parseInt(auswahlFeld.value, 10); if (id) s.waehle(id); });
  const z = el('div', { class: 'row-buttons' });
  const kn = (text: string, fn: () => void, titel = '') => { const b = el<HTMLButtonElement>('button', titel ? { title: titel, type: 'button' } : { type: 'button' }, text); b.addEventListener('click', fn); z.appendChild(b); };
  kn('Hinfliegen', () => { const id = s.auswahl(); if (id !== null) s.fliegeHin(id); }, 'Taste F oder Doppelklick auf den Körper');
  kn('Gesamtansicht', () => s.gesamtansicht(), 'Taste Esc');
  kn('Im Editor öffnen', () => { const id = s.auswahl(); const u = id === null ? null : s.editorUrl(id); if (u) window.open(u, '_blank'); }, 'Öffnet die Seite des Gasriesen bzw. Gesteinsplaneten (der alte Editor) in einem neuen Tab, mit dem Seed und den Einstellungen dieses Planeten.');
  const infoKasten = el('div', { class: 'welt-info' });
  ansicht.append(auswahlFeld, z, infoKasten);
  p.section('Ansicht', 'Klick auf einen Körper wählt ihn, Doppelklick fliegt hin. Ziehen dreht, Mausrad zoomt.').custom(ansicht)
    .toggle('nurAuswahl', 'Nur Auswahl zeigen', 'Blendet alle anderen Körper aus: es bleiben Sonne, der gewählte Körper und seine Monde bzw. sein Planet. Praktisch zum Feinabstimmen eines einzelnen Planeten.');

  // --- Kollisionen ---
  const seedZeile = el('div', { class: 'seedrow' });
  const seedFeld = el<HTMLInputElement>('input', { type: 'text', inputmode: 'numeric', autocomplete: 'off', spellcheck: 'false', value: String(s.seed()) });
  const neu = el<HTMLButtonElement>('button', { type: 'button' }, 'Neues System');
  const wuerfeln = el<HTMLButtonElement>('button', { type: 'button' }, 'Zufall');
  neu.addEventListener('click', () => s.neuesSystem(Math.max(1, parseInt(seedFeld.value, 10) || 1)));
  wuerfeln.addEventListener('click', () => { seedFeld.value = String(1 + Math.floor(Math.random() * 99999)); s.neuesSystem(parseInt(seedFeld.value, 10)); });
  seedZeile.append(el('label', {}, 'seed'), seedFeld, neu, wuerfeln);
  const ereignisKasten = el('div', { class: 'welt-ereignisse' });
  p.section('Kollisionen auslösen', 'Wirf einen Brocken auf den gewählten Körper. Ausgang (Verschmelzen, Abprall, Erosion, Zerschlagung) nach Leinhardt & Stewart 2012.')
    .range('stoss', 'Einschlagtempo', 5, 400, 1, 'Relativgeschwindigkeit beim Aufprall in Welteinheiten pro Sekunde. Über der Fluchtgeschwindigkeit des Ziels zerbricht der Brocken.', (v) => v.toFixed(0))
    .range('stossR', 'Größe des Brockens', 0.2, 3, 0.05, 'Radius des Brockens; Masse folgt aus der Dichte der Welt.', (v) => v.toFixed(2))
    .buttons([
      ['btn-stein', 'Gesteinsbrocken → Auswahl', () => { s.asteroid(null, Number(E.stoss), Number(E.stossR), 'gestein'); }],
      ['btn-gas', 'Gasbrocken → Auswahl', () => { s.asteroid(null, Number(E.stoss), Math.max(Number(E.stossR), 1.2), 'gas'); }],
      ['btn-nachbar', 'Auswahl gegen Nachbarplanet', () => { s.planetGegenNachbar(Math.max(20, Number(E.stoss) * 0.5)); }],
    ], { 'btn-nachbar': 'Der nächste Nachbar bekommt Kurs auf die Auswahl.' })
    .custom(seedZeile).custom(ereignisKasten);

  // --- Qualität ---
  p.section('Qualität der echten Planeten', 'Die nächsten großen Planeten laufen mit ihren echten Bausteinen. Diese Regler bestimmen, wie viel Rechenleistung sie bekommen. Weitere Regler (Gitter, Farbauflösung, Partikel, Oberflächenkarten) stehen im Menü des jeweiligen Planeten weiter unten.')
    .range('aufl', 'Auflösung der echten Planeten', 0.35, 2, 0.05, '1 = Bildschirmauflösung; darüber = Supersampling (schärfere Kanten und Filamente, wie „Render-Auflösung“ auf den Planetenseiten); darunter = schneller, weicheres Bild.', (v) => `${v.toFixed(2)}×`)
    .range('einschwingen', 'Einschwingen (Vorrechnen)', 0, 1200, 20, 'Wie viele Schritte die Strömung eines Gasriesen vorgerechnet wird, bevor man ihn sieht. 0 = sofort zeigen (die Strömung entwickelt sich beim Zuschauen). Mehr Schritte = ruhigere, ausgeprägtere Bänder und Stürme, aber Wartezeit und niedrige Bildrate beim Anfliegen.', (v) => (v === 0 ? 'aus' : `${v} Schritte`))
    .range('anPx', 'Echte Planeten ab Radius (Pixel)', 30, 300, 5, 'Ab diesem Radius auf dem Bildschirm wird ein Planet „echt“ gerechnet. Kleiner = schon aus der Ferne live (mehr Last), größer = erst ganz nah.', (v) => `${v.toFixed(0)} px`);

  // --- Speichern und Laden ---
  const sp = el('div');
  const meldung = el('div', { class: 'welt-info' });
  const nameFeld = el<HTMLInputElement>('input', { type: 'text', placeholder: 'Name, z. B. Mein System', autocomplete: 'off' });
  const reihe1 = el('div', { class: 'row-buttons' });
  const kn2 = (z: HTMLElement, text: string, fn: () => void | Promise<void>) => { const b = el<HTMLButtonElement>('button', { type: 'button' }, text); b.addEventListener('click', () => { Promise.resolve(fn()).catch((e: Error) => { meldung.textContent = e.message; }); }); z.appendChild(b); return b; };
  const dateiWahl = el<HTMLInputElement>('input', { type: 'file', accept: '.json,application/json' });
  dateiWahl.style.display = 'none';
  dateiWahl.addEventListener('change', async () => { const f = dateiWahl.files?.[0]; if (f) { try { s.ladeStand(await ausDatei(f)); meldung.textContent = `Geladen: ${f.name}`; } catch (e) { meldung.textContent = (e as Error).message; } dateiWahl.value = ''; } });
  kn2(reihe1, 'Als Datei speichern', () => { alsDatei(s.holeStand(nameFeld.value.trim() || undefined), nameFeld.value.trim()); meldung.textContent = 'Datei gespeichert (Seed, alle Körper, alle Einstellungen).'; });
  kn2(reihe1, 'Datei laden', () => dateiWahl.click());
  const reihe2 = el('div', { class: 'row-buttons' });
  const listeFeld = el<HTMLSelectElement>('select');
  const fuelleListe = () => { listeFeld.textContent = ''; const l = plaetze(); if (!l.length) listeFeld.appendChild(el('option', { value: '' }, 'noch nichts im Browser gespeichert')); l.forEach((pl, i) => listeFeld.appendChild(el('option', { value: String(i) }, `${pl.name} (Seed ${pl.stand.seed})`))); };
  fuelleListe();
  kn2(reihe2, 'Im Browser speichern', () => { const l = plaetze(); const name = nameFeld.value.trim() || `System ${l.length + 1}`; l.push({ name, stand: s.holeStand(name), zeit: Date.now() }); legeAb(l); fuelleListe(); meldung.textContent = `Gespeichert: ${name}`; });
  kn2(reihe2, 'Laden', () => { const pl = plaetze()[Number(listeFeld.value)]; if (pl) { s.ladeStand(pl.stand); meldung.textContent = `Geladen: ${pl.name}`; } });
  kn2(reihe2, 'Löschen', () => { const l = plaetze(); l.splice(Number(listeFeld.value), 1); legeAb(l); fuelleListe(); });
  const codeFeld = el<HTMLInputElement>('input', { type: 'text', placeholder: 'Code einfügen (SONNENSYSTEM1:…)', autocomplete: 'off', spellcheck: 'false' });
  const reihe3 = el('div', { class: 'row-buttons' });
  kn2(reihe3, 'Code kopieren', async () => { const c = await alsCode(s.holeStand(nameFeld.value.trim() || undefined)); await navigator.clipboard.writeText(c); meldung.textContent = `Code kopiert (${(c.length / 1024).toFixed(1)} KB): wer ihn einfügt, sieht dasselbe System.`; });
  kn2(reihe3, 'Code laden', async () => { s.ladeStand(await ausCode(codeFeld.value)); meldung.textContent = 'Code geladen.'; });
  sp.append(nameFeld, reihe1, dateiWahl, listeFeld, reihe2, codeFeld, reihe3, meldung);
  p.section('Speichern und Laden', 'Alles wird gespeichert: Seed des Systems, Zustand aller Körper (auch ihre Seeds und Vorlagen), alle Einstellungen der Welt und die Einstellungen, die du in den Menüs der einzelnen Planeten gemacht hast, dazu die Kamera. Als Datei, im Browser oder als Code zum Weitergeben: wer es lädt, sieht dasselbe System. Trümmer werden nicht gespeichert.').custom(sp);

  // --- Bausteine, nach Aufgabe gruppiert: jeder Block einzeln ein-/ausschaltbar ---
  const GRUPPEN: [string, string, string[]][] = [
    ['Bausteine · Physik', 'Gravitation und Kollisionen. ↻ = erzeugt das System neu.', ['monde', 'planetenZiehen', 'kollision', 'truemmer', 'ls12']],
    ['Bausteine · Anzeige der Welt', 'Himmel, Bahnlinien, Blitze, Schatten, Detailstufen.', ['himmel', 'spuren', 'blitze', 'finsternis', 'atmosphaere', 'lod']],
    ['Bausteine · Sonne', 'Die Sonne als Block: Oberfläche (Curl-Rauschen) und Schein.', ['lebendig', 'sonnenglanz']],
    ['Bausteine · Monde', 'Monde und ihre Bahnen.', ['mondbahnen']],
    ['Bausteine · Echte Planeten', 'Ob der nächste große Planet seiner Art echt gerechnet wird. Aus = gebackene Kugel; der Gesteinscode wird dann nicht einmal geladen.', ['gasLive', 'felsLive']],
  ];
  for (const [titel, hinweis, keys] of GRUPPEN) {
    p.section(titel, hinweis);
    for (const key of keys) { const b = BAUSTEINE.find((x) => x.schluessel === key); if (b) p.toggle(b.schluessel, b.name + (b.wirkt === 'neustart' ? ' ↻' : ''), b.text); }
  }
  p.section('Bausteine · Gasriesen (alle)', 'Gelten für ALLE Gasriesen der Welt, nicht nur den einen, der gerade live läuft. Jeder Schalter setzt denselben Regler wie im Menü des Planeten; aus = der Baustein hat keine Wirkung (und wird beim Rechnen nicht mitkompiliert).');
  for (const b of GAS_BAUSTEINE) p.toggle('g_' + b.schluessel, b.name, b.text);
  p.section('Bausteine · Gesteinsplaneten (alle)', 'Gelten für ALLE Gesteinsplaneten der Welt. Zum Beispiel „Vulkane“ aus = keine Vulkane auf irgendeinem Gesteinsplaneten.');
  for (const b of FELS_BAUSTEINE) p.toggle('f_' + b.schluessel, b.name, b.text);

  wurzel.querySelectorAll('details').forEach((d) => { (d as HTMLDetailsElement).open = false; });   // alles zugeklappt, damit man nicht endlos scrollt


  // --- Aktualisieren ---
  let listeKey = '';
  setInterval(() => {
    const K = s.koerper();
    const key = K.map((k) => k.id).join(',');
    if (key !== listeKey) {
      listeKey = key;
      auswahlFeld.textContent = '';
      auswahlFeld.appendChild(el('option', { value: '0' }, '– Körper wählen –'));
      for (const k of K) auswahlFeld.appendChild(el('option', { value: String(k.id) }, (k.art === 'mond' ? '   ' : '') + k.name));
    }
    if (document.activeElement !== seedFeld) seedFeld.value = String(s.seed());
    const a = s.auswahl();
    auswahlFeld.value = String(a ?? 0);
    const k = a === null ? undefined : K.find((x) => x.id === a);
    // Steckbrief als Tabelle (Werte der Weltphysik; läuft der Körper echt, kommen die Werte seiner Simulation dazu)
    infoKasten.textContent = '';
    if (!k) infoKasten.textContent = 'Noch kein Körper gewählt.';
    else {
      const tab = el('table');
      for (const [name, wert] of s.fakten(k.id)) { const tr = el('tr'); tr.append(el('td', {}, name), el('td', {}, wert)); tab.append(tr); }
      infoKasten.append(tab);
    }
    const w = s.welt();
    ereignisKasten.textContent = w.ereignisse.slice(-5).reverse().map((e) => `${e.zeit.toFixed(1)} s · ${{ verschmelzen: 'verschmolzen', zerschlagen: 'zerschlagen', abprall: 'abgeprallt', sonne: 'in die Sonne', truemmer: 'Trümmer' }[e.art]} · ${e.text}`).join('\n');
    const i = s.info();
    hudStatus.textContent = `${i.fps.toFixed(0)} fps · ${i.koerper} Körper · ${i.truemmer} Trümmer · Gasriese: ${i.gas ?? '–'} · Fels: ${i.fels ?? '–'} · voll: ${i.voll.join(', ') || '–'}${i.backen ? ` · backe ${i.backen}` : ''} · t ${i.zeit.toFixed(0)} s`;
  }, 250);
  return p;
}
