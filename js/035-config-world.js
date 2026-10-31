// ===== js/035-config-world.js: Tunable constants for the WORLD & GROUND feature set (car destruction, footprints/stomp marks, ground wear) =====
"use strict";
// ---- Cars destroyed by attacks (085-world-cars.js). Walking over cars still crushes them (crushCars in 080).
const WORLD_CARS = {
  xp: 0,              // XP per car destroyed by an attack (0 = none; cars are finite, so any small value cannot be farmed)
  flyMax: 14,         // max cars in flight at once (flip animation); beyond that wrecks just appear
  flyTime: 0.55,      // seconds a launched car spends in the air
  flyHeight: 30,      // peak lift in px
  flySpeed: 150,      // sideways launch speed (px/s), away from the attacker
  fireMax: 14,        // max burning wrecks at once
  fireLife: 6,        // seconds a wreck keeps burning/smoking (fades out over this time)
  sparks: 8,          // spark particles on impact
  shake: 1.5,         // screen shake added per car
  hazardTick: 0.12,   // seconds between car checks for a boss hazard that stays active
};
// ---- Footprints and stomp marks (175-world-marks.js): dynamic decals drawn with the world, never baked into the chunk canvases
const MARKS = {
  max: 420,           // ring buffer size (oldest overwritten)
  footLife: 30,       // seconds a footprint lasts (fades during the last 45% of it)
  footLen: 15, footWid: 8.5,   // footprint size in px before scaling
  scale: 1.15,        // kaiju scale (matches the drawn body scale in drawWorld)
  footAlpha: 0.42,    // peak darkness of a print
  stompLife: 45,      // seconds a stomp crater mark lasts
  stompAlpha: 0.55,   // peak darkness of the crater/cracks
  stompCrater: 34, stompCrack: 140,   // stomp mark: central crater radius and max crack length in px
  stompRing: 0.5,     // faint ring radius as a fraction of the stomp's outer radius
  tremorLife: 20,     // seconds a tremor crack mark lasts
  tremorMinGap: 4,    // a tremor within 50 px of a fresher tremor mark (younger than this many s) only adds wear, no new mark
  scuffLife: 14,      // tail spin / dash scuff streaks
  scuffEvery: 0.07,   // seconds between scuff streaks while spinning / dashing
};
// ---- Ground wear (086-world-ground.js): coarse tile grid accumulating wear, painted into the cached chunk canvases as an overlay
const WEAR = {
  tile: 28,           // px; CHUNK / tile must be an integer (448 / 28 = 16)
  maxTiles: 14000,    // capped Map size (oldest inserted dropped 1000 at a time)
  cap: 140,           // wear value ceiling per tile
  stages: [3, 14, 32, 64],   // wear needed for stage 1 (scuffed) / 2 (cracked) / 3 (broken) / 4 (crater/rubble)
  // crack look per stage (index 0 = stage 1): hairlines -> network -> wide branching cracks -> shattered
  crack: { count: [2, 3, 4, 5], segs: [3, 3, 4, 5], len: [4, 5, 6, 6], width: [1.5, 2.1, 2.7, 3.2], alpha: [0.65, 0.75, 0.85, 0.9] },
  idleRate: 0.35,     // wear per second deposited under the kaiju just by standing/walking there
  idleR: 26,
  walkRate: 9.6, walkR: 40, // extra persistent load along the body trail while actually moving
  step: 18, stepR: 44, stepChance: 0.6,      // wear per footstep and its radius
  stomp: 8, stompR: 170,    // wear for a Seismic Stomp impact (centre value, linear falloff)
  tremor: 1.5, tremorR: 0.55,  // wear per tremor pulse; radius as a fraction of the pulse radius
  breathRate: 2.4, breathR: 30,   // wear per second at the point where the beam hits the ground
  tailRate: 3.0, tailR: 26,       // wear per second under the spinning tail tip
  dashRate: 5, dashR: 28,         // wear per second while dashing
};
