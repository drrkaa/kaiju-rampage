// ===== js/047-config-progression.js: Tunables for the player's look (growth + boss forms) and the extra level-up perk cards =====
// Classic script (no modules). Loaded after the enemy config; used by 205-player-look.js and 255-cards-extra.js.
"use strict";

// ---- Player growth: the kaiju grows smoothly with its level --------------------------------------------------------
// Visual only. The collision radius (PLAYER.radius) is deliberately NOT scaled, so walking and building collisions feel the same.
const PLAYER_LOOK = {
  baseScale: 1.15,       // drawn body scale at level 1 (this was the old fixed value)
  maxGrowth: 1.5,        // growth multiplier reached at fullLevel (1.0 = no growth)
  fullLevel: 18,         // player level at which maxGrowth is reached (linear in between)
  easeRate: 3,           // how fast the drawn scale follows the target (per second)
  levelPulse: 0.06,      // brief extra scale pulse on every level-up
  mouthX: 50,            // mouth tip in unscaled sprite units (drawKaiju head: ellipse at x=36, rx=17); every beam/breath/roar starts at mouthX * drawn scale
};

// ---- Evolution: a new FORM after each boss kill (the last one shortly before the final boss) -----------------------
const EVOLVE = {
  delay: 1.6,            // seconds after the boss dies before the transformation plays (lets the DEFEATED banner show)
  dur: 1.8,              // length of the transformation moment (flash, aura, growth pulse)
  pulse: 0.28,           // extra scale at the peak of the growth pulse
  finalLead: 8,          // final form appears this many seconds BEFORE the last boss spawns (BOSS_TIMES[2])
  shake: 9,              // screen shake at the start of the transformation
  banner: 3,             // seconds the "EVOLVED: name" banner is shown
};

// ---- Forms (data table). Form 0 is the start look; index = form number. -----------------------------------------------
// pal   : palette passed to drawKaiju {style, body, belly, spine, eye, plate, seam}
// feat  : feature flags read by drawKaiju (all optional; bosses have none, so they draw exactly as before):
//         spineBig 0-2 (second, taller row of back spines), plates (dark armour plates on the back), seams (glowing cracks, uses pal.seam),
//         crest (head horns), shoulder (shoulder spikes), tail (tail length multiplier), tailBlade (bone blade on the tail tip), halo (faint aura)
// tint  : "r,g,b" used for the transformation flash/rings
const PLAYER_FORMS = [
  { name: "Hatchling Terror", tint: "120,255,140",
    pal: { style: "player", body: "#3f9a4a", belly: "#a8d98a", spine: "#e8d84a", eye: "#ff0", feat: null } },
  { name: "Plated Ravager", tint: "255,190,80",
    pal: { style: "player", body: "#2f8a6a", belly: "#b4e0a0", spine: "#ffb43a", eye: "#ffa030", plate: "#1f6048", seam: "#ffd070",
      feat: { spineBig: 1, plates: 1, shoulder: 1, scutes: 1, tail: 1.12 } } },
  { name: "Stormscale Titan", tint: "110,230,255",
    pal: { style: "player", body: "#2f6f8a", belly: "#9fd0e0", spine: "#7fe8ff", eye: "#8ff", plate: "#1d4a60", seam: "#5ff0ff",
      feat: { spineBig: 2, plates: 1, seams: 1, crest: 1, shoulder: 1, fins: 1, tail: 1.25 } } },
  { name: "Apex Calamity", tint: "255,110,60",
    pal: { style: "player", body: "#2a2430", belly: "#7a4a58", spine: "#ff6a2a", eye: "#ff4a2a", plate: "#15111a", seam: "#ff7a2a",
      feat: { spineBig: 2, plates: 1, seams: 1, crest: 1, shoulder: 1, tail: 1.4, tailBlade: 1, halo: 1, crown: 1, scutes: 1 } } },
];

// ---- Extra level-up perk cards (offensive / utility), see 255-cards-extra.js --------------------------------------
const PERKS = {
  savagery:   { max: 4, dmg: 0.10 },      // +10% damage with every attack per level
  lungs:      { max: 4, refill: 0.20 },   // Atomic Breath tank refills 20% faster per level (needs Atomic Breath)
};
