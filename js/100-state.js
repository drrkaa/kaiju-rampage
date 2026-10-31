// [js-split] ===== js/100-state.js: Run state G, game state machine variables, newGame(), xpNeed, banner =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// ----------------------------------------------------------------- STATE ---
let G = null;         // everything about the current run
let state = "title";  // title | play | levelup | over | win
const keys = {};
const mouse = { x: 0, y: 0, l: false, r: false };
let titleT = 0;
let paused = false, skipDt = false;
let confetti = [];
let DEBUG = {};

function newGame() {
  chunks.clear(); bState.clear(); smokers.clear(); clearCityLayout();      // a fresh city for every run
  G = {
    t: 0, kills: 0, destroyed: 0, shake: 0, shotId: 0, hitStop: 0,
    spawnAcc: 0, nextWave: SPAWN.waveEvery, nextBoss: 0, introT: 0, introBoss: null,
    xpTotal: 0, bldgXp: 0,
    enemies: [], xpLabels: [], xpPulse: 0, projs: [], parts: [], rings: [], hazards: [], swipes: [],
    zoom: CAMERA.startZoom, waves: [], stompWaves: [], crescents: [], dmgList: [], smoke: [], decals: [], flares: [], nums: [],
    banner: null, cam: { x: 0, y: 0 }, choices: [], hurtT: 0, iframe: 0, endT: 0,
    aim: { x: 100, y: 0 },
    P: {
      x: 0, y: 0, vx: 0, vy: 0, face: 0, walk: 0,
      hp: PLAYER.maxHp, maxHp: PLAYER.maxHp, speed: PLAYER.speed, regen: PLAYER.regen,
      armor: PLAYER.armor,
      charge: BREATH.startCharge, breathLock: 0, failT: 0, rmbPrev: false,
      tickT: 0, bw: BREATH_LV[0].width, bl: BREATH_LV[0].len,
      action: null, buffer: null, swipeCd: 0, swipeDir: 1,
      angVel: 0, stepPhase: 0, stepIdx: 0, stepPulse: 0, tremorT: TREMOR.interval,
      slots: [null, null, "roll"], cds: { roll: 0 },   // Q, E, Space; Space is always an evade (Roll by default)
      xp: 0, lvl: 1, up: { breath: 1 },   // the Atomic Breath is owned from the start
    },
  };
  G.cam.x = G.P.x; G.cam.y = G.P.y;
  banner("RAMPAGE!", 2);
}
const xpNeed = lvl => Math.floor((7 + lvl * 5 + lvl * lvl * 0.5) / XP_MULT);   // early levels come fast so weapons level up in the first minutes
function banner(text, t) { G.banner = { text, t, max: t }; }

