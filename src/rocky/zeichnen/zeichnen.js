import { clamp } from '../logik/zufall.js';
import { inv4, V } from '../logik/mathe.js';
import { Kette } from '../../grafik/kette';
import { ketteAn } from '../../grafik/menue';
import { persp64, blick64, mul64, umgekehrtZ, planetMatrix64, mal3, malT3, seitenEbenen, norm, kachelTaylor } from '../logik/genau.js';
import { toFaceJS, faceDirJS } from '../logik/wuerfel.js';
import { BODEN, augenHoehe } from '../kamera/kamera.js';
import { UO } from '../shader/udecl.js';
import { SP, spielerStart, spielerKamera } from '../kamera/spieler.js';
import { createGrasLauf } from './graslauf.js';
import { HAPPEN } from '../shader/patch.js';

// 4×4, spaltenweise: Verschiebung um k·v
const verschiebung = (v, k = 1) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, k * v[0], k * v[1], k * v[2], 1];

// Zeichnen eines Bildes: Sonnenrichtung, Uniform-Block füllen, Szene (Planet, Wolken, Himmel) und Nachbild in einen Befehlspuffer.
// ext: { S, coarse, RS, eroOct, cloudRes, nebRes, cycA, cycB, canvas, ensureTargets, updateTrans, drawBiome, atmoParams, cam, fitDist, updateCyclones, CLOUD_PERIOD, SPLIT, mainGroup, buildPatches, PATCH_G, OFFSCREEN, uData*, simTime*, moistQ*, PP*, seaH*, device*, uBuf*, lutDirty*, spin*, dPlanet*, dCloud*, P*, meshPlanet*, meshCloud*, context* }  (* = lebender Zustand, per Getter/Setter)
export function createZeichnen(ext) {
  const { S, coarse, RS, eroOct, cloudRes, nebRes, cycA, cycB, canvas, ensureTargets, updateTrans, drawBiome, atmoParams, cam, fitDist, updateCyclones, CLOUD_PERIOD, SPLIT, mainGroup, buildPatches, PATCH_G, OFFSCREEN } = ext;
  const grasLauf = createGrasLauf(ext);
  function sunDir() {
    const az = S.sunAz * Math.PI / 180, el = S.sunEl * Math.PI / 180;
    return [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
  }
  // Kameraort aus Abstand, Länge und Breite
  const kamOrt = () => [cam.dist * Math.cos(cam.pitch) * Math.sin(cam.yaw), cam.dist * Math.sin(cam.pitch), cam.dist * Math.cos(cam.pitch) * Math.cos(cam.yaw)];
  // Blickrichtung waagerecht: Norden am Kamerapunkt, um den Winkel by nach Osten gedreht
  function waagerecht(by) {
    const nord = [-Math.sin(cam.pitch) * Math.sin(cam.yaw), Math.cos(cam.pitch), -Math.sin(cam.pitch) * Math.cos(cam.yaw)];
    const ost = [Math.cos(cam.yaw), 0, -Math.sin(cam.yaw)];
    return [0, 1, 2].map((i) => nord[i] * Math.cos(by) + ost[i] * Math.sin(by));
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
  // Bodennähe: vpRel, Nah-Oktaven-Anker, Gras-Feld in den Uniform-Puffer (Lage UO, udecl.js). Rückgabe: true, wenn das Gras-Feld steht.
  function fillBoden(o) {
    const u = ext.uData;
    u.set(o.vpRel, UO.vpRel);
    u.set([...o.eHat, o.E], UO.Ne);
    // Nah-Oktaven setzen feindetail.js fort: dort f0 = 0,16 / (1,5708 / N), 5 Oktaven; hier ab 32·f0, so viele, wie in f32 exakt bleiben
    const f0 = Math.fround(Math.fround(0.16 / Math.fround(1.5708 / RS.nShown)) * 32);
    const n = S.boden ? Math.max(0, Math.min(12, Math.floor(Math.log2(1.6e7 / f0)) + 1)) : 0;
    u.set([f0, n, 0, S.boden ? 1 : 0], UO.Nf);
    for (let k = 0; k < 12; k++) {
      const f = f0 * 2 ** k;
      const I = o.eHat.map((v) => Math.floor(v * f));
      u.set([...I, 0], UO.NI + 4 * k);
      u.set([0, 1, 2].map((i) => o.eHat[i] * f - I[i]).concat(0), UO.NF + 4 * k);
    }
    const Rm = S.radiusKm * 1000;
    const sicht = S.grasSicht / Rm;
    u.set([S.style === 'orig' ? 0 : S.relief, ext.simTime, S.gras ? 1 : 0, S.grasLicht], UO.Bd);
    BODEN.grasSichtbar = false;
    if (!S.boden || !S.gras || o.alt * Rm > S.grasAb || S.style === 'orig') return false;
    // Gras-Feld: Gitter der Würfelseite unter der Kamera, Schritt ≈ grasAbstand Meter, ganze Zellen (Halme stehen beim Gehen still).
    // Der Schritt wird in Stufen von 2^(1/8) gerundet: stufenlos nachgeführt verschob er beim Gehen alle Zellen (Zellnummer ~ 10⁷).
    const [f, uu, vv] = toFaceJS(o.eHat);
    const eps = 1e-7, p0 = faceDirJS(f, uu, vv), p1 = faceDirJS(f, uu + eps, vv);
    const dThdu = Math.hypot(...V.sub(p1, p0)) / eps;
    const stufe = Math.round(Math.log2(dThdu) * 8);
    const du = (S.grasAbstand / Rm) / 2 ** (stufe / 8);
    const nH = Math.min(S.grasMax, Math.max(8, Math.round(2 * S.grasSicht / S.grasAbstand))) & ~3;   // durch 4: Büschel aus 2 × 2 Halmen, gerade Ecke
    const iu = 2 * (Math.floor(uu / du / 2) - nH / 4), iv = 2 * (Math.floor(vv / du / 2) - nH / 4);
    const T = kachelTaylor(f, iu * du, iv * du, nH * du);
    const w = mal3(o.M64, T.c);
    u.set([...V.sub(w, o.eye), S.grasAbstand], UO.Gc);   // w: Zellgröße in Metern
    u.set([...T.c, nH], UO.Gp);
    u.set([...T.Ds, 0], UO.GDs); u.set([...T.Dt, 0], UO.GDt); u.set([...T.Dss, 0], UO.GDss); u.set([...T.Dst, 0], UO.GDst); u.set([...T.Dtt, 0], UO.GDtt);
    u.set([0, 0, 1 / Rm, S.grasGlanz], UO.Gi);   // z: Meter → Radien (Halmmaße wie im Vorbild GrassGPU in Metern)
    new Int32Array(u.buffer, (UO.Gi) * 4, 2).set([iu, iv]);
    grasLauf.vorbereiten(nH, [JSON.stringify(S), f, stufe, RS.nShown, ext.seaH].join('|'), ext.P.grasWahl, ext.jobs.length > 0);
    BODEN.grasSichtbar = true;
    return true;
  }
  // Bodenhöhe unter der Kamera: Rechen-Shader csBoden, Ergebnis über einen Lesepuffer ein Bild später (BODEN.h)
  let bodenBuf = null, bodenLese = null, bodenGruppe = null, bodenZustand = 'frei', bodenMitBall = false;
  function bodenMessen(enc) {
    if (!S.boden || !ext.P.boden) { BODEN.gueltig = false; return; }
    if (!bodenBuf) {
      bodenBuf = ext.device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
      bodenLese = ext.device.createBuffer({ size: 16, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
      bodenGruppe = ext.device.createBindGroup({ layout: ext.L.boden, entries: [{ binding: 0, resource: { buffer: bodenBuf } }] });
    }
    if (bodenZustand === 'kopiert') {
      bodenZustand = 'wartet';
      bodenLese.mapAsync(GPUMapMode.READ).then(() => {
        const v = new Float32Array(bodenLese.getMappedRange().slice(0));
        bodenLese.unmap();
        if (Number.isFinite(v[0])) { BODEN.h = v[0]; BODEN.gueltig = true; }
        if (bodenMitBall && Number.isFinite(v[2])) { BODEN.ballH = v[2]; BODEN.ballWasser = v[3] > 0.5; BODEN.ballGueltig = true; }   // Spielball: zweite Messstelle
        bodenZustand = 'frei';
      }, () => { bodenZustand = 'frei'; });
    }
    if (bodenZustand !== 'frei') return;
    bodenMitBall = ext.uData[UO.Bp + 3] > 0.5;
    const cp = enc.beginComputePass();
    cp.setPipeline(ext.P.boden);
    cp.setBindGroup(0, mainGroup());
    cp.setBindGroup(1, RS.bgDrawPlanet);
    cp.setBindGroup(2, bodenGruppe);
    cp.dispatchWorkgroups(1);
    cp.end();
    enc.copyBufferToBuffer(bodenBuf, 0, bodenLese, 0, 16);
    bodenZustand = 'kopiert';
  }
  let kette = null;   // Grafik-Optionen: gibt es nur, solange eine Stufe an ist
  function render(enc) {
    const aus = () => (OFFSCREEN ? RS.outV : ext.context.getCurrentTexture().createView());
    let stufen = null;
    if (!ext.ansicht && !OFFSCREEN && ketteAn(S)) {
      kette ??= new Kette(ext.device);
      stufen = kette.seite(() => enc, aus, ext.format, canvas.width, canvas.height, S);
    } else if (kette) { kette.zerstoeren(); kette = null; }
    const w = stufen ? stufen.w : canvas.width, h = stufen ? stufen.h : canvas.height;
    ensureTargets(w, h);
    updateTrans(enc);
    if (ext.lutDirty) { drawBiome(S.seed, clamp(ext.seaH, 0, 1)); ext.lutDirty = false; }
    const orig = S.style === 'orig';
    const A = atmoParams();
    const aspect = w / h, fov = S.fov * Math.PI / 180;
    const ov = ext.ansicht;   // eingebettet in die Welt: Kamera (in Planetenradien), Sonne und Helligkeit kommen von außen
    const M64 = planetMatrix64(ext.spin, S.tilt * Math.PI / 180);
    // Spielball (kamera/spieler.js): Kamera in 3. Person; ohne S.spieler bleibt alles wie bisher
    let kam = null;
    if (!ov && S.boden && S.spieler) {
      if (!SP.aktiv) {
        // Start: Ball auf das Gelände unter der aktuellen Kamera, Kurs = Blickrichtung waagerecht
        spielerStart(S, norm(malT3(M64, kamOrt())), malT3(M64, waagerecht(cam.blickYaw)), BODEN);
      }
      kam = spielerKamera(S, BODEN, M64);
      const r = Math.hypot(kam.eye[0], kam.eye[1], kam.eye[2]);   // übrige Kamerawerte (Abstand, Nähe) mitführen
      cam.dist = cam.tDist = r; cam.yaw = Math.atan2(kam.eye[0], kam.eye[2]); cam.pitch = Math.asin(kam.eye[1] / r); cam.zoomed = true; cam.vYaw = cam.vPitch = 0;
    }
    if (!ov && !kam) {
      if (!cam.zoomed) cam.tDist = fitDist(aspect);
      cam.dist += (cam.tDist - cam.dist) * 0.18;
    }
    // Bodennähe: nie unter Augenhöhe über dem Gelände (Höhe aus csBoden, ein Bild Verzug)
    if (!ov && !kam && S.boden) { const mn = ext.minDist(); if (cam.dist < mn) cam.dist = mn; if (cam.tDist < mn) cam.tDist = mn; }
    const eye = kam ? kam.eye : ov ? ov.auge : kamOrt();
    const camDist = ov ? Math.hypot(eye[0], eye[1], eye[2]) : cam.dist;
    // Blick: weit draußen zur Planetenmitte wie bisher (Oben = Norden); in Bodennähe kippt er zum Horizont, dazu Umsehen (kamera.js).
    // Ohne Kippen und Umsehen ist das genau lookAt(eye, 0, (0,1,0)) von früher.
    const alt = camDist - ext.grund();
    let vp, vpRel, vpStrahl = null, tiefeInfo = null;
    if (ov) {
      vp = umgekehrtZ(ov.vp);   // die Welt liefert gewöhnliche Tiefe
      vpRel = mul64(vp, verschiebung(eye));
    } else {
      const up = norm(eye);
      const kipp = S.boden ? 1 - Math.min(1, Math.max(0, alt / S.kippAb)) : 0;
      const th = Math.min(Math.PI / 2 + 0.6, Math.max(0, kipp * (Math.PI / 2 - 0.12) + (S.boden ? cam.blickPitch : 0)));
      const hd = waagerecht(S.boden ? cam.blickYaw : 0);
      let dir = [0, 1, 2].map((i) => -up[i] * Math.cos(th) + hd[i] * Math.sin(th));
      let oben = [0, 1, 2].map((i) => up[i] * Math.sin(th) + hd[i] * Math.cos(th));
      if (kam) { dir = kam.dir; oben = kam.oben; }   // Spielball: Blick vom Auge zum Ball
      // Umgekehrte Tiefe mit 32-Bit-Gleitkomma (Reed 2015): die nahe Ebene darf in Bodennähe winzig sein
      const nearWeit = Math.max(0.0015, (cam.dist - 1.05) * 0.6);
      const near = S.boden ? Math.min(Math.max(1e-9, alt * 0.1), nearWeit) : nearWeit;
      const far = cam.dist + 4;
      const P = umgekehrtZ(persp64(fov, aspect, near, far));
      const R = blick64(dir, oben);
      vpRel = mul64(P, R);
      const zurKamera = verschiebung(eye, -1);
      vp = mul64(vpRel, zurKamera);
      // Himmel und Luft rechnen nur Blickstrahlen aus ivp (Punkt auf der fernen Ebene). Mit der winzigen nahen Ebene am Boden ist
      // vp fast singulär und ivp in f32 unbrauchbar (senkrechte Streifen); dieselben Strahlen ergeben sich mit einer vernünftigen nahen Ebene.
      tiefeInfo = { near, far, vorn: dir };
      vpStrahl = mul64(mul64(umgekehrtZ(persp64(fov, aspect, Math.max(near, far * 1e-4), far)), R), zurKamera);
    }
    const ivp = inv4(vpStrahl || vp);
    vp = new Float32Array(vp);
    const model = new Float32Array(M64);
    const eyeP = malT3(M64, eye);                      // Kamera im Planetenraum (double)
    const E = Math.hypot(eyeP[0], eyeP[1], eyeP[2]);
    const eHat = eyeP.map((v) => v / E);
    const sun = ov ? V.norm(ov.sonne) : sunDir();
    const sunE = (orig ? 1 : 3.2) * (ov ? ov.helligkeit : 1);
    const cloudOn = RS.cloudReady && S.cover > 0 && S.modClouds;
    updateCyclones();
    const clU = [cloudOn ? S.cover : 0, ext.simTime / CLOUD_PERIOD, S.wind * 0.35, orig ? 0 : S.cloudShadow];
    const clU2 = [orig ? 0.006 : S.cloudH, ext.spin * 0.12, orig ? S.cloudOpO : S.cloudOp, orig ? 0 : 1];
    const bloomOn = !orig && S.bloom > 0 && S.modBloom && RS.bloom.length > 1 && !!ext.P.down && !!ext.P.up;
  
    // Sonne auf dem Bild und ob der Planet sie verdeckt (für die Blendenflecke)
    const far4 = new Float32Array(mul64(vp, new Float32Array(verschiebung(eye.map((v, i) => v + sun[i] * 50)))));
    const cw = far4[15];
    let fl = [0, 0, 0, aspect];
    if (cw > 0 && S.flare > 0 && S.modFlare) {
      const sx = far4[12] / cw * 0.5 + 0.5, sy = far4[13] / cw * 0.5 + 0.5;
      const toC = V.norm([-eye[0], -eye[1], -eye[2]]);
      const alpha = Math.asin(Math.min(1, 1.01 / camDist));
      const beta = Math.acos(clamp(V.dot(sun, toC), -1, 1));
      const vis = clamp((beta - alpha + 0.012) / 0.024, 0, 1);
      const onScreen = clamp(1.4 - Math.max(Math.abs(sx - 0.5), Math.abs(sy - 0.5)) * 2, 0, 1);
      fl = [sx, sy, vis * onScreen * S.flare * (orig ? 0.9 : 0.5), aspect];
    }
    const gras = fillBoden({ vpRel, M64, eye, eHat, E, alt });
    {
      // Spielball: Mitte, Radius, Ausrichtung (Ball → Welt) und Messstelle für csBoden; Mitte in double relativ zur Kamera (wie die Gras-Feldmitte)
      const u = ext.uData, Rm = S.radiusKm * 1000;
      if (kam) {
        const pw = mal3(M64, SP.p);
        const Rw = [0, 3, 6].map((i) => mal3(M64, SP.R.slice(i, i + 3)));
        u.set([...SP.p, 1], UO.Bp);
        u.set([...V.sub(kam.mitte, eye), SP.radius / Rm], UO.Sp);
        u.set([...V.sub(pw, eye), 0], UO.Bq);
        u.set([...Rw[0], 1], UO.Sa); u.set([...Rw[1], 0], UO.Sb); u.set([...Rw[2], 0], UO.Sc);
      } else { u.fill(0, UO.Bp, UO.Bp + 4); u.fill(0, UO.Sp, UO.Sp + 4); u.fill(0, UO.Sa, UO.Sa + 4); }
    }
    ext.uData.set(tiefeInfo && S.boden ? [tiefeInfo.near, tiefeInfo.far, 1, 0, ...tiefeInfo.vorn, 0] : [0, 0, 0, 0, 0, 0, 0, 0], UO.Tf);   // vor fillUniforms: das schreibt den ganzen Puffer
    fillUniforms({ vp, ivp, model, eye, sun, sunE, A, orig, clU, clU2, bloomOn, fl });
    ext.device.queue.writeBuffer(ext.dPlanet, 0, new Float32Array([1, SPLIT, orig ? 0 : S.relief, S.mesh]));
    ext.device.queue.writeBuffer(ext.dCloud, 0, new Float32Array([1 + clU2[0], 0, 0, orig ? 0 : S.relief]));
    const g0 = mainGroup();
  
    // Netz-Kacheln wählen und sichtbare Grasbüschel auf der GPU vorsortieren (vor dem Szenen-Durchgang)
    {
      // Kamera in den Planetenraum (Modellmatrix ist eine Drehung: transponiert = invers)
      const eo = malT3(model, eye);
      const tiefe0 = Math.max(2, Math.round(Math.log2(RS.nShown / PATCH_G)) + 1);
      // Frustum im Planetenraum: C = vpRel · [M | −Auge] (Gribb & Hartmann, genau.js)
      const A4 = [M64[0], M64[1], M64[2], 0, M64[3], M64[4], M64[5], 0, M64[6], M64[7], M64[8], 0, -eye[0], -eye[1], -eye[2], 1];
      const ebenen = S.frustum ? seitenEbenen(mul64(vpRel, A4)) : null;
      buildPatches(ext.meshPlanet, { eo, maxDepth: S.boden ? Math.max(tiefe0, S.bodenTiefe) : tiefe0, ebenen, M64, auge: eye, huelle: (orig ? 0 : S.relief) * 1.2 + 0.002 });
      RS.kacheln = ext.meshPlanet.n; RS.kachelnWeg = ext.meshPlanet.culled;
    }
    const mitGras = gras && ext.P.gras && ext.P.grasWahl;
    if (mitGras) grasLauf.waehlen(enc, ext.P.grasWahl, g0, RS.bgDrawPlanet);

    // Gras, Planet, Hintergrund, Wolken: vorn zuerst, damit verdeckte Pixel gar nicht erst gerechnet werden (früher Tiefentest);
    // der Himmel läuft zuletzt und nur dort, wo noch nichts steht
    const sp = enc.beginRenderPass({
      colorAttachments: [RS.msaaV ? { view: RS.msaaV, resolveTarget: RS.sceneV, loadOp: 'clear', clearValue: [0, 0, 0, 1], storeOp: 'discard' } : { view: RS.sceneV, loadOp: 'clear', clearValue: [0, 0, 0, 1], storeOp: 'store' }],
      depthStencilAttachment: { view: RS.depthV, depthClearValue: 0, depthLoadOp: 'clear', depthStoreOp: 'store' },   // gespeichert: das Nachbild liest sie (Luft endet am Gelände)   // umgekehrte Tiefe: fern = 0
    });
    sp.setBindGroup(0, g0);
    sp.setBindGroup(1, RS.bgDrawPlanet);
    if (mitGras) grasLauf.zeichnen(sp, ext.P.gras);
    sp.setPipeline(ext.P.planet);
    sp.setVertexBuffer(0, ext.meshPlanet.vb);
    sp.setVertexBuffer(1, ext.meshPlanet.inst);
    sp.setIndexBuffer(ext.meshPlanet.ib, 'uint32');
    // in Häppchen (patch.js)
    for (let i = 0; i < ext.meshPlanet.n; i += HAPPEN) sp.drawIndexed(ext.meshPlanet.count, Math.min(HAPPEN, ext.meshPlanet.n - i), 0, 0, i);
    if (kam && ext.P.spieler) {
      sp.setPipeline(ext.P.spieler);
      sp.draw(32 * 16 * 6);   // Spielball: Kugel aus der Eckpunktnummer (shader/spieler.js)
    }
    sp.setPipeline(ext.P.bg);
    sp.draw(3);
    if (cloudOn && S.view === 0 && ext.P.cloud) {
      sp.setPipeline(ext.P.cloud);
      sp.setBindGroup(1, RS.bgDrawCloud);
      sp.setVertexBuffer(0, ext.meshCloud.vb);
      sp.setIndexBuffer(ext.meshCloud.ib, 'uint32');
      sp.drawIndexed(ext.meshCloud.count);
    }
    sp.end();
    bodenMessen(enc);
  
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
    full(stufen ? stufen.bild() : aus(), ext.P.fin, bloomOn ? RS.pgFin : RS.pgFinNoBloom);
    if (stufen) stufen.fertig();
  }
  return { render };
}
