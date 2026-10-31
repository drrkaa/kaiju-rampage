// ===== js/275-touch.js: Phone controls: dual floating sticks, action buttons built from ABILS/slots, pointer handling, drawing =====
// Left stick = move, right stick = aim (the kaiju faces it; the aim point sits TOUCH_CFG.aimDist in that direction), buttons
// on the right for Swipe (LMB), Breath (RMB, hold) and one per ability slot (Q/E/Space), generated from G.P.slots / ABILS so
// new abilities get a button automatically. A button can also be dragged to aim. All tunables: TOUCH_CFG (015-config-platform.js).
// Hooks: touchPlayInput() from updatePlay (190), touchReleaseAll() from resetInput (280), drawTouchControls() from the
// overlay driver (272). Touch mode: see detectTouch() in 015.
"use strict";
const TOUCH = {
  ptrs: new Map(),                         // pointerId -> { kind: "move"|"aim"|"btn", btn, ox, oy, x, y }
  move: { id: null, bx: 0, by: 0, x: 0, y: 0 },
  aim: { id: null, bx: 0, by: 0, x: 0, y: 0 },
  btnId: {},                               // button name -> pointerId holding it ("swipe", "breath", "slot0"...)
  lLatch: 0, rLatch: 0,                    // a tap shorter than one frame still fires once
  moveOn: false, mx: 0, my: 0,             // analog move direction for updatePlay (unit vector) when the stick is active
  keyed: {},                               // wasd keys we set (so dash direction works) and must release
  lastDir: null,                           // last aim direction {x,y}
  lastState: "", stateFrames: 0,
};

const touchScale = () => Math.min(PLATFORM.uiScale, TOUCH_CFG.btnScaleMax);
// Button layout in logical px. Rebuilt on demand so it follows resize / ability slot count.
function touchLayout() {
  const c = TOUCH_CFG, bs = touchScale();
  const sx = W - c.edge * bs, sy = H - c.edge * bs, out = { btns: [], small: [] };
  const at = (name, ang, r, kind, slot) => { const a = ang * Math.PI / 180; out.btns.push({ name, kind, slot, x: sx + Math.cos(a) * c.arcDist * bs, y: sy + Math.sin(a) * c.arcDist * bs, r: r * bs }); };
  out.btns.push({ name: "swipe", kind: "swipe", x: sx, y: sy, r: c.swipeR * bs });
  at("breath", c.breathAng, c.breathR, "breath");
  const n = G ? G.P.slots.length : 3;
  for (let i = 0; i < n; i++) at("slot" + i, c.slotAngs[i % c.slotAngs.length], c.slotR, "slot", i);
  const ids = ["pause", "mute"]; if (DBG.on) ids.push("debug");
  ids.forEach((id, i) => out.small.push({ id, x: W / 2 + (c.smallX0 + i * c.smallGap) * bs, y: c.smallRowY * bs, r: c.smallR * bs }));
  return out;
}
const portraitNow = () => H > W;

function touchTapSmall(id) {
  if (id === "pause") setPaused(true);
  else if (id === "mute") muted = !muted;
  else if (id === "debug") debugOpenMenu();
}
function touchFullscreen() {
  if (!TOUCH_CFG.tryFullscreen) return;
  try {
    const el = document.documentElement;
    if (el && el.requestFullscreen && !document.fullscreenElement) {
      const p = el.requestFullscreen();
      const lock = () => { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {}); } catch (e) { /* ignore */ } };
      if (p && p.then) p.then(lock, () => {}); else lock();
    }
  } catch (e) { /* not allowed: ignore */ }
}

