// Echter Gasriese in der Welt: der nächste große Gasriese bekommt eine eigene Instanz der Gasriesen-Bausteine (Strömung, Farbstoff,
// Relief, Ringe …), gerechnet nur solange er nah genug ist. Die Instanz zeichnet aus der Kamera der Welt in eine Textur mit Alpha;
// `einblendung.ts` legt sie über die Szene. Ferne Gasriesen bleiben gebackene Kugeln. Die Bewegung des Planeten auf seiner Bahn
// hat damit nichts zu tun: die Instanz bekommt nur Lage, Sonne und Drehung gesagt.
import { GasInstanz } from '../../gas/einbettung.ts';
import type { Mat4 } from '../../math.ts';
import { instanzKamera } from './ansichtInst.ts';
import { GAS_BAUSTEINE } from '../typBausteine.ts';
import type { Koerper, V3 } from '../physik/koerper.ts';

export interface EinbettungsKontext {
  koerper: Koerper[];
  auge: V3;
  /** Projektion × Ansicht der Welt-Kamera (Auge im Ursprung) */
  vp: Mat4;
  breite: number; hoehe: number;
  tanHalbFov: number;
  pixelProRadiant: number;
  sonneRel: V3;
  /** vergangene Weltzeit dieses Bildes (Sekunden, mit Tempo) */
  dt: number;
  /** vergangene echte Zeit (für das Einblenden) */
  dtReal: number;
  /** ab diesem Bildschirmradius (Pixel) wird ein Planet echt gerechnet */
  anPx: number;
  /** Oberfläche eines Körpers neu backen (Seed/Vorlage aus dem Menü geändert) */
  neuGebacken: (k: Koerper) => void;
  /** Schritte Vorrechnen („Einschwingen“) nach jedem Planetenwechsel; 0 = aus */
  einschwingen: number;
  /** Blickrichtung und „oben“ der Welt-Kamera, senkrechter Blickwinkel, Seitenverhältnis */
  vor: V3; oben: V3; fov: number; aspekt: number;
}

export interface Einblendung { tex: GPUTexture; mitte: V3; radius: number; deck: number; id: number }

const RAND = 2.9;      // Bildausschnitt um die Kugel in Radien (Ringe, Atmosphäre)

