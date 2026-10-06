import { clamp } from '../logik/zufall.js';
import { lookAt, persp, mul4, inv4, planetMatrix, V } from '../logik/mathe.js';


// Zeichnen eines Bildes: Sonnenrichtung, Uniform-Block füllen, Szene (Planet, Wolken, Himmel) und Nachbild in einen Befehlspuffer.
// ext: { S, coarse, RS, eroOct, cloudRes, nebRes, cycA, cycB, canvas, ensureTargets, updateTrans, drawBiome, atmoParams, cam, fitDist, updateCyclones, CLOUD_PERIOD, SPLIT, mainGroup, buildPatches, PATCH_G, OFFSCREEN, uData*, simTime*, moistQ*, PP*, seaH*, device*, uBuf*, lutDirty*, spin*, dPlanet*, dCloud*, P*, meshPlanet*, meshCloud*, context* }  (* = lebender Zustand, per Getter/Setter)
export function createZeichnen(ext) {
  const { S, coarse, RS, eroOct, cloudRes, nebRes, cycA, cycB, canvas, ensureTargets, updateTrans, drawBiome, atmoParams, cam, fitDist, updateCyclones, CLOUD_PERIOD, SPLIT, mainGroup, buildPatches, PATCH_G, OFFSCREEN } = ext;
  function sunDir() {
    const az = S.sunAz * Math.PI / 180, el = S.sunEl * Math.PI / 180;
    return [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
  }
  // Alle Werte für die Shader in einem Puffer (Reihenfolge wie struct Uf)
  function fillUniforms(o) {
    const u = ext.uData;
    u.set(o.vp, 0); u.set(o.ivp, 16);
    const m = o.model;
    u.set([m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0], 32);
    u.set([...o.eye, ext.simTime], 44);
    u.set([...o.sun, o.sunE], 48);
    const A = o.A;
    u.set([1, A.Rt, A.HR, A.HM], 52);
    u.set([...A.bR, A.bM], 56);
    u.set([...A.bO, A.bMe], 60);
    u.set([A.oz[0], A.oz[1], 0.8, coarse ? 16 : 28], 64);
    u.set([S.nscale, S.rough, S.metal, S.ambient], 68);
    u.set([0, S.clarity, 0, 0], 72);
    u.set([S.bump, S.gloss, 0, 0], 76);
    u.set([0, S.ambientP, 0, 0], 80);
    u.set([ext.moistQ[0], ext.moistQ[1], S.sunI, 0.0095], 84);
    u.set([S.erosion * Math.pow(0.5, eroOct(RS.nShown)), 34 * Math.pow(2, eroOct(RS.nShown)), 0, 0], 88);
    u.set(o.clU, 92); u.set(o.clU2, 96);
    u.set([RS.nShown, cloudRes, ext.seaH, o.orig ? 1.2 : o.sunE], 100);
    u.set([o.orig ? 0 : 1, S.palette === 'earth' ? 1 : 0, S.view, RS.nebReady ? 1 : 0], 104);
    u.set([S.nebula, S.stars, nebRes, 0], 108);
    u.set([S.modWaves ? S.waves : 0, 0, 0, 0], 176);   // Wl: Baustein Wellen
    u.set([S.modShadows ? S.shadows : 0, 0, 0, 0], 180);   // Sh: Baustein Geländeschatten
    u.set([S.volcanoOn ? S.volcanoes : 0, ext.PP.noiseSeed, S.volcanoType, S.craterFill], 184);
    u.set([S.rivers === 2 && S.style !== 'orig' ? RS.nHydro : 0, (S.rivers === 1 || S.rivers === 3) && !o.orig ? RS.nRiver : 0, S.rivers, 0], 196);   // Rv: Baustein Flüsse
    u.set([S.terrace, 0, 0, 0], 188);   // Te: Baustein Terrassen
    u.set([S.detail, 0, 0, 0], 192);    // Fd: Baustein Feindetail
    u.set([S.foam, 0, 0, 0], 200);      // Br: Baustein Brandung   // Vk: Baustein Vulkane
    u.set([0.45, 0.7, 1.0, S.glow], 112);
    u.set([o.orig ? 1 : S.exposure * 1.25, o.bloomOn ? S.bloom * 0.12 : 0, o.orig ? 0 : 1, 0], 116);
    u.set(o.fl, 120);
    u.set(cycA, 124); u.set(cycB, 148);
    u.set([0.35, 0.55, 1.0, S.modRim ? S.rimStr : 0], 172);
    ext.device.queue.writeBuffer(ext.uBuf, 0, u);
  }
  function render(enc) {
    const w = canvas.width, h = canvas.height;
    ensureTargets(w, h);
    updateTrans(enc);
    if (ext.lutDirty) { drawBiome(S.seed, clamp(ext.seaH, 0, 1)); ext.lutDirty = false; }
    const orig = S.style === 'orig';
    const A = atmoParams();
    const aspect = w / h, fov = S.fov * Math.PI / 180;
    if (!cam.zoomed) cam.tDist = fitDist(aspect);
    cam.dist += (cam.tDist - cam.dist) * 0.18;
    const eye = [cam.dist * Math.cos(cam.pitch) * Math.sin(cam.yaw), cam.dist * Math.sin(cam.pitch), cam.dist * Math.cos(cam.pitch) * Math.cos(cam.yaw)];
    const near = Math.max(0.0015, (cam.dist - 1.05) * 0.6), far = cam.dist + 4;
    const view = lookAt(eye, [0, 0, 0], [0, 1, 0]);
    const proj = persp(fov, aspect, near, far);
    const vp = mul4(proj, view), ivp = inv4(vp);
    const model = planetMatrix(ext.spin, S.tilt * Math.PI / 180);
    const sun = sunDir();
    const sunE = orig ? 1 : 3.2;
    const cloudOn = RS.cloudReady && S.cover > 0 && S.modClouds;
    updateCyclones();
    const clU = [cloudOn ? S.cover : 0, ext.simTime / CLOUD_PERIOD, S.wind * 0.35, orig ? 0 : S.cloudShadow];
    const clU2 = [orig ? 0.006 : S.cloudH, ext.spin * 0.12, orig ? S.cloudOpO : S.cloudOp, orig ? 0 : 1];
    const bloomOn = !orig && S.bloom > 0 && S.modBloom && RS.bloom.length > 1 && !!ext.P.down && !!ext.P.up;
  
    // Sonne auf dem Bild und ob der Planet sie verdeckt (für die Blendenflecke)
    const far4 = mul4(vp, new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, eye[0] + sun[0] * 50, eye[1] + sun[1] * 50, eye[2] + sun[2] * 50, 1]));
    const cw = far4[15];
    let fl = [0, 0, 0, aspect];
    if (cw > 0 && S.flare > 0 && S.modFlare) {
      const sx = far4[12] / cw * 0.5 + 0.5, sy = far4[13] / cw * 0.5 + 0.5;
      const toC = V.norm([-eye[0], -eye[1], -eye[2]]);
      const alpha = Math.asin(Math.min(1, 1.01 / cam.dist));
      const beta = Math.acos(clamp(V.dot(sun, toC), -1, 1));
      const vis = clamp((beta - alpha + 0.012) / 0.024, 0, 1);
      const onScreen = clamp(1.4 - Math.max(Math.abs(sx - 0.5), Math.abs(sy - 0.5)) * 2, 0, 1);
      fl = [sx, sy, vis * onScreen * S.flare * (orig ? 0.9 : 0.5), aspect];
    }
    fillUniforms({ vp, ivp, model, eye, sun, sunE, A, orig, clU, clU2, bloomOn, fl });
    ext.device.queue.writeBuffer(ext.dPlanet, 0, new Float32Array([1, SPLIT, orig ? 0 : S.relief, S.mesh]));
    ext.device.queue.writeBuffer(ext.dCloud, 0, new Float32Array([1 + clU2[0], 0, 0, orig ? 0 : S.relief]));
    const g0 = mainGroup();
  
    // Hintergrund, Planet, Wolken
    const sp = enc.beginRenderPass({
      colorAttachments: [RS.msaaV ? { view: RS.msaaV, resolveTarget: RS.sceneV, loadOp: 'clear', clearValue: [0, 0, 0, 1], storeOp: 'discard' } : { view: RS.sceneV, loadOp: 'clear', clearValue: [0, 0, 0, 1], storeOp: 'store' }],
      depthStencilAttachment: { view: RS.depthV, depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'discard' },
    });
    sp.setBindGroup(0, g0);
    sp.setBindGroup(1, RS.bgDrawPlanet);
    sp.setPipeline(ext.P.bg);
    sp.draw(3);
    sp.setPipeline(ext.P.planet);
    {
      // Kamera in den Planetenraum (Modellmatrix ist eine Drehung: transponiert = invers)
      const eo = [0, 1, 2].map((c) => model[c * 3] * eye[0] + model[c * 3 + 1] * eye[1] + model[c * 3 + 2] * eye[2]);
      buildPatches(ext.meshPlanet, eo, Math.max(2, Math.round(Math.log2(RS.nShown / PATCH_G)) + 1));
    }
    sp.setVertexBuffer(0, ext.meshPlanet.vb);
    sp.setVertexBuffer(1, ext.meshPlanet.inst);
    sp.setIndexBuffer(ext.meshPlanet.ib, 'uint32');
    sp.drawIndexed(ext.meshPlanet.count, ext.meshPlanet.n);
    if (cloudOn && S.view === 0 && ext.P.cloud) {
      sp.setPipeline(ext.P.cloud);
      sp.setBindGroup(1, RS.bgDrawCloud);
      sp.setVertexBuffer(0, ext.meshCloud.vb);
      sp.setIndexBuffer(ext.meshCloud.ib, 'uint32');
      sp.drawIndexed(ext.meshCloud.count);
    }
    sp.end();
  
    const full = (view, pipe, group, load) => {
      const p = enc.beginRenderPass({ colorAttachments: [{ view, loadOp: load ? 'load' : 'clear', clearValue: [0, 0, 0, 1], storeOp: 'store' }] });
      p.setPipeline(pipe);
      p.setBindGroup(0, g0);
      p.setBindGroup(1, group);
      p.draw(3);
      p.end();
    };
    // Luft / Leuchtsaum
    full(RS.hdr2V, ext.P.comp, RS.pgComp);
  
    // Überstrahlung
    if (bloomOn) {
      let sw = w, sh = h;
      RS.bloom.forEach((b, i) => {
        ext.device.queue.writeBuffer(b.pd, 0, new Float32Array([1 / sw, 1 / sh, 1.2 / Math.max(S.exposure, 0.05), i === 0 ? 1 : 0]));
        ext.device.queue.writeBuffer(b.pu, 0, new Float32Array([1 / b.w, 1 / b.h, 0, 0]));
        full(b.v, ext.P.down, b.gDown);
        sw = b.w; sh = b.h;
      });
      for (let i = RS.bloom.length - 1; i > 0; i--) full(RS.bloom[i - 1].v, ext.P.up, RS.bloom[i].gUp, true);
    }
    full(OFFSCREEN ? RS.outV : ext.context.getCurrentTexture().createView(), ext.P.fin, bloomOn ? RS.pgFin : RS.pgFinNoBloom);
  }
  return { render };
}
