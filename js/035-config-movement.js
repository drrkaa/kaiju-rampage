"use strict"; // [movement chunk] constants for level-based movement growth, flying enemies and the Tremor visuals
// Level scaling of base movement: multiplier = 1 + perLevel * (player level - 1), capped. Stacks with the Swift Stomp card.
const MOVE_LEVEL = { speedPerLevel: 0.012, speedMax: 1.25, turnPerLevel: 0.03, turnMax: 1.55 };
// Flying enemies are untouched by ground-level effects (stomp bands, tremor pulse, footsteps, tail-spin ground sweep).
// A type is flying if it is listed here, or if its ETYPES entry / the enemy object has `flying: true`.
const FLYING_TYPES = { heli: true };
const FLY_FX = { underT: 0.45 };   // seconds a ground shock ring is shown rippling under a flying enemy's shadow
// Tremor ground disturbance (gameplay numbers stay in TREMOR). All cosmetic.
const TREMOR_FX = {
  crackLife: 1.1,        // cracks linger this long after propagation ends (s)
  cracks: 9,             // radial cracks per pulse
  debris: 9,             // hopping chips per pulse
  debrisHop: 26,         // peak hop height (px) of a chip
  dust: 14,              // dust puffs kicked up along the front
};
