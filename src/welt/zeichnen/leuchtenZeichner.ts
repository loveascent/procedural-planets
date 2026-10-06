// Zeichnet Leuchtflächen (additiv, Tiefentest ohne Schreiben): Sonnenschein, Blitze, Druckwellen, ferne Punkte, Trümmer.
import { LEUCHTEN } from './shader/leuchten.ts';

export const MAX_LEUCHT = 5000;
export const LEUCHT_FLOATS = 12;

export function erstelleLeuchtenZeichner(dev: GPUDevice, format: GPUTextureFormat, uni: GPUBuffer) {
  const buf = dev.createBuffer({ size: MAX_LEUCHT * LEUCHT_FLOATS * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
  const layout = dev.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }] });
  const bg = dev.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer: uni } }] });
  const m = dev.createShaderModule({ code: LEUCHTEN });
  m.getCompilationInfo().then((i) => i.messages.filter((x) => x.type === 'error').forEach((x) => console.error('Leucht-Shader:', x.lineNum, x.message)));
  const pipe = dev.createRenderPipeline({
    layout: dev.createPipelineLayout({ bindGroupLayouts: [layout] }),
    vertex: { module: m, entryPoint: 'vs', buffers: [{ arrayStride: LEUCHT_FLOATS * 4, stepMode: 'instance', attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x4' }, { shaderLocation: 1, offset: 16, format: 'float32x4' }, { shaderLocation: 2, offset: 32, format: 'float32x4' }] }] },
    fragment: { module: m, entryPoint: 'fs', targets: [{ format, blend: { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'one', dstFactor: 'one' } } }] },
    primitive: { topology: 'triangle-list' },
    depthStencil: { format: 'depth32float', depthWriteEnabled: false, depthCompare: 'less' },
  });
  let anzahl = 0;
  return {
    setze(daten: Float32Array, n: number) { anzahl = Math.min(n, MAX_LEUCHT); if (anzahl) dev.queue.writeBuffer(buf, 0, daten.buffer as ArrayBuffer, daten.byteOffset, anzahl * LEUCHT_FLOATS * 4); },
    zeichne(pass: GPURenderPassEncoder) { if (!anzahl) return; pass.setPipeline(pipe); pass.setBindGroup(0, bg); pass.setVertexBuffer(0, buf); pass.draw(6, anzahl); },
  };
}
