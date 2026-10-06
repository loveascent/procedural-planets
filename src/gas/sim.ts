// Simulation: Uniforms schreiben, Rechenschritt (Stable Fluids oder Curl-Noise, Farbstoff, Partikel) auf der GPU.
import type { App } from './app';
import { OFF_CENTRE, OFF_VIEW, OFF_MODE, OFF_STORMS, OFF_INFO, OFF_WEIGHT, CubeField, DT } from './zustand';

/** init: alle Stürme mit voller Stärke, damit sie beim Start als Wirbel eingesetzt werden. */
export function writeSim(a: App, dt: number, init = false) {
  const d = a.simData;
  const js = a.S.jetStrength;
  // Antrieb der Strudel (Turbulenz, Stürme, Curl-Noise, Wirbel): unabhängig von der Jet-Geschwindigkeit.
  const eddy = 0.06 * a.S.eddyStrength;
  const list = a.activeStorms();
  d.set([
    dt, a.time, a.frame, a.S.velRes,
    a.S.dyeRes, a.flow.n, a.S.vortexStrength, a.S.omega * a.dir(),
    js, a.S.jetRelax, a.S.turbulence * eddy * 0.05, a.S.turbScale,
    a.S.confinement, a.S.drag, a.S.fineStripes, a.S.bfecc ? 1 : 0,
    a.S.bandRelax, a.S.convection, eddy * a.S.stormStrength, list.length,
    a.S.curlStrength * eddy, a.S.curlFreq, a.S.curlSpeed, a.S.curlOctaves,
    a.S.particles, a.S.lifetime, a.S.opacity, a.S.blur,
    // Shader-Rauschen: Planeten-Seed plus Lauf-Seed ("Neu starten" würfelt nur den Lauf neu).
    (a.S.seed + a.runSeed) % 100000, a.S.bandWobble, a.S.stormTint, a.S.vortexCount,
  ], 0);
  d.set([...a.centre, a.S.fade], OFF_CENTRE);
  d.set([...a.camBody(), a.lookMode() === 'dye' ? 0 : a.S.viewFocus], OFF_VIEW);
  d.set([a.lookMode() === 'pure' ? 1 : 0, eddy, 0, 0], OFF_MODE);
  list.forEach((s, i) => {
    const la = (s.lat * Math.PI) / 180, lo = (s.lon * Math.PI) / 180;
    d.set([Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo), (s.radius * a.S.stormSize * Math.PI) / 180], OFF_STORMS + i * 4);
    d.set([s.sign * s.strength, ...s.color], OFF_INFO + i * 4);
    // Antrieb: Vorlagen-Stürme nur so stark wie "Stürme festhalten" (Curl-Noise hat keine
    // eigene Dynamik, dort immer voll). Neue Stürme: kurzer Stoß, der an- und abschwillt.
    let w = s.kick > 0 ? Math.sin(Math.PI * (1 - s.kick / Math.max(s.life, 1e-3))) : a.flowMode() === 'curl' ? 1 : a.S.stormHold;
    if (init && s.kick === 0) w = 1;
    d[OFF_WEIGHT + i] = w;
  });
  a.device.queue.writeBuffer(a.simBuf, 0, d);
}

/** buf: Puffer an Bindung 5 – Partikel für die Tracer-Shader, Breitenkreis-Mittel für den Fluid-Löser. */
export function bind(app: App, a: CubeField | null, b: CubeField | null, dst: CubeField, buf: GPUBuffer = app.zonal): GPUBindGroup {
  return app.device.createBindGroup({
    layout: app.computeLayout,
    entries: [
      { binding: 0, resource: { buffer: app.simBuf } },
      { binding: 1, resource: app.sampler },
      { binding: 2, resource: (a ?? app.dummy).cube },
      { binding: 3, resource: (b ?? app.dummy).cube },
      { binding: 4, resource: dst.store },
      { binding: 5, resource: { buffer: buf } },
      { binding: 6, resource: (a ?? app.dummy).store },
      { binding: 7, resource: (b ?? app.dummy).store },
    ],
  });
}

export function run2D(app: App, pass: GPUComputePassEncoder, pipe: string, a: CubeField | null, b: CubeField | null, dst: CubeField) {
  pass.setPipeline(app.pipes[pipe]);
  pass.setBindGroup(0, app.bind(a, b, dst));
  const g = Math.ceil(dst.n / 8);
  pass.dispatchWorkgroups(g, g, 6);
}

