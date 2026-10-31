"use strict"; // classic script (no modules)
// ------------------------------------------------- ENEMY LINE OF SIGHT / COVER ---
// Buildings are cover: enemy shots are stopped by intact buildings (see the projectile loop in 190-update.js), ground
// shooters (tanks) only fire with a clear line of sight and otherwise advance / flank to find one, helicopters fly and
// shoot over everything (fireProj(..., air=true)). Constants live in 045-config-enemy-cover.js.

// Does the segment (x0,y0)-(x1,y1) cross any intact building box? Uses only the chunks under the segment's bounding box.
function segHitsBuilding(x0, y0, x1, y1) {
  const cx0 = Math.floor(Math.min(x0, x1) / CHUNK), cx1 = Math.floor(Math.max(x0, x1) / CHUNK);
  const cy0 = Math.floor(Math.min(y0, y1) / CHUNK), cy1 = Math.floor(Math.max(y0, y1) / CHUNK);
  const dx = x1 - x0, dy = y1 - y0;
  for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
    const list = getChunk(cx, cy).b;
    for (const parent of list) for (const b of buildingParts(parent)) {
      if (b.dead) continue;
      const d = b.d * (1 - BLDG_SAG * b.stage), ox = d * ROOF_OX, oy = d * ROOF_OY;     // == colRect(b), shrunk 3px so touching walls do not block
      const qx0 = b.x - ox + 3, qy0 = b.y - oy + 3, qx1 = b.x + b.w - 3, qy1 = b.y + b.h - 3;
      let t0 = 0, t1 = 1;                                                               // Liang-Barsky slab test
      if (dx > -1e-9 && dx < 1e-9) { if (x0 < qx0 || x0 > qx1) continue; }
      else { let a = (qx0 - x0) / dx, c = (qx1 - x0) / dx; if (a > c) { const t = a; a = c; c = t; } if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1) continue; }
      if (dy > -1e-9 && dy < 1e-9) { if (y0 < qy0 || y0 > qy1) continue; }
      else { let a = (qy0 - y0) / dy, c = (qy1 - y0) / dy; if (a > c) { const t = a; a = c; c = t; } if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1) continue; }
      return true;
    }
  }
  return false;
}
const hasLOS = (x0, y0, x1, y1) => !segHitsBuilding(x0, y0, x1, y1);

function coverState() { return G.cover || (G.cover = { blocked: 0, tankShots: 0, coverT: -999, hint: null, hintDone: false, chkT: 0, los: 0, noLos: 0 }); }

// Cached per-enemy line of sight to the player (recomputed every ~COVER.losEvery s).
function enemyLOS(e, dt, d) {
  e.losT = (e.losT || 0) - dt;
  if (e.losT > 0) return e.los;
  e.losT = COVER.losEvery * rnd(0.8, 1.2);
  e.los = d > COVER.losMaxRange ? true : hasLOS(e.x, e.y, G.P.x, G.P.y);
  return e.los;
}

// Find a position from which the player is visible: around the player at a few radii / angles, nearest-to-current-bearing first.
function planFlank(e) {
  const P = G.P, base = Math.atan2(e.y - P.y, e.x - P.x);
  const tryAt = (a, rad) => {
    const px = P.x + Math.cos(a) * rad, py = P.y + Math.sin(a) * rad;
    return !anySolid(px, py, e.r + 2) && hasLOS(px, py, P.x, P.y) ? { x: px, y: py, t: COVER.commitT } : null;
  };
  for (const rad of COVER.flankRadii) { const f = tryAt(base, rad); if (f) return f; }
  for (const st of COVER.flankSteps) for (const sg of [e.steerSign, -e.steerSign]) for (const rad of COVER.flankRadii) {
    const f = tryAt(base + sg * st, rad); if (f) return f;
  }
  return { x: P.x, y: P.y, t: COVER.commitT };      // nothing clear: just advance on the player
}

