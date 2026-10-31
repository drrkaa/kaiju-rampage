// [js-split] ===== js/200-draw-kaiju.js: Text helpers and the shared kaiju sprite (player + bosses): drawKaiju, PLAYER_PAL =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// ---------------------------------------------------------------- DRAWING ---
function txt(s, x, y, size, color, align, bold) {
  ctx.font = (bold === false ? "" : "bold ") + size + "px 'Trebuchet MS', Verdana, sans-serif";
  ctx.textAlign = align || "center"; ctx.fillStyle = color || "#fff";
  ctx.fillText(s, x, y);
}
function txtShadow(s, x, y, size, color, align) { txt(s, x + 2, y + 3, size, "rgba(0,0,0,.6)", align); txt(s, x, y, size, color, align); }

// Shared kaiju sprite (top-down, facing +x). pal: {style, body, belly, spine, aura}
// fx (player only): {charge 0-1, ready, t, rear 0-1 (roar head-back)}
function drawKaiju(x, y, ang, s, pal, walk, flash, glow, fx) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  if (fx && fx.swipe) {
    const a = fx.swipe, wind = clamp(a.t / SWIPE.wind, 0, 1);
    const snap = clamp((a.t - SWIPE.wind) / SWIPE.strike, 0, 1);
    const settle = 1 - clamp((a.t - SWIPE.wind - SWIPE.strike) / SWIPE.recover, 0, 1);
    ctx.rotate(a.dir * (a.t < SWIPE.wind ? -0.12 * wind : lerp(-0.12, 0.16, snap) * settle));
  }
  const rp = fx && fx.roar, headX = rp ? rp.headX : 0, tw = fx && fx.turn ? fx.turn * -16 : 0;
  if (fx && fx.turn) { ctx.rotate(fx.turn * 0.07); ctx.translate(0, fx.turn * 2.5); }   // lean into the turn
  if (rp) { ctx.translate(-rp.lean * 3, 0); ctx.scale(1 + 0.04 * rp.swell, 1 + 0.06 * rp.swell); }   // body leans back and swells slightly
  const sw = Math.sin(walk), st = pal.style, ft = pal.feat;   // ft: optional feature flags (player forms only, see PLAYER_FORMS)
  if (st === "player") {
    drawPlayerModel(pal, walk, flash, glow, fx);
    ctx.restore(); return;
  }
  if (ft && ft.halo) {                           // final form: faint pulsing aura
    ctx.fillStyle = `rgba(255,90,40,${0.07 + 0.05 * Math.sin(walk * 2)})`;
    ctx.beginPath(); ctx.arc(0, 0, 58, 0, TAU); ctx.fill();
  }
  if (pal.aura > 0) {
    ctx.fillStyle = `rgba(255,60,30,${0.12 + 0.1 * Math.sin(walk * 2)})`;
    ctx.beginPath(); ctx.arc(0, 0, 62, 0, TAU); ctx.fill();
  }
  // tail
  ctx.strokeStyle = pal.body; ctx.lineCap = "round";
  const tl = (st === "spitter" ? 1.3 : st === "horned" ? 0.8 : 1) * (ft && ft.tail || 1);
  ctx.lineWidth = st === "horned" ? 21 : 16; ctx.beginPath(); ctx.moveTo(-18, 0);
  ctx.quadraticCurveTo(-45 * tl, sw * 12 + tw * 0.5, -72 * tl, sw * -14 + tw); ctx.stroke();
  ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-60 * tl, sw * -10); ctx.lineTo(-84 * tl, sw * -18); ctx.stroke();
  if (st === "spitter") { ctx.fillStyle = pal.spine; ctx.beginPath(); ctx.arc(-86 * tl, sw * -18, 6, 0, TAU); ctx.fill(); }
  if (ft && ft.tailBlade) {                      // bone blade on the tail tip
    ctx.fillStyle = "#e8e0c8"; const bx = -84 * tl, by = sw * -18;
    ctx.beginPath(); ctx.moveTo(bx + 2, by - 7); ctx.lineTo(bx - 20, by); ctx.lineTo(bx + 2, by + 7); ctx.closePath(); ctx.fill();
  }
  // Boss legs (player anatomy lives in 199-player-model).
  ctx.fillStyle = pal.body;
  ctx.beginPath(); ctx.ellipse(-4 + sw * 8, 22, 12, 8, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-4 - sw * 8, -22, 12, 8, 0, 0, TAU); ctx.fill();
  // body
  ctx.fillStyle = flash ? "#fff" : pal.body;
  ctx.beginPath(); ctx.ellipse(0, 0, st === "horned" ? 38 : 34, st === "horned" ? 29 : 25, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = pal.belly; ctx.beginPath(); ctx.ellipse(4, 0, 22, 13, 0, 0, TAU); ctx.fill();
  if (ft && ft.plates) {                       // dark armour plates along the back
    ctx.fillStyle = pal.plate;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(i * 11 - 2, 0, 6, 17 - Math.abs(i) * 2.2, 0, 0, TAU); ctx.fill(); }
  }
  if (ft && ft.seams) {                        // glowing seams (additive, gently pulsing)
    ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = pal.seam; ctx.lineWidth = 2; ctx.globalAlpha = 0.55 + 0.25 * Math.sin(walk * 1.5);
    ctx.beginPath(); ctx.moveTo(-26, -16); ctx.lineTo(-12, -8); ctx.lineTo(-18, 4); ctx.moveTo(14, 18); ctx.lineTo(22, 8); ctx.lineTo(10, 2);
    ctx.moveTo(-24, 16); ctx.lineTo(-10, 10); ctx.moveTo(6, -18); ctx.lineTo(16, -10); ctx.stroke();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
  if (st === "tyrant") {                       // glowing cracks
    ctx.strokeStyle = pal.spine; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(-20, -14); ctx.lineTo(-8, -4); ctx.lineTo(-14, 8); ctx.moveTo(10, 15); ctx.lineTo(18, 6); ctx.lineTo(8, -2); ctx.stroke();
  }
  if (ft && ft.scutes) {
    ctx.strokeStyle = pal.spine; ctx.lineWidth = 2;
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(-22 + i * 12, side * 17); ctx.lineTo(-16 + i * 12, side * 22); ctx.lineTo(-10 + i * 12, side * 17); ctx.stroke();
    }
  }
  if (ft && ft.fins) {
    ctx.fillStyle = pal.spine;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-24, side * 16); ctx.lineTo(-44, side * 38); ctx.lineTo(8, side * 22); ctx.closePath(); ctx.fill(); }
  }
  // arms
  if (ft && ft.shoulder) {                     // bone shoulder spikes
    ctx.fillStyle = "#e8e0c8";
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(10, sd * 28); ctx.lineTo(18, sd * 38); ctx.lineTo(22, sd * 26); ctx.fill(); }
  }
  if (st === "horned") {                       // shoulder spikes
    ctx.fillStyle = "#e8e0c8";
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(10, sd * 28); ctx.lineTo(20, sd * 40); ctx.lineTo(24, sd * 26); ctx.fill(); }
  }
  // back spines / fins
  ctx.fillStyle = pal.spine;
  if (st === "spitter") {
    for (let i = -2; i <= 2; i++) { ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.ellipse(i * 12, 0, 6, 14 - Math.abs(i) * 2, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  } else {
    for (let i = -3; i <= 2; i++) {
      const px = i * 11;
      ctx.beginPath(); ctx.moveTo(px - 5, -5); ctx.lineTo(px, 0); ctx.lineTo(px - 5, 5); ctx.lineTo(px - 11, 0); ctx.closePath(); ctx.fill();
      if (st === "tyrant") { ctx.beginPath(); ctx.moveTo(px - 4, -14); ctx.lineTo(px, -9); ctx.lineTo(px - 8, -9); ctx.fill(); ctx.beginPath(); ctx.moveTo(px - 4, 14); ctx.lineTo(px, 9); ctx.lineTo(px - 8, 9); ctx.fill(); }
    }
  }
  if (ft && ft.spineBig) {                     // second, taller row of spines (grows with the form)
    ctx.fillStyle = pal.spine;
    const n = ft.spineBig === 1 ? 3 : 5, h = ft.spineBig === 1 ? 13 : 18;
    for (let i = 0; i < n; i++) {
      const px = -26 + i * (ft.spineBig === 1 ? 14 : 11);
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(px, sd * 7); ctx.lineTo(px - 4, sd * (7 + h)); ctx.lineTo(px - 9, sd * 7); ctx.closePath(); ctx.fill(); }
    }
  }
  // breath-tank glow along the spines: subtle (scaled by CHARGE_FX_INTENSITY); dim orange below the threshold
  if (fx && fx.charge > 0.04 && CHARGE_FX_INTENSITY > 0) {
    const c = fx.charge, I = CHARGE_FX_INTENSITY, pulse = 0.9 + 0.1 * Math.sin(fx.t * 6);
    ctx.globalCompositeOperation = "lighter";
    for (let i = -3; i <= 2; i++) {
      ctx.fillStyle = fx.ready ? `rgba(190,230,255,${I * (0.25 + 0.45 * c)})` : `rgba(255,150,60,${I * 0.25 * c})`;
      ctx.beginPath(); ctx.arc(i * 11 - 5, 0, (2.2 + 2.2 * c) * pulse, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }
  // head (rears back and grows during a roar)
  ctx.save(); ctx.translate(36 + headX, 0); ctx.scale(1 + 0.12 * (rp ? rp.swell : 0), 1 + 0.12 * (rp ? rp.swell : 0)); ctx.translate(-36, 0);
  ctx.fillStyle = flash ? "#fff" : pal.body;
  ctx.beginPath(); ctx.ellipse(36, 0, 17, 14, 0, 0, TAU); ctx.fill();
  if (st === "horned" || st === "tyrant") {
    ctx.fillStyle = "#e8e0c8";
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(30, sd * 10); ctx.lineTo(50, sd * 18); ctx.lineTo(38, sd * 6); ctx.fill(); }
    if (st === "tyrant") { ctx.beginPath(); ctx.moveTo(26, -4); ctx.lineTo(36, 0); ctx.lineTo(26, 4); ctx.fill(); }
  }
  if (st === "spitter") {
    ctx.fillStyle = pal.belly; ctx.beginPath(); ctx.ellipse(28, 17, 8, 5, 0.4, 0, TAU); ctx.ellipse(28, -17, 8, 5, -0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.spine; ctx.beginPath(); ctx.arc(42, 0, 4, 0, TAU); ctx.fill();
  }
  if (ft && ft.crest) {                          // swept-back head horns
    ctx.fillStyle = "#e8e0c8";
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(34, sd * 9); ctx.lineTo(18, sd * 19); ctx.lineTo(30, sd * 4); ctx.closePath(); ctx.fill(); }
  }
  if (ft && ft.crown) {
    ctx.fillStyle = pal.spine;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(28, side * 10); ctx.lineTo(14, side * 27); ctx.lineTo(38, side * 13); ctx.closePath(); ctx.fill(); }
  }
  ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(40, -8, 2.6, 0, TAU); ctx.arc(40, 8, 2.6, 0, TAU); ctx.fill();
  ctx.fillStyle = pal.eye || (st === "player" ? "#ff0" : "#f33"); ctx.beginPath(); ctx.arc(40.5, -8, 1.2, 0, TAU); ctx.arc(40.5, 8, 1.2, 0, TAU); ctx.fill();
  if (rp && rp.mouth > 0.03) {                    // open mouth, eased (no popping)
    const mo = rp.mouth;
    ctx.fillStyle = "#5a0f14"; ctx.beginPath(); ctx.ellipse(47, 0, 2 + 6 * mo, 1.5 + 6 * mo, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fff";
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(44, sd * 6 * mo); ctx.lineTo(48.5, sd * 4.5 * mo); ctx.lineTo(46, sd * 2.5 * mo); ctx.fill(); }
  }
  ctx.restore();
  // faint small mouth glow for the tank
  if (fx && fx.charge > 0.04 && CHARGE_FX_INTENSITY > 0) {
    ctx.globalCompositeOperation = "lighter";
    const pulse = 0.85 + 0.15 * Math.sin(fx.t * 5);
    ctx.fillStyle = fx.ready ? `rgba(190,235,255,${CHARGE_FX_INTENSITY * (0.2 + 0.3 * fx.charge)})` : `rgba(255,160,70,${CHARGE_FX_INTENSITY * 0.2 * fx.charge})`;
    ctx.beginPath(); ctx.arc(50 + headX, 0, (2 + 2.5 * fx.charge) * pulse, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }
  if (glow > 0) { ctx.fillStyle = `rgba(120,255,255,${Math.min(1, glow)})`; ctx.beginPath(); ctx.arc(50, 0, 9, 0, TAU); ctx.fill(); }
  drawPlayerClaws(pal, flash, fx); // hands pass in front of the body and head during the cut
  ctx.restore();
}
const PLAYER_PAL = PLAYER_FORMS[0].pal;       // start look (title screen); in game see playerAppearance() in 205-player-look.js

