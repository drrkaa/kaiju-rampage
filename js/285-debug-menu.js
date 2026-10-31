// ===== js/285-debug-menu.js: Debug mode + debug menu, built from a registry of actions =====
// DEBUG_CFG.enabled is the master availability switch (false for normal play). When enabled,
// debug mode starts OFF and resets on page reload. It is enabled from the pause menu ("Enable debug mode", also the
// ` or F2 key while paused) or with the URL hash #dbg=1. While it is on: a DEBUG badge is shown in the HUD, ` / F2 (or the
// small DBG button on touch) opens the debug menu, and hotkeys of the registered actions work (L = level up now).
//
// ADDING AN ENTRY from any file (load it after this one, or call it from a function body that runs later):
//   registerDebugAction({
//     id: "my-thing",              // unique; registering the same id again replaces the entry
//     label: "Spawn a thing",      // shown in the menu
//     type: "button",              // "button" (run once) or "toggle" (needs get())
//     run: () => { ... },          // button: called on click/tap/hotkey. toggle: called to flip the value
//     get: () => bool,             // toggle only: current on/off state, shown as [x] / [ ]
//     hotkey: "t",                 // optional single lowercase key, active only while debug mode is on during play or in the menu
//     needsPlay: true,             // optional: only runs in the play state (closes the menu and resumes first)
//     closeMenu: true,             // optional: close the menu and resume after running
//     when: () => bool,            // optional: entry only listed while this returns true
//   });
// Run-state helpers: DBG.on, DBG.menuOpen, debugActions() (list), runDebugAction(id).
"use strict";
const DBG = { on: false, menuOpen: false, god: false, noSpawns: false, stats: false, toast: null, fps: 0, _f: 0, _t0: 0, n: 0 };   // n = overlay frame counter (toast timing); no wall-clock reads in game code
const DEBUG_ACTIONS = [];
function registerDebugAction(a) {
  if (!a || !a.id || !a.label || (a.type !== "button" && a.type !== "toggle")) throw new Error("registerDebugAction: need id, label and type 'button'|'toggle'");
  const i = DEBUG_ACTIONS.findIndex(x => x.id === a.id);
  if (i >= 0) DEBUG_ACTIONS[i] = a; else DEBUG_ACTIONS.push(a);
  return a;
}
const debugActions = () => DEBUG_ACTIONS.filter(a => !a.when || a.when());

function debugSetMode(on) {
  DBG.on = DEBUG_CFG.enabled && !!on;
  on = DBG.on;
  if (!on) {                                   // leaving debug mode switches its effects off again
    DBG.menuOpen = false; DBG.stats = false; DBG.noSpawns = false;
    if (DBG.god) { DBG.god = false; const h = parseHash(); if (h.god) DEBUG.god = h.god; else delete DEBUG.god; }
  }
}
function debugOpenMenu() {
  if (!DBG.on || state === "title") return;
  if (state === "play" && !paused) setPaused(true);
  DBG.menuOpen = true;
}
function debugCloseMenu(resume) { DBG.menuOpen = false; if (resume && paused && state === "play") setPaused(false); }
function debugToast(text) { DBG.toast = { text, t: DBG.n }; }
function runDebugAction(id) {
  const a = DEBUG_ACTIONS.find(x => x.id === id);
  if (!DEBUG_CFG.enabled || !a || !G) return false;
  if (a.needsPlay && state !== "play") return false;
  if (a.needsPlay || a.closeMenu) debugCloseMenu(true);
  a.run();
  debugToast(a.label + (a.type === "toggle" ? (a.get() ? ": ON" : ": OFF") : ""));
  return true;
}
// Called at the end of startGame (280): re-applies the toggles that live on DEBUG (which is re-read from the URL hash).
function debugAfterStart() { if (DBG.on && DBG.god) DEBUG.god = "1"; }
// Keyboard hook called first thing in the keydown handler (280); returns true when the key was consumed.
function debugKeyHook(ev, k) {
  if (!DEBUG_CFG.enabled) return false;
  if (DEBUG_CFG.openKeys.indexOf(k) >= 0) {
    if (ev.preventDefault) ev.preventDefault();
    if (ev.repeat) return true;
    if (DBG.menuOpen) DBG.menuOpen = false;                       // back to the pause menu
    else if (DBG.on) debugOpenMenu();
    else if (paused && state === "play") debugSetMode(true);      // pause menu: enable debug mode
    else return false;
    return true;
  }
  if (DBG.menuOpen && (k === "escape" || k === "p")) { DBG.menuOpen = false; return k === "escape"; }   // Esc: back to pause menu, P: resume as usual
  if (DBG.on && ((state === "play" && !paused) || DBG.menuOpen)) {
    const a = DEBUG_ACTIONS.find(x => x.hotkey === k && (!x.when || x.when()));
    if (a) { if (!ev.repeat) runDebugAction(a.id); return true; }
  }
  return false;
}

