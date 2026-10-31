"use strict";
// A top-down back view: raised shoulder mass occludes the hips and feet.
// Sprite coordinates still face +x; the mouth stays at x=50 for beam/roar origins.
function drawPlayerModel(pal, walk, flash, glow, fx) {
  const ft = pal.feat || {}, sw = Math.sin(walk), time = fx && fx.t || 0;
  const body = flash ? "#fff" : pal.body, armor = flash ? "#fff" : pal.plate || pal.body;
  const turn = fx && fx.turn || 0, tl = ft.tail || 1;
  const spike = chargedSpikeColor(pal.spine, fx && fx.charge || 0);
  const tailY = sw * -12 + turn * -16;
  if (ft.halo) {
    ctx.fillStyle = `rgba(255,90,40,${.06 + .025 * Math.sin(time * 3)})`;
    ctx.beginPath(); ctx.ellipse(-5, 0, 63, 52, 0, 0, TAU); ctx.fill();
  }
  // Continuous taper, with a gentle resting curve rather than a cylindrical tail.
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-18, -13);
  ctx.bezierCurveTo(-48 * tl, -11, -70 * tl, tailY - 6, -83 * tl, tailY - 20);
  ctx.quadraticCurveTo(-89 * tl, tailY - 29, -94 * tl, tailY - 30);
  ctx.quadraticCurveTo(-98 * tl, tailY - 29, -93 * tl, tailY - 24);
  ctx.bezierCurveTo(-80 * tl, tailY - 10, -70 * tl, 14, -18, 13); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-28, 0);
  ctx.bezierCurveTo(-66 * tl, 7, -73 * tl, tailY - 9, -94 * tl, tailY - 28); ctx.stroke();
  if (ft.tailBlade) {
    ctx.fillStyle = spike; ctx.beginPath(); ctx.moveTo(-86 * tl, tailY - 23);
    ctx.lineTo(-103 * tl, tailY - 36); ctx.lineTo(-92 * tl, tailY - 18); ctx.closePath(); ctx.fill();
  }
  // Only the low, dark outer edges of the thighs and feet emerge from beneath the back.
  for (const side of [-1, 1]) {
    const step = sw * side * 5;
    ctx.save(); ctx.scale(1, side);
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(-15 + step * .4, 20, 16, 10, -.2, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(-15 + step * .4, 22, 15, 9, -.2, 0, TAU); ctx.fill();
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(-5 + step, 25, 12, 5.5, -.05, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(-5 + step, 25, 12, 5.5, -.05, 0, TAU); ctx.fill();
    ctx.fillStyle = "#c9c7ae";
    for (let i = 0; i < 3; i++) {
      const y = 22 + i * 2.4, x = 3 + step - Math.abs(i - 1);
      ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 1); ctx.fill();
    }
    ctx.restore();
  }
  // Shield-shaped back: broad at the shoulders, narrowing into the tail root.
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(26, 0);
  ctx.bezierCurveTo(26, -20, 13, -31, -2, -29);
  ctx.bezierCurveTo(-18, -28, -28, -18, -31, -7);
  ctx.quadraticCurveTo(-35, 0, -31, 7);
  ctx.bezierCurveTo(-28, 18, -18, 28, -2, 29);
  ctx.bezierCurveTo(13, 31, 26, 20, 26, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,.16)";
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(-8, side * 20, 21, 6, side * .3, 0, TAU); ctx.fill();
  }
  // Shoulder ridges and scales describe the volume without exposing the underside.
  ctx.strokeStyle = "rgba(0,0,0,.22)"; ctx.lineWidth = 1.3;
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const x = 13 - i * 9, y = side * (17 + Math.sin(i * .8) * 5);
    ctx.beginPath(); ctx.moveTo(x + 4, y - side * 3);
    ctx.quadraticCurveTo(x - 1, y + side * 3, x - 7, y); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.09)";
    ctx.beginPath(); ctx.moveTo(x + 2, y - side * 5); ctx.lineTo(x - 6, y - side * 3); ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,.22)";
  }
  if (ft.plates) {
    ctx.fillStyle = armor;
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(8 - i * 11, side * (13 + i), 8, 6, side * .3, 0, TAU); ctx.fill();
    }
  }
  if (ft.shoulder || ft.scutes) {
    ctx.fillStyle = spike;
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const x = 11 - i * 10, y = side * (25 - i * 2);
      ctx.beginPath(); ctx.moveTo(x + 4, y - side * 3); ctx.lineTo(x - 3, y + side * (ft.shoulder ? 5 : 2));
      ctx.lineTo(x - 6, y - side * 3); ctx.closePath(); ctx.fill();
    }
  }
  if (ft.fins) {
    ctx.fillStyle = armor;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(3, side * 18); ctx.lineTo(-29, side * 30); ctx.lineTo(-19, side * 13); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = spike; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, side * 19); ctx.lineTo(-27, side * 29); ctx.stroke();
    }
  }
  if (ft.seams) {
    ctx.strokeStyle = pal.seam; ctx.lineWidth = 1.3;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(13, side * 14); ctx.lineTo(3, side * 18);
      ctx.lineTo(-3, side * 12); ctx.lineTo(-18, side * 17); ctx.stroke();
    }
  }
  // Overlapping irregular dorsal plates: broad bases, split tips and a lit upper edge.
  for (let i = 0; i < 7; i++) {
    const x = -39 + i * 9, size = (4 + Math.sin((i + 1) / 8 * Math.PI) * 5) * (1 + (ft.spineBig || 0) * .2);
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x - 1, 2, 8, size + 2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = spike; ctx.beginPath(); ctx.moveTo(x + 6, 0);
    ctx.lineTo(x + 2, -size * .65); ctx.lineTo(x - 2, -size);
    ctx.lineTo(x - 3, -size * .45); ctx.lineTo(x - 7, -size * .55);
    ctx.lineTo(x - 5, 0); ctx.lineTo(x - 7, size * .55);
    ctx.lineTo(x - 3, size * .45); ctx.lineTo(x - 2, size);
    ctx.lineTo(x + 2, size * .65); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.3)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 2, -size * .8); ctx.lineTo(x + 3, 0); ctx.lineTo(x - 2, size * .8); ctx.stroke();
  }
  drawPlayerClaws(pal, flash, fx);
  // Head overlaps neck/shoulders. Broad brow and short muzzle replace the round face.
  const rp = fx && fx.roar, hx = rp ? rp.headX : 0;
  ctx.save(); ctx.translate(36 + hx, 0);
  const swell = 1 + .12 * (rp ? rp.swell : 0); ctx.scale(swell, swell); ctx.translate(-36, 0);
  ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.beginPath(); ctx.ellipse(29, 1, 20, 19, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(16, -10);
  ctx.quadraticCurveTo(23, -21, 36, -18); ctx.lineTo(45, -14);
  ctx.quadraticCurveTo(54, -12, 53, -5); ctx.lineTo(53, 5);
  ctx.quadraticCurveTo(54, 12, 45, 14); ctx.lineTo(36, 18);
  ctx.quadraticCurveTo(23, 21, 16, 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.07)"; ctx.beginPath(); ctx.ellipse(35, 0, 15, 8, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1.4;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(21, side * 13); ctx.lineTo(30, side * 11); ctx.lineTo(37, side * 13); ctx.stroke();
    ctx.fillStyle = "#101812"; ctx.beginPath(); ctx.ellipse(39, side * 12, 4.5, 2.2, side * -.3, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.eye || "#ff0"; ctx.beginPath(); ctx.ellipse(40, side * 12, 2.1, 1.2, side * -.3, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(49, side * 5, 1.4, .9, 0, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(51, -9); ctx.quadraticCurveTo(54, 0, 51, 9); ctx.stroke();
  if (ft.crest || ft.crown) {
    ctx.fillStyle = spike;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(30, side * 14); ctx.lineTo(ft.crown ? 10 : 16, side * (ft.crown ? 23 : 19));
      ctx.lineTo(22, side * 7); ctx.closePath(); ctx.fill();
    }
  }
  if (rp && rp.mouth > .03) {
    ctx.fillStyle = "#5a0f14"; ctx.beginPath(); ctx.ellipse(50, 0, 2 + rp.mouth * 4, 2 + rp.mouth * 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#e8e0c8";
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(48, side * 5 * rp.mouth); ctx.lineTo(51, side * 2 * rp.mouth); ctx.lineTo(53, side * 5 * rp.mouth); ctx.fill(); }
  }
  ctx.restore();
  // The striking hand stays visible as it crosses the head; resting arms remain below it.
  if (fx && fx.swipe) drawPlayerClaws(pal, flash, fx, true);
  const backGlow = backChargeGlow(fx && fx.charge || 0);
  if (backGlow > 0 && CHARGE_FX_INTENSITY > 0) {
    const pulse = .94 + .06 * Math.sin(time * 5), intensity = CHARGE_FX_INTENSITY * backGlow * pulse;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 7; i++) {
      const x = -39 + i * 9, size = (4 + Math.sin((i + 1) / 8 * Math.PI) * 5) * (1 + (ft.spineBig || 0) * .2);
      ctx.fillStyle = `rgba(70,175,255,${intensity * .35})`;
      ctx.beginPath(); ctx.ellipse(x, 0, 12, size + 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(155,225,255,${Math.min(1, intensity * 1.1)})`;
      ctx.beginPath(); ctx.ellipse(x, 0, 5.5, size * .8, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(225,250,255,${Math.min(1, intensity * 1.6)})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x - 2, -size * .8); ctx.lineTo(x + 3, 0); ctx.lineTo(x - 2, size * .8); ctx.stroke();
    }
    ctx.fillStyle = `rgba(190,230,255,${intensity * .7})`;
    ctx.beginPath(); ctx.arc(50 + hx, 0, 2 + backGlow * 2, 0, TAU); ctx.fill(); ctx.restore();
  }
  if (glow > 0) { ctx.fillStyle = `rgba(120,255,255,${Math.min(1, glow)})`; ctx.beginPath(); ctx.arc(50 + hx, 0, 9, 0, TAU); ctx.fill(); }
}
