

// GPU-Ressourcen des Planeten: Sampler, Karten, Uniform-Puffer, Bindungsgruppen der Hauptszene.
// ext: { J_SLOTS, J_STRIDE, ubuf, RS, tagged, texArray, mipLevels, cloudRes, nebRes, genBG, lvl0, arrView, patchGrid, PATCH_G, cubeSphere, coarse, samp*, device*, jBuf*, uBuf*, uData*, dPlanet*, dCloud*, ppDummy*, L*, meshPlanet*, meshCloud* }  (* = lebender Zustand, per Getter/Setter)
export function createRessourcen(ext) {
  const { J_SLOTS, J_STRIDE, ubuf, RS, tagged, texArray, mipLevels, cloudRes, nebRes, genBG, lvl0, arrView, patchGrid, PATCH_G, cubeSphere, coarse } = ext;
  function initResources() {
    ext.samp = ext.device.createSampler({ magFilter: 'linear', minFilter: 'linear', mipmapFilter: 'linear', maxAnisotropy: 8, addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });
    ext.jBuf = ext.device.createBuffer({ size: J_SLOTS * J_STRIDE, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    ext.uBuf = ubuf(ext.uData.byteLength);
    ext.dPlanet = ubuf(16); ext.dCloud = ubuf(16); ext.ppDummy = ubuf(16);
    RS.hmPrev = tagged(texArray(RS.nPrev, 'rgba16float', mipLevels(RS.nPrev), GPUTextureUsage.COPY_SRC));
    RS.cloud = texArray(cloudRes, 'rgba8unorm', mipLevels(cloudRes));
    RS.neb = texArray(nebRes, 'rgba16float', 1);
    RS.trans = ext.device.createTexture({ size: [256, 64], format: 'rgba16float', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING });
    RS.biome = ext.device.createTexture({ size: [512, 512], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
    const g = (lay, tx) => ext.device.createBindGroup({ layout: lay, entries: [{ binding: 0, resource: { buffer: ext.jBuf, size: 160 } }, { binding: 1, resource: tx }] });
    RS.hydroNone = tagged(ext.device.createTexture({ size: [1, 1, 6], format: 'rgba16float', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST }));
    RS.hydro = RS.hydroNone; RS.nHydro = 0;
    RS.river = tagged(ext.device.createTexture({ size: [1, 1, 6], format: 'r8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST }));
    RS.nRiver = 0;
    RS.bgGenPrev = genBG(lvl0(RS.hmPrev));
    RS.bgCloudGen = g(ext.L.gen8, lvl0(RS.cloud));
    RS.bgNebGen = g(ext.L.gen16, arrView(RS.neb));
    RS.bgTrans = g(ext.L.trans, RS.trans.createView());
    RS.bgDrawPlanet = ext.device.createBindGroup({ layout: ext.L.draw, entries: [{ binding: 0, resource: { buffer: ext.dPlanet } }] });
    RS.bgDrawCloud = ext.device.createBindGroup({ layout: ext.L.draw, entries: [{ binding: 0, resource: { buffer: ext.dCloud } }] });
    RS.views = { cloud: arrView(RS.cloud), neb: arrView(RS.neb), trans: RS.trans.createView(), biome: RS.biome.createView() };
    RS.shown = RS.hmPrev; RS.nShown = RS.nPrev;
    ext.meshPlanet = patchGrid(PATCH_G);
    ext.meshCloud = cubeSphere(coarse ? 48 : 72);
  }
  // Bindungen der Szene; neu, sobald die gezeigte Höhenkarte wechselt (Vorschau -> volle Auflösung)
  function mainGroup() {
    const key = RS.shown.fgpId + ':' + RS.hydro.fgpId + ':' + RS.river.fgpId;
    if (RS.mainKey === key) return RS.mainBG;
    RS.mainKey = key;
    RS.mainBG = ext.device.createBindGroup({ layout: ext.L.main, entries: [
      { binding: 0, resource: { buffer: ext.uBuf } }, { binding: 1, resource: ext.samp },
      { binding: 2, resource: arrView(RS.shown) }, { binding: 3, resource: RS.views.biome },
      { binding: 4, resource: RS.views.cloud }, { binding: 5, resource: RS.views.neb }, { binding: 6, resource: RS.views.trans },
      { binding: 7, resource: arrView(RS.hydro) },
      { binding: 8, resource: arrView(RS.river) },
    ] });
    return RS.mainBG;
  }
  return { initResources, mainGroup };
}
