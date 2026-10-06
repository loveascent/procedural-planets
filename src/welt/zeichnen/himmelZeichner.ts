// Zeichnet den Sternenhimmel als Vollbilddreieck hinter alles.
import { HIMMEL } from './shader/himmel.ts';

export function erstelleHimmelZeichner(dev: GPUDevice, format: GPUTextureFormat, uni: GPUBuffer) {
  const layout = dev.createBindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }] });
  const bg = dev.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer: uni } }] });
  const m = dev.createShaderModule({ code: HIMMEL });
  m.getCompilationInfo().then((i) => i.messages.filter((x) => x.type === 'error').forEach((x) => console.error('Himmel-Shader:', x.lineNum, x.message)));
  const pipe = dev.createRenderPipeline({
    layout: dev.createPipelineLayout({ bindGroupLayouts: [layout] }),
    vertex: { module: m, entryPoint: 'vs' },
    fragment: { module: m, entryPoint: 'fs', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
    depthStencil: { format: 'depth32float', depthWriteEnabled: false, depthCompare: 'always' },
  });
  return { zeichne(pass: GPURenderPassEncoder) { pass.setPipeline(pipe); pass.setBindGroup(0, bg); pass.draw(3); } };
}