// Tank decision. Returns true when the tank may shoot this frame; sets COVER_MX/COVER_MY to the desired move direction.
let COVER_MX = 0, COVER_MY = 0;
function tankCover(e, d, ux, uy, dt) {
  if (enemyLOS(e, dt, d)) {
    e.fk = null;
    if (d > 260) { COVER_MX = ux; COVER_MY = uy; } else if (d < 200) { COVER_MX = -ux; COVER_MY = -uy; } else { COVER_MX = 0; COVER_MY = 0; }
    return true;
  }
  e.cd = Math.max(e.cd, COVER.reload);               // blind: no shooting, no warning ring; short reload once it sees the player again
  if (d < COVER_HINT.crowdRadius) coverState().coverT = G.t;   // the player is currently hiding from this shooter
  if (!e.fk || e.fk.t <= 0 || Math.hypot(e.fk.x - e.x, e.fk.y - e.y) < COVER.arriveDist) e.fk = planFlank(e);
  e.fk.t -= dt;
  const fx = e.fk.x - e.x, fy = e.fk.y - e.y, fd = Math.hypot(fx, fy) || 1;
  COVER_MX = fx / fd; COVER_MY = fy / fd;
  return false;
}

// Called by the projectile loop when an enemy shot hits a building.
function onEnemyShotBlocked(p) {
  const c = coverState(); c.blocked++;
  if (dist(p.x, p.y, G.P.x, G.P.y) < COVER_HINT.blockNear) { c.coverT = G.t; if (COVER_HINT.onBlock) showCoverHint(); }
}

// ---- one-time hint ----
function coverHintSeen() {                          // read on demand (only called until the hint was decided for this run)
  try { return !!(typeof localStorage !== "undefined" && localStorage.getItem(COVER_HINT.storageKey)); } catch (err) { return false; }
}
function showCoverHint() {
  const c = coverState();
  if (c.hintDone || G.t < COVER_HINT.minTime || state !== "play") return false;
  if (coverHintSeen()) { c.hintDone = true; return false; }
  c.hintDone = true;
  try { if (typeof localStorage !== "undefined") localStorage.setItem(COVER_HINT.storageKey, "1"); } catch (err) { /* private mode: once per run only */ }
  c.hint = { t: COVER_HINT.show, max: COVER_HINT.show };
  return true;
}
// Per-frame: hint timer + periodic crowd check (ranged enemies that can see the player).
function updateCoverHint(dt) {
  const c = coverState();
  if (c.hint) { c.hint.t -= dt; if (c.hint.t <= 0) c.hint = null; }
  if (c.hintDone) return;
  c.chkT -= dt;
  if (c.chkT > 0) return;
  c.chkT = COVER_HINT.checkEvery;
  if (G.t < COVER_HINT.minTime || G.banner || G.introT > 0 || G.t - c.coverT < COVER_HINT.coverGrace) return;
  const P = G.P, r2 = COVER_HINT.crowdRadius * COVER_HINT.crowdRadius;
  let n = 0;
  for (const e of G.enemies) if (!e.dead && (e.type === "tank" || e.type === "heli") && e.los !== false && (e.x - P.x) ** 2 + (e.y - P.y) ** 2 < r2) n++;
  if (n >= COVER_HINT.crowd) showCoverHint();
}
function drawCoverHint() {
  const h = G.cover && G.cover.hint;
  if (!h) return;
  const a = clamp(Math.min(h.t / 0.5, (h.max - h.t) / 0.25), 0, 1), w = 470, ht = 46, x = W / 2 - w / 2, y = H * 0.36;
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = "rgba(10,14,22,.78)"; ctx.fillRect(x, y, w, ht);
  ctx.strokeStyle = "#7fd4ff"; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, ht);
  const ix = x + 14, iy = y + 8;                      // icon: a building stopping a bullet
  ctx.fillStyle = "#8aa0b4"; ctx.fillRect(ix + 16, iy, 16, 30);
  ctx.fillStyle = "#d9f2ff"; for (let r = 0; r < 3; r++) for (let q = 0; q < 2; q++) ctx.fillRect(ix + 19 + q * 7, iy + 4 + r * 9, 4, 5);
  ctx.fillStyle = "#ffd23a"; ctx.fillRect(ix - 2, iy + 13, 10, 4); ctx.fillRect(ix + 8, iy + 14, 4, 2);
  ctx.strokeStyle = "#ff5040"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ix + 12, iy + 6); ctx.lineTo(ix + 20, iy + 24); ctx.moveTo(ix + 20, iy + 6); ctx.lineTo(ix + 12, iy + 24); ctx.stroke();
  txtShadow(COVER_HINT.text, x + 58, y + 30, 20, "#ffffff", "left");
  ctx.restore();
}
