// Zeichnet Bahnspuren als Linienliste (Stützpunkt: pos.xyz + Farbe rgba).
import { LINIEN } from './shader/linien.ts';

export const MAX_LINIENPUNKTE = 40000;

export function erstelleLinienZeichner(dev: GPUDevice, format: GPUTextureFormat, uni: GPUBuffer) {
  const buf = dev.createBuffer({ size: MAX_LINIENPUNKTE * 7 * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
  const layout = dev.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }] });
  const bg = dev.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer: uni } }] });
  const m = dev.createShaderModule({ code: LINIEN });
  const pipe = dev.createRenderPipeline({
    layout: dev.createPipelineLayout({ bindGroupLayouts: [layout] }),
    vertex: { module: m, entryPoint: 'vs', buffers: [{ arrayStride: 28, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }, { shaderLocation: 1, offset: 12, format: 'float32x4' }] }] },
    fragment: { module: m, entryPoint: 'fs', targets: [{ format, blend: { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'one', dstFactor: 'one' } } }] },
    primitive: { topology: 'line-list' },
    depthStencil: { format: 'depth32float', depthWriteEnabled: false, depthCompare: 'less' },
  });
  let n = 0;
  return {
    setze(daten: Float32Array, punkte: number) { n = Math.min(punkte, MAX_LINIENPUNKTE) & ~1; if (n) dev.queue.writeBuffer(buf, 0, daten.buffer as ArrayBuffer, daten.byteOffset, n * 28); },
    zeichne(pass: GPURenderPassEncoder) { if (!n) return; pass.setPipeline(pipe); pass.setBindGroup(0, bg); pass.setVertexBuffer(0, buf); pass.draw(n); },
  };
}
