// ===== js/165-ability-superlaser.js: Heavy beams (Mega Beam + Super Laser share this path), the leveled Super Laser card, per-frame beam/HUD fx update =====
"use strict";
// Constants: MEGA, SUPERLASER, BEAM_SPECS, BEAM_FX (035). Drawing: 245-draw-beams.js. The action type is "mega" for both; a.beam = "mega" | "superlaser".
const heavyDur = spec => spec.charge + spec.active + spec.taper;
// Beam intensity k: 0 while building up, 1 while active, 1 -> 0 over the taper.
function heavyBeamK(a, spec) {
  const t = a.t;
  if (t < spec.charge) return 0;
  if (t < spec.charge + spec.active) return 1;
  return clamp(1 - (t - spec.charge - spec.active) / spec.taper, 0, 1);
}
const smooth01 = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
// The Super Laser is ONE level-up card with levels (HEAVY_LV in 035): Lv1-2 fire the old Mega Beam (45 charge, no screen dim), Lv3+ the real Super Laser.
const heavyStats = () => HEAVY_LV[clamp(G.P.up.superlaser || 1, 1, HEAVY_LV.length) - 1];
const heavyBeamId = () => heavyStats().beam;
const heavyPower = id => id === "mega" && !G.P.up.superlaser ? 1 : heavyStats().pow;   // plain "mega" (tests / legacy) without the card = base power
const isSuperLaser = () => (G.P.up.superlaser || 0) >= 3;
const heavyChargeSpec = id => BEAM_SPECS[id === "mega" ? "mega" : heavyBeamId()];
const heavyChargeReady = id => G.P.charge >= heavyChargeSpec(id).minCharge;
const superLaserReady = () => isSuperLaser() && G.P.charge >= SUPERLASER.minCharge;
UPGRADES.push({ id: "superlaser", get name() { return ABILS.superlaser.name; }, max: HEAVY_LV.length, get color() { return ABILS.superlaser.color; }, abil: true,
  title: l => l >= 3 ? (l === 3 ? "SUPER LASER" : `Super Laser Lv ${l}`) : l === 1 ? "Mega Beam" : `Mega Beam Lv ${l}`,
  desc: l => l === 1 ? `UNLOCK [${SLOT_LABELS[Math.max(0, freeSlot())]}]: huge beam. Uses ${MEGA.cost} charge, no cooldown. Evolves at Lv3`
    : l === 2 ? `Mega Beam: +35% damage. Uses ${MEGA.cost} charge. Next level: SUPER LASER`
    : l === 3 ? `SUPER LASER: enormous range and damage. Drains ${SUPERLASER.cost} charge while firing, no cooldown`
    : `Super Laser: +30% damage. Drains ${SUPERLASER.cost} charge while firing, no cooldown`,
  apply: P => {
    if (P.up.superlaser === 1) { P.slots[P.slots.indexOf(null)] = "superlaser"; P.cds.superlaser = 0; }
    if (P.up.superlaser === 3) { G.slBanner = { t: SUPERLASER.bannerTime, max: SUPERLASER.bannerTime, slot: P.slots.indexOf("superlaser"), how: "evolved" }; sfx("roar"); }
  } });
function startHeavyBeam(id) {
  const spec = BEAM_SPECS[id];
  if (G.P.action) return false;
  if (G.P.charge < spec.minCharge) { failSuperLaser(); return false; }
  if (!spec.gradualDrain) G.P.charge = Math.max(0, G.P.charge - spec.cost);
  startAction("mega", heavyDur(spec), { tick: 0, beam: id, chargeSpent: 0 });
  if (id === "superlaser") sfx("roar");
  return true;
}
function failSuperLaser() { G.P.failT = 0.5; sfx("fail"); }