export function erstelleGasEinbettung(dev: GPUDevice, editor: HTMLElement) {
  let inst: GasInstanz | null = null;
  let aktiv: number | null = null;
  let deck = 0;
  let status = 'aus';
  let menueFuer: number | null = null;
  // Das Menü des Gasriesen baut sich bei manchen Änderungen neu auf: neue Abschnitte immer zugeklappt
  new MutationObserver((muster) => {
    for (const m of muster) m.addedNodes.forEach((n) => {
      if (n instanceof HTMLElement) { if (n.tagName === 'DETAILS') (n as HTMLDetailsElement).open = false; n.querySelectorAll('details').forEach((d) => { (d as HTMLDetailsElement).open = false; }); }
    });
  }).observe(editor, { childList: true, subtree: true });
  let tier = 'welt';   // Qualitätsstufe der Gasriesen-Instanz (globaler Qualitätsregler der Welt)
  // Einstellungen je Körper (Menü des echten Planeten) und Bausteine je Typ (gelten für alle Gasriesen)
  const koerperS = new Map<number, string>();
  let inhalt: number | null = null;          // welcher Körper gerade in der Instanz steckt (auch wenn sie nicht sichtbar ist)
  let typ: Record<string, boolean> = {};     // Typ-Bausteine: Abweichungen und gesetzte Werte
  const gemerkt: Record<string, number | string | boolean> = {};
  let typOffen = false;
  const anwendenTyp = (key: string, an: boolean) => {
    const b = GAS_BAUSTEINE.find((x) => x.schluessel === key);
    if (!b || !inst) return;
    const S = inst.app.S as unknown as Record<string, number | string | boolean>;
    if (!an) { gemerkt[key] = S[key]; S[key] = b.aus; } else S[key] = gemerkt[key] ?? b.an;
    try { inst.app.onChange(key as never); } catch (e) { console.warn('Typ-Baustein', key, e); }
  };
  const menueAb = () => { if (menueFuer !== null) { inst?.menue(null); editor.innerHTML = ''; menueFuer = null; } };

  function waehle(k: EinbettungsKontext): Koerper | null {
    let best: Koerper | null = null, bpx = 0;
    for (const g of k.koerper) {
      if (g.art !== 'gas') continue;
      const d = Math.hypot(g.p[0] - k.auge[0], g.p[1] - k.auge[1], g.p[2] - k.auge[2]);
      const px = (g.r / Math.max(d, 1e-6)) * k.pixelProRadiant;
      const schwelle = g.id === aktiv ? k.anPx * 0.4 : k.anPx;   // weite Hysterese: kein Hin und Her beim Zoomen
      if (px > schwelle && px > bpx) { best = g; bpx = px; }
    }
    return best;
  }

  return {
    /** Körper, dessen gebackene Kugel nicht mehr gezeichnet werden soll (die Instanz deckt ihn vollständig). */
    get ausgeblendet(): number | null { return aktiv !== null && deck >= 0.999 ? aktiv : null; },
    get status() { return status; },
    /** Qualitätsstufe der Instanz (Gerät-Startwerte des Gasriesen) */
    setzeQualitaet(neu: string) { tier = neu; if (inst) { inst.app.S.quality = neu; inst.app.onChange('quality'); } },
    /** Baustein je Typ ein-/ausschalten (gilt für alle Gasriesen) */
    setzeTyp(key: string, an: boolean) { typ[key] = an; if (inst && inhalt !== null && inst.app.panel) anwendenTyp(key, an); },
    /** Speichern/Laden: Einstellungen je Körper (Momentaufnahme des Menüs) und Typ-Bausteine */
    holeEinstellungen(): Record<number, string> {
      const r: Record<number, string> = {};
      for (const [id, s] of koerperS) r[id] = s;
      if (inst && inhalt !== null && inst.bereit) r[inhalt] = inst.app.snapshot();
      return r;
    },
    setzeEinstellungen(rec: Record<number, string>, typRec: Record<string, boolean>) {
      koerperS.clear();
      for (const [id, s] of Object.entries(rec)) koerperS.set(Number(id), s);
      typ = { ...typRec }; inhalt = null; aktiv = null; menueAb();
    },
    holeTyp(): Record<string, boolean> { return { ...typ }; },
    /** Planeten-Code dieses Körpers (für die Seite des Gasriesen), falls er Einstellungen hat */
    planetenCode(id: number): string | null {
      if (!inst) return null;
      const s = inhalt === id && inst.bereit ? inst.app.snapshot() : koerperS.get(id);
      return s ? inst.planetenCode(s) : null;
    },
    /** Steckbrief des gerade echt berechneten Körpers (sonst leer) */
    fakten(id: number): [string, string][] { return inst && inhalt === id && inst.bereit ? inst.fakten() : []; },
    /** für Prüfwerkzeuge */
    get instanz() { return inst; },
    /** Pro Bild: Instanz wählen, vorrechnen oder zeichnen. Gibt die einzublendende Schicht zurück (oder null). */
    aktualisiere(k: EinbettungsKontext, an: boolean): Einblendung | null {
      const ziel = an ? waehle(k) : null;
      if (!ziel) {
        if (aktiv !== null) { aktiv = null; deck = 0; }   // Zustand bleibt erhalten: bei erneuter Annäherung geht es sofort weiter
        editor.style.display = 'none';                    // das Menü gehört zum nahen Planeten; ist keiner nah, wird es nicht gezeigt
        status = 'aus';
        return null;
      }
      if (!inst) { inst = new GasInstanz(dev, k.breite, k.hoehe); inst.app.warmSteps = k.einschwingen; inst.app.S.quality = tier; inst.app.applyQuality(true); }
      if (aktiv !== ziel.id) {
        aktiv = ziel.id; deck = 0;
        // Derselbe Planet wie zuletzt: Strömung und Menü behalten (kein erneutes Vorrechnen); anderer Planet: neu aufsetzen
        if (inhalt !== ziel.id) {
          if (inhalt !== null && inst.bereit) koerperS.set(inhalt, inst.app.snapshot());   // Einstellungen des bisherigen Planeten merken
          menueAb();
          inst.setzePlanet(ziel.seed);
          const alt = koerperS.get(ziel.id);
          if (alt) { try { inst.app.restore(alt); inst.abgleichen(); } catch (e) { console.warn('Einstellungen laden', e); } }
          inhalt = ziel.id; typOffen = true;
          for (const key of Object.keys(gemerkt)) delete gemerkt[key];
        }
      }
      inst.setzeGroesse(k.breite, k.hoehe);
      inst.app.warmSteps = k.einschwingen;   // Einschwingen: Standard 0 (sofort zeigen), nur auf Wunsch vorrechnen
      editor.style.display = '';
      // Wahl im Menü des echten Planeten (Zufallsplanet, Vorlage) gilt auch für den Körper in der Welt und seine gebackene Kugel
      const wahl = inst.geaenderteWahl();
      if (wahl) { ziel.seed = wahl.seed; ziel.vorlage = wahl.vorlage; inst.merkeSeed(ziel.seed); k.neuGebacken(ziel); }
      inst.pruefeNeustart();
      if (!inst.bereit) { status = 'rechnet vor'; inst.vorrechnen(10); return null; }
      if (menueFuer !== ziel.id) {
        menueFuer = ziel.id;
        editor.innerHTML = '';
        const kopf = document.createElement('div');
        kopf.className = 'editor-kopf';
        kopf.innerHTML = `Gasriese · ${ziel.name}<small>Alle Regler und Bausteine dieses Planeten (live). Die Schalter der Welt stehen oben.</small>`;
        const wurzel = document.createElement('div');
        editor.append(kopf, wurzel);
        inst.menue(wurzel);
        wurzel.querySelectorAll('details').forEach((d) => { (d as HTMLDetailsElement).open = false; });   // alle Abschnitte zugeklappt
      }
      if (typOffen) {   // Bausteine je Typ (z. B. „Reibung aus für alle Gasriesen“) auf den frisch aufgesetzten Planeten anwenden
        typOffen = false;
        for (const b of GAS_BAUSTEINE) if (b.schluessel in typ && typ[b.schluessel] !== b.standardAn) anwendenTyp(b.schluessel, typ[b.schluessel]);
      }
      deck = Math.min(1, deck + 1.2 * k.dtReal);
      status = deck >= 1 ? 'live' : 'blendet ein';

      const c: V3 = [ziel.p[0] - k.auge[0], ziel.p[1] - k.auge[1], ziel.p[2] - k.auge[2]];
      const R = ziel.r;
      const kam = instanzKamera(c, R, k.vor, k.oben, k.fov, k.aspekt);
      const sonne: V3 = [k.sonneRel[0] - c[0], k.sonneRel[1] - c[1], k.sonneRel[2] - c[2]];
      const ds = Math.hypot(sonne[0], sonne[1], sonne[2]);
      const helligkeit = Math.min(1.6, Math.max(0.45, Math.pow(120 / ds, 0.6)));
      // Bildausschnitt um den Planeten (Pixel), nah vor der Kamera: ganzes Bild
      const d = Math.hypot(c[0], c[1], c[2]);
      const f = k.hoehe / (2 * k.tanHalbFov);
      const pr = d > RAND * R ? (f * RAND * R) / Math.sqrt(Math.max(d * d - (RAND * R) ** 2, 1e-6)) : 1e9;
      const p = k.vp;
      const cw = p[3] * c[0] + p[7] * c[1] + p[11] * c[2] + p[15];
      const sx = ((p[0] * c[0] + p[4] * c[1] + p[8] * c[2] + p[12]) / cw * 0.5 + 0.5) * k.breite;
      const sy = (1 - ((p[1] * c[0] + p[5] * c[1] + p[9] * c[2] + p[13]) / cw * 0.5 + 0.5)) * k.hoehe;
      let x0 = Math.floor(sx - pr), y0 = Math.floor(sy - pr), x1 = Math.ceil(sx + pr), y1 = Math.ceil(sy + pr);
      x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(k.breite, x1); y1 = Math.min(k.hoehe, y1);
      if (x1 <= x0 || y1 <= y0) return null;   // außerhalb des Bildes
      const vorn = cw > 0;
      const rect: [number, number, number, number] = !vorn || d <= RAND * R ? [0, 0, k.breite, k.hoehe] : [x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)];
      if (rect[0] >= k.breite || rect[1] >= k.hoehe) return null;   // ganz außerhalb des Bildes: nichts zu zeichnen
      const tex = inst.zeichne({
        auge: kam.auge, invVP: kam.invVP, sonne, drehung: ziel.spin, helligkeit, tanHalbFov: k.tanHalbFov, ausschnitt: rect,
      }, k.dt, k.dtReal);
      return { tex, mitte: c, radius: R, deck, id: ziel.id };
    },
  };
}
