import { P, type Block } from '../typen';

// Baustein Maria: Basaltflutung. Dünne Basalt-Lava (niedrige Viskosität) füllt Becken bis zu einer Pegelhöhe, überall in der Tieflandzone.
// h' = max(h, Pegel) in der Zone; was höher liegt (Kraterränder, Berge) schaut als Insel oder „Geisterring“ heraus. Die Oberfläche ist dunkel
// (Eisen/Titan, Albedo ~0,07 gegen 0,15 im Hochland), flach, mit Runzelrücken (Kompressionsfalten über versunkenen Beckenringen).
export const MARIA: Block = {
  id: 'maria', de: 'Maria (Lavaebenen)', en: 'Maria (lava plains)', gruppe: 'relief', an: true,
  note: ['Dunkle, flache Basaltebenen füllen die tiefen Becken; Kraterränder ragen als Geisterringe heraus.', 'Dark, flat basalt plains fill the deep basins; crater rims poke out as ghost rings.'],
  par: [
    P('anteil', 'Anteil', 'Coverage', 0, 1, 0.01, 0.45, 'Wie weit die Flutungszone reicht (Anteil des Tieflandpotenzials). Erdmond: Vorderseite ~31 %, gesamt ~16 %.', 'How far the flood zone reaches (share of the lowland potential). Moon: near side ~31 %, total ~16 %.'),
    P('pegel', 'Pegelhöhe', 'Flood level', -0.03, 0.03, 0.0005, 0.003, 'Höhe, bis zu der die Lava steigt (in Radien). Höher = mehr Becken und Kraterböden werden bedeckt.', 'Height up to which the lava rises (in radii). Higher = more basins and crater floors get covered.'),
    P('rand', 'Randschärfe', 'Edge sharpness', 0.02, 1, 0.01, 0.25, 'Wie scharf die Zone endet. Klein = scharfer Rand, groß = diffuser Übergang.', 'How sharply the zone ends. Small = sharp edge, large = diffuse transition.'),
    P('dunkel', 'Dunkelheit', 'Darkness', 0.2, 1, 0.01, 0.5, 'Albedo-Faktor der Basaltflächen (1 = wie Hochland). Eisenreiche Laven sind dunkel.', 'Albedo factor of the basalt plains (1 = like highlands). Iron-rich lavas are dark.'),
    P('blau', 'Titan-Tönung', 'Titanium tint', 0, 1, 0.01, 0.45, 'Variation zwischen bläulichem (titanreich) und rötlich-braunem (titanarmem) Basalt wie in Mondkarten der Sonde LRO.', 'Variation between bluish (titanium-rich) and reddish-brown (titanium-poor) basalt as in LRO moon maps.'),
    P('falten', 'Runzelrücken', 'Wrinkle ridges', 0, 0.01, 0.0001, 0.0015, 'Höhe der Falten in den Maria (in Radien): langgestreckte Rücken über verschütteten Beckenringen, durch Abkühlung und Last entstanden.', 'Height of the folds in the maria (in radii): elongated ridges over buried basin rings, formed by cooling and loading.'),
    P('glatt', 'Glättung der Ebene', 'Plain smoothing', 0, 1, 0.01, 0.85, 'Wie flach die Lavaoberfläche ist. 1 = fast eben, 0 = das alte Relief schimmert durch.', 'How flat the lava surface is. 1 = almost level, 0 = the old relief shows through.'),
  ],
  wgsl: /* wgsl */`
fn h_maria(s: ptr<function, Surf>, d: vec3f, lv: i32) {
  let thr = 1.0 - $maria_anteil;
  let zone = sstep(thr - 0.02 - 0.2 * $maria_rand, thr + 0.02 + 0.2 * $maria_rand, (*s).low);
  let hf = $maria_pegel;
  let h0 = (*s).h - (*s).form;
  // „below“: 1 dort, wo das alte Relief unter dem Lavapegel liegt (weicher Rand von 0,0008 Radien = ~1,4 km beim Mond)
  let below = sstep(hf + 0.0004, hf - 0.0004, h0);
  let flooded = zone * below;
  let flat = hf + (h0 - hf) * (1.0 - $maria_glatt) + 0.0003 * snoise(d * 9.0 + gseed());
  var h = mix(h0, flat, flooded);
  (*s).mare = flooded;
  // Runzelrücken: Linien am Nulldurchgang eines verzerrten Rauschfelds
  if ($maria_falten > 0.0 && flooded > 0.0) {
    let n = snoise(d * 6.5 + vec3f(gseed() * 0.3, 1.0, 4.0) + 0.35 * vec3f(snoise(d * 17.0), snoise(d * 17.0 + 5.0), snoise(d * 17.0 + 9.0)));
    let rr = exp(-sq2(n / 0.07)) * (0.6 + 0.4 * snoise(d * 31.0));
    h += $maria_falten * rr * flooded;
  }
  (*s).h = h + (*s).form;
}
fn c_maria(s: ptr<function, Surf>, d: vec3f, g: vec3f) {
  let m = (*s).mare;
  if (m <= 0.0) { return; }
  let tv = fbmG(d * 4.0 + vec3f(gseed() * 0.11, 2.0, 7.0), 4, 0.55).x;
  let hue = mix(vec3f(1.0, 0.92, 0.78), vec3f(0.82, 0.92, 1.08), clamp(0.5 + 0.9 * tv * $maria_blau * 1.5, 0.0, 1.0));
  let dk = mix(1.0, $maria_dunkel, m);
  (*s).col = mix((*s).col, (*s).col * hue, m * $maria_blau) * dk;
  (*s).rough = mix((*s).rough, 0.45, m);
}
`,
  h: { maria: 'h_maria' },
  c: 'c_maria', corder: 10,
};
