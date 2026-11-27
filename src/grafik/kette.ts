// Gemeinsame Bildkette nach dem Zeichnen: Zwischentexturen verwalten und die eingeschalteten Stufen nacheinander laufen lassen.
// Es gibt sie nur, solange eine Stufe gebraucht wird; was in einem Bild nicht angefordert wurde, wird am Ende freigegeben.
import { STUFEN, STUFEN_KOPF } from './stufen';
import type { KettenStand } from './menue';

export interface KettenWahl { up: string; aa: string; scharf: boolean; staerke: number; dither: boolean; f16?: boolean }

/** Kantenadaptiv mit 16-Bit-Gleitkomma (WGSL „f16“) für die 12 Farben, ihre Helligkeit und die Summe. */
function kanteF16(code: string): string {
  let c = code;
  for (const [alt, neu] of [
    ['var c: array<vec3f, 16>; var l: array<f32, 16>;', 'var c: array<vec3h, 16>; var l: array<f16, 16>;'],
    ['c[k] = lade(i + vec2i(x - 1, y - 1)); l[k] = luma(c[k]);', 'c[k] = vec3h(lade(i + vec2i(x - 1, y - 1))); l[k] = c[k].r + 2.0h * c[k].g + c[k].b;'],
    ['let g = vec2f(l[k + 1] - l[k - 1], l[k + 4] - l[k - 4]);', 'let g = vec2f(f32(l[k + 1] - l[k - 1]), f32(l[k + 4] - l[k - 4]));'],
    ['lo = min(lo, c[k]); hi = max(hi, c[k]);', 'lo = min(lo, vec3f(c[k])); hi = max(hi, vec3f(c[k]));'],
    ['var summe = vec3f(0.0); var gew = 0.0;', 'var summe = vec3h(0.0h); var gew = 0.0;'],
    ['summe += c[y * 4 + x] * g; gew += g;', 'summe += c[y * 4 + x] * f16(g); gew += g;'],
    ['clamp(summe / gew, lo, hi)', 'clamp(vec3f(summe) / gew, lo, hi)'],
  ]) {
    if (!c.includes(alt)) throw new Error('shader-f16: Stelle fehlt: ' + alt);
    c = c.replace(alt, neu);
  }
  return c;
}

export class Kette {
  private tex = new Map<string, { t: GPUTexture; v: GPUTextureView; key: string; benutzt: boolean }>();
  private pipes = new Map<string, GPURenderPipeline>();
  private ubufs = new Map<string, GPUBuffer>();
  private glatt: GPUSampler;

  constructor(readonly device: GPUDevice) {
    this.glatt = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
  }

  /** Zwischentextur unter einem Namen; neu angelegt nur, wenn sich Größe, Format oder Abtastzahl ändern. `neu` meldet das. */
  holen(name: string, w: number, h: number, format: GPUTextureFormat = 'rgba16float', samples = 1): { t: GPUTexture; v: GPUTextureView; neu: boolean } {
    const key = `${w}x${h} ${format} ${samples}`;
    let e = this.tex.get(name);
    let neu = false;
    if (!e || e.key !== key) {
      e?.t.destroy();
      const t = this.device.createTexture({
        size: [w, h], format, sampleCount: samples,
        usage: samples > 1 || format.startsWith('depth') ? GPUTextureUsage.RENDER_ATTACHMENT : GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
      });
      e = { t, v: t.createView(), key, benutzt: true };
      this.tex.set(name, e);
      neu = true;
    }
    e.benutzt = true;
    return { t: e.t, v: e.v, neu };
  }

  /** Am Ende jedes Bildes: nicht mehr gebrauchte Zwischentexturen freigeben. */
  aufraeumen() {
    for (const [name, e] of this.tex) { if (!e.benutzt) { e.t.destroy(); this.tex.delete(name); } else e.benutzt = false; }
  }

  zerstoeren() {
    for (const e of this.tex.values()) e.t.destroy();
    for (const b of this.ubufs.values()) b.destroy();
    this.tex.clear(); this.ubufs.clear(); this.pipes.clear();
  }

