// Welt-Schicht: viele Planeten, Monde, eine Sonne und Kollisionen in einer 3D-Szene.
// Physik (CPU, `physik/`) und Aussehen (GPU, `zeichnen/`) sind getrennt; jede Funktion ist ein Baustein mit Schalter (`bausteine.ts`).
import { BAUSTEINE, standardSchalter, type Schalter } from './bausteine.ts';
import { finde, type Koerper, type V3, type Welt } from './physik/koerper.ts';
import { erzeugeSystem, STANDARD_SYSTEM } from './physik/system.ts';
import { neueWelt } from './physik/koerper.ts';
import * as speichern from './speichern.ts';
import type { WeltStand } from './speichern.ts';
import { bahnelemente } from './zeichnen/spuren.ts';
import { interpolation, weltSchritt, zeitRestZuruecksetzen } from './physik/schritt.ts';
import { planetGegenPlanet, naechsterPlanet, werfeAuf } from './physik/szenarien.ts';
import { gesteinFuer } from './oberflaeche/backen.ts';
import { starteGeraet } from './zeichnen/geraet.ts';
import { Kamera } from './zeichnen/kamera.ts';
import { Texturen } from './zeichnen/texturen.ts';
import { erstellePlanetenZeichner, INSTANZ_FLOATS, MAX_INSTANZEN } from './zeichnen/planetenZeichner.ts';
import { erstelleLeuchtenZeichner, LEUCHT_FLOATS, MAX_LEUCHT } from './zeichnen/leuchtenZeichner.ts';
import { erstelleLinienZeichner, MAX_SEGMENTE, SEG_FLOATS } from './zeichnen/linienZeichner.ts';
import { erstelleHimmelZeichner } from './zeichnen/himmelZeichner.ts';
import { Spuren } from './zeichnen/spuren.ts';
import { Blitze } from './zeichnen/blitze.ts';
import { waehleStufen } from './zeichnen/lod.ts';
import { erstelleGasEinbettung } from './zeichnen/gasEinbettung.ts';
import { erstelleRockyEinbettung } from './zeichnen/rockyEinbettung.ts';
import { erstelleEinblendung } from './zeichnen/einblendung.ts';
import { U_BYTES, MAX_KUGELN } from './zeichnen/shader/gemeinsam.ts';
import { baueOberflaeche, WELT_STANDARD, type Steuerung } from './oberflaeche/panel.ts';
import type { Settings } from '../ui.ts';
import { FELS_BAUSTEINE, GAS_BAUSTEINE } from './typBausteine.ts';

const SAUM: Record<string, number> = { erde: 0.65, wueste: 0.25, eis: 0.2, lava: 0.3, grau: 0 };

/** Globale Qualitätsstufen: Auflösung der echten Planeten, Schwelle (Pixelradius), Gasriesen-Gerätestufe, Kartenauflösung des Gesteinsplaneten */
const QUALITAET: Record<string, { aufl: number; anPx: number; gas: string; fels: number }> = {
  // gleiche Gerätestufen wie die Seite des Gasriesen (phone/standard/high/ultra); Auflösung über 1 = Supersampling wie „Render-Auflösung“ der Seite
  niedrig: { aufl: 0.5, anPx: 140, gas: 'phone', fels: 512 },
  mittel: { aufl: 0.85, anPx: 100, gas: 'standard', fels: 1024 },
  hoch: { aufl: 1.25, anPx: 80, gas: 'high', fels: 2048 },
  ultra: { aufl: 1.75, anPx: 60, gas: 'ultra', fels: 2048 },
};

