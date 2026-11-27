// Alle Grafik-Regler des Gasriesen, alte und neue, in vier aufeinanderfolgenden Abschnitten:
// Auflösung und Bildrate · Kantenglättung und Hochskalieren · Simulation (Rechenaufwand) · Zwischenspeicher. Neue Verfahren: Standard aus.
// Verfahren, die sich ausschließen, blenden sich gegenseitig aus (grafikSichtbar, gleiche Regeln wie wahl() in grafik/pfad.ts).
import type { App } from '../app';
import type { Panel } from '../../ui';
import type { MenueKontext } from './kontext';
import { t } from '../../i18n';
import { ketteRegler, ketteSichtbar, deckelRegler } from '../../grafik/menue';
import { wahl } from '../grafik/pfad';

export function abschnittGrafik(p: Panel, k: MenueKontext): Panel {
  const { app, fx, f2, n, lim } = k;
  const aus: [string, string] = ['off', t('Aus', 'Off')];
  const neben = !app.kopflos;   // in der Welt eingebettet legt die Welt Bildkette und Bildrate fest; hier bleiben Auflösung und Rechenaufwand

  p.section(t('Grafik: Auflösung und Bildrate', 'Graphics: resolution and frame rate'),
    t('Wie viele Pixel und Bilder je Sekunde gerechnet werden. Neue Verfahren stehen auf Aus = Bild wie ohne sie. NVIDIA DLSS/DLAA, Intel XeSS, Apple MetalFX und AMD FSR 2/3 selbst gibt es im Browser nicht.',
      'How many pixels and frames per second are rendered. New methods default to off = image as without them. NVIDIA DLSS/DLAA, Intel XeSS, Apple MetalFX and AMD FSR 2/3 themselves are not available in the browser.'), true)
    .select('quality', t('Gerät (Startwerte)', 'Device (start values)'), [
      ['phone', t('Smartphone', 'Smartphone')],
      ['standard', t('Laptop / integrierte GPU', 'Laptop / integrated GPU')],
      ['high', t('Desktop-GPU', 'Desktop GPU')],
      ['ultra', t('High-End-GPU (z. B. RTX 4080/5080)', 'High-end GPU (e.g. RTX 4080/5080)')],
      ['welt', t('Welt (eingebettet, klein)', 'World (embedded, small)')],
      ['phone04', t('Smartphone (alte Werte v0.4)', 'Smartphone (old v0.4 values)')],
      ['high04', t('Desktop-GPU (alte Werte v0.4)', 'Desktop GPU (old v0.4 values)')],
      ['ultra04', t('High-End-GPU (alte Werte v0.4)', 'High-end GPU (old v0.4 values)')],
    ],
      t('Setzt Startwerte für Gitter, Farbauflösung, Partikelzahl und Render-Auflösung. Die Regler selbst gehen immer bis zum Maximum (32 Mio. Partikel, 2048² Farbe, 384² Gitter), egal welches Gerät gewählt ist.',
        'Sets starting values for grid, colour resolution, particle count and render resolution. The controls always go to the maximum (32 M particles, 2048² colour, 384² grid), whatever device is chosen.'))
    .range('pixelDensity', t('Render-Auflösung', 'Render resolution'), 0.5, 4, 0.05,
      t('Pixel pro Bildschirmpunkt. 1 = Bildschirmauflösung, 2–3 = Supersampling: deutlich schärfere Kanten und Filamente, kostet quadratisch mehr GPU. Für eine RTX 4080/5080 ruhig 2 bis 3.',
        'Pixels per screen point. 1 = screen resolution, 2–3 = supersampling: much sharper edges and filaments, costs quadratically more GPU. On an RTX 4080/5080 use 2 to 3.'), (v) => `${v.toFixed(2)}×`)
    .toggle('autoQuality', t('60 fps halten', 'Hold 60 fps'),
      t('Misst beim Start, wie schnell deine Grafikkarte einen Simulationsschritt rechnet. Ist er zu langsam, wird zuerst die Farbpflege verteilt (Sim: Farbpflege seltener → jeden 8. Schritt), danach die Simulations-Auflösung gesenkt. Danach passt sich die Render-Auflösung laufend an, damit die Bildrate über 58 fps bleibt.',
        'Measures at start how fast your GPU computes a simulation step. If too slow, colour upkeep is spread first (Sim: colour upkeep less often → every 8th step), then the simulation resolution is lowered. Afterwards the render resolution adapts continuously to keep the frame rate above 58 fps.'));
  if (neben) {
    deckelRegler(p)
    .select('fxTarget', t('Bildrate: Ziel der Automatik', 'Frame rate: automation target'), [['60', '60 fps'], ['90', '90 fps'], ['120', '120 fps'], ['144', '144 fps'], ['240', '240 fps']],
      t('Ziel von „60 fps halten“ (gleicher Abschnitt): darunter wird die Render-Auflösung verkleinert. 60 = wie bisher.', 'Target of “Hold 60 fps” (same section): below it the render resolution shrinks. 60 = as before.'))
    .toggle('fxDynIntern', t('Bildrate: Automatik nur intern', 'Frame rate: automate internal scale only'), t('Die Automatik verkleinert nicht die Leinwand (Browser skaliert), sondern die interne Renderskala; hochgerechnet wird mit dem gewählten Verfahren.', 'The automation shrinks the internal render scale instead of the canvas; upscaling uses the chosen method.'))
    .toggle('fxIdle', t('Bildrate: bei Stillstand nicht zeichnen', 'Frame rate: do not redraw when still'), t('Pause und nichts ändert sich: das Bild bleibt stehen, ohne neu gerechnet zu werden. Fenster ohne Fokus: höchstens 10 fps. Verdeckte Tabs hält der Browser ohnehin an.', 'Paused and nothing changes: the image stays without being redrawn. Unfocused window: at most 10 fps. Hidden tabs are paused by the browser anyway.'))
    .select('fxGen', t('Bildrate: Zwischenbilder', 'Frame rate: generated frames'), [aus, ['extra', t('Extrapolation (ohne Verzögerung)', 'Extrapolation (no added delay)')], ['inter', t('Interpolation (+1 echtes Bild Verzögerung)', 'Interpolation (+1 real frame delay)')]],
      t('Rechnet nur jedes 2.–4. Bild voll; dazwischen wird das letzte echte Bild mit Drehung, Kamera und Wind verschoben. Die Anzeige bleibt beim Bildschirmtakt, die Grafikkarte rechnet weniger. Extrapolation sagt voraus (Fehler am Rand), Interpolation mischt zwei echte Bilder und hinkt um ein echtes Bild nach.', 'Renders only every 2nd–4th frame fully; in between the last real frame is warped by spin, camera and wind. Display rate stays, the GPU works less. Extrapolation predicts (errors at the limb), interpolation blends two real frames and lags by one real frame.'))
    .select('fxGenN', t('Bildrate: Zwischenbilder-Verhältnis', 'Frame rate: generation ratio'), [['2', t('jedes 2. Bild echt', 'every 2nd frame real')], ['3', t('jedes 3. Bild echt', 'every 3rd frame real')], ['4', t('jedes 4. Bild echt', 'every 4th frame real')]],
      t('Wie viele angezeigte Bilder auf ein echt gerechnetes kommen.', 'How many displayed frames per really rendered one.'))
    .select('fxPattern', t('Bildrate: halbe Pixel je Bild', 'Frame rate: half the pixels per frame'), [aus, ['checker', t('Schachbrett', 'Checkerboard')], ['lines', t('Zeilensprung', 'Interlaced')]],
      t('Rechnet je Bild nur jedes zweite Pixel (Schachbrett oder Zeilen), abwechselnd. Der Rest kommt rückprojiziert aus dem vorigen Bild. Steht alles still, ist das Ergebnis wie voll gerechnet; in Bewegung leichtes Flimmern an feinen Kanten.', 'Shades every second pixel per frame (checkerboard or lines), alternating. The rest is reprojected from the previous frame. Static images match full rendering; in motion fine edges may shimmer.'))
    .toggle('fxFovea', t('Fovea: scharfe Bildmitte', 'Fovea: sharp centre'), t('Festes „Foveated Rendering“ ohne Blickverfolgung: die Mitte wird voll gerechnet, der Rand gröber. Lohnt nur, wenn der Planet größer als der scharfe Kreis ist; sonst kostet es eher.', 'Fixed foveated rendering without eye tracking: full resolution in the centre, coarser outside. Only pays off when the planet is larger than the sharp circle; otherwise it costs.'))
    .range('fxFoveaRadius', t('Fovea: Radius', 'Fovea: radius'), 0.2, 1, 0.05, t('Radius der scharfen Mitte in halben Bildhöhen.', 'Radius of the sharp centre in half image heights.'), f2)
    .range('fxFoveaScale', t('Fovea: Rand-Auflösung', 'Fovea: outer resolution'), 0.25, 0.9, 0.05, t('Renderskala außerhalb des scharfen Kreises.', 'Render scale outside the sharp circle.'), (v) => `${Math.round(v * 100)} %`);

    p.section(t('Grafik: Kantenglättung und Hochskalieren', 'Graphics: anti-aliasing and upscaling'),
      t('Glättung, Schärfen und Hochrechnen des fertigen Bildes. Was sich nicht verträgt, blendet sich aus.', 'Smoothing, sharpening and upscaling of the finished image. Options that conflict hide each other.'), false);
    ketteRegler(p, {
      deckel: false,
      up: [['taau', t('Zeitlich (TAAU, ohne KI)', 'Temporal (TAAU, no AI)')]],
      aa: [['msaa', t('MSAA 4× (hier ohne Wirkung)', 'MSAA 4× (no effect here)')], ['taa', t('Zeitlich (TAA, ohne KI)', 'Temporal (TAA, no AI)')]],
      dither: true,
    })
    .toggle('fxF16', t('Hochskalieren: shader-f16', 'Upscaling: shader-f16'), t('Rechnet den kantenadaptiven Filter mit 16-Bit-Gleitkomma. Auf einer RTX 5080 kein Gewinn (eher minimal langsamer); auf Handys nicht gemessen.', 'Runs the edge-adaptive filter in 16-bit floats. No gain on an RTX 5080 (marginally slower); not measured on phones.'))
    .range('fxAlpha', t('Zeitlich: Anteil des neuen Bildes', 'Temporal: new frame share'), 0.02, 0.5, 0.01,
      t('Mit TAA/TAAU: wie viel das neue Bild zum gesammelten beiträgt. Klein = glatter und ruhiger, aber träger (Schlieren); groß = frischer, aber unruhiger.', 'TAA/TAAU: how much each new frame adds to the history. Small = smoother but laggier (smearing); large = fresher but noisier.')
      + fx(t('Bild = mix(Verlauf (rückprojiziert, auf μ ± σ gekappt), neu, α)', 'image = mix(history (reprojected, clipped to μ ± σ), new, α)')), f2)
    .toggle('fxDitherSteps', t('Zeitlich: halbe Strahlschritte (Argh, Parallaxe)', 'Temporal: half ray steps (Argh, parallax)'),
      t('Argh-Volumen und Parallaxe laufen mit halb so vielen Schritten und wechselndem Versatz; die zeitliche Glättung mittelt das Rauschen. Spürbar schneller beim Argh-Volumen. Im Stillstand glatt, in Bewegung beim Argh-Volumen ein sichtbares Punkt-Korn.', 'Argh volume and parallax use half the steps with a changing offset; temporal AA averages the noise. Noticeably faster for the Argh volume. Smooth when still, visible dot grain on the Argh volume in motion.'));
  }

  p.section(t('Grafik: Simulation (Rechenaufwand)', 'Graphics: simulation (compute cost)'),
    t('Auflösung und Takt der Strömungsrechnung. Feiner kostet Rechenleistung; die „Sim:“-Verfahren sparen sie, ändern aber teils das Aussehen.', 'Resolution and rate of the flow computation. Finer costs GPU time; the “Sim:” methods save it but partly change the look.'), false)
    .range('dyeRes', t('Farbauflösung', 'Colour resolution'), 128, lim.dyeRes, 64,
      t('Auflösung der Wolkentextur je Würfelfläche. Bestimmt die Schärfe beim Heranzoomen. Kosten wachsen mit N².', 'Cloud texture resolution per cube face. Sets sharpness when zooming in. Cost grows with N².'), (v) => `${v}²`)
    .range('velRes', t('Gitter je Würfelfläche', 'Grid per cube face'), 32, lim.velRes, 16,
      t('Auflösung des Windgitters: 6 × N × N Zellen auf der Kugel. Kosten wachsen mit N².', 'Wind grid resolution: 6 × N × N cells on the sphere. Cost grows with N².'), (v) => `${v}²`)
    .range('curlRes', t('Feinheit Strömungsfeld', 'Flow field resolution'), 64, lim.curlRes, 64,
      t('Auflösung des Strömungsfelds je Würfelfläche. Gaseous Giganticus nutzt 2048. Feiner = feinere Filamente.',
        'Flow field resolution per cube face. Gaseous Giganticus uses 2048. Finer = finer filaments.'), (v) => `${v}²`)
    .range('particles', t('Partikel-Anzahl', 'Particle count'), 16384, lim.particles, 16384,
      t('Anzahl der Partikel. jasper-r: 4 Mio. bei 80 fps. Handys schaffen etwa 0,25 bis 1 Mio., eine RTX 5080 deutlich über 16 Mio. Obergrenze je nach „Gerät“.',
        'Number of particles. jasper-r: 4 M at 80 fps. Phones manage about 0.25 to 1 M, an RTX 5080 well over 16 M. Upper limit depends on “Device”.'), n)
    .range('iterations', t('Druck-Iterationen', 'Pressure iterations'), 2, 200, 1,
      t('Jacobi-Schritte für die Druckgleichung. Mehr = sauberer divergenzfrei, aber teurer. Der wichtigste Leistungsregler.',
        'Jacobi steps for the pressure equation. More = closer to divergence-free, but slower. The most important performance control.') + fx('∇²p = ∇·u,  u ← u − ∇p'))
    .toggle('bfecc', t('BFECC-Advektion', 'BFECC advection'),
      t('Fehlerkorrektur beim Mitführen: vor, zurück, halben Fehler abziehen. Schärfere Wirbel und Kanten.',
        'Error correction during transport: back, forth, subtract half the error. Sharper vortices and edges.') + fx('x̃ = x − ½(back(forth(x)) − x)'))
    .select('fxSimRate', t('Sim: Rechentakt', 'Sim: step rate'), [['60', t('Aus (60 Schritte/s)', 'Off (60 steps/s)')], ['30', '30/s'], ['20', '20/s']],
      t('Rechnet die Strömung seltener mit größerem Zeitschritt: gleiches Tempo, 2–3× weniger Rechenzeit der Simulation. ACHTUNG, das Aussehen ändert sich sichtbar: Die Farbe wird seltener neu abgetastet und verschmiert weniger, nach einiger Zeit entstehen deutlich mehr feine Wirbel. Ohne „Zwischenwerte schätzen“ ruckelt die Bewegung.', 'Computes the flow less often with a larger time step: same speed, 2–3× less simulation time. NOTE the look changes visibly: the colour is resampled less often and smears less, so after a while there are clearly more small vortices. Without in-between values the motion stutters.'))
    .toggle('fxSimInterp', t('Sim: Zwischenwerte schätzen', 'Sim: estimate in-between values'), t('Zwischen zwei Rechenschritten wird die Wolkenfarbe beim Zeichnen ein Stück entlang des Winds verschoben, die Drehung läuft stetig. Flüssige Bewegung auch bei hoher Bildrate oder niedrigem Rechentakt.', 'Between two steps the cloud colour is shifted along the wind while drawing, and the spin runs continuously. Smooth motion at high frame rates or low step rates.') + fx('c(q, t+τ) ≈ c(q − v(q)·τ, t)'))
    .toggle('fxSimSplit', t('Sim: Schritt auf Bilder verteilen', 'Sim: spread step over frames'), t('Statt alle paar Bilder einen ganzen Schritt zu rechnen, wird er in Portionen über die Bilder dazwischen verteilt. Weniger Ruckler (kürzestes längstes Bild), gleiche Summe; die Anzeige hinkt um bis zu einen Schritt nach.', 'Instead of one whole step every few frames, spreads it in portions over the frames in between. Smoother frame times, same total; display lags by up to one step.'))
    .select('fxCare', t('Sim: Farbpflege seltener', 'Sim: colour upkeep less often'), [['1', t('Aus (jeden Schritt)', 'Off (every step)')], ['2', t('jeden 2. Schritt', 'every 2nd step')], ['4', t('jeden 4. Schritt', 'every 4th step')], ['8', t('jeden 8. Schritt', 'every 8th step')]],
      t('Bandrückstellung, Sturmfarbe und Konvektion wirken langsam, kosten aber den größten Teil des Farbschritts. Hier nur jeden n-ten Schritt, dafür n-mal so stark.', 'Band relaxation, storm colour and convection act slowly but dominate the dye step. Applied every n-th step, n times as strong.') + fx('1 − e^(−r·n·Δt)'));

  p.section(t('Grafik: Zwischenspeicher', 'Graphics: caches'),
    t('Bereits Gerechnetes wiederverwenden. Ändert das Bild nicht.', 'Reuse what is already computed. Does not change the image.'), false)
    .toggle('fxBind', t('Cache: Bindungsgruppen (CPU)', 'Cache: bind groups (CPU)'), t('Merkt sich die Bindungsgruppen der Rechenschritte, statt je Schritt rund 35 neu anzulegen. Spart nur Prozessorzeit.', 'Keeps the compute bind groups instead of creating about 35 per step. Saves CPU time only.'));
  if (neben) p
    .toggle('fxSkyCache', t('Cache: Himmel zwischenspeichern', 'Cache: sky'), t('Milchstraße und Sterne stehen fest: sie werden nur neu gerechnet, wenn sich Blick, Größe oder Helligkeit ändern. Bild gleich bis auf 1/255; lohnt vor allem bei sehr hoher Auflösung.', 'Milky Way and stars are fixed: recomputed only when view, size or brightness change. Same image within 1/255; mainly worthwhile at very high resolution.'))
    .toggle('fxBundle', t('Cache: Render-Bundle (CPU)', 'Cache: render bundle (CPU)'), t('Zeichnet die Befehle des Planeten einmal auf und spielt sie wieder ab. Bei nur einem Zeichenbefehl je Bild praktisch ohne Wirkung.', 'Records the planet’s draw commands once and replays them. With a single draw per frame it has practically no effect.'));
  return p;
}

export function grafikSichtbar(app: App) {
  const S = app.S, p = app.panel, w = wahl(S);
  ketteSichtbar(p, S);
  p.visible('fxAA', S.fxUp !== 'taau');
  p.visible('fxF16', S.fxUp === 'edge' && app.device.features.has('shader-f16'));
  p.visible('fxAlpha', w.zeitlich !== 'off');
  p.visible('fxDitherSteps', w.zeitlich !== 'off' && (S.arghOn || S.pomOn));
  const halb = w.zeitlich === 'off' && !w.msaa && !S.map;
  p.visible('fxPattern', halb && !w.fovea);
  p.visible('fxFovea', halb && w.muster === 'off');
  p.visible('fxFoveaRadius', w.fovea);
  p.visible('fxFoveaScale', w.fovea);
  p.visible('fxGen', !S.map);
  p.visible('fxGenN', w.gen !== 'off');
  p.visible('fxSkyCache', halb && w.muster === 'off' && !w.fovea && (S.nebula > 0 || S.stars > 0));
  p.visible('fxTarget', S.autoQuality);
  p.visible('fxDynIntern', S.autoQuality && S.fxUp !== 'off');
  p.visible('fxSimInterp', !S.map);
}
