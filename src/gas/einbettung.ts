// Gasriese als eingebettete Instanz (Welt-Schicht): eigene Einstellungen, eigene Felder, keine Seite, kein Menü.
// Die Welt gibt Kamera, Sonne und Drehung vor; die Instanz rechnet ihre Strömung (Vorrechnen in kleinen Scheiben, dann in Echtzeit)
// und zeichnet in eine Textur mit Alpha (Planet, Atmosphärensaum, Ringe), die die Welt über ihre Szene legt.
import { App } from './app';
import { neueEinstellungen } from './zustand';
import type { Mat4, Vec3 } from '../math';

/** Kameraübergabe: alles in Einheiten des Planeten (Radius 1, Mittelpunkt im Ursprung, Achsen wie die Welt). */
export interface Ansicht {
  auge: Vec3;
  /** Inverse Projektion × Ansicht, in Planeteneinheiten */
  invVP: Mat4;
  /** Richtung zur Sonne (Welt-Achsen) */
  sonne: Vec3;
  /** Drehwinkel des Planeten (wie `spin` des Planeten in der Welt) */
  drehung: number;
  /** Sonnenhelligkeit relativ zur Seite des Gasriesen (Entfernung zur Sonne) */
  helligkeit: number;
  tanHalbFov: number;
  /** Bildbereich in Pixeln (x, y, Breite, Höhe), nur dort wird gezeichnet */
  ausschnitt?: [number, number, number, number];
}

export class GasInstanz {
  readonly app: App;
  /** Vorrechnen fertig, Bilder sind nutzbar */
  bereit = false;
  private seed = 0;
  /** was die Welt zuletzt eingestellt hat (Seed, Vorlage): Abweichung = der Nutzer hat im Menü etwas gewählt */
  private gesetzt = { seed: 0, preset: 'Zufall' };

  constructor(device: GPUDevice, breite: number, hoehe: number) {
    this.app = new App(device, neueEinstellungen(), { breite, hoehe });
  }

  /** Planet aus dem Seed der Welt (gleiche Vorlage wie die gebackene Oberfläche: `randomPreset(seed)` mit Standardwahl). */
  setzePlanet(seed: number) {
    const a = this.app;
    this.seed = seed;
    this.bereit = false;
    a.S.preset = 'Zufall'; a.S.seed = (seed >>> 0) || 1;
    a.applyPreset();
    this.gesetzt = { seed: a.S.seed, preset: a.S.preset };
  }

  /** Das Menü des Gasriesen (alle Regler) in `wurzel` aufbauen; null = entfernen. */
  menue(wurzel: HTMLElement | null) {
    if (this.app.menuWurzel) this.app.menuWurzel.innerHTML = '';
    this.app.menuWurzel = wurzel;
    if (wurzel) this.app.buildUI();
  }

  setzeGroesse(breite: number, hoehe: number) {
    if (!this.app.kopflos) return;
    this.app.kopflos.breite = breite; this.app.kopflos.hoehe = hoehe;
  }

  get seedWert() { return this.seed; }
  merkeSeed(seed: number) { this.seed = seed; }
  /** Nach `restore`: die aktuelle Wahl gilt als von der Welt gesetzt. */
  abgleichen() { const S = this.app.S; this.gesetzt = { seed: S.seed, preset: S.preset }; this.seed = S.seed; }

  /** Im Menü wurde ein anderer Planet gewählt (Zufallsplanet, Vorlage): Auswahl zurückgeben (einmal), sonst null. */
  geaenderteWahl(): { seed: number; vorlage: string | undefined } | null {
    const S = this.app.S;
    if (S.seed === this.gesetzt.seed && S.preset === this.gesetzt.preset) return null;
    this.gesetzt = { seed: S.seed, preset: S.preset };
    return { seed: S.seed, vorlage: S.preset === 'Zufall' ? undefined : S.preset };
  }

  /** Planeten-Code (wie „Planeten-Code kopieren“ auf der Seite des Gasriesen) aus einer Momentaufnahme. */
  planetenCode(snapshot: string): string { return this.app.encode(snapshot); }

  /** Steckbrief des echt berechneten Planeten (Vorlage, Winde, Stürme, Rotation …) als Zeilen. */
  fakten(): [string, string][] {
    const a = this.app, p = a.preset, f = p.facts;
    const z: [string, string][] = [['Vorlage', a.S.preset === 'Zufall' ? `Zufallsplanet (Seed ${a.S.seed})` : a.S.preset]];
    if (f) {
      z.push(['Durchmesser', `${f.diameterKm.toLocaleString('de-DE')} km (${(f.diameterKm / 12742).toFixed(1)}× Erde)`], ['Temperatur', `${f.tempC} °C (Wolkenobergrenze)`], ['Schwerkraft', `${f.gravity} m/s²`], ['Stärkste Winde', `${f.windMs} m/s`], ['Monde (Vorbild)', String(f.moons)]);
    }
    z.push(['Tag', `${p.rotationHours.toFixed(1)} h`], ['Achsneigung', `${p.tilt.toFixed(1)}°`], ['Abplattung', p.oblateness.toFixed(3)], ['Stürme', String(a.storms.length)], ['Ringe', p.rings ? 'ja' : 'nein'], ['Wolken', p.cloud]);
    return z;
  }

  /** Läuft nach einem Neustart im Menü wieder das Vorrechnen? Dann ist die Instanz nicht bereit. */
  pruefeNeustart() { const a = this.app; if (a.needsInit || a.needsDye || a.warm > 0) this.bereit = false; }

  /** Vorrechnen in kleinen Scheiben (höchstens `schritte` Simulationsschritte je Aufruf). Gibt true zurück, sobald fertig. */
  vorrechnen(schritte = 8): boolean {
    schritte = Math.max(1, Math.round(schritte * (128 / this.app.S.velRes) ** 2));   // großes Gitter = teurer Schritt = weniger Schritte je Bild
    const a = this.app;
    a.initIfNeeded();
    if (a.warm > 0) {
      const n = Math.min(a.warm, schritte);
      for (let k = 0; k < n; k++) a.submitStep();
      a.warm -= n;
      if (a.warm === 0) this.bereit = true;
    } else this.bereit = true;
    return this.bereit;
  }

  /** Rechnet `real` Sekunden Strömung weiter und zeichnet aus der Sicht der Welt; Rückgabe: Textur (premultipliziertes RGBA). */
  zeichne(ansicht: Ansicht, real: number, bildzeit = real): GPUTexture {
    const a = this.app;
    a.ansicht = ansicht;
    // Schritte je Bild an die Bildzeit koppeln (stepMs wird sonst nur beim Vorrechnen der Seite gemessen): zu langsam → weniger Schritte
    a.stepMs = Math.min(40, Math.max(0.5, (a.stepMs || 2) * (bildzeit > 0.022 ? 1.25 : 0.985)));
    a.frameOnce(real);
    return a.target!;
  }

  zerstoeren() { this.app.target?.destroy(); }
}
