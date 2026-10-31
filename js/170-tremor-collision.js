// [js-split] ===== js/170-tremor-collision.js: Tremor passive; player/enemy vs building collision, ground steering, footsteps, friendly projectile hits =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// ---- Tremor: passive stomping pulses around the kaiju (not an action, never blocked) ----
const tremorRadius = () => TREMOR.radius + TREMOR.radiusGrow * (lv("tremor") - 1);
function spawnTremor() {
  const P = G.P, l = lv("tremor"), m = 1 + 0.3 * (l - 1), r = tremorRadius();
  const wave = { x: P.x, y: P.y, r: 10, max: r, t: 0, life: TREMOR.life, rot: Math.random() * TAU };
  tremorFxInit(wave); G.waves.push(wave);
  G.shake = Math.max(G.shake, 3); sfx("pulse");
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (isFlying(e)) continue;                  // ground disturbance has no airborne ring cue
    if (enemyCircleHit(e, P.x, P.y, r)) {
      const a = Math.atan2(e.y - P.y, e.x - P.x);
      damageEnemy(e, TREMOR.dmg * m, Math.cos(a) * TREMOR.knock, Math.sin(a) * TREMOR.knock);
    }
  }
  buildingsInCircle(P.x, P.y, r, b => damageBuilding(b, TREMOR.bldg * m));
  onTremorMark(P.x, P.y, r);
  tremorDust(wave);
}
function updateWaves(dt) {
  for (const w of G.waves) { w.t += dt; const k = clamp(w.t / w.life, 0, 1); w.r = 10 + (w.max - 10) * (1 - (1 - k) * (1 - k)); }
  G.waves = G.waves.filter(w => w.t < w.life + TREMOR_FX.crackLife);   // cracks outlive propagation
}

// ---- player vs buildings: solid, slide along walls, bulldoze when pushing ----
function collidePlayer(dt, pushing) {
  const P = G.P, R = MOVE.collideRadius;
  for (let iter = 0; iter < 3; iter++) {
    let any = false;
    buildingsInCircle(P.x, P.y, R, b => {
      if (!pushOutOf(b, P, R)) return;
      const ux = PUSH_UX, uy = PUSH_UY, vn = P.vx * ux + P.vy * uy;
      if (vn < 0) { P.vx -= vn * ux; P.vy -= vn * uy; }
      ramBuilding(b, vn, pushing, dt);               // impact damage only on a real hit; leaning on the wall does nothing
      any = true;
    });
    if (!any) break;
  }
}
// Ground enemies: same solid boxes as the player, sliding along walls; knockback velocity into a wall is removed.
function collideEnemy(e) {
  if (!ENEMY_NAV.collide) return;
  const R = e.r;
  for (let iter = 0; iter < 2; iter++) {
    let any = false;
    buildingsInCircle(e.x, e.y, R, b => {
      if (!pushOutOf(b, e, R)) return;
      e.cnx = PUSH_UX; e.cny = PUSH_UY; e.cT = 0.25;      // remember the wall normal for steering
      const vn = e.kx * PUSH_UX + e.ky * PUSH_UY;
      if (vn < 0) { e.kx -= vn * PUSH_UX; e.ky -= vn * PUSH_UY; }
      any = true;
    });
    if (!any) break;
  }
}
// Steering: if the direct way is blocked, probe +-30/60/90 deg (preferred side first), commit to the choice for a
// moment, and pick a random detour when barely making progress. Result in STEER_X/STEER_Y.
let STEER_X = 0, STEER_Y = 0;
function steerGround(e, mx, my, dt) {
  const route = cityRouteDirection(e, mx, my);
  if (route) { mx = route.x; my = route.y; }
  const l = Math.hypot(mx, my);
  if (!l) { STEER_X = 0; STEER_Y = 0; return; }
  mx /= l; my /= l;
  e.stT += dt;
  if (e.stT >= ENEMY_NAV.stuckTime) {            // stuck detector
    if (Math.hypot(e.x - e.sx, e.y - e.sy) < e.speed * ENEMY_NAV.stuckProgress * e.stT && !(e.stun > 0)) {
      e.steerSign = Math.random() < 0.5 ? 1 : -1; e.steerOff = e.steerSign * rnd(1.3, 2.4); e.commitT = rnd(0.7, 1.2);
    }
    e.sx = e.x; e.sy = e.y; e.stT = 0;
  }
  const look = e.r + ENEMY_NAV.lookAhead;
  const dirFree = a => { const c = Math.cos(a), s2 = Math.sin(a); return !anySolid(e.x + (mx * c - my * s2) * look, e.y + (mx * s2 + my * c) * look, e.r); };
  let off = 0;
  if (e.commitT > 0) { e.commitT -= dt; if (!ENEMY_NAV.validate || dirFree(e.steerOff)) off = e.steerOff; else e.commitT = 0; }   // committed detour, dropped if it hits a wall
  if (!off && !dirFree(0)) {
    const cand = [];
    if (ENEMY_NAV.tangent && e.cT > 0) {             // slide along the wall we are touching, in the direction that makes progress
      const t1x = -e.cny, t1y = e.cnx, d1 = t1x * mx + t1y * my, sg = Math.abs(d1) > 0.15 ? Math.sign(d1) : e.steerSign;
      const tx = t1x * sg, ty = t1y * sg; cand.push(Math.atan2(mx * ty - my * tx, mx * tx + my * ty));
    }
    for (const mag of [0.52, 1.05, 1.57]) { cand.push(mag * e.steerSign); cand.push(-mag * e.steerSign); }
    off = e.steerSign * 1.57;
    for (const a of cand) if (dirFree(a)) { off = a; break; }
    e.steerOff = off; e.commitT = ENEMY_NAV.commit;
  }
  if (off) { const c = Math.cos(off), s2 = Math.sin(off); STEER_X = mx * c - my * s2; STEER_Y = mx * s2 + my * c; }
  else { STEER_X = mx; STEER_Y = my; }
}

