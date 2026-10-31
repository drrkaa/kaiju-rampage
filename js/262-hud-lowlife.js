// ===== js/262-hud-lowlife.js: low-life warning, a pulsing red vignette at the screen edges (constants: LOWLIFE in 036) =====
"use strict";
let lowLife = { phase: 0, lastT: 0 };
// 0 above the threshold, rising to 1 at 0 HP.
function lowLifeSeverity() {
  const P = G && G.P; if (!P) return 0;
  if (P.hp <= 0) return 1;
  const f = P.hp / P.maxHp;
  return f >= LOWLIFE.threshold ? 0 : clamp(1 - f / LOWLIFE.threshold, 0, 1);
}
// Edge alpha for a given severity and pulse phase (phase in cycles). Exposed for tests.
function lowLifeAlpha(sev, phase) {
  if (sev <= 0) return 0;
  const pulse = 0.5 + 0.5 * Math.sin(phase * TAU);
  const peak = LOWLIFE.minAlpha + (LOWLIFE.maxAlpha - LOWLIFE.minAlpha) * sev;
  return peak * (0.35 + 0.65 * pulse);
}
function drawLowLife() {
  if (!G || (state !== "play" && state !== "levelup")) return;
  const sev = lowLifeSeverity();
  if (sev <= 0) { lowLife.lastT = G.t; return; }
  const dt = Math.max(0, Math.min(0.1, G.t - lowLife.lastT)); lowLife.lastT = G.t;   // only advances while the run advances
  lowLife.phase += dt * (LOWLIFE.pulseHz + (LOWLIFE.pulseHzMax - LOWLIFE.pulseHz) * sev);
  const a = lowLifeAlpha(sev, lowLife.phase);
  // nested frames, outermost strongest, alpha falls off toward the clear centre
  const n = LOWLIFE.bands, bw = Math.min(W, H) * LOWLIFE.edge / n;
  for (let i = 0; i < n; i++) {
    const al = a * Math.pow(1 - i / n, 1.5);
    ctx.fillStyle = `rgba(${LOWLIFE.color},${al.toFixed(4)})`;
    const d = i * bw;
    ctx.fillRect(d, d, W - 2 * d, bw); ctx.fillRect(d, H - d - bw, W - 2 * d, bw);
    ctx.fillRect(d, d + bw, bw, H - 2 * d - 2 * bw); ctx.fillRect(W - d - bw, d + bw, bw, H - 2 * d - 2 * bw);
  }
}
