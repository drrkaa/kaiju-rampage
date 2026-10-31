// ===== js/175-world-marks.js: Footprints, stomp / tremor crater marks, scuffs (dynamic ring-buffer decals) + the per-frame world hook =====
"use strict";
// Marks live in G.world.marks (ring buffer of MARKS.max), are drawn with the world every frame (never baked into the chunk
// canvases) and only when on screen. Hooks called from the existing event sites:
//   onFootstepMark(x, y, ang, side)  from footstep()          onStompMark(x, y, radius)  from doStomp()
//   onTremorMark(x, y, radius)       from spawnTremor()       updateWorldFx(dt)          from updatePlay()
//   drawWorldGround(x0, x1, y0, y1)  from drawWorld()
const MARK_TINT = { street: [6, 6, 8], lot: [6, 6, 8], walk: [48, 46, 42], grass: [74, 50, 28], rubble: [24, 20, 18] };
function addMark(m) {
  const W_ = WS(), ms = W_.marks;
  m.t0 = G.t; m.seed = Math.floor(wr() * 1e6);
  if (ms.length < MARKS.max) ms.push(m); else ms[W_.mi++ % MARKS.max] = m;
}
// Where may a mark go? Not on intact buildings (solid), not in ponds / fountains. Returns the tint or null.
function markTint(x, y) {
  if (anySolid(x, y, 3)) return null;
  const s = surfaceAt(x, y); if (!s) return null;
  return MARK_TINT[s];
}
function onFootstepMark(x, y, ang, side) {
  if (wr() < WEAR.stepChance) groundWearAdd(x + wrr(-5, 5), y + wrr(-5, 5), WEAR.step * wrr(.75, 1.25), WEAR.stepR * wrr(.85, 1.15), true);
  const t = markTint(x, y); if (!t) return;
  addMark({ k: 0, x, y, a: ang + side * 0.1, r: playerAppearance().scale / 1.15 * MARKS.scale, life: MARKS.footLife, c: t, side });
}
function onStompMark(x, y, radius) {
  groundWearAdd(x, y, WEAR.stomp, WEAR.stompR);
  const t = markTint(x, y) || MARK_TINT.rubble;
  addMark({ k: 1, x, y, a: wr() * TAU, r: radius, life: MARKS.stompLife, c: t });
}
function onTremorMark(x, y, radius) {
  groundWearAdd(x, y, WEAR.tremor, radius * WEAR.tremorR);
  damageCarsInCircle(x, y, radius);
  const W_ = WS(), lt = W_.lastTremor;
  if (lt && G.t - lt.t < MARKS.tremorMinGap && Math.hypot(lt.x - x, lt.y - y) < 50) return;
  const t = markTint(x, y); if (!t) return;
  W_.lastTremor = { x, y, t: G.t };
  addMark({ k: 2, x, y, a: wr() * TAU, r: radius * 0.4, life: MARKS.tremorLife, c: t });
}
function updateWorldFx(dt) {
  const P = G.P, W_ = WS(), a = P.action;
  groundWearAdd(P.x, P.y, WEAR.idleRate * dt, WEAR.idleR);
  if (Math.hypot(P.vx, P.vy) > 35) groundWearAdd(P.x, P.y, WEAR.walkRate * dt, WEAR.walkR, true);
  W_.scuffT -= dt;
  const scuff = W_.scuffT <= 0 ? (W_.scuffT = MARKS.scuffEvery, true) : false;
  if (a && a.type === "tailspin") {
    const an = tailAngle(P.face), tx = P.x + Math.cos(an) * TAILSPIN.reach, ty = P.y + Math.sin(an) * TAILSPIN.reach;
    groundWearAdd(tx, ty, WEAR.tailRate * dt, WEAR.tailR);
    if (scuff) { const t = markTint(tx, ty); if (t) addMark({ k: 3, x: tx, y: ty, a: P.face + Math.PI / 2, r: 46, life: MARKS.scuffLife, c: t }); }
  } else if (a && a.type === "dash") {
    groundWearAdd(P.x, P.y, WEAR.dashRate * dt, WEAR.dashR);
    if (scuff) { const t = markTint(P.x, P.y); if (t) addMark({ k: 3, x: P.x - Math.cos(a.ang) * 14, y: P.y - Math.sin(a.ang) * 14, a: a.ang, r: 34, life: MARKS.scuffLife, c: t }); }
  } else if (a && a.type === "breath" && a.phase === "fire")
    groundWearAdd(P.x + Math.cos(P.face) * P.bl, P.y + Math.sin(P.face) * P.bl, WEAR.breathRate * dt, WEAR.breathR);
  updateWorldCars(dt);
}

