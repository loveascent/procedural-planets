// Einblendung: legt die Textur einer eingebetteten Planeten-Instanz (premultipliziertes RGBA, volles Bild der Welt-Kamera) über die Szene.
// Die Tiefe wird aus der Kugel (Mittelpunkt, Radius) berechnet, damit Monde und Trümmer davor/dahinter richtig verdeckt werden.
import { invert, type Mat4 } from '../../math.ts';
import type { V3 } from '../physik/koerper.ts';

const SHADER = /* wgsl */`
struct E { invVp: mat4x4f, vp: mat4x4f, mr: vec4f, gr: vec4f };   // mr: Mitte xyz (kamerarelativ), Radius | gr: Breite, Höhe, Deckkraft, Modus (0 = Alpha der Textur, 1 = Kugel analytisch)
@group(0) @binding(0) var<uniform> e: E;
@group(0) @binding(1) var tex: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;

@vertex fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
  var p = array<vec2f, 3>(vec2f(-1, -1), vec2f(3, -1), vec2f(-1, 3));
  return vec4f(p[vi], 0.5, 1.0);
}

struct Aus { @location(0) farbe: vec4f, @builtin(frag_depth) tiefe: f32 };

@fragment fn fs(@builtin(position) fp: vec4f) -> Aus {
  var s = textureSampleLevel(tex, samp, fp.xy / e.gr.xy, 0.0);   // die Instanz kann kleiner als das Bild sein (Auflösung der echten Planeten)
  let ndc = vec2f((fp.x / e.gr.x) * 2.0 - 1.0, 1.0 - (fp.y / e.gr.y) * 2.0);
  let q = e.invVp * vec4f(ndc, 1.0, 1.0);
  let d = normalize(q.xyz / q.w);
  let c = e.mr.xyz; let r = e.mr.w;
  let b = dot(c, d);
  let disc = b * b - dot(c, c) + r * r;
  let treffer = disc > 0.0 && b > 0.0;
  // Modus 1 (Gesteinsplanet): die Textur hat kein Alpha; Kugel = deckend, Rand und Saum nach Helligkeit
  if (e.gr.w > 0.5) { s = vec4f(s.rgb, select(clamp(max(s.r, max(s.g, s.b)), 0.0, 1.0), 1.0, treffer)); }
  if (s.a <= 0.002) { discard; }
  let t = select(b, b - sqrt(max(disc, 0.0)), disc > 0.0);
  let cl = e.vp * vec4f(d * max(t, 1e-4), 1.0);
  var o: Aus;
  o.farbe = s * e.gr.z;
  o.tiefe = clamp(cl.z / cl.w, 0.0, 1.0);
  return o;
}
`;

export function erstelleEinblendung(dev: GPUDevice, format: GPUTextureFormat) {
  const layout = dev.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
    { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
  ] });
  const m = dev.createShaderModule({ code: SHADER });
  m.getCompilationInfo().then((i) => i.messages.filter((x) => x.type === 'error').forEach((x) => console.error('Einblendung:', x.lineNum, x.message)));
  const pipe = dev.createRenderPipeline({
    layout: dev.createPipelineLayout({ bindGroupLayouts: [layout] }),
    vertex: { module: m, entryPoint: 'vs' },
    fragment: { module: m, entryPoint: 'fs', targets: [{ format, blend: { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' } } }] },
    primitive: { topology: 'triangle-list' },
    depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less-equal' },
  });
  const sampler = dev.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
  const buf = dev.createBuffer({ size: 16 * 4 * 2 + 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const daten = new Float32Array(40);
  let bg: GPUBindGroup | null = null;
  let letzteTextur: GPUTexture | null = null;
  return {
    /** Zeichnet die Textur mit Deckkraft `deck`; `mitte` kamerarelativ, `vp` = Projektion × Ansicht der Welt-Kamera. */
    zeichne(pass: GPURenderPassEncoder, tex: GPUTexture, vp: Mat4, mitte: V3, radius: number, deck: number, w: number, h: number, modus = 0) {
      if (tex !== letzteTextur) { letzteTextur = tex; bg = dev.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer: buf } }, { binding: 1, resource: tex.createView() }, { binding: 2, resource: sampler }] }); }
      daten.set(invert(vp), 0); daten.set(vp, 16);
      daten.set([mitte[0], mitte[1], mitte[2], radius, w, h, deck, modus], 32);
      dev.queue.writeBuffer(buf, 0, daten);
      pass.setPipeline(pipe); pass.setBindGroup(0, bg!); pass.draw(3);
    },
  };
}
