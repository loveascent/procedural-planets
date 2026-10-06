// Zeichnet Bahnspuren als Bänder (instanzierte Rechtecke, Breite in Pixeln, weiche Kanten).
import { LINIEN } from './shader/linien.ts';

export const MAX_SEGMENTE = 24000;
export const SEG_FLOATS = 12;

export function erstelleLinienZeichner(dev: GPUDevice, format: GPUTextureFormat, uni: GPUBuffer) {
  const buf = dev.createBuffer({ size: MAX_SEGMENTE * SEG_FLOATS * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
  const layout = dev.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }] });
  const bg = dev.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer: uni } }] });
  const m = dev.createShaderModule({ code: LINIEN });
  m.getCompilationInfo().then((i) => i.messages.filter((x) => x.type === 'error').forEach((x) => console.error('Linien-Shader:', x.lineNum, x.message)));
  const pipe = dev.createRenderPipeline({
    layout: dev.createPipelineLayout({ bindGroupLayouts: [layout] }),
    vertex: { module: m, entryPoint: 'vs', buffers: [{ arrayStride: SEG_FLOATS * 4, stepMode: 'instance', attributes: [
      { shaderLocation: 0, offset: 0, format: 'float32x4' }, { shaderLocation: 1, offset: 16, format: 'float32x4' }, { shaderLocation: 2, offset: 32, format: 'float32x4' }] }] },
    fragment: { module: m, entryPoint: 'fs', targets: [{ format, blend: { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'one', dstFactor: 'one' } } }] },
    primitive: { topology: 'triangle-list' },
    depthStencil: { format: 'depth32float', depthWriteEnabled: false, depthCompare: 'less' },
  });
  let n = 0;
  return {
    setze(daten: Float32Array, segmente: number) { n = Math.min(segmente, MAX_SEGMENTE); if (n) dev.queue.writeBuffer(buf, 0, daten.buffer as ArrayBuffer, daten.byteOffset, n * SEG_FLOATS * 4); },
    zeichne(pass: GPURenderPassEncoder) { if (!n) return; pass.setPipeline(pipe); pass.setBindGroup(0, bg); pass.setVertexBuffer(0, buf); pass.draw(6, n); },
  };
}
