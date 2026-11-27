# Credits

## Author — the person this project is owed to

This project is owed to **loveascent**: idea, concept, goals, project lead, evaluation on real hardware, and the decisive expert objections during development, including:
- the question about atmospheric thickness (led to the finding “the deformation radius is missing”),
- “the maths behaves like a 10×10 cm object, not 1000 km” (led to the Rossby/Reynolds regime
  analysis, see [docs/STATUS.md](docs/STATUS.md)),
- “the scars were not there before” (led to measuring the cube-map sampling error at edges),
- the image of pouring cream into coffee as a test for sources, obstacles and sharp transport,
- the comparison with the Alien: Isolation gas giant (led to “separate the scales”, ROADMAP 1a),
- view-dependent detail: “the closer you zoom, the better, without losing fps” (ROADMAP 1a;
  in v0.3 the particle track’s “View focus”),
- v0.3 review: the “teacup scale” of speeds (led to findings 9–10: simulation tied to the frame rate,
  wind-to-rotation ratio), storms that should emerge and grow from the maths (finding 11), that the
  particle track did not look like jasper-r because both methods were mixed (finding 12), the help-box
  jitter bug, retrograde rotation and hemisphere-dependent storm spin, clouds over continents (the
  terrain preview), 3D rings and moons as next steps, and the working rule “build new tracks instead
  of making things worse”.

Implemented with the help of **Claude** (Anthropic) as an AI programming assistant.

Please cite the project via [CITATION.cff](CITATION.cff) if you use or build on it.
German version: [docs/de/CREDITS.md](docs/de/CREDITS.md).

## What the project builds on

**No third-party source code was copied.** Published methods and ideas were adopted; the
implementation is original. Thanks to the authors:

