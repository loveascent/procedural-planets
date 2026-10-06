// Echter Gesteinsplanet in der Welt: der nächste große Gesteinsplanet bekommt die Bausteine des Gesteinsplaneten (Höhen-, Feuchte-, Fluss- und
// Wolkenkarten, Terrain-Kacheln, Wasser, Luft, Wolken …). Die Instanz wird beim ersten Bedarf geladen (der Code kommt erst dann ins Bild), übersetzt
// ihre Pipelines einmal und erzeugt die Karten für den Seed des Planeten in Zeitscheiben. Sie zeichnet aus der Kamera der Welt in eine Textur.
import type { Mat4 } from '../../math.ts';
import { instanzKamera } from './ansichtInst.ts';
import { FELS_BAUSTEINE } from '../typBausteine.ts';
import type { Koerper, V3 } from '../physik/koerper.ts';
import type { EinbettungsKontext, Einblendung } from './gasEinbettung.ts';

interface RockyInstanz {
  S: Record<string, number | string | boolean>;
  readonly bereit: boolean;
  setzeGroesse(w: number, h: number): void;
  setzeSeed(seed: string | number): void;
  arbeite(pixel?: number): void;
  menue(wurzel: HTMLElement | null): void;
  setze(k: string, v: number | string | boolean): void;
  fakten(): [string, string][];
  zeichne(a: { auge: V3; vp: Mat4; sonne: V3; drehung: number; helligkeit: number }, dt: number): GPUTexture;
}

