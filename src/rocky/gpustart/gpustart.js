import { t } from '../../i18n';


// GPU-Start: Adapter und Gerät (mit Leistungsprüfung), Bindungs-Layouts und die asynchron übersetzten Pipelines.
// ext: { fail, OFFSCREEN, canvas, S, VF, COMMON, NOISE, GEN, CLOUDGEN, SKY_GEN_WGSL, TRANS, MIP, UDECL, TEXH, VOLC, VOLC_AUS, HYDRO_WARP, WELLEN, WELLEN_AUS, ATMO, ATMO_AUS, ATMO_POST, ATMO_POST_AUS, BLOOM, BLOOM_AUS, FLARE, FLARE_AUS, SCHATTEN, SCHATTEN_AUS, SAUM, SAUM_AUS, EROSION, EROSION_AUS, FLUSS_GEN, FLUSS_GEN_AUS, FLUSS_SZENE, FLUSS_SZENE_AUS, STIL_ORIGINAL, STIL_ORIGINAL_AUS, TERRASSEN, TERRASSEN_AUS, FEINDETAIL, FEINDETAIL_AUS, WASSER, WASSER_AUS, BRANDUNG, BRANDUNG_AUS, MEEREIS, MEEREIS_AUS, KAVITAET, KAVITAET_AUS, GEOMORPH, GEOMORPH_AUS, RELIEF, RELIEF_AUS, HIMMEL, HIMMEL_AUS, SONNE, SONNE_AUS, BIOM_CD, BIOM_CD_AUS, BIOM_ERDE, BIOM_ERDE_AUS, GEBIRGE, GEBIRGE_AUS, STIL_ORIGINAL_WOLKEN, STIL_ORIGINAL_WOLKEN_AUS, STIL_ORIGINAL_LEUCHTSAUM, STIL_ORIGINAL_LEUCHTSAUM_AUS, ANSICHTEN_DEBUG, ANSICHTEN_DEBUG_AUS, WOLKEN, WOLKEN_AUS, SCENE, SKY_DRAW_WGSL, POST, MSAA, adapter*, device*, format*, context*, L* }  (* = lebender Zustand, per Getter/Setter)
export function createGpuStart(ext) {
  const { fail, OFFSCREEN, canvas, S, VF, COMMON, NOISE, GEN, CLOUDGEN, SKY_GEN_WGSL, TRANS, MIP, UDECL, TEXH, VOLC, VOLC_AUS, HYDRO_WARP, WELLEN, WELLEN_AUS, ATMO, ATMO_AUS, ATMO_POST, ATMO_POST_AUS, BLOOM, BLOOM_AUS, FLARE, FLARE_AUS, SCHATTEN, SCHATTEN_AUS, SAUM, SAUM_AUS, EROSION, EROSION_AUS, FLUSS_GEN, FLUSS_GEN_AUS, FLUSS_SZENE, FLUSS_SZENE_AUS, STIL_ORIGINAL, STIL_ORIGINAL_AUS, TERRASSEN, TERRASSEN_AUS, FEINDETAIL, FEINDETAIL_AUS, WASSER, WASSER_AUS, BRANDUNG, BRANDUNG_AUS, MEEREIS, MEEREIS_AUS, KAVITAET, KAVITAET_AUS, GEOMORPH, GEOMORPH_AUS, RELIEF, RELIEF_AUS, HIMMEL, HIMMEL_AUS, SONNE, SONNE_AUS, BIOM_CD, BIOM_CD_AUS, BIOM_ERDE, BIOM_ERDE_AUS, GEBIRGE, GEBIRGE_AUS, STIL_ORIGINAL_WOLKEN, STIL_ORIGINAL_WOLKEN_AUS, STIL_ORIGINAL_LEUCHTSAUM, STIL_ORIGINAL_LEUCHTSAUM_AUS, ANSICHTEN_DEBUG, ANSICHTEN_DEBUG_AUS, WOLKEN, WOLKEN_AUS, SCENE, SKY_DRAW_WGSL, POST, MSAA } = ext;
  async function initGPU() {
    if (ext.kopflos) { ext.device = ext.kopflos.device; ext.format = 'rgba8unorm'; return; }   // eingebettet: gemeinsames Gerät der Welt
    if (!navigator.gpu) fail(t('Dieser Browser kann kein WebGPU. Bitte Chrome oder Edge ab 113, Safari ab 26 oder Firefox ab 141 nehmen.', 'This browser has no WebGPU. Please use Chrome or Edge 113+, Safari 26+ or Firefox 141+.'));
    ext.adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!ext.adapter) fail(t('Keine WebGPU-Grafikkarte gefunden.', 'No WebGPU ext.adapter found.'));
    const maxTex = ext.adapter.limits.maxTextureDimension2D;
    ext.device = await ext.adapter.requestDevice({ requiredLimits: { maxTextureDimension2D: maxTex } });
    ext.device.lost.then((info) => { if (info.reason !== 'destroyed') fail(t('Die Grafikkarte wurde verloren: ', 'The GPU ext.device was lost: ') + info.message); });
    ext.device.addEventListener('uncapturederror', (e) => console.error('WebGPU: ' + e.error.message));
    // ?offscreen: Bild nur in eine Textur (für Tests ohne Grafikkarte; der Software-Renderer kann kein Canvas zeigen)
    if (OFFSCREEN) ext.format = 'rgba8unorm';
    else {
      ext.context = canvas.getContext('webgpu');
      ext.format = navigator.gpu.getPreferredCanvasFormat();
      ext.context.configure({ device: ext.device, format: ext.format, alphaMode: 'opaque' });
    }
    if (S.res > maxTex) S.res = maxTex;
  }
  
  function makeLayouts() {
    const tex = (b, dim) => ({ binding: b, visibility: VF, texture: dim ? { viewDimension: dim } : {} });
    const genL = (fmt, dim) => ext.device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { hasDynamicOffset: true, minBindingSize: 160 } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format: fmt, viewDimension: dim } },
    ] });
    const mipL = (fmt) => ext.device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format: fmt, viewDimension: '2d-array' } },
    ] });
    ext.L = {
      main: ext.device.createBindGroupLayout({ entries: [
        { binding: 0, visibility: VF, buffer: {} }, { binding: 1, visibility: VF, sampler: {} },
        tex(2, '2d-array'), tex(3), tex(4, '2d-array'), tex(5, '2d-array'), tex(6), tex(7, '2d-array'), tex(8, '2d-array'),
      ] }),
      draw: ext.device.createBindGroupLayout({ entries: [{ binding: 0, visibility: VF, buffer: {} }] }),
      post: ext.device.createBindGroupLayout({ entries: [{ binding: 0, visibility: VF, buffer: {} }, tex(1), tex(2)] }),
      genH: ext.device.createBindGroupLayout({ entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { hasDynamicOffset: true, minBindingSize: 160 } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: 'write-only', format: 'rgba16float', viewDimension: '2d-array' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, texture: { viewDimension: '2d-array' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, sampler: {} },
      ] }),
      gen16: genL('rgba16float', '2d-array'), gen8: genL('rgba8unorm', '2d-array'), trans: genL('rgba16float', '2d'),
      mip16: mipL('rgba16float'), mip8: mipL('rgba8unorm'),
    };
  }
  
  // Pipelines werden parallel und ohne Blockieren übersetzt (createRenderPipelineAsync), wie früher KHR_parallel_shader_compile
  // Bausteine mit Aus-Variante: ihr Schalter in S und welche Pipelines von ihnen abhängen.
  // opts[name] === false: Baustein wird NICHT mitkompiliert (Aus-Variante mit leeren Einhängepunkten).
  const BAUSTEINE = {
    volcano: { an: () => S.volcanoOn, pipelines: ['gen', 'bg', 'planet', 'cloud'] },
    waves: { an: () => S.modWaves, pipelines: ['bg', 'planet', 'cloud'] },
    clouds: { an: () => S.modClouds, pipelines: ['bg', 'planet', 'cloud', 'cloudGen'] },
    air: { an: () => S.modAtmo, pipelines: ['bg', 'planet', 'cloud', 'comp', 'trans'] },
    bloom: { an: () => S.modBloom, pipelines: ['down', 'up', 'fin'] },
    flare: { an: () => S.modFlare, pipelines: ['fin'] },
    shadows: { an: () => S.modShadows, pipelines: ['planet'] },
    rim: { an: () => S.modRim, pipelines: ['comp'] },
    erosion: { an: () => S.erosion > 0, pipelines: ['gen', 'planet'] },
    rivers: { an: () => S.rivers !== 0, pipelines: ['gen', 'planet'] },
    original: { an: () => S.style === 'orig', pipelines: ['planet', 'cloud', 'comp'] },
    terraces: { an: () => S.terrace > 0, pipelines: ['planet'] },
    detail: { an: () => S.detail > 0, pipelines: ['planet'] },
    surf: { an: () => S.foam > 0, pipelines: ['planet'] },
    waterbody: { an: () => S.modWaterBody, pipelines: ['planet'] },
    ice: { an: () => S.modIce && S.palette === 'earth', pipelines: ['planet'] },
    cavity: { an: () => S.modCavity, pipelines: ['planet'] },
    geomorph: { an: () => S.mesh === 1, pipelines: ['planet'] },
    relief: { an: () => S.relief > 0 && S.style !== 'orig', pipelines: ['planet', 'cloud'] },
    sky: { an: () => S.nebula > 0 || S.stars > 0, pipelines: ['bg', 'nebGen'] },
    sun: { an: () => S.modSun, pipelines: ['bg'] },
    biomEarth: { an: () => S.palette === 'earth', pipelines: ['planet'] },
    biomCd: { an: () => S.palette !== 'earth', pipelines: ['planet'] },
    mountains: { an: () => S.modMountains, pipelines: ['gen'] },
    debug: { an: () => Number(S.view) !== 0, pipelines: ['planet'] },
  };
  const schalter = () => Object.fromEntries(Object.entries(BAUSTEINE).map(([k, bs]) => [k, !!bs.an()]));
  const aktiv = Object.fromEntries(Object.keys(BAUSTEINE).map((k) => [k, true]));   // welche Varianten gerade übersetzt in P liegen
  // only: nur diese Pipelines neu bauen (beim Umschalten eines Bausteins), sonst alle.
  function startPipelines(opts = schalter(), only = null) {
    if (!only) Object.assign(aktiv, Object.fromEntries(Object.keys(BAUSTEINE).map((k) => [k, opts[k] !== false])));
    const an = (k) => opts[k] !== false;
    const wel = an('waves') ? WELLEN : WELLEN_AUS;
    const wol = an('clouds') ? WOLKEN : WOLKEN_AUS;
    const vol = an('volcano') ? VOLC : VOLC_AUS;
    const luft = an('air') ? ATMO : ATMO_AUS;
    const luftPost = an('air') ? ATMO_POST : ATMO_POST_AUS;
    const blm = an('bloom') ? BLOOM : BLOOM_AUS;
    const flr = an('flare') ? FLARE : FLARE_AUS;
    const sch = an('shadows') ? SCHATTEN : SCHATTEN_AUS;
    const saum = an('rim') ? SAUM : SAUM_AUS;
    const ero = an('erosion') ? EROSION : EROSION_AUS;
    const fluGen = an('rivers') ? FLUSS_GEN : FLUSS_GEN_AUS;
    const fluSzene = an('rivers') ? FLUSS_SZENE : FLUSS_SZENE_AUS;
    const sto = an('original') ? STIL_ORIGINAL : STIL_ORIGINAL_AUS;
    const ter = an('terraces') ? TERRASSEN : TERRASSEN_AUS;
    const fdt = an('detail') ? FEINDETAIL : FEINDETAIL_AUS;
    const wsb = an('waterbody') ? WASSER : WASSER_AUS;
    const brd = an('surf') ? BRANDUNG : BRANDUNG_AUS;
    const eis = an('ice') ? MEEREIS : MEEREIS_AUS;
    const kav = an('cavity') ? KAVITAET : KAVITAET_AUS;
    const geo = an('geomorph') ? GEOMORPH : GEOMORPH_AUS;
    const rel = an('relief') ? RELIEF : RELIEF_AUS;
    const him = an('sky') ? HIMMEL : HIMMEL_AUS;
    const son = an('sun') ? SONNE : SONNE_AUS;
    const bcd = an('biomCd') ? BIOM_CD : BIOM_CD_AUS;
    const ber = an('biomEarth') ? BIOM_ERDE : BIOM_ERDE_AUS;
    const geb = an('mountains') ? GEBIRGE : GEBIRGE_AUS;
    const dbg = an('debug') ? ANSICHTEN_DEBUG : ANSICHTEN_DEBUG_AUS;
    const wor = an('original') && an('clouds') ? STIL_ORIGINAL_WOLKEN : STIL_ORIGINAL_WOLKEN_AUS;   // braucht rotY aus dem Wolken-Baustein
    const leu = an('original') ? STIL_ORIGINAL_LEUCHTSAUM : STIL_ORIGINAL_LEUCHTSAUM_AUS;
    const mods = {
      gen: [COMMON + NOISE + ero + vol + fluGen + geb + GEN, 'gen'], cloudGen: [COMMON + NOISE + CLOUDGEN, 'cloudGen'], nebGen: [SKY_GEN_WGSL, 'nebGen'],
      trans: [TRANS, 'trans'], mip16: [MIP('rgba16float'), 'mip16'], mip8: [MIP('rgba8unorm'), 'mip8'],
      scene: [UDECL + COMMON + TEXH + NOISE + sto + ter + fdt + wsb + brd + eis + kav + geo + rel + bcd + ber + wor + dbg + fluSzene + ero + vol + wel + sch + luft + wol + SCENE + him + son, 'scene'],
      post: [UDECL + COMMON + TEXH + luft + luftPost + blm + flr + saum + leu + POST, 'post'],
    };
    const M = {};
    const braucht = (...ks) => !only || ks.some((k) => only.includes(k));
    const mkeys = { gen: braucht('gen'), scene: braucht('bg', 'planet', 'cloud'), post: braucht('comp', 'down', 'up', 'fin'), cloudGen: braucht('cloudGen') && an('clouds'), nebGen: braucht('nebGen') && an('sky'), trans: braucht('trans') && an('air') };
    for (const [k, [code, label]] of Object.entries(mods)) if (k === 'cloudGen' || k === 'nebGen' || k === 'trans' ? mkeys[k] : (!only || mkeys[k])) M[k] = ext.device.createShaderModule({ code, label });
    const pl = (...ls) => ext.device.createPipelineLayout({ bindGroupLayouts: ls });
    const comp = (m, lay, entry = 'main') => ext.device.createComputePipelineAsync({ layout: pl(lay), compute: { module: m, entryPoint: entry } });
    const hdr = 'rgba16float';
    const vtx = [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] }];
    const vtxPatch = [vtx[0], { arrayStride: 16, stepMode: 'instance', attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x4' }] }];
    const premul = { color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' } };
    const add = { color: { srcFactor: 'one', dstFactor: 'one' }, alpha: { srcFactor: 'one', dstFactor: 'one' } };
    const rend = (m, vs, fs, layout, fmt, o = {}) => ext.device.createRenderPipelineAsync({
      layout,
      vertex: { module: m, entryPoint: vs, buffers: o.mesh === 'patch' ? vtxPatch : o.mesh ? vtx : [] },
      fragment: { module: m, entryPoint: fs, targets: [{ format: fmt, ...(o.blend ? { blend: o.blend } : {}) }] },
      primitive: { topology: 'triangle-list', cullMode: o.mesh ? 'back' : 'none' },
      ...(o.ms && MSAA > 1 ? { multisample: { count: MSAA } } : {}),
      ...(o.depth ? { depthStencil: { format: 'depth24plus', depthWriteEnabled: o.depth === 'write', depthCompare: o.depth === 'always' ? 'always' : 'less' } } : {}),
    });
    const scene = pl(ext.L.main, ext.L.draw), post = pl(ext.L.main, ext.L.post);
    const fabrik = {
      gen: () => comp(M.gen, ext.L.genH), cloudGen: () => comp(M.cloudGen, ext.L.gen8), nebGen: () => comp(M.nebGen, ext.L.gen16, 'skyGen'), trans: () => comp(M.trans, ext.L.trans),
      mip16: () => comp(M.mip16, ext.L.mip16), mip8: () => comp(M.mip8, ext.L.mip8),
      bg: () => rend(M.scene, 'vsFull', 'fsBg', scene, hdr, { depth: 'always', ms: true }),
      planet: () => rend(M.scene, 'vsPatch', 'fsPlanet', scene, hdr, { mesh: 'patch', depth: 'write', ms: true }),
      cloud: () => rend(M.scene, 'vsPlanet', 'fsCloud', scene, hdr, { mesh: true, depth: 'always', blend: premul, ms: true }),
      comp: () => rend(M.post, 'vsFull', 'fsComp', post, hdr),
      down: () => rend(M.post, 'vsFull', 'fsDown', post, hdr),
      up: () => rend(M.post, 'vsFull', 'fsUp', post, hdr, { blend: add }),
      fin: () => rend(M.post, 'vsFull', 'fsFinal', post, ext.format),
    };

    const list = Object.fromEntries(Object.entries(fabrik).filter(([k]) => (!only || only.includes(k)) && !(k === 'cloud' && !an('clouds')) && !(k === 'cloudGen' && !an('clouds')) && !(k === 'nebGen' && !an('sky')) && !(k === 'trans' && !an('air')) && !((k === 'down' || k === 'up') && !an('bloom'))).map(([k, f]) => [k, f()]));
    return { list, mods: M };
  }
  // Baustein-Varianten nachziehen: wenn ein Schalter sich geändert hat, nur die betroffenen Pipelines neu übersetzen.
  // Gibt die neuen Pipelines zurück (der Aufrufer legt sie in P), oder null, wenn nichts zu tun ist.
  let bau = null;
  async function neueVarianten() {
    while (bau) { try { await bau; } catch { /* der andere Aufrufer meldet den Fehler */ } }   // parallele Aufrufe warten aufeinander
    const jetzt = schalter();
    const geaendert = Object.keys(BAUSTEINE).filter((k) => jetzt[k] !== aktiv[k]);
    if (!geaendert.length) return null;
    const nur = [...new Set(geaendert.flatMap((k) => BAUSTEINE[k].pipelines))];   // 'cloud' wird bei ausgeschalteten Wolken nicht gebaut
    bau = (async () => {
      const { list } = startPipelines(jetzt, nur);
      const keys = Object.keys(list);
      const res = await Promise.all(keys.map((k) => list[k]));
      Object.assign(aktiv, jetzt);
      return Object.fromEntries(keys.map((k, i) => [k, res[i]]));
    })();
    try { return await bau; } finally { bau = null; }
  }
  return { initGPU, makeLayouts, startPipelines, neueVarianten };
}
