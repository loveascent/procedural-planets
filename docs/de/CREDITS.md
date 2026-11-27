# Credits

## Urheber: wem das Projekt zu verdanken ist

Dieses Projekt ist **loveascent** zu verdanken: Idee, Konzept, Zielsetzung, Projektleitung, Bewertung der Ergebnisse auf echter Hardware und die entscheidenden fachlichen
Einwände während der Entwicklung, unter anderem:
- die Frage nach der Atmosphärendicke (führte zum Befund „Deformationsradius fehlt“),
- „die Mathematik wirkt wie für ein 10×10-cm-Objekt, nicht für 1000 km“ (führte zur
  Kennzahlen-Analyse Rossby/Reynolds, siehe [docs/STATUS.md](STATUS.md)),
- „die Narben gab es vorher nicht“ (führte zur Messung des Kantenfehlers beim Cubemap-Abtasten),
- das Bild „Sahne in Kaffee gießen“ als Prüfstein für Quellen, Hindernisse und scharfen Transport.

Umsetzung mit Unterstützung von **Claude** (Anthropic) als KI-Programmierassistent.

Bitte zitiere das Projekt nach [CITATION.cff](../../CITATION.cff), wenn du es nutzt oder darauf aufbaust.

## Worauf das Projekt aufbaut

Es wurde **kein fremder Quellcode kopiert**. Übernommen wurden veröffentlichte Verfahren und Ideen.
Die Implementierung ist eigenständig. Wir danken den Autorinnen und Autoren:

