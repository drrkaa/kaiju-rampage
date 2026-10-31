// [js-split] ===== js/250-icons.js: Procedural ability/weapon/passive icons (ICON_DRAW, getIcon, drawIcon) =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// ===== ICONS =====
// Procedural ability/weapon/passive icons, keyed by id. Drawn in a 64x64 box, cached per (id, size, colour) on offscreen canvases.
const ICON_DRAW = {
  swipe(c, col) {                                   // three claw slashes
    c.lineCap = "round";
    for (const [dx, a] of [[-12, 0.6], [0, 1], [12, 0.6]]) {
      c.strokeStyle = col; c.globalAlpha = a; c.lineWidth = 6;
      c.beginPath(); c.moveTo(24 + dx + 6, 12); c.quadraticCurveTo(30 + dx + 8, 32, 22 + dx + 4, 52); c.stroke();
      c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.moveTo(24 + dx + 6, 14); c.quadraticCurveTo(30 + dx + 8, 32, 22 + dx + 4, 50); c.stroke();
    }
    c.globalAlpha = 1;
  },
  breath(c, col) {                                  // jaw at left, flame to the right
    c.fillStyle = col; c.globalAlpha = 0.55; c.beginPath();
    c.moveTo(22, 32); c.quadraticCurveTo(34, 14, 58, 20); c.quadraticCurveTo(48, 32, 58, 44); c.quadraticCurveTo(34, 50, 22, 32); c.fill();
    c.globalAlpha = 1; c.fillStyle = "#fff"; c.beginPath();
    c.moveTo(24, 32); c.quadraticCurveTo(36, 24, 48, 32); c.quadraticCurveTo(36, 40, 24, 32); c.fill();
    c.strokeStyle = col; c.lineWidth = 4; c.lineCap = "round"; c.lineJoin = "round";
    c.beginPath(); c.moveTo(18, 14); c.lineTo(8, 24); c.lineTo(20, 28); c.moveTo(18, 50); c.lineTo(8, 40); c.lineTo(20, 36); c.stroke();
  },
  roar(c, col) {                                    // open mouth + sound arcs
    c.strokeStyle = col; c.lineWidth = 4; c.lineCap = "round"; c.lineJoin = "round";
    c.beginPath(); c.moveTo(22, 12); c.lineTo(8, 28); c.lineTo(22, 32); c.lineTo(8, 36); c.lineTo(22, 52); c.stroke();
    for (let i = 0; i < 3; i++) {
      c.globalAlpha = 1 - i * 0.25; c.lineWidth = 4 - i * 0.6;
      c.beginPath(); c.arc(20, 32, 14 + i * 11, -0.7, 0.7); c.stroke();
    }
    c.globalAlpha = 1;
  },
  stomp(c, col) {                                   // foot over concentric cracks
    c.strokeStyle = col; c.lineWidth = 3; c.lineCap = "round";
    for (let i = 0; i < 3; i++) { c.globalAlpha = 1 - i * 0.28; c.beginPath(); c.ellipse(32, 46, 10 + i * 9, 5 + i * 3.5, 0, 0, TAU); c.stroke(); }
    c.globalAlpha = 1; c.fillStyle = col; c.fillRect(20, 14, 24, 14);
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(23 + i * 6, 31, 3.5, 0, TAU); c.fill(); }
    c.fillStyle = "#fff"; c.fillRect(24, 18, 16, 3);
  },
  tailspin(c, col) {                                // spiral with arrow head
    c.strokeStyle = col; c.lineWidth = 5; c.lineCap = "round"; c.lineJoin = "round";
    c.beginPath();
    for (let i = 0; i <= 40; i++) { const a = i * 0.2 - 1, r = 4 + i * 0.7; const x = 32 + Math.cos(a) * r, y = 32 + Math.sin(a) * r; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
    c.stroke();
    const a = 40 * 0.2 - 1, r = 32, ex = 32 + Math.cos(a) * r, ey = 32 + Math.sin(a) * r, ta = a + Math.PI / 2;
    c.fillStyle = "#fff"; c.beginPath();
    c.moveTo(ex + Math.cos(ta) * 9, ey + Math.sin(ta) * 9); c.lineTo(ex + Math.cos(a) * 7, ey + Math.sin(a) * 7); c.lineTo(ex - Math.cos(a) * 7, ey - Math.sin(a) * 7); c.fill();
  },
  mega(c, col) {                                    // wide beam with burst at the end
    c.fillStyle = col; c.globalAlpha = 0.5; c.beginPath(); c.moveTo(6, 24); c.lineTo(42, 14); c.lineTo(42, 50); c.lineTo(6, 40); c.fill();
    c.globalAlpha = 1; c.fillStyle = "#fff"; c.beginPath(); c.moveTo(6, 28); c.lineTo(44, 25); c.lineTo(44, 39); c.lineTo(6, 36); c.fill();
    c.strokeStyle = col; c.lineWidth = 4; c.lineCap = "round"; c.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.moveTo(50 + Math.cos(a) * 4, 32 + Math.sin(a) * 4); c.lineTo(50 + Math.cos(a) * 12, 32 + Math.sin(a) * 12); }
    c.stroke();
  },
  roll(c, col) {                                    // curled body with a motion arc
    c.strokeStyle = col; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.arc(32, 34, 17, Math.PI * 0.2, Math.PI * 1.6); c.stroke();
    c.fillStyle = "#fff"; c.beginPath(); c.moveTo(46, 14); c.lineTo(58, 26); c.lineTo(40, 28); c.closePath(); c.fill();
  },
  jump(c, col) {                                    // up arrow over a landing shockwave
    c.fillStyle = col; c.beginPath(); c.moveTo(32, 6); c.lineTo(48, 28); c.lineTo(37, 28); c.lineTo(37, 42); c.lineTo(27, 42); c.lineTo(27, 28); c.lineTo(16, 28); c.closePath(); c.fill();
    c.strokeStyle = "#fff"; c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); c.ellipse(32, 52, 20, 6, 0, 0, TAU); c.stroke();
  },
  superlaser(c, col) {                              // huge beam with a big starburst
    c.fillStyle = col; c.globalAlpha = 0.45; c.beginPath(); c.moveTo(4, 22); c.lineTo(40, 6); c.lineTo(40, 58); c.lineTo(4, 42); c.fill();
    c.globalAlpha = 1; c.fillStyle = "#fff"; c.beginPath(); c.moveTo(4, 27); c.lineTo(44, 23); c.lineTo(44, 41); c.lineTo(4, 37); c.fill();
    c.strokeStyle = col; c.lineWidth = 4; c.lineCap = "round"; c.beginPath();
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r = i % 2 ? 11 : 15; c.moveTo(50 + Math.cos(a) * 4, 32 + Math.sin(a) * 4); c.lineTo(50 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
    c.stroke();
  },
  dash(c, col) {                                    // speed streaks + chevron
    c.strokeStyle = col; c.lineCap = "round"; c.lineJoin = "round";
    c.lineWidth = 4;
    for (const [y, x0, x1] of [[16, 6, 30], [32, 2, 28], [48, 8, 30]]) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
    c.lineWidth = 7; c.beginPath(); c.moveTo(36, 14); c.lineTo(54, 32); c.lineTo(36, 50); c.stroke();
    c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.moveTo(36, 14); c.lineTo(54, 32); c.lineTo(36, 50); c.stroke();
  },
  tremor(c, col) {                                  // ground crack zigzag + tremor ticks
    c.strokeStyle = col; c.lineWidth = 4; c.lineCap = "round"; c.lineJoin = "round";
    c.beginPath(); c.moveTo(6, 40); c.lineTo(18, 34); c.lineTo(26, 46); c.lineTo(36, 30); c.lineTo(44, 42); c.lineTo(58, 36); c.stroke();
    c.globalAlpha = 0.6; c.lineWidth = 3;
    c.beginPath(); c.moveTo(14, 20); c.lineTo(14, 26); c.moveTo(32, 12); c.lineTo(32, 20); c.moveTo(50, 20); c.lineTo(50, 26); c.stroke(); c.globalAlpha = 1;
  },
  speed(c, col) {                                   // double chevron
    c.strokeStyle = col; c.lineWidth = 7; c.lineCap = "round"; c.lineJoin = "round";
    for (const dx of [0, 18]) { c.globalAlpha = dx ? 1 : 0.6; c.beginPath(); c.moveTo(14 + dx, 14); c.lineTo(30 + dx, 32); c.lineTo(14 + dx, 50); c.stroke(); }
    c.globalAlpha = 1;
  },
  hp(c, col) {                                      // heart
    c.fillStyle = col; c.beginPath(); c.moveTo(32, 54); c.bezierCurveTo(4, 34, 10, 10, 24, 12); c.bezierCurveTo(29, 13, 32, 17, 32, 21);
    c.bezierCurveTo(32, 17, 35, 13, 40, 12); c.bezierCurveTo(54, 10, 60, 34, 32, 54); c.fill();
    c.fillStyle = "#fff"; c.globalAlpha = 0.6; c.beginPath(); c.arc(21, 22, 4, 0, TAU); c.fill(); c.globalAlpha = 1;
  },
  regen(c, col) {                                   // plus sign with a circular arrow
    c.strokeStyle = col; c.lineWidth = 4; c.lineCap = "round";
    c.beginPath(); c.arc(32, 32, 22, 0.5, 5.2); c.stroke();
    c.fillStyle = col; c.beginPath(); c.moveTo(48, 14); c.lineTo(56, 26); c.lineTo(40, 26); c.fill();
    c.fillStyle = "#fff"; c.fillRect(28, 20, 8, 24); c.fillRect(20, 28, 24, 8);
  },
  armor(c, col) {                                   // shield
    c.fillStyle = col; c.beginPath(); c.moveTo(32, 8); c.lineTo(52, 15); c.lineTo(50, 36); c.quadraticCurveTo(46, 50, 32, 57);
    c.quadraticCurveTo(18, 50, 14, 36); c.lineTo(12, 15); c.closePath(); c.fill();
    c.fillStyle = "#fff"; c.globalAlpha = 0.55; c.beginPath(); c.moveTo(32, 14); c.lineTo(32, 50); c.lineTo(20, 40); c.lineTo(19, 21); c.closePath(); c.fill(); c.globalAlpha = 1;
  },
  _fallback(c, col) {                               // unknown id: diamond
    c.fillStyle = col; c.beginPath(); c.moveTo(32, 10); c.lineTo(54, 32); c.lineTo(32, 54); c.lineTo(10, 32); c.closePath(); c.fill();
    c.fillStyle = "#fff"; c.globalAlpha = 0.6; c.beginPath(); c.arc(32, 32, 6, 0, TAU); c.fill(); c.globalAlpha = 1;
  },
};
const ICON_CACHE = new Map(), ICON_CACHE_MAX = 48;
const ICON_COLORS = { swipe: "#fa4", breath: "#4cf", roar: "#fa4", stomp: "#e86", tailspin: "#fc4", mega: "#6ff", superlaser: "#f6f", dash: "#8f8", roll: "#cdb", jump: "#7cf", tremor: "#fb5", speed: "#8f8", hp: "#f66", regen: "#f66", armor: "#f66" };
function getIcon(id, size, color) {
  color = color || ICON_COLORS[id] || "#ddd";
  const key = id + "|" + size + "|" + color, hit = ICON_CACHE.get(key);
  if (hit) return hit;
  const sc = 2, cv = document.createElement("canvas");     // 2x backing store for crisp edges
  cv.width = cv.height = size * sc;
  const c = cv.getContext("2d");
  if (!c) return null;
  try {
    c.save(); c.scale(size * sc / 64, size * sc / 64);
    c.fillStyle = "#121827"; c.beginPath();                  // dark rounded tile
    c.moveTo(12, 1); c.arcTo(63, 1, 63, 12, 11); c.arcTo(63, 63, 12, 63, 11); c.arcTo(1, 63, 1, 12, 11); c.arcTo(1, 1, 12, 1, 11); c.closePath(); c.fill();
    c.strokeStyle = color; c.lineWidth = 3; c.globalAlpha = 0.5; c.stroke(); c.globalAlpha = 1;
    c.translate(32, 32); c.scale(0.8, 0.8); c.translate(-32, -32);   // keep the glyph inside the tile
    (ICON_DRAW[id] || ICON_DRAW._fallback)(c, color);
    c.restore();
  } catch (e) { return null; }
  if (ICON_CACHE.size >= ICON_CACHE_MAX) ICON_CACHE.delete(ICON_CACHE.keys().next().value);
  ICON_CACHE.set(key, cv);
  return cv;
}
// Draw icon (top-left at x,y). alpha < 1 gives a dimmed silhouette for locked slots.
function drawIcon(id, x, y, size, color, alpha) {
  const im = getIcon(id, size, color);
  if (!im) return;
  const prev = ctx.globalAlpha; ctx.globalAlpha = prev * (alpha === undefined ? 1 : alpha);
  ctx.drawImage(im, x, y, size, size); ctx.globalAlpha = prev;
}
// ===== /ICONS =====

