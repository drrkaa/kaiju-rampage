// [js-split] ===== js/220-draw-bosses.js: Boss sprites: bossPose, drawBoss (Ragehorn, Voltgaze, Omega Tyrant) =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// ---- BOSS SPRITES: detailed procedural kaiju, drawn per frame (bosses are single entities). Distinct silhouettes:
// Ragehorn = bulky horned brute, Voltgaze = slim finned lightning drake, Omega Tyrant = golden three-headed winged dragon (218).
function bossPose(e) {
  const o = { rear: 0, raise: 0, mouth: 0, glow: 0, tired: !!e.tired }, sm = k => k * k * (3 - 2 * k);
  if (e.mode === "attack") {
    const a = e.atk, t = e.at;
    if (a === "charge" || a === "dcharge") o.rear = e.charging ? -0.5 : clamp(t / (e.w0 || 0.85), 0, 1);       // rears back, then lunges
    else if (a === "fan" || a === "volley" || a === "spiral" || a === "burst" || a === "beam") { o.glow = clamp(t / (a === "beam" ? 1.0 : 0.7), 0, 1); o.mouth = o.glow; }   // mouth glow before ranged attacks
    else if (a === "slam" || a === "rubble" || a === "leap" || a === "rain" || a === "summon") o.raise = sm(clamp(t / 0.8, 0, 1));                           // arms raised
    else if (a === "spin") o.raise = 1;
  } else if (e.mode === "phase") { o.glow = 1; o.mouth = 1; o.raise = 1; }
  if (e.mode === "idle" || e.mode === "recover") o.mouth = Math.max(o.mouth, 0.08);
  return o;
}
function drawBoss(e, flash) {
  const def = e.def, st = def.style, o = bossPose(e), s = e.r / 30, ph = e.phase || 1, maxPh = def.phaseAt.length + 1;
  const sw = Math.sin(e.walkA || 0), bob = Math.sin(e.t * 2.2) * 0.9, t = e.t;
  const body = flash ? "#ffffff" : def.body, belly = flash ? "#ffffff" : def.belly, spine = def.spine, bone = flash ? "#ffffff" : "#e8e0c8";
  const fs = fill => { ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
  ctx.save(); ctx.translate(e.x, e.y - (e.lift || 0)); ctx.rotate(e.spinOn ? e.spinA : e.ang); ctx.scale(s, s);
  ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = "#0b0b10"; ctx.lineWidth = 2.4 / s;
  if (o.rear) ctx.translate(-6 * o.rear, 0);
  if (o.tired) { ctx.translate(-3, 0); ctx.scale(1, 0.94); }
  ctx.translate(0, bob * 0.4);
  const armSpread = 1 + 0.35 * o.raise;
  if (st === "dragon") {
    drawDragonBoss(e, o, flash, s);
  } else if (st === "horned") {
    if (ph >= 2) { ctx.fillStyle = "rgba(255,80,30,.12)"; ctx.beginPath(); ctx.arc(0, 0, 66 + 4 * Math.sin(t * 6), 0, TAU); ctx.fill(); }        // heat aura
    // tail with a spiked club
    ctx.beginPath(); ctx.moveTo(-26, -9); ctx.quadraticCurveTo(-58, sw * 14 - 8, -86, sw * -16 - 6); ctx.lineTo(-86, sw * -16 + 6); ctx.quadraticCurveTo(-58, sw * 14 + 8, -26, 9); ctx.closePath(); fs(body);
    ctx.beginPath(); ctx.arc(-92, sw * -16, 11, 0, TAU); fs(bone);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.beginPath(); ctx.moveTo(-92 + Math.cos(a) * 9, sw * -16 + Math.sin(a) * 9); ctx.lineTo(-92 + Math.cos(a) * 17, sw * -16 + Math.sin(a) * 17); ctx.lineTo(-92 + Math.cos(a + 0.4) * 9, sw * -16 + Math.sin(a + 0.4) * 9); fs(spine); }
    // legs
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(-8 + sw * 9 * sd, sd * 30, 15, 9, 0, 0, TAU); fs(body); }
    // body + belly + armour plates
    ctx.beginPath(); ctx.ellipse(0, 0, 42, 32, 0, 0, TAU); fs(body);
    ctx.beginPath(); ctx.ellipse(6, 0, 24, 15, 0, 0, TAU); fs(belly);
    for (let i = 0; i < 4 + ph; i++) { const x = -30 + i * 11; ctx.beginPath(); ctx.moveTo(x, -9); ctx.lineTo(x + 6, 0); ctx.lineTo(x, 9); ctx.lineTo(x - 8, 0); ctx.closePath(); fs(bone); }
    if (ph >= 2) { ctx.strokeStyle = "#ffb03a"; ctx.lineWidth = 2.2 / s; ctx.beginPath(); ctx.moveTo(-26, -16); ctx.lineTo(-14, -6); ctx.lineTo(-22, 6); ctx.moveTo(10, 20); ctx.lineTo(20, 10); ctx.lineTo(8, 2); ctx.stroke(); ctx.strokeStyle = "#0b0b10"; ctx.lineWidth = 2.4 / s; }
    // arms + claws (spread when raised)
    for (const sd of [-1, 1]) {
      const ax = 22 + 8 * o.raise, ay = sd * 34 * armSpread;
      ctx.beginPath(); ctx.ellipse(ax, ay, 15, 8, sd * -0.4, 0, TAU); fs(body);
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(ax + 12, ay + k * 4); ctx.lineTo(ax + 25, ay + k * 6); ctx.lineTo(ax + 12, ay + k * 4 + 3); fs(bone); }
      ctx.beginPath(); ctx.moveTo(10, sd * 32); ctx.lineTo(18, sd * (44 + 4 * ph)); ctx.lineTo(24, sd * 30); fs(bone);                          // shoulder spike
    }
    // Broad armored cranium, forward-swept horns and a blunt crushing muzzle.
    ctx.save(); ctx.translate(46 + (o.rear < 0 ? 4 : 0), 0);
    for (const sd of [-1, 1]) {
      ctx.beginPath();ctx.moveTo(-14,sd*12);ctx.quadraticCurveTo(-12,sd*29,8,sd*33);
      ctx.quadraticCurveTo(23,sd*34,32,sd*(25+2*ph));
      ctx.quadraticCurveTo(10,sd*27,4,sd*17);ctx.lineTo(-3,sd*10);ctx.closePath();fs(bone);
      ctx.strokeStyle="rgba(83,58,33,.45)";ctx.lineWidth=1/s;
      ctx.beginPath();ctx.moveTo(-7,sd*18);ctx.lineTo(-5,sd*25);ctx.moveTo(0,sd*23);ctx.lineTo(3,sd*29);ctx.stroke();
      ctx.strokeStyle="#0b0b10";ctx.lineWidth=2.4/s;
    }
    const gape=o.mouth,tip=27+4*gape;
    // The lower jaw projects beyond the snout when roaring, visible from above.
    ctx.beginPath();ctx.moveTo(3,-11);ctx.lineTo(20,-12-3*gape);ctx.lineTo(tip,-8-3*gape);
    ctx.lineTo(tip+2,0);ctx.lineTo(tip,8+3*gape);ctx.lineTo(20,12+3*gape);ctx.lineTo(3,11);ctx.closePath();fs(body);
    ctx.beginPath();ctx.moveTo(-22,-10);ctx.lineTo(-15,-19);ctx.lineTo(-1,-20);ctx.lineTo(11,-14);
    ctx.lineTo(23,-8);ctx.lineTo(25,0);ctx.lineTo(23,8);ctx.lineTo(11,14);ctx.lineTo(-1,20);ctx.lineTo(-15,19);ctx.lineTo(-22,10);ctx.closePath();fs(body);
    // Interlocking pale skull plates carry the same armor as the back.
    ctx.beginPath();ctx.moveTo(-18,0);ctx.lineTo(-11,-12);ctx.lineTo(0,-10);ctx.lineTo(12,0);
    ctx.lineTo(0,10);ctx.lineTo(-11,12);ctx.closePath();fs(bone);
    ctx.beginPath();ctx.moveTo(-13,0);ctx.lineTo(-7,-6);ctx.lineTo(2,0);ctx.lineTo(-7,6);ctx.closePath();fs(belly);
    for(const sd of [-1,1]){
      // Recessed eyes sit behind thick, sloping brow armor.
      ctx.beginPath();ctx.moveTo(-3,sd*13);ctx.lineTo(9,sd*8);ctx.lineTo(15,sd*11);
      ctx.lineTo(4,sd*17);ctx.closePath();fs("#331b14");
      ctx.fillStyle=ph>=2?"#fff1b0":"#ffe34a";
      ctx.beginPath();ctx.moveTo(1,sd*13);ctx.lineTo(10,sd*10);ctx.lineTo(8,sd*13);ctx.lineTo(2,sd*15);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(-8,sd*16);ctx.lineTo(-1,sd*10);ctx.lineTo(11,sd*6);
      ctx.lineTo(10,sd*9);ctx.lineTo(0,sd*14);ctx.closePath();fs(bone);
      ctx.beginPath();ctx.moveTo(-12,sd*17);ctx.lineTo(-3,sd*22);ctx.lineTo(8,sd*15);ctx.closePath();fs(body);
    }
    // Short, broad muzzle: nostrils and a curved mouth rim, rather than two round lobes.
    ctx.beginPath();ctx.moveTo(11,-6);ctx.lineTo(21,-7);ctx.lineTo(26,-4);ctx.lineTo(26,4);
    ctx.lineTo(21,7);ctx.lineTo(11,6);ctx.closePath();fs(belly);
    ctx.beginPath();ctx.moveTo(13,-7);ctx.quadraticCurveTo(20,-5,26,-3);
    ctx.lineTo(tip, -5-4*gape);ctx.quadraticCurveTo(tip+4,0,tip,5+4*gape);
    ctx.lineTo(26,3);ctx.quadraticCurveTo(20,5,13,7);ctx.lineTo(20,0);ctx.closePath();fs("#351b17");
    // The nose overlaps the rear of the mouth, keeping a solid armored muzzle.
    ctx.beginPath();ctx.moveTo(10,-5);ctx.lineTo(21,-4);ctx.lineTo(24,0);ctx.lineTo(21,4);
    ctx.lineTo(10,5);ctx.lineTo(14,0);ctx.closePath();fs(belly);
    ctx.fillStyle="#3b2118";
    for(const sd of [-1,1]){ctx.beginPath();ctx.ellipse(20,sd*2.4,1.7,1,sd*-.3,0,TAU);ctx.fill();}
    if(gape>.15){ctx.fillStyle="#9a5140";ctx.beginPath();ctx.ellipse(tip-2,0,3,2.8*gape,0,0,TAU);ctx.fill();}
    ctx.fillStyle=bone;
    for(const sd of [-1,1])for(let k=0;k<3;k++){
      const x=18+k*4,y=sd*(5+k*.15+gape*2);
      ctx.beginPath();ctx.moveTo(x-2,y);ctx.lineTo(x+1,y-sd*(k===0?4:2.7));ctx.lineTo(x+2,y+sd*.6);ctx.closePath();ctx.fill();
    }
    ctx.restore();
  } else if (st === "spitter") {
    // long tail with glowing orb
    ctx.beginPath(); ctx.moveTo(-22, -7); ctx.quadraticCurveTo(-60, sw * 14, -100, sw * -18); ctx.lineTo(-100, sw * -18 + 3); ctx.quadraticCurveTo(-60, sw * 14 + 6, -22, 7); ctx.closePath(); fs(body);
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(95,240,255,.5)"; ctx.beginPath(); ctx.arc(-103, sw * -18, 10, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = "source-over";
    ctx.beginPath(); ctx.arc(-103, sw * -18, 5, 0, TAU); fs(spine);
    // thin legs
    for (const sd of [-1, 1]) for (const lx of [-14, 12]) { ctx.beginPath(); ctx.ellipse(lx + sw * 8 * sd * (lx < 0 ? 1 : -1), sd * 24, 11, 5, 0, 0, TAU); fs(body); }
    // slim body, belly
    ctx.beginPath(); ctx.ellipse(0, 0, 38, 20, 0, 0, TAU); fs(body);
    ctx.beginPath(); ctx.ellipse(4, 0, 24, 10, 0, 0, TAU); fs(belly);
    // dorsal fins (more in later phases), glowing edges
    const nf = 4 + ph;
    for (let i = 0; i < nf; i++) { const x = -30 + i * (60 / nf) * 1.15; ctx.beginPath(); ctx.moveTo(x - 7, -3); ctx.lineTo(x + 2, -22 - 3 * ph - (i % 2) * 5); ctx.lineTo(x + 7, 3); ctx.closePath(); fs(spine); ctx.beginPath(); ctx.moveTo(x - 7, 3); ctx.lineTo(x + 2, 22 + 3 * ph + (i % 2) * 5); ctx.lineTo(x + 7, -3); ctx.closePath(); fs(spine); }
    // arms
    for (const sd of [-1, 1]) { const ay = sd * 22 * armSpread; ctx.beginPath(); ctx.ellipse(20 + 6 * o.raise, ay, 12, 5, sd * -0.5, 0, TAU); fs(body); for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(30 + 6 * o.raise, ay + k * 3); ctx.lineTo(40 + 6 * o.raise, ay + k * 5); ctx.lineTo(30 + 6 * o.raise, ay + k * 3 + 2); fs(bone); } }
    // frill fan behind the head
    ctx.save(); ctx.translate(36, 0);
    ctx.beginPath(); ctx.moveTo(0, 0); for (let i = 0; i <= 10; i++) { const a = Math.PI - 1.15 + (i / 10) * 2.3, r = 26 + (i % 2 ? 5 : 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); fs(flash ? "#fff" : "#3aa7d6");
    ctx.beginPath(); ctx.moveTo(0, 0); for (let i = 0; i <= 10; i++) { const a = Math.PI - 1.0 + (i / 10) * 2.0, r = 17 + (i % 2 ? 3 : 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fillStyle = "rgba(180,250,255,.7)"; ctx.fill();
    ctx.restore();
    // head: wedge snout, jaw, glowing eyes and cheek pouches
    ctx.save(); ctx.translate(48, 0);
    ctx.beginPath(); ctx.moveTo(-12, -13); ctx.lineTo(24, -5 - 7 * o.mouth); ctx.lineTo(24, 5 + 7 * o.mouth); ctx.lineTo(-12, 13); ctx.closePath(); fs(body);
    if (o.mouth > 0.15) { ctx.fillStyle = "#12303f"; ctx.beginPath(); ctx.moveTo(4, -3 - 5 * o.mouth); ctx.lineTo(24, -4 - 7 * o.mouth); ctx.lineTo(24, 4 + 7 * o.mouth); ctx.lineTo(4, 3 + 5 * o.mouth); ctx.fill(); }
    ctx.fillStyle = "#c6fbff"; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(2, sd * 8, 3, 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(95,240,255,${0.25 + 0.45 * o.glow})`; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(-2, sd * 12, 6 + 3 * o.glow, 0, TAU); ctx.fill(); }   // cheek pouches
    if (o.glow > 0) { ctx.fillStyle = `rgba(180,255,255,${0.8 * o.glow})`; ctx.beginPath(); ctx.arc(26, 0, 4 + 12 * o.glow, 0, TAU); ctx.fill(); }                       // charging orb in the mouth
    ctx.globalCompositeOperation = "source-over"; ctx.restore();
    // crackling arcs (stronger in later phases / while charging)
    if (o.glow > 0 || ph >= 2) {
      ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = `rgba(150,245,255,${0.35 + 0.2 * ph})`; ctx.lineWidth = 1.6 / s;
      for (let k = 0; k < 2 + ph; k++) { const a = Math.random() * TAU; ctx.beginPath(); let x = Math.cos(a) * 24, y = Math.sin(a) * 18; ctx.moveTo(x, y); for (let q = 0; q < 4; q++) { x += Math.cos(a) * 7 + rnd(-5, 5); y += Math.sin(a) * 7 + rnd(-5, 5); ctx.lineTo(x, y); } ctx.stroke(); }
      ctx.globalCompositeOperation = "source-over"; ctx.strokeStyle = "#0b0b10"; ctx.lineWidth = 2.4 / s;
    }
  } else {   // tyrant
    if (ph >= 3) { ctx.fillStyle = `rgba(255,50,20,${0.14 + 0.06 * Math.sin(t * 7)})`; ctx.beginPath(); ctx.arc(0, 0, 76, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(255,120,40,.09)"; ctx.beginPath(); ctx.arc(0, 0, 90, 0, TAU); ctx.fill(); }
    // tail with a blade tip
    ctx.beginPath(); ctx.moveTo(-28, -11); ctx.quadraticCurveTo(-64, sw * 12 - 10, -96, sw * -14); ctx.quadraticCurveTo(-64, sw * 12 + 10, -28, 11); ctx.closePath(); fs(body);
    ctx.beginPath(); ctx.moveTo(-94, sw * -14 - 10); ctx.lineTo(-122, sw * -14); ctx.lineTo(-94, sw * -14 + 10); ctx.closePath(); fs("#8d8794");
    for (let i = 0; i < 4; i++) { const x = -40 - i * 14; ctx.beginPath(); ctx.moveTo(x, -7 + sw * i); ctx.lineTo(x - 5, -17 + sw * i * 1.4); ctx.lineTo(x - 11, -6 + sw * i); fs(spine); }
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(-8 + sw * 10 * sd, sd * 33, 17, 10, 0, 0, TAU); fs(body); }
    ctx.beginPath(); ctx.ellipse(0, 0, 46, 35, 0, 0, TAU); fs(body);
    ctx.beginPath(); ctx.ellipse(8, 0, 25, 15, 0, 0, TAU); fs(belly);
    // armour plates: two spike rows, more spikes per phase
    for (let i = 0; i < 5 + ph; i++) { const x = -32 + i * 10; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x - 5, sd * 6); ctx.lineTo(x, sd * (17 + ph * 3)); ctx.lineTo(x + 6, sd * 6); ctx.closePath(); fs(i % 2 ? "#59495a" : "#6d5a6b"); } }
    // glowing seams (phase 2+) and cracks
    if (ph >= 2) { ctx.strokeStyle = `rgba(255,${120 + 40 * Math.sin(t * 5)},40,1)`; ctx.lineWidth = 2.6 / s; ctx.beginPath(); ctx.moveTo(-34, -20); ctx.lineTo(-18, -8); ctx.lineTo(-30, 8); ctx.lineTo(-16, 22); ctx.moveTo(14, -24); ctx.lineTo(24, -10); ctx.lineTo(10, 2); ctx.stroke(); ctx.strokeStyle = "#0b0b10"; ctx.lineWidth = 2.4 / s; }
    // arms with big claws and pauldron spikes
    for (const sd of [-1, 1]) {
      const ax = 24 + 8 * o.raise, ay = sd * 38 * armSpread;
      ctx.beginPath(); ctx.ellipse(ax, ay, 17, 9, sd * -0.4, 0, TAU); fs(body);
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(ax + 14, ay + k * 5); ctx.lineTo(ax + 30, ay + k * 7); ctx.lineTo(ax + 14, ay + k * 5 + 4); fs("#d9d2c0"); }
      for (let k = 0; k < 2 + ph; k++) { ctx.beginPath(); ctx.moveTo(8 + k * 7, sd * 34); ctx.lineTo(14 + k * 7, sd * (50 + 3 * ph)); ctx.lineTo(20 + k * 7, sd * 33); fs(spine); }
    }
    // head: crown of horns, heavy jaw with teeth, burning eyes
    ctx.save(); ctx.translate(50 + (o.rear < 0 ? 4 : 0), 0);
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(-8, k * 6); ctx.quadraticCurveTo(6, k * 12, 18 + Math.abs(k) * -2, k * 15); ctx.lineTo(0, k * 6 + 3); ctx.closePath(); fs(k === 0 ? "#d9d2c0" : "#8d8794"); }
    ctx.beginPath(); ctx.ellipse(0, 0, 24, 19, 0, 0, TAU); fs(body);
    const jaw = 4 + 10 * o.mouth;
    ctx.beginPath(); ctx.ellipse(10, jaw, 16, 8, 0, 0, TAU); fs("#2a0d10"); ctx.beginPath(); ctx.ellipse(10, -jaw, 16, 8, 0, 0, TAU); fs("#2a0d10");
    if (o.mouth > 0.12) { ctx.fillStyle = "#f2efe6"; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(8 + k * 5, -jaw + 3); ctx.lineTo(11 + k * 5, -jaw + 10); ctx.lineTo(5 + k * 5, -jaw + 3); ctx.fill(); ctx.beginPath(); ctx.moveTo(8 + k * 5, jaw - 3); ctx.lineTo(11 + k * 5, jaw - 10); ctx.lineTo(5 + k * 5, jaw - 3); ctx.fill(); } }
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = `rgba(255,${90 + 60 * o.glow},30,${0.55 + 0.4 * o.glow})`; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(10, sd * 9, 5 + 2 * o.glow, 0, TAU); ctx.fill(); }
    if (o.glow > 0) { ctx.fillStyle = `rgba(255,150,50,${0.7 * o.glow})`; ctx.beginPath(); ctx.arc(26, 0, 4 + 12 * o.glow, 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#fff"; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(10, sd * 9, 1.8, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  if (o.tired) {                                       // dizzy stars circling the head
    ctx.fillStyle = "#ffe27a";
    for (let k = 0; k < 3; k++) { const a = t * 4 + k * 2.1; ctx.beginPath(); const px = 44 + Math.cos(a) * 16, py = Math.sin(a) * 10 - 22; ctx.moveTo(px, py - 4); ctx.lineTo(px + 1.5, py - 1); ctx.lineTo(px + 4, py); ctx.lineTo(px + 1.5, py + 1.5); ctx.lineTo(px, py + 4); ctx.lineTo(px - 1.5, py + 1.5); ctx.lineTo(px - 4, py); ctx.lineTo(px - 1.5, py - 1); ctx.closePath(); ctx.fill(); }
  }
  ctx.restore();
}

