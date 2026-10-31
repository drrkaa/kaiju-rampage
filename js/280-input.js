// [js-split] ===== js/280-input.js: startGame, keyboard/mouse/blur/visibility handlers, pause =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// ------------------------------------------------------------------ INPUT ---
function startGame() {
  setPaused(false);
  newGame(); state = "play"; mouse.l = false; mouse.r = false;
  DEBUG = DEBUG_CFG.enabled ? parseHash() : {};
  if (DEBUG.t) {
    G.t = parseFloat(DEBUG.t) || 0;
    G.nextBoss = BOSS_TIMES.findIndex(bt => bt >= G.t); if (G.nextBoss < 0) G.nextBoss = BOSS_TIMES.length;
    G.nextWave = Math.ceil((G.t + 1) / SPAWN.waveEvery) * SPAWN.waveEvery;
  }
  if (DEBUG.lv) grantDebugLevels(parseInt(DEBUG.lv, 10) || 0);
  if (DEBUG.boss) {                            // #boss=1|2|3: jump straight to that boss with a sensible loadout
    const n = clamp(parseInt(DEBUG.boss, 10) || 1, 1, 3);
    G.t = BOSS_TIMES[n - 1] - 0.5; G.nextBoss = n - 1; G.nextWave = 1e9;
    if (!DEBUG.lv) grantDebugLevels(5 + n * 3);
    if (!DEBUG.wl) { const wl = 2 + n; G.P.up.swipe = wl - 1; G.P.up.breath = Math.max(G.P.up.breath || 0, wl); }
  }
  if (DEBUG.wl) {                              // #wl=N: both weapons to level N
    const n = clamp(parseInt(DEBUG.wl, 10) || 1, 1, 6);
    G.P.up.swipe = n - 1; if (!G.P.up.breath) G.P.charge = BREATH.startCharge; G.P.up.breath = n;
  }
  debugAfterStart();                           // keep debug-menu toggles (god mode) across restarts (285-debug-menu.js)
}
// Pause: freezes the simulation, timers and audio; input state is cleared on pause and resume.
function resetInput() { for (const k in keys) keys[k] = false; mouse.l = mouse.r = false; touchReleaseAll(); if (G) { G.P.rmbPrev = false; G.P.buffer = null; } }
function setPaused(p) {
  if (p === paused) return;
  paused = p; resetInput(); skipDt = true;           // skipDt: no big dt jump on the first frame after resuming
  if (AC && AC.suspend) { try { if (p) AC.suspend(); else AC.resume(); } catch (e) { /* ignore */ } }
}
window.addEventListener("keydown", ev => {
  const guide = document.getElementById("guide");
  if (guide && guide.open === true) return;
  const k = ev.key.toLowerCase();
  audioInit();
  if (debugKeyHook(ev, k)) return;                 // debug mode / debug menu keys (285-debug-menu.js)
  if (k === "m") muted = !muted;
  if ((k === "escape" || k === "p") && !ev.repeat) { if (state === "play") setPaused(!paused); return; }   // ignored on other screens
  if (paused) { if (k === "r") startGame(); return; }
  if (k.startsWith("arrow") || k === " ") ev.preventDefault();
  if (!keys[k] && !ev.repeat && state === "play") { const s = SLOT_KEYS.indexOf(k); if (s >= 0) tryAbility(s); }
  keys[k] = true;
  if (state === "title" && (k === "enter" || k === " ")) { ev.preventDefault(); requestRampage(); }
  else if ((state === "over" || state === "win") && k === "r" && endRestartReady()) startGame();
  else if (state === "levelup" && k >= "1" && k <= "3" && cardsReady()) chooseUpgrade(+k - 1);
});
window.addEventListener("keyup", ev => { keys[ev.key.toLowerCase()] = false; });
window.addEventListener("blur", () => { resetInput(); if (state === "play") setPaused(true); });
if (document.addEventListener) document.addEventListener("visibilitychange", () => { if (document.hidden && state === "play") setPaused(true); });
canvas.addEventListener("contextmenu", ev => ev.preventDefault());
canvas.addEventListener("mousemove", ev => { mouse.x = ev.clientX; mouse.y = ev.clientY; });
canvas.addEventListener("mousedown", ev => {
  mouse.x = ev.clientX; mouse.y = ev.clientY; audioInit();
  if (ev.button === 0 && uiTap(mouse.x, mouse.y)) return;     // tappable buttons (pause menu, debug menu)
  if (paused) return;
  if (ev.button === 2) { mouse.r = true; ev.preventDefault && ev.preventDefault(); return; }
  if (ev.button !== 0) return;
  if (state === "title") requestRampage();
  else if ((state === "over" || state === "win") && endRestartReady()) startGame();
  else if (state === "levelup") {
    if (!cardsReady()) return;                 // input lock after the level-up screen opens
    G.choices.forEach((u, i) => {
      const r = cardRect(i);
      if (mouse.x > r.x && mouse.x < r.x + r.w && mouse.y > r.y - 6 && mouse.y < r.y + r.h) chooseUpgrade(i);
    });
  } else if (state === "play") { mouse.l = true; trySwipe(); }
});
window.addEventListener("mouseup", ev => { if (ev.button === 2) mouse.r = false; else if (ev.button === 0) mouse.l = false; });