// Beam geometry for the current frame (follows the slowly turning facing).
function heavyBeamLine(spec) {
  const P = G.P, c = Math.cos(P.face), s = Math.sin(P.face);
  const mo = mouthOf();                                            // starts at the drawn mouth (scales with growth)
  return { sx: mo.x, sy: mo.y, ex: P.x + c * spec.len, ey: P.y + s * spec.len, c, s };
}
function updateHeavyBeam(a, dt) {
  const P = G.P, id = a.beam || "mega", spec = BEAM_SPECS[id], m = heavyPower(id);
  if (spec.gradualDrain) {
    // Cumulative time makes the total exact even when the final frame overshoots.
    const spent = spec.cost * clamp((a.t - spec.charge) / (spec.active + spec.taper), 0, 1);
    P.charge = Math.max(0, P.charge - Math.max(0, spent - (a.chargeSpent || 0)));
    a.chargeSpent = spent;
  }
  const k = heavyBeamK(a, spec), L = heavyBeamLine(spec);
  if (a.t < spec.charge) {                                         // build-up: suction embers + growing tremble
    const u = a.t / spec.charge;
    G.shake = Math.max(G.shake, 2.5 * u * (spec === SUPERLASER ? 1.6 : 1));
    if (Math.random() < dt * (40 + 60 * u)) {
      const an = Math.random() * TAU, d = rnd(60, 130) * (spec === SUPERLASER ? 1.5 : 1);
      addParticle(L.sx + Math.cos(an) * d, L.sy + Math.sin(an) * d, -Math.cos(an) * d * 3, -Math.sin(an) * d * 3, 0.3, 2.5, spec.embers[0]);
    }
  } else if (k > 0.04) {
    a.tick -= dt;
    if (a.tick <= 0) {
      a.tick = spec.tick; sfx("beam");
      const w = spec.halfW * Math.pow(k, BEAM_FX.taperWidthPow);
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (enemySegmentHit(e, L.sx, L.sy, L.ex, L.ey, w)) damageEnemy(e, spec.dmg * m * k, L.c * spec.knock, L.s * spec.knock);
      }
      damageCarsInSegment(L.sx, L.sy, L.ex, L.ey, w);              // beams wreck cars on their path (world chunk)
      const id2 = ++G.shotId;
      for (let s = 0; s <= spec.len; s += 40) {
        const px = L.sx + (L.ex - L.sx) * s / spec.len, py = L.sy + (L.ey - L.sy) * s / spec.len;
        buildingsInCircle(px, py, w, b => {
          if (b.shot === id2) return;
          b.shot = id2; damageBuilding(b, spec.bldg * m * k);
          if (G.flares.length < 30) G.flares.push({ x: px, y: py, t: 0.2, r: 12 + rnd(0, 12) });
        });
      }
      G.shake = Math.max(G.shake, spec.shake * (0.4 + 0.6 * k));
    }
    if (k < 1) {                                                   // taper: embers drift off the path
      const n = BEAM_FX.emberRate * k * dt;
      for (let i = 0; i < n + (Math.random() < n % 1 ? 1 : 0); i++) {
        const s = Math.random();
        addParticle(L.sx + (L.ex - L.sx) * s + rnd(-spec.halfW, spec.halfW) * 0.5, L.sy + (L.ey - L.sy) * s + rnd(-spec.halfW, spec.halfW) * 0.5,
          rnd(-40, 40), rnd(-70, -10), rnd(0.4, 0.9), rnd(2, 4.5), spec.embers[Math.floor(Math.random() * spec.embers.length)]);
      }
    }
  }
  if (!a.scorched && a.t >= spec.charge + spec.active) {           // lingering scorch along the path (ground decals, budgeted)
    a.scorched = true;
    const n = Math.min(BEAM_FX.scorchMax, Math.floor(spec.len / BEAM_FX.scorchSpacing));
    for (let i = 1; i <= n && G.decals.length < BEAM_FX.decalBudget; i++) {
      const s = i / n;
      G.decals.push({ x: L.sx + (L.ex - L.sx) * s + rnd(-6, 6), y: L.sy + (L.ey - L.sy) * s + rnd(-6, 6), r: spec.halfW * rnd(0.25, 0.4), t: BEAM_FX.scorchLife });
    }
  }
  if (!a.glowed && a.t + dt >= a.dur) {                            // beam ends this frame: leave a fading afterglow line
    a.glowed = true;
    if (!G.beamGlows) G.beamGlows = [];
    if (G.beamGlows.length < BEAM_FX.glowMax) G.beamGlows.push({ x0: L.sx, y0: L.sy, x1: L.ex, y1: L.ey, w: spec.drawW, rgb: spec.rgb[1], t: BEAM_FX.glowTime, max: BEAM_FX.glowTime });
  }
}
// Per-frame update of beam leftovers + charge/tease HUD timers (one call from updatePlay).
function updateBeamFx(dt) {
  if (G.beamGlows) { for (const g of G.beamGlows) g.t -= dt; G.beamGlows = G.beamGlows.filter(g => g.t > 0); }
  updateChargeFx(dt);
  if (G.tease === undefined) G.tease = TEASE.runBanner;
  G.tease = Math.max(0, G.tease - dt);
  if (G.slBanner) { G.slBanner.t -= dt; if (G.slBanner.t <= 0) G.slBanner = null; }
}

// ---- Debug / legacy unlock (the Super Laser is no longer granted by killing Ragehorn; it is a normal level-up card) ----
// Gives the card at level 3 (the Super Laser form) in a free Q/E slot, replacing the weakest ability if both are taken. Returns "granted" | "replaced" | null.
function unlockSuperLaser(silent) {
  const P = G.P;
  if ((P.up.superlaser || 0) >= 3) return null;
  let how = "granted", slot = P.slots.indexOf("superlaser");
  if (slot < 0) {
    slot = P.slots.indexOf(null);
    if (slot < 0 || slot > 1) {
      how = "replaced"; slot = 0;
      if (lv(P.slots[1]) < lv(P.slots[0])) slot = 1;
      delete P.cds[P.slots[slot]];
    }
  }
  P.up.superlaser = 3; P.cds.superlaser = 0; P.slots[slot] = "superlaser";
  if (silent) P.charge = 100;
  return how;
}
// Kept as a no-op: 205-player-look.js still calls it from onBossKilled. Bosses no longer grant the Super Laser.
function superLaserOnBossKilled(boss) {}
