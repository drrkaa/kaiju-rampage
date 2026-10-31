// [js-split] ===== js/020-config-player-weapons.js: Tunable constants: PLAYER base stats, BREATH, SWIPE_LV/BREATH_LV level tables, SWIPE, MOVE =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
const PLAYER = {                  // base stats (upgrades modify a copy)
  radius: 28, maxHp: 130, speed: 180, regen: 0.6,
  armor: 0,
  earlyHitMul: 2, earlyHitEndLevel: 8, // doubles initial damage, returns to normal by level 8
};
// Defensive level-up cards (kept to two on purpose). Tough Hide merges max HP and armor.
const DEFENSE = {
  hideMax: 6, hideHp: 25, hideArmor: 0.5,     // Tough Hide: max levels, +max HP per level, armor per level (damage reduction per hit)
  regenMax: 4, regen: 0.8,                    // Regeneration: max levels, HP per second per level
};
// Atomic breath (hold RMB): a "charge tank" 0-100 that fills passively. Breath can START
// at >= minStart, then drains while held; release early to keep the rest. A fuller tank
// means more damage / wider / longer beam (dmg*, width*, len* lerp between Min and Max).
const BREATH = {
  startCharge: 100,       // tank at the start of a run (the breath is owned from the start)
  chargeRate: 6,          // tank units per second when not breathing (25% lower); shared by breath and heavy lasers
  standMul: 1.5,          // charge-rate multiplier while standing still
  minStart: 3,           // minimum tank needed to begin a breath
  drain: 44,              // tank units per second while breathing (2x the previous 22)
  tick: 0.1,              // seconds between damage ticks
  dmgMin: 0.6, dmgMax: 1.5, widthMin: 0.75, widthMax: 1.2, lenMin: 0.75, lenMax: 1.1,   // tank-fullness scaling
  bldgMul: 3.2,           // building damage per tick = tick damage * this (a typical building falls in ~1.5s of breath at Lv1)
  moveMul: 0.4,           // move speed multiplier while breathing: a slow shuffle (was rooted at 0.1)
  turnMul: 0.45,          // turn-rate multiplier while breathing (1.5x the old 0.3)
  recoil: 2.0,            // screen shake while breathing
  relockTime: 0.9,        // lockout after the exhale before the next breath can start (no mashing)
  // A committed attack: wind-up (cancel = penalty) -> beam (minimum duration, ramps up) -> exhale recovery -> lockout.
  windup: 0.15,           // seconds of inhale before the beam fires (grounded, action lock applies)
  cancelCost: 10, cancelLock: 0.4,   // releasing RMB during the wind-up: tank units lost, re-press lockout (s)
  rampFrom: 0.6, rampTime: 0.25,     // beam damage/width starts at 60% and reaches 100% after 0.25s of continuous fire
  minFire: 0.5,           // beam keeps firing at least this long even if RMB is released
  exhale: 0.3,            // recovery after the beam ends (cannot act)
  lenPerPlayerLevel: 0.008, lenPlayerMax: 1.15,   // extra beam length: +0.8% per player level, capped at x1.15 (keeps the beam useful while the camera zooms out as you grow)
};
// ---- WEAPON LEVEL TABLES (index = weapon level - 1). Both weapons max out at level 6. ----
// Swipe (LMB, always owned at Lv1): reach px, arc radians (hit cone == drawn slash), damage, cooldown s.
//   Lv3 bonus: follow-up slash shortly after the first.  Lv6 bonus: crescent wave flies forward.
const SWIPE_LV = [
  { range: 112, arc: 1.5, dmg: 22, cd: 0.66 },
  { range: 135, arc: 1.7, dmg: 28, cd: 0.63 },
  { range: 158, arc: 1.9, dmg: 34, cd: 0.60 },
  { range: 180, arc: 2.0, dmg: 42, cd: 0.57 },
  { range: 203, arc: 2.1, dmg: 50, cd: 0.54 },
  { range: 225, arc: 2.3, dmg: 60, cd: 0.51 },
];
// Atomic Breath (RMB, unlocked by card = Lv1): damage per 0.1s tick, beam width, beam length (px at full tank),
// drain = tank drain multiplier (lower = more efficient), charge = passive tank charge-rate multiplier.
//   Lv3 bonus: burns enemies (damage over time).  Lv6 bonus: bigger beam with a stronger visual.
const BREATH_LV = [
  { dmg: 6.0, width: 26, len: 220, drain: 1.00, charge: 1.0 },
  { dmg: 9.0, width: 30, len: 255, drain: 0.95, charge: 1.1 },
  { dmg: 12.6, width: 34, len: 290, drain: 0.90, charge: 1.2 },
  { dmg: 18.0, width: 38, len: 330, drain: 0.85, charge: 1.3 },
  { dmg: 22.5, width: 42, len: 365, drain: 0.80, charge: 1.4 },
  { dmg: 28.5, width: 50, len: 405, drain: 0.75, charge: 1.5 },
];
// Default attack (LMB): claw swipe. Total animation = wind + strike + recover.
const SWIPE = {
  wind: 0.10, strike: 0.10, recover: 0.20,   // total action lock ~0.4s
  knock: 300,
  handOffset: 26, handForward: 18, sideAngle: 0.36, // sprite-space hand origins; growth-scaled, hit cone stays centered on aim
  followDelay: 0.10,      // Lv3 follow-up slash comes this long after the strike
  waveSpeed: 520, waveLife: 0.65, waveDmgMul: 0.6,   // Lv6 crescent wave
  waveWidthMul: 0.55, waveMaxHalfWidth: 130,        // crescent half-width = min(range*mul, max)
  lunge: 11,               // px the body lunges forward on the strike (visual)
  moveMul: 0.5, turnMul: 0.4,    // movement / turning while swiping (after the aim-assisted wind-up)
  hitStop: 0.06,          // freeze-frame seconds when a swipe connects
  hastePerLevel: 0.06,    // each Claws card level also makes the swipe cooldown recover this much faster (folded in from the removed Swift Claws card)
};
// Hefty movement
const MOVE = {
  turnRate: 3.4,          // base max turn speed (rad/s) toward the cursor
  turnAccel: 24, turnDecel: 30,   // angular acceleration / braking (rad/s^2): weighty ease-in and ease-out, no overshoot
  turnGain: 14,           // near the target the turn speed is proportional to the remaining angle (precise aiming)
  turnStillMul: 1.4, turnRunMul: 0.85,   // turn-rate multiplier when standing still / at full run speed
  swipeAimMul: 1.8,       // extra turn rate (and no acceleration limit) during the swipe wind-up: aim assist
  leanMax: 1, pivotDust: 3.0,   // visual lean strength; angular speed (rad/s) above which pivot dust is kicked up
  frontCone: 0.52,        // radians (~30 deg) of full speed; wider smooth transition toward sideways
  sideMul: 0.65, backMul: 0.9,    // gentler sideways penalty at 90 deg; smooth recovery toward backwards
  accel: 650, decel: 900, // px/s^2
  stride: 70,             // px per footstep
  stepShake: 1.6, stepDust: 3, stepDmg: 8, stepRadius: 34,
  camLead: 70,            // camera leads toward facing by this many px
  collideRadius: 22,      // player vs building collision radius
  bulldoze: 0,            // chip damage/sec while merely pushing into a building (0 = none: only a real ram hurts)
  ramSpeed: 125,           // px/s of speed INTO the wall needed for an impact (full run is 180)
  ramDmg: 34,             // building damage of one impact at full run speed (scaled by speed/P.speed, capped at ramMaxMul)
  ramMaxMul: 2,           // cap on that scaling (dash, tail-spin surges)
  ramRelease: 0.3,        // seconds without wall contact before the next ram can count (back off, then charge again)
};
