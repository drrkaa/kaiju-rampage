// ===== js/085-world-cars.js: Attacks destroy cars: shared damageCars* helpers, launch/flip effect, burning wrecks, wreck art =====
"use strict";
// Everything dynamic lives in G.world (created lazily, so every new run starts clean). Destroyed cars use the same persistent
// record as walked-over ones (car.dead + bState id -> 0), so wrecks survive chunk eviction.
function WS() { return G.world || (G.world = { wear: new Map(), marks: [], mi: 0, fly: [], fires: [], scuffT: 0, lastTremor: null, carsKilled: 0 }); }
let wSeed = 0x2f6e2b1;
function wr() { wSeed = (wSeed + 0x6D2B79F5) | 0; let t = Math.imul(wSeed ^ (wSeed >>> 15), 1 | wSeed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }   // own PRNG: world effects never disturb the gameplay random sequence
const wrr = (a, b) => a + (b - a) * wr();

// Call fn(car, chunk) for every live car in the chunks touching the box.
function carsInBox(x0, y0, x1, y1, fn) {
  const cx0 = Math.floor(x0 / CHUNK), cx1 = Math.floor(x1 / CHUNK), cy0 = Math.floor(y0 / CHUNK), cy1 = Math.floor(y1 / CHUNK);
  for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
    const ch = getChunk(cx, cy), list = ch.cars;
    for (let i = 0; i < list.length; i++) if (!list[i].dead) fn(list[i], ch);
  }
}
function killCar(car, ch, ox, oy) {
  car.dead = true; ch.dirty = true; if(car.lot)car.lot.dirty=true; persist(car.id, 0);
  const W_ = WS(), mx = car.x + car.w / 2, my = car.y + car.h / 2;
  W_.carsKilled++;
  let dx = mx - ox, dy = my - oy; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
  if (W_.fly.length < WORLD_CARS.flyMax)
    W_.fly.push({ x: mx, y: my, w: car.w, h: car.h, col: car.col, vx: dx * WORLD_CARS.flySpeed * wrr(0.6, 1.2), vy: dy * WORLD_CARS.flySpeed * wrr(0.6, 1.2), t: 0, spin: wrr(-7, 7), a0: car.w > car.h ? 0 : Math.PI / 2 });
  if (W_.fires.length < WORLD_CARS.fireMax) W_.fires.push({ x: mx, y: my, t: 0 });
  for (let i = 0; i < WORLD_CARS.sparks; i++) addParticle(mx, my, wrr(-130, 130), wrr(-130, 130), wrr(0.2, 0.5), 2 + wr() * 2, wr() < 0.6 ? "#ffd36a" : "#fff3b0");
  G.shake = Math.max(G.shake, WORLD_CARS.shake);
  if (WORLD_CARS.xp > 0) awardXp(WORLD_CARS.xp, mx, my, true);
}
// Circle (optionally filtered by `ok(cx, cy)` on the car centre). Returns the number of cars destroyed.
function damageCarsInCircle(x, y, r, ok) {
  let n = 0;
  carsInBox(x - r, y - r, x + r, y + r, (car, ch) => {
    const nx = clamp(x, car.x, car.x + car.w), ny = clamp(y, car.y, car.y + car.h);
    if ((nx - x) * (nx - x) + (ny - y) * (ny - y) > r * r) return;
    if (ok && !ok(car.x + car.w / 2, car.y + car.h / 2)) return;
    killCar(car, ch, x, y); n++;
  });
  return n;
}
// Fat line segment (beams, tail, crescent front); halfW is the half width.
function damageCarsInSegment(x0, y0, x1, y1, halfW) {
  let n = 0;
  carsInBox(Math.min(x0, x1) - halfW - 14, Math.min(y0, y1) - halfW - 14, Math.max(x0, x1) + halfW + 14, Math.max(y0, y1) + halfW + 14, (car, ch) => {
    const mx = car.x + car.w / 2, my = car.y + car.h / 2;
    if (distToSeg(mx, my, x0, y0, x1, y1) > halfW + Math.max(car.w, car.h) * 0.5) return;
    killCar(car, ch, x0, y0); n++;
  });
  return n;
}
// Claw cone: within `range` and inside the arc around `ang` (cars right next to the kaiju are always hit).
function damageCarsInCone(x, y, ang, range, arc) {
  return damageCarsInCircle(x, y, range, (cx, cy) => { const d = Math.hypot(cx - x, cy - y); return d < 30 || Math.abs(angDiff(Math.atan2(cy - y, cx - x), ang)) < arc / 2 + 0.15; });
}
// Seismic Stomp: while the front is inside a band, destroy the cars in that band's ring (gaps are calm ground).
function worldStompCars(w) {
  for (const bd of w.bands) {
    if (w.r < bd.in || w.r > bd.out + 30) continue;
    const ro = Math.min(w.r, bd.out) + 6;
    damageCarsInCircle(w.x, w.y, ro, (cx, cy) => { const d = Math.hypot(cx - w.x, cy - w.y); return d >= bd.in - 6 && d <= ro; });
  }
}
// Boss hazards (circle / line / sector) that can hurt the player also wreck cars; checked a few times a second.
function worldHazardCars(h, dt) {
  if (h.warn > 0 || h.harmless) return;
  h.carT = (h.carT || 0) - dt; if (h.carT > 0) return; h.carT = WORLD_CARS.hazardTick;
  if (h.kind === "circle") damageCarsInCircle(h.x, h.y, h.r);
  else if (h.kind === "line") damageCarsInSegment(h.x, h.y, h.x + Math.cos(h.ang) * h.len, h.y + Math.sin(h.ang) * h.len, h.w / 2);
  else if (h.kind === "sector") damageCarsInCircle(h.x, h.y, h.len, (cx, cy) => Math.abs(angDiff(Math.atan2(cy - h.y, cx - h.x), h.ang)) < h.arc / 2);
}
// Per-frame: cars in flight and burning wrecks.
function updateWorldCars(dt) {
  const W_ = WS();
  for (const f of W_.fly) {
    f.t += dt / WORLD_CARS.flyTime; f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.t >= 1) for (let i = 0; i < 5; i++) addParticle(f.x, f.y, wrr(-60, 60), wrr(-60, 60), 0.5, 3 + wr() * 3, "#8c8272");
  }
  W_.fly = W_.fly.filter(f => f.t < 1);
  for (const w of W_.fires) {
    w.t += dt;
    const k = 1 - w.t / WORLD_CARS.fireLife;
    if (k <= 0 || G.parts.length > MAX_PARTICLES * 0.85) continue;
    if (wr() < dt * 22 * k) addParticle(w.x + wrr(-5, 5), w.y + wrr(-4, 4), wrr(-8, 8), -wrr(25, 55), 0.5, 2 + wr() * 3, wr() < 0.5 ? "#ff9a2c" : "#ffd24a");
    if (wr() < dt * 14 * k) addParticle(w.x + wrr(-6, 6), w.y + wrr(-4, 2), wrr(-10, 10), -wrr(18, 38), 1.0, 4 + wr() * 4, "#4a4a4e");
  }
  W_.fires = W_.fires.filter(w => w.t < WORLD_CARS.fireLife);
}
function drawWorldCars() {
  const W_ = G.world; if (!W_) return;
  for (const w of W_.fires) {                         // flame glow on the wreck, shrinking as the fire dies
    const k = 1 - w.t / WORLD_CARS.fireLife; if (k <= 0) continue;
    const fl = 0.75 + 0.25 * Math.sin(G.t * 31 + w.x);
    ctx.fillStyle = `rgba(255,${120 + Math.floor(70 * fl)},40,${0.5 * k})`; ctx.beginPath(); ctx.ellipse(w.x, w.y - 2, 8 * k + 2, 5 * k + 1.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,230,140,${0.55 * k * fl})`; ctx.beginPath(); ctx.arc(w.x, w.y - 3 - 3 * k, 2 + 2.5 * k * fl, 0, TAU); ctx.fill();
  }
  for (const f of W_.fly) {                           // launched car: lifts, spins, lands as the wreck
    const h = 4 * WORLD_CARS.flyHeight * f.t * (1 - f.t), s = 1 + h / 90;
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(f.x, f.y + 3, f.w * 0.6, f.h * 0.5, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(f.x, f.y - h); ctx.rotate(f.a0 + f.spin * f.t);
    ctx.fillStyle = f.col; ctx.fillRect(-f.w * s / 2, -f.h * s / 2, f.w * s, f.h * s);
    ctx.fillStyle = "rgba(20,30,40,.75)"; ctx.fillRect(-f.w * s * 0.2, -f.h * s / 2 + 1, f.w * s * 0.25, f.h * s - 2);
    ctx.restore();
  }
}
// Wreck as baked into the chunk canvas (also used for walked-over cars): scorched, flattened, crooked.
function drawWreck(g, car) {
  const x = car.x, y = car.y, w = car.w, h = car.h, s = Math.floor(car.x * 7.3 + car.y * 3.1);
  g.fillStyle = "rgba(10,8,8,.55)"; g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w * 0.75, h * 0.75, 0, 0, TAU); g.fill();       // soot
  g.fillStyle = "#1c1c1f"; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.save(); g.translate(x + w / 2, y + h / 2); g.rotate((rs(s, 1) - 0.5) * 0.5);
  g.fillStyle = car.col; g.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  g.fillStyle = "rgba(10,10,12,.62)"; g.fillRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);          // charred
  g.fillStyle = "#2a2a2e"; g.beginPath(); g.moveTo(-w / 2 + 2, -h / 2 + 3); g.lineTo(w / 2 - 3, -h / 2 + 1); g.lineTo(w / 2 - 1, h / 2 - 3); g.lineTo(-w / 2 + 3, h / 2 - 1); g.closePath(); g.fill();
  g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(-w / 2 + 2, -h / 2 + 2, Math.max(2, w * 0.4), 1.5);
  g.restore();
}
