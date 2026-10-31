// [js-split] ===== js/110-cards.js: Abilities table (ABILS), upgrade cards (UPGRADES), card rolling/choosing, #lv debug grants =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// ------------------------------------------------------ ABILITIES / CARDS ---
const SLOT_KEYS = ["q", "e", " "], SLOT_LABELS = ["Q", "E", "SPACE"];
// Abilities live in Q/E/Space slots; `cd` is base cooldown seconds. Level (1-4) scales power and cuts cooldown.
const ABILS = {
  roar:     { name: "Roar", cd: 14, color: "#fa4", desc: "Stuns and blasts back nearby enemies" },
  stomp:    { name: "Seismic Stomp", cd: 10, color: "#e86", desc: "Shockwave rings: damages only inside the glowing bands, the gaps between them are safe" },
  tailspin: { name: "Tail Spin", cd: 11, color: "#fc4", desc: "Whirlwind: a mobile spin whose long tail hits what it touches, deflects shots and smashes buildings" },
  mega:     { name: "Mega Beam", cd: 0, color: "#6ff", desc: "Charge up, then unleash a huge beam at the cursor", noCard: true },   // noCard: not in the level-up pool (replaced by the Super Laser)
  superlaser: { get name() { return G && lv("superlaser") >= 3 ? "Super Laser" : "Mega Beam"; }, get color() { return G && lv("superlaser") >= 3 ? "#f6f" : "#6ff"; },   // card with levels (HEAVY_LV in 035): Lv1-2 Mega Beam, Lv3+ Super Laser; its card is in 165-ability-superlaser.js
              cd: HEAVY_LV[0].cd, desc: "Charge up, then unleash a huge beam at the cursor. Level 3 turns it into the Super Laser", noCard: true },
  // Space slot = evade (always filled). Roll is the weak default; Tail Dash and Jump are level-up cards that REPLACE it (cards + logic: 166-ability-evade.js, numbers: EVADE in 035).
  roll:     { name: "Roll", cd: EVADE.roll.cd, color: "#cdb", desc: "A quick dodge-roll with a moment of invulnerability", noCard: true },
  dash:     { name: "Tail Dash", cd: EVADE.dash.cd, color: "#8f8", desc: "Burst forward, invulnerable, hitting what you pass", noCard: true },
  jump:     { name: "Jump", cd: EVADE.jump.cd, color: "#7cf", desc: "Leap forward, untouchable in the air, shockwave on landing", noCard: true },
};
const ABIL_MAXLVL = 4;
const lv = id => G.P.up[id] || 0;
const amul = id => 1 + 0.3 * (lv(id) - 1);
const abilCd = id => id === "superlaser" || id === "mega" ? 0 : ABILS[id].cd * Math.pow(0.87, Math.max(0, lv(id) - 1));
const freeSlot = () => G.P.slots.indexOf(null);