export async function startWelt() {
  // Behälter im gemeinsamen Bedienfeld: Menü der Welt, dann (nur beim nahen Planeten) sein vollständiges Menü
  const koerperMenue = document.getElementById('panel-body') as HTMLElement;
  for (const id of ['welt-menue', 'editor-gas', 'editor-fels']) if (!document.getElementById(id)) { const d = document.createElement('div'); d.id = id; koerperMenue.append(d); }
  const canvas = document.getElementById('welt') as HTMLCanvasElement;
  const g = await starteGeraet(canvas);
  const { dev } = g;
  // Alle Einstellungen der Welt in einem Objekt (wie bei den anderen Seiten): Schalter der Bausteine + Zahlen
  const E: Settings = { ...standardSchalter(), ...WELT_STANDARD };
  const schalter = E as unknown as Schalter;
  for (const b of GAS_BAUSTEINE) E['g_' + b.schluessel] = b.standardAn;
  for (const b of FELS_BAUSTEINE) E['f_' + b.schluessel] = b.standardAn;
  const standard: Settings = { ...E };
  let seed = 1;
  let monde = schalter.monde;
  let w: Welt = erzeugeSystem({ ...STANDARD_SYSTEM, seed, monde });
  const kam = new Kamera();
  const tex = new Texturen(dev);
  const uni = dev.createBuffer({ size: U_BYTES, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const planeten = erstellePlanetenZeichner(dev, g.format, uni, tex);
  const leuchten = erstelleLeuchtenZeichner(dev, g.format, uni);
  const linien = erstelleLinienZeichner(dev, g.format, uni);
  const himmel = erstelleHimmelZeichner(dev, g.format, uni);
  const gasE = erstelleGasEinbettung(dev, document.getElementById('editor-gas') as HTMLElement);
  const felsE = erstelleRockyEinbettung(dev, document.getElementById('editor-fels') as HTMLElement);
  const einblend = erstelleEinblendung(dev, g.format);
  const spuren = new Spuren();
  const blitze = new Blitze();
  spuren.vorbelegen(w);
  const baueShader = () => planeten.baue({ atmosphaere: schalter.atmosphaere, finsternis: schalter.finsternis, lebendig: schalter.lebendig });
  baueShader();

  let fokus: number | null = null;
  let auswahl: number | null = null;
  let tempo = Math.pow(10, Number(E.tempoLog));
  let pause = false;
  let abstandZiel = 900;
  let letzterFokusOrt: V3 = [0, 0, 0];
  const info = { gas: 'aus', fels: 'aus', fps: 0, teilschritte: 0, voll: [] as string[], punkte: 0, backen: 0 };
  let jetzt = 0;

  const uData = new Float32Array(U_BYTES / 4);
  const inst = new Float32Array(MAX_INSTANZEN * INSTANZ_FLOATS);
  const leucht = new Float32Array(MAX_LEUCHT * LEUCHT_FLOATS);
  const lin = new Float32Array(MAX_SEGMENTE * SEG_FLOATS);

  const sonne = () => w.koerper.find((k) => k.art === 'sonne');

  function setzeFokus(id: number | null, naehe?: number) {
    fokus = id;
    const k = id === null ? undefined : finde(w, id);
    const ziel: V3 = k ? k.p : [0, 0, 0];
    kam.setzeZiel(ziel, true);
    abstandZiel = k ? (naehe ?? Math.max(k.r * 5.5, 8)) : 900;
    // Blick von der Sonnenseite her (leicht seitlich), damit der Körper beleuchtet ankommt
    const so = sonne();
    if (k && so && k.art !== 'sonne') { kam.gier = Math.atan2(so.p[0] - k.p[0], so.p[2] - k.p[2]) + 0.8; kam.neigung = 0.25; }
  }
  const mindestAbstand = () => { const k = fokus === null ? undefined : finde(w, fokus); return k ? k.r * 1.25 : 20; };

  function neuesSystem(neuerSeed: number) {
    seed = neuerSeed; monde = schalter.monde;
    w = erzeugeSystem({ ...STANDARD_SYSTEM, seed, monde });
    spuren.leeren(); spuren.vorbelegen(w); blitze.zuruecksetzen(); zeitRestZuruecksetzen();
    auswahl = null; setzeFokus(null);
  }

  function setzeSchalter(key: string, an: boolean) {
    schalter[key] = an;
    const b = BAUSTEINE.find((x) => x.schluessel === key);
    if (!b) return;
    if (b.wirkt === 'pipeline') baueShader();
    if (b.wirkt === 'neustart') neuesSystem(seed);
    if (key === 'spuren') { if (an) spuren.vorbelegen(w); else spuren.leeren(); }
  }

  // ---------- Speichern und Laden ----------
  function holeStand(name?: string): WeltStand {
    return {
      format: 'sonnensystem', version: 1, name, seed, zeit: w.zeit, naechsteId: w.naechsteId,
      koerper: JSON.parse(JSON.stringify(w.koerper)),
      einstellungen: JSON.parse(JSON.stringify(E)),
      gas: gasE.holeEinstellungen(), fels: felsE.holeEinstellungen(), gasTyp: gasE.holeTyp(), felsTyp: felsE.holeTyp(),
      kamera: { gier: kam.gier, neigung: kam.neigung, abstand: abstandZiel, fokus },
    };
  }
  function ladeStand(s: WeltStand) {
    seed = s.seed;
    w = neueWelt(seed * 7919 + 13);
    w.koerper = s.koerper; w.naechsteId = s.naechsteId; w.zeit = s.zeit;
    Object.assign(E, s.einstellungen);
    monde = !!E.monde;
    tempo = Math.pow(10, Number(E.tempoLog)); pause = !!E.pause;
    baueShader();
    const st = QUALITAET[String(E.qualitaet)] ?? QUALITAET.mittel;
    gasE.setzeQualitaet(st.gas); felsE.setzeQualitaet(st.fels);
    gasE.setzeEinstellungen(s.gas ?? {}, s.gasTyp ?? {}); felsE.setzeEinstellungen(s.fels ?? {}, s.felsTyp ?? {});
    spuren.leeren(); blitze.zuruecksetzen(); zeitRestZuruecksetzen(); tex.leeren();
    auswahl = null;
    setzeFokus(s.kamera?.fokus ?? null);
    if (s.kamera) { kam.gier = s.kamera.gier; kam.neigung = s.kamera.neigung; abstandZiel = s.kamera.abstand; }
    panel.refresh();
  }

  /** Steckbrief eines Körpers: Eigenschaften, Bahn aus der Weltphysik und (wenn er gerade echt gerechnet wird) die Werte der Simulation. */
  /** „Nur Auswahl zeigen“: sichtbar bleiben Sonne, die Auswahl, ihre Monde bzw. ihr Planet. */
  const sichtbar = (k: Koerper): boolean => {
    if (!E.nurAuswahl || auswahl === null) return true;
    const a = finde(w, auswahl);
    return !a || k.id === a.id || k.art === 'sonne' || k.eltern === a.id || k.id === a.eltern;
  };

  /** Adresse der Seite des Planeten-Editors mit diesem Planeten (Seed, Vorlage, Einstellungen). */
  function editorUrl(id: number): string | null {
    const k = finde(w, id);
    if (!k || (k.art !== 'gas' && k.art !== 'gestein')) return null;
    if (k.art === 'gas') {
      const code = gasE.planetenCode(id);
      return code ? `index.html?body=gas&code=${encodeURIComponent(code)}` : `index.html?body=gas`;
    }
    const q = new URLSearchParams({ body: 'rocky', seed: String(k.seed) });
    for (const [key, v] of Object.entries(felsE.holeEinstellungen()[id] ?? {})) if (typeof v === 'number') q.set(key, String(v));
    return `index.html?${q.toString()}`;
  }

  function fakten(id: number): [string, string][] {
    const k = finde(w, id);
    if (!k) return [];
    const f3 = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2));
    const art = { sonne: 'Stern', gas: 'Gasriese', gestein: 'Gesteinsplanet', mond: 'Mond' }[k.art];
    const z: [string, string][] = [['Typ', art], ['Seed', String(k.seed)]];
    if (k.vorlage) z.push(['Vorlage', k.vorlage]);
    z.push(['Radius', f3(k.r)], ['Masse', f3(k.m)], ['Dichte', f3(k.m / ((4 / 3) * Math.PI * k.r ** 3))], ['Fluchtgeschwindigkeit', f3(Math.sqrt((2 * k.m) / k.r))]);
    if (k.spinRate) z.push(['Eigendrehung', `${(Math.abs((2 * Math.PI) / k.spinRate)).toFixed(0)} s${k.spinRate < 0 ? ' (rückläufig)' : ''}`]);
    const so = sonne();
    const eltern = (k.eltern >= 0 ? finde(w, k.eltern) : undefined) ?? so;
    if (eltern && k.art !== 'sonne') {
      const el = bahnelemente(k, eltern);
      const abstand = Math.hypot(k.p[0] - eltern.p[0], k.p[1] - eltern.p[1], k.p[2] - eltern.p[2]);
      const v = Math.hypot(k.v[0] - eltern.v[0], k.v[1] - eltern.v[1], k.v[2] - eltern.v[2]);
      z.push(['Bahn um', eltern.name], ['Abstand', f3(abstand)], ['Bahngeschwindigkeit', `${f3(v)} /s`]);
      if (el) z.push(['Umlaufzeit', Number.isFinite(el.periode) ? `${el.periode.toFixed(0)} s` : 'ungebunden'], ['Exzentrizität', el.e.toFixed(3)]);
    }
    const live = [...gasE.fakten(id), ...felsE.fakten(id)];
    if (live.length) { z.push(['— echte Simulation —', '']); z.push(...live); }
    return z;
  }

  const ste: Steuerung = {
    editorUrl, fakten, holeStand, ladeStand,
    koerper: () => w.koerper, auswahl: () => auswahl, fokus: () => fokus,
    waehle: (id) => { auswahl = id; },
    fliegeHin: (id) => { auswahl = id; setzeFokus(id); },
    gesamtansicht: () => setzeFokus(null),
    welt: () => w,
    seed: () => seed, neuesSystem,
    asteroid: (zielId, tempoAuf, radius, art) => {
      const z = zielId ?? auswahl; if (z === null) return null;
      const k = werfeAuf(w, z, { radius, tempo: tempoAuf, art });
      if (k) { const ziel = finde(w, z)!; kam.setzeZiel(ziel.p, false); }
      return k?.id ?? null;
    },
    planetGegenNachbar: (tempoAuf) => {
      if (auswahl === null) return false;
      const a = finde(w, auswahl); if (!a || a.art === 'sonne') return false;
      const n = naechsterPlanet(w, a.id); if (!n) return false;
      return planetGegenPlanet(w, a.id, n.id, tempoAuf);
    },
    info: () => ({ ...info, koerper: w.koerper.length, truemmer: w.truemmer.n, zeit: w.zeit, verworfen: w.verworfen, ereignisse: w.ereignisse.length }),
  };
  const wirkt = (key: string) => {
    if (key === 'qualitaet') {
      const st = QUALITAET[String(E.qualitaet)] ?? QUALITAET.mittel;
      E.aufl = st.aufl; E.anPx = st.anPx;
      gasE.setzeQualitaet(st.gas); felsE.setzeQualitaet(st.fels);
      panel.refresh();
    } else if (key === 'tempoLog') tempo = Math.pow(10, Number(E.tempoLog));
    else if (key === 'pause') pause = !!E.pause;
    else if (key.startsWith('g_')) gasE.setzeTyp(key.slice(2), !!E[key]);
    else if (key.startsWith('f_')) felsE.setzeTyp(key.slice(2), !!E[key]);
    else if (BAUSTEINE.some((b) => b.schluessel === key)) setzeSchalter(key, !!E[key]);
  };
  const panel = baueOberflaeche(ste, E, standard, wirkt);
  wirkt('qualitaet');   // Startstufe auf Auflösung und Schwellen anwenden

  // ---------- Eingabe ----------
  const zeiger = new Map<number, { x: number; y: number }>();
  let bewegt = 0, pinch0 = 0, abstand0 = 0;
  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY }); bewegt = 0; if (zeiger.size === 2) { const [a, b] = [...zeiger.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); abstand0 = abstandZiel; } });
  canvas.addEventListener('pointermove', (e) => {
    const p = zeiger.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; bewegt += Math.abs(dx) + Math.abs(dy);
    if (zeiger.size === 1) { kam.gier -= dx * 0.005; kam.neigung = Math.max(-1.45, Math.min(1.45, kam.neigung + dy * 0.005)); }
    else if (zeiger.size === 2) { const [a, b] = [...zeiger.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); abstandZiel = Math.max(mindestAbstand(), Math.min(9000, abstand0 * pinch0 / Math.max(d, 1))); }
  });
  const ende = (e: PointerEvent) => {
    if (zeiger.size === 1 && bewegt < 5) {
      const r = canvas.getBoundingClientRect();
      const id = waehleAm(((e.clientX - r.left) / r.width) * 2 - 1, 1 - ((e.clientY - r.top) / r.height) * 2);
      auswahl = id;
    }
    zeiger.delete(e.pointerId);
  };
  canvas.addEventListener('pointerup', ende); canvas.addEventListener('pointercancel', (e) => zeiger.delete(e.pointerId));
  canvas.addEventListener('dblclick', () => { if (auswahl !== null) setzeFokus(auswahl); });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); abstandZiel = Math.max(mindestAbstand(), Math.min(9000, abstandZiel * Math.exp(e.deltaY * 0.0012))); }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return;
    if (e.key === 'Escape') setzeFokus(null);
    else if (e.key === 'f' && auswahl !== null) setzeFokus(auswahl);
    else if (e.key === ' ') { E.pause = !E.pause; pause = !!E.pause; panel.refresh(); e.preventDefault(); }
  });

  function waehleAm(nx: number, ny: number): number | null {
    const b = kam.basis(); const asp = canvas.width / canvas.height; const th = Math.tan(kam.fov / 2);
    const d: V3 = [0, 0, 0];
    for (let k = 0; k < 3; k++) d[k] = b.vor[k] + b.rechts[k] * nx * th * asp + b.oben[k] * ny * th;
    const l = Math.hypot(d[0], d[1], d[2]); for (let k = 0; k < 3; k++) d[k] /= l;
    let best: number | null = null, bt = Infinity;
    for (const k of w.koerper) {
      const oc: V3 = [k.p[0] - b.auge[0], k.p[1] - b.auge[1], k.p[2] - b.auge[2]];
      const t = oc[0] * d[0] + oc[1] * d[1] + oc[2] * d[2]; if (t <= 0) continue;
      const dist2 = oc[0] ** 2 + oc[1] ** 2 + oc[2] ** 2 - t * t;
      const rr = Math.max(k.r, t * 0.012);
      if (dist2 < rr * rr && t < bt) { bt = t; best = k.id; }
    }
    return best;
  }

  // ---------- Bild ----------
  let letzte = performance.now(), fpsZaehler = 0, fpsZeit = 0;
  function bild(jetztMs: number) {
    const dt = Math.min(0.1, (jetztMs - letzte) / 1000); letzte = jetztMs; jetzt += dt;
    fpsZaehler++; fpsZeit += dt; if (fpsZeit > 0.5) { info.fps = fpsZaehler / fpsZeit; fpsZaehler = 0; fpsZeit = 0; }
    g.anpassen();
    const [W, H] = g.groesse();

    if (!pause) {
      info.teilschritte = weltSchritt(w, dt, tempo, { planetenZiehen: schalter.planetenZiehen, kollision: schalter.kollision, truemmer: schalter.truemmer, ls12: schalter.ls12 });
      const t = w.truemmer;
      for (let i = 0; i < t.n; i++) t.alter[i] += dt * tempo;
    }
    if (schalter.spuren) spuren.aktualisiere(w);
    if (schalter.blitze) blitze.uebernimm(w, jetzt); else blitze.zuruecksetzen();

    // Bildinterpolation: zwischen dem Zustand vor und nach dem letzten Teilschritt (am Ende des Bildes wieder zurückgesetzt),
    // sonst springen die Körper bei kleinem Tempo nur alle paar Bilder um einen Teilschritt weiter
    const al = pause ? 1 : interpolation();
    const echt = w.koerper.map((k) => ({ p: [k.p[0], k.p[1], k.p[2]] as V3, s: k.spin }));
    for (const k of w.koerper) { for (let c = 0; c < 3; c++) k.p[c] = k.pv[c] + (k.p[c] - k.pv[c]) * al; k.spin = k.spinV + (k.spin - k.spinV) * al; }
    const trEcht = w.truemmer.p.slice(0, 3 * w.truemmer.n);
    for (let i = 0; i < 3 * w.truemmer.n; i++) w.truemmer.p[i] = w.truemmer.pv[i] + (w.truemmer.p[i] - w.truemmer.pv[i]) * al;

    // Fokus verfolgen; verschwindet der Körper (verschmolzen), bleibt die Kamera am letzten Ort
    if (fokus !== null) { const k = finde(w, fokus); if (k) letzterFokusOrt = [k.p[0], k.p[1], k.p[2]]; else { fokus = null; } }
    kam.setzeZiel(fokus === null ? (letzterFokusOrt = [0, 0, 0]) : letzterFokusOrt, false);
    kam.abklingen(dt);
    kam.abstand += (abstandZiel - kam.abstand) * (1 - Math.exp(-dt * 4));
    if (auswahl !== null && !finde(w, auswahl)) auswahl = null;

    // Texturen: nur lebende Körper behalten
    tex.freigeben(new Set(w.koerper.map((k) => k.id)));
    for (const k of w.koerper) tex.anfordern(k);
    info.backen = tex.arbeite(4);

    const auge = kam.auge();
    let nah = Infinity;
    for (const k of w.koerper) nah = Math.min(nah, Math.hypot(k.p[0] - auge[0], k.p[1] - auge[1], k.p[2] - auge[2]) - k.r);
    const { vp } = kam.matrix(W / H, Math.max(nah, 0.05));
    const b = kam.basis();
    const rel = (p: ArrayLike<number>, o = 0): V3 => [p[o] - auge[0], p[o + 1] - auge[1], p[o + 2] - auge[2]];

    // Uniformen
    uData.set(vp, 0);
    uData.set([b.rechts[0], b.rechts[1], b.rechts[2], Math.tan(kam.fov / 2)], 16);
    uData.set([b.oben[0], b.oben[1], b.oben[2], W / H], 20);
    uData.set([b.vor[0], b.vor[1], b.vor[2], jetzt], 24);
    const so = sonne();
    const sr = so ? rel(so.p) : [0, 0, 0];
    uData.set([sr[0], sr[1], sr[2], so ? so.r : 1], 28);
    const pixelProRadiant = H / kam.fov;
    // Schatten-Kugeln: die nächsten 64 (ohne Sonne)
    const sph = w.koerper.filter((k) => k.art !== 'sonne' && sichtbar(k)).map((k) => ({ k, d: (k.p[0] - auge[0]) ** 2 + (k.p[1] - auge[1]) ** 2 + (k.p[2] - auge[2]) ** 2 })).sort((a, c) => a.d - c.d).slice(0, MAX_KUGELN);
    sph.forEach(({ k }, i) => { const r = rel(k.p); uData.set([r[0], r[1], r[2], k.r], 36 + 4 * i); });
    uData.set([pixelProRadiant, schalter.finsternis ? sph.length : 0, 2 / W, 2 / H], 32);
    dev.queue.writeBuffer(uni, 0, uData.buffer, 0, U_BYTES);

    // Echter Gasriese (eigene Instanz der Gasriesen-Bausteine) für den nächsten großen Gasriesen
    // Instanzen rechnen in Bildschirmauflösung × „Auflösung der echten Planeten“, die Einblendung skaliert sie auf das Bild
    const aufl = Math.min(2, Math.max(0.2, Number(E.aufl)));
    const sicht = w.koerper.filter(sichtbar);
    const kontext = { koerper: sicht, auge, vp, breite: Math.max(16, Math.round(W * aufl)), hoehe: Math.max(16, Math.round(H * aufl)), tanHalbFov: Math.tan(kam.fov / 2), pixelProRadiant: H / kam.fov, sonneRel: sr as V3, dt: dt * (pause ? 0 : 1), dtReal: dt, anPx: Number(E.anPx), einschwingen: Number(E.einschwingen), neuGebacken: (b: Koerper) => tex.neuBacken(b), vor: b.vor, oben: b.oben, fov: kam.fov, aspekt: W / H };
    const ein = gasE.aktualisiere(kontext, schalter.gasLive);
    info.gas = gasE.status;
    const einFels = felsE.aktualisiere(kontext, schalter.felsLive);
    info.fels = felsE.status;

    // Stufen und Kugel-Instanzen
    const lod = waehleStufen(sicht, auge, pixelProRadiant, schalter.lod);
    info.voll = lod.voll.map((k) => k.name);
    let ni = 0, nl = 0, punkte = 0;
    const farbePunkt = (k: Koerper): [number, number, number] => k.art === 'sonne' ? [1, 0.85, 0.5] : k.art === 'gas' ? [0.85, 0.75, 0.55] : k.art === 'mond' ? [0.6, 0.6, 0.62] : [0.75, 0.7, 0.65];
    for (const k of sicht) {
      const stufe = lod.stufen.get(k.id)!;
      const r = rel(k.p);
      if (k.id === gasE.ausgeblendet || k.id === felsE.ausgeblendet) continue;   // die echte Instanz deckt ihn vollständig
      if (stufe === 'punkt') {
        if (nl < MAX_LEUCHT - 8) { leucht.set([r[0], r[1], r[2], k.r, ...farbePunkt(k), 0.9, 2, 0, 0, 0], nl * LEUCHT_FLOATS); nl++; punkte++; }
        continue;
      }
      if (ni >= MAX_INSTANZEN) break;
      const sonneBit = k.art === 'sonne' ? 1 : 0;
      const lebendig = schalter.lebendig && stufe === 'voll' && (k.art === 'gas' || k.art === 'sonne') ? 2 : 0;
      const gasBit = k.art === 'gas' ? 4 : 0;
      const atm = k.art === 'gas' ? 0.45 : k.art === 'gestein' ? SAUM[gesteinFuer(k.art, k.seed)] : 0;
      inst.set([r[0], r[1], r[2], k.r, k.spin, k.tilt, tex.scheibe(k.id), sonneBit | lebendig | gasBit, 1, 1, 1, atm], ni * INSTANZ_FLOATS);
      ni++;
    }
    info.punkte = punkte;
    planeten.setze(inst, ni);

    // Leuchtflächen: Sonnenschein, Blitze, Trümmer
    if (so && schalter.sonnenglanz && nl < MAX_LEUCHT - 4) {
      leucht.set([sr[0], sr[1], sr[2], so.r * 3.2, 1, 0.72, 0.38, 0.5, 0, 0, 0, 0], nl * LEUCHT_FLOATS); nl++;
      leucht.set([sr[0], sr[1], sr[2], so.r * 9, 1, 0.6, 0.3, 0.07, 0, 0, 0, 0], nl * LEUCHT_FLOATS); nl++;
    }
    if (schalter.blitze) nl = blitze.fuelle(auge, jetzt, leucht, nl);
    const t = w.truemmer;
    for (let i = 0; i < t.n && nl < MAX_LEUCHT; i++) {
      const heiss = Math.max(0, 1 - t.alter[i] / 5);
      const gasig = t.art[i] === 1 ? 1 : 0;
      const gr = 0.5 + 0.06 * Math.cbrt(t.m[i] * 1000);
      leucht.set([t.p[3 * i] - auge[0], t.p[3 * i + 1] - auge[1], t.p[3 * i + 2] - auge[2], 0.05 + 0.05 * Math.cbrt(t.m[i]),
        0.5 + 0.5 * heiss - 0.1 * gasig, 0.45 + 0.1 * heiss, 0.4 - 0.1 * heiss + 0.2 * gasig, gr, 3, 0, 0, 0], nl * LEUCHT_FLOATS); nl++;
    }
    leuchten.setze(leucht, nl);

    // Sichtbarkeit der Bahnlinien (0…1, stetig): im Nahbereich eines Körpers nur seine eigene Bahn, die seines Planeten und die seiner Monde;
    // Mondbahnen erst, wenn man nah genug an ihrem Planeten ist. So bleibt es im Überblick vollständig und sonst ruhig.
    const fk = fokus !== null ? finde(w, fokus) : undefined;
    const glatt = (a: number, c: number, x: number) => { const s = Math.min(1, Math.max(0, (x - a) / (c - a))); return s * s * (3 - 2 * s); };
    const roh = new Map<number, { p: V3 }>(); w.koerper.forEach((k, i) => roh.set(k.id, echt[i]));
    const bahnSicht = (k: Koerper, z: Koerper, a: number): number => {
      if (!sichtbar(k)) return 0;
      let f = 1;
      if (k.art === 'mond') {
        const dz = Math.hypot(z.p[0] - auge[0], z.p[1] - auge[1], z.p[2] - auge[2]);
        f = 1 - glatt(25, 80, dz / Math.max(a, 1e-3));
      }
      if (fk && fk.art !== 'sonne' && k.id !== fk.id && k.id !== fk.eltern && k.eltern !== fk.id) f *= glatt(30, 90, kam.abstand / fk.r);
      return f;
    };
    const nlin = schalter.spuren ? spuren.fuelle(w, auge, lin, schalter.mondbahnen, bahnSicht, roh) : 0;
    linien.setze(lin, nlin);

    const enc = dev.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [{ view: g.ctx.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0.003, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
      depthStencilAttachment: { view: g.tiefe(), depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store' },
    });
    if (schalter.himmel) himmel.zeichne(pass);
    planeten.zeichne(pass);
    if (ein) einblend.zeichne(pass, ein.tex, vp, ein.mitte, ein.radius, ein.deck, W, H);
    if (einFels) einblend.zeichne(pass, einFels.tex, vp, einFels.mitte, einFels.radius, einFels.deck, W, H, 1);
    if (schalter.spuren) linien.zeichne(pass);
    leuchten.zeichne(pass);
    pass.end();
    dev.queue.submit([enc.finish()]);
    w.koerper.forEach((k, i) => { k.p[0] = echt[i].p[0]; k.p[1] = echt[i].p[1]; k.p[2] = echt[i].p[2]; k.spin = echt[i].s; });
    w.truemmer.p.set(trEcht);
    requestAnimationFrame(bild);
  }
  requestAnimationFrame(bild);

  // Prüf- und Einstiegspunkt für Werkzeuge (Bildvergleich, Selbsttest)
  (window as unknown as { welt: unknown }).welt = { ste, kam, get w() { return w; }, schalter, E, wirkt, setzeSchalter, setzeFokus, tex, info, panel, gasE, felsE, speichern };
}