function footstep(spd) {
  const P = G.P, side = P.stepIdx % 2 ? 1 : -1, c = Math.cos(P.face), s = Math.sin(P.face);
  const fx = P.x + c * 6 - s * side * 20, fy = P.y + s * 6 + c * side * 20;
  P.stepPulse = 1;
  G.shake = Math.max(G.shake, MOVE.stepShake * Math.min(1, spd / (P.spdEff || P.speed)));
  for (let i = 0; i < MOVE.stepDust; i++) addParticle(fx, fy, rnd(-35, 35), rnd(-35, 35), 0.45, rnd(3, 6), "#9b8f7a");
  for (const e of G.enemies) {
    if (e.dead || e.def || e.r > 10 || isFlying(e)) continue;
    if (dist(e.x, e.y, fx, fy) < MOVE.stepRadius + e.r) damageEnemy(e, MOVE.stepDmg, 0, 0);
  }
  crushCars(fx, fy, 20);
  onFootstepMark(fx, fy, P.face, side);
  buildingsInCircle(fx, fy, 24, b => damageBuilding(b, 10));
  sfx("step");
}

// Player-owned (reflected) projectiles hit enemies via the enemy grid + bosses.
function friendlyHit(p, bl) {
  const gx = Math.floor(p.x / GRID), gy = Math.floor(p.y / GRID);
  const hit = e => { damageEnemy(e, p.dmg, p.vx * 0.3, p.vy * 0.3); p.life = 0; };
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const a = grid.get((gx + i) * 100003 + gy + j);
    if (!a) continue;
    for (const e of a) if (!e.dead && !e.def && dist(e.x, e.y, p.x, p.y) < e.r + p.r + 4) { hit(e); return; }
  }
  for (const b of bl) if (!b.dead && enemyCircleHit(b, p.x, p.y, p.r)) { hit(b); return; }
}

