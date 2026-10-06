// Eckpunkt-Stufen der Szene: Kugel (Wolkenschale) und Gelände-Kacheln (Quadtree wie CDLOD, Strugar 2009), Verschiebung und Geomorphing über die Einhängepunkte hook_relief und hook_geomorph.
// Quelle (CREDITS.md): Strugar, CDLOD (2009).
import { PATCH_G } from './patch.js';

export const SCENE_VERTEX = /* wgsl */`
const PATCH_G = ${PATCH_G}.0;
@group(1) @binding(0) var<uniform> D: vec4f;   // Radius, LOD im Vertex-Shader, Relief-Höhe (Verschiebung), Relief-Höhe (für Wolken)
struct PV { @builtin(position) pos: vec4f, @location(0) obj: vec3f, @location(1) world: vec3f }
@vertex fn vsPlanet(@location(0) aPos: vec3f) -> PV {
  let d = normalize(aPos);
  let disp = hook_relief(d, D.y, D.z);
  let p = d * (D.x + disp);
  var o: PV;
  o.obj = d;
  o.world = modelM() * p;
  o.pos = U.vp * vec4f(o.world, 1.0);
  return o;
}

// Gelände-Kacheln (Quadtree wie CDLOD, Strugar 2009): pro Kachel ein Gitter, fein nahe der Kamera.
// Rand-Schürzen (skirt) verdecken die Spalten zwischen Kacheln verschiedener Stufe.
// Geomorphing (Strugar 2009): nahe der Grenze zur gröberen Kachel wandern die ungeraden Gitterpunkte auf die Linie
// ihrer Nachbarn, und die Mipmap-Stufe hängt nur vom Abstand ab. So haben Nachbarkacheln an der Naht dieselbe Höhe.
@vertex fn vsPatch(@location(0) g: vec3f, @location(1) inst: vec4f) -> PV {
  // D.w: Gelände-Netz 0 = wie v23 (Mipmap-Stufe je Kachelgröße), 1 = Geomorphing (Versuch v24)
  var uv = inst.yz + g.xy * inst.w;
  var lod = max(log2(U.T.x * inst.w / PATCH_G), 0.0);
  let geo = hook_geomorph(g, inst, uv, lod, D.w, D.y);
  uv = geo.uv;
  lod = geo.lod;
  let d = faceDir(i32(inst.x), uv);
  let disp = hook_relief(d, lod, D.z);
  let p = d * (D.x + disp - g.z * (0.02 * inst.w + D.z * 0.3));
  var o: PV;
  o.obj = d;
  o.world = modelM() * p;
  o.pos = U.vp * vec4f(o.world, 1.0);
  return o;
}
`;
