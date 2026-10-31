// [js-split] ===== js/160-abilities.js: Active abilities (Q/E/Space): Roar, Seismic Stomp, Tail Spin, Mega Beam, Tail Dash; updateAction =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// ---- abilities (Q/E/Space) ----
function ringFx(x, y, max, c) { G.rings.push({ x, y, r: 20, max, t: 0, c, w: 10 }); }

function tryAbility(slot) {
  if (state !== "play" || paused) return;
  const P = G.P, id = P.slots[slot];
  if (!id || P.cds[id] > 0) return;
  if (!canAct()) { P.buffer = { kind: "ability", slot, t: ACTION_BUFFER }; return; }
  startAbility(id);
}
function startAbility(id) {
  const P = G.P;
  if (id === "superlaser" || id === "mega") {
    if (startHeavyBeam(id === "mega" ? "mega" : heavyBeamId())) P.cds[id] = 0;
    return;
  }   // Both heavy-beam forms spend shared charge instead of a cooldown.
  P.cds[id] = abilCd(id);
  if (id === "roar") { startAction("roar", ROAR.dur, { fired: false }); sfx("roar"); }
  else if (id === "stomp") startAction("stomp", STOMP.windup + 0.3, { fired: false });
  else if (id === "tailspin") startAction("tailspin", TAILSPIN.dur + TAILSPIN.durPerLevel * (lv("tailspin") - 1), { spin: 0 });
  else if (id === "dash" || id === "roll" || id === "jump") startEvade(id);   // Space evades (166)
}

