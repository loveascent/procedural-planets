// Eckpunkt-Stufen der Szene: Kugel (Wolkenschale) und Gelände-Kacheln (Quadtree wie CDLOD, Strugar 2009), Verschiebung und Geomorphing über die Einhängepunkte hook_relief und hook_geomorph.
// Quelle (CREDITS.md): Strugar, CDLOD (2009). Bodennähe: Positionen relativ zur Kamera (RTC nach Ohlarik, „Precisions, Precisions“, AGI 2008):
// die Kachelmitte relativ zur Kamera kommt in double von der CPU (netz.js), im Shader nur kleine Versätze aus der Taylor-Entwicklung
// des Kugelpunkts (genau.js, kachelTaylor). So hängt kein Rundungsfehler von der Kameraposition ab (kein Zittern am Boden).
import { PATCH_G } from './patch.js';

export const SCENE_VERTEX = /* wgsl */`
const PATCH_G = ${PATCH_G}.0;
@group(1) @binding(0) var<uniform> D: vec4f;   // Radius, LOD im Vertex-Shader, Relief-Höhe (Verschiebung), Relief-Höhe (für Wolken)
struct PV { @builtin(position) pos: vec4f, @location(0) obj: vec3f, @location(1) world: vec3f, @location(2) rel: vec3f }
@vertex fn vsPlanet(@location(0) aPos: vec3f) -> PV {
  let d = normalize(aPos);
  let disp = hook_relief(d, D.y, D.z);
  let p = d * (D.x + disp);
  var o: PV;
  o.obj = d;
  o.world = modelM() * p;
  o.rel = o.world - U.cam.xyz;
  o.pos = U.vp * vec4f(o.world, 1.0);
  return o;
}

// Höhe über der Kugel (in Radien) an der Richtung d. Ohne Bodennähe (U.Nf.w = 0) genau wie bisher hook_relief.
// Mit Bodennähe: Kartenhöhe + Feindetail + Nah-Oktaven (shader/nah.js), dieselbe Summe wie im Pixel-Shader, ausgeblendet nach
// dem Eckpunktabstand pixV (Bogenmaß). q = Ort relativ zur Kamera im Planetenraum (für die Nah-Oktaven).
fn bodenHoehe(d: vec3f, q: vec3f, lod: f32, pixV: f32, hz: f32) -> f32 {
  if (U.Nf.w < 0.5) { return hook_relief(d, lod, hz); }
  if (hz <= 0.0) { return 0.0; }
  let F = toFace(d, vec3f(0.0), vec3f(0.0));
  let T = texFaceLod(tHm, F, U.T.x, lod);
  let g0 = T.z * F.jx + T.w * F.jy;
  let fd = hook_feindetail(d, pixV, 1.5708 / U.T.x, T.x, g0, 1.0, U.Fd.x);
  let nh = hook_nah(q, pixV, fd.h, fd.g, g0, 1.0, U.Fd.x);
  return hz * max(nh.h - U.T.z, 0.0);
}

// Kugelpunkt-Versatz zur Mitte aus a, b ∈ [−½, ½] (Taylor-Glieder aus genau.js, kachelTaylor): Kacheln und Grasfeld
fn taylorOrt(a: vec2f, Ds: vec3f, Dt: vec3f, Dss: vec3f, Dst: vec3f, Dtt: vec3f) -> vec3f {
  return Ds * a.x + Dt * a.y + 0.5 * Dss * a.x * a.x + Dst * a.x * a.y + 0.5 * Dtt * a.y * a.y;
}
// Punkt relativ zur Kamera (Welt): Ort a (+ b: Mitte auf der Kugel bei Taylor, sonst 0) auf Radius r, um k angehoben; off = Mitte relativ zur Kamera
fn rtcPunkt(a: vec3f, b: vec3f, off: vec3f, r: f32, k: f32) -> vec3f { return modelM() * (a * (r + k) + b * k) + off; }

// Gelände-Kacheln (Quadtree wie CDLOD, Strugar 2009): pro Kachel ein Gitter, fein nahe der Kamera.
// Rand-Schürzen (skirt) verdecken die Spalten zwischen Kacheln verschiedener Stufe.
// Geomorphing (Strugar 2009): nahe der Grenze zur gröberen Kachel wandern die ungeraden Gitterpunkte auf die Linie
// ihrer Nachbarn, und die Mipmap-Stufe hängt nur vom Abstand ab. So haben Nachbarkacheln an der Naht dieselbe Höhe.
// Instanz (netz.js, INST_F): inst = Seite, u0, v0, Größe; cr = Mitte relativ zur Kamera (Welt), w = 1 bei feinen Kacheln;
// pc = Mitte auf der Kugel (Planetenraum); Ds … Dtt = Taylor-Glieder in Kachelkoordinaten a, b ∈ [−½, ½].
@vertex fn vsPatch(@location(0) g: vec3f, @location(1) inst: vec4f, @location(2) cr: vec4f, @location(3) pc: vec4f,
    @location(4) Ds: vec4f, @location(5) Dt: vec4f, @location(6) Dss: vec4f, @location(7) Dst: vec4f, @location(8) Dtt: vec4f) -> PV {
  // D.w: Gelände-Netz 0 = wie v23 (Mipmap-Stufe je Kachelgröße), 1 = Geomorphing (Versuch v24)
  var uv = inst.yz + g.xy * inst.w;
  var lod = max(log2(U.T.x * inst.w / PATCH_G), 0.0);
  let geo = hook_geomorph(g, inst, uv, lod, D.w, D.y);
  uv = geo.uv;
  lod = geo.lod;
  let M = modelM();
  let skirt = g.z * (0.02 * inst.w + D.z * 0.3);
  var o: PV;
  // Bodennähe: Feindetail und Kartenstufe nach dem ABSTAND ausblenden, nicht nach der Kachelgröße (CDLOD, Strugar 2009: die
  // Näherung muss über den ganzen Datensatz gleich sein, sonst bekommen Nachbarkacheln verschiedener Stufe an der Naht verschiedene
  // Höhen → Stufen). Abstand → größter Punktabstand, den die Teilungsregel (netz.js: teilen unter 1,1·Größe·SPLIT) dort zulässt.
  let fern = 1.5708 / (PATCH_G * 1.1 * D.y);
  // Ort = rtcPunkt(a, b, off, …). Grob: a = Kugelpunkt, b = 0, off = −Kamera
  var d: vec3f;
  var a: vec3f;
  var b = vec3f(0.0);
  var off = -U.cam.xyz;
  if (cr.w > 0.5) {
    // fein: Kugelpunkt aus der Taylor-Entwicklung um die Kachelmitte, alles relativ zur Mitte
    a = taylorOrt(geo.gl - vec2f(0.5), Ds.xyz, Dt.xyz, Dss.xyz, Dst.xyz, Dtt.xyz);
    d = normalize(pc.xyz + a);
    b = pc.xyz;
    off = cr.xyz;
  } else {
    d = faceDir(i32(inst.x), uv);
    a = d;
  }
  let rel0 = M * a + off;                           // Punkt auf der Kugel relativ zur Kamera
  // Abstand zur angehobenen Oberfläche (Kartenhöhe allein reicht dafür), nicht zur Kugel: am Gelände in 4 km Höhe sonst 4 km statt Metern
  let k0 = hook_relief(d, lod, D.z);
  let pixV = select(inst.w * 1.5708 / PATCH_G, length(rtcPunkt(a, b, off, D.x, k0)) * fern, U.Nf.w > 0.5);
  let lodV = select(lod, max(log2(U.T.x * pixV / 1.5708), 0.0), U.Nf.w > 0.5);
  let k = bodenHoehe(d, transpose(M) * rel0, lodV, pixV, D.z) - skirt;
  o.obj = d;
  o.rel = rtcPunkt(a, b, off, D.x, k);
  o.world = o.rel + U.cam.xyz;
  o.pos = U.vpRel * vec4f(o.rel, 1.0);
  return o;
}
`;

