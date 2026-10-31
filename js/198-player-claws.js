"use strict";
// Local sprite coordinates: the active hand cocks outward, cuts inward, then settles.
// Both hands have independent timelines so the level-3 return cut uses the other arm.
function clawHandPose(action, side, level) {
  const rest = { x: 19, y: side * 32, angle: side * 0.15, effort: 0 };
  if (!action || action.type !== "swipe") return rest;
  const first = side === action.dir;
  if (!first && level < 3) return rest;
  const start = first ? 0 : SWIPE.strike + SWIPE.followDelay;
  const t = action.t - start;
  if (t < 0) return rest;
  const wind = { x: 7, y: side * 44, angle: side * 1.3, effort: 1 };
  const cut = { x: 38, y: side * 20, angle: -side * 0.65, effort: 1 };
  const strike = first ? SWIPE.strike : Math.min(SWIPE.strike, SWIPE.recover - SWIPE.followDelay) * 0.6;
  const recovery = first ? SWIPE.recover : Math.max(0.01, SWIPE.recover - SWIPE.followDelay - strike);
  let a, b, k;
  if (t < SWIPE.wind) { a = rest; b = wind; k = t / SWIPE.wind; }
  else if (t < SWIPE.wind + strike) { a = wind; b = cut; k = (t - SWIPE.wind) / strike; }
  else { a = cut; b = rest; k = clamp((t - SWIPE.wind - strike) / recovery, 0, 1); }
  k = k * k * (3 - 2 * k);
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), angle: lerp(a.angle, b.angle, k), effort: lerp(a.effort, b.effort, k) };
}
function drawPlayerClaws(pal, flash, fx, activeOnly) {
  for (const side of [-1, 1]) {
    let hand = pal.style === "player"
      ? clawHandPose(fx && fx.swipe, side, fx && fx.clawLevel || 1)
      : { x: 27, y: side * 25, angle: side * .25, effort: 0 };
    if (pal.style === "player" && fx && fx.victory > 0) {
      const k = fx.victory;
      hand = { x: lerp(hand.x, 30, k), y: lerp(hand.y, side * 42, k), angle: lerp(hand.angle, side * .8, k), effort: 0 };
    }
    if (activeOnly && hand.effort <= .01) continue;
    ctx.strokeStyle = flash ? "#fff" : pal.body; ctx.lineCap = "round"; ctx.lineWidth = pal.style === "player" ? 9 : 10;
    const shoulderX = pal.style === "player" ? 8 : 12, shoulderY = pal.style === "player" ? 23 : 19;
    ctx.beginPath(); ctx.moveTo(shoulderX, side * shoulderY);
    ctx.quadraticCurveTo(lerp(shoulderX, hand.x, .55) - hand.effort * 4,
      lerp(side * shoulderY, hand.y, .55) + side * hand.effort * 8, hand.x, hand.y); ctx.stroke();
    ctx.save(); ctx.translate(hand.x, hand.y); ctx.rotate(hand.angle);
    ctx.fillStyle = flash ? "#fff" : pal.body; ctx.beginPath(); ctx.ellipse(0, 0, pal.style === "player" ? 6 : 8, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#e8e0c8";
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(4, i * 3 - 1.4); ctx.lineTo((pal.style === "player" ? 8 : 11) + hand.effort * 3, i * 3); ctx.lineTo(4, i * 3 + 1.4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}
