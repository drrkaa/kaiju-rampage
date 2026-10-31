// [js-split] ===== js/180-bosses.js: Telegraphed hazards and boss AI (BATK attack table, pickAttack, updateBoss) =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// ----------------------------------------------------------------- HAZARDS ---
// Telegraphed attack zones. They show a red warning for `warn` seconds, then are
// live for `dur` seconds. kinds: circle {r}, line {len,w,ang}, sector {len,arc,ang}.
function addHazard(owner, h) {
  if (G.hazards.length >= MAX_HAZARDS) return null;
  h.owner = owner; h.warn0 = h.warn; h.dur0 = h.dur; h.fired = false; h.hit = false; h.tick = 0;
  G.hazards.push(h);
  return h;
}
function hazardHitsPlayer(h) {
  const P = G.P, pr = 20;
  if (h.kind === "circle") return dist(P.x, P.y, h.x, h.y) < h.r + pr;
  if (h.kind === "line") return distToSeg(P.x, P.y, h.x, h.y, h.x + Math.cos(h.ang) * h.len, h.y + Math.sin(h.ang) * h.len) < h.w / 2 + pr;
  if (h.kind === "sector") { const d = dist(P.x, P.y, h.x, h.y); return d < h.len && Math.abs(angDiff(Math.atan2(P.y - h.y, P.x - h.x), h.ang)) < h.arc / 2; }
  return false;
}
function updateHazards(dt) {
  for (const h of G.hazards) {
    if (h.follow) { if (h.follow.dead) { h.warn = 0; h.dur = 0; continue; } h.x = h.follow.x; h.y = h.follow.y; }
    if (h.warn > 0) { h.warn -= dt; continue; }
    if (!h.fired) {
      h.fired = true;
      if (h.bldg) {
        buildingsInCircle(h.x, h.y, h.r, b => damageBuilding(b, 200));
        crushCars(h.x, h.y, h.r);
        G.shake = Math.max(G.shake, 6);
        for (let i = 0; i < 8; i++) addParticle(h.x + rnd(-h.r, h.r) * 0.6, h.y + rnd(-h.r, h.r) * 0.6, rnd(-90, 90), rnd(-90, 90), 0.5, 4, "#c96");
        ringFx(h.x, h.y, h.r, "255,120,60");
      }
    }
    if (h.rot) h.ang += h.rot * dt;
    h.dur -= dt;
    worldHazardCars(h, dt);
    if (!h.harmless && hazardHitsPlayer(h)) {
      if (h.once) { if (!h.hit) { h.hit = true; hurtPlayer(h.dmg); } }
      else { h.tick -= dt; if (h.tick <= 0) { h.tick = 0.25; hurtPlayer(h.dmg); } }
    }
  }
  G.hazards = G.hazards.filter(h => h.warn > 0 || h.dur > 0);
}