// Bodenhöhe genau unter der Kamera (für die Zoom-Grenze): dieselbe Formel wie die Kacheln, alle Oktaven (pixV winzig).
// Ergebnis: Höhe über der Kugel in Radien. Wird auf die CPU zurückgelesen (ein Bild Verzug).
export const SCENE_BODEN = /* wgsl */`
// Zweite Messstelle: der Spielball (U.Bp.xyz, Planetenraum; Bp.w = 1 wenn da). bodenOut[2] = Bodenhöhe dort, bodenOut[3] = 1 wenn dort Wasser
// (Kartenhöhe unter dem Meeresspiegel U.T.z). Nah-Oktaven brauchen q = Kugelpunkt relativ zur Kamera (Planetenraum), wie bei den Kacheln: U.Bq.
@group(2) @binding(0) var<storage, read_write> bodenOut: array<f32, 4>;
@compute @workgroup_size(1) fn csBoden() {
  let d = U.Ne.xyz;
  bodenOut[0] = bodenHoehe(d, vec3f(0.0), 0.0, 1e-12, D.z);
  bodenOut[1] = texDirLod(tHm, d, U.T.x, 0.0).x;
  if (U.Bp.w > 0.5) {
    let b = U.Bp.xyz;
    bodenOut[2] = bodenHoehe(b, transpose(modelM()) * U.Bq.xyz, 0.0, 1e-12, D.z);
    bodenOut[3] = select(0.0, 1.0, texDirLod(tHm, b, U.T.x, 0.0).x - U.T.z < 0.0);
  }
}
`;
