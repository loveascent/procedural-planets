

// Rechen-Aufträge (Compute): Parameterplatz je Dispatch, Mipmaps erzeugen, Kachel-Parameter.
// ext: { J_STRIDE, J_SLOTS, jSlot*, device*, jBuf* }  (* = lebender Zustand, per Getter/Setter)
export function createRechnen(ext) {
  const { J_STRIDE, J_SLOTS } = ext;
  // ------------------------------------------------------------------ Rechen-Aufträge (Compute) mit eigenem Parameterplatz
  function makeCtx(enc) { return { enc, used: 0 }; }
  function dispatch(ctx, pipe, bg, params, wx, wy, wz = 1) {
    const off = ext.jSlot * J_STRIDE;
    ext.jSlot = (ext.jSlot + 1) % J_SLOTS;
    ctx.used++;
    ext.device.queue.writeBuffer(ext.jBuf, off, params);
    const pass = ctx.enc.beginComputePass();
    pass.setPipeline(pipe);
    pass.setBindGroup(0, bg, [off]);
    pass.dispatchWorkgroups(wx, wy, wz);
    pass.end();
  }
  function genMips(enc, tx, N, lay, pipe) {
    for (let l = 1; l < tx.mipLevelCount; l++) {
      const n = Math.max(1, N >> l);
      const bg = ext.device.createBindGroup({ layout: lay, entries: [
        { binding: 0, resource: tx.createView({ dimension: '2d-array', baseMipLevel: l - 1, mipLevelCount: 1 }) },
        { binding: 1, resource: tx.createView({ dimension: '2d-array', baseMipLevel: l, mipLevelCount: 1 }) },
      ] });
      const pass = enc.beginComputePass();
      pass.setPipeline(pipe);
      pass.setBindGroup(0, bg);
      pass.dispatchWorkgroups(Math.ceil(n / 8), Math.ceil(n / 8), 6);
      pass.end();
    }
  }
  // Kachel-Parameter: g = Ende, h = (Anfang, Seite, N)
  function tileParams(p, face, x, y, w, h, N) { p.set([x + w, y + h], 24); p.set([x, y, face, N], 28); return p; }
  return { makeCtx, dispatch, genMips, tileParams };
}
