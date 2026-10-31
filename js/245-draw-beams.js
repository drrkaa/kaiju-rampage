// ===== js/245-draw-beams.js: Heavy beam drawing (Mega Beam / Super Laser): screen dim + vignette, build-up, beam, taper, afterglow =====
"use strict";
// Logic: 165-ability-superlaser.js. Constants: BEAM_SPECS, BEAM_FX (035). Called from drawWorld (240): drawBeamDim before the player is drawn
// (so the kaiju and the beam stay bright), drawHeavyBeam / drawBeamGlows inside the additive "lighter" pass.
let vignetteImg = null;
function getVignette() {                                 // one small cached radial gradient (transparent centre -> black edges), stretched over the screen
  if (vignetteImg) return vignetteImg;
  const cv = document.createElement("canvas"); cv.width = cv.height = 128;
  const c = cv.getContext("2d");
  if (!c) return null;
  c.fillStyle = "rgba(0,0,0,0)"; c.fillRect(0, 0, 128, 128);
  try {
    const g = c.createRadialGradient(64, 64, 20, 64, 64, 92);
    if (g && g.addColorStop) { g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,6,0.85)"); c.fillStyle = g; c.fillRect(0, 0, 128, 128); }
  } catch (e) { /* no gradients: flat dim only */ }
  return (vignetteImg = cv);
}
// 0-1 darkness for the current heavy-beam action: eases in over the build-up, full while active, eases out over the taper.
function beamDimAmount(act) {
  if (!act || act.type !== "mega") return 0;
  const spec = BEAM_SPECS[act.beam || "mega"];
  if (act.t < spec.charge) return smooth01(act.t / spec.charge);
  if (act.t < spec.charge + spec.active) return 1;
  return 1 - smooth01((act.t - spec.charge - spec.active) / spec.taper);
}
function drawBeamDim(act) {
  const k = beamDimAmount(act);
  if (k < 0.01) return;
  const spec = BEAM_SPECS[act.beam || "mega"], dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);                // screen space, whatever the world camera/zoom is
  ctx.fillStyle = `rgba(0,2,14,${(k * spec.dim * BEAM_FX.dimFlat).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
  const v = getVignette();
  if (v) { ctx.globalAlpha = clamp(k * spec.dim * BEAM_FX.dimVignette * 1.4, 0, 1); ctx.drawImage(v, 0, 0, W, H); }
  ctx.restore();
}
// Additive beam: build-up orb + converging ring, then layered beam whose width and brightness shrink and flicker while tapering.
function drawHeavyBeam(act, frozen) {
  if (!act || act.type !== "mega") return;
  const P = G.P, spec = BEAM_SPECS[act.beam || "mega"], big = spec === SUPERLASER ? 1.7 : 1;
  const mo = mouthOf(), sx = mo.x, sy = mo.y;
  if (act.t < spec.charge) {
    const k = act.t / spec.charge;
    ctx.fillStyle = `rgba(${spec.rgb[2]},${0.3 + 0.5 * k})`; ctx.beginPath(); ctx.arc(sx, sy, (8 + 30 * k) * big, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(${spec.rgb[1]},${0.15 + 0.25 * k})`; ctx.beginPath(); ctx.arc(sx, sy, (14 + 60 * k * k) * big, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(${spec.rgb[2]},.5)`; ctx.lineWidth = 2 * big; ctx.beginPath(); ctx.arc(P.x, P.y, (110 * (1 - k) + 30) * big, 0, TAU); ctx.stroke();
    return;
  }
  const k = heavyBeamK(act, spec);
  if (k < 0.01) return;
  const ex = P.x + Math.cos(P.face) * spec.len, ey = P.y + Math.sin(P.face) * spec.len;
  const wk = Math.pow(k, BEAM_FX.taperWidthPow);
  let fl = frozen ? 1 : 0.9 + Math.random() * 0.2, ak = 1;
  if (k < 1 && !frozen) ak = Math.random() < (1 - k) * BEAM_FX.taperFlicker ? 0.25 : 0.55 + 0.45 * k;   // flickers out: dim frames grow likelier as it fades
  else if (k < 1) ak = 0.55 + 0.45 * k;
  ak *= Math.min(1, k * 1.6 + 0.2);
  ctx.lineCap = "round";
  const layer = (w, rgb, a) => { ctx.strokeStyle = `rgba(${rgb},${(a * ak).toFixed(3)})`; ctx.lineWidth = Math.max(0.5, w * wk * fl); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); };
  layer(spec.drawW * 1.7, spec.rgb[0], 0.16);
  layer(spec.drawW, spec.rgb[1], 0.45);
  layer(spec.coreW, spec.rgb[2], 0.95);
  layer(spec.coreW * 0.4, "255,255,255", 0.9);
  ctx.fillStyle = `rgba(${spec.rgb[2]},${(0.45 * ak).toFixed(3)})`; ctx.beginPath(); ctx.arc(sx, sy, spec.coreW * 0.8 * wk * fl, 0, TAU); ctx.fill();   // muzzle flare
  ctx.fillStyle = `rgba(${spec.rgb[1]},${(0.35 * ak).toFixed(3)})`; ctx.beginPath(); ctx.arc(ex, ey, spec.coreW * 0.9 * wk * fl, 0, TAU); ctx.fill();    // end flare
}
// Fading afterglow lines left where a heavy beam just ended.
function drawBeamGlows(frozen) {
  if (!G.beamGlows || !G.beamGlows.length) return;
  ctx.lineCap = "round";
  for (const g of G.beamGlows) {
    const a = clamp(g.t / g.max, 0, 1);
    ctx.strokeStyle = `rgba(${g.rgb},${(0.28 * a * a).toFixed(3)})`; ctx.lineWidth = g.w * (0.35 + 0.35 * a); ctx.beginPath(); ctx.moveTo(g.x0, g.y0); ctx.lineTo(g.x1, g.y1); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${(0.35 * a * a).toFixed(3)})`; ctx.lineWidth = Math.max(1, g.w * 0.08 * a); ctx.beginPath(); ctx.moveTo(g.x0, g.y0); ctx.lineTo(g.x1, g.y1); ctx.stroke();
  }
}
