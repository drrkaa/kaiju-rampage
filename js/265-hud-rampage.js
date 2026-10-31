// ===== js/265-hud-rampage.js: Charge-meter centrepiece, boss timeline strip, run-start tease, Super Laser banner, title-screen Omega Tyrant tease =====
"use strict";
// One call from drawHUD (260): drawRampageHud(), after the ability slots. One call from drawTitle (270): drawTitleTease().
// Constants: CHARGE, SUPERLASER, TEASE (035). State: G.cfx (155), G.tease / G.slBanner (165).
// Stable chipped edges: no per-frame randomness or distracting outline jitter.
function chargeBarPath(x, y, w, h) {
  const teeth = Math.max(8, Math.round(w / 22)), rough = [0, -3, 1, -5, -1, 2];
  ctx.beginPath(); ctx.moveTo(x, y + h * 0.5);
  for (let i = 0; i <= teeth; i++) ctx.lineTo(x + 24 + (w - 48) * i / teeth, y + rough[i % rough.length]);
  ctx.lineTo(x + w, y + h * 0.5);
  for (let i = teeth; i >= 0; i--) ctx.lineTo(x + 24 + (w - 48) * i / teeth, y + h - rough[(i + 3) % rough.length]);
  ctx.closePath();
}
function drawChargeBar() {
  const P = G.P, f = chargeFx(), hasB = hasBreath(), laser = P.slots.some(id => id === "superlaser" || id === "mega");
  const spec = heavyChargeSpec(P.slots.includes("superlaser") ? "superlaser" : "mega"), heavyName = spec === SUPERLASER ? "SUPER LASER" : "MEGA BEAM";
  const S = 62, y0 = H - S - 34;                       // same slot row as drawHUD
  const w = Math.min(CHARGE.hudW, W - 40), h = CHARGE.hudH, x = W / 2 - w / 2, y = y0 - h - 40;
  const c = clamp(P.charge, 0, 100) / 100, ready = hasB && P.charge >= BREATH.minStart, lready = laser && P.charge >= spec.minCharge;
  const pulse = 0.5 + 0.5 * Math.sin(G.t * 7);
  // Jagged tank silhouette clips the existing sheen, cells and moving sparks.
  ctx.fillStyle = "rgba(0,0,0,.75)"; chargeBarPath(x - 3, y - 3, w + 6, h + 6); ctx.fill();
  ctx.save(); chargeBarPath(x, y, w, h); ctx.clip();
  ctx.fillStyle = "rgba(25,30,50,.95)"; ctx.fillRect(x - 10, y - 8, w + 20, h + 16);
  ctx.save();
  // A torn charge front complements the chipped shell, including at partial fill.
  ctx.beginPath(); ctx.moveTo(x - 10, y - 8); ctx.lineTo(x + w * c - 3, y - 8);
  ctx.lineTo(x + w * c + 2, y + h * .2); ctx.lineTo(x + w * c - 3, y + h * .5);
  ctx.lineTo(x + w * c + 3, y + h * .8); ctx.lineTo(x + w * c - 1, y + h + 8);
  ctx.lineTo(x - 10, y + h + 8); ctx.closePath();
  if (c === 0) { ctx.beginPath(); ctx.rect(x, y, 0, 0); }
  else if (c === 1) { ctx.beginPath(); ctx.rect(x - 10, y - 8, w + 20, h + 16); }
  ctx.clip();
  ctx.fillStyle = lready ? `rgb(255,${Math.round(190 + 50 * pulse)},${Math.round(90 + 90 * pulse)})` : ready ? "#5cf" : "#c83";
  ctx.fillRect(x - 10, y - 8, w + 20, h + 16);
  ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(x - 10, y - 8, w + 20, h * .4 + 8);
  if (f.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${0.55 * f.flash})`; ctx.fillRect(x - 10, y - 8, w + 20, h + 16); }
  for (let i = 0; i < 24; i++) {
    const px = x + ((i * 47 + G.t * 42) % w), py = y + h * (0.5 + 0.32 * Math.sin(i * 3 + G.t * 5));
    ctx.fillStyle = "rgba(230,255,255,.7)"; ctx.fillRect(px, py, 3, 2);
  }
  ctx.restore();
  for (let i = 1; i < 10; i++) { ctx.fillStyle = "rgba(0,10,30,.4)"; ctx.fillRect(x + w * i / 10, y - 6, 2, h + 12); }
  ctx.restore();
  ctx.strokeStyle = ready ? "rgba(190,240,255,.95)" : "rgba(255,255,255,.55)"; ctx.lineWidth = 2;
  chargeBarPath(x, y, w, h); ctx.stroke();
  // threshold markers
  const tx = x + w * BREATH.minStart / 100;

  if (laser) {
    const lx = x + w * spec.minCharge / 100;
    ctx.fillStyle = "#ffcf5a"; ctx.fillRect(lx - 1.5, y - 7, 3, h + 14);
    txt(heavyName, lx, y + h + 18, 10, "#ffd98a");
  }
  // "now usable" pulses: expanding outline when a threshold is crossed
  for (const [k, mx, col] of [[f.ready, tx, "190,240,255"], [f.laser, x + w * spec.minCharge / 100, "255,215,120"]]) {
    if (k <= 0) continue;
    const g = 1 - k;
    ctx.strokeStyle = `rgba(${col},${(0.9 * k).toFixed(3)})`; ctx.lineWidth = 3; chargeBarPath(x - 4 - 24 * g, y - 4 - 14 * g, w + 8 + 48 * g, h + 8 + 28 * g); ctx.stroke();
    ctx.fillStyle = `rgba(${col},${(0.35 * k).toFixed(3)})`; ctx.fillRect(mx - 6, y - 4, 12, h + 8);
  }
  if (ready && !lready) { ctx.strokeStyle = `rgba(150,230,255,${0.25 + 0.3 * pulse})`; ctx.lineWidth = 2; chargeBarPath(x - 4, y - 4, w + 8, h + 8); ctx.stroke(); }
  if (lready) { ctx.strokeStyle = `rgba(255,215,120,${0.4 + 0.5 * pulse})`; ctx.lineWidth = 3; chargeBarPath(x - 5, y - 5, w + 10, h + 10); ctx.stroke(); }
  // labels
  txtShadow("CHARGE", x, y - 12, 14, "#fff", "left");
  const msg = P.failT > 0 ? "NOT ENOUGH CHARGE!"
    : lready ? heavyName + " READY" : ready ? "Breath ready: hold RMB" : "Recharging...";
  txt(msg, x + w, y - 12, 12, P.failT > 0 ? "#f66" : lready ? "#ffd98a" : ready ? "#9df" : "#fb7", "right", false);
  txt(Math.floor(P.charge) + "%", x + w / 2, y + h - 5, 14, "#fff");
}
// Timeline strip under the timer: marks at each boss time, the final boss marked red, the player's position as a pointer.
function drawBossTimeline() {
  const T = BOSS_TIMES, end = T[T.length - 1] * 1.04, w = TEASE.timelineW, x = W / 2 - w / 2, y = 70, px = t => x + w * clamp(t / end, 0, 1);
  ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(x - 6, y - 5, w + 12, 10);
  ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(x, y - 1.5, w, 3);
  ctx.fillStyle = "rgba(255,200,90,.85)"; ctx.fillRect(x, y - 1.5, px(G.t) - x, 3);                     // progress so far
  T.forEach((t, i) => {
    const fin = i === T.length - 1, done = G.t >= t && !bossesAlive().some(b => b.def.id === BOSSES[i].id) && G.nextBoss > i;
    const mx = px(t), r = fin ? 6 : 4.5;
    ctx.fillStyle = done ? "rgba(120,120,130,.9)" : fin ? "#f33" : "#c8f"; ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(mx, y - r); ctx.lineTo(mx + r, y); ctx.lineTo(mx, y + r); ctx.lineTo(mx - r, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (!bossesAlive().length) txt(fmtTime(t), mx, y + 19, 10, fin ? "#f99" : "rgba(255,255,255,.55)", "center", false);
  });
  const mx = px(G.t);                                                                                     // player pointer
  ctx.fillStyle = "#ffe27a"; ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(mx, y - 3); ctx.lineTo(mx + 5, y - 11); ctx.lineTo(mx - 5, y - 11); ctx.closePath(); ctx.fill(); ctx.stroke();
}
function drawRampageHud() {
  drawChargeBar();
  drawBossTimeline();
  const om = BOSSES[BOSSES.length - 1];
  if (G.tease > 0) {                                                                                      // run-start tease, under the RAMPAGE! banner
    const a = clamp(Math.min(G.tease / 0.8, (TEASE.runBanner - G.tease) / 0.6), 0, 1);
    ctx.globalAlpha = a; txtShadow(`${om.name} awaits at ${fmtTime(BOSS_TIMES[BOSS_TIMES.length - 1])}`, W / 2, H * 0.25 + 44, 24, "#ff6a5a");
    txt("Survive. Grow. Defeat it.", W / 2, H * 0.25 + 68, 15, "#fff", "center", false); ctx.globalAlpha = 1;
  }
  const sb = G.slBanner;
  if (sb) {
    const a = clamp(Math.min(sb.t / 0.6, (sb.max - sb.t) / 0.25), 0, 1);
    ctx.globalAlpha = a; ctx.fillStyle = "rgba(60,0,70,.35)"; ctx.fillRect(0, H * 0.34, W, 110);
    txtShadow("SUPER LASER AWAKENED", W / 2, H * 0.34 + 52, Math.min(58, W / 14), "#ff8aff");
    txt("Your Mega Beam evolved",
      W / 2, H * 0.34 + 80, 16, "#fff", "center", false);
    txt(`Needs ${SUPERLASER.minCharge}% charge, drains ${SUPERLASER.cost}% while firing. The meter refills over time.`, W / 2, H * 0.34 + 100, 14, "#ffd98a", "center", false);
    ctx.globalAlpha = 1;
  }
}
// Player portrait on the title screen.
function drawTitleTease() {
  const x = W / 2, y = H * 0.65, scale = Math.min(1.4, H / 560);
  ctx.save();
  for (let i = 4; i > 0; i--) {
    ctx.fillStyle = "rgba(80,255,160,.035)"; ctx.beginPath(); ctx.arc(x, y, (55 + i * 23) * scale, 0, TAU); ctx.fill();
  }
  drawKaiju(x, y, -0.65, scale, PLAYER_PAL, titleT * 1.5, false, 0.6, {});
  ctx.restore();
}