// ----------------------------------------------------------------- BOSS AI ---
// Each attack: start(e) spawns telegraphs, run(e,dt) returns true when finished, rec = recovery seconds.
const chargeTune = e => BOSS_TUNE.charge[e.def.id] || BOSS_TUNE.charge.voltgaze;
const recMul = e => BOSS_TUNE.recMul[e.def.id] || 1;
function bossLightning(e, fan) {
  const a = Math.atan2(G.P.y - e.y, G.P.x - e.x);
  e.ang = a;
  for (let i = -fan; i <= fan; i++) addHazard(e, {
    kind: "line", electric: true, x: e.x, y: e.y, ang: a + i * 0.3,
    len: BOSS_TUNE.lightningRange, w: BOSS_TUNE.lightningWidth,
    warn: BOSS_TUNE.lightningWarn, dur: 0.22, dmg: 19, once: true
  });
}
const BATK = {
  lightning: { rec: 0.8, start(e) { bossLightning(e, 0); }, run(e) { return e.at >= BOSS_TUNE.lightningWarn + 0.25; } },
  storm: { rec: 1, start(e) { bossLightning(e, 1); }, run(e) { return e.at >= BOSS_TUNE.lightningWarn + 0.25; } },
  charge: {
    rec: 1.0,
    start(e) {
      const P = G.P, w0 = chargeTune(e).warn;
      e.cdir = Math.atan2(P.y - e.y, P.x - e.x); e.w0 = w0;
      addHazard(e, { kind: "line", x: e.x, y: e.y, ang: e.cdir, len: 720, w: e.r * 1.8, warn: w0, dur: 0.05, harmless: true });
    },
    run(e, dt) {
      e.ang = e.cdir;
      const ct = chargeTune(e);
      if (e.at >= e.w0 && e.at < e.w0 + ct.dur) {
        const sp = ct.speed;
        e.x += Math.cos(e.cdir) * sp * dt; e.y += Math.sin(e.cdir) * sp * dt;
        e.charging = true;
      } else e.charging = false;
      return e.at >= e.w0 + ct.dur;
    },
  },
  spin: {
    rec: 0.7,
    start(e) {
      e.hz = addHazard(e, { kind: "circle", x: e.x, y: e.y, r: e.r + BOSS_TUNE.spinReach, spin: true, warn: BOSS_TUNE.spinWarn, dur: 1.2, dmg: 13, follow: e });
    },
    run(e, dt) { e.spinOn = e.at > BOSS_TUNE.spinWarn; if (e.spinOn) e.spinA += dt * 14; const done = e.at >= BOSS_TUNE.spinWarn + 1.25; if (done) e.spinOn = false; return done; },
  },
  fan: {
    rec: 0.7,
    start(e) {
      e.cdir = Math.atan2(G.P.y - e.y, G.P.x - e.x); e.fired = false;
      addHazard(e, { kind: "sector", x: e.x, y: e.y, ang: e.cdir, len: 560, arc: 1.1, warn: 0.7, dur: 0.05, harmless: true, follow: e });
    },
    run(e) {
      e.ang = e.cdir;
      if (e.at >= 0.7 && !e.fired) {
        e.fired = true;
        for (let i = 0; i < 7; i++) fireProj(e.x, e.y, e.cdir + (i - 3) * 0.17, 330, 16, 7, 2.2, "#ffe14a");
        G.shake = Math.max(G.shake, 4);
      }
      return e.at >= 1.0;
    },
  },
  slam: {
    rec: 0.6,
    start(e) {
      const P = G.P, n = e.def.id === "ragehorn" ? 2 : e.def.id === "omega" && e.phase >= 3 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, d = i ? rnd(60, 280) : 0;
        addHazard(e, { kind: "circle", x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d, r: 95, warn: BOSS_TUNE.slamWarn + i * 0.15, dur: 0.25, dmg: 28, once: true, bldg: true });
      }
    },
    run(e) { return e.at >= BOSS_TUNE.slamWarn + 0.7; },
  },
  burst: {
    rec: 0.5,
    start(e) {
      e.fired = false;
      addHazard(e, { kind: "circle", x: e.x, y: e.y, r: e.r + 40, warn: 0.6, dur: 0.05, harmless: true, follow: e });
    },
    run(e) {
      if (e.at >= 0.6 && !e.fired) {
        e.fired = true;
        const n = e.phase >= 3 ? 26 : 16, off = Math.random() * TAU;
        for (let i = 0; i < n; i++) fireProj(e.x, e.y, off + (i / n) * TAU, 210, 14, 8, 4.5, "#ff5ad0");
        ringFx(e.x, e.y, 170, "200,100,255");
      }
      return e.at >= 0.9;
    },
  },
  beam: {
    rec: 0.8,
    start(e) {
      const a0 = Math.atan2(G.P.y - e.y, G.P.x - e.x), dir = Math.random() < 0.5 ? 1 : -1, sweep = 1.8;
      e.hz = addHazard(e, { kind: "line", x: e.x, y: e.y, ang: a0 - dir * sweep / 2, len: 760, w: 56, warn: 1.0, dur: 1.8, dmg: 15, rot: dir * sweep / 1.8, follow: e });
    },
    run(e) { if (e.hz) e.ang = e.hz.ang; return e.at >= 2.9; },
  },
  meteors: {
    rec: 0.5,
    start(e) {
      const P = G.P;
      for (let i = 0; i < 9; i++) {
        const a = Math.random() * TAU, d = Math.random() * 380;
        addHazard(e, { kind: "circle", x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d, r: 70, warn: BOSS_TUNE.rainWarn + i * 0.18, dur: 0.2, dmg: 22, once: true, bldg: true });
      }
    },
    run(e) { return e.at >= BOSS_TUNE.rainWarn + 9 * 0.18 + 0.3; },
  },
  summon: {
    rec: 0.6,
    start(e) {
      const alive = G.enemies.filter(o => o.add && !o.dead).length, n = Math.min(BOSS_ADDS_MAX - alive, 6);   // adds are capped
      for (let i = 0; i < n; i++) { const a = (i / 6) * TAU, o = spawnEnemy("soldier", e.x + Math.cos(a) * (e.r + 40), e.y + Math.sin(a) * (e.r + 40)); if (o) o.add = true; }
      ringFx(e.x, e.y, 200, "255,80,80");
    },
    run(e) { return e.at >= 0.8; },
  },
  leap: {                       // jump onto the player's position: marked landing zone, then a hard slam
    rec: 1.0,
    start(e) {
      const P = G.P; let tx = P.x, ty = P.y; const d = dist(tx, ty, e.x, e.y);
      if (d > 520) { tx = e.x + (tx - e.x) / d * 520; ty = e.y + (ty - e.y) / d * 520; }
      e.lx = e.x; e.ly = e.y; e.tx = tx; e.ty = ty; e.landed = false;
      addHazard(e, { kind: "circle", x: tx, y: ty, r: 115, warn: BOSS_TUNE.leapWarn, dur: 0.25, dmg: 30, once: true, bldg: true });
    },
    run(e, dt) {
      const lw = BOSS_TUNE.leapWarn, k = clamp((e.at - (lw - 0.75)) / 0.75, 0, 1), ez = k * k * (3 - 2 * k);
      e.ang = Math.atan2(e.ty - e.ly, e.tx - e.lx);
      if (e.at > lw - 0.75) { e.x = lerp(e.lx, e.tx, ez); e.y = lerp(e.ly, e.ty, ez); e.lift = Math.sin(Math.PI * k) * 40; }
      if (e.at >= lw && !e.landed) { e.landed = true; e.lift = 0; G.shake = Math.max(G.shake, 14); }
      return e.at >= lw + 0.2;
    },
  },
  dcharge: {                    // two charges back to back (re-aimed in between)
    rec: 1.3,
    start(e) { e.nch = 2; BATK.charge.start(e); },
    run(e, dt) {
      const done = BATK.charge.run(e, dt);
      if (done && e.nch > 1) { e.nch--; e.at = 0; BATK.charge.start(e); e.w0 = chargeTune(e).dwarn; const hz = G.hazards[G.hazards.length - 1]; if (hz && hz.owner === e) hz.warn = hz.warn0 = e.w0; return false; }   // 2nd dash: shorter, but the lane telegraph matches
      return done;
    },
  },
  rubble: {                     // rip chunks out of nearby buildings and hurl them at marked zones around the player
    rec: 0.7,
    start(e) {
      const P = G.P, n = e.phase >= 3 ? 4 : e.phase >= 2 ? 3 : 2, cand = [];
      buildingsInCircle(e.x, e.y, 420, b => cand.push(b));
      e.rn = n;
      for (let i = 0; i < n; i++) {
        const src = cand.length ? cand[Math.floor(Math.random() * cand.length)] : null;
        let x0 = e.x, y0 = e.y;
        if (src) { x0 = src.x + src.w / 2; y0 = src.y + src.h / 2; damageBuilding(src, src.maxHp * 0.7); }
        const a = Math.random() * TAU, d = i ? rnd(60, 220) : 0;
        addHazard(e, { kind: "circle", x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d, r: 85, warn: BOSS_TUNE.rubbleWarn + i * 0.22, dur: 0.25, dmg: 26, once: true, bldg: true, rock: { x0, y0 } });
      }
    },
    run(e) { return e.at >= BOSS_TUNE.rubbleWarn + e.rn * 0.22 + 0.2; },
  },
  volley: {                     // three aimed salvos
    rec: 0.8,
    start(e) {
      e.vn = 0; e.cdir = Math.atan2(G.P.y - e.y, G.P.x - e.x);
      addHazard(e, { kind: "sector", x: e.x, y: e.y, ang: e.cdir, len: 520, arc: 0.4, warn: 0.6, dur: 0.05, harmless: true, follow: e });
    },
    run(e) {
      e.ang = e.cdir;
      if (e.vn < 3 && e.at >= 0.6 + e.vn * 0.35) {
        e.cdir = Math.atan2(G.P.y - e.y, G.P.x - e.x); e.ang = e.cdir; e.vn++;
        for (let i = -1; i <= 1; i++) fireProj(e.x, e.y, e.cdir + i * 0.13, 300, 15, 7, 2.4, "#ffe14a");
        G.shake = Math.max(G.shake, 3);
      }
      return e.at >= 1.7;
    },
  },
  spiral: {                     // enrage pattern: rotating double spiral of projectiles
    rec: 1.1,
    start(e) { e.sa = Math.random() * TAU; e.sn = 0; addHazard(e, { kind: "circle", x: e.x, y: e.y, r: e.r + 60, warn: 0.8, dur: 0.05, harmless: true, follow: e }); },
    run(e) {
      if (e.at >= 0.8 && e.at >= 0.8 + e.sn * 0.09 && e.sn < 22) {
        e.sn++; e.sa += 0.47;
        fireProj(e.x, e.y, e.sa, 205, 13, 7, 4, "#ff5ad0"); fireProj(e.x, e.y, e.sa + Math.PI, 205, 13, 7, 4, "#ff5ad0");
      }
      return e.at >= 0.8 + 22 * 0.09 + 0.2;
    },
  },
};
BATK.rain = BATK.meteors;          // debris rain: marked zones around the player drop one after another

