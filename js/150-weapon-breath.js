// [js-split] ===== js/150-weapon-breath.js: Atomic Breath (RMB): charge tank, beam ticks, burn =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// ---- atomic breath (RMB) ----
function startBreath() {
  startAction("breath", Infinity, { phase: "wind" });          // inhale first; the beam fires after BREATH.windup
  sfx("windup");
}
const mouthOf = (d) => { const P = G.P, r = playerMouthDist(d); return { x: P.x + Math.cos(P.face) * r, y: P.y + Math.sin(P.face) * r }; };   // d in unscaled sprite units (default PLAYER_LOOK.mouthX): follows the grown head
function breathTick() {
  const P = G.P, ang = P.face;
  const f = clamp(P.charge / 100, 0, 1);
  const st = breathStats(), lvl = breathLevel();
  const act = P.action, ramp = act && act.phase === "fire" ? lerp(BREATH.rampFrom, 1, clamp(act.t / BREATH.rampTime, 0, 1)) : 1;   // taps stay weak
  const dmg = st.dmg * lerp(BREATH.dmgMin, BREATH.dmgMax, f) * ramp;
  const width = st.width * lerp(BREATH.widthMin, BREATH.widthMax, f) * lerp(0.7, 1, ramp > 0.99 ? 1 : (ramp - BREATH.rampFrom) / (1 - BREATH.rampFrom));
  const len = st.len * lerp(BREATH.lenMin, BREATH.lenMax, f) * Math.min(BREATH.lenPlayerMax, 1 + BREATH.lenPerPlayerLevel * Math.max(0, G.P.lvl - 1));   // longer with player level
  P.bw = width; P.bl = len;
  const mo = mouthOf(), sx = mo.x, sy = mo.y;                    // beam starts at the drawn mouth (scales with growth)
  const ex = P.x + Math.cos(ang) * len, ey = P.y + Math.sin(ang) * len;
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (enemySegmentHit(e, sx, sy, ex, ey, width / 2))
      { damageEnemy(e, dmg, Math.cos(ang) * 14, Math.sin(ang) * 14); if (lvl >= 3 && !e.dead) { e.burnT = 2; e.burnDmg = dmg * 0.4; } }   // Lv3+: burning
  }
  damageCarsInSegment(sx, sy, ex, ey, width / 2);
  const id = ++G.shotId;
  for (let s = 0; s <= len; s += 28) {
    const px = sx + (ex - sx) * (s / len), py = sy + (ey - sy) * (s / len);
    buildingsInCircle(px, py, width / 2, b => {
      if (b.shot === id) return;
      b.shot = id; damageBuilding(b, dmg * BREATH.bldgMul);
      if (G.flares.length < 30) G.flares.push({ x: px, y: py, t: 0.18, r: 10 + rnd(0, 10) });
      if (G.decals.length < 150 && Math.random() < 0.25) G.decals.push({ x: px + rnd(-8, 8), y: py + rnd(-8, 8), r: rnd(8, 16), t: 12 });
      addParticle(px, py, rnd(-70, 70), rnd(-70, 70), 0.4, 3, "#ffb347");
    });
  }
  if (G.flares.length < 30) G.flares.push({ x: ex, y: ey, t: 0.12, r: 8 + 10 * f });
  if (++P.bn % 3 === 0 && G.decals.length < 150) G.decals.push({ x: ex + rnd(-10, 10), y: ey + rnd(-10, 10), r: rnd(10, 20), t: 10 });
  const s = Math.random();
  addParticle(sx + (ex - sx) * s, sy + (ey - sy) * s, rnd(-50, 50), rnd(-50, 50), 0.3, 3, "#8ff");
  if (lvl >= 6) addParticle(sx + (ex - sx) * s, sy + (ey - sy) * s, rnd(-80, 80), rnd(-80, 80), 0.4, 4, "#c9f");
}
function updateBurn(e, dt) {
  if (!(e.burnT > 0)) return;
  e.burnT -= dt; e.burnAcc = (e.burnAcc || 0) + dt;
  if (e.burnAcc >= 0.25) { e.burnAcc -= 0.25; damageEnemy(e, e.burnDmg, 0, 0); addParticle(e.x + rnd(-4, 4), e.y + rnd(-4, 4), rnd(-15, 15), -rnd(20, 50), 0.35, 3, "#ff9a3c"); }
}
function updateBreath(dt) {
  const P = G.P, a = P.action;
  if (a.phase === "wind") {
    a.t += dt;
    const m = mouthOf(46);
    if (Math.random() < dt * 90) {                       // inward suction particles while inhaling
      const an = Math.random() * TAU, d = rnd(40, 80);
      addParticle(m.x + Math.cos(an) * d, m.y + Math.sin(an) * d, -Math.cos(an) * d * 3.2, -Math.sin(an) * d * 3.2, 0.25, 2.5, "#aef");
    }
    if (!mouse.r) {                                      // released early: cancelled, small penalty + lockout
      P.charge = Math.max(0, P.charge - BREATH.cancelCost); P.action = null; P.breathLock = BREATH.cancelLock; sfx("fail"); return;
    }
    if (a.t >= BREATH.windup) {
      a.phase = "fire"; a.t = 0; P.tickT = 0; P.bn = 0;
      P.vx -= Math.cos(P.face) * 40; P.vy -= Math.sin(P.face) * 40;   // little kick back
      sfx("breath");
    }
    return;
  }
  if (a.phase === "fire") {
    a.t += dt;
    P.charge = Math.max(0, P.charge - BREATH.drain * breathStats().drain * dt);
    P.tickT -= dt;
    while (P.tickT <= 0) { P.tickT += BREATH.tick; breathTick(); if (P.bn % 4 === 0) sfx("breath"); }
    G.shake = Math.max(G.shake, BREATH.recoil);
    if (Math.random() < dt * 50) {            // dust and embers kicked up at the feet
      const bx = P.x - Math.cos(P.face) * 14 + rnd(-18, 18), by = P.y - Math.sin(P.face) * 14 + rnd(-18, 18);
      addParticle(bx, by, rnd(-60, 60), rnd(-60, 60), 0.5, rnd(2, 5), Math.random() < 0.5 ? "#ffb347" : "#9b8f7a");
    }
    if (P.charge <= 0 || (!mouse.r && a.t >= BREATH.minFire)) { a.phase = "exhale"; a.t = 0; }
    return;
  }
  a.t += dt;                                              // exhale: steam from the mouth, can't act yet
  if (Math.random() < dt * 70) { const m = mouthOf(48); addParticle(m.x, m.y, Math.cos(P.face) * 40 + rnd(-25, 25), Math.sin(P.face) * 40 + rnd(-25, 25) - 15, 0.6, rnd(4, 7), "#dfe6ea"); }
  if (a.t >= BREATH.exhale) { P.action = null; P.breathLock = BREATH.relockTime; }
}

