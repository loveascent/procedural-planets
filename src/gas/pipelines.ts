// Pipelines des Gasriesen: Compute-Pipelines (Fluid, Farbstoff, Partikel) und Shader-Module.
import type { App } from './app';
import { fail } from './dom';
import { varianten, fluidCode, tracerCode, eintritte } from './shader/zusammen';
import { renderVarianten, renderCode } from './shader/render_zusammen';

/** Compute-Pipelines. Die Shader-Module werden aus den Bausteinen zusammengesetzt, die laut Reglern an sind; ein Baustein, der aus ist,
 *  wird nicht mitkompiliert. Ändert sich ein Schalter (oder SEAMLESS = nahtlos exakte Abtastung an Würfelkanten), werden die Pipelines neu gebaut. */
export function buildPipes(a: App, seamless: boolean) {
  const v = varianten();
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
  const v = renderVarianten(a.preset);
  const key = JSON.stringify(v);
  if (a.renderKey === key) return;
  const m = module(a, 'render', renderCode(v));
  a.renderPipe = a.device.createRenderPipeline({
    layout: a.renderPipeLayout,
    vertex: { module: m, entryPoint: 'vs' },
    fragment: { module: m, entryPoint: 'fs', targets: [{ format: a.format }] },
    primitive: { topology: 'triangle-list' },
  });
  a.renderKey = key;
}

export function module(a: App, label: string, code: string): GPUShaderModule {
  const m = a.device.createShaderModule({ label, code });
  m.getCompilationInfo().then((info) => {
    const errs = info.messages.filter((x) => x.type === 'error');
    if (errs.length) fail(`<b>Shader ${label}:</b> ` + errs.map((x) => `Zeile ${x.lineNum}: ${x.message}`).join('<br>'));
  });
  return m;
}
