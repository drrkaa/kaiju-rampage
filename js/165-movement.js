"use strict"; // [movement chunk] flying-enemy helper, level scaling of speed/turn, tail-spin momentum movement, building ram impacts, tremor FX setup
// ---- flying enemies: ground-level effects (stomp bands, tremor, footsteps, tail-spin sweep) skip them ----
function isFlying(e) { return !!(e.flying || FLYING_TYPES[e.type] || (ETYPES[e.type] && ETYPES[e.type].flying)); }
// Mark a flyer so the shock ring is drawn rippling under its shadow. `delay` seconds from now (<0 = not reached).
function flyUnder(e, delay) { if (delay >= 0) e.underAt = G.t + delay; }
function drawFlyUnder(vis) {
  const k0 = FLY_FX.underT;
  for (const e of G.enemies) {
    if (e.underAt === undefined || e.dead || !vis(e)) continue;
    const u = (G.t - e.underAt) / k0;
    if (u < 0 || u > 1) continue;
    const x = e.x + ENEMY_SHADOW.heliDx, y = e.y + ENEMY_SHADOW.heliDy, rr = enemyVisR(e) * 1.1;
    ctx.strokeStyle = `rgba(255,190,100,${0.55 * (1 - u)})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(x, y, rr * (0.7 + 0.9 * u), rr * 0.7 * (0.7 + 0.9 * u), 0, 0, TAU); ctx.stroke();   // ring passes under the shadow
  }
}

// ---- level scaling (MOVE_LEVEL) ----
const levelSpeedMul = lvl => Math.min(MOVE_LEVEL.speedMax, 1 + MOVE_LEVEL.speedPerLevel * Math.max(0, lvl - 1));
const levelTurnMul = lvl => Math.min(MOVE_LEVEL.turnMax, 1 + MOVE_LEVEL.turnPerLevel * Math.max(0, lvl - 1));

// ---- Tail Spin movement: a heavy pendulum. Velocity eases toward the held direction (TAILSPIN.accel/decel = inertia), the target speed
// surges with the tail swing, and a sideways tug swings with the spin angle. Both scale with the input, so standing still barely moves. ----
function tailSpinMove(P, a, ix, iy, il, dt) {
  const T = TAILSPIN, th = a.spin * T.swayFreq, spd = P.spdEff || P.speed;
  let tvx = 0, tvy = 0;
  if (il > 0) { const k = spd * T.moveMul * (1 + T.surge * Math.cos(th)); tvx = ix * k; tvy = iy * k; }
  const dx = tvx - P.vx, dy = tvy - P.vy, d = Math.hypot(dx, dy), acc = (Math.hypot(tvx, tvy) >= Math.hypot(P.vx, P.vy) ? T.accel : T.decel) * dt;
  if (d <= acc) { P.vx = tvx; P.vy = tvy; } else { P.vx += dx / d * acc; P.vy += dy / d * acc; }
  if (il > 0) { const s = Math.sin(th) * T.swayAccel * il * dt; P.vx -= iy * s; P.vy += ix * s; }       // lateral tug, perpendicular to the held direction
  else { P.vx += Math.cos(th) * T.idleSway * dt; P.vy += Math.sin(th) * T.idleSway * dt; }              // faint drift when standing still
  const v = Math.hypot(P.vx, P.vy);
  if (v > 50 && Math.random() < dt * T.dustRate) {                                                       // dust kicked up behind the swing direction
    const ux = P.vx / v, uy = P.vy / v, sd = Math.random() < 0.5 ? 1 : -1;
    addParticle(P.x - ux * 24 - uy * sd * 14, P.y - uy * 24 + ux * sd * 14, -ux * 45 + rnd(-20, 20), -uy * 45 + rnd(-20, 20), 0.5, rnd(3, 6), "#b9a98a");
  }
}

// ---- building impacts: real speed into a wall hurts once; leaning on it does not. Back off for MOVE.ramRelease and ram again. ----
function ramBuilding(b, vn, pushing, dt) {
  const P = G.P, fresh = G.t - (b.ramT === undefined ? -9 : b.ramT) > MOVE.ramRelease;
  b.ramT = G.t;
  if (fresh && -vn >= MOVE.ramSpeed) {
    const m = Math.min(MOVE.ramMaxMul, -vn / (P.spdEff || P.speed));
    damageBuilding(b, MOVE.ramDmg * m);
    G.shake = Math.max(G.shake, 4 * Math.min(1.5, m));
    for (let k = 0; k < 5; k++) addParticle(P.x - PUSH_UX * 22, P.y - PUSH_UY * 22, rnd(-70, 70), rnd(-70, 70), 0.4, rnd(3, 5), "#999");
  } else if (pushing && MOVE.bulldoze > 0 && vn < -5) damageBuilding(b, MOVE.bulldoze * dt);
}

// ---- Tremor FX state (drawn in 235-draw-tremor.js) ----
function tremorFxInit(w) {
  const F = TREMOR_FX;
  w.cracks = []; w.chips = [];
  for (let i = 0; i < F.cracks; i++) {
    const a = w.rot + (i + rnd(-0.3, 0.3)) * TAU / F.cracks, len = rnd(0.65, 1.0) * w.max, pts = [];
    for (let k = 1; k <= 4; k++) pts.push({ f: k / 4 * len, o: rnd(-0.06, 0.06) });
    w.cracks.push({ a, pts, br: Math.random() < 0.5 ? rnd(-0.5, 0.5) : 0 });
  }
  for (let i = 0; i < F.debris; i++) w.chips.push({ a: Math.random() * TAU, r0: rnd(0.35, 0.8) * w.max, v: rnd(50, 130), s: rnd(2, 3.6), h: rnd(0.5, 1) * F.debrisHop });
}
function tremorDust(w) {
  const F = TREMOR_FX;
  for (let k = 0; k < F.dust; k++) { const a = Math.random() * TAU, r = w.max * rnd(0.3, 0.95); addParticle(w.x + Math.cos(a) * r, w.y + Math.sin(a) * r, Math.cos(a) * rnd(25, 70), Math.sin(a) * rnd(25, 70) - 12, rnd(0.45, 0.8), rnd(3, 7), k % 3 ? "#a8987a" : "#c9bb9c"); }
}