function pickAttack(e) {
  const list = e.def.attacks[Math.min(e.phase - 1, e.def.attacks.length - 1)].filter(a => a[0] !== e.lastAtk || e.def.attacks[0].length < 2);
  let tot = 0; for (const a of list) tot += a[1];
  let r = Math.random() * tot; for (const a of list) { r -= a[1]; if (r <= 0) return a[0]; }
  return list[0][0];
}

function updateBoss(e, dt) {
  const P = G.P, def = e.def;
  const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  e.flash = Math.max(0, e.flash - dt); e.hitCd -= dt; e.t += dt; e.numT -= dt; e.trail = Math.max(0, (e.trail || 0) - dt);
  e.kx *= Math.exp(-6 * dt); e.ky *= Math.exp(-6 * dt);
  e.x += e.kx * dt; e.y += e.ky * dt;
  if (e.intro > 0) { e.intro -= dt; e.ang = Math.atan2(dy, dx); return; }
  {                                                    // phases by HP fraction
    const f = e.hp / e.maxHp; let ph = 1; for (const t of def.phaseAt) if (f < t) ph++;
    if (ph > e.phase) {
      e.phase = ph; e.mode = "phase"; e.modeT = 1.8; e.inv = true; e.atk = null; e.charging = false; e.spinOn = false; e.tired = false; e.lift = 0;
      G.hazards = G.hazards.filter(h => h.owner !== e);
      ringFx(e.x, e.y, 420, "255,90,60"); G.shake = 18;
      banner(ph === def.phaseAt.length + 1 && ph > 2 ? "PHASE " + ph + ": ENRAGED!" : "PHASE " + ph + ": " + def.name + " GROWS ANGRIER", 3);
      G.projs.length = 0; e.comboLeft = def.combo[Math.min(ph - 1, def.combo.length - 1)];
    }
  }
  const ph = e.phase - 1;
  e.speed = def.moveSpeed[Math.min(ph, def.moveSpeed.length - 1)];
  if (e.mode === "phase") {
    e.modeT -= dt; e.glow = 1;
    if (e.modeT <= 0) { e.inv = false; e.mode = "idle"; e.modeT = 0.8; }
  } else if (e.mode === "idle") {
    e.ang = Math.atan2(dy, dx);
    if (def.style === "spitter") {            // keep range: approach/retreat, strafe in between
      if (d > 420) { e.x += ux * e.speed * dt; e.y += uy * e.speed * dt; }
      else if (d < 270) { e.x -= ux * e.speed * dt; e.y -= uy * e.speed * dt; }
      else { e.x += -uy * e.speed * 0.6 * dt; e.y += ux * e.speed * 0.6 * dt; }
    } else {
      const gap = e.r + PLAYER.radius * playerAppearance().scale + BOSS_TUNE.standOff;
      const step = clamp(d - gap, -e.speed * dt, e.speed * dt);
      e.x += ux * step; e.y += uy * step;
    }
    e.modeT -= dt;
    if (e.modeT <= 0) {
      e.atk = pickAttack(e); e.lastAtk = e.atk;
      e.mode = "attack"; e.at = 0; e.hz = null;
      BATK[e.atk].start(e);
    }
  } else if (e.mode === "attack") {
    e.at += dt;
    e.glow = 0.5;
    if (BATK[e.atk].run(e, dt)) {
      e.charging = false; e.spinOn = false; e.glow = 0; e.comboLeft--;
      if (e.comboLeft <= 0) { e.mode = "rest"; e.modeT = BATK[e.atk].rec * recMul(e) + def.rest[Math.min(ph, def.rest.length - 1)]; e.tired = true; }   // combo over: tired, vulnerable
      else { e.mode = "recover"; e.modeT = BATK[e.atk].rec * recMul(e); }
    }
  } else if (e.mode === "recover") {
    e.modeT -= dt;
    if (e.modeT <= 0) { e.mode = "idle"; e.modeT = BOSS_TUNE.chainGap; }
  } else if (e.mode === "rest") {
    e.modeT -= dt;                                      // stands still, tired
    if (e.modeT <= 0) { e.tired = false; e.comboLeft = def.combo[Math.min(ph, def.combo.length - 1)]; e.mode = "idle"; e.modeT = def.idle[Math.min(ph, def.idle.length - 1)]; }
  }
  { const moving = e.mode === "idle" && d > e.r + 30 ? 3 : e.charging ? 12 : e.mode === "leap" ? 0 : 0.4; e.walkA = (e.walkA || 0) + dt * moving * 2.2; }
  // contact damage (harder while charging) and stomping the city
  if (d < e.r + PLAYER.radius * 0.8 && e.hitCd <= 0) { e.hitCd = 0.6; hurtPlayer(def.contact * (e.charging ? 1.6 : 1)); }
  { const hit = []; buildingsInCircle(e.x, e.y, e.r, b => hit.push(b));       // walks through buildings, rubbling them (rate-capped)
    if (hit.length) { const per = Math.min(e.charging ? BOSS_BLDG.chargeDps : BOSS_BLDG.dps, BOSS_BLDG.capDps / hit.length) * dt; for (const b of hit) damageBuilding(b, per); } }
  if (Math.random() < 0.3) crushCars(e.x, e.y, e.r * 0.8);
}

