// [js-split] ===== js/240-draw-world.js: drawWorld (camera, chunks, buildings, entities, effects) and the bar() helper =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
function drawWorld() {
  const shake = G ? G.shake : 0;
  const cam = (state === "title" || !G) ? { x: titleT * 60 + 40, y: Math.sin(titleT * 0.4) * 120 } : G.cam;
  const frozen = paused || state !== "play" && !victoryPlaying();     // paused / card screen: no animated jitter, the scene is a still image
  const cx = cam.x + (shake && !frozen ? rnd(-shake, shake) : 0), cy = cam.y + (shake && !frozen ? rnd(-shake, shake) : 0);
  ctx.save();
  const zm = (G && G.zoom) || 1, Wv = W / zm, Hv = H / zm;      // boss fights zoom the camera out
  ctx.translate(W / 2, H / 2); ctx.scale(zm, zm); ctx.translate(-W / 2, -H / 2);
  ctx.translate(Math.round(W / 2 - cx), Math.round(H / 2 - cy));
  // city chunks (cached canvases)
  const c0x = Math.floor((cx - Wv / 2) / CHUNK), c1x = Math.floor((cx + Wv / 2) / CHUNK);
  const c0y = Math.floor((cy - Hv / 2) / CHUNK), c1y = Math.floor((cy + Hv / 2) / CHUNK);
  for (let i = c0x; i <= c1x; i++) for (let j = c0y; j <= c1y; j++) {
    const c = getChunk(i, j);
    if (!c.canvas || (c.dirty && frameNo - (c.lastRender || 0) >= CHUNK_REDRAW_MIN_FRAMES)) renderChunk(c);
    ctx.drawImage(c.canvas, i * CHUNK, j * CHUNK, CHUNK, CHUNK);
  }
  if (state === "title" || !G) {
    drawKaiju(cx, cy, 0, 1.6, PLAYER_PAL, titleT * 6, false, 0, { charge: 0.9, ready: true, t: titleT, roar: null });
    ctx.restore(); return;
  }
  const P = G.P, act = P.action;
  const vx0 = cx - Wv / 2 - 60, vx1 = cx + Wv / 2 + 60, vy0 = cy - Hv / 2 - 60, vy1 = cy + Hv / 2 + 60;
  const vis = o => o.x > vx0 && o.x < vx1 && o.y > vy0 && o.y < vy1;
  for (const b of G.dmgList) {                      // freshly damaged buildings: shake + white flash + HP bar (dynamic, not in the cache)
    if (b.dead) continue;
    const q = colRect(b);
    if (q.x > vx1 || q.x + q.w < vx0 || q.y > vy1 || q.y + q.h < vy0) continue;
    if (b.hitFlash > 0) {
      const k = b.hitFlash / BLDG_SHAKE_TIME;
      ctx.save(); if (!frozen) ctx.translate(rnd(-2, 2) * k, rnd(-2, 2) * k); if(!b.parent)drawBuilding(ctx, b); ctx.restore();
      ctx.fillStyle = `rgba(255,255,255,${0.4 * k})`; ctx.fillRect(q.x, q.y, b.w, b.h);
    }
    if (b.barT > 0) {
      const f = clamp(b.hp / b.maxHp, 0, 1);
      ctx.fillStyle = "rgba(0,0,0,.65)"; ctx.fillRect(q.x, q.y - 9, b.w, 5);
      ctx.fillStyle = f > 0.5 ? "#6c6" : f > 0.25 ? "#ec4" : "#e54"; ctx.fillRect(q.x + 0.5, q.y - 8.5, (b.w - 1) * f, 4);
    }
  }
  for (const d of G.decals) {                       // scorch marks on the ground
    ctx.fillStyle = `rgba(12,8,6,${0.5 * Math.min(1, d.t / 3)})`;
    ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.7, 0, 0, TAU); ctx.fill();
  }
  drawWorldGround(vx0, vx1, vy0, vy1);              // footprints, stomp marks, flying cars, wreck fire
  drawTremorCracks();                               // ground fractures and debris stay beneath creatures
  for (const h of G.hazards) drawHazard(h);
  drawStompFx(act);
  // player shadow squashes with each footstep
  const sq = 1 + 0.12 * P.stepPulse;
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(P.x + 5, P.y + 8, 38 * sq, 27 / sq, P.face, 0, TAU); ctx.fill();
  drawEnemyShadows(G.enemies, vis); drawFlyUnder(vis);                // ground shadows first, then sprites, then projectiles
  for (const e of G.enemies) {
    if (!(e.def || vis(e))) continue;
    if (e.alpha < 1) ctx.globalAlpha = e.alpha;
    drawEnemy(e);
    if (e.alpha < 1) ctx.globalAlpha = 1;
  }
  if (G.finalVictory) drawFinalBossDeath();
  if (G.projs.length) {                            // projectile shadows (one path), glow (additive), then bright cores
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath();
    for (const p of G.projs) { ctx.moveTo(p.x + 2 + p.r, p.y + 5); ctx.ellipse(p.x + 2, p.y + 5, p.r, p.r * 0.6, 0, 0, TAU); }
    ctx.fill();
    ctx.globalCompositeOperation = "lighter";
    for (const p of G.projs) { ctx.fillStyle = p.friendly ? "rgba(70,210,255,.35)" : "rgba(255,110,40,.38)"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.4, 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = "source-over";
    for (const p of G.projs) {
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      ctx.fillStyle = p.friendly ? "#e8ffff" : "#fff7c8"; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.5, p.r * 0.5), 0, TAU); ctx.fill();
      if (p.friendly) { ctx.strokeStyle = "rgba(160,255,255,.5)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); ctx.stroke(); }
    }
  }
  ctx.globalCompositeOperation = "lighter";
  for (const sm of G.smoke) {                       // smoke puffs / small fires rising from damaged roofs
    const a = clamp(sm.life / sm.max, 0, 1);
    if (sm.fire) { ctx.fillStyle = `rgba(255,${110 + Math.floor(Math.random() * 90)},30,${0.85 * a})`; ctx.beginPath(); ctx.arc(sm.x, sm.y, 2.5 + 2 * a, 0, TAU); ctx.fill(); }
    else { ctx.fillStyle = `rgba(70,70,74,${0.4 * a})`; ctx.beginPath(); ctx.arc(sm.x, sm.y, sm.size * (1 + (1 - a) * 1.6), 0, TAU); ctx.fill(); }
  }
  ctx.globalCompositeOperation = "lighter";
  drawCollapses();
  // roar / stomp rings: bright leading edge; roar rings start at the mouth and drift to the body centre
  for (const r of G.rings) {
    if (r.t < 0) continue;
    if (r.claw) {
      ctx.strokeStyle = `rgba(${r.c},${r.dim * clamp(1 - r.t / r.life, 0, 1)})`;
      ctx.lineWidth = r.w; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
      continue;
    }
    const a = Math.max(0, 0.9 - r.t * 1.8) * (r.dim || 1), w = r.w || 10, kk = clamp(r.t / 0.35, 0, 1);
    const px = r.fx === undefined ? r.x : lerp(r.fx, r.x, kk), py = r.fx === undefined ? r.y : lerp(r.fy, r.y, kk);
    ctx.strokeStyle = `rgba(${r.c || "255,220,120"},${a * 0.18})`; ctx.lineWidth = w * 3;
    ctx.beginPath(); ctx.arc(px, py, r.r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(${r.c || "255,220,120"},${a * 0.5})`; ctx.lineWidth = w;
    ctx.beginPath(); ctx.arc(px, py, r.r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, r.r + w * 0.4, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(${r.c || "255,220,120"},${a * 0.3})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, Math.max(1, r.r - 26), 0, TAU); ctx.stroke();
  }
  for (const c of G.crescents) drawClawWave(c);
  // Three tapered talon ribbons: narrow tails, broad cutting edges, pointed tips.
  // The outer edge stays within the weapon's actual hit range.
  for (const s of G.swipes) {
    const age = s.max - s.t, progress = clamp(age / .1, 0, 1);
    const ease = 1 - Math.pow(1 - progress, 3), fade = Math.pow(clamp(s.t / s.max, 0, 1), .7);
    const start = s.dir * s.arc / 2, head = start - s.dir * s.arc * ease;
    const tail = head + s.dir * s.arc * Math.min(ease, .82);
    for (let k = 0; k < 3; k++) {
      const radius = s.r * (.7 + .15 * k), width = (5 + k * 1.5) * fade;
      for (const halo of [true, false]) {
        ctx.fillStyle = halo ? `rgba(255,150,65,${.16 * fade})` : `rgba(255,${242 - k * 12},${210 - k * 24},${.92 * fade})`;
        ctx.beginPath();
        for (let edge = 0; edge < 2; edge++) for (let i = 0; i <= 18; i++) {
          const u = edge ? 1 - i / 18 : i / 18;
          const angle = s.ang + lerp(tail, head, u);
          const taper = Math.sin(Math.PI * u) * (.3 + .7 * u);
          const r = radius - (edge ? 1 : -1) * width * taper * (halo ? 2.4 : 1);
          const x = s.x + Math.cos(angle) * Math.min(s.r, r), y = s.y + Math.sin(angle) * Math.min(s.r, r);
          if (!edge && !i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.fill();
      }
      // A short ivory edge follows the cut instead of a stationary start flash.
      ctx.strokeStyle = `rgba(255,255,240,${fade * (1 - progress * .55)})`;
      ctx.lineWidth = 1.4; ctx.beginPath();
      ctx.arc(s.x, s.y, radius, s.ang + head + s.dir * .14 * progress, s.ang + head, s.dir > 0); ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = "source-over";
  // (tail spin is drawn after the player body, see drawTailSpin)
  drawBeamDim(act);                                // darken the screen while a heavy beam charges / fires (245); the kaiju and beam are drawn on top
  drawRadiance();
  // player
  const hurt = G.hurtT > 0 && Math.floor(G.t * 30) % 2 === 0;
  const breathing = act && act.type === "breath" && act.phase === "fire";
  const breathGlow = act && act.type === "breath" ? (act.phase === "wind" ? 0.9 * act.t / BREATH.windup : act.phase === "fire" ? 0.9 : 0.9 * (1 - act.t / BREATH.exhale)) : 0;
  let lunge = 0;                                   // tiny forward lunge on the swipe strike
  if (act && act.type === "swipe" && act.t >= SWIPE.wind) lunge = SWIPE.lunge * Math.sin(Math.PI * clamp((act.t - SWIPE.wind) / (SWIPE.strike + 0.08), 0, 1));
  else if (act && act.type === "swipe") lunge = -SWIPE.lunge * 0.4 * (act.t / SWIPE.wind);   // slight pull-back in the wind-up
  const hb = hasBreath();
  const app = playerAppearance();                 // growth + current form (205-player-look.js)
  let bodyScale = app.scale;                           // stomp: raise the foot (grow), then slam (squash)
  if (act && act.type === "stomp") bodyScale *= act.t < STOMP.windup ? 1 + 0.07 * (act.t / STOMP.windup) : 1 - 0.05 * Math.max(0, 1 - (act.t - STOMP.windup) / 0.15);
  if (act && act.type === "tailspin") drawTailSpin(P, act);
  const jumpLift = evadeLift(); if (jumpLift) drawJumpShadow(jumpLift);   // Jump: ground shadow, then the body is raised (166)
  drawKaiju(P.x + Math.cos(P.face) * lunge, P.y + Math.sin(P.face) * lunge, P.face, bodyScale, app.pal, P.walk, hurt, Math.max(breathGlow, act && act.type === "mega" ? 0.9 : 0),
    { victory: G.finalVictory ? victoryRoarPower() : 0, swipe: act && act.type === "swipe" ? act : null, clawLevel: swipeLevel(), charge: hb ? P.charge / 100 : 0, ready: hb && P.charge >= BREATH.minStart, t: G.t, turn: clamp(P.angVel / (MOVE.turnRate * MOVE.turnStillMul), -1, 1) * MOVE.leanMax, roar: G.finalVictory ? victoryRoarPose() : act && act.type === "roar" ? roarPose(act) : null });
  drawEvolveFx(P);
  if (jumpLift) ctx.restore();
  // facing marker (the kaiju turns slowly, so show where it points)
  ctx.fillStyle = "rgba(255,255,255,.25)";
  ctx.beginPath(); ctx.moveTo(P.x + Math.cos(P.face) * 92, P.y + Math.sin(P.face) * 92);
  ctx.lineTo(P.x + Math.cos(P.face + 0.14) * 78, P.y + Math.sin(P.face + 0.14) * 78);
  ctx.lineTo(P.x + Math.cos(P.face - 0.14) * 78, P.y + Math.sin(P.face - 0.14) * 78); ctx.fill();
  // beams (additive): layered outer glow, body, white core, with flicker
  ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
  if (breathing) {
    const mo = mouthOf(), sx = mo.x, sy = mo.y;
    const ex = P.x + Math.cos(P.face) * P.bl, ey = P.y + Math.sin(P.face) * P.bl;
    const fl = frozen ? 1 : 0.85 + Math.random() * 0.3, bw = P.bw;
    if (breathLevel() >= 6) { ctx.strokeStyle = "rgba(160,100,255,.2)"; ctx.lineWidth = bw * 2.8 * fl; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); }
    ctx.strokeStyle = "rgba(30,120,255,.18)"; ctx.lineWidth = bw * 1.9 * fl; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = "rgba(60,200,255,.4)"; ctx.lineWidth = bw * 1.15 * fl; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = "rgba(200,250,255,.7)"; ctx.lineWidth = bw * 0.6 * (frozen ? 1 : 0.9 + Math.random() * 0.2); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.lineWidth = bw * 0.28 * fl; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = "rgba(160,235,255,.4)"; ctx.beginPath(); ctx.arc(sx, sy, bw * 0.8 * fl, 0, TAU); ctx.fill();   // muzzle flare
    ctx.fillStyle = "rgba(120,220,255,.35)"; ctx.beginPath(); ctx.arc(ex, ey, bw * 0.9 * fl, 0, TAU); ctx.fill();  // end flare
  }
  drawHeavyBeam(act, frozen); drawBeamGlows(frozen);   // Mega Beam / Super Laser + afterglow (245)
  for (const f of G.flares) {                       // impact flares where the beam hits
    ctx.fillStyle = `rgba(255,220,150,${clamp(f.t / 0.18, 0, 1) * 0.7})`;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  for (const p of G.parts) {
    ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  for (const q of G.xpLabels) {                      // subtle merged +XP labels
    ctx.globalAlpha = clamp(q.t / 0.4, 0, 0.85); txt("+" + Math.round(q.v), q.x, q.y - 14, 12, "#d6f0cf", "center");
  }
  ctx.globalAlpha = 1;
  for (const n of G.nums) {                          // floating damage numbers
    ctx.globalAlpha = clamp(n.t / 0.3, 0, 1);
    txt(String(n.v), n.x, n.y, 15, n.color, "center");
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function bar(x, y, w, h, frac, fill, back) {
  ctx.fillStyle = back || "rgba(0,0,0,.55)"; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill; ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
  ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w, h);
}

