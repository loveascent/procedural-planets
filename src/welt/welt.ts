// Welt-Schicht: viele Planeten, Monde, eine Sonne und Kollisionen in einer 3D-Szene.
// Physik (CPU, `physik/`) und Aussehen (GPU, `zeichnen/`) sind getrennt; jede Funktion ist ein Baustein mit Schalter (`bausteine.ts`).
import { BAUSTEINE, standardSchalter, type Schalter } from './bausteine.ts';
import { finde, type Koerper, type V3, type Welt } from './physik/koerper.ts';
import { erzeugeSystem, STANDARD_SYSTEM } from './physik/system.ts';
import { weltSchritt, zeitRestZuruecksetzen } from './physik/schritt.ts';
import { planetGegenPlanet, naechsterPlanet, werfeAuf } from './physik/szenarien.ts';
import { gesteinFuer } from './oberflaeche/backen.ts';
import { starteGeraet } from './zeichnen/geraet.ts';
import { Kamera } from './zeichnen/kamera.ts';
import { Texturen } from './zeichnen/texturen.ts';
import { erstellePlanetenZeichner, INSTANZ_FLOATS, MAX_INSTANZEN } from './zeichnen/planetenZeichner.ts';
import { erstelleLeuchtenZeichner, LEUCHT_FLOATS, MAX_LEUCHT } from './zeichnen/leuchtenZeichner.ts';
import { erstelleLinienZeichner, MAX_LINIENPUNKTE } from './zeichnen/linienZeichner.ts';
import { erstelleHimmelZeichner } from './zeichnen/himmelZeichner.ts';
import { Spuren } from './zeichnen/spuren.ts';
import { Blitze } from './zeichnen/blitze.ts';
import { waehleStufen } from './zeichnen/lod.ts';
import { U_BYTES, MAX_KUGELN } from './zeichnen/shader/gemeinsam.ts';
import { baueOberflaeche, type Steuerung } from './oberflaeche/panel.ts';

const SAUM: Record<string, number> = { erde: 0.65, wueste: 0.25, eis: 0.2, lava: 0.3, grau: 0 };

