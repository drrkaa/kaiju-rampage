// [js-split] ===== js/190-update.js: Per-frame simulation: enemy grid, separation, updateEnemy, updatePlay, updateIdle =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// ----------------------------------------------------------------- UPDATE ---
const GRID = 40;
let grid = new Map();
function buildGrid(list) {
  grid = new Map();
  for (const e of list) {
    const k = Math.floor(e.x / GRID) * 100003 + Math.floor(e.y / GRID);
    const a = grid.get(k);
    if (a) a.push(e); else grid.set(k, [e]);
  }
}
let dtGlobal = 0.016;
function separate(e) {
  if (e.def) return;
  const gx = Math.floor(e.x / GRID), gy = Math.floor(e.y / GRID);
  let px = 0, py = 0;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const a = grid.get((gx + i) * 100003 + gy + j);
    if (!a) continue;
    for (const o of a) {
      if (o === e) continue;
      const dx = e.x - o.x, dy = e.y - o.y, m = e.r + o.r;
      const d2 = dx * dx + dy * dy;
      if (d2 < m * m && d2 > 0.01) {
        const d = Math.sqrt(d2), push = (m - d) / m;
        px += (dx / d) * push; py += (dy / d) * push;
      }
    }
  }
  e.x += px * 90 * dtGlobal; e.y += py * 90 * dtGlobal;
}

function updateEnemy(e, dt) {
  if (e.def) { updateBoss(e, dt); return; }
  const P = G.P;
  if (e.fleeT > 0) {                                  // boss intro: clear the arena smoothly (flee + fade, no XP)
    e.fleeT -= dt; e.alpha = clamp(e.fleeT / 1, 0, 1);
    const fx = e.x - P.x, fy = e.y - P.y, fd = Math.hypot(fx, fy) || 1;
    e.x += (fx / fd) * e.speed * 1.5 * dt; e.y += (fy / fd) * e.speed * 1.5 * dt; e.ang = Math.atan2(fy, fx) + Math.PI;
    if (e.fleeT <= 0) e.dead = true;
    return;
  }
  const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d;
  e.ang = Math.atan2(dy, dx);
  e.cT -= dt;
  e.flash = Math.max(0, e.flash - dt); e.hitCd -= dt; e.cd -= dt; e.t += dt; e.numT -= dt; e.trail = Math.max(0, (e.trail || 0) - dt);
  const decay = Math.exp(-6 * dt);
  {                                                 // knockback, in <=10px sub-steps for ground units so walls can't be tunnelled
    const kd = Math.hypot(e.kx, e.ky) * dt, groundE = e.type !== "heli" && ENEMY_NAV.collide;
    if (kd > 10 && groundE) { const n = Math.ceil(kd / 10); for (let i = 0; i < n; i++) { e.x += e.kx * dt / n; e.y += e.ky * dt / n; collideEnemy(e); } }
    else { e.x += e.kx * dt; e.y += e.ky * dt; }
    e.kx *= decay; e.ky *= decay;
  }
  const dmgMul = 1 + G.t * SPAWN.dmgGrowth;
  if (e.stun > 0) { e.stun -= dt; return; }          // stunned: no move, no attack
  let mx = 0, my = 0;
  if (e.type === "soldier") { mx = ux; my = uy; }
  else if (e.type === "mortar") {
    if (d > MORTAR.keepRange) { mx = ux; my = uy; }
    else if (d < MORTAR.keepRange - 100) { mx = -ux; my = -uy; }
    if (e.cd <= 0 && d < MORTAR.range) {
      e.cd = MORTAR.cooldown;
      addHazard(e, { kind: "circle", x: P.x, y: P.y, r: MORTAR.radius,
        warn: MORTAR.warn, dur: 0.2, dmg: MORTAR.damage * dmgMul, once: true, rock: { x0: e.x, y0: e.y } });
    }
  }
  else if (e.type === "tank") {
    if (d > 260) { mx = ux; my = uy; } else if (d < 200) { mx = -ux; my = -uy; }     // (nav tanks: overridden by tankCover below)
    const canShoot = !e.nav || tankCover(e, d, ux, uy, dt);                // buildings are cover: no line of sight, no shot (flank instead)
    if (e.nav) { mx = COVER_MX; my = COVER_MY; }
    if (canShoot && e.cd <= 0 && d < 520) { e.cd = ENEMY_SHOTS.tank.cooldown; coverState().tankShots++; fireProj(e.x, e.y, e.ang, ENEMY_SHOTS.tank.speed, ENEMY_SHOTS.tank.damage * dmgMul, 6, 3, "#ffd23a"); }
  } else if (e.type === "heli") {
    if (d > 200) { mx = ux; my = uy; } else { mx = -uy * e.strafe + ux * 0.1; my = ux * e.strafe + uy * 0.1; }
    if (e.cd <= 0 && d < 420) { e.cd = ENEMY_SHOTS.heli.cooldown; fireProj(e.x, e.y, e.ang, ENEMY_SHOTS.heli.speed, ENEMY_SHOTS.heli.damage * dmgMul, 4, 2.5, "#ff5040", true); }   // helicopter shots fly over buildings
  }
  if (ENEMY_NAV.steer && ENEMY_NAV.collide && e.type !== "heli" && (mx || my) && e.nav) { steerGround(e, mx, my, dt); mx = STEER_X; my = STEER_Y; }
  e.x += mx * e.speed * dt; e.y += my * e.speed * dt;
  if (d < e.r + PLAYER.radius * 0.8 && e.hitCd <= 0) { e.hitCd = 0.6; hurtPlayer(ETYPES[e.type].dmg * dmgMul); }
  if (d > 1400) {                                    // leash stragglers back to the screen edge
    const a = Math.random() * TAU, r = Math.hypot(W, H) / 2 + 60;
    e.x = P.x + Math.cos(a) * r; e.y = P.y + Math.sin(a) * r;
  }
}

