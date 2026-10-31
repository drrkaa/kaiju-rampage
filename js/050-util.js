// [js-split] ===== js/050-util.js: Canvas/ctx, math helpers (rnd, clamp, dist, lerp, angDiff), turning/movement helpers =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// -------------------------------------------------------------- UTILITIES ---
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
let W = 800, H = 600;
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const fmtTime = s => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
const lerp = (a, b, t) => a + (b - a) * t;
// Smooth angular motion: T = {face, vel}. Chases `target` at up to maxRate with limited angular acceleration and a
// braking profile so it never overshoots; always takes the shorter way (committed direction when exactly behind).
function stepTurn(T, target, maxRate, dt, instant) {
  let d = angDiff(target, T.face);
  if (Math.abs(d) > Math.PI - 0.05) d = (T.vel < 0 ? -1 : 1) * Math.abs(d);
  const ad = Math.abs(d);
  if (ad < 0.0015 && Math.abs(T.vel) < 0.05) { T.face = target; T.vel = 0; return; }
  const want = Math.sign(d) * Math.min(maxRate, Math.sqrt(2 * MOVE.turnDecel * ad) * 0.95, ad * MOVE.turnGain);
  if (instant) T.vel = want;
  else {
    const accelerating = T.vel === 0 || (Math.sign(want) === Math.sign(T.vel) && Math.abs(want) > Math.abs(T.vel));
    const a = (accelerating ? MOVE.turnAccel : MOVE.turnDecel) * dt;
    T.vel += clamp(want - T.vel, -a, a);
  }
  if (Math.sign(T.vel) === Math.sign(d) && Math.abs(T.vel) * dt >= ad) { T.face = target; T.vel = 0; return; }   // arrive exactly, no overshoot
  T.face += T.vel * dt;
}
// Move-speed multiplier from the angle between the desired move direction and the facing:
// full speed in the front cone, ramping (smoothstep) to sideMul at 90 deg and backMul at 180.
function speedFactor(moveAng, faceAng) {
  const a = Math.abs(angDiff(moveAng, faceAng));
  const sm = t => t * t * (3 - 2 * t);
  if (a <= MOVE.frontCone) return 1;
  if (a <= Math.PI / 2) return lerp(1, MOVE.sideMul, sm((a - MOVE.frontCone) / (Math.PI / 2 - MOVE.frontCone)));
  return lerp(MOVE.sideMul, MOVE.backMul, sm((a - Math.PI / 2) / (Math.PI / 2)));
}
// Rotate `cur` toward `target` by at most maxStep radians.
function turnToward(cur, target, maxStep) { return cur + clamp(angDiff(target, cur), -maxStep, maxStep); }
// Accelerate / decelerate the player's velocity toward a target velocity.
function approachVel(P, tvx, tvy, dt) {
  const dx = tvx - P.vx, dy = tvy - P.vy, d = Math.hypot(dx, dy);
  const a = (Math.hypot(tvx, tvy) >= Math.hypot(P.vx, P.vy) ? MOVE.accel : MOVE.decel) * dt;
  if (d <= a) { P.vx = tvx; P.vy = tvy; } else { P.vx += dx / d * a; P.vy += dy / d * a; }
}

