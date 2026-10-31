"use strict";
// Shared local-space anatomy for the final boss drawing and damage regions.
function bossDragonGeometry(e, pose) {
  const t = e.t || 0, sw = Math.sin(e.walkA || 0), raise = pose.raise || 0, death = e.deathCollapse || 0;
  const heads = [-1, 0, 1].map(side => {
    const y = side * 30 + Math.sin(t * 1.7 + side * 1.4) * (side ? 2 : 1);
    return { side, x0: 15, y0: side * 13, cx1: 32, cy1: side * 28,
      cx2: side ? 41 : 54, cy2: side ? y + side * 7 : y,
      x: (side ? 61 : 76) - death * 28, y: y + side * death * 8, angle: side * .18 + Math.sin(t * 1.3 + side) * .025 };
  });
  const tails = [-1, 1].map(side => ({ side, x0: -25, y0: side * 9,
    cx1: -55, cy1: side * 19 + sw * 6, cx2: -78, cy2: side * 13 - sw * 8,
    x: -111, y: side * 32 - sw * 10 }));
  const spread = (1 + .06 * Math.sin(t * 1.8) + raise * .12) * (1 - death * .55);
  const wings = [-1, 1].map(side => ({ side, rootX: 7, rootY: side * 19,
    points: [[30, 37], [13, 94 * spread], [-8, 71 * spread], [-30, 78 * spread], [-46, 54 * spread], [-53, 36], [-26, 22]].map(([x, y]) => ({ x, y: y * side })) }));
  return { heads, tails, wings };
}
function dragonCurvePoint(q, k) {
  const u = 1 - k;
  return { x: u*u*u*q.x0 + 3*u*u*k*q.cx1 + 3*u*k*k*q.cx2 + k*k*k*q.x,
    y: u*u*u*q.y0 + 3*u*u*k*q.cy1 + 3*u*k*k*q.cy2 + k*k*k*q.y };
}
