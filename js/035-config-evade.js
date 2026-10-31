// ===== js/035-config-evade.js: Tunable constants: the Space evade slot (default Roll, replacements Tail Dash / Jump) =====
// Classic script (no modules). Used by 166-ability-evade.js. The Space slot ALWAYS holds an evade; Roll is the weak default and every
// replacement must stay better than it (longer reach and/or more invulnerability and/or damage). Tail Dash keeps its old numbers (160/190).
"use strict";
const EVADE = {
  roll: { dur: 0.22, dist: 130, iframe: 0.22, cd: 4.5 },   // default: short hop-roll, brief invulnerability, no damage
  dash: { dur: 0.18, dist: 280, iframe: 0.30, cd: 5 },     // Tail Dash (ABILS.dash.cd mirrors this): long, hits what it passes
  jump: { dur: 0.6, dist: 250, iframe: 0.6, cd: 6.5,       // Jump: long hop, invulnerable in the air, shockwave on landing
          landRadius: 120, landDmg: 32, landKnock: 260, landBldg: 70, landShake: 12, lift: 46 },   // lift = visual height in px at the peak
  offerLevelUps: [1, 4],     // level-up numbers at which an evade replacement card is guaranteed while the default Roll is still equipped
};
