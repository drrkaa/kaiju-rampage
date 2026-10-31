// ===== js/035-config-beams.js: Tunable constants: charge meter (earned by fighting), heavy beams (Mega Beam / Super Laser), beam screen-dim, final-boss tease =====
// Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict";
// ---- CHARGE METER (the central mechanic) -------------------------------------------------------------------------------
// The 0-100 charge tank (G.P.charge) powers the Atomic Breath (needs BREATH.minStart) and the Super Laser (needs SUPERLASER.minCharge).
// The swipe is free. Charge refills passively via BREATH.chargeRate (020); combat earnings are disabled.
// All gains are multiplied by the Atomic Breath level's `charge` factor (BREATH_LV), so the meter fills faster as you level (eases the game off).
const CHARGE = {
  earn: false,              // false = hits / kills / buildings no longer fill the meter (it only refills passively: BREATH.chargeRate in 020). true restores the old earned charge.
  hit: 0.4,                 // per enemy struck by a claw swipe / follow-up
  kill: { soldier: 0.8, tank: 3.5, heli: 3.0, boss: 20 },   // per kill, by enemy type
  building: 3.0,            // per building destroyed
  breathMul: 0.4,           // gains are multiplied by this while the breath beam is firing (so the beam can never pay for itself)
  flashDecay: 3.5,          // HUD: flash-on-gain fade speed (1/s)
  readyPulse: 0.9,          // HUD: seconds of the "now usable" pulse when the meter crosses a threshold
  hudW: 520, hudH: 22,      // HUD: bar size (px) at the bottom centre, above the ability slots
};
// ---- HEAVY BEAMS (Mega Beam + Super Laser share one code path: 165-ability-superlaser.js update, 245-draw-beams.js draw) ----
// Phases (seconds): `charge` build-up (inhale glow, converging ring, screen dims in) -> `active` full beam -> `taper` the beam narrows,
// dims and flickers out (damage tapers with it; embers + a lingering scorch + a fading afterglow stay behind).
// len = beam length px, halfW = damage half-width px, tick = seconds between damage ticks, dmg/bldg = damage per tick to enemies/buildings,
// drawW/coreW = outer/core drawn widths, dim = how dark the screen gets (0-1) at full build-up, rgb = glow colours "r,g,b" (outer, mid, core).
const MEGA = { cost: 45, minCharge: 45, charge: 0.9, active: 0.6, taper: 0.7, len: 650, halfW: 55, tick: 0.06, dmg: 66, bldg: 180, knock: 120, shake: 5,
               drawW: 130, coreW: 55, dim: 0, rgb: ["30,110,255", "60,160,255", "230,255,255"], embers: ["#9ff", "#fff", "#6cf"] };
// Super Laser drains its cost evenly during active + taper; build-up reserves the full cost.
// Super Laser: Lv3+ of the Super Laser level-up card (see HEAVY_LV below). Costs `cost` charge, needs `minCharge` to fire.
const SUPERLASER = { cost: 75, minCharge: 75, gradualDrain: true, cd: 0, charge: 1.3, active: 1.1, taper: 0.9, len: 1700, halfW: 105, tick: 0.06, dmg: 88.2, bldg: 189, knock: 160,
                     shake: 9, drawW: 250, coreW: 105, dim: 0.62, rgb: ["170,60,255", "255,110,200", "255,245,255"], embers: ["#fcf", "#fff", "#ffb3e6"],
                     bannerTime: 4.5 };
const BEAM_SPECS = { mega: MEGA, superlaser: SUPERLASER };
// ---- SUPER LASER CARD LEVELS (index = card level - 1). One level-up card with levels; the ability sits in a Q/E slot. ----
// beam: which spec fires ("mega" = Mega Beam: 45 charge, no screen darkening; "superlaser" = screen-darkening insane laser, costs charge).
// pow: damage multiplier, cd: 0 (charge replaces cooldown). Level 3 is the transformation into the Super Laser.
const HEAVY_LV = [
  { beam: "mega", pow: 1.0, cd: 0 },
  { beam: "mega", pow: 1.35, cd: 0 },
  { beam: "superlaser", pow: 1.0, cd: 0 },
  { beam: "superlaser", pow: 1.3, cd: 0 },
];
const BEAM_FX = {
  dimFlat: 0.8,             // flat darkness = spec.dim * this (alpha of the full-screen black-blue layer)
  dimVignette: 1.0,         // extra edge darkness (cached radial-gradient image) = spec.dim * this
  taperWidthPow: 0.65,      // beam width while tapering = (k ^ this), k going 1 -> 0
  taperFlicker: 0.55,       // chance scale of the beam dropping to a dim frame while tapering (grows as it fades)
  emberRate: 140,           // embers/second along the beam path while tapering (x k)
  scorchSpacing: 70,        // px between lingering scorch marks along the path after the shot
  scorchMax: 18, scorchLife: 14, decalBudget: 130,   // marks per shot, seconds they stay, never push G.decals above this
  glowTime: 0.9,            // afterglow line fades over this long after the beam ends
  glowMax: 4,
};
// ---- FINAL BOSS TEASE --------------------------------------------------------------------------------------------------
const TEASE = {
  runBanner: 5.5,           // seconds the "Omega Tyrant awaits" line shows at the start of every run
  titleLine: "Defeat the Omega Tyrant",
  timelineW: 320,           // HUD timeline strip width (px), centred under the timer
};
