// Menü-Abschnitt „Wind“ des Gasriesen.
import type { Panel } from '../../ui';
import type { MenueKontext } from './kontext';
import { t } from '../../i18n';

export function abschnittWind(p: Panel, k: MenueKontext): Panel {
  const { app, f2, f3, fx } = k;
  return p
    .section(t('Wind', 'Wind'), t('Jet-Stärke wirkt in beiden Rechenmodellen, die übrigen Regler bei Stable Fluids. Die Gleichung (2D, inkompressibel, auf der Kugel):', 'Jet strength applies to both maths models, the other controls to Stable Fluids. The equation (2D, incompressible, on the sphere):'), true)
    .custom(app.formulaNote(t('∂u/∂t + (u·∇)u = −∇p − f k̂×u + F<sub>Jet</sub> + F<sub>Sturm</sub> + ε·F<sub>Wirbel</sub> − r·u,   ∇·u = 0', '∂u/∂t + (u·∇)u = −∇p − f k̂×u + F<sub>jet</sub> + F<sub>storm</sub> + ε·F<sub>vortex</sub> − r·u,   ∇·u = 0')))
    .range('jetStrength', t('Jet-Geschwindigkeit', 'Jet speed'), 0, 0.5, 0.002,
      t('Wie schnell die Ost-West-Bänder strömen (Planetenradien pro Sekunde). Nur die Bänder: wie kräftig die Strudel angetrieben werden, stellst du getrennt unter „Strudel-Stärke“ ein, wie schnell alles abläuft unter „Tempo“.',
        'How fast the east–west bands flow (planet radii per second). Bands only: how strongly eddies are driven is set separately under “Eddy strength”, how fast everything runs under “Tempo”.') + fx(t('U(φ) = U<sub>max</sub> · Profil(φ)', 'U(φ) = U<sub>max</sub> · profile(φ)')), f3)
    .range('eddyStrength', t('Strudel-Stärke', 'Eddy strength'), 0, 10, 0.05,
      t('Antrieb aller Strudel: Turbulenz, Stürme, Curl-Noise und Wirbel. Unabhängig von der Jet-Geschwindigkeit, so kannst du ruhige Bänder mit kräftigen Strudeln kombinieren oder umgekehrt. 1 = wie bisher bei Jet-Geschwindigkeit 0,06.',
        'Drive of all eddies: turbulence, storms, curl noise and vortices. Independent of jet speed, so calm bands can go with strong eddies or the other way round. 1 = as before at jet speed 0.06.') + fx(t('Antrieb = 0,06 · Strudel-Stärke', 'drive = 0.06 · eddy strength')), (v) => `${v.toFixed(2)}×`)
    .range('jetRelax', t('Jet-Rückstellung', 'Jet restoring'), 0, 5, 0.01,
      t('Zieht nur das Breitenkreis-Mittel des Ostwinds zum Windprofil zurück; Wirbel bleiben frei. 0 = die Bänder zerfallen mit der Zeit.',
        'Pulls only the latitude-circle mean of the east wind back to the profile; vortices stay free. 0 = bands decay over time.') + fx('u += ê<sub>E</sub> · (U(φ) − ⟨u·ê<sub>E</sub>⟩<sub>φ</sub>) · k·Δt'), f2)
    .range('omega', t('Coriolis (Rotation)', 'Coriolis (rotation)'), 0, 30, 0.05,
      t('Planetenrotation Ω in der Strömungsgleichung. Wirksam ist vor allem ihr Nord-Süd-Gefälle β: es erzeugt Rossby-Wellen und ordnet Turbulenz zu Bändern. Das Verhältnis Wind zu Rotation (Rossby-Zahl) entscheidet, ob es wie eine Teetasse (groß) oder wie ein Planet (klein) aussieht: Jupiter hat Ro ≈ 0,01 bis 0,1, Standard 0,4 ergibt Ro ≈ 0,15 im großen Maßstab.',
        'Planet rotation Ω in the flow equation. What matters most is its north–south gradient β: it creates Rossby waves and organises turbulence into bands. The ratio of wind to rotation (Rossby number) decides whether it looks like a teacup (large) or a planet (small): Jupiter has Ro ≈ 0.01 to 0.1; the default 0.4 gives Ro ≈ 0.15 at planet scale.') + fx('u′ = u·cos a + (p×u)·sin a,  a = −2Ω·sin φ·Δt;  Ro = U / (2Ω·L)'), f2)
    .range('turbulence', t('Turbulenz', 'Turbulence'), 0, 10, 0.01,
      t('Kleine, langsam wandernde Anstöße (divergenzfreies Rauschen). Sie lösen die Scherinstabilitäten an den Jet-Rändern aus.',
        'Small, slowly drifting kicks (divergence-free noise). They trigger shear instabilities at jet edges.') + fx(t('u += (p × ∇ψ<sub>Rauschen</sub>) · Stärke · Δt', 'u += (p × ∇ψ<sub>noise</sub>) · strength · Δt')), f2)
    .range('turbScale', t('Turbulenz-Größe', 'Turbulence scale'), 0.2, 40, 0.1,
      t('Frequenz des Anstoß-Rauschens: klein = wenige große Wirbel, groß = viele feine.', 'Frequency of the kick noise: low = a few big eddies, high = many fine ones.'), (v) => v.toFixed(1))
    .range('confinement', t('Wirbelverstärkung', 'Vorticity confinement'), 0, 20, 0.05,
      t('Gibt Wirbeln die Energie zurück, die das grobe Gitter wegschmiert, vor allem den kleinsten. Standard 6 = lebendiger Look von v0.1; physikalisch sauberer ist etwa 0,5.',
        'Gives vortices back the energy the coarse grid smears away, mostly the smallest. Default 6 = lively v0.1 look; physically cleaner is about 0.5.') + fx('F = ε·Δx·(N × ζp̂),  N = ∇|ζ| / |∇|ζ||'), f2)
    .range('drag', t('Reibung', 'Drag'), 0, 2, 0.005, t('Bremst den ganzen Wind gleichmäßig ab.', 'Slows the whole wind field uniformly.') + fx('u ← u / (1 + r·Δt)'), f3);
}