export function erstelleRockyEinbettung(dev: GPUDevice, editor: HTMLElement) {
  let inst: RockyInstanz | null = null;
  let laedt = false;
  let aktiv: number | null = null;
  let deck = 0;
  let aufloesung = 1024;   // Kartenauflösung der Instanz (globaler Qualitätsregler der Welt)
  let budget = 1.5e6;   // Pixel der Kartenerzeugung je Bild, wächst solange das Bild flüssig bleibt
  let ruhe = 0;   // Bilder nach einem Seedwechsel, in denen „bereit“ noch nicht gilt (die Erzeugung startet erst im nächsten Bild)
  let status = 'aus';
  let menueFuer: number | null = null;
  // Einstellungen je Körper (Abweichungen vom Stand direkt nach dem Seed) und Bausteine je Typ (gelten für alle Gesteinsplaneten)
  const koerperS = new Map<number, Record<string, number | string | boolean>>();
  let inhalt: number | null = null;
  let basis: Record<string, number | string | boolean> = {};
  let typ: Record<string, boolean> = {};
  const gemerkt: Record<string, number | string | boolean> = {};
  let typOffen = false;
  const OHNE = new Set(['seed', 'tilt', 'res']);   // gehören dem Körper bzw. der globalen Qualität
  const abweichung = () => { const d: Record<string, number | string | boolean> = {}; if (inst) for (const k of Object.keys(inst.S)) if (!OHNE.has(k) && inst.S[k] !== basis[k]) d[k] = inst.S[k]; return d; };
  const anwendenTyp = (key: string, an: boolean) => {
    const b = FELS_BAUSTEINE.find((x) => x.schluessel === key);
    if (!b || !inst) return;
    if (!an) { gemerkt[key] = inst.S[key]; inst.setze(key, b.aus); } else inst.setze(key, gemerkt[key] ?? b.an);
  };
  const menueAb = () => { if (menueFuer !== null) { inst?.menue(null); editor.innerHTML = ''; menueFuer = null; } };

  function waehle(k: EinbettungsKontext): Koerper | null {
    let best: Koerper | null = null, bpx = 0;
    for (const g of k.koerper) {
      if (g.art !== 'gestein') continue;
      const d = Math.hypot(g.p[0] - k.auge[0], g.p[1] - k.auge[1], g.p[2] - k.auge[2]);
      const px = (g.r / Math.max(d, 1e-6)) * k.pixelProRadiant;
      if (px > (g.id === aktiv ? k.anPx * 0.4 : k.anPx) && px > bpx) { best = g; bpx = px; }
    }
    return best;
  }

  return {
    get ausgeblendet(): number | null { return aktiv !== null && deck >= 0.999 ? aktiv : null; },
    get status() { return status; },
    /** Kartenauflösung der Instanz */
    setzeQualitaet(res: number) { aufloesung = res; if (inst) inst.setze('res', res); },
    /** Baustein je Typ ein-/ausschalten (gilt für alle Gesteinsplaneten) */
    setzeTyp(key: string, an: boolean) { typ[key] = an; if (inst && inhalt !== null) anwendenTyp(key, an); },
    holeEinstellungen(): Record<number, Record<string, number | string | boolean>> {
      const r: Record<number, Record<string, number | string | boolean>> = {};
      for (const [id, s] of koerperS) r[id] = s;
      if (inst && inhalt !== null && inst.bereit) r[inhalt] = abweichung();
      return r;
    },
    setzeEinstellungen(rec: Record<number, Record<string, number | string | boolean>>, typRec: Record<string, boolean>) {
      koerperS.clear();
      for (const [id, s] of Object.entries(rec)) koerperS.set(Number(id), s);
      typ = { ...typRec }; inhalt = null; aktiv = null; menueAb();
    },
    holeTyp(): Record<string, boolean> { return { ...typ }; },
    /** Steckbrief des gerade echt berechneten Körpers (sonst leer) */
    fakten(id: number): [string, string][] { return inst && inhalt === id && inst.bereit ? inst.fakten() : []; },
    /** für Prüfwerkzeuge */
    get instanz() { return inst; },
    aktualisiere(k: EinbettungsKontext, an: boolean): Einblendung | null {
      const ziel = an ? waehle(k) : null;
      if (!ziel) { if (aktiv !== null) { aktiv = null; deck = 0; } status = 'aus'; editor.style.display = 'none'; return null; }
      if (!inst) {
        status = 'lädt';
        if (!laedt) {
          laedt = true;
          import('../../rocky/main.js' as string).then((m) => m.run({ kopflos: { device: dev, breite: k.breite, hoehe: k.hoehe, seed: ziel.seed, aufloesung } }))
            .then((i: RockyInstanz) => { inst = i; aktiv = null; });
        }
        return null;
      }
      if (aktiv !== ziel.id) {
        aktiv = ziel.id; deck = 0;
        // Derselbe Planet wie zuletzt: Karten und Menü behalten; anderer Planet: Karten neu erzeugen
        if (inhalt !== ziel.id) {
          if (inhalt !== null && inst.bereit) koerperS.set(inhalt, abweichung());   // Einstellungen des bisherigen Planeten merken
          menueAb(); ruhe = 4; inst.setzeSeed(ziel.seed);
          basis = { ...inst.S };
          const alt = koerperS.get(ziel.id);
          if (alt) for (const [key, v] of Object.entries(alt)) inst.setze(key, v);
          inhalt = ziel.id; typOffen = true;
          for (const key of Object.keys(gemerkt)) delete gemerkt[key];
        }
      }
      inst.setzeGroesse(k.breite, k.hoehe);
      editor.style.display = '';
      // Seed aus dem Menü des echten Planeten (Feld „seed“, Zufall) gilt auch für den Körper in der Welt
      const gewaehlt = String(inst.S.seed);
      if (ruhe <= 0 && gewaehlt !== String(ziel.seed)) {
        const zahl = Number(gewaehlt);
        ziel.seed = Number.isFinite(zahl) ? Math.floor(zahl) % 2147483647 : [...gewaehlt].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) >>> 1; k.neuGebacken(ziel);
      }
      inst.S.tilt = (ziel.tilt * 180) / Math.PI;
      if (ruhe > 0 || !inst.bereit) { ruhe--; status = 'erzeugt Karten'; budget = k.dtReal > 0.025 ? Math.max(2e5, budget * 0.7) : Math.min(6e6, budget * 1.1); inst.arbeite(budget); return null; }
      if (menueFuer !== ziel.id) {
        menueFuer = ziel.id;
        editor.innerHTML = '';
        const kopf = document.createElement('div');
        kopf.className = 'editor-kopf';
        kopf.innerHTML = `Gesteinsplanet · ${ziel.name}<small>Alle Regler und Bausteine dieses Planeten (live). Die Schalter der Welt stehen oben.</small>`;
        const wurzel = document.createElement('div');
        editor.append(kopf, wurzel);
        inst.menue(wurzel);
        wurzel.querySelectorAll('details').forEach((d) => { (d as HTMLDetailsElement).open = false; });   // alle Abschnitte zugeklappt
      }
      if (typOffen) {   // Bausteine je Typ (z. B. „Vulkane aus für alle Gesteinsplaneten“) auf den frisch aufgesetzten Planeten anwenden
        typOffen = false;
        for (const b of FELS_BAUSTEINE) if (b.schluessel in typ && typ[b.schluessel] !== b.standardAn) anwendenTyp(b.schluessel, typ[b.schluessel]);
      }
      deck = Math.min(1, deck + 1.2 * k.dtReal);
      status = deck >= 1 ? 'live' : 'blendet ein';

      const c: V3 = [ziel.p[0] - k.auge[0], ziel.p[1] - k.auge[1], ziel.p[2] - k.auge[2]];
      const R = ziel.r;
      const kam = instanzKamera(c, R, k.vor, k.oben, k.fov, k.aspekt);
      const vp = kam.vp;
      const sonne: V3 = [k.sonneRel[0] - c[0], k.sonneRel[1] - c[1], k.sonneRel[2] - c[2]];
      const ds = Math.hypot(sonne[0], sonne[1], sonne[2]);
      const helligkeit = Math.min(1.6, Math.max(0.45, Math.pow(120 / ds, 0.6)));
      const tex = inst.zeichne({ auge: kam.auge, vp, sonne, drehung: ziel.spin, helligkeit }, k.dt);
      return { tex, mitte: c, radius: R, deck, id: ziel.id };
    },
  };
}