### Methods and articles
| Source | What we learned from it |
|---|---|
| Jos Stam, *Stable Fluids*, SIGGRAPH 1999 | core method: advection, pressure projection |
| Mark J. Harris, *Fast Fluid Dynamics Simulation on the GPU*, GPU Gems ch. 38 (2004) | GPU pass structure, compact Jacobi stencil |
| mofu, [*Stable Fluids with three.js*](https://mofu-dev.com/en/blog/stable-fluids/) (2022) | clear derivation, BFECC advection |
| jasper-r, [*Gas giant particle sim on a sphere*](https://jasper-r.github.io/gas-giant) (2022) | compute-shader particles, fade in/out, blur |
| Stephen M. Cameron, [Gaseous Giganticus](https://github.com/smcameron/gaseous-giganticus) (GPL-2.0) | recipe: curl noise + band profile, vortices only in weak shear, sin(π·d/r) profile, immortal particles. **Recipe and parameter values only, no code.** |
| bloknayrb, [gas-giant](https://github.com/bloknayrb/gas-giant) (GPL-3.0) | overview of which Jupiter phenomena a model needs; advected-coordinate noise idea. **Ideas only, no code.** |
| PavelDoGreat, [WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) (MIT) | vorticity confinement in practice, dye finer than the velocity grid |
| Ronald Fedkiw et al., *Visual Simulation of Smoke*, SIGGRAPH 2001 | vorticity confinement |
| Andrew Selle et al., *An Unconditionally Stable MacCormack Method*, 2008 | limiter against overshoot |
| Robert Bridson et al., *Curl-Noise for Procedural Fluid Flow*, SIGGRAPH 2007 | divergence-free noise as a stream function |
| Inigo Quilez, articles on gradient noise with analytic derivatives | noise-plus-gradient formula |
| Mark Jarzynski, Marc Olano, *Hash Functions for GPU Rendering*, JCGT 2020 | `pcg3d` hash |
| Marcel Minnaert, 1941 | limb darkening |
| Krzysztof Narkowicz, *ACES Filmic Tone Mapping Curve* (2016) | tone mapping |
| Arghanion's Puzzlebox, [*Create an Epic Volumetric Gas Giant!*](https://www.youtube.com/watch?v=CrAn6j8S1gg) (Blender tutorial, after Rui Huang) | “Argh volume” module: colour-displaced spherical density, constant colour ramp, principled volume; re-implemented from the node tree, no files used |
| Max & Becker 1995; Perlin & Neyret 2001; Neyret 2003 | advected textures / flow noise (ROADMAP 1a; two-phase trick used for the clouds in `src/rocky/main.js`) |
| Showman 2007; Scott & Polvani 2007 | forced shallow-water turbulence: storms as mass pulses, jets and vortices emerge (ROADMAP 1c, see [docs/RESEARCH.md](docs/RESEARCH.md)) |

### Moon (`src/rocky/shader/krater.js`)
| Source | Use |
|---|---|
| Pike 1977; Melosh 1989, *Impact Cratering* | simple→complex transition, depth/diameter ratios, rim and ejecta profiles |
| Neukum et al. 2001 | crater size-frequency distribution (slope between −2 and −3.8) |
| Hapke 1981/1993; Lommel–Seeliger law | regolith reflectance, opposition surge |
| Pappalardo et al. 1999 | Europa fractures, double ridges, chaos terrain |
| Schenk & Jackson 2018; Stern et al. 2015 | cantaloupe terrain, Sputnik Planitia convection cells |
| Spencer & Denk 2010 | Iapetus dichotomy and equatorial ridge |
| Henyey & Greenstein 1941 | phase function for haze and plumes |
| Quilez | soft shadow estimate for ray-marched shadows |

### Physics and measurements (for calibration only; no images in the project)
| Source | Use |
|---|---|
| Porco et al. 2003 (Cassini); Tollefson et al. 2017 (Hubble OPAL) | Jupiter wind profile (simplified) |
| García-Melendo et al. 2011; Sromovsky et al. 1993/2015 | Saturn, Uranus, Neptune wind profiles (simplified) |
| Cho & Polvani 1996, *Physics of Fluids* 8, 1531 | shallow-water turbulence on the sphere: next model step |
| Dowling et al. 1998, EPIC model ([NASA-Planetary-Science/EPIC_Atmospheric_Model](https://github.com/NASA-Planetary-Science/EPIC_Atmospheric_Model)) | reference for layered gas-giant atmospheres |
| NASA/JPL Juno, Bolton et al. 2021 | depth of the Great Red Spot (pancake vortex) |

The recording in `docs/media/` was made by loveascent on real hardware.
Images from NASA, Juno, Hubble, games and the web were only used as references during development
and are **not** part of the repository. Screenshots in `docs/images/` are renders of this project.

### Rocky planets (`planets.html`, `src/rocky/main.js`) and the shared sky (`src/sky/`)
| Source | Used for |
|---|---|
| colordodge, [ProceduralPlanet](https://github.com/colordodge/ProceduralPlanet) (three.js, WTFPL); live at colordodge.com/procedural-planets | the whole method of the "Original 1:1" mode: cube sphere with per-face height and moisture maps from mixed fBm/ridged simplex noise, random biome image, normals from height + image brightness, roughness map reused as metalness, clouds, glow, nebula, stars, lens flare, seed in the URL. Rebuilt from the author's descriptions and screenshots, not copied |
| Ashima Arts / Stefan Gustavson, [webgl-noise](https://github.com/stegu/webgl-noise) (MIT) | 3D simplex noise with analytic gradient (code included, license in the file) |
| David Hoskins, *Hash without Sine* (MIT) | hash functions (code included, license in the file) |
| F. K. Musgrave, *Texturing & Modeling* (1994) | ridged multifractal for mountain belts |
| Clay John (2021) and Fewes (2023), eroded-terrain noise on Shadertoy | idea of gully stripes along r̂ × ∇h with branching; implemented anew in 3D on the sphere |
| I. Quilez, domain warping and analytic noise derivatives | warped fBm for clouds and nebula, derivative-based normals |
| E. Bruneton, *Precomputed Atmospheric Scattering: a New Implementation* (2017) | transmittance table parameterisation |
| S. Hillaire, *A Scalable and Production Ready Sky and Atmosphere Rendering Technique* (EGSR 2020) | Rayleigh, Mie and ozone coefficients |
| S. Hillaire, reference code [UnrealEngineSkyAtmosphere](https://github.com/sebh/UnrealEngineSkyAtmosphere) (MIT, © 2020 Epic Games), `RenderSkyRayMarching.hlsl` | atmosphere ray-march step count grows with ray length (4 near the ground, full from one atmosphere thickness); own WGSL |
| AskAlice, [threejs-grass / threejs-worldgen](https://github.com/AskAlice/threejs-worldgen) (Apache-2.0) | grass field in `demos/gras/`: wind gust, bend and comb formulas, blade profile and shading values re-implemented in plain WGSL (no three.js, comments mark the adopted values) |
| C. Cox & W. Munk (1954); R. Pope & E. Fry (1997) | sun-glint slope variance; absorption of pure water |
| L. G. Henyey & J. L. Greenstein (1941) | cloud forward scattering |
| B. Walter et al. (2007), GGX; K. Narkowicz, ACES fit (2016); J. Jimenez, bloom (2014) | specular highlights, film curve, bloom (first stage with Karis average against flickering fireflies) |
| F. Strugar, *Continuous Distance-Dependent Level of Detail for Rendering Heightmaps* (CDLOD, 2009) | quadtree terrain tiles with geomorphing and frustum culling of the tiles |
| webgpu-samples, [reversedZ](https://github.com/webgpu/webgpu-samples) (BSD-3-Clause) | reversed-Z depth buffer (float depth, clear to 0, compare `greater`), own implementation |
| N. Reed, *Depth Precision Visualized* (NVIDIA, 2015) | why reversed floating-point depth keeps precision from orbit down to eye height |
| G. Gribb & K. Hartmann, *Fast Extraction of Viewing Frustum Planes from the World-View-Projection Matrix* (2001) | six frustum planes from the matrix rows for tile culling |
| D. Ohlarik, *Precisions, Precisions* (AGI, 2008) | relative-to-centre (RTC) tiles: vertex positions relative to a per-tile origin against float jitter near the ground |
| I. Quilez, *Gradient Noise Derivatives* | analytic derivatives of the near-ground detail octaves (normals without extra samples) |
| simondevyoutube, [Quick_Grass](https://github.com/simondevyoutube/Quick_Grass) (MIT, © 2023 simondevyoutube) | blade shape, wind sway, `murmurHash33` for per-blade randomness (own implementation after it) |
| SimonDev, *3D World Generation* #10 and #11 (YouTube) | ideas: zoom down to eye height, tile precision, grass near the camera (ideas only, no code) |
| R. Barnes, C. Lehman, D. Mulla, *Priority-Flood* (Computers & Geosciences, 2014) | filling sinks into lakes, drainage directions |
| J. O'Callaghan & D. Mark (1984), flow accumulation; L. Leopold & T. Maddock (1953), hydraulic geometry | river discharge, width ∝ Q^0.5, depth ∝ Q^0.4 |
| N. McDonald, *Procedural Hydrology* (2020) | reference for carving rivers into the terrain and filling basins (idea, not code) |
| Z. M. Leinhardt & S. T. Stewart, *Collisions between Gravity-Dominated Bodies. I. Outcome Regimes and Scaling Laws* (ApJ 745, 79, 2012; arXiv:1109.4588) | collision outcome in the world layer: Q*_RD, largest remnant, hit-and-run limit (`src/welt/physik/leinhardt.ts`) |
| A. Emsenhuber, E. Asphaug, S. Cambioni, T. Gabriel, S. Schwartz, R. Melikyan, C. A. Denton, *A New Database of Giant Impacts over a Wide Range of Masses and with Material Strength* (PSJ 2024; arXiv:2401.17356) | debris speed ≈ half the impact speed (newer than the 1.1 v_esc used by N-body codes) |
| S. Childs & J. Steffen, *Collisional fragmentation and bulk composition tracking in REBOUND* (2022; arXiv:2201.05714); H. Rein & S.-F. Liu, REBOUND (A&A 537, A128, 2012) | cross-check of the above, fragment speed 1.1 v_esc, equal-mass fragments, hard-sphere bounce with restitution |

### Graphics options: frame rate and anti-aliasing (`src/grafik/`, `src/gas/grafik/`)
| Source | Used for |
|---|---|
| Yang, Liu, Salvi, *A Survey of Temporal Antialiasing Techniques*, CGF 2020 | TAA, temporal upscaling, history rejection/clipping, checkerboard and interlaced reconstruction, reverse reprojection |
| M. Salvi, *An Excursion in Temporal Supersampling*, GDC 2016 | variance clipping, 10 % new-frame weight |
| T. Lottes, *FXAA* whitepaper, NVIDIA 2009 | FXAA method (steps and quality constants), own implementation |
| A. Reshetov, *Morphological Antialiasing*, 2009; Jimenez et al., *SMAA*, 2012 | morphological anti-aliasing: edge test and coverage areas, own implementation without diagonals |
| T. Lottes, *FidelityFX Super Resolution 1.0*, SIGGRAPH 2021 course (talk text); Bigün & Granlund 1987 | edge-adaptive upscaling after the description; the feature measure is the structure-tensor coherence (not AMD’s code, not identical) |
| AMD, *FidelityFX CAS* presentation, GDC 2019 | contrast-adaptive sharpening, own implementation |
| M. Pettineo (TheRealMJP), *Tex2DCatmullRom.hlsl* gist (MIT licence, https://gist.github.com/TheRealMJP/c83b8c0f46b63f3a88a5986f4fa982b1), after vec3.ca *Bicubic filtering in fewer taps*; R. Keys 1981; K. Turkowski 1990 | Catmull-Rom 9-tap weights in the temporal history sampling (adapted from the MIT gist); Lanczos |
| J. Jimenez, interleaved gradient noise (2014, temporal variant 2016) | output dithering and ray-start jitter |

### Fonts and tools
IBM Plex Sans/Mono (SIL OFL), Barlow Condensed (SIL OFL), loaded via Google Fonts.
Vite, TypeScript, `@webgpu/types`, `vite-plugin-singlefile` (all MIT).
