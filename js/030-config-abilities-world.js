// [js-split] ===== js/030-config-abilities-world.js: Tunable constants: ROAR, building damage stages/HP, STOMP, TAILSPIN, TREMOR, charge glow =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// Roar: inhale (lean back, chest swells, suction dust) -> short hold with mouth opening -> burst at `wind`
// (head snaps forward, first ring starts at the mouth) -> recover until `dur`.
const ROAR = { wind: 0.45, inhale: 0.28, snap: 0.12, dur: 0.85, radius: 230, stun: 1.6, knock: 750, mouthDist: 57, suction: 70 };
// Building damage presentation: HP-fraction thresholds for each visual stage, height lost per stage, etc.
const BLDG_STAGES = [0.85, 0.65, 0.40, 0.20];
const DEAD_STAGE = BLDG_STAGES.length + 1;
const BLDG_SAG = 0.12;            // fraction of height lost per damage stage
const BLDG_HP_MUL = 0.4;          // building health multiplier (1 = original)
const BLDG_HPBAR_TIME = 1.5;      // seconds the HP bar stays above a freshly damaged building
const BLDG_SHAKE_TIME = 0.15;     // hit flash / shake duration
const SMOKE = { max: 60, minStage: 3, rate: [0, 0, 0, 2.0, 4.0], viewMargin: 80 };   // puffs/sec per building by stage; global cap
const CHUNK_REDRAW_MIN_FRAMES = 15;   // a chunk's cached canvas is repainted at most ~4x per second
// Seismic Stomp (active, key-bound): after the wind-up a shockwave expands at `speed`; ONLY the bands are dangerous
// (band i spans [firstOffset + i*(bandWidth+gap), +bandWidth]); the gaps between them are safe. Each band hits a target once.
// Geometry: band 0 is the big inner zone [0, innerRadius] (grows innerPerLevel per level); then `gap` of calm ground, then
// (bands-1) thinner outer bands of bandWidth (+widthPerLevel per level) separated by `gap`. Total reach at Lv1 ~ 455px.
// A band is only dangerous while the shock front is crossing it (plus `frontWindow` px of slack, and at least one frame's travel).
const STOMP = { windup: 0.45, bands: 4, innerRadius: 115, innerPerLevel: 6, bandWidth: 34, widthPerLevel: 6, gap: 76, speed: 700, frontWindow: 12, dmg: 45, bldg: 150, knock: 380, fade: 0.55 };
// Tail Spin (ability): a mobile whirlwind. The kaiju spins for `dur` (longer per level) while moving at moveMul speed;
// the extended tail (length `reach`) damages whatever it actually touches, with strong damage along its length and a small tip bonus.
// Momentum feel (165-movement.js): moveMul = target speed multiplier while moving (x P.speed; 1.3 plus the sway averages ~1.4x); accel/decel = how fast the heavy
// body gains / sheds velocity (low = pendulum inertia); swayAccel = sideways tug (px/s^2, scaled by input) that swings with the tail angle;
// surge = +-fraction the target speed pulses along the held direction as the tail swings; idleSway = small drift (px/s^2) when no key is held.
// swayFreq = sway/surge cycles per spin radian (0.5 = one sway per ~two body turns, reads as a slow swing, not a buzz).
const TAILSPIN = { dur: 2.2, durPerLevel: 0.3, rate: 9, reach: 135, baseR: 12, width: 32, moveMul: 1.3, dmg: 26, tipMul: 1.2, tipFrac: 0.65,
                   knock: 520, bldg: 45, hitCd: 0.3, deflect: true,
                   accel: 330, decel: 230, swayAccel: 520, surge: 0.22, idleSway: 45, dustRate: 40, swayFreq: 0.5 };
// Tremor (passive card): short stomping pulses centred on the kaiju
const TREMOR = { interval: 1.5, radius: 170, radiusGrow: 25, dmg: 10, knock: 160, bldg: 26, life: 0.35 };
const CHARGE_FX_INTENSITY = 0.35;  // 0 = no breath-charge glow on the kaiju; raise to make it brighter

// Smooth colour rise, reaching its strong state early enough to linger during a discharge.
const BACK_GLOW = { start: .2, nearFull: .72 };
function backChargeGlow(charge) {
  const k = clamp((charge - BACK_GLOW.start) / (BACK_GLOW.nearFull - BACK_GLOW.start), 0, 1);
  return k * k * (3 - 2 * k);
}
function chargedSpikeColor(base, charge) {
  const k = backChargeGlow(charge), rgb = base.replace("#", "");
  const channels = [0, 2, 4].map(i => parseInt(rgb.slice(i, i + 2), 16));
  return `rgb(${channels.map((v, i) => Math.round(lerp(v, [180, 237, 255][i], k))).join(",")})`;
}
