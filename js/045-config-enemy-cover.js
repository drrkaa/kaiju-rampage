"use strict"; // classic script (no modules). Tunables for the "buildings are cover" feature (enemy line of sight, flanking, cover hint).
// Enemy shots are stopped by intact buildings (PROJ_BLOCK in 010). Ground shooters (tanks) only fire with a clear line
// of sight to the player; helicopters fly and shoot over buildings. Soldiers are melee and are unchanged.
const COVER = {
  losEvery: 0.22,        // seconds a cached line-of-sight result is reused per enemy (randomised +-20%); keeps 200+ enemies cheap
  losMaxRange: 700,      // beyond this distance an enemy is not tested (it is too far to shoot anyway)
  reload: 0.5,           // a tank that just regained line of sight waits at least this long before its first shot
  flankRadii: [260, 170],// distances from the player at which a tank looks for a firing position
  flankSteps: [0.45, 0.9, 1.35, 1.8, 2.3], // angular offsets (rad, both sides) around the player tried when searching for a clear spot
  commitT: 1.6,          // seconds a chosen firing position is kept (no jitter); re-planned after this or on arrival
  arriveDist: 24,        // reached the firing position
};
// One-time hint "Buildings block enemy fire: use cover!"
const COVER_HINT = {
  text: "Buildings block enemy fire: use cover!",
  storageKey: "kaiju.hintCover",   // localStorage flag: shown once per browser (wrapped in try/catch)
  crowd: 5,              // this many ranged enemies with a clear line of sight within crowdRadius triggers the hint ...
  crowdRadius: 520,
  onBlock: true,         // ... or the first enemy shot blocked by a building near the player
  blockNear: 700,
  coverGrace: 10,        // skip the crowd trigger if the player had a building between itself and a shooter within this many seconds
  checkEvery: 0.5,       // seconds between crowd checks
  minTime: 20,           // never before this run time (s)
  show: 4.5,             // seconds the hint is on screen
};
