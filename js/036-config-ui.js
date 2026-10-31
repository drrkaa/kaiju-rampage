// ===== js/036-config-ui.js: UI feel constants (level-up card guard, low-life warning) =====
"use strict";
// Level-up screen: the screen darkens, cards fade in, and card input is ignored for CARDS_UI.lockSec so a click meant
// for an attack cannot pick a card by accident.
const CARDS_UI = {
  lockSec: 0.5,          // seconds after the level-up screen opens during which clicks / keys / taps are ignored
  fadeSec: 0.45,         // cards (and text) fade from 0 to 1 over this time, starting right away
  dimStart: 0.30,        // overlay darkness at the moment the screen opens (rises to dimEnd during the fade)
  dimEnd: 0.65,
};
// Low-life warning: pulsing red vignette (screen edges only, the centre stays clear so the game stays readable).
const LOWLIFE = {
  threshold: 0.30,       // warning starts below this fraction of max HP
  maxAlpha: 0.55,        // edge alpha at the strongest pulse when HP is near 0
  minAlpha: 0.18,        // edge alpha right at the threshold
  pulseHz: 1.3,          // pulses per second at the threshold
  pulseHzMax: 2.4,       // pulses per second at 0 HP
  edge: 0.22,            // depth of the red edge band as a fraction of the shorter screen side (the centre stays clear)
  bands: 14,             // the edge is drawn as this many nested frames with falling alpha (no gradients in this game)
  color: "200,15,15",    // r,g,b of the vignette
};

// Start close to the small kaiju, then reveal more city as the player grows.
const CAMERA = { startZoom: 1.35, matureZoom: 1, matureLevel: 16, ease: 1.5 };
function playerCameraZoom(level) {
  return lerp(CAMERA.startZoom, CAMERA.matureZoom, clamp((level - 1) / (CAMERA.matureLevel - 1), 0, 1));
}
