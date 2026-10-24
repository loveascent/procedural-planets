import type { Wert } from './typen';

// Voreinstellungen: Mondtypen als Abweichungen vom Standard (Erdmond). Jeder Wert ist ein Regler oder Schalter, nichts ist fest verdrahtet.
// Die Werte sind an Messdaten der Vorbilder (Albedo, Kraterdichte, Reliefhöhe) angelehnt; Texte nennen, woran.
export interface Vorlage { id: string; de: string; en: string; hinweis: [string, string]; exotisch?: boolean; w: Record<string, Wert> }

const AUS = (...ids: string[]) => Object.fromEntries(ids.map((i) => [`${i}_an`, false]));
const AN = (...ids: string[]) => Object.fromEntries(ids.map((i) => [`${i}_an`, true]));

export const VORLAGEN: Vorlage[] = [
  { id: 'erdmond', de: 'Erdmond (Hochland + Maria)', en: 'Earth’s Moon (highlands + maria)', hinweis: ['Grauer Staub, dunkle Basaltebenen, helle Strahlenkrater.', 'Grey dust, dark basalt plains, bright rayed craters.'], w: {} },
  { id: 'callisto', de: 'Callisto (uralter Eiskrater-Mond)', en: 'Callisto (ancient cratered ice moon)', hinweis: ['Dunkle, verschmutzte Eiskruste, gesättigt voller Krater, helle frische Krater, Mehrringstruktur.', 'Dark contaminated ice crust, saturated with craters, bright fresh craters, multi-ring structure.'], w: {
    ...AUS('maria', 'rillen'), ...AN('eisfarbe'), einschlaege_anz: 3, einschlaege_gross: 0.34, einschlaege_ringe: 0.9, einschlaege_jung: 0.2, einschlaege_tiefe: 0.012,
    krater_dichte: 1.5, krater_steil: 0.8, krater_tiefe: 0.1, krater_alter: 0.7, krater_komplex: 0.008, krater_frisch: 2.2, krater_gipfel: 0.5, gelaende_hoehe: 0.006,
    eisfarbe_hell: 0.55, eisfarbe_schmutz: 0.85, eisfarbe_glanz: 0.12, eisfarbe_frischeis: 1.6, regolith_hell: 0.2, regolith_saett: 0.04, regolith_rot: 0.1 } },
  { id: 'ganymed', de: 'Ganymed (gerillte Eisbänder)', en: 'Ganymede (grooved ice bands)', hinweis: ['Dunkles Altgelände und helle, gerillte Bänder.', 'Dark old terrain and bright grooved bands.'], w: {
    ...AUS('maria', 'rillen'), ...AN('eisfarbe', 'furchen'), furchen_anteil: 0.55, furchen_frq: 34, furchen_hoehe: 0.0009, furchen_kruemmung: 1.3, furchen_hell: 0.7,
    einschlaege_anz: 2, einschlaege_gross: 0.25, krater_dichte: 0.8, krater_alter: 0.6, krater_tiefe: 0.1, krater_frisch: 2, gelaende_hoehe: 0.007,
    eisfarbe_hell: 0.5, eisfarbe_schmutz: 0.65, eisfarbe_glanz: 0.15, regolith_saett: 0.05 } },
  { id: 'europa', de: 'Europa (glatter Eisozean-Mond)', en: 'Europa (smooth ice-ocean moon)', hinweis: ['Junges, fast kraterloses Eis mit braunen Rissen, Doppelrücken und Chaosschollen.', 'Young, almost crater-free ice with brown fractures, double ridges and chaos rafts.'], w: {
    ...AUS('maria', 'rillen', 'einschlaege'), ...AN('eisfarbe', 'eis', 'chaos'), krater_dichte: 0.05, krater_tiefe: 0.07, krater_alter: 0.3, gelaende_hoehe: 0.0018, gelaende_grat: 0, gelaende_dichot: 0,
    eis_netz: 3, eis_frq: 3.2, eis_tiefe: 0.0009, eis_farbe: 0.85, eis_baender: 0.5, chaos_anteil: 0.28, chaos_farbe: 0.8,
    eisfarbe_hell: 0.78, eisfarbe_schmutz: 0.1, eisfarbe_farbton: 45, eisfarbe_saett: 0.06, eisfarbe_glanz: 0.45, eisfarbe_korn: 0.5, regolith_var: 0.3 } },
  { id: 'enceladus', de: 'Enceladus (schneeweiß, Geysire)', en: 'Enceladus (snow white, geysers)', hinweis: ['Hellste Oberfläche des Sonnensystems, Tigerstreifen-Risse und Eisfontänen am Südpol.', 'Brightest surface in the solar system, tiger-stripe fractures and ice plumes at the south pole.'], w: {
    ...AUS('maria', 'rillen', 'einschlaege'), ...AN('eisfarbe', 'eis', 'fontaenen'), eisfarbe_hell: 1.15, eisfarbe_schmutz: 0.02, eisfarbe_saett: 0.04, eisfarbe_glanz: 0.2, eisfarbe_korn: 0.6,
    krater_dichte: 0.5, krater_steil: 0.3, krater_alter: 0.85, krater_tiefe: 0.1, gelaende_hoehe: 0.006, eis_netz: 2, eis_frq: 2.4, eis_tiefe: 0.0012, eis_farbe: 0.25, eis_baender: 0.6,
    fontaenen_anz: 6, fontaenen_pol: 0.95, fontaenen_hoehe: 0.45, fontaenen_dichte: 2.2, sonneAz: 150, sonneEl: 10 } },
  { id: 'io', de: 'Io (Schwefelvulkane)', en: 'Io (sulphur volcanoes)', hinweis: ['Gelb-orange-rote Schwefelfarben, schwarze Calderen, glühende Lavaseen, Schirmfahnen.', 'Yellow-orange-red sulphur colours, black calderas, glowing lava lakes, umbrella plumes.'], w: {
    ...AUS('maria', 'rillen', 'einschlaege', 'krater'), ...AN('vulkane', 'fontaenen'), gelaende_hoehe: 0.004, gelaende_dichot: 0, regolith_farbton: 52, regolith_saett: 0.55, regolith_hell: 0.55, regolith_var: 0.6, regolith_rot: 0,
    vulkane_dichte: 0.9, vulkane_schwefel: 0.9, vulkane_glut: 5, vulkane_berge: 0.012, fontaenen_anz: 2, fontaenen_schirm: 1, fontaenen_pol: 0, fontaenen_hoehe: 0.2, fontaenen_dichte: 1.3, fontaenen_farbton: 215, fontaenen_saett: 0.22, fontaenen_vorwaerts: 0.6 } },
  { id: 'titan', de: 'Titan (Dunst, Dünen, Methanseen)', en: 'Titan (haze, dunes, methane lakes)', hinweis: ['Dicke orange Dunsthülle mit abgelöster Schicht; darunter Dünen und Seen.', 'Thick orange haze with a detached layer; dunes and lakes below.'], w: {
    ...AUS('maria', 'rillen', 'einschlaege'), ...AN('luft', 'duenen', 'seen', 'tholin'), luft_dichte: 3.2, luft_hoehe: 0.022, luft_farbton: 28, luft_saett: 0.8, luft_schicht: 0.5, luft_schichthoehe: 0.13, luft_vorwaerts: 0.5,
    krater_dichte: 0.12, krater_alter: 0.8, gelaende_hoehe: 0.004, regolith_hell: 0.28, regolith_farbton: 30, regolith_saett: 0.45, tholin_menge: 0.55 } },
  { id: 'mimas', de: 'Mimas (Todesstern-Krater)', en: 'Mimas (Death Star crater)', hinweis: ['Ein Riesenkrater mit Zentralberg dominiert den kleinen, eisigen Mond.', 'One giant crater with a central peak dominates the small icy moon.'], w: {
    ...AUS('maria', 'rillen'), ...AN('eisfarbe'), form_b: 0.94, form_c: 0.9, einschlaege_anz: 1, einschlaege_gross: 0.4, einschlaege_tiefe: 0.045, einschlaege_ringe: 0.2, einschlaege_jung: 1,
    krater_dichte: 1.5, krater_steil: 0.5, krater_komplex: 0.03, krater_gipfel: 1.2, krater_alter: 0.35, krater_tiefe: 0.22, gelaende_hoehe: 0.005, eisfarbe_hell: 0.62, eisfarbe_schmutz: 0.25, eisfarbe_glanz: 0.1 } },
  { id: 'iapetus', de: 'Iapetus (Walnuss, schwarz/weiß)', en: 'Iapetus (walnut, black/white)', hinweis: ['Eine Halbkugel schwarz, die andere weiß, Gebirgsgürtel am Äquator.', 'One hemisphere black, the other white, mountain ridge along the equator.'], w: {
    ...AUS('maria', 'rillen'), ...AN('eisfarbe', 'dichotomie', 'aequator'), krater_dichte: 1.3, krater_tiefe: 0.14, krater_alter: 0.55, einschlaege_anz: 4, einschlaege_gross: 0.3, einschlaege_ringe: 0.3,
    gelaende_hoehe: 0.008, eisfarbe_hell: 0.8, eisfarbe_schmutz: 0.1, eisfarbe_glanz: 0.1, dichotomie_kontrast: 0.9, aequator_hoehe: 0.013, aequator_breite: 0.06 } },
  { id: 'phobos', de: 'Phobos (Kartoffel mit Furchen)', en: 'Phobos (potato with grooves)', hinweis: ['Unregelmäßiger, dunkler Trümmerkörper mit dem Riesenkrater Stickney und parallelen Furchen.', 'Irregular dark rubble body with the giant crater Stickney and parallel grooves.'], w: {
    ...AUS('maria', 'rillen'), ...AN('furchen'), form_b: 0.84, form_c: 0.74, form_beulen: 0.07, form_wellen: 1.4, form_kanten: 0.45, einschlaege_anz: 1, einschlaege_gross: 0.36, einschlaege_tiefe: 0.05, einschlaege_ringe: 0, einschlaege_jung: 0.6,
    krater_gross: 1.3, krater_dichte: 1.3, krater_komplex: 0.2, krater_tiefe: 0.26, krater_rand: 0.8, krater_alter: 0.35, furchen_anteil: 1, furchen_kruemmung: 0, furchen_bruch: 0.85, furchen_frq: 16, furchen_hoehe: 0.002,
    gelaende_hoehe: 0.012, regolith_hell: 0.08, regolith_farbton: 18, regolith_saett: 0.1, regolith_rot: 0.5, krater_frisch: 1.2 } },
  { id: 'triton', de: 'Triton (Melonenhaut, rosa Kappe)', en: 'Triton (cantaloupe, pink cap)', hinweis: ['Melonenhaut-Gelände, dunkle Geysirfahnen, rosa Stickstoffkappe, hauchdünne Luft.', 'Cantaloupe terrain, dark geyser streaks, pink nitrogen cap, wisp of air.'], w: {
    ...AUS('maria', 'rillen', 'einschlaege'), ...AN('eisfarbe', 'melone', 'streifen', 'polkappe', 'tholin', 'luft'), krater_dichte: 0.06, gelaende_hoehe: 0.004, melone_anteil: 0.85, melone_frq: 34,
    eisfarbe_hell: 0.78, eisfarbe_farbton: 20, eisfarbe_saett: 0.08, eisfarbe_schmutz: 0.1, polkappe_seiten: 2, polkappe_breite: 22, polkappe_farbton: 12, polkappe_saett: 0.28, polkappe_hell: 0.9, polkappe_kante: 0.9,
    tholin_menge: 0.3, tholin_dunkel: 0.25, luft_dichte: 0.07, luft_hoehe: 0.02, luft_farbton: 215, luft_saett: 0.35, luft_schicht: 0, streifen_dunkel: 0.7 } },
  { id: 'charon', de: 'Charon (roter Pol, Canyons)', en: 'Charon (red pole, canyons)', hinweis: ['Grauer Eismond mit rot-brauner Polkappe, riesigem Canyonsystem und glatter Ebene.', 'Grey ice moon with a red-brown polar cap, a giant canyon system and a smooth plain.'], w: {
    ...AN('eisfarbe', 'polkappe', 'rillen'), einschlaege_anz: 2, einschlaege_gross: 0.22, krater_dichte: 0.55, krater_alter: 0.6, krater_frisch: 1.6, maria_anteil: 0.3, maria_dunkel: 0.97, maria_blau: 0, maria_falten: 0.0004, maria_pegel: -0.002,
    rillen_nurmaria: 0, rillen_rille: 0, rillen_graben: 0.004, rillen_gbreite: 0.014, rillen_gfrq: 1.7, gelaende_hoehe: 0.013, gelaende_grat: 0.4, gelaende_warp: 0.6,
    eisfarbe_hell: 0.5, eisfarbe_saett: 0.02, eisfarbe_schmutz: 0.2, eisfarbe_glanz: 0.1, polkappe_seiten: 1, polkappe_breite: 64, polkappe_farbton: 8, polkappe_saett: 0.78, polkappe_hell: 0.28 } },
  { id: 'sputnik', de: 'Zwergplanet (Stickstoffherz, Dunst)', en: 'Dwarf planet (nitrogen heart, haze)', hinweis: ['Riesige glatte Konvektionsebene, dunkle Tholinflecken am Äquator, blauer Dunst.', 'Huge smooth convection plain, dark tholin patches at the equator, blue haze.'], w: {
    ...AUS('maria', 'rillen', 'einschlaege'), ...AN('eisfarbe', 'konvektion', 'tholin', 'luft'), krater_dichte: 0.35, krater_alter: 0.7, gelaende_hoehe: 0.006, eisfarbe_hell: 0.78, eisfarbe_farbton: 35, eisfarbe_saett: 0.07, eisfarbe_schmutz: 0.15,
    tholin_menge: 0.65, tholin_aequator: 0.9, tholin_dunkel: 0.7, luft_dichte: 0.14, luft_hoehe: 0.04, luft_farbton: 215, luft_saett: 0.55, luft_schicht: 0.7, luft_schichthoehe: 0.05, luft_vorwaerts: 0.6 } },
  { id: 'hyperion', de: 'Hyperion (Schwammkörper)', en: 'Hyperion (sponge body)', hinweis: ['Poröser, gestreckter Körper, übersät mit tiefen, scharfen Gruben mit dunklem Boden.', 'Porous elongated body covered in deep sharp pits with dark floors.'], w: {
    ...AUS('maria', 'rillen', 'einschlaege'), form_b: 0.72, form_c: 0.55, form_beulen: 0.1, form_kanten: 0.7, krater_dichte: 2, krater_steil: 0.2, krater_tiefe: 0.38, krater_rand: 2, krater_loeschen: 1, krater_alter: 0.08, krater_rund: 0.3, krater_komplex: 0.1,
    krater_gross: 1.4, krater_okt: 10, gelaende_hoehe: 0.012, regolith_hell: 0.14, regolith_farbton: 25, regolith_saett: 0.3, regolith_hohl: 0.9, regolith_hang: 1.2 } },
  { id: 'lavamond', de: 'Lavamond (Magma-Kruste)', en: 'Lava moon (magma crust)', hinweis: ['Dunkle Krustenplatten, durch deren Risse die Schmelze glüht, offene Magmaseen, Vulkanfahnen.', 'Dark crust plates with melt glowing through the cracks, open magma lakes, volcanic plumes.'], exotisch: true, w: {
    ...AUS('maria', 'rillen', 'einschlaege'), ...AN('lava', 'fontaenen'), krater_dichte: 0.1, gelaende_hoehe: 0.004, regolith_hell: 0.12, regolith_saett: 0.1, lava_hitze: 6, lava_see: 0.22, fontaenen_anz: 3, fontaenen_schirm: 0.8, fontaenen_pol: 0, fontaenen_farbton: 25, fontaenen_saett: 0.35, sonneAz: 140, belichtung: 1.1 } },
  { id: 'kristall', de: 'Kristallmond (violettes Eis)', en: 'Crystal moon (violet ice)', hinweis: ['Exotisch: spiegelglattes, tiefviolettes Eis mit leuchtenden Rissen und Schollen.', 'Exotic: mirror-smooth deep-violet ice with glowing fractures and rafts.'], exotisch: true, w: {
    ...AUS('maria', 'rillen', 'einschlaege'), ...AN('eisfarbe', 'eis', 'chaos'), krater_dichte: 0.15, gelaende_hoehe: 0.003, eisfarbe_farbton: 275, eisfarbe_saett: 0.45, eisfarbe_hell: 0.8, eisfarbe_glanz: 0.9, eisfarbe_schmutz: 0.0, eisfarbe_korn: 0.8,
    eis_netz: 4, eis_farbe: 0.9, eis_frq: 4.2, chaos_anteil: 0.35, chaos_farbe: 0.5, regolith_farbton: 280 } },
  { id: 'schwefelmond', de: 'Schwefelmond (gelb-grün)', en: 'Sulphur moon (yellow-green)', hinweis: ['Exotisch: giftgelbe Ebenen, grüne Salzseen, schwarze Schlote.', 'Exotic: toxic yellow plains, green salt lakes, black vents.'], exotisch: true, w: {
    ...AUS('maria', 'rillen', 'einschlaege'), ...AN('seen', 'vulkane', 'tholin'), krater_dichte: 0.3, gelaende_hoehe: 0.006, regolith_farbton: 78, regolith_saett: 0.7, regolith_hell: 0.5, vulkane_dichte: 0.5, vulkane_schwefel: 0.2, vulkane_glut: 1.5, vulkane_aktiv: 0.2,
    seen_anteil: 0.35, seen_pol: 0.2, seen_farbton: 150, seen_dunkel: 0.3, tholin_farbton: 40, tholin_menge: 0.4 } },
];

export const vorlage = (id: string) => VORLAGEN.find((v) => v.id === id) ?? VORLAGEN[0];
export { AN, AUS };
