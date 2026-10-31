"use strict";
UPGRADES.push({ id: "radiance", damagePassive: true, name: "Radiance", max: RADIANCE.maxLevel, color: "#aaff7c",
  desc: l => l === 1 ? "PASSIVE: leaves a 4s radiation trail that burns ground and air enemies. Locks out Tremor" : "+4 radiation damage and +10 trail radius",
  apply: P => { if (P.up.radiance === 1) { P.radianceT = 0; P.radiation = []; P.radiationDepositT = 0; } }
});
ICON_COLORS.radiance = "#aaff7c";
ICON_DRAW.radiance = (c, col) => {
  c.strokeStyle = col; c.lineWidth = 4; c.beginPath(); c.arc(32, 32, 22, 0, TAU); c.stroke();
  c.fillStyle = col; c.beginPath(); c.arc(32, 32, 5, 0, TAU); c.fill();
  for (let i = 0; i < 3; i++) { const a = i * TAU / 3; c.beginPath(); c.arc(32, 32, 17, a, a + .7); c.arc(32, 32, 9, a + .7, a, true); c.closePath(); c.fill(); }
};
// Run-local patches live on the player so restarting also clears contamination.
function updateRadiance(dt) {
  const P = G.P, level = lv("radiance");
  if (paused || state !== "play") return;
  if (!level) { P.radiation = []; return; }
  const patches = P.radiation || (P.radiation = []);
  for (let i = patches.length - 1; i >= 0; i--) {
    patches[i].life -= dt;
    if (patches[i].life <= 0) patches.splice(i, 1);
  }
  P.radiationDepositT = (P.radiationDepositT || 0) - dt;
  if (P.radiationDepositT <= 0) {
    P.radiationDepositT = RADIANCE.depositInterval;
    const last = patches[patches.length - 1];
    // Standing still sustains one pool; moving leaves separate world-space patches.
    if (last && Math.hypot(P.x - last.x, P.y - last.y) < 20) last.life = RADIANCE.lifetime;
    else patches.push({ x: P.x, y: P.y, life: RADIANCE.lifetime, seed: G.t * 7 });
    if (patches.length > RADIANCE.maxPatches) patches.shift();
  }
  P.radianceT = (P.radianceT ?? 0) - dt;
  if (P.radianceT > 0) return;
  P.radianceT = RADIANCE.interval;
  const radius = RADIANCE.radius + RADIANCE.radiusPerLevel * (level - 1);
  const damage = RADIANCE.damage + RADIANCE.damagePerLevel * (level - 1);
  // One hit per enemy per tick, regardless of how many pools overlap.
  for (const e of G.enemies) if (!e.dead && !(e.fleeT > 0) && patches.some(p => enemyCircleHit(e, p.x, p.y, radius))) damageEnemy(e, damage, 0, 0);
}
function drawRadiance() {
  const P = G.P, level = lv("radiance");
  if (!level) return;
  const radius = RADIANCE.radius + RADIANCE.radiusPerLevel * (level - 1);
  ctx.save();
  for (const p of P.radiation || []) {
    const fade = clamp(p.life / 1.2, 0, 1), age = RADIANCE.lifetime - p.life;
    // Layered asymmetric stains and drifting vapor distinguish this from a shockwave.
    for (let i = 0; i < 5; i++) {
      const a = p.seed + i * 2.4, offset = radius * .26;
      ctx.fillStyle = `rgba(${i % 2 ? "116,232,45" : "50,135,32"},${fade * .085})`;
      ctx.beginPath(); ctx.ellipse(p.x + Math.cos(a) * offset, p.y + Math.sin(a) * offset,
        radius * .72, radius * .48, a, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 7; i++) {
      const a = p.seed + i * 2.399, spread = radius * (.2 + (i % 3) * .22);
      const rise = (age * 19 + i * 9) % 42;
      const x = p.x + Math.cos(a) * spread + Math.sin(G.t * 1.8 + i) * 5;
      const y = p.y + Math.sin(a) * spread - rise;
      ctx.fillStyle = `rgba(174,255,86,${fade * (1 - rise / 48) * .6})`;
      ctx.beginPath(); ctx.arc(x, y, 1.5 + i % 3, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(136,239,69,${fade * .045})`;
      ctx.beginPath(); ctx.ellipse(x, y - 5, 10 + rise * .18, 6 + rise * .1, a, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}
