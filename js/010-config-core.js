// [js-split] ===== js/010-config-core.js: Tunable constants: title/victory text, entity caps, XP, enemy navigation, city layout =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict";
/* ==========================================================================
   KAIJU RAMPAGE - a survivors-like with a giant not-Godzilla lizard.
   Single file, Canvas 2D, no assets, no network.

   CONTROLS: WASD move (heavy: slower sideways/backwards) | mouse aims, the kaiju turns slowly
             LEFT CLICK = heavy claw swipe | RIGHT CLICK (hold) = atomic breath (charge tank)
             Q / E / SPACE = abilities (unlocked via level-up cards) | M = mute
             Only ONE action at a time (swipe / breath / abilities lock each other out).

   DEBUG / CHEAT URL HASH (reload after changing), e.g.  index.html#t=170&lv=8
     #t=170    start the run clock at 170s (bosses arrive at 180s, 360s, 600s)
     #lv=8     start with 8 free upgrades (claw, 3 abilities, then stat upgrades)
     #wl=N     set both weapon levels (Swipe + Atomic Breath) to N (1-6)
     #boss=N   jump to boss N (1 Ragehorn, 2 Voltgaze, 3 Omega Tyrant) with a loadout
     #god=1    take no damage
   ========================================================================== */

// ---------------------------------------------------------------- CONFIG ---
const GAME_TITLE = "KAIJU RAMPAGE";
const WIN_SUBTITLE = "The Omega Tyrant has fallen. You are the apex predator now.";

const MAX_ENEMIES = 200;          // hard cap on live regular enemies (bosses are extra)
const MAX_ENEMIES_BOSS = 10;      // cap on regular enemies while a boss is alive
const MAX_PARTICLES = 450;
const MAX_PROJECTILES = 250;
const MAX_HAZARDS = 80;
const XP_MULT = 1.0;              // global XP multiplier (tune run length / level count)
const XP_GAIN_MUL = 0.88;         // multiplier on the XP of every kill (XP is awarded instantly, no orbs)
const XP_LABEL = { minXp: 3, mergeWindow: 0.25, maxLabels: 6 };   // floating "+N" only for bigger kills; merged + capped
// Ground-enemy navigation around solid buildings (helicopters fly, bosses bulldoze).
const ENEMY_NAV = {
  collide: true, steer: true, tangent: false, validate: false,   // tangent / validate: experimental steering refinements (off: simpler was better in tests)
  range: 300,             // enemies within (half screen diagonal + range) of the player get collision / steering (cost budget)
  lookAhead: 40,          // px probed ahead of an enemy to detect a wall
  commit: 0.5,            // seconds a detour direction is kept (hysteresis)
  stuckTime: 1.0, stuckProgress: 0.25,   // if it moves < speed*stuckProgress px in stuckTime seconds, pick a random detour
  soldierSpeedMul: 1.1,   // mild compensation for walls slowing the swarm
  spawnTries: 4,
};
// XP for destroying a building (instant, once per building): base + footprint area * perArea + height * perHeight, clamped.
const BLDG_XP = { base: 1, perArea: 0.0003, perHeight: 0.08, min: 2, max: 8 };
const PROJ_BLOCK = true, PROJ_BLOCK_DMG = 2;   // enemy projectiles are stopped by intact buildings (damage = projectile damage * this)
const BOSS_BLDG = { dps: 120, chargeDps: 400, capDps: 700 };   // bosses walk through buildings; damage per building / total cap (per second)

// City layout. A block is BLOCK x BLOCK; streets are STREET wide and centred on block edges.
const BLOCK = 224, STREET = 48, CHUNK = BLOCK * 2;
const CHUNK_CANVAS_KEEP = 600;    // frames a chunk's cached canvas survives when off screen
const CHUNK_DATA_MAX = 500;       // max chunk records kept (oldest-seen dropped)

