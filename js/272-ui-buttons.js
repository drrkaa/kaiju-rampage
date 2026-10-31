// ===== js/272-ui-buttons.js: Tiny immediate-mode button helper (mouse + touch), pause-menu buttons, overlay driver =====
// Buttons are drawn and registered every frame (UI.hits is cleared at the start of render()). A mouse click or a touch
// tap is routed through uiTap(x, y) first; it returns true when a button consumed it.
"use strict";
const UI = { hits: [] };
function uiBegin() { UI.hits.length = 0; }
// Draws a button and registers its hit box. opt: { size, color, fill, alpha }.
function uiButton(id, x, y, w, h, label, onTap, opt) {
  opt = opt || {};
  const hover = !PLATFORM.touch && mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
  ctx.globalAlpha = opt.alpha === undefined ? 1 : opt.alpha;
  ctx.fillStyle = opt.fill || (hover ? "rgba(70,80,120,.95)" : "rgba(30,36,58,.9)"); ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = opt.color || "#ccd"; ctx.lineWidth = hover ? 3 : 2; ctx.strokeRect(x, y, w, h);
  txt(label, x + w / 2, y + h / 2 + (opt.size || 16) * 0.35, opt.size || 16, opt.color || "#fff");
  ctx.globalAlpha = 1;
  UI.hits.push({ id, x, y, w, h, onTap });
}
function uiTap(x, y) {
  for (let i = UI.hits.length - 1; i >= 0; i--) {
    const b = UI.hits[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.onTap(); return true; }
  }
  return false;
}

// ----------------------------------------------------- pause menu buttons ---
// Desktop: a row of buttons below the key list plus a small debug button at the very bottom.
// Touch: larger buttons in the middle (the key list in drawPause is hidden on touch).
function drawPauseButtons() {
  const s = PLATFORM.uiScale, t = PLATFORM.touch;
  const bw = (t ? 150 : 130) * s, bh = (t ? 46 : 36) * s, gap = 16 * s, sz = (t ? 18 : 16) * s;
  const total = 3 * bw + 2 * gap, x0 = W / 2 - total / 2;
  const y = t ? H * 0.42 : Math.min(H - 110 * s, H * 0.42 + 5 * 26 + 112);
  uiButton("resume", x0, y, bw, bh, "Resume", () => setPaused(false), { size: sz, color: "#7dff8a" });
  uiButton("restart", x0 + bw + gap, y, bw, bh, "Restart", () => startGame(), { size: sz });
  uiButton("mute", x0 + 2 * (bw + gap), y, bw, bh, muted ? "Sound: OFF" : "Sound: on", () => { muted = !muted; }, { size: sz });
  // debug entry: deliberately small and at the bottom, normal players never need it
  const dw = (t ? 250 : 230) * s, dh = (t ? 34 : 26) * s, dy = H - dh - 12 * s;
  if (!DEBUG_CFG.enabled) return;
  if (!DBG.on) uiButton("dbg-enable", W / 2 - dw / 2, dy, dw, dh, "Enable debug mode  ( ` )", () => debugSetMode(true), { size: 13 * s, color: "#8a93b8", alpha: 0.75 });
  else {
    uiButton("dbg-menu", W / 2 - dw - 6 * s, dy, dw, dh, "Debug menu  ( ` / F2 )", () => { DBG.menuOpen = true; }, { size: 13 * s, color: "#ffb347" });
    uiButton("dbg-disable", W / 2 + 6 * s, dy, dw * 0.8, dh, "Disable debug mode", () => debugSetMode(false), { size: 13 * s, color: "#8a93b8", alpha: 0.85 });
  }
}

// Called once at the end of render(): everything drawn here is on top of the game and its menus.
function drawPlatformOverlay() {
  PLATFORM.uiScale = platformUiScale();
  if (paused && !(DBG && DBG.menuOpen)) drawPauseButtons();
  drawDebugOverlay();     // DEBUG badge, FPS/stats and the debug menu (285-debug-menu.js)
  drawTouchControls();    // sticks, action buttons, small buttons, title/rotate overlays (275-touch.js)
}

// Runs a draw function (the HUD) scaled up by the UI scale on small touch screens. W/H are temporarily the scaled-down
// logical size so the function lays itself out unchanged; the crosshair position is scaled the same way.
function drawScaled(fn) {
  const s = PLATFORM.uiScale * (PLATFORM.touch ? TOUCH_CFG.hudScale : 1);   // phones draw the HUD smaller
  if (s === 1) return fn();
  const w0 = W, h0 = H, mx = mouse.x, my = mouse.y;
  ctx.save(); ctx.scale(s, s); W = w0 / s; H = h0 / s; mouse.x = mx / s; mouse.y = my / s;
  try { fn(); } finally { W = w0; H = h0; mouse.x = mx; mouse.y = my; ctx.restore(); }
}