  /** Eine Stufe als Vollbild-Durchgang. */
  stufe(enc: GPUCommandEncoder, name: string, quelle: GPUTextureView, ziel: GPUTextureView, format: GPUTextureFormat, g: number[], p: number[] = [0, 0, 0, 0], hilfe?: GPUTextureView) {
    const d = this.device, code = name === 'edge16' ? kanteF16(STUFEN.edge) : STUFEN[name];
    const key = `${name} ${format}`;
    let pipe = this.pipes.get(key);
    if (!pipe) {
      const module = d.createShaderModule({ label: `stufe-${name}`, code: (name === 'edge16' ? 'enable f16;\n' : '') + STUFEN_KOPF + code });
      pipe = d.createRenderPipeline({ layout: 'auto', vertex: { module, entryPoint: 'vs' }, fragment: { module, entryPoint: 'fs', targets: [{ format }] } });
      this.pipes.set(key, pipe);
    }
    // layout 'auto': nur die Bindungen angeben, die die Stufe wirklich benutzt
    const entries: GPUBindGroupEntry[] = [];
    if (code.includes('K0.')) {
      let u = this.ubufs.get(name);
      if (!u) { u = d.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }); this.ubufs.set(name, u); }
      d.queue.writeBuffer(u, 0, new Float32Array([...g, ...p]));
      entries.push({ binding: 0, resource: { buffer: u } });
    }
    if (code.includes('var glatt')) entries.push({ binding: 1, resource: this.glatt });
    entries.push({ binding: 2, resource: quelle });
    if (hilfe) entries.push({ binding: 3, resource: hilfe });
    const pass = enc.beginRenderPass({ colorAttachments: [{ view: ziel, loadOp: 'clear', storeOp: 'store', clearValue: [0, 0, 0, 0] }] });
    pass.setPipeline(pipe);
    pass.setBindGroup(0, d.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries }));
    pass.draw(3);
    pass.end();
  }

  /** Für Seiten mit eigenem Zeichenweg (Gesteinsplanet, Sonnensystem): interne Größe und Zielbild liefern; `fertig` führt die Stufen aus. */
  seite(enc: () => GPUCommandEncoder, ziel: () => GPUTextureView, format: GPUTextureFormat, w: number, h: number, S: KettenStand) {
    const mass = S.fxUp !== 'off' ? S.fxScale : 1;
    const iw = Math.max(16, Math.round(w * mass)), ih = Math.max(16, Math.round(h * mass));
    const o: KettenWahl = { up: S.fxUp, aa: S.fxAA, scharf: S.fxSharpOn, staerke: S.fxSharp, dither: S.fxDither };
    const innen = Kette.noetig(o, iw, ih, w, h) ? this.holen('seite', iw, ih, format) : null;
    return {
      w: iw, h: ih,
      bild: () => (innen ? innen.v : ziel()),
      fertig: () => { if (innen) this.zeichne(enc(), innen.v, iw, ih, ziel(), format, w, h, o); this.aufraeumen(); },
    };
  }

  /** Braucht die Kette überhaupt einen Durchgang? (Sonst kann direkt ins Ziel gezeichnet werden.) */
  static noetig(o: KettenWahl, sw: number, sh: number, zw: number, zh: number): boolean {
    return o.aa === 'fxaa' || o.aa === 'mlaa' || o.scharf || o.dither || sw !== zw || sh !== zh;
  }

  /** Quelle (sw × sh) → Ziel (zw × zh): Glätten in Quellauflösung, Hochskalieren, Schärfen und Dithering in Zielauflösung. */
  zeichne(enc: GPUCommandEncoder, quelle: GPUTextureView, sw: number, sh: number, ziel: GPUTextureView, zielFormat: GPUTextureFormat, zw: number, zh: number, o: KettenWahl) {
    const schritte: string[] = [];
    if (o.aa === 'fxaa') schritte.push('fxaa');
    if (o.aa === 'mlaa') schritte.push('mlaa');
    if (sw !== zw || sh !== zh) schritte.push(o.up === 'edge' && o.f16 && this.device.features.has('shader-f16') ? 'edge16' : ['cubic', 'lanczos', 'edge'].includes(o.up) ? o.up : 'linear');
    if (o.scharf) schritte.push('scharf');
    if (o.dither) schritte.push('dither');
    if (!schritte.length) schritte.push('linear');
    let src = quelle, w = sw, h = sh;
    schritte.forEach((s, i) => {
      const letzte = i === schritte.length - 1;
      const gross = s !== 'fxaa' && s !== 'mlaa';
      const aw = gross ? zw : w, ah = gross ? zh : h;
      const aus = letzte ? { v: ziel } : this.holen(`k${i}-${s}`, aw, ah);
      const fmt: GPUTextureFormat = letzte ? zielFormat : 'rgba16float';
      if (s === 'mlaa') {
        const kanten = this.holen('mlaa-kanten', w, h, 'rgba8unorm'), gew = this.holen('mlaa-gewichte', w, h);
        this.stufe(enc, 'mKanten', src, kanten.v, 'rgba8unorm', [w, h, w, h]);
        this.stufe(enc, 'mGewichte', kanten.v, gew.v, 'rgba16float', [w, h, w, h]);
        this.stufe(enc, 'mMischen', src, aus.v, fmt, [w, h, aw, ah], undefined, gew.v);
      } else this.stufe(enc, s, src, aus.v, fmt, [w, h, aw, ah], [o.staerke, 0, 0, 0]);
      src = aus.v; w = aw; h = ah;
    });
  }
}
