// [js-split] ===== js/230-draw-entities-fx.js: drawEnemy, drawHazard, roarPose, drawTailSpin =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
function drawEnemy(e) {
  const f = e.flash > 0;
  if (e.burnT > 0) { ctx.strokeStyle = `rgba(255,${120 + (paused || state !== "play" ? 40 : Math.floor(Math.random() * 80))},40,.8)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, enemyVisR(e) + 3, 0, TAU); ctx.stroke(); }
  if (e.trail > 0 && !e.def) {                    // knockback streak
    ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.6, e.trail)})`; ctx.lineWidth = Math.max(2, e.r * 0.6); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x - e.kx * 0.06, e.y - e.ky * 0.06); ctx.stroke();
  }
  if (e.def) { drawBoss(e, f || (e.inv && Math.floor(e.t * 10) % 2 === 0)); return; }
  const rr = enemyVisR(e);
  if (ENEMY_AIDS.warnRing && (e.type === "tank" || e.type === "heli") && e.cd < 0.5 && !(e.stun > 0)) {     // about to shoot
    ctx.strokeStyle = `rgba(255,70,50,${0.45 + 0.35 * Math.sin(e.t * 20)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, rr + 5, 0, TAU); ctx.stroke();
  }
  if (e.stun > 0) { ctx.strokeStyle = "#ff0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y - rr - 4, 4, e.t * 8, e.t * 8 + 4); ctx.stroke(); }
  const sp = enemySprite(e.type, e.ang, Math.floor(e.t * (e.type === "soldier" ? 7 : 5)) % 2);
  ctx.drawImage(sp.c, e.x - sp.size / 2, e.y - sp.size / 2, sp.size, sp.size);
  if (e.type === "heli") {                         // rotor blur disc + blades above the body
    const ra = e.t * 25, R = 24 * ENEMY_SCALE;
    ctx.fillStyle = "rgba(255,255,255,.2)"; ctx.beginPath(); ctx.arc(e.x, e.y, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = ENEMY_OUTLINE.color; ctx.lineWidth = 3.2; ctx.beginPath();
    ctx.moveTo(e.x - Math.cos(ra) * R, e.y - Math.sin(ra) * R); ctx.lineTo(e.x + Math.cos(ra) * R, e.y + Math.sin(ra) * R);
    ctx.moveTo(e.x - Math.sin(ra) * R, e.y + Math.cos(ra) * R); ctx.lineTo(e.x + Math.sin(ra) * R, e.y - Math.cos(ra) * R); ctx.stroke();
    ctx.strokeStyle = "rgba(235,245,255,.9)"; ctx.lineWidth = 1.6; ctx.stroke();
  }
  if (f) { ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.beginPath(); ctx.arc(e.x, e.y, rr * (e.type === "tank" ? 1.25 : 1), 0, TAU); ctx.fill(); }   // white hit flash
  if (ENEMY_AIDS.hpBar && e.type !== "soldier" && e.hp < e.maxHp) {              // small HP bar only when damaged
    const w = 24, y = e.y - rr - 10;
    ctx.fillStyle = "rgba(0,0,0,.7)"; ctx.fillRect(e.x - w / 2 - 1, y - 1, w + 2, 5);
    ctx.fillStyle = "#ff5a3c"; ctx.fillRect(e.x - w / 2, y, w * clamp(e.hp / e.maxHp, 0, 1), 3);
  }
}

function drawHazard(h) {
  const warning = h.warn > 0;
  if (h.electric && !warning) {
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.ang);
    ctx.lineJoin = "miter"; ctx.miterLimit = 2; ctx.lineCap = "butt";
    // Irregular hard corners, stable between flashes; drawing never consumes combat RNG.
    const tick = Math.floor(G.t * 28), count = Math.max(4, Math.ceil(h.len / 18));
    const noise = i => { const v = Math.sin(i * 127.1 + tick * 311.7 + h.ang * 53.3) * 43758.5453; return v - Math.floor(v); };
    const points = [{ x: 0, y: 0 }];
    for (let i = 1; i < count; i++) points.push({
      x: h.len * (i + (noise(i) - .5) * .65) / count,
      y: (i % 2 ? -1 : 1) * h.w * (.16 + noise(i + 100) * .29)
    });
    points.push({ x: h.len, y: 0 });
    for (const [width, col] of [[14, "rgba(40,130,255,.18)"], [4.5, "#42c8ff"], [1.4, "#f1ffff"]]) {
      ctx.strokeStyle = col; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(0, 0);
      for (const p of points) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    // Thin forked streamers break up the main bolt without adding damaging lanes.
    for (let i = 4; i < points.length - 3; i += 6) {
      const p = points[i], side = p.y < 0 ? -1 : 1, length = 20 + noise(i + 200) * 26;
      for (const [width, col] of [[2, "rgba(70,195,255,.8)"], [.65, "rgba(225,255,255,.9)"]]) {
        ctx.strokeStyle = col; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + length * .35, p.y + side * 7);
        ctx.lineTo(p.x + length * .23, p.y + side * 12);
        ctx.lineTo(p.x + length, p.y + side * 18); ctx.stroke();
      }
    }
    ctx.strokeStyle = "#dfffff"; ctx.lineWidth = 1.2;
    for (const x of [0, h.len]) {
      ctx.beginPath(); ctx.moveTo(x - 7, -5); ctx.lineTo(x + 7, 5);
      ctx.moveTo(x - 4, 8); ctx.lineTo(x + 4, -8); ctx.stroke();
    }
    ctx.restore(); return;
  }
  const p = warning ? 1 - h.warn / h.warn0 : 1;
  if (!warning && h.harmless) return;
  ctx.fillStyle = warning ? `rgba(255,40,40,${0.12 + 0.3 * p})` : "rgba(255,170,60,0.65)";
  ctx.strokeStyle = warning ? "rgba(255,80,80,.9)" : "rgba(255,230,150,.95)"; ctx.lineWidth = 2;
  if (h.rock && warning) {                          // thrown building chunk arcing toward the marked zone
    const k = clamp(p, 0, 1), rx = lerp(h.rock.x0, h.x, k), ry = lerp(h.rock.y0, h.y, k) - Math.sin(Math.PI * k) * 90;
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(lerp(h.rock.x0, h.x, k), lerp(h.rock.y0, h.y, k), 9, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#7d756b"; ctx.strokeStyle = "#1c1814"; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + k * 8, rr = 9 + 3 * Math.sin(i * 2.3); i ? ctx.lineTo(rx + Math.cos(a) * rr, ry + Math.sin(a) * rr) : ctx.moveTo(rx + Math.cos(a) * rr, ry + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = warning ? `rgba(255,40,40,${0.12 + 0.3 * p})` : ""; ctx.strokeStyle = "rgba(255,80,80,.9)";
  }
  if (h.spin && !warning) {
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(255,220,160,${0.65 - i * 0.09})`; ctx.lineWidth = 9 - i;
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r * (0.5 + i * 0.12), G.t * 14 + i, G.t * 14 + i + 2.4); ctx.stroke();
    }
  }
  if (h.kind === "circle") {
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill(); ctx.stroke();
    if (warning) { ctx.beginPath(); ctx.arc(h.x, h.y, h.r * p, 0, TAU); ctx.stroke(); }  // closing-in fuse ring
  } else if (h.kind === "line") {
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.ang);
    ctx.fillRect(0, -h.w / 2, h.len, h.w); ctx.strokeRect(0, -h.w / 2, h.len, h.w);
    ctx.restore();
  } else if (h.kind === "sector") {
    ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.arc(h.x, h.y, h.len, h.ang - h.arc / 2, h.ang + h.arc / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

// Smooth roar pose: inhale (ease-in lean/swell, mouth starts opening) -> hold -> burst (head snaps forward) -> recover.
function roarPose(a) {
  const T = a.t, W0 = ROAR.wind, I = ROAR.inhale, S = ROAR.snap, ease = k => k * k * (3 - 2 * k);
  if (T < I) { const k = T / I, e = k * k; return { lean: e, swell: e, headX: -6 * e, mouth: 0.4 * ease(clamp((k - 0.5) / 0.5, 0, 1)) }; }
  if (T < W0) { const k = ease((T - I) / (W0 - I)); return { lean: 1, swell: 1, headX: -6, mouth: lerp(0.4, 1, k) }; }
  const k = clamp((T - W0) / S, 0, 1), snap = 1 - (1 - k) * (1 - k);
  const r = ease(clamp((T - W0 - S) / Math.max(0.01, ROAR.dur - W0 - S), 0, 1));
  return { lean: 1 - ease(clamp((T - W0) / 0.25, 0, 1)), swell: 1 - ease(clamp((T - W0) / 0.3, 0, 1)), headX: lerp(-6, 5, snap) * (1 - r), mouth: 1 - r };
}
// Whirlwind tail: long tapered tail along the real hit segment, motion-blur arcs trailing the tip, a bright sweet-spot glint.
function drawTailSpin(P, act) {
  const ang = tailAngle(P.face), k = Math.min(clamp(act.t / 0.15, 0, 1), clamp((act.dur - act.t) / 0.2, 0, 1));
  const reach = TAILSPIN.baseR + (TAILSPIN.reach - TAILSPIN.baseR) * k;
  ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "butt";
  for (const [rf, aw, trail] of [[0.93, 1, 1.5], [0.62, 0.5, 1.0]]) {
    for (let i = 0; i < 10; i++) {
      const t0 = i / 10, t1 = (i + 1) / 10;
      ctx.strokeStyle = `rgba(255,236,190,${t1 * 0.5 * aw * k})`; ctx.lineWidth = (3 + 11 * t1) * aw;
      ctx.beginPath(); ctx.arc(P.x, P.y, reach * rf, ang - trail * (1 - t0), ang - trail * (1 - t1)); ctx.stroke();
    }
  }
  ctx.strokeStyle = `rgba(255,255,255,${0.9 * k})`; ctx.lineWidth = 7;                       // small tip bonus glint (the entire tail deals strong damage)
  ctx.beginPath(); ctx.arc(P.x, P.y, reach, ang - 0.16, ang); ctx.stroke();
  ctx.strokeStyle = `rgba(220,230,240,${0.3 * k})`; ctx.lineWidth = 2;                       // wind streaks
  for (let i = 0; i < 3; i++) { const o = act.t * 7 + i * 2.1; ctx.beginPath(); ctx.arc(P.x, P.y, reach * 1.05 + i * 6, o, o + 0.6); ctx.stroke(); }
  ctx.globalCompositeOperation = "source-over"; ctx.lineCap = "round";
  const c = Math.cos(ang), s2 = Math.sin(ang), bx = P.x + c * TAILSPIN.baseR, by = P.y + s2 * TAILSPIN.baseR, tx = P.x + c * reach, ty = P.y + s2 * reach;
  const cx = P.x + Math.cos(ang - 0.3) * reach * 0.55, cy = P.y + Math.sin(ang - 0.3) * reach * 0.55;   // slight lag curve
  const pp = playerAppearance().pal;
  for (const [w, col] of [[24, "#10161a"], [18, pp.body], [8, pp.belly]]) {
    ctx.strokeStyle = col; ctx.lineWidth = w * (0.6 + 0.4 * k); ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(cx, cy, tx, ty); ctx.stroke();
  }
  ctx.fillStyle = pp.spine;                                                           // tail spikes along the tail
  for (let i = 1; i <= 4; i++) { const r = TAILSPIN.baseR + (reach - TAILSPIN.baseR) * i / 5, a2 = ang - 0.3 * (1 - i / 5) * 0.8; ctx.beginPath(); ctx.moveTo(P.x + Math.cos(a2) * r, P.y + Math.sin(a2) * r); ctx.lineTo(P.x + Math.cos(a2 + 0.12) * (r + 8), P.y + Math.sin(a2 + 0.12) * (r + 8)); ctx.lineTo(P.x + Math.cos(a2 - 0.12) * (r + 8), P.y + Math.sin(a2 - 0.12) * (r + 8)); ctx.fill(); }
}

// Final Claws: three sharp, tapered pressure cuts instead of a single glowing hoop.
// Local Y follows the existing wave hit segment; its width/damage/travel are unchanged.
function drawClawWave(c) {
  const fade=clamp(c.life/c.max,0,1),age=c.max-c.life,dir=c.dir||1;
  ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.ang);
  for(let lane=0;lane<3;lane++){
    const span=c.hw*(1-lane*.09),offset=8-lane*13;
    const ribbon=(width,color)=>{
      ctx.fillStyle=color;ctx.beginPath();
      for(const side of [-1,1])for(let i=0;i<=24;i++){
        const t=side<0?-1+i/12:1-i/12, taper=Math.pow(Math.max(0,1-t*t),.7);
        const x=offset+14*(1-t*t)+dir*t*9+side*width*taper,y=t*span;
        if(side<0&&i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.closePath();ctx.fill();
    };
    ribbon(6,`rgba(255,166,65,${.15*fade})`);
    ribbon(2.8,`rgba(255,215,145,${.72*fade})`);
    ribbon(.85,`rgba(255,250,225,${.92*fade})`);
  }
  // Short trailing flecks fall away from the cutting edge, stable while paused.
  for(let i=0;i<7;i++){
    const t=(i/6-.5)*1.6,travel=(age*90+i*17)%42;
    ctx.strokeStyle=`rgba(255,207,130,${.38*fade*(1-travel/42)})`;ctx.lineWidth=1.2;
    const x=-22-travel+Math.sin(i*2.3)*6,y=t*c.hw;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-7,y-dir*2);ctx.stroke();
  }
  ctx.restore();
}
