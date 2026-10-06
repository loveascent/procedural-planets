// Selbsttest und Prüf-Schnittstellen (Würfelkanten-Messung, Bildzähler).
import type { App } from './app';
import { t } from '../i18n';
import { COMMON as commonWGSL } from './shader/zusammen';

export function frameCount(app: App) {
return app.frame;
}

/**
 * Misst, ob die Cubemap-Abtastung der Grafikkarte an Würfelkanten nahtlos ist: ein glattes
 * Testfeld wird geschrieben und zwischen den Texelzentren wieder abgetastet.
 */
export async function selftest(app: App): Promise<{ edge: number; interior: number; seamless: boolean }> {
  const d = app.device, n = 256;
  const common = commonWGSL.slice(0, commonWGSL.indexOf('// Richtung -> (st in [0,1]²'));
  const fld = 'fn fld(p: vec3f) -> f32 { return sin(p.x * 9.0) * 0.5 + p.y * 0.3; }';
  const strip = common.replace(/@group\(0\) @binding\(0\) var<uniform> S: Sim;/, '');
  const tex = d.createTexture({ size: [n, n, 6], format: 'rgba16float', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING });
  const fill = d.createComputePipeline({ layout: 'auto', compute: { entryPoint: 'main', module: d.createShaderModule({ code: strip + fld + `
    @group(0) @binding(0) var dst: texture_storage_2d_array<rgba16float, write>;
    @compute @workgroup_size(8, 8, 1) fn main(@builtin(global_invocation_id) id: vec3u) {
      textureStore(dst, id.xy, id.z, vec4f(fld(faceDir(id.z, (vec2f(id.xy) + 0.5) / ${n}.0)), 0.0, 0.0, 1.0));
    }` }) } });
  const test = d.createComputePipeline({ layout: 'auto', compute: { entryPoint: 'main', module: d.createShaderModule({ code: strip + fld + `
    @group(0) @binding(0) var t: texture_cube<f32>;
    @group(0) @binding(1) var s: sampler;
    @group(0) @binding(2) var<storage, read_write> o: array<atomic<u32>, 4>;
    @compute @workgroup_size(8, 8, 1) fn main(@builtin(global_invocation_id) id: vec3u) {
      let st = (vec2f(id.xy) + vec2f(0.37, 0.61)) / ${n}.0;
      let p = faceDir(id.z, st);
      let e = u32(abs(textureSampleLevel(t, s, p, 0.0).r - fld(p)) * 1e6);
      if (min(min(st.x, 1.0 - st.x), min(st.y, 1.0 - st.y)) * ${n}.0 < 1.5) { atomicMax(&o[0], e); } else { atomicMax(&o[1], e); }
    }` }) } });
  const out = d.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
  const rd = d.createBuffer({ size: 16, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
  const e = d.createCommandEncoder();
  const ps = e.beginComputePass();
  ps.setPipeline(fill);
  ps.setBindGroup(0, d.createBindGroup({ layout: fill.getBindGroupLayout(0), entries: [{ binding: 0, resource: tex.createView({ dimension: '2d-array' }) }] }));
  ps.dispatchWorkgroups(n / 8, n / 8, 6);
  ps.setPipeline(test);
  ps.setBindGroup(0, d.createBindGroup({ layout: test.getBindGroupLayout(0), entries: [
    { binding: 0, resource: tex.createView({ dimension: 'cube' }) },
    { binding: 1, resource: d.createSampler({ magFilter: 'linear', minFilter: 'linear' }) },
    { binding: 2, resource: { buffer: out } }] }));
  ps.dispatchWorkgroups(n / 8, n / 8, 6);
  ps.end();
  e.copyBufferToBuffer(out, 0, rd, 0, 16);
  d.queue.submit([e.finish()]);
  await rd.mapAsync(GPUMapMode.READ);
  const r = new Uint32Array(rd.getMappedRange().slice(0));
  rd.destroy(); out.destroy(); tex.destroy();
  const edge = r[0] / 1e6, interior = r[1] / 1e6;
  // Bilineare Interpolation hat an Kanten natürlicherweise etwas mehr Fehler (gekrümmte Fläche);
  // eine echte Naht liegt um Größenordnungen darüber (SwiftShader: 0,139 gegen 0,0003).
  return { edge, interior, seamless: edge < Math.max(0.01, interior * 20) };
}

export async function runSelftest(app: App) {
  const el = document.getElementById('diag-msg');
  const r = await app.selftest();
  if (!r.seamless && !app.S.seamless) { app.S.seamless = true; app.buildPipes(true); app.panel.refresh(); app.remember(); }
  if (el) el.textContent = r.seamless
    ? t(`Nahtlos: Fehler an Kanten ${r.edge.toFixed(4)}, innen ${r.interior.toFixed(4)}. „Exakte Kanten“ ist nicht nötig. Sichtbare Übergänge kommen dann nicht von der Abtastung (siehe docs/STATUS.md).`,
      `Seamless: error at edges ${r.edge.toFixed(4)}, inside ${r.interior.toFixed(4)}. “Exact edges” is not needed. Visible transitions then do not come from sampling (see docs/STATUS.md).`)
    : t(`Naht gefunden: Fehler an Kanten ${r.edge.toFixed(4)}, innen ${r.interior.toFixed(4)}. „Exakte Kanten“ ist jetzt an.`,
      `Seam found: error at edges ${r.edge.toFixed(4)}, inside ${r.interior.toFixed(4)}. “Exact edges” is now on.`);
}