/** all = Wind, Druck, Partikel und Farbe; sonst nur die Farbe. */
export function initFields(a: App, enc: GPUCommandEncoder, all: boolean) {
  a.buildPipes(a.S.seamless);
  const pass = enc.beginComputePass();
  if (all) {
    a.run2D(pass, 'initVel', null, null, a.vel[0]);
    a.run2D(pass, 'clear', null, null, a.prs[0]);
    a.run2D(pass, 'clear', null, null, a.aux);
    a.vc = 0; a.pc = 0;
  }
  a.run2D(pass, 'initDye', null, null, a.dye[0]);
  a.dc = 0;
  pass.end();
  if (all) enc.clearBuffer(a.parts);
}

export function step(a: App, enc: GPUCommandEncoder) {
  const pass = enc.beginComputePass();
  let flowSrc: CubeField;
  if (a.flowMode() === 'fluid') {
    // 1. Advektion  2. Wirbelstärke  3. Breitenkreis-Mittel  4. Kräfte  5. Divergenz  6. Druck  7. Projektion
    a.run2D(pass, 'advect', a.vel[a.vc], null, a.vel[1 - a.vc]); a.vc = 1 - a.vc;
    a.run2D(pass, 'curl', a.vel[a.vc], null, a.aux);
    if (a.pipes.zonalClear) {   // nur mit dem Baustein Jets (Breitenkreis-Mittel)
      pass.setPipeline(a.pipes.zonalClear);
      pass.setBindGroup(0, a.bind(null, null, a.div));
      pass.dispatchWorkgroups(4);
      a.run2D(pass, 'zonalSum', a.vel[a.vc], null, a.div);
    }
    a.run2D(pass, 'forces', a.vel[a.vc], a.aux, a.vel[1 - a.vc]); a.vc = 1 - a.vc;
    a.run2D(pass, 'divergence', a.vel[a.vc], null, a.div);
    for (let i = 0; i < a.S.iterations; i++) {
      a.run2D(pass, 'jacobi', a.prs[a.pc], a.div, a.prs[1 - a.pc]); a.pc = 1 - a.pc;
    }
    a.run2D(pass, 'project', a.vel[a.vc], a.prs[a.pc], a.vel[1 - a.vc]); a.vc = 1 - a.vc;
    flowSrc = a.vel[a.vc];
  } else {
    a.run2D(pass, 'flowField', null, null, a.flow);
    flowSrc = a.flow;
  }

  const look = a.lookMode();
  if (look === 'dye') {
    a.run2D(pass, 'advectDye', a.dye[a.dc], flowSrc, a.dye[1 - a.dc]); a.dc = 1 - a.dc;
    pass.end();
  } else {
    pass.end();
    const cur = a.dye[a.dc], nxt = a.dye[1 - a.dc];
    enc.copyTextureToTexture({ texture: cur.tex }, { texture: nxt.tex }, [cur.n, cur.n, 6]);
    const p2 = enc.beginComputePass();
    p2.setPipeline(a.pipes.moveParticles);
    p2.setBindGroup(0, a.bind(cur, flowSrc, nxt, a.parts));
    const groups = Math.ceil(a.S.particles / 64);
    p2.dispatchWorkgroups(Math.min(groups, 65535), Math.ceil(groups / 65535));
    a.run2D(p2, look === 'pure' ? 'blurFade' : 'blurRelax', nxt, null, cur);
    p2.end();
  }
  return flowSrc;
}

/** Schrittweite: bei Tempo < 1 kleinere Schritte (flüssig, gleiche Physik), sonst fest 1/60 s. */
export function dtStep(a: App): number {
return a.warm > 0 ? DT : DT * Math.min(1, a.S.timeScale);
}

export function simStep(a: App, enc: GPUCommandEncoder): CubeField {
  a.buildPipes(a.S.seamless);   // Bausteine an/aus: Pipelines nur neu bauen, wenn sich ein Schalter geändert hat
  const dt = a.dtStep();
  a.time += dt;
  a.frame++;
  a.updateStorms(dt);
  a.writeSim(dt);
  return a.step(enc);
}

/** Ein einzelner Schritt als eigener Auftrag, damit jeder Schritt seine eigenen Uniforms sieht. */
export function submitStep(a: App): CubeField {
  const e = a.device.createCommandEncoder();
  const f = a.simStep(e);
  a.device.queue.submit([e.finish()]);
  return f;
}