// ----------------------------------------------------------- built-in actions ---
function dbgJumpBoss(n) {
  const i = n - 1;
  if (!BOSSES[i]) return;
  G.t = Math.max(G.t, BOSS_TIMES[i]); G.nextBoss = Math.max(G.nextBoss, i + 1);
  spawnBoss(i);
}
function dbgKillAll(bosses) { for (const e of G.enemies.slice()) if (!e.dead && (bosses || !e.def)) killEnemy(e); }
registerDebugAction({ id: "god", label: "Infinite health (god mode)", type: "toggle", hotkey: "g",
  get: () => !!DEBUG.god, run: () => { if (DEBUG.god) { delete DEBUG.god; DBG.god = false; } else { DEBUG.god = "1"; DBG.god = true; } } });
registerDebugAction({ id: "levelup", label: "Level up now", type: "button", hotkey: DEBUG_CFG.levelKey, needsPlay: true,
  run: () => { G.P.xp = xpNeed(G.P.lvl); checkLevelUp(); } });
registerDebugAction({ id: "heal", label: "Heal to full", type: "button", hotkey: "h", run: () => { G.P.hp = G.P.maxHp; } });
registerDebugAction({ id: "charge", label: "Fill breath charge", type: "button", run: () => { G.P.charge = 100; } });
registerDebugAction({ id: "killall", label: "Kill all enemies (not bosses)", type: "button", hotkey: "k", run: () => dbgKillAll(false) });
registerDebugAction({ id: "killboss", label: "Kill everything incl. bosses", type: "button", run: () => dbgKillAll(true) });
registerDebugAction({ id: "tank", label: "Spawn a tank", type: "button", run: () => {
  const P = G.P, d = DEBUG_CFG.spawnTankDist; spawnEnemy("tank", P.x + Math.cos(P.face) * d, P.y + Math.sin(P.face) * d); } });
registerDebugAction({ id: "nospawns", label: "Spawns off (waves and bosses)", type: "toggle", get: () => DBG.noSpawns, run: () => { DBG.noSpawns = !DBG.noSpawns; } });
for (let n = 1; n <= 3; n++) registerDebugAction({ id: "boss" + n, label: "Jump to boss " + n, type: "button", needsPlay: true, when: () => !!BOSSES[n - 1], run: () => dbgJumpBoss(n) });
registerDebugAction({ id: "time10", label: "+" + DEBUG_CFG.timeSkip + " s on the clock", type: "button", run: () => { G.t += DEBUG_CFG.timeSkip; } });
registerDebugAction({ id: "nextboss", label: "Clock to next boss", type: "button", run: () => {
  const t = BOSS_TIMES[G.nextBoss]; if (t !== undefined) G.t = Math.max(G.t, t - DEBUG_CFG.bossJumpLead); } });
registerDebugAction({ id: "weapons", label: "Weapon levels +1 (swipe, breath)", type: "button", run: () => {
  const P = G.P, m = DEBUG_CFG.maxWeaponLevel;
  P.up.swipe = Math.min(m - 1, (P.up.swipe || 0) + 1); if (!P.up.breath) P.charge = BREATH.startCharge; P.up.breath = Math.min(m, (P.up.breath || 0) + 1); } });
