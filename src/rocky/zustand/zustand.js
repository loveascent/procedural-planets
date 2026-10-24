// Zustand und Voreinstellungen des Gesteinsplaneten: alle Regler-Werte (S), ihre Standardwerte (DEF), Auflösungen aus der Adresse.
// Liest Adresse (?seed=, ?style= …, #Seed) und Bewegungs-Einstellung; keine GPU, keine Menü-Kenntnis.
export function createZustand(Q, coarse) {
  const randomSeed = () => String(Math.floor(10000000 + Math.random() * 89999999));
  const hashSeed = /^#?(\d{3,12})$/.exec(location.hash);
  const MSAA_Q = Number(new URLSearchParams(location.search).get('msaa')) === 4 ? 4 : 1;
  const S = {
    seed: Q.get('seed') || (hashSeed ? hashSeed[1] : randomSeed()),
    style: Q.get('style') === 'orig' ? 'orig' : 'plus',
    res: Number(Q.get('res')) || (coarse ? 1024 : 2048),
    palette: Q.get('palette') === 'cd' ? 'cd' : 'earth',
    sea: -1,                                   // -1 = Wert des Planeten (aus dem Seed)
    // Original (Material/Lighting wie im three.js-Vorbild)
    nscale: 1.0, rough: 0.8, metal: 0.5, sunI: 1.6, ambient: 0.22, glow: 0.6, cloudOpO: 0.6,
    // Verbessert
    waves: 1.0, clarity: 1.0, foam: 0.7,
    bump: 1.5, relief: 0.018, erosion: 1.0, terrace: 0.0, detail: 1.0, shadows: 1.0,
    gloss: 0.75, exposure: 1.0, ambientP: 0.35,
    cloudOp: 1.0, cloudH: 0.012, wind: 1.0, cloudShadow: 0.8,
    atmo: 1.0, thick: 2.5, haze: 1.0, bloom: 0.6,
    // gemeinsam
    sunAz: -58, sunEl: 12, cover: 0.5,
    nebula: 1.0, stars: 1.0, flare: 0.5,
    mwWidth: 1.0, mwCore: 1.0, mwDust: 1.0, mwHii: 1.0,
    rotate: true, spin: 1.2, spinZoom: 1.0, volcanoes: 0.15, volcanoOn: true, volcanoType: 0, rivers: 3, riverAmount: 1, mesh: 0, craterFill: 1,
    profile: 'full', modWaves: true, modClouds: true, modShadows: true, modAtmo: true, modRim: false, rimStr: 0.35, modBloom: true, modFlare: true, modWaterBody: true, modIce: true, modCavity: true, modSun: true, modMountains: true, tilt: 23, fov: 36,
    view: 0, quality: -1, msaa: MSAA_Q,
    moon: Q.get('body') === 'moon' ? 1 : 0,
  };
  // Mond: derselbe Motor wie der Gesteinsplanet, aber ohne Meer, Luft, Wolken und Flüsse; die Vulkanformel ist durch die Kraterformel ersetzt (shader/krater.js)
  if (S.moon) Object.assign(S, { sea: 0, modClouds: false, modAtmo: false, modWaves: false, modWaterBody: false, modIce: false, modRim: false, rivers: 0, erosion: 0, foam: 0,
    volcanoOn: true, volcanoType: 2, craterFill: 0, volcanoes: 0.5, cover: 0, spin: 0.15, sunEl: 10 });
  // Wer reduzierte Bewegung eingestellt hat, bekommt einen stehenden Planeten (Drehen lässt sich einschalten)
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) S.rotate = false;
  const DEF = { ...S };
  const numQ = (k) => { const v = Q.get(k); if (v !== null && v !== '' && !isNaN(Number(v)) && k in S) S[k] = Number(v); };
  for (const k of Object.keys(S)) if (typeof S[k] === 'number' && k !== 'res') numQ(k);
  const cloudRes = Number(Q.get('cres')) || (coarse ? 512 : 2048);
  const nebRes = Number(Q.get('nres')) || (coarse ? 512 : 2048);
  return { S, DEF, randomSeed, cloudRes, nebRes };
}