// ---- drawing (called with the world transform active; ground level, below entities)
function drawWorldGround(vx0, vx1, vy0, vy1) {
  const W_ = G.world; if (!W_) return;
  const now = G.t;
  for (const m of W_.marks) {
    const age = now - m.t0; if (age >= m.life || age < 0) continue;
    const reach = m.k === 1 ? m.r : m.k === 0 ? 20 : m.r + 10;
    if (m.x < vx0 - reach || m.x > vx1 + reach || m.y < vy0 - reach || m.y > vy1 + reach) continue;
    const f = age / m.life, fade = f < 0.55 ? 1 : 1 - (f - 0.55) / 0.45, col = m.c, rgb = col[0] + "," + col[1] + "," + col[2];
    if (m.k === 2) { ctx.save();clipTremorGround(m.x,m.y,m.r*1.6+20); }
    if (m.k === 0) {                                                  // footprint: heel, ball, three claw toes
      const L = MARKS.footLen * m.r, Wd = MARKS.footWid * m.r;
      ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.a);
      ctx.fillStyle = `rgba(${rgb},${MARKS.footAlpha * fade})`; ctx.beginPath();
      ctx.ellipse(-0.26 * L, 0, 0.27 * L, 0.36 * Wd, 0, 0, TAU);
      ctx.moveTo(0.42 * L, 0); ctx.ellipse(0.12 * L, 0, 0.3 * L, 0.5 * Wd, 0, 0, TAU);
      for (let i = -1; i <= 1; i++) { ctx.moveTo(0.78 * L, i * 0.38 * Wd); ctx.ellipse(0.62 * L, i * 0.38 * Wd, 0.17 * L, 0.15 * Wd, i * 0.25, 0, TAU); }
      ctx.fill(); ctx.restore();
    } else if (m.k === 3) {                                           // scuff streak
      const c = Math.cos(m.a), s = Math.sin(m.a), h = m.r / 2;
      ctx.strokeStyle = `rgba(${rgb},${0.3 * fade})`; ctx.lineWidth = 3.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(m.x - c * h, m.y - s * h); ctx.lineTo(m.x + c * h, m.y + s * h); ctx.stroke(); ctx.lineCap = "butt";
    } else {                                                          // stomp (1) / tremor (2): crater, cracks, faint ring
      const big = m.k === 1, cr = big ? MARKS.stompCrater : m.r * 0.5, len = big ? MARKS.stompCrack : m.r * 0.9, al = (big ? MARKS.stompAlpha : MARKS.stompAlpha * 0.6) * fade;
      ctx.fillStyle = `rgba(${rgb},${al * 0.55})`; ctx.beginPath(); ctx.ellipse(m.x, m.y, cr, cr * 0.75, m.a, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(${rgb},${al * 0.7})`; ctx.beginPath(); ctx.ellipse(m.x, m.y, cr * 0.55, cr * 0.4, m.a, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(${rgb},${al})`; ctx.lineWidth = big ? 2.2 : 1.5; ctx.beginPath();
      const n = big ? 10 : 6;
      for (let i = 0; i < n; i++) {
        const an = m.a + i * TAU / n + (rs(m.seed, i) - 0.5) * 0.4, l1 = len * (0.45 + 0.55 * rs(m.seed, i + 20)), c = Math.cos(an), s = Math.sin(an);
        const bend = (rs(m.seed, i + 40) - 0.5) * 0.7;
        ctx.moveTo(m.x + c * cr * 0.6, m.y + s * cr * 0.6);
        ctx.lineTo(m.x + Math.cos(an + bend) * (cr + l1 * 0.5), m.y + Math.sin(an + bend) * (cr + l1 * 0.5));
        ctx.lineTo(m.x + Math.cos(an - bend * 0.5) * (cr + l1), m.y + Math.sin(an - bend * 0.5) * (cr + l1));
      }
      ctx.stroke();
      if (big) { ctx.strokeStyle = `rgba(${rgb},${0.18 * fade})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * MARKS.stompRing, 0, TAU); ctx.stroke(); }
    }
    if (m.k === 2) ctx.restore();
  }
  drawWorldCars();
}
