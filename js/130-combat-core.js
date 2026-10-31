// [js-split] ===== js/130-combat-core.js: Damage/kill/XP/level-up core, projectiles, one-action-at-a-time framework, swipe/breath stat helpers =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// ----------------------------------------------------------------- COMBAT ---
function hurtPlayer(d) {
  const P = G.P;
  if (paused || state !== "play") return;
  if (G.iframe > 0 || DEBUG.god) return;
  const early = lerp(PLAYER.earlyHitMul, 1, clamp((P.lvl - 1) / (PLAYER.earlyHitEndLevel - 1), 0, 1));
  P.hp -= Math.max(1, d - P.armor) * early;
  G.iframe = 0.3; G.hurtT = 0.25; G.shake = Math.max(G.shake, 4);
}

function damageEnemy(e, d, kx, ky) {
  if (e.dead || paused || state === "levelup") return;
  d *= G.P.dmgMul || 1;                              // Savagery card (255-cards-extra.js)
  if (e.def && e.tired) d *= BOSS_REST_DMG_MUL;
  if (e.inv || e.intro > 0) { e.flash = 0.04; return; }
  e.hp -= d; e.flash = 0.08;
  const kb = e.def ? 0.1 : 1;
  e.kx += (kx || 0) * kb; e.ky += (ky || 0) * kb;
  if (Math.abs(kx || 0) + Math.abs(ky || 0) > 200) e.trail = 0.4;
  if (e.type !== "soldier") {                       // throttled floating damage numbers
    e.acc = (e.acc || 0) + d;
    if (!(e.numT > 0)) { pushNum(e.x, e.y - e.r, e.acc, e.def ? "#ffcc88" : "#ffffff"); e.acc = 0; e.numT = 0.3; }
  }
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  e.dead = true; G.kills++;
  sfx("kill");
  const isBoss = !!e.def;
  if (isBoss) G.lastBossDeath = G.t;
  const xp = isBoss ? e.def.xp : ETYPES[e.type].xp;
  gainCharge(isBoss ? CHARGE.kill.boss : CHARGE.kill[e.type]);   // charge is earned by fighting
  awardXp(xp, e.x, e.y);                            // XP goes straight to the player, whatever killed the enemy
  const big = isBoss ? 60 : e.type === "soldier" ? 9 : 14;
  for (let i = 0; i < big; i++)
    addParticle(e.x, e.y, rnd(-170, 170), rnd(-170, 170), rnd(0.3, 0.8), rnd(2, 5), e.type === "soldier" ? (i % 3 ? "#ffa11f" : "#8a6a30") : i % 2 ? "#fb3" : "#f63");
  if (isBoss) {
    onBossKilled(e);                                // player look: queue the next form (205-player-look.js)
    G.hazards = G.hazards.filter(h => h.owner !== e);
    G.projs.length = 0;
    G.shake = 25;
    G.rings.push({ x: e.x, y: e.y, r: 20, max: 300, t: 0, c: "255,240,160" });
    if (e.def.id === "omega") {
      state = "win"; G.endT = 0; confetti = []; startFinalVictory(e);
      for (let i = 0; i < 160; i++) confetti.push({ x: Math.random() * W, y: rnd(-H, 0), vy: rnd(60, 160), vx: rnd(-30, 30),
        s: rnd(4, 9), c: `hsl(${Math.floor(rnd(0, 360))},90%,60%)`, r: rnd(0, 6) });
    } else {
      banner(e.def.name + " DEFEATED!", 3);
      G.P.hp = Math.min(G.P.maxHp, G.P.hp + G.P.maxHp * 0.35);
    }
  }
}

// XP is instant: bar pulse always, a small merged "+N" label only for bigger kills (tanks / helis / bosses).
function awardXp(v, x, y, forceLabel) {
  const g = gainXp(v);   // returns the XP actually gained (after XP_GAIN_MUL)
  G.xpPulse = 1;
  if (forceLabel || v >= XP_LABEL.minXp) {
    const L = G.xpLabels.find(q => q.age < XP_LABEL.mergeWindow);
    if (L) { L.v += g; L.x = x; L.y = y; }
    else if (G.xpLabels.length < XP_LABEL.maxLabels) G.xpLabels.push({ v: g, x, y, age: 0, t: 0.9 });
  }
  return g;
}
function gainXp(v) {
  const P = G.P, g = v * XP_MULT * XP_GAIN_MUL;
  P.xp += g; G.xpTotal += g;
  checkLevelUp();
  return g;
}
let inPlayUpdate = false;               // true while updatePlay runs: level-ups are deferred to the END of the frame so no
function checkLevelUp() {               // mid-frame state flip can leave channels / loops applying damage on a frozen game
  const P = G.P;
  if (inPlayUpdate) { G.pendingLevel = true; return; }
  if (state === "play" && P.xp >= xpNeed(P.lvl)) {
    P.xp -= xpNeed(P.lvl); P.lvl++;
    P.hp = Math.min(P.maxHp, P.hp + P.maxHp * LEVELUP_HEAL);
    G.choices = rollChoices();
    if (G.choices.length) { state = "levelup"; G.luT = 0; resetInput(); P.buffer = null; }   // nothing held / buffered carries into the card screen
  }
}
function fireProj(x, y, ang, speed, dmg, r, life, color, air) {   // air: flies over buildings (helicopter shots)
  if (G.projs.length >= MAX_PROJECTILES) return;
  G.projs.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, dmg, r, life, color, grace: 0.3, air: !!air });   // grace: ignore walls briefly (shooter may stand in a building)
}

// ---- player attacks -------------------------------------------------------
// ONE ACTION AT A TIME: P.action = {type, t, dur, ...} or null. Every attack/ability
// requires canAct(); presses made while busy are buffered for ACTION_BUFFER seconds.
const hasBreath = () => !!G.P.up.breath;
const swipeLevel = () => 1 + (G.P.up.swipe || 0);
const swipeStats = () => SWIPE_LV[Math.min(swipeLevel(), SWIPE_LV.length) - 1];
const swipeCdNow = () => swipeStats().cd;
const breathLevel = () => G.P.up.breath || 0;
const breathStats = () => BREATH_LV[clamp(breathLevel(), 1, BREATH_LV.length) - 1];
// [move multiplier, turn-rate multiplier] while an action runs
const ACTION_MODS = {
  swipe: [SWIPE.moveMul, SWIPE.turnMul], breath: [BREATH.moveMul, BREATH.turnMul],
  roar: [0, 0.2], stomp: [0, 0.2], mega: [0.25, 0.2], tailspin: [TAILSPIN.moveMul, 0], dash: [1, 1], roll: [1, 1], jump: [1, 1],
};
const canAct = () => !G.P.action;
function startAction(type, dur, extra) { G.P.action = Object.assign({ type, t: 0, dur }, extra || {}); G.P.buffer = null; }

function pushNum(x, y, v, color) {
  if (!FX.damageNumbers || G.nums.length >= 50) return;
  G.nums.push({ x: x + rnd(-8, 8), y, v: Math.round(v), t: 0.7, color });
}

