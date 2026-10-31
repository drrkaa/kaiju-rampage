// [js-split] ===== js/270-menus.js: Level-up card screen, title, end screens, pause overlay, render() =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
const CARD = { w: 230, h: 250, gap: 28 };
function cardRect(i) {
  const total = G.choices.length * CARD.w + (G.choices.length - 1) * CARD.gap;
  return { x: W / 2 - total / 2 + i * (CARD.w + CARD.gap), y: H / 2 - CARD.h / 2 + 20, w: CARD.w, h: CARD.h };
}
// Cards accept input only after CARDS_UI.lockSec (no accidental picks from attack clicks); fade-in progress 0..1.
const cardsReady = () => (G.luT || 0) >= CARDS_UI.lockSec;
const cardsFade = () => clamp((G.luT || 0) / CARDS_UI.fadeSec, 0, 1);
function drawLevelUp() {
  const fade = cardsFade();
  ctx.fillStyle = `rgba(0,0,0,${(CARDS_UI.dimStart + (CARDS_UI.dimEnd - CARDS_UI.dimStart) * fade).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = fade;
  txtShadow("LEVEL UP!", W / 2, H / 2 - CARD.h / 2 - 20, 44, "#ffd24a");
  txt("Click a card or press 1 / 2 / 3", W / 2, H / 2 - CARD.h / 2 + 8, 15, "#ccc", "center", false);
  G.choices.forEach((u, i) => {
    const r = cardRect(i);
    const hover = cardsReady() && mouse.x > r.x && mouse.x < r.x + r.w && mouse.y > r.y && mouse.y < r.y + r.h;
    const l = (G.P.up[u.id] || 0) + 1, y0 = hover ? r.y - 6 : r.y;
    ctx.fillStyle = hover ? "#2e3550" : "#1f2437"; ctx.fillRect(r.x, y0, r.w, r.h);
    ctx.strokeStyle = u.color; ctx.lineWidth = hover ? 4 : 2; ctx.strokeRect(r.x, y0, r.w, r.h);
    drawIcon(u.id, r.x + r.w / 2 - 32, y0 + 24, 64, u.color);
    ctx.fillStyle = u.color; ctx.beginPath(); ctx.arc(r.x + 22, y0 + 22, 13, 0, TAU); ctx.fill();
    txt(String(i + 1), r.x + 22, y0 + 29, 18, "#111");
    const shown = l + (u.base || 0), shownMax = u.max + (u.base || 0);
    txt(u.title ? u.title(l) : u.name, r.x + r.w / 2, y0 + 118, 19, "#fff");
    txt(shown === 1 ? "NEW" : `Level ${shown} / ${shownMax}`, r.x + r.w / 2, y0 + 142, 14, u.color);
    wrapText(u.desc(l), r.x + r.w / 2, y0 + 176, r.w - 30, 18);
  });
  ctx.globalAlpha = 1;
}
function wrapText(s, x, y, maxW, lh) {
  ctx.font = "15px 'Trebuchet MS', Verdana, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#ddd";
  let line = "";
  for (const w of s.split(" ")) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; } else line = test;
  }
  ctx.fillText(line, x, y);
}


function drawTitle() {
  ctx.fillStyle = "#0d171c"; ctx.fillRect(0, 0, W, H);
  drawTitleTease();                                // the Omega Tyrant looms in the background (265)
  txtShadow(GAME_TITLE, W / 2, H * 0.22, Math.min(80, W / 9), "#7dff8a");
  txt("Devour the city. Grow strong. Crush your greatest rival.", W / 2, H * 0.36, Math.min(19, W / 38), "#ddd");
  txt("Claws • Atomic Breath • Upgrades • Space to evade", W / 2, H * 0.36 + 30, Math.min(16, W / 40), "#9cbaac");
  const pulse = 0.6 + 0.4 * Math.sin(titleT * 4);
  ctx.globalAlpha = pulse; txt("Click or press ENTER to rampage", W / 2, H * 0.9, 26, "#fff"); ctx.globalAlpha = 1;
}

function drawEnd(win) {
  if (win && victoryPlaying()) { drawVictorySequence(); return; }
  ctx.fillStyle = win ? "rgba(10,30,60,.7)" : "rgba(40,0,0,.7)"; ctx.fillRect(0, 0, W, H);
  if (win) {
    for (const c of confetti) { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.fillStyle = c.c; ctx.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2); ctx.restore(); }
    txtShadow("VICTORY!", W / 2, H * 0.22, Math.min(64, W / 11), "#7dff8a");
    txt(WIN_SUBTITLE, W / 2, H * 0.22 + 58, 18, "#fff", "center", false);
  } else {
    txtShadow("THE MILITARY PREVAILED", W / 2, H * 0.3, Math.min(54, W / 13), "#f55");
    txt("Even kaiju need a nap sometimes.", W / 2, H * 0.3 + 36, 18, "#ddd", "center", false);
  }
  const s = [`Time survived: ${fmtTime(G.t)}`, `Level reached: ${G.P.lvl}`, `Enemies stomped: ${G.kills}`, `Buildings flattened: ${G.destroyed}`];
  s.forEach((l, i) => txt(l, W / 2, H * 0.55 + i * 28, 20, "#fff"));
  if (endRestartReady()) { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(G.endT * 4); txt("Press R or click to play again", W / 2, H * 0.55 + 150, 24, "#ffd24a"); ctx.globalAlpha = 1; }
}

function drawPause() {
  ctx.fillStyle = "rgba(0,0,0,.62)"; ctx.fillRect(0, 0, W, H);
  txtShadow("PAUSED", W / 2, H * 0.28, Math.min(72, W / 9), "#fff");
  if (PLATFORM.touch) return;                      // touch: tappable buttons only (drawPauseButtons in 272-ui-buttons.js)
  const lines = [["WASD", "move"], ["MOUSE", "aim"], ["LEFT CLICK", "claw swipe"], ["RIGHT CLICK (hold)", "Atomic Breath"], ["Q / E / SPACE", "abilities"]];
  lines.forEach((l, i) => { txt(l[0], W / 2 - 10, H * 0.42 + i * 26, 16, "#ffd24a", "right"); txt(l[1], W / 2 + 10, H * 0.42 + i * 26, 16, "#ddd", "left", false); });
  txt("Esc / P  resume", W / 2, H * 0.42 + 5 * 26 + 30, 22, "#fff");
  txt("R  restart", W / 2, H * 0.42 + 5 * 26 + 60, 18, "#ccc", "center", false);
  txt(muted ? "M  unmute (sound is OFF)" : "M  mute", W / 2, H * 0.42 + 5 * 26 + 86, 18, "#ccc", "center", false);
}
let cursorStyle = "";
function render() {
  uiBegin();                                      // clears the tappable-button list (272-ui-buttons.js)
  drawWorld();
  if (state === "title") drawTitle();
  else {
    if (state !== "win") drawLowLife();                                      // low-life edge vignette (262-hud-lowlife.js)
    drawScaled(() => { drawHUD(); drawCoverHint(); });   // HUD scaled up on small touch screens (UI scale)
    if (state === "levelup") drawLevelUp();
    else if (state === "over") drawEnd(false);
    else if (state === "win") drawEnd(true);
  }
  if (paused) drawPause();
  drawPlatformOverlay();                          // pause buttons, DEBUG badge/menu, touch controls (272, 285, 275)
  const cs = state === "play" && !paused ? "none" : "default";
  if (cs !== cursorStyle) { cursorStyle = cs; canvas.style.cursor = cs; }
}