registerDebugAction({ id: "stats", label: "Show FPS and entity counts", type: "toggle", hotkey: "f", get: () => DBG.stats, run: () => { DBG.stats = !DBG.stats; } });

// "Spawns off" wraps the spawner (waves and bosses stop; existing enemies stay).
if (typeof updateSpawning === "function") { const spawnOrig = updateSpawning; updateSpawning = function (dt) { if (DBG.noSpawns) return; return spawnOrig(dt); }; }
if (DEBUG_CFG.enabled && parseHash().dbg) DBG.on = true;            // #dbg=1 starts with debug mode on

// ------------------------------------------------------------------ drawing ---
function drawDebugOverlay() {
  if (!DBG.on) return;
  const s = PLATFORM.uiScale;
  DBG.n++;
  if (!paused) DBG.menuOpen = false;
  if (state !== "title" && !DBG.menuOpen) {
    ctx.fillStyle = "rgba(255,150,30,.92)"; ctx.fillRect(16 * s, 104 * s, 66 * s, 20 * s);
    txt("DEBUG", 16 * s + 33 * s, 119 * s, 14 * s, "#241400");
    if (!PLATFORM.touch) txt("` menu   L level up", 88 * s, 119 * s, 11 * s, "rgba(255,200,120,.85)", "left", false);
  }
  if (DBG.stats && G) {
    const now = last; DBG._f++;                  // `last` = timestamp of the current animation frame (290-loop-boot.js)
    if (now - DBG._t0 >= 500) { DBG.fps = Math.round(DBG._f * 1000 / (now - DBG._t0)); DBG._f = 0; DBG._t0 = now; }
    const l = [`FPS ${DBG.fps}`, `enemies ${G.enemies.length}  projs ${G.projs.length}`, `parts ${G.parts.length}  haz ${G.hazards.length}`, `chunks ${chunks.size}  t ${G.t.toFixed(1)}`];
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(16 * s, 130 * s, 190 * s, (l.length * 16 + 6) * s);
    l.forEach((t, i) => txt(t, 22 * s, (144 + i * 16) * s, 12 * s, "#9f9", "left", false));
  }
  if (DBG.toast && DBG.n - DBG.toast.t < DEBUG_CFG.toastFrames) txt(DBG.toast.text, W / 2, H * 0.17, 18 * s, "#ffb347");
  if (!DBG.menuOpen) return;
  ctx.fillStyle = "rgba(0,0,0,.8)"; ctx.fillRect(0, 0, W, H);
  txtShadow("DEBUG MENU", W / 2, 38 * s, 30 * s, "#ffb347");
  const list = debugActions(), rowH = DEBUG_CFG.rowH * s, top = 62 * s;
  const rows = Math.max(1, Math.floor((H - top - 14 * s) / rowH)), cols = Math.ceil(list.length / rows);
  const colW = Math.min(DEBUG_CFG.colW * s, (W - 24 * s) / cols), x0 = W / 2 - (cols * colW) / 2;
  list.forEach((a, i) => {
    const cx = x0 + Math.floor(i / rows) * colW, cy = top + (i % rows) * rowH;
    const on = a.type === "toggle" && a.get();
    const label = (a.type === "toggle" ? (on ? "[x] " : "[ ] ") : "") + a.label + (a.hotkey ? "  (" + a.hotkey.toUpperCase() + ")" : "");
    uiButton("dbg:" + a.id, cx + 3 * s, cy + 2 * s, colW - 6 * s, rowH - 4 * s, label, () => runDebugAction(a.id),
      { size: Math.min(13 * s, colW / 20), color: on ? "#7dff8a" : "#ccd" });
  });
  uiButton("dbg-close", W - 118 * s, 12 * s, 106 * s, 30 * s, "Close  ( ` )", () => { DBG.menuOpen = false; }, { size: 13 * s, color: "#ffb347" });
}
