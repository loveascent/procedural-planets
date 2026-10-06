

// Render-Ziele (HDR-Farbe, Tiefe, Überstrahlungs-Stufen) und ihre Größenanpassung.
// ext: { RS, MSAA, OFFSCREEN, ubuf, device*, L*, ppDummy* }  (* = lebender Zustand, per Getter/Setter)
export function createZiele(ext) {
  const { RS, MSAA, OFFSCREEN, ubuf } = ext;
  // ------------------------------------------------------------------ Ziele (HDR, Tiefe, Überstrahlung)
  function ensureTargets(w, h) {
    if (RS.w === w && RS.h === h) return;
    for (const k of ['scene', 'hdr2', 'depth', 'msaa']) if (RS[k]) RS[k].destroy();
    for (const b of RS.bloom || []) b.tx.destroy();
    RS.w = w; RS.h = h;
    const rt = (W, H, fmt) => ext.device.createTexture({ size: [W, H], format: fmt || 'rgba16float', usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING });
    RS.scene = rt(w, h); RS.hdr2 = rt(w, h);
    RS.depth = ext.device.createTexture({ size: [w, h], format: 'depth24plus', sampleCount: MSAA, usage: GPUTextureUsage.RENDER_ATTACHMENT });
    RS.msaa = MSAA > 1 ? ext.device.createTexture({ size: [w, h], format: 'rgba16float', sampleCount: MSAA, usage: GPUTextureUsage.RENDER_ATTACHMENT }) : null;
    RS.sceneV = RS.scene.createView(); RS.hdr2V = RS.hdr2.createView(); RS.depthV = RS.depth.createView();
    RS.msaaV = RS.msaa ? RS.msaa.createView() : null;
    if (OFFSCREEN) {
      if (RS.out) RS.out.destroy();
      RS.out = ext.device.createTexture({ size: [w, h], format: ext.format, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING });
      RS.outV = RS.out.createView();
    }
    RS.bloom = [];
    let bw = w >> 1, bh = h >> 1;
    for (let i = 0; i < 6 && bw >= 4 && bh >= 4; i++) {
      const tx = rt(bw, bh);
      RS.bloom.push({ tx, v: tx.createView(), w: bw, h: bh, pd: ubuf(16), pu: ubuf(16) });
      bw >>= 1; bh >>= 1;
    }
    const pg = (buf, a, b) => ext.device.createBindGroup({ layout: ext.L.post, entries: [{ binding: 0, resource: { buffer: buf } }, { binding: 1, resource: a }, { binding: 2, resource: b || a }] });
    RS.pgComp = pg(ext.ppDummy, RS.sceneV);
    RS.pgFinNoBloom = pg(ext.ppDummy, RS.hdr2V);
    RS.pgFin = RS.bloom.length ? pg(ext.ppDummy, RS.hdr2V, RS.bloom[0].v) : RS.pgFinNoBloom;
    RS.bloom.forEach((b, i) => {
      b.gDown = pg(b.pd, i === 0 ? RS.hdr2V : RS.bloom[i - 1].v);
      b.gUp = pg(b.pu, b.v);
    });
  }
  return { ensureTargets };
}
