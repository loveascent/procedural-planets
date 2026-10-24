import { P, type Block } from '../typen';

// Baustein Vulkane (Io): Gezeitenreibung heizt das Innere, Io hat > 400 aktive Vulkane und ist die vulkanisch aktivste Welt des Sonnensystems.
// Paterae (unregelmäßige Calderen, nicht Berggipfel) mit dunklen Silikatböden, Lavaseen mit glühender Krustenrissen (Voronoi), Lavaströme als helle
// und dunkle Zungen, Ringablagerungen aus Schwefel/SO₂ (roter Ring um Pele: kurzkettiger Schwefel, S₃/S₄) und hohe, nichtvulkanische Berge.
// Farbe: Schwefel in Allotropen von weiß (SO₂-Reif) über gelb zu orange, rot und braun, Silikat schwarz.
// Verfahren: Zellgitter wie bei den Kratern; je Zelle ein Vulkan mit Zufallsradius, Aktivität und Farbpalette.
export const VULKANE: Block = {
  id: 'vulkane', de: 'Vulkane (Paterae, Lavaseen)', en: 'Volcanoes (paterae, lava lakes)', gruppe: 'hitze', an: false,
  note: ['Calderen mit dunklen Böden, glühenden Lavaseen, Strömen, farbigen Ringen aus Schwefel und hohe Berge: Io.', 'Calderas with dark floors, glowing lava lakes, flows, coloured sulphur rings and tall mountains: Io.'],
  par: [
    P('dichte', 'Dichte', 'Density', 0, 1.5, 0.01, 0.8, 'Anteil der Zellen mit einem Vulkan.', 'Fraction of cells with a volcano.'),
    P('gross', 'Größe der Paterae', 'Patera size', 0.02, 0.2, 0.002, 0.07, 'Typischer Radius einer Caldera (Bogenmaß). Loki Patera: 0,034 (~ 60 km Radius bei Io).', 'Typical radius of a caldera (radians). Loki Patera: 0.034 (~60 km radius on Io).'),
    P('tiefe', 'Tiefe', 'Depth', 0, 0.02, 0.0005, 0.0045, 'Absenkung der Caldera-Böden (in Radien).', 'Lowering of the caldera floors (in radii).'),
    P('glut', 'Glut', 'Glow', 0, 12, 0.1, 4, 'Leuchtkraft der aktiven Lavaseen (Kontrast zur Tagseite). In der Dunkelheit sichtbar.', 'Brightness of the active lava lakes (contrast against the day side). Visible in the dark.'),
    P('aktiv', 'Aktivitätsanteil', 'Active fraction', 0, 1, 0.01, 0.4, 'Anteil der Vulkane, die gerade glühen.', 'Fraction of volcanoes glowing right now.'),
    P('strom', 'Lavaströme', 'Lava flows', 0, 1, 0.01, 0.7, 'Länge und Helligkeit der Ströme, die von den Vulkanen ausgehen.', 'Length and brightness of the flows radiating from the volcanoes.'),
    P('ring', 'Ablagerungsringe', 'Deposit rings', 0, 1, 0.01, 0.6, 'Farbige Ringe aus Schwefelablagerungen rund um Calderen (Pele: roter Ring über 1 000 km).', 'Coloured rings of sulphur deposits around calderas (Pele: red ring over 1,000 km).'),
    P('berge', 'Berge', 'Mountains', 0, 0.04, 0.001, 0.012, 'Höhe der nichtvulkanischen Berge (Boösaule Montes: 17 km, höher als der Everest).', 'Height of non-volcanic mountains (Boösaule Montes: 17 km, taller than Everest).'),
    P('schwefel', 'Schwefelfarben', 'Sulphur colours', 0, 1, 0.01, 0.85, 'Wie stark die ganze Oberfläche in Schwefelfarben getönt ist.', 'How strongly the whole surface is tinted in sulphur colours.'),
  ],
  wgsl: /* wgsl */`
struct Vol { c: vec3f, r: f32, act: f32, id: f32, w: f32, hue: f32 }
fn volcano(id: vec3f, f: f32, k: f32) -> Vol {
  let sd = gseed();
  let hv = hash33(id + vec3f(sd * 0.61 + k * 5.0, 3.0, 9.0));
  let ctr = id + 0.5 + (hv.yzx - 0.5) * 0.5;
  var v: Vol;
  let lc = length(ctr);
  v.c = ctr * (f / lc);
  v.w = lc - f;
  v.r = (0.22 + 0.26 * hash13(id * 1.7 + 4.0)) / f;
  v.act = select(0.0, 1.0, hash13(id * 3.3 + 7.0) < $vulkane_aktiv);
  v.id = hash13(id + 21.0);
  v.w = select(9.0, v.w, hv.x < $vulkane_dichte);
  v.hue = hash13(id * 0.7 + 2.0);
  return v;
}
fn vulkanF() -> f32 { return 0.5 / max($vulkane_gross, 0.01) ; }
fn h_vulkane(s: ptr<function, Surf>, d: vec3f, lv: i32) {
  let f = vulkanF();
  let q = d * f;
  let base = floor(q - 0.5);
  var h = (*s).h;
  var floorM = 0.0; var lake = 0.0; var flow = 0.0; var ringM = 0.0; var hue = 0.0; var heat = 0.0;
  var rimH = 0.0;
  for (var c = 0; c < 8; c++) {
    let id = base + vec3f(f32(c & 1), f32((c >> 1) & 1), f32((c >> 2) & 1));
    let v = volcano(id, f, 0.0);
    if (abs(v.w) > 0.45) { continue; }
    let cn = v.c / f;
    let th = angDist(d, cn);
    var x = th / v.r;
    if (x > 6.0) { continue; }
    let tn = tangents(cn);
    let dv = d - cn;
    let ang = atan2(dot(dv, tn[1]), dot(dv, tn[0]));
    // unregelmäßiger Umriss
    x *= 1.0 + 0.28 * snoise(vec3f(cos(ang), sin(ang), v.id * 17.0) * 1.7 + vec3f(v.id * 5.0, 1.0, 0.0));
    let inside = 1.0 - sstep(0.8, 1.0, x);
    floorM = max(floorM, inside);
    h = h * (1.0 - 0.8 * inside) - $vulkane_tiefe * inside * (0.5 + 0.5 * (1.0 - x * x)) + 0.12 * $vulkane_tiefe * exp(-sq2((x - 1.05) / 0.12));
    // Strom: Zunge in zufälliger Richtung
    let fa = v.id * 6.2831 * 3.0;
    let da = ang - fa;
    let along = 0.5 + 0.5 * cos(da);
    let tongue = pow(along, 6.0) * exp(-max(x - 1.0, 0.0) / (1.6 + 4.0 * $vulkane_strom)) * (1.0 - sstep(2.0, 6.0, x)) * sstep(0.9, 1.2, x);
    flow = max(flow, tongue);
    h += 0.04 * $vulkane_tiefe * tongue * snoise(d * 90.0);
    ringM = max(ringM, exp(-sq2((x - 2.6) / 0.9)) * (1.0 - sstep(3.5, 5.5, x)));
    hue = mix(hue, v.hue, inside);
    if (v.act > 0.5 && inside > 0.0) {
      // Lavasee: glühende Rissmuster im Boden
      let cr = vor3(d * f * 5.0 / max(v.r * f, 0.001) * 0.5 + vec3f(v.id * 30.0, 0.0, 0.0));
      let crack = 1.0 - sstep(0.0, 0.14, cr.w);
      let lk = inside * (0.35 + 0.65 * crack) * (0.5 + 0.5 * sstep(-0.2, 0.4, snoise(d * f * 2.0 + v.id * 9.0)));
      heat = max(heat, lk);
    }
  }
  // Berge: seltene, steile Aufwölbungen aus Zellkanten
  if ($vulkane_berge > 0.0) {
    let zn = snoise(d * 1.3 + vec3f(gseed() * 0.17, 9.0, 3.0));
    let mt = sstep(0.4, 0.7, zn) * (1.0 - floorM);
    let rg = ridgeN(d * 5.0 + vec3f(1.0, 2.0, gseed()), 4);
    h += $vulkane_berge * mt * sstep(0.3, 0.9, rg);
  }
  (*s).h = h;
  (*s).aux2 = vec4f(floorM, flow, ringM, hue);
  (*s).heat = heat * $vulkane_glut;
}
fn c_vulkane(s: ptr<function, Surf>, d: vec3f, g: vec3f) {
  let fl = (*s).aux2.x; let fw = (*s).aux2.y; let rg = (*s).aux2.z; let hue = (*s).aux2.w;
  let sd = gseed();
  let n1 = fbmG(d * 5.0 + vec3f(sd * 0.3, 4.0, 1.0), 4, 0.55).x;
  let n2 = snoise(d * 22.0 + vec3f(1.0, sd, 3.0));
  // Schwefelpalette: SO₂-Reif (weiß), Schwefel (gelb), orange, rotbraun
  let wht = vec3f(0.86, 0.85, 0.78);
  let yel = vec3f(0.78, 0.66, 0.15);
  let org = vec3f(0.72, 0.36, 0.08);
  let red = vec3f(0.5, 0.12, 0.06);
  var sul = mix(yel, wht, sstep(0.0, 0.6, n1 + 0.2));
  sul = mix(sul, org, sstep(0.25, 0.7, -n1 + 0.1 * n2));
  sul = mix(sul, red, sstep(0.45, 0.9, snoise(d * 3.1 + vec3f(sd, 5.0, 2.0))) * 0.7);
  var col = mix((*s).col, sul * length((*s).col) * 3.2, $vulkane_schwefel * 0.85);
  // Strom hell/dunkel, Ringe (rot oder weiß je Vulkan), schwarze Böden
  let ringC = mix(vec3f(0.62, 0.09, 0.05), vec3f(0.92, 0.9, 0.86), step(0.5, hue));
  col = mix(col, ringC, clamp(rg * $vulkane_ring * 0.85, 0.0, 1.0));
  col = mix(col, vec3f(0.05, 0.035, 0.03), clamp(fw * 0.55 * $vulkane_strom, 0.0, 1.0));
  col = mix(col, vec3f(0.018, 0.016, 0.015), fl);
  (*s).col = col;
  (*s).gloss = mix((*s).gloss, 0.2, fl);
}
`,
  h: { vulkane: 'h_vulkane' },
  c: 'c_vulkane', corder: 34,
};