export async function startWelt() {
  const canvas = document.getElementById('welt') as HTMLCanvasElement;
  const g = await starteGeraet(canvas);
  const { dev } = g;
  const schalter: Schalter = standardSchalter();
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
  const spuren = new Spuren();
  const blitze = new Blitze();
  const baueShader = () => planeten.baue({ atmosphaere: schalter.atmosphaere, finsternis: schalter.finsternis, lebendig: schalter.lebendig });
  baueShader();

  let fokus: number | null = null;
  let auswahl: number | null = null;
  let tempo = 0.6;
  let pause = false;
  let abstandZiel = 900;
  let letzterFokusOrt: V3 = [0, 0, 0];
  let letzterSonnenwinkel: number | null = null;
  const info = { fps: 0, teilschritte: 0, voll: [] as string[], punkte: 0, backen: 0 };
  let jetzt = 0;

  const uData = new Float32Array(U_BYTES / 4);
  const inst = new Float32Array(MAX_INSTANZEN * INSTANZ_FLOATS);
  const leucht = new Float32Array(MAX_LEUCHT * LEUCHT_FLOATS);
  const lin = new Float32Array(MAX_LINIENPUNKTE * 7);

  const sonne = () => w.koerper.find((k) => k.art === 'sonne');

  function setzeFokus(id: number | null, naehe?: number) {
    fokus = id; letzterSonnenwinkel = null;
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
    spuren.leeren(); blitze.zuruecksetzen(); zeitRestZuruecksetzen();
    auswahl = null; setzeFokus(null);
  }

  function setzeSchalter(key: string, an: boolean) {
    schalter[key] = an;
    const b = BAUSTEINE.find((x) => x.schluessel === key);
    if (!b) return;
    if (b.wirkt === 'pipeline') baueShader();
    if (b.wirkt === 'neustart') neuesSystem(seed);
    if (key === 'spuren' && !an) spuren.leeren();
  }

  const ste: Steuerung = {
    schalter, setzeSchalter,
    tempo: () => tempo, setzeTempo: (t) => { tempo = t; },
    pause: () => pause, setzePause: (p) => { pause = p; },
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
  baueOberflaeche(ste);

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
    else if (e.key === ' ') { pause = !pause; e.preventDefault(); }
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
      info.teilschritte = weltSchritt(w, dt, tempo, { planetenZiehen: schalter.planetenZiehen, kollision: schalter.kollision, truemmer: schalter.truemmer });
      const t = w.truemmer;
      for (let i = 0; i < t.n; i++) t.alter[i] += dt * tempo;
    }
    if (schalter.spuren) spuren.aktualisiere(w);
    if (schalter.blitze) blitze.uebernimm(w, jetzt); else blitze.zuruecksetzen();

    // Fokus verfolgen; verschwindet der Körper (verschmolzen), bleibt die Kamera am letzten Ort
    if (fokus !== null) { const k = finde(w, fokus); if (k) letzterFokusOrt = [k.p[0], k.p[1], k.p[2]]; else { fokus = null; } }
    kam.setzeZiel(fokus === null ? (letzterFokusOrt = [0, 0, 0]) : letzterFokusOrt, false);
    // Die Kamera dreht mit, damit die Sonnenseite des Fokuskörpers sichtbar bleibt, während er die Sonne umkreist
    const fk = fokus === null ? undefined : finde(w, fokus), sk = sonne();
    if (fk && sk && fk.art !== 'sonne') {
      const wnk = Math.atan2(sk.p[0] - fk.p[0], sk.p[2] - fk.p[2]);
      if (letzterSonnenwinkel !== null) { let d = wnk - letzterSonnenwinkel; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; kam.gier += d; }
      letzterSonnenwinkel = wnk;
    } else letzterSonnenwinkel = null;
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
    const sph = w.koerper.filter((k) => k.art !== 'sonne').map((k) => ({ k, d: (k.p[0] - auge[0]) ** 2 + (k.p[1] - auge[1]) ** 2 + (k.p[2] - auge[2]) ** 2 })).sort((a, c) => a.d - c.d).slice(0, MAX_KUGELN);
    sph.forEach(({ k }, i) => { const r = rel(k.p); uData.set([r[0], r[1], r[2], k.r], 36 + 4 * i); });
    uData.set([pixelProRadiant, schalter.finsternis ? sph.length : 0, 0, 0], 32);
    dev.queue.writeBuffer(uni, 0, uData.buffer, 0, U_BYTES);

    // Stufen und Kugel-Instanzen
    const lod = waehleStufen(w.koerper, auge, pixelProRadiant, schalter.lod);
    info.voll = lod.voll.map((k) => k.name);
    let ni = 0, nl = 0, punkte = 0;
    const farbePunkt = (k: Koerper): [number, number, number] => k.art === 'sonne' ? [1, 0.85, 0.5] : k.art === 'gas' ? [0.85, 0.75, 0.55] : k.art === 'mond' ? [0.6, 0.6, 0.62] : [0.75, 0.7, 0.65];
    for (const k of w.koerper) {
      const stufe = lod.stufen.get(k.id)!;
      const r = rel(k.p);
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

    const nlin = schalter.spuren ? spuren.fuelle(w, auge, lin) : 0;
    linien.setze(lin, nlin);

    const enc = dev.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [{ view: g.ctx.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0.003, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
      depthStencilAttachment: { view: g.tiefe(), depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store' },
    });
    if (schalter.himmel) himmel.zeichne(pass);
    planeten.zeichne(pass);
    if (schalter.spuren) linien.zeichne(pass);
    leuchten.zeichne(pass);
    pass.end();
    dev.queue.submit([enc.finish()]);
    requestAnimationFrame(bild);
  }
  requestAnimationFrame(bild);

  // Prüf- und Einstiegspunkt für Werkzeuge (Bildvergleich, Selbsttest)
  (window as unknown as { welt: unknown }).welt = { ste, kam, get w() { return w; }, schalter, setzeFokus, tex, info };
}
