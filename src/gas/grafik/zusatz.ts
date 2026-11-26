// Zusätze am Darstellungs-Shader des Gasriesen. Jeder wird nur eingesetzt, wenn sein Schalter an ist; sonst bleibt der
// Shadertext Zeichen für Zeichen wie ohne Grafik-Optionen. Eingesetzt wird per Textersatz an festen Stellen.

export interface Zusatz {
  zwischen: boolean;       // Zwischenwerte zwischen zwei Simulationsschritten schätzen
  muster: 'off' | 'checker' | 'lines';
  rausch: boolean;         // halbe Strahlschritte mit wechselndem Versatz (Argh, Parallaxe), braucht TAA/TAAU
  himmel: boolean;         // Himmel zwischenspeichern
  format: GPUTextureFormat;
  proben: number;          // 4 = MSAA
}

function ersetze(code: string, alt: string, neu: string): string {
  if (!code.includes(alt)) throw new Error(`Grafik-Zusatz: Stelle fehlt: ${alt}`);
  return code.replace(alt, neu);
}

// Semi-Lagrange (Stam 1999): Der Inhalt, der τ Sekunden nach dem letzten Schritt an q liegt, kam von q − v(q)·τ.
// Einmal je Pixel, alle folgenden Abtastungen (Farbe, Relief) benutzen die verschobene Stelle. U.p7.z = τ.
const ZWISCHEN = /* wgsl */`
fn zwischenQ(q: vec3f) -> vec3f { return normalize(q - textureSampleLevel(velTex, samp, q, 0.0).xyz * U.p7.z); }
`;

// Interleaved Gradient Noise (Jimenez 2014), je Bild um 5,588238 Pixel weitergeschoben (Jimenez 2016). U.p7.y = Bildzähler.
const RAUSCH = /* wgsl */`
var<private> gRausch: f32 = 0.0;
fn rauschen(p: vec2f) -> f32 { let q = p + 5.588238 * (U.p7.y % 64.0); return fract(52.9829189 * fract(dot(q, vec2f(0.06711056, 0.00583715)))); }
`;

// Schachbrett/Zeilensprung: das Ziel ist halb so breit bzw. hoch; jeder Pixel rechnet die Stelle eines Vollbild-Pixels.
// U.p7.w = 2/Vollbreite (bzw. Vollhöhe), Vorzeichen = Phase.
const MUSTER = {
  checker: 'let phase = select(1u, 0u, U.p7.w > 0.0); let o = f32((u32(vin.pos.y) + phase) & 1u); v.ndc.x = (2.0 * floor(vin.pos.x) + o + 0.5) * abs(U.p7.w) - 1.0;',
  lines: 'let o = select(1.0, 0.0, U.p7.w > 0.0); v.ndc.y = 1.0 - (2.0 * floor(vin.pos.y) + o + 0.5) * abs(U.p7.w);',
};

const HIMMEL_CACHE = /* wgsl */`
var<private> gPix: vec2i;
@group(0) @binding(7) var himmelBild: texture_2d<f32>;
fn hook_himmel(dir: vec3f) -> vec3f { return textureLoad(himmelBild, gPix, 0).rgb; }
@fragment fn fsHimmel(vin: VOut) -> @location(0) vec4f {
  let wp = U.invViewProj * vec4f(vin.ndc, 1.0, 1.0);
  return vec4f(himmelEcht(normalize(wp.xyz / wp.w - U.camPos.xyz)), 1.0);
}
`;

export function mitZusatz(code0: string, z: Zusatz): string {
  let code = code0;
  if (z.zwischen) code = ersetze(code, 'let q = pom.q;', 'let q = zwischenQ(pom.q);') + ZWISCHEN;
  if (z.rausch) {
    if (code.includes('let N = 48;')) {   // Argh-Volumen: Suche 48 → 24, Schatten 24 → 12 Schritte
      code = ersetze(code, 'let N = 48;', 'let N = 24;');
      code = ersetze(code, 'let t = tPlanet + h * f32(i);', 'let t = tPlanet + h * (f32(i) - gRausch);');
      code = ersetze(code, 'let h2 = te / 24.0;', 'let h2 = te / 12.0;');
      code = ersetze(code, 'for (var j = 0; j < 24; j++) { tau += arghDicht((p + sun * (h2 * (f32(j) + 0.5))) * s)', 'for (var j = 0; j < 12; j++) { tau += arghDicht((p + sun * (h2 * (f32(j) + gRausch))) * s)');
    }
    if (code.includes('fn pomHeight')) {  // Parallaxe: Sichtstrahl 24 → 12, Schatten 12 → 6 Schritte
      code = ersetze(code, 'for (var i = 1; i <= 24; i++) {\n      let rd = H * f32(i) / 24.0;', 'for (var i = 1; i <= 12; i++) {\n      let rd = H * (f32(i) - gRausch) / 12.0;');
      code = ersetze(code, 'for (var j = 1; j <= 12; j++) {\n          let t = maxT * f32(j) / 12.0;', 'for (var j = 1; j <= 6; j++) {\n          let t = maxT * (f32(j) - gRausch) / 6.0;');
    }
    code += RAUSCH;
  }
  if (z.himmel) {
    if (code.includes('fn hook_himmel(dir: vec3f) -> vec3f { return skyColor')) {
      code = ersetze(code, 'fn hook_himmel(dir: vec3f) -> vec3f { return skyColor', 'fn himmelEcht(dir: vec3f) -> vec3f { return skyColor') + HIMMEL_CACHE;
    }
  }
  const cache = z.himmel && code.includes('fn fsHimmel');
  if (z.muster !== 'off' || z.rausch || cache) {
    code = ersetze(code, '@fragment\nfn fs(vin: VOut) -> @location(0) vec4f {', 'fn fsKern(vin: VOut) -> vec4f {');
    code += `
@fragment fn fs(vin: VOut) -> @location(0) vec4f {
  var v = vin;
  ${cache ? 'gPix = vec2i(vin.pos.xy);' : ''}
  ${z.rausch ? 'gRausch = rauschen(vin.pos.xy);' : ''}
  ${z.muster === 'off' ? '' : MUSTER[z.muster]}
  return fsKern(v);
}
`;
  }
  return code;
}
