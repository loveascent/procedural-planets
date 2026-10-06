// Menü-Abschnitt „Grafikkarte und Feinheit“ des Gasriesen.
import type { Panel } from '../../ui';
import type { MenueKontext } from './kontext';
import { t } from '../../i18n';

export function abschnittGpu(p: Panel, k: MenueKontext): Panel {
  const { n, fx, lim } = k;
  return p
    .section(t('Grafikkarte und Feinheit', 'GPU and detail'), t('Diese Regler kosten Rechenleistung. Sie machen das Bild feiner, ändern aber nicht, was physikalisch passiert.', 'These controls cost GPU time. They make the image finer but do not change what happens physically.'), true)
    .select('quality', t('Gerät (Startwerte)', 'Device (start values)'), [
      ['phone', t('Smartphone', 'Smartphone')],
      ['standard', t('Laptop / integrierte GPU', 'Laptop / integrated GPU')],
      ['high', t('Desktop-GPU', 'Desktop GPU')],
      ['ultra', t('High-End-GPU (z. B. RTX 4080/5080)', 'High-end GPU (e.g. RTX 4080/5080)')],
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
      t('Misst beim Laden, wie schnell deine Grafikkarte einen Simulationsschritt rechnet, und senkt bei Bedarf die Auflösung. Danach passt sich die Render-Auflösung laufend an, damit die Bildrate über 58 fps bleibt.',
        'Measures during loading how fast your GPU computes a simulation step and lowers the resolution if needed. Afterwards the render resolution adapts continuously to keep the frame rate above 58 fps.'))
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
        'Error correction during transport: back, forth, subtract half the error. Sharper vortices and edges.') + fx('x̃ = x − ½(back(forth(x)) − x)'));
}