function touchDown(id, x, y) {
  const T = TOUCH, c = TOUCH_CFG;
  if (portraitNow()) return;
  if (paused || (DBG && DBG.menuOpen)) { uiTap(x, y); return; }
  if (state === "title") { touchFullscreen(); requestRampage(); return; }
  if (state === "over" || state === "win") { if (endRestartReady()) startGame(); return; }
  if (state === "levelup") {
    if (T.stateFrames < c.cardDelayFrames || !cardsReady()) return;
    mouse.x = x; mouse.y = y;
    G.choices.forEach((u, i) => { const r = cardRect(i); if (x > r.x && x < r.x + r.w && y > r.y - 6 && y < r.y + r.h) chooseUpgrade(i); });
    return;
  }
  if (state !== "play") return;
  const lay = touchLayout(), pad = c.hitPad;
  for (const b of lay.small) if (dist(x, y, b.x, b.y) <= b.r + pad) { touchTapSmall(b.id); return; }
  for (const b of lay.btns) {
    if (dist(x, y, b.x, b.y) > b.r + pad || T.btnId[b.name] !== undefined) continue;
    T.btnId[b.name] = id; T.ptrs.set(id, { kind: "btn", btn: b.name, bk: b.kind, slot: b.slot, ox: x, oy: y, x, y });
    if (b.kind === "swipe") T.lLatch = 1;
    else if (b.kind === "breath") T.rLatch = 1;
    else if (b.kind === "slot") tryAbility(b.slot);
    return;
  }
  const st = x < W * c.moveZoneX ? T.move : T.aim;
  if (st.id !== null) return;
  const R = c.stickR * touchScale();
  st.id = id; st.bx = clamp(x, R, W - R); st.by = clamp(y, R, H - R); st.x = x; st.y = y;
  T.ptrs.set(id, { kind: st === T.move ? "move" : "aim" });
}
function touchMove(id, x, y) {
  const p = TOUCH.ptrs.get(id);
  if (!p) return;
  if (p.kind === "btn") { p.x = x; p.y = y; }
  else { const st = TOUCH[p.kind]; st.x = x; st.y = y; }
}
function touchUp(id) {
  const T = TOUCH, p = T.ptrs.get(id);
  if (!p) return;
  T.ptrs.delete(id);
  if (p.kind === "btn") delete T.btnId[p.btn]; else { const st = T[p.kind]; st.id = null; }
}
// Release everything held by touch (pause, blur, level-up, state change). Called from resetInput().
function touchReleaseAll() {
  const T = TOUCH;
  T.ptrs.clear(); T.btnId = {}; T.move.id = null; T.aim.id = null; T.lLatch = T.rLatch = 0; T.moveOn = false;
  for (const k in T.keyed) if (T.keyed[k]) keys[k] = false;
  T.keyed = {};
}
// Stick deflection: {x, y, mag} with mag 0..1 (x, y not normalised).
function stickVec(st) {
  const R = TOUCH_CFG.stickR * touchScale();
  if (st.id === null) return { x: 0, y: 0, mag: 0 };
  let dx = (st.x - st.bx) / R, dy = (st.y - st.by) / R; const m = Math.hypot(dx, dy);
  if (m > 1) { dx /= m; dy /= m; }
  return { x: dx, y: dy, mag: Math.min(1, m) };
}
// Called at the start of every play update while touch mode is on: translates the touch state into the mouse/keys state the
// rest of the game reads (mouse.x/y = aim point on screen, mouse.l / mouse.r = swipe / breath held, TOUCH.mx/my = move).
function touchPlayInput() {
  const T = TOUCH, P = G.P, c = TOUCH_CFG, dz = c.deadzone;
  const mv = stickVec(T.move), av = stickVec(T.aim);
  T.moveOn = mv.mag > dz; T.mx = T.moveOn ? mv.x / mv.mag : 0; T.my = T.moveOn ? mv.y / mv.mag : 0;
  const want = { w: T.my < -0.38, s: T.my > 0.38, a: T.mx < -0.38, d: T.mx > 0.38 };      // digital copy for the dash direction
  for (const k in want) { if (want[k]) { keys[k] = true; T.keyed[k] = true; } else if (T.keyed[k]) { keys[k] = false; T.keyed[k] = false; } }
  let dir = null;
  if (av.mag > dz) dir = { x: av.x / av.mag, y: av.y / av.mag };
  if (!dir) for (const [, p] of T.ptrs) if (p.kind === "btn" && p.bk !== "slot" && Math.hypot(p.x - p.ox, p.y - p.oy) > c.dragAim) { const d = Math.hypot(p.x - p.ox, p.y - p.oy); dir = { x: (p.x - p.ox) / d, y: (p.y - p.oy) / d }; break; }
  if (!dir && T.moveOn) dir = { x: T.mx, y: T.my };
  if (dir) T.lastDir = dir; else if (!T.lastDir) T.lastDir = { x: Math.cos(P.face), y: Math.sin(P.face) };
  const d = T.lastDir, z = G.zoom;
  mouse.x = W / 2 + (P.x - G.cam.x) * z + d.x * c.aimDist * z;
  mouse.y = H / 2 + (P.y - G.cam.y) * z + d.y * c.aimDist * z;
  mouse.l = T.btnId.swipe !== undefined || T.lLatch > 0;
  mouse.r = T.btnId.breath !== undefined || T.rLatch > 0;
  T.lLatch = 0; T.rLatch = 0;
}

