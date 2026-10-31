// [js-split] ===== js/120-spawning.js: Particles, enemy/boss spawning, spawn curve driver (updateSpawning) =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// --------------------------------------------------------------- SPAWNING ---
function addParticle(x, y, vx, vy, life, size, color) {
  if (G.parts.length >= MAX_PARTICLES) return;
  G.parts.push({ x, y, vx, vy, life, max: life, size, color });
}
const bossesAlive = () => G.enemies.filter(e => e.def && !e.dead);

function spawnEnemy(type, x, y) {
  const P = G.P;
  if (type !== "boss" && G.enemies.length >= MAX_ENEMIES) return null;
  const d = ETYPES[type];
  const ground = type !== "heli" && type !== "boss" && ENEMY_NAV.collide;
  if (x === undefined) {
    for (let tries = 0; tries <= ENEMY_NAV.spawnTries; tries++) {      // random ring around the screen edge, retry if inside a building
      const a = Math.random() * TAU, r = Math.hypot(W, H) / 2 + rnd(40, 160);
      x = P.x + Math.cos(a) * r; y = P.y + Math.sin(a) * r;
      if (!ground || !anySolid(x, y, d.r + 2)) break;
    }
  }
  if (ground) { const f = freeSpot(x, y, d.r); x = f.x; y = f.y; }
  const hp = d.hp * (type === "boss" ? 1 : 1 + G.t * SPAWN.hpGrowth);
  const e = { type, x, y, r: d.r, hp, maxHp: hp, speed: d.speed * rnd(0.9, 1.1) * (type === "soldier" ? ENEMY_NAV.soldierSpeedMul : 1), kx: 0, ky: 0, stun: 0,
              cT: 0, cnx: 0, cny: 0, sx: x, sy: y, stT: 0, steerSign: Math.random() < 0.5 ? 1 : -1, steerOff: 0, commitT: 0,
              flash: 0, cd: rnd(0.5, 2), hitCd: 0, dead: false, ang: 0, t: rnd(0, 6),
              strafe: Math.random() < 0.5 ? 1 : -1, dashHit: -1 };
  G.enemies.push(e);
  return e;
}

function spawnBoss(i) {
  const def = BOSSES[i], P = G.P;
  const a = Math.random() * TAU;
  const e = spawnEnemy("boss", P.x + Math.cos(a) * 560, P.y + Math.sin(a) * 560);
  e.def = def; e.bossIdx = i; e.r = def.r; e.hp = e.maxHp = def.hp * BOSS_HP_MUL; e.speed = def.moveSpeed[0];
  e.comboLeft = def.combo[0]; e.lastAtk = null; e.tired = false; e.lift = 0;
  e.phase = 1; e.mode = "idle"; e.modeT = 1.0; e.atk = null; e.at = 0; e.intro = 2.6; e.inv = false; e.spinOn = false;
  e.glow = 0; e.spinA = 0; e.cdir = 0;
  G.introT = 2.6; G.introBoss = def;
  for (const o of G.enemies) if (!o.def && !(o.fleeT > 0)) o.fleeT = BOSS_CLEAR_TIME * rnd(0.8, 1.1);   // existing regular enemies flee + fade out
  banner(def.name, 3);
  G.shake = 12;
  return e;
}

function updateSpawning(dt) {
  const P = G.P;
  const bossUp = bossesAlive().length > 0;
  if (G.nextBoss < BOSS_TIMES.length && G.t >= BOSS_TIMES[G.nextBoss]) spawnBoss(G.nextBoss++);
  const c = spawnCurve(G.t);
  let mul = bossUp ? BOSS_SPAWN_MUL : 1;
  if (!bossUp && G.lastBossDeath !== undefined) mul *= clamp(0.25 + 0.75 * (G.t - G.lastBossDeath) / POST_BOSS_RAMP, 0.25, 1);   // gentle ramp after a boss
  G.spawnAcc += dt * c.rate * mul;
  const cap = bossUp ? MAX_ENEMIES_BOSS : MAX_ENEMIES;
  const rangedCounts = { heli: 0, mortar: 0 };
  for (const e of G.enemies) if (!e.dead && !(e.fleeT > 0) && e.type in rangedCounts) rangedCounts[e.type]++;
  while (G.spawnAcc >= 1) {
    G.spawnAcc -= 1;
    if (G.enemies.length >= cap) continue;
    const r = Math.random();
    let type = r < c.tank ? "tank" : r < c.tank + c.heli ? "heli" : G.t >= MORTAR.start && r < c.tank + c.heli + MORTAR.share ? "mortar" : "soldier";
    if (type in rangedCounts && rangedCounts[type] >= SPAWN.liveCaps[type]) type = "soldier";
    const spawned = spawnEnemy(type);
    if (spawned && type in rangedCounts) rangedCounts[type]++;
  }
  if (G.t >= G.nextWave) {
    G.nextWave += SPAWN.waveEvery;
    if (!bossUp) {
      banner("SOLDIER WAVE!", 2);
      const r0 = Math.hypot(W, H) / 2 + 60;
      for (let i = 0; i < SPAWN.waveSize; i++) {
        const a = (i / SPAWN.waveSize) * TAU;
        spawnEnemy("soldier", P.x + Math.cos(a) * r0, P.y + Math.sin(a) * r0);
      }
    }
  }
}

