"use strict";
const VICTORY = { duration: 3.8, impact: .9, roar: 1.45 };
const victoryPlaying = () => !!(G && G.finalVictory && G.endT < VICTORY.duration);
const endRestartReady = () => !!G && G.endT > (state === "win" && G.finalVictory ? VICTORY.duration + .6 : .6);
function startFinalVictory(e) {
  G.finalVictory = { boss: Object.assign({}, e, { mode: "dead", tired: false, spinOn: false, lift: 0 }), impact: false, roared: false };
  G.P.action = G.P.buffer = null; G.P.vx = G.P.vy = G.P.walk = G.P.angVel = 0;
  G.enemies = []; G.hazards = []; G.projs = []; G.rings = []; G.swipes = []; G.crescents = []; G.waves = []; G.stompWaves = [];
  G.banner = null; G.nums = []; G.xpLabels = []; G.hurtT = 0; G.introT = G.tease = 0; G.slBanner = null; resetInput();
}
function victoryRoarPower() {
  if (!G.finalVictory) return 0;
  const t = G.endT - VICTORY.roar;
  return clamp(t / .4, 0, 1) * (1 - clamp((t - 1.25) / .65, 0, 1));
}
function victoryRoarPose() {
  const k = victoryRoarPower();
  return k > 0 ? { lean: k, swell: k, headX: -4 * k, mouth: k } : null;
}
function updateFinalVictory(dt) {
  if (!G.finalVictory) return;
  const v = G.finalVictory;
  if (!v.impact && G.endT >= VICTORY.impact) { v.impact = true; G.shake = 11; sfx("stomp"); }
  if (!v.roared && G.endT >= VICTORY.roar) { v.roared = true; sfx("roar"); }
  if (G.endT < VICTORY.duration) {
    G.P.face += angDiff(Math.atan2(v.boss.y - G.P.y, v.boss.x - G.P.x), G.P.face) * Math.min(1, dt * 3);
    const x = G.P.x * .7 + v.boss.x * .3, y = G.P.y * .7 + v.boss.y * .3;
    G.cam.x += (x - G.cam.x) * Math.min(1, dt * 2);
    G.cam.y += (y - G.cam.y) * Math.min(1, dt * 2);
  }
}
function drawFinalBossDeath() {
  const v = G.finalVictory; if (!v) return;
  const e = v.boss, t = G.endT, collapse = smooth01(t / 1.5), fade = 1 - .5 * smooth01((t - 1.6) / 1.4);
  e.deathCollapse = collapse;
  ctx.save(); ctx.globalAlpha = fade;
  ctx.translate(e.x, e.y); ctx.rotate(e.ang); ctx.rotate(collapse * .16);
  ctx.scale(1 - collapse * .12, 1 - collapse * .3); ctx.rotate(-e.ang); ctx.translate(-e.x, -e.y);
  drawBoss(e, t < .35 && Math.floor(t * 22) % 2 === 0);
  ctx.restore();
  // Dust and gold motes settle around the folding wings; no simulation particles linger forever.
  if (t < 2.6) {
    for (let i = 0; i < 40; i++) {
      const a = i * 2.399, age = Math.max(0, t - (i % 5) * .08), radius = (30 + i % 9 * 13) * Math.min(1, age / 1.5);
      ctx.fillStyle = `rgba(${i % 3 ? "222,190,111" : "255,242,181"},${Math.max(0, .6 * (1 - age / 2.6))})`;
      ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * radius, e.y + Math.sin(a) * radius + age * age * 12, 1.5 + i % 3, 0, TAU); ctx.fill();
    }
  }
  const impactAge = t - VICTORY.impact;
  if (impactAge >= 0 && impactAge < .75) {
    ctx.strokeStyle = `rgba(229,205,144,${.4 * (1 - impactAge / .75)})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(e.x, e.y, 40 + impactAge * 220, 24 + impactAge * 130, e.ang, 0, TAU); ctx.stroke();
  }
  const roar = victoryRoarPower();
  if (roar > 0) {
    const age = G.endT - VICTORY.roar;
    ctx.strokeStyle = `rgba(160,255,207,${.3 * roar})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(G.P.x, G.P.y, 40 + age * 90, 0, TAU); ctx.stroke();
  }
}
function drawVictorySequence() {
  const t = G.endT;
  ctx.fillStyle = "rgba(5,10,15,.7)"; ctx.fillRect(0, 0, W, H * .09); ctx.fillRect(0, H * .91, W, H * .09);
  const alpha = smooth01((t - 1.2) / .6);
  ctx.save(); ctx.globalAlpha = alpha;
  txtShadow("KING OF THE CITY", W / 2, H * .16, Math.min(40, W / 18), "#f7df9f");
  txt("OMEGA TYRANT DEFEATED", W / 2, H * .16 + 30, 16, "#d9eee4"); ctx.restore();
}