// ------------------------------------------------------------------ drawing ---
function touchCircle(x, y, r, col, held, locked) {
  const c = TOUCH_CFG;
  ctx.globalAlpha = locked ? c.alphaBase * 0.5 : held ? c.alphaHeld + 0.2 : c.alphaBase + 0.2;
  ctx.fillStyle = "#101626"; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = locked ? "#888" : col; ctx.lineWidth = held ? 5 : 3; ctx.globalAlpha = locked ? c.alphaBase * 0.7 : held ? 0.95 : 0.7;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 1;
}
function touchButton(b, P, act, at) {
  const held = TOUCH.btnId[b.name] !== undefined, bs = touchScale(), r = b.r;
  let col = "#fff", id = null, cdFrac = 0, cdText = "", locked = false, label = "";
  if (b.kind === "swipe") { col = "#fa4"; id = "swipe"; cdFrac = P.swipeCd > 0 ? P.swipeCd / swipeCdNow() : 0; cdText = P.swipeCd.toFixed(1); }
  else if (b.kind === "breath") {
    col = "#4cf"; id = "breath"; locked = !hasBreath();
    const ready = !locked && P.charge >= BREATH.minStart;
    cdFrac = locked || ready ? 0 : 1 - P.charge / BREATH.minStart; cdText = Math.floor(P.charge) + "%";
  } else {
    const sid = P.slots[b.slot]; label = SLOT_LABELS[b.slot] || "";
    if (!sid) locked = true;
    else { col = ABILS[sid].color; id = sid; cdFrac = P.cds[sid] > 0 ? P.cds[sid] / abilCd(sid) : 0; cdText = P.cds[sid].toFixed(1);
      if (sid === "mega" || sid === "superlaser") {
        const spec = heavyChargeSpec(sid); cdFrac = clamp(1 - P.charge / spec.minCharge, 0, 1);
        cdText = Math.floor(P.charge) + "/" + spec.cost;
      } }
  }
  touchCircle(b.x, b.y, r, col, held, locked);
  const isz = Math.round(r * 1.25);
  if (id) drawIcon(id, b.x - isz / 2, b.y - isz / 2, isz, col, locked ? 0.3 : 0.95);
  else txt("?", b.x, b.y + 8 * bs, 22 * bs, "rgba(255,255,255,.3)");
  if (cdFrac > 0 && !locked) {
    ctx.globalAlpha = 0.65; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.moveTo(b.x, b.y);
    ctx.arc(b.x, b.y, r - 2, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(cdFrac, 0, 1)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    txt(cdText, b.x, b.y + 5 * bs, 14 * bs, "#fff");
  }
  if (label) txt(label === "SPACE" ? "SP" : label, b.x, b.y - r - 4 * bs, 11 * bs, locked ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.7)", "center", false);
}
function touchStick(st, defx, defy, label) {
  const c = TOUCH_CFG, bs = touchScale(), R = c.stickR * bs, held = st.id !== null;
  const bx = held ? st.bx : defx, by = held ? st.by : defy;
  ctx.globalAlpha = held ? 0.3 : c.hintAlpha; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(bx, by, R, 0, TAU); ctx.fill();
  ctx.globalAlpha = held ? 0.6 : c.hintAlpha * 2; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx, by, R, 0, TAU); ctx.stroke();
  if (held) {
    const v = stickVec(st); ctx.globalAlpha = 0.7; ctx.fillStyle = "#cfe"; ctx.beginPath(); ctx.arc(bx + v.x * R, by + v.y * R, c.knobR * bs, 0, TAU); ctx.fill();
  } else txt(label, bx, by + 5 * bs, 13 * bs, "rgba(255,255,255,.22)", "center", false);
  ctx.globalAlpha = 1;
}
function drawTouchControls() {
  if (!PLATFORM.touch) return;
  const T = TOUCH, bs = touchScale();
  if (state !== T.lastState) { T.lastState = state; T.stateFrames = 0; if (state === "levelup") { mouse.x = mouse.y = -9999; } } else T.stateFrames++;
  if (state !== "play" && T.ptrs.size) touchReleaseAll();
  if (portraitNow()) {                      // rotate overlay, game pauses while the device is upright
    if (state === "play" && !paused) setPaused(true);
    ctx.fillStyle = "rgba(8,10,18,.96)"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#7dff8a"; ctx.lineWidth = 4; const pw = Math.min(W, H) * 0.14, ph = pw * 1.8;       // phone icon turning to landscape
    ctx.strokeRect(W / 2 - pw / 2, H / 2 - ph - 20, pw, ph); ctx.strokeRect(W / 2 + pw * 0.9, H / 2 - ph * 0.42 - 20, ph, pw);
    txtShadow("Rotate your device", W / 2, H / 2 + 40, Math.min(34, W / 12), "#fff");
    txt("Kaiju Rampage plays in landscape", W / 2, H / 2 + 72, Math.min(18, W / 22), "#aab", "center", false);
    return;
  }
  if (state === "title" || state === "over" || state === "win") {
    const y = state === "title" ? H * 0.9 : H * 0.55 + 150;
    if (state === "title" || endRestartReady()) {
      ctx.fillStyle = "rgba(6,8,14,.97)"; ctx.fillRect(W / 2 - 300, y - 34, 600, 50);     // replaces the "click / press ENTER" prompt
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(T.stateFrames * 0.07);
      txt(state === "title" ? "TAP to rampage" : "TAP to play again", W / 2, y, 26, state === "title" ? "#fff" : "#ffd24a"); ctx.globalAlpha = 1;
    }
    return;
  }
  if (state !== "play" || paused) return;
  const P = G.P, act = P.action, at = act ? act.type : null, lay = touchLayout();
  touchStick(T.move, W * 0.14, H - 100 * bs, "MOVE");
  touchStick(T.aim, W * 0.55, H - 70 * bs, "AIM");
  for (const b of lay.btns) touchButton(b, P, act, at);
  for (const b of lay.small) {
    touchCircle(b.x, b.y, b.r, b.id === "debug" ? "#ffb347" : "#ccd", false, false);
    ctx.fillStyle = b.id === "debug" ? "#ffb347" : "#fff"; ctx.globalAlpha = 0.8;
    if (b.id === "pause") { ctx.fillRect(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.25, b.r * 0.8); ctx.fillRect(b.x + b.r * 0.1, b.y - b.r * 0.4, b.r * 0.25, b.r * 0.8); }
    else if (b.id === "mute") {
      ctx.fillRect(b.x - b.r * 0.5, b.y - b.r * 0.2, b.r * 0.3, b.r * 0.4); ctx.beginPath(); ctx.moveTo(b.x - b.r * 0.2, b.y - b.r * 0.2); ctx.lineTo(b.x + b.r * 0.15, b.y - b.r * 0.5);
      ctx.lineTo(b.x + b.r * 0.15, b.y + b.r * 0.5); ctx.lineTo(b.x - b.r * 0.2, b.y + b.r * 0.2); ctx.fill();
      if (muted) { ctx.strokeStyle = "#f55"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x - b.r * 0.6, b.y + b.r * 0.6); ctx.lineTo(b.x + b.r * 0.6, b.y - b.r * 0.6); ctx.stroke(); }
    } else txt("DBG", b.x, b.y + 4 * bs, 10 * bs, "#ffb347");
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------- pointer events ---
(function touchBoot() {
  canvas.style.touchAction = "none";
  const isTouchLike = ev => ev.pointerType === "touch" || ev.pointerType === "pen" || (PLATFORM.touch && !PLATFORM.auto);   // forced mode (#touch=1) also accepts the mouse
  function enter(ev) {
    if (!isTouchLike(ev)) {                                   // a real mouse: leave auto-detected touch mode
      if (PLATFORM.touch && PLATFORM.auto) { PLATFORM.touch = false; touchReleaseAll(); resize(); }
      return false;
    }
    if (!PLATFORM.touch) { PLATFORM.touch = true; PLATFORM.auto = true; resize(); }
    if (ev.preventDefault) ev.preventDefault();
    return true;
  }
  canvas.addEventListener("pointerdown", ev => {
    if (!enter(ev)) return;
    audioInit(); try { if (AC && AC.resume) AC.resume(); } catch (e) { /* ignore */ }
    try { if (canvas.setPointerCapture) canvas.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
    touchDown(ev.pointerId, ev.clientX, ev.clientY);
  });
  canvas.addEventListener("pointermove", ev => { if (PLATFORM.touch && TOUCH.ptrs.has(ev.pointerId)) { if (ev.preventDefault) ev.preventDefault(); touchMove(ev.pointerId, ev.clientX, ev.clientY); } });
  const up = ev => { if (TOUCH.ptrs.has(ev.pointerId)) touchUp(ev.pointerId); };
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  // keep iOS from scrolling / zooming / selecting
  try {
    document.addEventListener("touchmove", ev => { if (PLATFORM.touch && ev.cancelable) ev.preventDefault(); }, { passive: false });
    document.addEventListener("gesturestart", ev => { if (ev.preventDefault) ev.preventDefault(); });
  } catch (e) { /* ignore */ }
  if (window.addEventListener) window.addEventListener("orientationchange", () => { resize(); });
})();