const mouthPos = () => mouthOf();            // roar origin follows the grown head (ROAR.mouthDist is superseded by PLAYER_LOOK.mouthX)
function doRoar() {
  const P = G.P, l = lv("roar"), m = amul("roar");
  const rad = ROAR.radius * (1 + 0.1 * (l - 1)) * playerAppearance().scale / PLAYER_LOOK.baseScale, stun = ROAR.stun + 0.3 * (l - 1);
  const mp = mouthPos();                       // first ring is the bright one and starts exactly at the mouth
  for (let i = 0; i < 3; i++) G.rings.push({ x: mp.x, y: mp.y, r: 20, max: rad * (0.6 + 0.2 * i), t: -0.09 * i, c: "255,210,120", w: 14 - 3 * i, dim: i ? 0.55 : 1 });
  G.shake = Math.max(G.shake, 8);
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = dist(e.x, e.y, mp.x, mp.y);
    if (enemyCircleHit(e, mp.x, mp.y, rad)) {
      const a = Math.atan2(e.y - mp.y, e.x - mp.x);
      if (!e.def) e.stun = Math.max(e.stun, stun);
      damageEnemy(e, 6 * m, Math.cos(a) * ROAR.knock, Math.sin(a) * ROAR.knock);
      e.trail = 0.6;
    }
  }
  // Reflect every enemy projectile in range back as a player-owned projectile
  for (const p of G.projs) {
    if (p.friendly || dist(p.x, p.y, mp.x, mp.y) >= rad) continue;
    const a = Math.atan2(p.y - mp.y, p.x - mp.x), sp = Math.hypot(p.vx, p.vy) * 1.25 + 60;
    p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
    p.friendly = true; p.color = "#9ff"; p.life = Math.max(p.life, 2.5); p.dmg = (p.dmg + 6) * 2 * m;
  }
}
function stompBands(l) {
  const w = STOMP.bandWidth + STOMP.widthPerLevel * (l - 1), inner = STOMP.innerRadius + STOMP.innerPerLevel * (l - 1), out = [{ in: 0, out: inner, tPass: null }];
  let r0 = inner + STOMP.gap;
  for (let i = 1; i < STOMP.bands; i++) { out.push({ in: r0, out: r0 + w, tPass: null }); r0 += w + STOMP.gap; }
  return out;
}
function doStomp() {
  const P = G.P, l = lv("stomp"), m = amul("stomp"), bands = stompBands(l);
  const w = { x: P.x, y: P.y, r: 0, age: 0, bands, max: bands[bands.length - 1].out + 10, hit: new Map(), pend: [], m, rot: Math.random() * TAU };
  buildingsInCircle(P.x, P.y, w.max, b => {          // which bands touch each building, and when the front reaches them
    const q = colRect(b), nx = clamp(P.x, q.x, q.x + q.w), ny = clamp(P.y, q.y, q.y + q.h);
    const dmin = Math.hypot(nx - P.x, ny - P.y);
    const dmax = Math.max(Math.hypot(q.x - P.x, q.y - P.y), Math.hypot(q.x + q.w - P.x, q.y - P.y), Math.hypot(q.x - P.x, q.y + q.h - P.y), Math.hypot(q.x + q.w - P.x, q.y + q.h - P.y));
    bands.forEach((bd, i) => { if (dmax >= bd.in && dmin <= bd.out) w.pend.push({ b, i, r: Math.max(dmin, bd.in) }); });
  });
  G.stompWaves.push(w); G.shake = Math.max(G.shake, 14); sfx("stomp"); onStompMark(P.x, P.y, w.max);
  for (let k = 0; k < 10; k++) addParticle(P.x + rnd(-30, 30), P.y + rnd(-30, 30), rnd(-90, 90), rnd(-90, 90), 0.5, rnd(3, 6), "#a8987a");
}
function updateStompWaves(dt) {
  for (const w of G.stompWaves) {
    w.age += dt; w.r += STOMP.speed * dt; worldStompCars(w);
    const slack = Math.max(STOMP.frontWindow, STOMP.speed * dt);
    for (let i = 0; i < w.bands.length; i++) if (w.bands[i].tPass === null && w.r >= w.bands[i].in) {
      w.bands[i].tPass = w.age;
      for (let k = 0; k < 8; k++) { const a = Math.random() * TAU, rr = rnd(w.bands[i].in, w.bands[i].out); addParticle(w.x + Math.cos(a) * rr, w.y + Math.sin(a) * rr, Math.cos(a) * 30, Math.sin(a) * 30 - 20, 0.6, rnd(3, 6), "#b9a98a"); }
    }
    for (const e of G.enemies) {
      if (e.dead || e.fleeT > 0) continue;
      const d = dist(e.x, e.y, w.x, w.y);
      if (isFlying(e)) { if (e.underWave !== w && d <= w.r && d <= w.max) { e.underWave = w; flyUnder(e, 0); } continue; }   // flyers: shock passes under them
      const tol = e.def ? e.r : e.r * 0.5;
      let mask = w.hit.get(e) || 0;
      for (let i = 0; i < w.bands.length; i++) {
        const bd = w.bands[i];
        // a band hurts only while the front is crossing it (+ slack, at least one frame of travel): late arrivals standing in an old band are safe
        if (w.r < bd.in || w.r - bd.out > slack) continue;
        if (mask & (1 << i)) continue;
        if (e.def ? !enemyAnnulusHit(e, w.x, w.y, bd.in, Math.min(w.r, bd.out)) : d < bd.in - tol || d > Math.min(w.r, bd.out) + tol) continue;   // gaps are safe
        mask |= 1 << i;
        const a = Math.atan2(e.y - w.y, e.x - w.x), dir = i === 0 || d > (bd.in + bd.out) / 2 ? 1 : -1;   // knocked toward the nearest gap
        damageEnemy(e, STOMP.dmg * w.m, Math.cos(a) * STOMP.knock * dir, Math.sin(a) * STOMP.knock * dir);
        e.trail = 0.4;
      }
      w.hit.set(e, mask);
    }
    for (let i = w.pend.length - 1; i >= 0; i--) if (w.pend[i].r <= w.r) { damageBuilding(w.pend[i].b, STOMP.bldg * w.m); w.pend.splice(i, 1); }
  }
  G.stompWaves = G.stompWaves.filter(w => w.age < w.max / STOMP.speed + STOMP.fade + 0.1);
}
function annulus(x, y, ro, ri) { ctx.beginPath(); ctx.arc(x, y, ro, 0, TAU); ctx.arc(x, y, Math.max(0, ri), 0, TAU, true); ctx.fill(); }
// Telegraph (wind-up) and shock bands (after the slam). Gaps are drawn as nothing: calm ground.
function drawStompFx(act) {
  const P = G.P;
  if (act && act.type === "stomp" && !act.fired) {
    const k = clamp(act.t / STOMP.windup, 0, 1), bands = stompBands(lv("stomp"));
    ctx.fillStyle = `rgba(255,150,60,${0.1 + 0.22 * k})`; ctx.strokeStyle = `rgba(255,200,120,${0.4 + 0.4 * k})`; ctx.lineWidth = 2;
    for (const bd of bands) { annulus(P.x, P.y, bd.out, bd.in); ctx.beginPath(); ctx.arc(P.x, P.y, bd.out, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(P.x, P.y, bd.in, 0, TAU); ctx.stroke(); }
  }
  for (const w of G.stompWaves) {
    for (const bd of w.bands) {
      if (bd.tPass === null) continue;
      const a = clamp(1 - (w.age - bd.tPass) / STOMP.fade, 0, 1), ro = Math.min(w.r, bd.out);
      ctx.fillStyle = `rgba(255,140,50,${0.38 * a})`; annulus(w.x, w.y, ro, bd.in);
      ctx.fillStyle = `rgba(255,235,180,${0.22 * a})`; annulus(w.x, w.y, ro, bd.in + (bd.out - bd.in) * 0.55);
      ctx.strokeStyle = `rgba(40,22,12,${0.7 * a})`; ctx.lineWidth = 2; ctx.beginPath();     // cracks across the band
      for (let i = 0; i < 14; i++) { const an = w.rot + i * TAU / 14 + Math.sin(i * 7.3) * 0.1, c = Math.cos(an), s2 = Math.sin(an), m1 = (bd.in + ro) / 2; ctx.moveTo(w.x + c * bd.in, w.y + s2 * bd.in); ctx.lineTo(w.x + Math.cos(an + 0.05) * m1, w.y + Math.sin(an + 0.05) * m1); ctx.lineTo(w.x + Math.cos(an - 0.03) * ro, w.y + Math.sin(an - 0.03) * ro); }
      ctx.stroke();
      if (w.r <= bd.out + 4) { ctx.strokeStyle = "rgba(255,250,225,.95)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, TAU); ctx.stroke(); }   // bright leading edge only inside bands
    }
  }
}

// Tail position at spin angle `ang` (the tail trails directly behind the spinning body).
const tailAngle = ang => ang + Math.PI;
function tailHit(P, an, a, m) {
  const c = Math.cos(an), s2 = Math.sin(an), x0 = P.x + c * TAILSPIN.baseR, y0 = P.y + s2 * TAILSPIN.baseR, x1 = P.x + c * TAILSPIN.reach, y1 = P.y + s2 * TAILSPIN.reach;
  for (const e of G.enemies) {
    if (e.dead || e.fleeT > 0 || isFlying(e) || G.t - (e.tailT ?? -9) < TAILSPIN.hitCd) continue;   // the ground sweep passes under flyers
    if (!enemySegmentHit(e, x0, y0, x1, y1, TAILSPIN.width / 2)) continue;
    e.tailT = G.t;
    const along = Math.hypot(e.x - P.x, e.y - P.y) / TAILSPIN.reach, sweet = along >= TAILSPIN.tipFrac;
    const ra = Math.atan2(e.y - P.y, e.x - P.x);
    damageEnemy(e, TAILSPIN.dmg * m * (sweet ? TAILSPIN.tipMul : 1), Math.cos(ra) * TAILSPIN.knock, Math.sin(ra) * TAILSPIN.knock);
    e.trail = 0.5; G.shake = Math.max(G.shake, sweet ? 5 : 3);
    for (let k = 0; k < 3; k++) addParticle(e.x, e.y, rnd(-110, 110), rnd(-110, 110), 0.25, 3, sweet ? "#fff4a8" : "#ffe9a0");
  }
  if (TAILSPIN.deflect) for (const p of G.projs) {                 // projectiles that touch the tail are batted back
    if (p.friendly || distToSeg(p.x, p.y, x0, y0, x1, y1) > TAILSPIN.width / 2 + p.r + 4) continue;
    const ra = Math.atan2(p.y - P.y, p.x - P.x), sp = Math.hypot(p.vx, p.vy) * 1.25 + 60;
    p.vx = Math.cos(ra) * sp; p.vy = Math.sin(ra) * sp; p.friendly = true; p.color = "#9ff"; p.life = Math.max(p.life, 2.5); p.dmg = (p.dmg + 6) * 2 * m;
  }
  damageCarsInSegment(x0, y0, x1, y1, TAILSPIN.width / 2 + 4);
  for (let r = 36; r <= TAILSPIN.reach; r += 30) {                 // tail smash
    buildingsInCircle(P.x + c * r, P.y + s2 * r, TAILSPIN.width * 0.6, b => { if (G.t - (b.tailT ?? -9) >= 0.15) { b.tailT = G.t; damageBuilding(b, TAILSPIN.bldg * m); G.shake = Math.max(G.shake, 4); } });
  }
}
function updateTailSpin(a, dt) {
  const P = G.P, m = amul("tailspin"), sp = TAILSPIN.rate * dt;
  const prev = P.face;                                             // the body spins; facing is locked to the spin
  P.face += sp; a.spin += sp; P.angVel = 0;
  tailHit(P, tailAngle(prev), a, m);
  tailHit(P, tailAngle(prev + sp * 0.5), a, m);
  tailHit(P, tailAngle(P.face), a, m);
  const tx = P.x + Math.cos(tailAngle(P.face)) * TAILSPIN.reach, ty = P.y + Math.sin(tailAngle(P.face)) * TAILSPIN.reach;
  if (Math.random() < dt * 90) addParticle(tx, ty, Math.cos(P.face + Math.PI / 2) * 70 + rnd(-20, 20), Math.sin(P.face + Math.PI / 2) * 70 + rnd(-20, 20), 0.5, rnd(3, 6), "#b9a98a");   // wind/dust ring
  if (Math.random() < dt * 40) { const ra = Math.random() * TAU, r = rnd(40, TAILSPIN.reach); addParticle(P.x + Math.cos(ra) * r, P.y + Math.sin(ra) * r, Math.cos(ra + 1.57) * 60, Math.sin(ra + 1.57) * 60, 0.4, 2, "#dfe6ea"); }
}

// Per-frame progress for the current action (breath is input-driven, see updateBreath).
function updateAction(dt) {
  const P = G.P, a = P.action;
  if (!a) return;
  if (a.type === "breath") { updateBreath(dt); return; }
  a.t += dt;
  if (a.type === "swipe") {
    if (!a.hit && a.t >= SWIPE.wind) { a.hit = true; swipeStrike(a); }
    if (a.hit && !a.hit2 && swipeLevel() >= 3 && a.t >= SWIPE.wind + SWIPE.strike + SWIPE.followDelay) { a.hit2 = true; swipeFollowUp(a); }
  }
  else if (a.type === "roar") {
    if (!a.fired && a.t < ROAR.wind && Math.random() < dt * ROAR.suction) {      // suction dust drawn INTO the mouth
      const m = mouthPos(), an = Math.random() * TAU, d = rnd(50, 95);
      addParticle(m.x + Math.cos(an) * d, m.y + Math.sin(an) * d, -Math.cos(an) * d * 3.2, -Math.sin(an) * d * 3.2, 0.25, 2.5, "#e6dcc0");
    }
    if (!a.fired && a.t >= ROAR.wind) { a.fired = true; doRoar(); }
  }
  else if (a.type === "stomp") { if (!a.fired && a.t >= STOMP.windup) { a.fired = true; doStomp(); } }
  else if (a.type === "tailspin") updateTailSpin(a, dt);
  else if (a.type === "mega") updateHeavyBeam(a, dt);   // Mega Beam + Super Laser (165)
  else if (a.type === "roll" || a.type === "jump") updateEvade(a, dt);   // 166
  else if (a.type === "dash") {
    const m = amul("dash");
    for (const e of G.enemies) {
      if (e.dead || e.dashHit === a.id) continue;
      if (enemyCircleHit(e, P.x, P.y, 45)) { e.dashHit = a.id; damageEnemy(e, 25 * m, Math.cos(a.ang) * 400, Math.sin(a.ang) * 400); }
    }
    damageCarsInCircle(P.x, P.y, 48);
    buildingsInCircle(P.x, P.y, 48, b => { if (b.shot !== a.id) { b.shot = a.id; damageBuilding(b, 80 * m); } });
  }
  if (P.action === a && a.t >= a.dur) {
    if (isEvading(a)) { P.vx *= 0.1; P.vy *= 0.1; }
    P.action = null;
  }
}