// Card text for reaching weapon level `lvl` (>= 2): shows the stat steps and the bonus unlocked.
function weaponDesc(kind, lvl) {
  if (lvl <= 1) return kind === "swipe" ? "Unlock your claw swipe." : "Unlock Atomic Breath. Hold RMB to fire.";
  if (kind === "swipe") {
    const a = SWIPE_LV[lvl - 2], b = SWIPE_LV[lvl - 1];
    return `+${b.range - a.range} reach, +${b.dmg - a.dmg} dmg, wider arc, faster` + (lvl === 3 ? ". NEW: follow-up slash!" : lvl === 6 ? ". NEW: crescent wave!" : "");
  }
  const a = BREATH_LV[lvl - 2], b = BREATH_LV[lvl - 1];
  return `+${(b.dmg - a.dmg).toFixed(1)} dmg, +${b.width - a.width} width, +${b.len - a.len} length, less drain` + (lvl === 3 ? ". NEW: burns enemies!" : lvl === 6 ? ". NEW: huge beam!" : "");
}
const UPGRADES = [
  // Weapon level cards: `base` shifts the displayed level (Swipe starts owned at Lv1), `title` names the card per level.
  { id: "swipe", base: 1, max: SWIPE_LV.length - 1, name: "Claws", title: l => `Claws Lv ${l + 1}`, color: "#fa4",
    desc: l => weaponDesc("swipe", l + 1) + `, +${Math.round(SWIPE.hastePerLevel * 100)}% recovery speed`, apply: P => { P.swipeHaste = (P.swipeHaste || 0) + SWIPE.hastePerLevel; } },   // swipeHaste is ticked in 255 updatePerks
  { id: "breath", max: BREATH_LV.length, name: "Atomic Breath", title: l => `Atomic Breath Lv ${l}`, color: "#4ff",   // owned from the start (P.up.breath = 1 in newGame)
    desc: l => weaponDesc("breath", l), apply: P => {} },
  { id: "tremor", damagePassive: true, name: "Tremor", max: 4, color: "#fb5",
    desc: l => l === 1 ? "PASSIVE: ground shockwaves every 1.5s. Locks out Radiance" : "Tremor: stronger, wider, 15% more frequent",
    apply: P => { if (P.up.tremor === 1) P.tremorT = 1; } },
  { id: "speed", name: "Swift Stomp", max: 5, color: "#8f8", desc: l => "+8% move speed", apply: P => { P.speed *= 1.08; } },
  // Defensive cards are deliberately few: Tough Hide (HP + armor merged) and Regeneration. Constants: DEFENSE in 020.
  { id: "hp", name: "Tough Hide", max: DEFENSE.hideMax, color: "#f66", desc: l => `+${DEFENSE.hideHp} max HP (heal ${DEFENSE.hideHp}), take ${DEFENSE.hideArmor} less damage per hit`, apply: P => { P.maxHp += DEFENSE.hideHp; P.hp = Math.min(P.maxHp, P.hp + DEFENSE.hideHp); P.armor += DEFENSE.hideArmor; } },
  { id: "regen", name: "Regeneration", max: DEFENSE.regenMax, color: "#f66", desc: l => `+${DEFENSE.regen} HP per second`, apply: P => { P.regen += DEFENSE.regen; } },
];
for (const id in ABILS) if (!ABILS[id].noCard) UPGRADES.push({ id, name: ABILS[id].name, max: ABIL_MAXLVL, color: ABILS[id].color, abil: true,
  desc: l => l === 1 ? `UNLOCK [${SLOT_LABELS[Math.max(0, freeSlot())]}]: ${ABILS[id].desc}` : "-13% cooldown, +30% power",
  apply: P => { if (P.up[id] === 1) { P.slots[P.slots.indexOf(null)] = id; P.cds[id] = 0; } } });

function upgradeAvailable(u) {
  const l = G.P.up[u.id] || 0;
  if (l >= u.max) return false;
  if (u.damagePassive && UPGRADES.some(other => other.damagePassive && other.id !== u.id && (G.P.up[other.id] || 0) > 0)) return false;
  // Choosing a replacement commits the Space slot; only that defense can level up.
  if (u.evade && G.P.slots[2] !== "roll" && G.P.slots[2] !== u.id) return false;
  if (u.req && !G.P.up[u.req]) return false;
  if (u.abil && l === 0 && freeSlot() < 0) return false;
  return true;
}
function applyUpgrade(u) {
  // Also reject stale defensive cards, including debug/programmatic selections.
  if ((u.evade || u.damagePassive) && !upgradeAvailable(u)) return;
  const P = G.P;
  P.up[u.id] = (P.up[u.id] || 0) + 1;
  u.apply(P);
}
function rollChoices() {
  const P = G.P;
  const pool = UPGRADES.filter(upgradeAvailable);
  const out = [];
  // early guidance: while the weak default evade (Roll) is equipped, an evade replacement card is guaranteed at the level-ups in EVADE.offerLevelUps
  G.lvUps = (G.lvUps || 0) + 1;
  if (P.slots[2] === "roll" && EVADE.offerLevelUps.includes(G.lvUps)) {
    const ev = pool.filter(u => u.evade);
    if (ev.length) out.push(pool.splice(pool.indexOf(ev[Math.floor(Math.random() * ev.length)]), 1)[0]);
  }
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}
function chooseUpgrade(i) {
  const u = G.choices[i];
  if (!u) return;
  applyUpgrade(u);
  mouse.l = false;
  state = "play";
  checkLevelUp();                                  // XP gained during the card screen may already be enough for another level
}
// #lv=N debug: hand out N upgrades in a fixed order
function grantDebugLevels(n) {
  const order = ["breath", "roar", "superlaser", "dash", "swipe", "breath", "swipe", "tremor", "breath", "swipe", "hp", "speed", "regen", "savagery", "swipe", "breath"];
  let given = 0;
  for (const id of order) {
    if (given >= n) break;
    const u = UPGRADES.find(x => x.id === id);
    if (u && upgradeAvailable(u)) { applyUpgrade(u); given++; }
  }
  G.P.lvl = 1 + n;
  if (DEBUG.sl || parseInt(DEBUG.boss, 10) >= 2) unlockSuperLaser(true);   // #sl=1, or #boss=2/3: start with the Super Laser (card level 3)
}

