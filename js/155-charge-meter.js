// ===== js/155-charge-meter.js: Charge meter logic: earning charge by fighting, passive trickle, HUD effect state =====
"use strict";
// G.P.charge (0-100) is the shared tank for the Atomic Breath and the Super Laser. Constants: CHARGE (035), BREATH.chargeRate (020).
function chargeFx() { return G.cfx || (G.cfx = { flash: 0, ready: 0, laser: 0, wasReady: false, wasLaser: false }); }
// Called from hits / kills / destroyed buildings. `n` is in tank units; scaled by the breath level and muted while the beam fires.
function gainCharge(n) {
  const P = G.P;
  if (!CHARGE.earn || !(n > 0) || !chargeActive()) return;   // CHARGE.earn false: fighting no longer charges the tank
  const a = P.action;
  if (a && a.type === "breath" && a.phase === "fire") n *= CHARGE.breathMul;
  n *= hasBreath() ? breathStats().charge : 1;
  const before = P.charge;
  P.charge = Math.min(100, P.charge + n);
  if (P.charge > before) { const f = chargeFx(); f.flash = Math.min(1, f.flash + 0.25 + n * 0.05); }
}
// The tank only exists once the Atomic Breath (or the Super Laser) is owned.
const chargeActive = () => hasBreath() || !!G.P.up.superlaser;
// Passive trickle per second (low; standing still charges faster).
const chargeTrickle = spd => !chargeActive() || G.P.action && G.P.action.type === "mega" ? 0 : BREATH.chargeRate * (hasBreath() ? breathStats().charge : 1) * (spd < 25 ? BREATH.standMul : 1);
// Per-frame HUD effect timers (flash decay, "now usable" pulses when the meter crosses a threshold).
function updateChargeFx(dt) {
  const f = chargeFx(), P = G.P;
  f.flash = Math.max(0, f.flash - dt * CHARGE.flashDecay);
  f.ready = Math.max(0, f.ready - dt / CHARGE.readyPulse); f.laser = Math.max(0, f.laser - dt / CHARGE.readyPulse);
  const r = hasBreath() && P.charge >= BREATH.minStart, l = P.slots.some(id => id === "superlaser" || id === "mega") && heavyChargeReady(P.slots.includes("superlaser") ? "superlaser" : "mega");
  if (r && !f.wasReady) f.ready = 1;
  if (l && !f.wasLaser) f.laser = 1;
  f.wasReady = r; f.wasLaser = l;
}
