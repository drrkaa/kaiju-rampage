// ===== js/255-cards-extra.js: Extra offensive/utility level-up cards (Savagery, Deep Lungs) + their icons and per-frame effect =====
// Classic script (no modules). Loaded after 110-cards.js (UPGRADES) and 250-icons.js (ICON_DRAW). Constants: PERKS in 047.
"use strict";
UPGRADES.push(
  { id: "savagery", name: "Savagery", max: PERKS.savagery.max, color: "#f84",
    desc: l => `+${Math.round(PERKS.savagery.dmg * 100)}% damage with every attack`, apply: P => { P.dmgMul = (P.dmgMul || 1) + PERKS.savagery.dmg; } },
  { id: "lungs", name: "Deep Lungs", max: PERKS.lungs.max, color: "#4cf", req: "breath",
    desc: l => `Atomic Breath tank refills ${Math.round(PERKS.lungs.refill * 100)}% faster`, apply: P => { P.lungMul = (P.lungMul || 0) + PERKS.lungs.refill; } },
);
ICON_COLORS.savagery = "#f84"; ICON_COLORS.lungs = "#4cf";
ICON_DRAW.savagery = (c, col) => {                  // fang / jagged tooth pair
  c.fillStyle = col;
  for (const [x, w] of [[20, 14], [34, 14]]) { c.beginPath(); c.moveTo(x, 12); c.lineTo(x + w, 12); c.lineTo(x + w / 2, 54); c.closePath(); c.fill(); }
  c.fillStyle = "#fff"; c.globalAlpha = 0.5; c.fillRect(14, 8, 38, 6); c.globalAlpha = 1;
};
ICON_DRAW.lungs = (c, col) => {                     // two lobes with a windpipe
  c.fillStyle = col;
  c.beginPath(); c.ellipse(21, 38, 11, 17, 0.15, 0, TAU); c.ellipse(43, 38, 11, 17, -0.15, 0, TAU); c.fill();
  c.strokeStyle = "#fff"; c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); c.moveTo(32, 8); c.lineTo(32, 32); c.moveTo(32, 32); c.lineTo(24, 40); c.moveTo(32, 32); c.lineTo(40, 40); c.stroke();
};

// Per-frame effect of the perks that need one (called from updatePlay). Savagery is applied in damageEnemy (130).
function updatePerks(dt) {
  const P = G.P;
  if (P.swipeHaste && P.swipeCd > 0) P.swipeCd = Math.max(0, P.swipeCd - dt * P.swipeHaste);          // swipeHaste comes from the Claws card (110): cooldown ticks faster
  if (P.lungMul && hasBreath() && !(P.action && (P.action.type === "breath" || P.action.type === "mega")) && P.charge < 100) {       // Deep Lungs: extra refill while not breathing
    const spd = Math.hypot(P.vx, P.vy);
    P.charge = Math.min(100, P.charge + BREATH.chargeRate * breathStats().charge * (spd < 25 ? BREATH.standMul : 1) * P.lungMul * dt);
  }
}
