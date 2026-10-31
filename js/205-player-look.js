// ===== js/205-player-look.js: Player appearance (growth by level + boss forms): playerAppearance(), evolution moment, onBossKilled hook =====
// Classic script (no modules). Data lives in 047-config-progression.js (PLAYER_LOOK, EVOLVE, PLAYER_FORMS). Drawn by drawKaiju (200).
"use strict";

// Per-run look state, created lazily (G is rebuilt by newGame). Debug hashes: the starting form follows the bosses already "passed"
// (#boss=2 -> form 1, #boss=3 -> form 2, #t=400 -> form 2).
function lookState() {
  if (G.look) return G.look;
  const form = clamp(G.nextBoss || 0, 0, PLAYER_FORMS.length - 2);
  return (G.look = { form, scale: playerGrowthTarget(), pending: null, evoT: 0, pulse: 0, lvl: G.P.lvl });
}
const playerGrowthTarget = () => 1 + (PLAYER_LOOK.maxGrowth - 1) * clamp((G.P.lvl - 1) / (PLAYER_LOOK.fullLevel - 1), 0, 1);

// THE single source of the player's look. Returns {pal, form, name, scale, evo}: pal is a drawKaiju palette (form table entry,
// optionally overridden by G.skin.pal: the plug-in point for future unlockable skins), scale is the full drawn body scale
// (base * growth * transformation pulse), evo is 0..1 progress of a running transformation (or -1).
function playerAppearance() {
  const L = lookState(), f = PLAYER_FORMS[L.form];
  const evo = L.evoT > 0 ? 1 - L.evoT / EVOLVE.dur : -1;
  const pulse = 1 + L.pulse + (evo >= 0 ? EVOLVE.pulse * Math.sin(Math.PI * evo) : 0);
  const pal = G.skin && G.skin.pal ? Object.assign({}, f.pal, G.skin.pal) : f.pal;
  return { pal, form: L.form, name: f.name, scale: PLAYER_LOOK.baseScale * L.scale * pulse, evo };
}

// Distance from the player centre to the drawn mouth tip along the facing; u = point in unscaled sprite units (default the mouth tip).
const playerMouthDist = (u) => (u === undefined ? PLAYER_LOOK.mouthX : u) * playerAppearance().scale;

// Boss-kill hook: called from killEnemy for every boss (other systems may call/extend it). Queues the next form.
function onBossKilled(boss) {
  superLaserOnBossKilled(boss);                                     // compatibility hook; heavy beam is now a chosen card
  const L = lookState(), idx = BOSSES.indexOf(boss.def);
  if (idx < 0 || idx >= BOSSES.length - 1) return;                 // the final boss ends the run, no evolution
  const target = Math.min(idx + 1, PLAYER_FORMS.length - 2);        // forms 1 and 2 come from boss kills (form 3 comes before the last boss)
  if (target > L.form && !(L.pending && L.pending.form >= target)) L.pending = { form: target, t: EVOLVE.delay };
}

function evolvePlayer(form) {
  const L = lookState(), P = G.P, f = PLAYER_FORMS[form];
  L.form = form; L.evoT = EVOLVE.dur; L.pending = null;
  banner("EVOLVED: " + f.name.toUpperCase(), EVOLVE.banner);
  G.shake = Math.max(G.shake, EVOLVE.shake);
  sfx("evolve");
  for (let i = 0; i < 3; i++) G.rings.push({ x: P.x, y: P.y, r: 20, max: 260 + i * 70, t: -0.12 * i, c: f.tint, w: 14 - 3 * i, dim: i ? 0.6 : 1 });
  for (let i = 0; i < 40; i++) {
    const a = rnd(0, TAU), s = rnd(80, 320);
    addParticle(P.x, P.y, Math.cos(a) * s, Math.sin(a) * s, rnd(0.4, 1), rnd(2, 5), i % 2 ? "#fff" : `rgb(${f.tint})`);
  }
}

// Per-frame (called from updatePlay): smooth growth, level-up pulse, queued / final-form evolutions, timers.
function updatePlayerLook(dt) {
  const L = lookState(), P = G.P;
  L.scale += (playerGrowthTarget() - L.scale) * Math.min(1, dt * PLAYER_LOOK.easeRate);
  if (P.lvl !== L.lvl) { if (P.lvl > L.lvl) L.pulse = PLAYER_LOOK.levelPulse; L.lvl = P.lvl; }
  L.pulse = Math.max(0, L.pulse - dt * 0.25);
  if (L.evoT > 0) L.evoT = Math.max(0, L.evoT - dt);
  if (L.pending) { L.pending.t -= dt; if (L.pending.t <= 0 && L.evoT <= 0) evolvePlayer(L.pending.form); }
  const last = PLAYER_FORMS.length - 1;                              // final form just before the last boss spawns
  if (L.form < last && G.t >= BOSS_TIMES[BOSS_TIMES.length - 1] - EVOLVE.finalLead) evolvePlayer(last);
}

// Transformation glow around the player (drawn right after the body). Additive flash that fades out, plus a ring of light.
function drawEvolveFx(P) {
  const L = G.look; if (!L || L.evoT <= 0) return;
  const t = 1 - L.evoT / EVOLVE.dur, a = Math.sin(Math.PI * Math.min(1, t * 1.15)), tint = PLAYER_FORMS[L.form].tint;
  ctx.globalCompositeOperation = "lighter";
  const r = 70 + 110 * t;                                    // three stacked discs approximate a soft radial glow (no gradients in this game)
  for (const [k, c, al] of [[1, `rgba(${tint},`, 0.16], [0.68, `rgba(${tint},`, 0.22], [0.36, "rgba(255,255,255,", 0.3]]) {
    ctx.fillStyle = c + (al * a) + ")"; ctx.beginPath(); ctx.arc(P.x, P.y, r * k, 0, TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

SFX.evolve = () => { tone(140, 520, 0.7, "sawtooth", 0.08); tone(90, 260, 0.9, "sine", 0.12); tone(520, 1040, 0.45, "triangle", 0.05); };   // shared SFX table, own entry
