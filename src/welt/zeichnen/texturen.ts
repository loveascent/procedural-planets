// Texturfeld der gebackenen Oberflächen: eine Scheibe je Körper, Scheiben werden vergeben und beim Verschwinden des Körpers frei.
// Das Backen läuft in Zeitscheiben (Generator), damit die Anzeige nicht ruckelt; bis dahin zeigt die Scheibe Grau.
import { backe, MIPS, TEX_B, TEX_H } from '../oberflaeche/backen.ts';
import type { Art, Koerper } from '../physik/koerper.ts';

export const SCHEIBEN = 112;

interface Auftrag { id: number; scheibe: number; gen: Generator<void, import('../oberflaeche/backen.ts').Bild, void> }

export class Texturen {
  readonly tex: GPUTexture;
  readonly view: GPUTextureView;
  readonly sampler: GPUSampler;
  private frei: number[] = [];
  private scheibeVon = new Map<number, number>();
  private auftraege: Auftrag[] = [];
  /** fertig gebackene Körper (id) */
  readonly fertig = new Set<number>();

  constructor(private dev: GPUDevice) {
    this.tex = dev.createTexture({ size: [TEX_B, TEX_H, SCHEIBEN], mipLevelCount: MIPS, format: 'rgba8unorm-srgb', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    this.view = this.tex.createView({ dimension: '2d-array' });
    this.sampler = dev.createSampler({ magFilter: 'linear', minFilter: 'linear', mipmapFilter: 'linear', addressModeU: 'repeat', addressModeV: 'clamp-to-edge' });
    for (let i = SCHEIBEN - 1; i >= 1; i--) this.frei.push(i);
    // Scheibe 0: neutrales Grau für alles, was (noch) keine eigene Scheibe hat
    const grau = new Uint8Array(TEX_B * TEX_H * 4).fill(110);
    for (let i = 3; i < grau.length; i += 4) grau[i] = 255;
    this.lade(0, [grau, ...this.leereMips()]);
  }

  private leereMips(): Uint8Array[] {
    const r: Uint8Array[] = []; let w = TEX_B, h = TEX_H;
    for (let l = 1; l < MIPS; l++) { w = Math.max(1, w >> 1); h = Math.max(1, h >> 1); const a = new Uint8Array(w * h * 4).fill(110); for (let i = 3; i < a.length; i += 4) a[i] = 255; r.push(a); }
    return r;
  }

  private lade(scheibe: number, stufen: Uint8Array[]) {
    let w = TEX_B, h = TEX_H;
    stufen.forEach((d, l) => {
      this.dev.queue.writeTexture({ texture: this.tex, mipLevel: l, origin: [0, 0, scheibe] }, d.buffer as ArrayBuffer, { bytesPerRow: w * 4, rowsPerImage: h, offset: d.byteOffset }, [w, h, 1]);
      w = Math.max(1, w >> 1); h = Math.max(1, h >> 1);
    });
  }

  /** Scheibe eines Körpers (0 = Grau, solange nichts zugeteilt/gebacken). */
  scheibe(id: number): number { return this.fertig.has(id) ? this.scheibeVon.get(id) ?? 0 : 0; }

  anfordern(k: Koerper) {
    if (this.scheibeVon.has(k.id)) return;
    const s = this.frei.pop();
    if (s === undefined) return;
    this.scheibeVon.set(k.id, s);
    const art: Art = k.art;
    this.auftraege.push({ id: k.id, scheibe: s, gen: backe(art, k.seed, k.vorlage) });
  }

  /** Körper hat sich geändert (Seed oder Vorlage aus dem Menü): Oberfläche neu backen; bis dahin bleibt die alte stehen. */
  neuBacken(k: Koerper) {
    const s = this.scheibeVon.get(k.id);
    if (s === undefined) return;
    this.auftraege = this.auftraege.filter((a) => a.id !== k.id);
    this.auftraege.push({ id: k.id, scheibe: s, gen: backe(k.art, k.seed, k.vorlage) });
  }

  /** Alles verwerfen (z. B. nach dem Laden eines gespeicherten Systems): alle Körper werden neu gebacken. */
  leeren() {
    this.auftraege = []; this.scheibeVon.clear(); this.fertig.clear();
    this.frei = []; for (let i = SCHEIBEN - 1; i >= 1; i--) this.frei.push(i);
  }

  freigeben(lebendeIds: Set<number>) {
    for (const [id, s] of [...this.scheibeVon]) {
      if (lebendeIds.has(id)) continue;
      this.scheibeVon.delete(id); this.fertig.delete(id); this.frei.push(s);
      this.auftraege = this.auftraege.filter((a) => a.id !== id);
    }
  }

  /** Backt höchstens `ms` Millisekunden; gibt die Zahl offener Aufträge zurück. */
  arbeite(ms: number): number {
    const ende = performance.now() + ms;
    while (this.auftraege.length && performance.now() < ende) {
      const a = this.auftraege[0];
      const r = a.gen.next();
      if (r.done) { this.lade(a.scheibe, r.value.daten); this.fertig.add(a.id); this.auftraege.shift(); }
    }
    return this.auftraege.length;
  }
  offen() { return this.auftraege.length; }
}
