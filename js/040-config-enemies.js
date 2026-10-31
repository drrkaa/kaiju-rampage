// [js-split] ===== js/040-config-enemies.js: Tunable constants: enemy look (scale/outline/colors), FX, SPAWN + SPAWN_CURVE, ETYPES, BOSSES =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// ---- ENEMY READABILITY (outlined cached sprites, saturated palette, shadows) ----
const ENEMY_SCALE = 0.75;                             // visual size multiplier; the hit radii in ETYPES below are matched to it (soldiers should feel like flies next to the kaiju)
const ENEMY_OUTLINE = { width: 2.2, color: "#0b0e13" };  // outline px (final screen px, independent of ENEMY_SCALE) around every enemy sprite; keeps the small units readable on the map
const ENEMY_SHADOW = { alpha: 0.32, dx: 3, dy: 5, heliDx: 10, heliDy: 18 };   // soft drop shadows (batched into one path)
const ENEMY_SPRITE = { buckets: 24, soldierBuckets: 16, res: 2 };           // rotation buckets per cached sprite, sprite pixel density
const ENEMY_AIDS = { hpBar: true, warnRing: true };   // small HP bar when damaged (tank/heli); red ring just before they shoot
const ENEMY_COLORS = { soldier: "#ffa11f", helmet: "#3d4f1c", tank: "#c8402d", turret: "#f0643f", treads: "#2b1a18", heli: "#d6f1ff", heliDark: "#8fc7e6", glass: "#2c86c8" };
const FX = { damageNumbers: true, sound: true };
const ACTION_BUFFER = 0.15;       // seconds an early click/key press is remembered
const BSTATE_MAX = 40000;         // max persisted damaged-building records
const LEVELUP_HEAL = 0.2;         // fraction of max HP restored on level up

const SPAWN = {
  hpGrowth: 1 / 600,    // enemy HP multiplier growth per second (x2 at 10:00): gentle, power comes from the player
  dmgGrowth: 1 / 700,   // enemy damage growth per second
  waveEvery: 50,        // seconds between small soldier rings
  waveSize: 14,
  liveCaps: { heli: 6, mortar: 3 }, // ordinary spawns: prevent ranged units accumulating into swarms
};
// SPAWN CURVE: keyframes [time s, enemies spawned per second, tank share, heli share], linearly interpolated.
// Keep the opening approachable, then build sustained pressure as player upgrades accumulate.
// Mid/late rates are roughly 18-30% above the former plateau, capped at 4.3/s.
// Tanks start around 1:00, helicopters around 1:45, both in small numbers first.
const SPAWN_CURVE = [
  [0,   1.2, 0.00, 0.00],
  [45,  2.2, 0.00, 0.00],
  [60,  2.4, 0.04, 0.00],
  [105, 2.8, 0.08, 0.00],
  [150, 3.3, 0.11, 0.015],
  [180, 3.7, 0.14, 0.03],
  [300, 4.0, 0.20, 0.05],
  [450, 4.2, 0.22, 0.065],
  [600, 4.3, 0.22, 0.075],
];
// Ranged attack cadence and shell speed/damage live together for balance passes.
const ENEMY_SHOTS = {
  tank: { cooldown: 3, speed: 210, damage: 9 },
  heli: { cooldown: 2, speed: 220, damage: 5 },
};
const MORTAR = { start: 240, share: 0.06, range: 650, keepRange: 380, cooldown: 5.6, warn: 1.6, radius: 52, damage: 13 };
const BOSS_SPAWN_MUL = 0.04;        // regular spawn rate multiplier while a boss is alive (a tiny trickle, no waves)
const BOSS_CLEAR_TIME = 3;          // regular enemies flee + fade out over this long when a boss intro starts
const POST_BOSS_RAMP = 20;          // seconds for regular spawns to ramp back to full after a boss dies
function spawnCurve(t) {
  const K = SPAWN_CURVE;
  if (t <= K[0][0]) return { rate: K[0][1], tank: K[0][2], heli: K[0][3] };
  for (let i = 1; i < K.length; i++) if (t <= K[i][0]) {
    const a = K[i - 1], b = K[i], u = (t - a[0]) / (b[0] - a[0]);
    return { rate: lerp(a[1], b[1], u), tank: lerp(a[2], b[2], u), heli: lerp(a[3], b[3], u) };
  }
  const l = K[K.length - 1]; return { rate: l[1], tank: l[2], heli: l[3] };
}

