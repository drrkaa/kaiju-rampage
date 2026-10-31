// [js-split] ===== js/210-draw-enemies.js: Cached outlined enemy sprites (spriteCache, enemySprite) and batched enemy shadows =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// ---- cached, outlined enemy sprites: one offscreen canvas per (type, rotation bucket); no per-frame shapes/gradients/blur ----
const spriteCache = new Map();
const SPRITE_BASE = { soldier: 28, tank: 76, heli: 64, mortar: 70 };    // logical px before ENEMY_SCALE
function enemySprite(type, ang, fr) {
  fr = fr ? 1 : 0;                                    // 2-frame walk / tread cycle
  const nb = type === "soldier" ? ENEMY_SPRITE.soldierBuckets : ENEMY_SPRITE.buckets;
  const bi = ((Math.round(ang / TAU * nb) % nb) + nb) % nb, key = type + bi + "_" + fr;
  let sp = spriteCache.get(key);
  if (sp) return sp;
  const size = Math.ceil(SPRITE_BASE[type] * ENEMY_SCALE), px = Math.ceil(size * ENEMY_SPRITE.res);
  const c = document.createElement("canvas"); c.width = c.height = px;
  const g = c.getContext("2d"), C = ENEMY_COLORS, ow = ENEMY_OUTLINE.width / ENEMY_SCALE;
  g.scale(px / size, px / size); g.translate(size / 2, size / 2); g.rotate(bi / nb * TAU); g.scale(ENEMY_SCALE, ENEMY_SCALE);
  g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = ENEMY_OUTLINE.color; g.lineWidth = ow;
  const circ = (x, y, r, fill) => { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke(); };
  const box = (x, y, w, h, fill) => { g.fillStyle = fill; g.fillRect(x, y, w, h); g.strokeRect(x, y, w, h); };
  if (type === "soldier") {
    circ(fr ? 3.5 : -3.5, 4.6, 2.7, "#2f3320"); circ(fr ? -3.5 : 3.5, -4.6, 2.7, "#2f3320");      // boots, alternating each frame
    g.lineWidth = ow * 1.5; g.beginPath(); g.moveTo(3, 4); g.lineTo(14, 4); g.stroke();             // rifle
    g.strokeStyle = "#202020"; g.lineWidth = 2.2; g.beginPath(); g.moveTo(3, 4); g.lineTo(14, 4); g.stroke();
    g.strokeStyle = ENEMY_OUTLINE.color; g.lineWidth = ow;
    box(-10, -4.5, 5, 9, "#6b5530");                                                                // backpack
    circ(0, 0, 7, C.soldier); circ(1, 0, 4, C.helmet);                                              // vest + helmet
    g.fillStyle = "#6c7f3a"; g.beginPath(); g.arc(1, 0, 1.6, 0, TAU); g.fill();                     // helmet highlight
  } else if (type === "mortar") {
    box(-19, -15, 38, 7, "#262e39"); box(-19, 8, 38, 7, "#262e39");
    box(-16, -10, 32, 20, "#8560b5");
    circ(-4, 0, 10, "#d0a2f0"); circ(-4, 0, 5, "#191626");
    box(6, -3, 14, 6, "#f3ca68");
    g.strokeStyle = "#f3ca68"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-12, -7); g.lineTo(-7, -2); g.moveTo(-12, 7); g.lineTo(-7, 2); g.stroke();
  } else if (type === "tank") {
    box(-18, -16, 36, 6, C.treads); box(-18, 10, 36, 6, C.treads);
    g.fillStyle = "#5a4540"; for (let k = 0; k < 6; k++) { g.fillRect(-16 + k * 6 + (fr ? 3 : 0), -15, 2, 4); g.fillRect(-16 + k * 6 + (fr ? 3 : 0), 11, 2, 4); }   // tread marks shift each frame
    box(-17, -11, 34, 22, C.tank);
    box(2, -2.5, 27, 5, "#2a2a2e");
    circ(-2, 0, 9.5, C.turret);
  } else {
    box(-27, -2.5, 15, 5, C.heliDark);
    g.fillStyle = C.heli; g.beginPath(); g.ellipse(0, 0, 15, 9, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = C.glass; g.beginPath(); g.ellipse(7, 0, 5.5, 5, 0, 0, TAU); g.fill(); g.stroke();
  }
  sp = { c, size }; spriteCache.set(key, sp);
  return sp;
}
const enemyVisR = e => e.r * ENEMY_SCALE;
// Batched drop shadows for all visible enemies (one path, one fill) and projectiles.
function drawEnemyShadows(list, vis) {
  ctx.fillStyle = `rgba(0,0,0,${ENEMY_SHADOW.alpha})`; ctx.beginPath();
  for (const e of list) {
    if (!e.def && !vis(e)) continue;
    if (e.alpha < 0.3) continue;
    const heli = e.type === "heli", dx = heli ? ENEMY_SHADOW.heliDx : ENEMY_SHADOW.dx, dy = heli ? ENEMY_SHADOW.heliDy : ENEMY_SHADOW.dy;
    const rr = enemyVisR(e) * (e.def ? 1.0 : 1.1), x = e.x + dx, y = e.y + dy;
    ctx.moveTo(x + rr, y); ctx.ellipse(x, y, rr, rr * 0.7, 0, 0, TAU);
  }
  ctx.fill();
}
