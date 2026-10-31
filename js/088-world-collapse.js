"use strict";
// Bounded, transient roof collapse; rubble and collision update immediately.
function startBuildingCollapse(b) {
  const list = G.collapses || (G.collapses = []);
  if (list.length >= 24) list.shift();
  list.push({ b: Object.assign({}, b, { stage: 2 }), t: 0, dur: .75 });
}
function updateCollapses(dt) {
  if (!G.collapses) return;
  for (const c of G.collapses) c.t += dt;
  G.collapses = G.collapses.filter(c => c.t < c.dur);
}
function drawCollapses() {
  for (const c of G.collapses || []) {
    const u = c.t / c.dur, b = c.b, x = b.x + b.w/2, y = b.y + b.h/2;
    ctx.save(); ctx.translate(x, y); ctx.scale(1 - u*.12, 1 - u*.35); ctx.translate(-x, -y);
    ctx.globalAlpha = 1 - u; drawBuilding(ctx, b); ctx.restore();
    ctx.fillStyle = `rgba(155,145,130,${(1-u)*.28})`;
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x + Math.cos(k*1.3)*b.w*.35*u, y + Math.sin(k*1.3)*b.h*.35*u, 12 + u*35, 8 + u*22, 0, 0, TAU); ctx.fill(); }
  }
}
