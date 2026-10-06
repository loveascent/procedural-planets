// Zeichnet alle Kugeln (Sonne, Planeten, Monde) in einem instanzierten Aufruf.
// Instanz (12 Floats): pos.xyz+Radius | Drehung, Neigung, Scheibe, Bits (1 leuchtend, 2 lebendig, 4 Gas) | Tönung rgb + Saumstärke.
import { baueKugel } from './kugelnetz.ts';
import { planetShader, type PlanetBausteine } from './shader/zusammen.ts';
import type { Texturen } from './texturen.ts';

export const MAX_INSTANZEN = 160;
export const INSTANZ_FLOATS = 12;

export function erstellePlanetenZeichner(dev: GPUDevice, format: GPUTextureFormat, uni: GPUBuffer, tex: Texturen) {
  const netz = baueKugel(dev);
  const inst = dev.createBuffer({ size: MAX_INSTANZEN * INSTANZ_FLOATS * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
  const layout = dev.createBindGroupLayout({ entries: [
    { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
    { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: '2d-array' } },
    { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
  ] });
  const bg = dev.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer: uni } }, { binding: 1, resource: tex.view }, { binding: 2, resource: tex.sampler }] });
  const pl = dev.createPipelineLayout({ bindGroupLayouts: [layout] });
  let pipe: GPURenderPipeline;
  let anzahl = 0;

  function baue(b: PlanetBausteine) {
    const m = dev.createShaderModule({ code: planetShader(b) });
    m.getCompilationInfo().then((i) => i.messages.filter((x) => x.type === 'error').forEach((x) => console.error('Planeten-Shader:', x.lineNum, x.message)));
    pipe = dev.createRenderPipeline({
      layout: pl,
      vertex: { module: m, entryPoint: 'vs', buffers: [
        { arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] },
        { arrayStride: INSTANZ_FLOATS * 4, stepMode: 'instance', attributes: [
          { shaderLocation: 1, offset: 0, format: 'float32x4' }, { shaderLocation: 2, offset: 16, format: 'float32x4' }, { shaderLocation: 3, offset: 32, format: 'float32x4' }] },
      ] },
      fragment: { module: m, entryPoint: 'fs', targets: [{ format }] },
      primitive: { topology: 'triangle-list', cullMode: 'back' },
      depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less' },
    });
  }

  return {
    baue,
    setze(daten: Float32Array, n: number) { anzahl = Math.min(n, MAX_INSTANZEN); if (anzahl) dev.queue.writeBuffer(inst, 0, daten.buffer as ArrayBuffer, daten.byteOffset, anzahl * INSTANZ_FLOATS * 4); },
    zeichne(pass: GPURenderPassEncoder) {
      if (!anzahl) return;
      pass.setPipeline(pipe); pass.setBindGroup(0, bg);
      pass.setVertexBuffer(0, netz.punkte); pass.setVertexBuffer(1, inst);
      pass.setIndexBuffer(netz.indizes, 'uint32');
      pass.drawIndexed(netz.anzahl, anzahl);
    },
  };
}
