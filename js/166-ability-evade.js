// ===== js/166-ability-evade.js: The Space evade slot: Roll (default), Tail Dash, Jump; their level-up cards (which REPLACE the current evade) =====
// Classic script (no modules). Constants: EVADE (035-config-evade.js). The Space slot is P.slots[2] and is never empty. Roll is deliberately the weakest option.
// Dash keeps its old behaviour (160-abilities.js updateAction "dash" branch); Roll and Jump actions are driven by updateEvade below.
"use strict";
const EVADE_IDS = ["roll", "dash", "jump"];
const isEvading = act => !!act && (act.type === "dash" || act.type === "roll" || act.type === "jump");
function evadeAngle() {
  const dx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  const dy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
  return (dx || dy) ? Math.atan2(dy, dx) : G.P.face;      // held movement direction (touch sets the same keys), else the way the kaiju faces
}
function startEvade(id) {
  const E = EVADE[id];
  startAction(id, E.dur, { ang: evadeAngle(), id: ++G.shotId });
  G.iframe = Math.max(G.iframe, E.iframe);
  if (id === "jump") sfx("windup");
}
// Fixed-velocity burst for the whole action (called from updatePlay instead of normal movement).
function evadeVelocity(P, act) {
  const E = EVADE[act.type], sp = E.dist / E.dur;
  P.vx = Math.cos(act.ang) * sp; P.vy = Math.sin(act.ang) * sp;
  if (act.type !== "roll") G.iframe = Math.max(G.iframe, 0.1);   // dash and jump stay protected for their whole length; the roll only has its short opening window
}
// Visual height of the kaiju while jumping (px), 0 otherwise.
function evadeLift() {
  const a = G && G.P.action;
  if (!a || a.type !== "jump") return 0;
  return EVADE.jump.lift * Math.sin(Math.PI * clamp(a.t / a.dur, 0, 1));
}
function jumpLand(a) {
  const P = G.P, J = EVADE.jump, m = amul("jump");
  ringFx(P.x, P.y, J.landRadius * 1.3, "255,230,160"); G.shake = Math.max(G.shake, J.landShake); sfx("stomp");
  for (const e of G.enemies) {
    if (e.dead || isFlying(e)) continue;
    const d = dist(e.x, e.y, P.x, P.y);
    if (enemyCircleHit(e, P.x, P.y, J.landRadius)) { const an = Math.atan2(e.y - P.y, e.x - P.x); damageEnemy(e, J.landDmg * m, Math.cos(an) * J.landKnock, Math.sin(an) * J.landKnock); e.trail = 0.4; }
  }
  buildingsInCircle(P.x, P.y, J.landRadius * 0.7, b => { if (b.shot !== a.id) { b.shot = a.id; damageBuilding(b, J.landBldg * m); } });
  damageCarsInCircle(P.x, P.y, J.landRadius * 0.7);
  for (let k = 0; k < 12; k++) addParticle(P.x + rnd(-30, 30), P.y + rnd(-30, 30), rnd(-120, 120), rnd(-120, 120), 0.5, rnd(3, 6), "#a8987a");
}
// Per-frame for Roll / Jump (Tail Dash is handled in 160).
function updateEvade(a, dt) {
  const P = G.P;
  if (Math.random() < dt * 40) addParticle(P.x, P.y, rnd(-40, 40), rnd(-40, 40), 0.35, rnd(2, 4), "#b9a98a");
  if (a.type === "jump" && !a.landed && a.t + dt >= a.dur) { a.landed = true; jumpLand(a); }
}

// ---- level-up cards: they REPLACE the current Space action (the old one is dropped; picking it again later re-unlocks it) ----
const currentEvade = () => (G && G.P.slots[2]) || "roll";
function evadeCard(id, text) {
  return { id, evade: true, name: ABILS[id].name, max: ABIL_MAXLVL, color: ABILS[id].color,
    desc: l => l === 1 ? `REPLACES your Space action (${ABILS[currentEvade()].name}): ${text}` : "-13% cooldown, +30% power",
    apply: P => {
      if (P.up[id] !== 1) return;
      for (const o of EVADE_IDS) if (o !== id) delete P.up[o];
      P.slots[2] = id; P.cds[id] = 0;
    } };
}
UPGRADES.push(
  evadeCard("dash", "a long invulnerable burst that damages what it passes"),
  evadeCard("jump", "leap in the air untouchable and land with a shockwave"),
);
// Jump visuals: dark ellipse on the ground, then lifts the drawing by `lift` px (the caller restores the context after the kaiju is drawn).
function drawJumpShadow(lift) {
  const P = G.P, k = 1 - lift / EVADE.jump.lift * 0.35;
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(P.x, P.y + 6, PLAYER.radius * 1.3 * k, PLAYER.radius * 0.6 * k, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(0, -lift);
}
