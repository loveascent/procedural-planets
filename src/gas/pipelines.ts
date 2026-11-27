// Pipelines des Gasriesen: Compute-Pipelines (Fluid, Farbstoff, Partikel) und Shader-Module.
import type { App } from './app';
import { fail } from './dom';
import { varianten, fluidCode, tracerCode, eintritte } from './shader/zusammen';
import { renderVarianten, renderCode } from './shader/render_zusammen';
import { zusatz } from './grafik/pfad';
import { mitZusatz } from './grafik/zusatz';

/** Compute-Pipelines. Die Shader-Module werden aus den Bausteinen zusammengesetzt, die laut Reglern an sind; ein Baustein, der aus ist,
 *  wird nicht mitkompiliert. Ändert sich ein Schalter (oder SEAMLESS = nahtlos exakte Abtastung an Würfelkanten), werden die Pipelines neu gebaut. */
export function buildPipes(a: App, seamless: boolean) {
  const v = varianten(a.S);
  const key = JSON.stringify([seamless, v]);
  if (a.pipesBuilt === key) return;
  a.fluidModule = module(a, 'fluid', fluidCode(v));
  a.tracerModule = module(a, 'tracers', tracerCode(v));
  const layout = a.device.createPipelineLayout({ bindGroupLayouts: [a.computeLayout] });
  const constants = { SEAMLESS: seamless ? 1 : 0 };
  const e = eintritte(v);
  for (const n of Object.keys(a.pipes)) delete a.pipes[n];
  for (const n of e.fluid) a.pipes[n] = a.device.createComputePipeline({ layout, compute: { module: a.fluidModule, entryPoint: n, constants } });
  for (const n of e.tracers) a.pipes[n] = a.device.createComputePipeline({ layout, compute: { module: a.tracerModule, entryPoint: n, constants } });
  a.pipesBuilt = key;
}

/** Render-Pipeline aus den Darstellungs-Bausteinen, die laut Reglern und Planet an sind; bei Änderung neu gebaut. */
export function buildRenderPipe(a: App) {
  const v = renderVarianten(a.preset, a.S);
  const z = zusatz(a);   // Grafik-Optionen (undefined = ohne: Shader und Pipeline wie bisher)
  const key = JSON.stringify(z ? [v, z] : v);
  if (a.renderKey === key) return;
  const code = z ? mitZusatz(renderCode(v), z) : renderCode(v);
  const m = module(a, 'render', code);
  const cache = code.includes('fn fsHimmel');
  a.renderPipe = a.device.createRenderPipeline({
    layout: cache ? layoutMitHimmel(a) : a.renderPipeLayout,
    vertex: { module: m, entryPoint: 'vs' },
    fragment: { module: m, entryPoint: 'fs', targets: [{ format: z ? z.format : a.format }] },
    primitive: { topology: 'triangle-list' },
    ...(z && z.proben > 1 ? { multisample: { count: z.proben } } : {}),
  });
  a.himmelPipe = cache ? a.device.createRenderPipeline({ layout: 'auto', vertex: { module: m, entryPoint: 'vs' }, fragment: { module: m, entryPoint: 'fsHimmel', targets: [{ format: 'rgba16float' }] } }) : null;
  a.renderKey = key;
}

/** Bindungen der Darstellung plus Binding 7 (zwischengespeicherter Himmel). */
function layoutMitHimmel(a: App): GPUPipelineLayout {
  const F = GPUShaderStage.FRAGMENT;
  const bild = (binding: number, viewDimension: GPUTextureViewDimension): GPUBindGroupLayoutEntry => ({ binding, visibility: F, texture: { sampleType: 'float', viewDimension } });
  return a.device.createPipelineLayout({ bindGroupLayouts: [a.device.createBindGroupLayout({ entries: [
    { binding: 0, visibility: F, buffer: { type: 'uniform' } }, { binding: 1, visibility: F, sampler: { type: 'filtering' } },
    bild(2, 'cube'), bild(3, 'cube'), bild(4, 'cube'), bild(5, 'cube'), bild(6, '2d-array'), bild(7, '2d'), bild(8, 'cube'),
  ] })] });
}

export function module(a: App, label: string, code: string): GPUShaderModule {
  const m = a.device.createShaderModule({ label, code });
  m.getCompilationInfo().then((info) => {
    const errs = info.messages.filter((x) => x.type === 'error');
    if (errs.length) fail(`<b>Shader ${label}:</b> ` + errs.map((x) => `Zeile ${x.lineNum}: ${x.message}`).join('<br>'));
  });
  return m;
}
