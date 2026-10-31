"use strict";
// Damage regions are independent of body contact/navigation radii. Boss regions
// follow the same scale, facing, tail sway, spin and pose transforms as drawBoss.
function enemyHurtCircles(e) {
  if (!e.def) return [{ x: e.x, y: e.y, r: e.r }];
  const pose = bossPose(e), style = e.def.style, scale = e.r / 30;
  const angle = e.spinOn ? e.spinA : e.ang, c = Math.cos(angle), s = Math.sin(angle);
  const sw = Math.sin(e.walkA || 0), bob = Math.sin(e.t * 2.2) * 0.36;
  const out = [], add = (x, y, radius, part, branch) => {
    x -= 6 * pose.rear + (pose.tired ? 3 : 0);
    y = (y + bob) * (pose.tired ? 0.94 : 1);
    out.push({ x: e.x + (x * c - y * s) * scale,
      y: e.y - (e.lift || 0) + (x * s + y * c) * scale, r: radius * scale, part, branch });
  };
  if (style === "dragon") {
    const g = bossDragonGeometry(e, pose);
    for (const x of [-18, 0, 18]) add(x, 0, 27, "body");
    for (const q of g.heads) {
      for (let i=0;i<7;i++) { const p=dragonCurvePoint(q,i/7); add(p.x,p.y,8,"neck"); }
      const hx=q.x+(pose.rear<0?4:0);
      add(hx,q.y,12,"head"); add(hx+14*Math.cos(q.angle),q.y+14*Math.sin(q.angle),9,"head");
    }
    for (const q of g.tails) for (let i=0;i<=20;i++) {
      const p=dragonCurvePoint(q,i/20); add(p.x,p.y,lerp(7,3,i/20),"tail",q.side);
    }
    for (const wing of g.wings) for (let i=0;i<5;i++) {
      const p=wing.points[i];
      for (let j=1;j<=4;j++) add(lerp(wing.rootX,p.x,j/4),lerp(wing.rootY,p.y,j/4),10,"wing");
    }
    return out;
  }
  const slim = style === "spitter", horn = style === "horned";
  for (const x of [-18, 0, 18]) add(x, 0, slim ? 20 : horn ? 30 : 33, "body");
  const hx = (horn ? 46 : slim ? 48 : 50) + (!slim && pose.rear < 0 ? 4 : 0);
  add(hx, 0, slim ? 13 : horn ? 18 : 21, "head");
  add(hx + (slim ? 16 : 14), 0, slim ? 10 : 12, "head");
  const root = slim ? -22 : horn ? -26 : -28, end = slim ? -100 : horn ? -86 : -96;
  const control = slim ? -60 : horn ? -58 : -64, sway = slim ? 18 : horn ? 16 : 14;
  for (let i = 0; i <= 16; i++) {
    const k = i / 16, u = 1 - k;
    add(u * u * root + 2 * u * k * control + k * k * end,
      2 * u * k * sw * (slim || horn ? 14 : 12) - k * k * sw * sway,
      lerp(slim ? 7 : horn ? 9 : 11, slim ? 3 : horn ? 6 : 3, k), "tail");
  }
  add(slim ? -103 : horn ? -92 : -110, -sw * sway, slim ? 5 : horn ? 11 : 12, "tail");
  return out;
}
function enemyCircleHit(e, x, y, radius) {
  return enemyHurtCircles(e).some(q => dist(q.x, q.y, x, y) <= q.r + radius);
}
function enemySegmentHit(e, x0, y0, x1, y1, radius) {
  return enemyHurtCircles(e).some(q => distToSeg(q.x, q.y, x0, y0, x1, y1) <= q.r + radius);
}
function enemyConeHit(e, x, y, angle, range, arc) {
  return enemyHurtCircles(e).some(q => {
    const dx = q.x - x, dy = q.y - y, d = Math.hypot(dx, dy);
    return d <= range + q.r && (d <= q.r + 10 || Math.abs(angDiff(Math.atan2(dy, dx), angle)) <= arc / 2 + Math.atan2(q.r, d));
  });
}

function enemyAnnulusHit(e, x, y, inner, outer) {
  return enemyHurtCircles(e).some(q => {
    const d = dist(q.x, q.y, x, y);
    return d + q.r >= inner && d - q.r <= outer;
  });
}
