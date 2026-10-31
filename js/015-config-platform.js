// ===== js/015-config-platform.js: Platform tunables (touch controls, canvas scaling, UI scale) and debug-mode tunables =====
// Classic script (no modules). Loaded early because resize() in 060 reads it. Everything here is a tunable constant;
// the logic lives in 272-ui-buttons.js, 275-touch.js and 285-debug-menu.js.
"use strict";
// ---------------------------------------------------------------- TOUCH / PLATFORM ---
// Touch mode turns on when the device's primary pointer is coarse, on the first real touch pointer event, or with the
// debug hash #touch=1 (forces it on a desktop so it can be tested with the mouse). A real mouse event switches an
// auto-detected touch mode off again, so a laptop with a touchscreen keeps working with the mouse.
const TOUCH_CFG = {
  stickR: 56,            // radius of the floating sticks (logical px at UI scale 1)
  knobR: 24,             // radius of the stick knob
  deadzone: 0.18,        // stick deflection (0-1) below which the stick counts as centred
  moveZoneX: 0.42,       // touches on the left this fraction of the screen width start the move stick, the rest start the aim stick
  aimDist: 260,          // world px in front of the kaiju where the aim point sits while aiming by touch
  dragAim: 14,           // px of drag on an attack button before it also steers the aim (drag from the button to aim)
  btnScaleMax: 1.2,      // buttons never scale beyond this (they would not fit)
  swipeR: 40,            // button radii (UI scale 1)
  breathR: 32,
  slotR: 28,
  arcDist: 94,           // distance of the breath/ability buttons from the swipe button centre
  breathAng: 165,        // button angles around the swipe button in degrees (0 = right, 90 = down)
  slotAngs: [212, 250, 290],
  edge: 78,              // swipe button centre distance from the right/bottom screen edges
  smallR: 19,            // pause / mute / debug round buttons
  smallRowY: 26,         // their row centre y (UI scale 1), beside the timer at the top
  smallX0: 92,           // first button centre x offset from the screen centre (to the right of the timer)
  smallGap: 46,          // spacing of the small buttons
  hitPad: 12,            // extra touch slop around buttons
  alphaBase: 0.28, alphaHeld: 0.55,   // control opacity idle / pressed
  hintAlpha: 0.12,       // faint resting hint rings for the two sticks
  uiRefH: 560,           // screen height at which the HUD is drawn 1:1; shorter touch screens scale the HUD up
  uiMaxScale: 1.5,       // cap of that HUD scale (UI_SCALE)
  hideHudSlots: true,    // hide the HUD bottom-centre key slot row on touch (the buttons show the same info)
  cardDelayFrames: 18,   // frames after the level-up screen opens before a tap can pick a card (no accidental picks)
  maxDpr: 2,             // cap of devicePixelRatio for the canvas backing store on touch devices
  maxBackingW: 1600,     // cap of the backing store width in device px on touch devices (performance)
  hudScale: 0.7,         // touch HUD size relative to the UI scale (the HUD was far too large on phones)
  zoomMul: 0.85,         // touch camera zoom multiplier (< 1 = zoomed out a little, so more of the city is visible)
  tryFullscreen: true,   // ask for fullscreen + landscape lock on the first start tap (best effort, ignored when refused)
};
const PLATFORM = { touch: false, auto: false, uiScale: 1 };
(function detectTouch() {
  let forced = false, coarse = false;
  try { forced = /(^|[#&])touch=1(&|$)/.test(window.location && window.location.hash || ""); } catch (e) { /* no location */ }
  try { coarse = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches); } catch (e) { /* ignore */ }
  PLATFORM.touch = forced || coarse; PLATFORM.auto = coarse && !forced;
})();
// HUD / button scale for the current window (1 on desktop).
function platformUiScale() { return PLATFORM.touch ? Math.min(TOUCH_CFG.uiMaxScale, Math.max(1, TOUCH_CFG.uiRefH / Math.max(1, window.innerHeight))) : 1; }
// Camera zoom multiplier for the current platform (1 on desktop).
function platformZoomMul() { return PLATFORM.touch ? TOUCH_CFG.zoomMul : 1; }
// Canvas backing-store pixel ratio: devicePixelRatio on desktop (unchanged), capped on touch devices.
function platformPixelRatio() {
  const dpr = window.devicePixelRatio || 1;
  if (!PLATFORM.touch) return dpr;
  return Math.max(0.5, Math.min(dpr, TOUCH_CFG.maxDpr, TOUCH_CFG.maxBackingW / Math.max(1, window.innerWidth)));
}

// ---------------------------------------------------------------- DEBUG MODE ---
const DEBUG_CFG = {
  enabled: false,          // master switch: debug UI, hotkeys and URL cheats are unavailable when false
  openKeys: ["`", "f2"],   // opens the debug menu (and, on the pause menu, enables debug mode); shown in the UI
  levelKey: "l",           // level up now (while debug mode is on)
  rowH: 30,                // menu row height (UI scale 1)
  colW: 250,               // menu column width
  bossJumpLead: 0.5,       // seconds before a boss spawn that "jump to boss" sets the clock to
  timeSkip: 10,            // seconds added by "+10s"
  maxWeaponLevel: 6,
  toastFrames: 100,        // how long the action confirmation text stays on screen
  spawnTankDist: 320,      // tank spawns this far in front of the kaiju
};