const ETYPES = {
  soldier: { r: 5,  hp: 6,  speed: 72,  dmg: 5, xp: 1.5 },
  tank:    { r: 11, hp: 36, speed: 42,  dmg: 8, xp: 6 },
  heli:    { r: 9,  hp: 12, speed: 120, dmg: 5, xp: 3.5 },
  mortar:  { r: 12, hp: 45, speed: 28, dmg: 6, xp: 8 },
  boss:    { r: 60, hp: 1000, speed: 80, dmg: 18, xp: 100 },
};

// Boss schedule + definitions. Attack lists per phase are picked at random.
const BOSS_TIMES = [180, 360, 600];
const BOSS_ZOOM = 0.82;             // camera zoom-out while a boss is alive (so the whole fight is visible)
const BOSS_HP_MUL = 0.4;             // 60% less health: shorter fights with longer attack chains
const BOSS_ADDS_MAX = 6;            // max live adds from boss summon attacks
const BOSS_REST_DMG_MUL = 1.25;     // damage multiplier while a boss is tired (rest window after a combo)
// attacks[phase] = [[name, weight], ...]; a boss never repeats the same attack twice in a row. combo[phase] = attacks
// per combo before a rest window of rest[phase] seconds (tired + vulnerable). idle[phase] = pause between attacks.
// phaseAt = HP fractions where the next phase begins (brief invulnerable roar, new attacks, faster).
const BOSSES = [
  { id: "ragehorn", name: "RAGEHORN", sub: "A charging brute with a nasty temper", hp: 4200, r: 52, contact: 20, tint: "255,90,40",
    style: "horned", body: "#b8421f", belly: "#e8a070", spine: "#ffd15a",
    phaseAt: [0.5], combo: [3, 4], rest: [1.6, 1.3], idle: [0.65, 0.45], moveSpeed: [80, 95],
    attacks: [[["charge", 3], ["spin", 2], ["slam", 2], ["leap", 2]],
              [["charge", 3], ["dcharge", 2], ["rubble", 3], ["leap", 2], ["spin", 2]]], xp: 150 },
  { id: "voltgaze", name: "VOLTGAZE", sub: "Keeps its distance. Spits lightning.", hp: 5500, r: 58, contact: 16, tint: "60,160,255",
    style: "spitter", body: "#2c6f93", belly: "#9fd8e8", spine: "#5ff0ff",
    phaseAt: [0.66, 0.33], combo: [3, 4, 5], rest: [1.2, 1.0, 0.9], idle: [0.6, 0.45, 0.35], moveSpeed: [100, 110, 125],
    attacks: [[["lightning", 3], ["slam", 2]],
              [["lightning", 3], ["storm", 2], ["rubble", 2]],
              [["storm", 3], ["rain", 3], ["summon", 1], ["lightning", 2]]], xp: 250 },
  { id: "omega", name: "OMEGA TYRANT", sub: "Your greatest rival. Only one apex predator.", hp: 12000, r: 74, contact: 24, tint: "255,212,86",
    style: "dragon", body: "#ba9b3e", belly: "#55401f", spine: "#fff0b1",
    phaseAt: [0.66, 0.33], combo: [3, 4, 5], rest: [1.3, 1.1, 0.9], idle: [0.65, 0.45, 0.3], moveSpeed: [75, 90, 115],
    attacks: [[["charge", 3], ["burst", 2], ["spin", 2], ["rubble", 2]],
              [["beam", 3], ["slam", 2], ["charge", 2], ["summon", 2], ["burst", 2], ["leap", 2]],
              [["beam", 2], ["rain", 3], ["dcharge", 2], ["spiral", 3], ["burst", 2], ["spin", 2], ["slam", 2]]], xp: 400 },
];