function updatePlay(dt) {
  const P = G.P;
  inPlayUpdate = true;
  dtGlobal = dt;
  G.t += dt;
  G.iframe = Math.max(0, G.iframe - dt); G.hurtT = Math.max(0, G.hurtT - dt);
  G.shake = Math.max(0, G.shake - dt * 30);
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  G.introT = Math.max(0, G.introT - dt);
  P.swipeCd = Math.max(0, P.swipeCd - dt); P.breathLock = Math.max(0, P.breathLock - dt);
  updatePerks(dt); updatePlayerLook(dt);                 // extra card effects (255), player growth / evolution (205)
  P.failT = Math.max(0, P.failT - dt); P.stepPulse = Math.max(0, P.stepPulse - dt * 6);
  if (P.buffer) { P.buffer.t -= dt; if (P.buffer.t <= 0) P.buffer = null; }

  if (PLATFORM.touch) touchPlayInput();          // touch sticks/buttons -> mouse aim point, mouse.l/r, move direction (275-touch.js)
  // --- aim: mouse in world space; the kaiju turns toward it at a limited rate
  G.aim.x = G.cam.x + (mouse.x - W / 2) / G.zoom; G.aim.y = G.cam.y + (mouse.y - H / 2) / G.zoom;
  const act = P.action, mods = act ? ACTION_MODS[act.type] : [1, 1], dashing = isEvading(act);          // dash / roll / jump (166)
  P.spdEff = P.speed * levelSpeedMul(P.lvl);                 // base speed grown by player level (MOVE_LEVEL), on top of cards
  const spdNow = Math.hypot(P.vx, P.vy), aimAng = Math.atan2(G.aim.y - P.y, G.aim.x - P.x);
  const spinning = !!act && act.type === "tailspin";
  if (!dashing && !spinning) {
    // base rate: faster standing still, slower at full run; actions scale it; swipe wind-up gets an aim-assist boost
    let rate = MOVE.turnRate * lerp(MOVE.turnStillMul, MOVE.turnRunMul, clamp(spdNow / P.spdEff, 0, 1)) * mods[1] * levelTurnMul(P.lvl);
    const assist = !!act && act.type === "swipe" && act.t < SWIPE.wind;
    if (assist) rate = MOVE.turnRate * lerp(MOVE.turnStillMul, MOVE.turnRunMul, clamp(spdNow / P.spdEff, 0, 1)) * MOVE.swipeAimMul * levelTurnMul(P.lvl);
    const T = { face: P.face, vel: P.angVel || 0 };
    stepTurn(T, aimAng, rate, dt, assist);
    P.face = T.face; P.angVel = T.vel;
  } else P.angVel = 0;
  if (Math.abs(P.angVel) > MOVE.pivotDust && Math.random() < dt * 14) {          // dust at the feet when pivoting hard
    const side = Math.random() < 0.5 ? 1 : -1, c = Math.cos(P.face), s2 = Math.sin(P.face);
    addParticle(P.x + c * 4 - s2 * side * 20, P.y + s2 * 4 + c * side * 20, rnd(-40, 40), rnd(-40, 40), 0.4, rnd(3, 5), "#9b8f7a");
  }

  // --- movement: angle-dependent speed, inertia, collision with buildings
  let ix = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  let iy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  if (TOUCH.moveOn) { ix = TOUCH.mx; iy = TOUCH.my; }     // analog direction from the touch move stick
  const il = Math.hypot(ix, iy);
  if (il > 0) { ix /= il; iy /= il; }
  if (dashing) {                       // the dash ignores turn / angle limits
    evadeVelocity(P, act);
  } else {
    let tvx = 0, tvy = 0;
    if (spinning) tailSpinMove(P, act, ix, iy, il, dt);          // heavy, swaying, momentum-based spin movement (165-movement.js)
    else {
      if (il > 0) { const sf = speedFactor(Math.atan2(iy, ix), P.face) * mods[0]; tvx = ix * P.spdEff * sf; tvy = iy * P.spdEff * sf; }
      approachVel(P, tvx, tvy, dt);
    }
  }
  P.x += P.vx * dt; P.y += P.vy * dt;
  collidePlayer(dt, il > 0 || dashing);
  const spd = Math.hypot(P.vx, P.vy);
  P.walk += spd * dt * 0.05;
  P.stepPhase += spd * dt / MOVE.stride;
  const si = Math.floor(P.stepPhase);
  if (si !== P.stepIdx) { P.stepIdx = si; if (spd > 40) footstep(spd); }
  P.hp = Math.min(P.maxHp, P.hp + P.regen * dt);
  crushCars(P.x, P.y, PLAYER.radius);        // also tramples trees

  // --- breath tank charges passively (faster standing still) unless breathing
  const breathing = !!P.action && P.action.type === "breath";
  if (!breathing) P.charge = Math.min(100, P.charge + chargeTrickle(spd) * dt);   // low passive trickle (charge is mostly earned: 155)
  if (hasBreath() && P.charge >= BREATH.minStart && Math.random() < dt * 2.5 * CHARGE_FX_INTENSITY) {    // crackle when usable
    const c = Math.cos(P.face), s = Math.sin(P.face), lx = rnd(-30, 10), ly = rnd(-10, 10);
    addParticle(P.x + c * lx - s * ly, P.y + s * lx + c * ly, rnd(-25, 25), rnd(-25, 25), 0.18, 2, "#bff");
  }

  // --- start actions from input (all gated by canAct)
  if (mouse.r && hasBreath()) {
    if (!P.action && P.breathLock <= 0) {
      if (P.charge >= BREATH.minStart) startBreath();
      else if (!P.rmbPrev) { P.failT = 0.5; sfx("fail"); }
    } else if (!P.rmbPrev && P.action) { /* ignored: busy */ }
  }
  P.rmbPrev = mouse.r;
  if (mouse.l && !P.action && P.swipeCd <= 0) trySwipe();
  if (P.buffer && !P.action) {
    const b = P.buffer; P.buffer = null;
    if (b.kind === "swipe") { if (P.swipeCd <= 0) trySwipe(); else P.buffer = b; }
    else if (b.kind === "ability") { const id = P.slots[b.slot]; if (id && P.cds[id] <= 0) startAbility(id); }
  }
  for (const id in P.cds) P.cds[id] = Math.max(0, P.cds[id] - dt);
  updateAction(dt);
  updateRadiance(dt);
  if (lv("tremor") > 0) {
    P.tremorT -= dt;
    if (P.tremorT <= 0) { spawnTremor(); P.tremorT = TREMOR.interval * Math.pow(0.85, lv("tremor") - 1); }
  }

  // --- enemies
  updateSpawning(dt);
  buildGrid(G.enemies);
  const navR2 = (Math.hypot(W, H) / 2 + ENEMY_NAV.range) ** 2;
  for (const e of G.enemies) {
    updateBurn(e, dt); if (e.dead) continue;
    e.nav = !e.def && e.type !== "heli" && ENEMY_NAV.collide && (e.x - P.x) ** 2 + (e.y - P.y) ** 2 < navR2;   // budget: only enemies near the screen navigate
    updateEnemy(e, dt); separate(e);
    if (e.nav) collideEnemy(e);                      // after separation, so crowding never pushes anyone into a building
  }
  G.enemies = G.enemies.filter(e => !e.dead);
  updateHazards(dt);
  updateCoverHint(dt);
  updateWaves(dt);
  updateStompWaves(dt);
  updateCrescents(dt);
  updateBuildingFx(dt);
  updateBeamFx(dt);
  updateWorldFx(dt);
  updateCollapses(dt);

  // --- projectiles (enemy ones hurt the player, reflected ones hurt enemies)
  const bl = bossesAlive();
  for (const p of G.projs) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (p.grace > 0) p.grace -= dt;
    else if (!p.friendly && PROJ_BLOCK && !p.air) {                                  // intact buildings block (and get damaged by) enemy shots: the city is cover
      let hb = null; buildingsInCircle(p.x, p.y, p.r, b => { hb = b; });
      if (hb) { damageBuilding(hb, p.dmg * PROJ_BLOCK_DMG); p.life = 0; onEnemyShotBlocked(p); for (let k = 0; k < 3; k++) addParticle(p.x, p.y, rnd(-70, 70), rnd(-70, 70), 0.3, 3, "#ccc"); continue; }
    }
    if (p.friendly) friendlyHit(p, bl);
    else if (dist(p.x, p.y, P.x, P.y) < p.r + PLAYER.radius * 0.75) { hurtPlayer(p.dmg); p.life = 0; }
  }
  G.projs = G.projs.filter(p => p.life > 0);

  // --- effects
  for (const p of G.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; p.life -= dt; }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const r of G.rings) { r.t += dt; r.r = (r.start ?? 20) + (r.max - (r.start ?? 20)) * clamp(r.t / (r.growTime || .4), 0, 1); }
  G.rings = G.rings.filter(r => r.t < (r.life || .5));
  for (const s of G.swipes) s.t -= dt;
  G.swipes = G.swipes.filter(s => s.t > 0);
  for (const d of G.decals) d.t -= dt;
  G.decals = G.decals.filter(d => d.t > 0);
  for (const f of G.flares) f.t -= dt;
  G.flares = G.flares.filter(f => f.t > 0);
  for (const n of G.nums) { n.t -= dt; n.y -= 40 * dt; }
  for (const q of G.xpLabels) { q.t -= dt; q.age += dt; q.y -= 22 * dt; }
  G.xpLabels = G.xpLabels.filter(q => q.t > 0);
  G.xpPulse = Math.max(0, G.xpPulse - dt * 3);
  G.nums = G.nums.filter(n => n.t > 0);

  G.zoom += ((bossesAlive().length ? Math.min(BOSS_ZOOM, playerCameraZoom(P.lvl)) : playerCameraZoom(P.lvl)) * platformZoomMul() - G.zoom) * Math.min(1, CAMERA.ease * dt);
  // camera leads slightly toward where we are facing
  const tx = P.x + Math.cos(P.face) * MOVE.camLead, ty = P.y + Math.sin(P.face) * MOVE.camLead;
  G.cam.x += (tx - G.cam.x) * Math.min(1, 8 * dt);
  G.cam.y += (ty - G.cam.y) * Math.min(1, 8 * dt);

  if (P.hp <= 0 && state === "play") { P.hp = 0; state = "over"; G.endT = 0; G.shake = 12; }
  inPlayUpdate = false;
  if (G.pendingLevel) { G.pendingLevel = false; checkLevelUp(); }
}

function updateIdle(dt) {
  titleT += dt;
  if (!G) return;
  G.endT += dt;
  if (state === "win") updateFinalVictory(dt);
  if (state === "levelup") G.luT = (G.luT || 0) + dt;      // time on the level-up screen (card input lock / fade, 270-menus.js)
  G.shake = Math.max(0, G.shake - dt * 30);
  for (const p of G.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; p.life -= dt; }
  G.parts = G.parts.filter(p => p.life > 0);
  if (state === "win") for (const c of confetti) { c.y += c.vy * dt; c.x += c.vx * dt + Math.sin(c.y * 0.03) * 0.5; c.r += dt * 4; if (c.y > H + 10) { c.y = -10; c.x = Math.random() * W; } }
}