### Verfahren und Artikel
| Quelle | Was wir daraus gelernt haben |
|---|---|
| S. Hillaire, Referenzcode [UnrealEngineSkyAtmosphere](https://github.com/sebh/UnrealEngineSkyAtmosphere) (MIT, © 2020 Epic Games), `RenderSkyRayMarching.hlsl` | Zahl der Strahlschritte in der Luft wächst mit der Streckenlänge (4 am Boden, voll ab der Dicke der Lufthülle); eigenes WGSL |
| AskAlice, [threejs-grass / threejs-worldgen](https://github.com/AskAlice/threejs-worldgen) (Apache-2.0) | Grasfeld in `demos/gras/`: Wind-, Biege- und Kämm-Formeln, Halmprofil und Schattierungswerte in reinem WGSL nachgebaut (ohne three.js, Kommentare markieren die übernommenen Werte) |
| Jos Stam, *Stable Fluids*, SIGGRAPH 1999 | Grundverfahren: Advektion, Druck-Projektion |
| Mark J. Harris, *Fast Fluid Dynamics Simulation on the GPU*, GPU Gems Kap. 38 (2004) | GPU-Aufteilung in Pässe, kompakter Jacobi-Stern |
| mofu, [*Stable Fluids with three.js*](https://mofu-dev.com/en/blog/stable-fluids/) (2022) | anschauliche Herleitung, BFECC-Advektion |
| jasper-r, [*Gas giant particle sim on a sphere*](https://jasper-r.github.io/gas-giant) (2022) | Partikel per Compute-Shader, Einblenden/Ausblenden, Weichzeichnen |
| Stephen M. Cameron, [Gaseous Giganticus](https://github.com/smcameron/gaseous-giganticus) (GPL-2.0) | Rezept: Curl-Noise + Bandprofil, Wirbel nur in schwacher Scherung, Profil sin(π·d/r), ewig lebende Partikel. **Nur Rezept und Zahlenwerte, kein Code.** |
| bloknayrb, [gas-giant](https://github.com/bloknayrb/gas-giant) (GPL-3.0) | Überblick, welche Jupiter-Phänomene ein Modell braucht. **Nur Ideen, kein Code.** |
| PavelDoGreat, [WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) (MIT) | Vorticity Confinement in der Praxis, Farbe feiner als Windgitter |
| Ronald Fedkiw et al., *Visual Simulation of Smoke*, SIGGRAPH 2001 | Vorticity Confinement |
| Andrew Selle et al., *An Unconditionally Stable MacCormack Method*, 2008 | Begrenzer gegen Überschwinger |
| Robert Bridson, *Curl-Noise for Procedural Fluid Flow*, SIGGRAPH 2007 | divergenzfreies Rauschen als Stromfunktion |
| Inigo Quilez, Artikel zu Gradientenrauschen mit analytischer Ableitung | Formel für Rauschen samt Gradient |
| Mark Jarzynski, Marc Olano, *Hash Functions for GPU Rendering*, JCGT 2020 | `pcg3d`-Hash |
| Marcel Minnaert, 1941 | Randverdunkelung |
| Krzysztof Narkowicz, *ACES Filmic Tone Mapping Curve* (2016) | Tonemapping |
| Arghanion's Puzzlebox, [*Create an Epic Volumetric Gas Giant!*](https://www.youtube.com/watch?v=CrAn6j8S1gg) (Blender-Tutorial, nach Rui Huang) | Modul „Argh-Volumen“: von der Farbe verschobene Kugel-Dichte, konstante Farbrampe, Principled Volume; aus dem Nodebaum nachgebaut, keine Dateien übernommen |

### Physik und Messdaten (nur zur Kalibrierung, keine Bilder im Projekt)
| Quelle | Verwendung |
|---|---|
| Porco et al. 2003 (Cassini); Tollefson et al. 2017 (Hubble OPAL) | Jupiter-Windprofil (vereinfacht) |
| García-Melendo et al. 2011; Sromovsky et al. 1993/2015 | Saturn-, Uranus-, Neptun-Windprofile (vereinfacht) |
| Cho & Polvani 1996, *Physics of Fluids* 8, 1531 | Flachwasser-Turbulenz auf der Kugel: nächster Modellschritt |
| Dowling et al. 1998, EPIC-Modell ([NASA-Planetary-Science/EPIC_Atmospheric_Model](https://github.com/NASA-Planetary-Science/EPIC_Atmospheric_Model)) | Referenz für geschichtete Gasplaneten-Atmosphären |
| NASA/JPL Juno, Bolton et al. 2021 | Tiefe des Großen Roten Flecks (Pfannkuchen-Wirbel) |

Bilder von NASA, Juno, Hubble und aus dem Web wurden nur im Gespräch als Vergleich benutzt
und sind **nicht** Teil des Repos.

### Grafik-Optionen: Bildrate und Glättung (`src/grafik/`, `src/gas/grafik/`)
| Quelle | Verwendung |
|---|---|
| Yang, Liu, Salvi, *A Survey of Temporal Antialiasing Techniques*, CGF 2020 | TAA, zeitliches Hochskalieren, Verlauf prüfen/kappen, Schachbrett- und Zeilensprung-Rekonstruktion, Rückprojektion |
| M. Salvi, *An Excursion in Temporal Supersampling*, GDC 2016 | Varianz-Kappen, 10 % Anteil des neuen Bildes |
| T. Lottes, *FXAA* whitepaper, NVIDIA 2009 | FXAA-Verfahren (Schritte und Gütewerte), eigene Umsetzung |
| A. Reshetov, *Morphological Antialiasing*, 2009; Jimenez et al., *SMAA*, 2012 | morphologische Kantenglättung: Kantentest und Deckungsflächen, eigene Umsetzung ohne Diagonalen |
| T. Lottes, *FidelityFX Super Resolution 1.0*, SIGGRAPH 2021 course (talk text); Bigün & Granlund 1987 | kantenadaptives Hochskalieren nach der Beschreibung; Merkmalsmaß ist die Kohärenz des Strukturtensors (kein AMD-Code, nicht identisch) |
| AMD, *FidelityFX CAS* presentation, GDC 2019 | kontrastadaptives Schärfen, eigene Umsetzung |
| M. Pettineo (TheRealMJP), *Tex2DCatmullRom.hlsl*-Gist (MIT-Lizenz, https://gist.github.com/TheRealMJP/c83b8c0f46b63f3a88a5986f4fa982b1), nach vec3.ca *Bicubic filtering in fewer taps*; R. Keys 1981; K. Turkowski 1990 | Catmull-Rom-Gewichte mit 9 Zugriffen beim zeitlichen Verlauf (aus dem MIT-Gist übernommen); Lanczos |
| J. Jimenez, interleaved gradient noise (2014, temporal variant 2016) | Dithering der Ausgabe und Versatz des Strahlstarts |

### Schriften und Werkzeuge
IBM Plex Sans/Mono (SIL OFL), Barlow Condensed (SIL OFL), über Google Fonts geladen.
Vite, TypeScript, `@webgpu/types`, `vite-plugin-singlefile` (alle MIT).
