// Darstellung des Gasriesen, Grundlage: Uniform-Layout, Vollbild-Dreieck, Sichtstrahl gegen den abgeplatteten Planeten, Belichtung (ACES nach Narkowicz 2016), Minnaert-Randverdunklung. Alle Zusätze hängen an hook_*.
export const RENDER_BASIS = /* wgsl */`
// Planeten-Darstellung: ein Vollbild-Dreieck, jeder Pixel schneidet seinen Sichtstrahl
// mit dem abgeplatteten Planeten und der Ringebene. Keine Meshes, keine Bilddateien.

struct R {
  invViewProj: mat4x4f,
  camPos: vec4f,
  body0: vec4f, body1: vec4f, body2: vec4f,   // Welt -> Körper (Zeilen)
  sun: vec4f,       // xyz Richtung (Welt), w Intensität
  atmo: vec4f,      // rgb Farbe, w Stärke
  p0: vec4f,        // x Abplattung, y Relief, z Randverdunkelung, w Ansicht
  p1: vec4f,        // x Kartenmodus, y Ring innen, z Ring außen, w Ring-Deckkraft
  p2: vec4f,        // x Seitenverhältnis, y Zeit, z Belichtung, w Farbstoff-Auflösung
  ringColor: vec4f, // rgb, w Ringfaden-Kontrast
  p3: vec4f,        // x Fluss-Skala für Debug-Ansichten, y Pixelwinkel (rad), z Himmelskarte N, w Milchstraße
  p4: vec4f,        // x Sterne, y Mehrstufig: Grobanteil (0 = aus), z Feinanteil, w Pixel-Anpassung
  p5: vec4f,        // x Tiefe aus Physik an/aus, y Stärke, z Quelle (0 Druck, 1 Wirbelstärke), w Gitter
  p6: vec4f,        // x Parallaxe an/aus, y Höhe, z Eigenschatten, w Größe (Mehrstufig)
  p7: vec4f,        // x Dämmerung (0 wie v0.4, 1 aus, 2 weich), y Randschimmer (0 wie v0.4, 1 weich, 2 aus)
};

@group(0) @binding(0) var<uniform> U: R;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var dyeTex: texture_cube<f32>;
@group(0) @binding(3) var velTex: texture_cube<f32>;
@group(0) @binding(4) var auxTex: texture_cube<f32>;
@group(0) @binding(5) var prsTex: texture_cube<f32>;
@group(0) @binding(6) var skyTex: texture_2d_array<f32>;   // gemeinsamer Himmel (src/sky)

const PI = 3.14159265359;

struct VOut { @builtin(position) pos: vec4f, @location(0) ndc: vec2f };

@vertex
fn vs(@builtin(vertex_index) i: u32) -> VOut {
  let xy = vec2f(f32((i << 1u) & 2u), f32(i & 2u)) * 2.0 - 1.0;
  var o: VOut;
  o.pos = vec4f(xy, 0.0, 1.0);
  o.ndc = xy;
  return o;
}

fn toBody(v: vec3f) -> vec3f { return vec3f(dot(U.body0.xyz, v), dot(U.body1.xyz, v), dot(U.body2.xyz, v)); }

fn hash21(p: vec2f) -> f32 {
  var q = fract(p * vec2f(123.34, 456.21));
  q += dot(q, q + 45.32);
  return fract(q.x * q.y);
}

fn tangentBasis(p: vec3f) -> mat2x3f {
  let helper = select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), abs(p.y) < 0.9);
  let e1 = normalize(cross(helper, p));
  return mat2x3f(e1, cross(p, e1));
}

fn east(p: vec3f) -> vec3f {
  let e = cross(vec3f(0.0, 1.0, 0.0), p);
  let l = length(e);
  return select(vec3f(1.0, 0.0, 0.0), e / l, l > 1e-5);
}

// Ellipsoid x² + (y/c)² + z² = 1 mit c = 1 − Abplattung. Rückgabe: t oder −1.
fn hitPlanet(o: vec3f, d: vec3f) -> f32 {
  let c = 1.0 - U.p0.x;
  let s = vec3f(1.0, 1.0 / c, 1.0);
  let os = o * s; let ds = d * s;
  let a = dot(ds, ds);
  let b = dot(os, ds);
  let k = dot(os, os) - 1.0;
  let disc = b * b - a * k;
  if (disc < 0.0) { return -1.0; }
  let t = (-b - sqrt(disc)) / a;
  return select(-1.0, t, t > 0.0);
}

fn aces(x: vec3f) -> vec3f {
  let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3f(0.0), vec3f(1.0));
}
fn luminance(c: vec3f) -> f32 { return dot(c, vec3f(0.3, 0.59, 0.11)); }
fn lumAt(q: vec3f) -> f32 { return luminance(textureSampleLevel(dyeTex, samp, q, 0.0).rgb); }

@fragment
fn fs(vin: VOut) -> @location(0) vec4f {
  let mode = i32(U.p0.w);

  // Kartenansicht: flache Weltkarte (equirektangulär) des ganzen Planeten.
  if (U.p1.x > 0.5) { return hook_karte(vin.ndc, mode); }

  let wp = U.invViewProj * vec4f(vin.ndc, 1.0, 1.0);
  let dir = normalize(wp.xyz / wp.w - U.camPos.xyz);
  let o = toBody(U.camPos.xyz);
  let d = toBody(dir);
  let sun = normalize(toBody(U.sun.xyz));
  let c = 1.0 - U.p0.x;

  var col = hook_himmel(dir);
  var tPlanet = hitPlanet(o, d);

  // Atmosphärensaum außerhalb der Planetenscheibe.
  if (tPlanet < 0.0) {
    col = hook_saum_aussen(col, o, d, sun, c);
  } else {
    let hp = o + d * tPlanet;
    let hs = hp * vec3f(1.0, 1.0 / c, 1.0);
    let q0 = normalize(hs);
    var n = normalize(hp * vec3f(1.0, 1.0 / (c * c), 1.0));

    // Modul Parallaxe: Sichtstrahl in die Höhenkarte hinein verfolgen (Parallax Occlusion Mapping, Tatarchuk 2006)
    let pom = hook_parallaxe(q0, d, n, sun, mode);
    let q = pom.q;
    let pomShadow = pom.schatten;
    var albedo = surface(q, mode);
    if (mode == 0) {
      // Modul Tiefe aus der Physik: Normale nach dem Gefälle von Druck bzw. ζ/f
      n = hook_tiefe(q, n);
      // Relief aus der Helligkeit, einfach oder mehrstufig
      n = hook_relief(q, d, n, tPlanet);
      let v = -d;
      let ndl = dot(n, sun);
      let ndv = max(dot(n, v), 1e-3);
      let k = U.p0.z;
      // Minnaert-Randverdunkelung, k = 1 ist Lambert.
      var light = pow(max(ndl, 0.0), k) * pow(ndv, k - 1.0);
      light *= pomShadow;
      // Dämmerungssaum (Modul „Dämmerung“; 0 = wie v0.4)
      light = hook_daemmerung(light, ndl);
      // Schatten der Ringe auf dem Planeten
      light = hook_ringschatten(light, hp, sun);
      // Modul „Randschimmer“
      let rim = hook_randschimmer(ndv, ndl);
      col = albedo * light * U.sun.w + U.atmo.rgb * rim * U.sun.w;
    } else {
      col = albedo;
    }
  }

  // Ringe: vor dem Planeten drübermischen, dahinter verdeckt.
  col = hook_ringe(col, o, d, sun, tPlanet, mode);

  var outc = col;
  if (mode == 0) { outc = aces(col * U.p2.z); }
  return hook_ausgabe(pow(outc, vec3f(1.0 / 2.2)), tPlanet >= 0.0);
}
`;
