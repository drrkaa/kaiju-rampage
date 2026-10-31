// [js-split] ===== js/140-weapon-swipe.js: Claw swipe (LMB): cone hits, follow-up slash, crescent wave, building hit fx =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// ---- swipe (LMB) ----
function trySwipe() {
  const P = G.P;
  if (state !== "play" || paused) return false;
  if (!canAct() || P.swipeCd > 0) { P.buffer = { kind: "swipe", t: ACTION_BUFFER }; return false; }
  P.swipeCd = swipeCdNow(); P.swipeDir *= -1;
  startAction("swipe", SWIPE.wind + SWIPE.strike + SWIPE.recover, { hit: false, dir: P.swipeDir });
  return true;
}
// Hit all enemies/buildings in a cone toward `ang`. Returns number of things hit.
function coneHit(ang, range, arc, dmg, knock) {
  const P = G.P;
  let n = 0;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy);
    if (!enemyConeHit(e, P.x, P.y, ang, range, arc)) continue;
    damageEnemy(e, dmg, (dx / (d || 1)) * knock, (dy / (d || 1)) * knock);
    n++; gainCharge(CHARGE.hit);
    if (n === 1) {
      const q = enemyHurtCircles(e).reduce((best, q) => dist(q.x, q.y, P.x, P.y) - q.r < dist(best.x, best.y, P.x, P.y) - best.r ? q : best);
      const a = Math.atan2(P.y - q.y, P.x - q.x), d = Math.min(q.r, dist(P.x, P.y, q.x, q.y));
      G.rings.push({ x: q.x + Math.cos(a) * d, y: q.y + Math.sin(a) * d, r: 2, start: 2, max: 10, t: 0, life: .16, growTime: .16, c: "255,240,190", w: 1.2, dim: .24, claw: true });
    }
    for (let i = 0; i < 3; i++) addParticle(e.x, e.y, rnd(-130, 130), rnd(-130, 130), 0.25, 3, "#ffe9a0");
  }
  damageCarsInCone(P.x, P.y, ang, range, arc);
  buildingsInCircle(P.x, P.y, range, b => {
    const q = colRect(b), nx = clamp(P.x, q.x, q.x + q.w), ny = clamp(P.y, q.y, q.y + q.h);
    const a = Math.atan2(ny - P.y, nx - P.x);
    if (dist(nx, ny, P.x, P.y) < 24 || Math.abs(angDiff(a, ang)) < arc / 2 + 0.1) {
      damageBuilding(b, dmg * 3); n++;
      for (let i = 0; i < 3; i++) addParticle(nx, ny, rnd(-90, 90), rnd(-90, 90), 0.4, 3, "#bbb");
    }
  });
  return n;
}
// Both the main cut and Lv3 return cut originate from the corresponding hand.
function swipeFx(dir) {
  const P = G.P, st = swipeStats(), scale = playerAppearance().scale;
  const offset = SWIPE.handOffset * scale, forward = SWIPE.handForward * scale;
  G.swipes.push({ x: P.x + Math.cos(P.face) * forward - Math.sin(P.face) * dir * offset,
    y: P.y + Math.sin(P.face) * forward + Math.cos(P.face) * dir * offset,
    ang: P.face + dir * SWIPE.sideAngle, face: P.face, scale,
    r: Math.max(1, st.range - Math.hypot(offset, forward)), arc: st.arc, t: 0.28, max: 0.28, dir });
}
function swipeStrike(a) {
  const P = G.P, st = swipeStats();
  sfx("swipe");
  const n = coneHit(P.face, st.range, st.arc, st.dmg, SWIPE.knock);
  swipeFx(a.dir);
  if (swipeLevel() >= 6 && G.crescents.length < 8)           // Lv6: crescent wave flies forward
    G.crescents.push({ x: P.x, y: P.y, ang: P.face, dir: a.dir, hw: Math.min(st.range * SWIPE.waveWidthMul, SWIPE.waveMaxHalfWidth), life: SWIPE.waveLife, max: SWIPE.waveLife, dmg: st.dmg * SWIPE.waveDmgMul, hit: new Set() });
  if (n > 0) { G.hitStop = SWIPE.hitStop; G.shake = Math.max(G.shake, 6); sfx("clawHit"); }
}
function swipeFollowUp(a) {                                     // Lv3+: second, weaker slash the other way
  const P = G.P, st = swipeStats();
  const n = coneHit(P.face, st.range, st.arc, st.dmg * 0.6, SWIPE.knock * 0.6);
  swipeFx(-a.dir);
  sfx("swipe"); if (n > 0) sfx("clawHit");
}
// Hit flash / HP-bar timers and smoke + fire puffs from badly damaged buildings (dynamic particles, globally capped).
function updateBuildingFx(dt) {
  for (const b of G.dmgList) { b.hitFlash = Math.max(0, b.hitFlash - dt); b.barT -= dt; }
  G.dmgList = G.dmgList.filter(b => { const keep = !b.dead && (b.barT > 0 || b.hitFlash > 0); if (!keep) b.inList = false; return keep; });
  const mx = W / 2 + SMOKE.viewMargin, my = H / 2 + SMOKE.viewMargin;
  for (const b of smokers) {
    if (b.dead) { smokers.delete(b); continue; }
    const rate = SMOKE.rate[Math.min(b.stage, SMOKE.rate.length - 1)];
    const q = colRect(b);
    if (!rate || Math.abs(q.x + b.w / 2 - G.cam.x) > mx || Math.abs(q.y + b.h / 2 - G.cam.y) > my) continue;
    if (G.smoke.length < SMOKE.max && Math.random() < rate * dt)
      G.smoke.push({ x: q.x + rnd(0.15, 0.85) * b.w, y: q.y + rnd(0.15, 0.85) * b.h, vx: rnd(-6, 6), vy: -rnd(15, 30), life: 1.4, max: 1.4, size: 5, fire: b.stage >= 4 && Math.random() < 0.5 });
  }
  for (const sm of G.smoke) { sm.x += sm.vx * dt; sm.y += sm.vy * dt; sm.life -= dt; }
  G.smoke = G.smoke.filter(sm => sm.life > 0);
}
function updateCrescents(dt) {
  for (const c of G.crescents) {
    const ca = Math.cos(c.ang), sa = Math.sin(c.ang);
    c.x += ca * SWIPE.waveSpeed * dt; c.y += sa * SWIPE.waveSpeed * dt; c.life -= dt;
    damageCarsInSegment(c.x - sa * c.hw, c.y + ca * c.hw, c.x + sa * c.hw, c.y - ca * c.hw, 22);
    for (const e of G.enemies) {
      if (e.dead || c.hit.has(e)) continue;
      if (enemySegmentHit(e, c.x - sa * c.hw, c.y + ca * c.hw, c.x + sa * c.hw, c.y - ca * c.hw, 22)) { c.hit.add(e); damageEnemy(e, c.dmg, ca * 200, sa * 200); }
    }
  }
  G.crescents = G.crescents.filter(c => c.life > 0);
}

