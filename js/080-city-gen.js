// [js-split] ===== js/080-city-gen.js: City: chunk map, building/car/tree generation, spatial queries, building damage and XP =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// ------------------------------------------------------------------ CITY ---
// Infinite city: a grid of blocks separated by streets. Blocks are generated per
// 2x2 "chunk" deterministically. Each chunk is rendered ONCE to an offscreen
// canvas (ground, parks, parking, cars, buildings with pseudo-3D) and only
// re-rendered when something in it is damaged. Off-screen canvases are freed.
const chunks = new Map();
// Compact persistent damage record: building/car id -> remaining hp (0 = destroyed). Survives chunk eviction.
const bState = new Map();
function persist(id, hp) {
  bState.delete(id); bState.set(id, hp);                       // delete+set keeps Map ordered by recency
  if (bState.size > BSTATE_MAX) { let n = 0; for (const k of bState.keys()) { bState.delete(k); if (++n >= 2000) break; } }
}
// Collision / hit rectangle of a building = its drawn silhouette: footprint plus the roof offset
// (roof is drawn up-left of the footprint by depth*ROOF_OX/OY, so walls + roof span exactly this box).
const ROOF_OX = 0.35, ROOF_OY = 0.7;
function colRect(b) { const d = b.d * (1 - BLDG_SAG * (b.sections ? 0 : b.stage)); return { x: b.x - d * ROOF_OX, y: b.y - d * ROOF_OY, w: b.w + d * ROOF_OX, h: b.h + d * ROOF_OY }; }
const stageOf = b => { if (b.hp <= 0) return DEAD_STAGE; const f = b.hp / b.maxHp; let n = 0; for (const t of BLDG_STAGES) if (f < t) n++; return n; };
const smokers = new Set();          // damaged buildings that emit smoke / fire
let frameNo = 0;
const ROOF_HUES = [210, 30, 0, 40, 190, 260, 15, 120];
const CAR_COLORS = ["#c0392b", "#2980b9", "#d4ac0d", "#ecf0f1", "#27ae60", "#34495e", "#e67e22", "#8e44ad"];

function blockType(bx, by, rng) {
  const r = rng();
  if (bx >= -1 && bx <= 0 && by >= -1 && by <= 0) return "park"; // open spawn area
  return r < 0.70 ? "build" : r < 0.80 ? "park" : r < 0.90 ? "parking" : "plaza";
}

function getChunk(cx, cy) {
  const key = cx + "," + cy;
  let c = chunks.get(key);
  if (c) { c.last = frameNo; return c; }
  c = { cx, cy, b: [], cars: [], trees: [], blocks: [], canvas: null, dirty: true, last: frameNo };
  const X=cx*CHUNK,Y=cy*CHUNK,H=CITY_LAYOUT.halo;
  const overlaps=o=>o.x+o.w>X-H && o.x<X+CHUNK+H && o.y+o.h>Y-H && o.y<Y+CHUNK+H;
  for(const desc of cityBlocksInBox(X-H,Y-H,X+CHUNK+H,Y+CHUNK+H)) {
    const lot=cityLot(desc);lot.keys.add(key);c.blocks.push(lot.blk);
    for(const b of lot.b) if(overlaps(colRect(b))) { if(b.chunk===lot || b.chunk.evicted)b.chunk=c; c.b.push(b); }
    for(const car of lot.cars) if(overlaps(car)) c.cars.push(car);
    for(const t of lot.trees) if(overlaps({x:t.x-t.r,y:t.y-t.r,w:t.r*2,h:t.r*2})) c.trees.push(t);
  }
  chunks.set(key, c);
  return c;
}
function mkCar(rng, x, y, w, h) {
  return { x, y, w, h, col: CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)], dead: false };
}
// Trees are small, flat-looking canopies that get trampled (removed) when walked over.
function genTrees(c, bx, by, lx, ly) {
  const rng = mulberry32(bx * 9176 + by * 4421 + 7);
  for (let i = 0; i < 13; i++) {
    const tx = lx + 10 + rng() * 140, ty = ly + 10 + rng() * 140, tr = 6 + rng() * 4, hue = 105 + rng() * 25, lum = 30 + rng() * 10;
    if ((tx > lx + 66 && tx < lx + 94) || (ty > ly + 66 && ty < ly + 94) || dist(tx, ty, lx + 38, ly + 38) < 28) continue;
    c.trees.push({ x: tx, y: ty, r: tr, hue, lum, dead: false });
  }
}
function crushTrees(x, y, r) {
  const x0 = Math.floor((x - r - 12) / CHUNK), x1 = Math.floor((x + r + 12) / CHUNK);
  const y0 = Math.floor((y - r - 12) / CHUNK), y1 = Math.floor((y + r + 12) / CHUNK);
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
    const ch = getChunk(cx, cy);
    for (const t of ch.trees) {
      if (t.dead || dist(t.x, t.y, x, y) > t.r + r) continue;
      t.dead = true; ch.dirty = true; if(t.lot)t.lot.dirty=true; persist(t.id, 0);
      for (let i = 0; i < 4; i++) addParticle(t.x, t.y, rnd(-60, 60), rnd(-60, 60), 0.5, 3, "#5fa352");
    }
  }
}
function genParking(c, rng, lx, ly) {
  for (let row = 0; row < 2; row++) for (let s = 0; s < 10; s++) {
    if (rng() < 0.55) c.cars.push(mkCar(rng, lx + 10 + s * 14 + 1.5, (row ? ly + 160 - 8 - 24 : ly + 8) + 1, 11, 22));
  }
}
function genBuildings(c, rng, lx, ly) {
  const L = 160, r = rng();
  const add = (x, y, w, h) => addBuilding(c, rng, x, y, w, h);
  if (r < 0.2) add(lx + 4, ly + 4, L - 8, L - 8);
  else if (r < 0.45) { const w1 = L * (0.4 + rng() * 0.2); add(lx + 4, ly + 4, w1 - 6, L - 8); add(lx + w1 + 2, ly + 4, L - w1 - 6, L - 8); }
  else if (r < 0.7) { const h1 = L * (0.4 + rng() * 0.2); add(lx + 4, ly + 4, L - 8, h1 - 6); add(lx + 4, ly + h1 + 2, L - 8, L - h1 - 6); }
  else {
    const w1 = L * (0.4 + rng() * 0.2), h1 = L * (0.4 + rng() * 0.2);
    const q = [[lx + 4, ly + 4, w1 - 6, h1 - 6], [lx + w1 + 2, ly + 4, L - w1 - 6, h1 - 6],
               [lx + 4, ly + h1 + 2, w1 - 6, L - h1 - 6], [lx + w1 + 2, ly + h1 + 2, L - w1 - 6, L - h1 - 6]];
    for (const a of q) if (rng() > 0.15) add(a[0], a[1], a[2], a[3]);
  }
}
function addBuilding(c, rng, x, y, w, h) {
  if (w < 26 || h < 26) return;
  const t = rng();
  const d = t < 0.35 ? 10 + rng() * 8 : t < 0.8 ? 14 + rng() * 12 : 24 + rng() * 11; // visual height
  const hue = ROOF_HUES[Math.floor(rng() * ROOF_HUES.length)], sat = 8 + rng() * 20, lum = 48 + rng() * 16;
  const k = rng();
  const kind = (d >= 22 && w >= 60 && h >= 60 && k < 0.5) ? "helipad" : k < 0.4 ? "tank" : k < 0.55 ? "antenna" : k < 0.7 ? "skylight" : "ac";
  const hp = (30 + Math.min(w * h, 20000) / 45) * (0.7 + d / 18) * BLDG_HP_MUL;
  const b = { id: (c.idPrefix || c.cx + "," + c.cy) + ":" + c.b.length, x, y, w, h, d, floors: Math.max(1, Math.round(d / 7)), kind,
    roof: `hsl(${hue},${sat}%,${lum}%)`, wallS: `hsl(${hue},${sat}%,${lum - 26}%)`, wallE: `hsl(${hue},${sat}%,${lum - 34}%)`,
    hp, maxHp: hp, stage: 0, dead: false, shot: -1, seed: Math.floor(rng() * 1e6), chunk: c };
  const saved = bState.get(b.id);
  if (saved !== undefined) { b.hp = saved; b.dead = saved <= 0; b.stage = stageOf(b); }
  if (!b.dead && b.stage >= SMOKE.minStage) smokers.add(b);
  createBuildingSections(b);
  c.b.push(b);
}

// call fn(b) for every live building whose footprint touches the circle
function buildingsInCircle(x, y, r, fn) {
  const seen = new Set();
  const x0 = Math.floor((x - r) / CHUNK), x1 = Math.floor((x + r) / CHUNK);
  const y0 = Math.floor((y - r) / CHUNK), y1 = Math.floor((y + r) / CHUNK);
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
    const list = getChunk(cx, cy).b;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.dead || seen.has(b)) continue;
      seen.add(b);
      for(const part of buildingParts(b)) {
        if(part.dead)continue;
        const q=colRect(part),nx=clamp(x,q.x,q.x+q.w),ny=clamp(y,q.y,q.y+q.h);
        if((nx-x)**2+(ny-y)**2<=r*r)fn(part);
      }
    }
  }
}
// true if any intact building's solid box touches the circle (early exit, no callback)
function anySolid(x, y, r) {
  const x0 = Math.floor((x - r) / CHUNK), x1 = Math.floor((x + r) / CHUNK);
  const y0 = Math.floor((y - r) / CHUNK), y1 = Math.floor((y + r) / CHUNK);
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
    const list = getChunk(cx, cy).b;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.dead) continue;
      if(b.sections){
        const box=colRect(b),dx=clamp(x,box.x,box.x+box.w)-x,dy=clamp(y,box.y,box.y+box.h)-y;
        if(dx*dx+dy*dy>=r*r)continue;
      }
      for(const part of buildingParts(b)) {
        if(part.dead)continue;
        const q=colRect(part),nx=clamp(x,q.x,q.x+q.w),ny=clamp(y,q.y,q.y+q.h);
        if((nx-x)**2+(ny-y)**2<r*r)return true;
      }
    }
  }
  return false;
}
// Push circle-object `o` (radius R) out of building b's solid box; sets PUSH_UX/UY to the contact normal.
let PUSH_UX = 0, PUSH_UY = 0;
function pushOutOf(b, o, R) {
  const q = colRect(b), nx = clamp(o.x, q.x, q.x + q.w), ny = clamp(o.y, q.y, q.y + q.h);
  const dx = o.x - nx, dy = o.y - ny, d = Math.hypot(dx, dy);
  let ux, uy;
  if (d > 1e-6) { if (d >= R) return false; ux = dx / d; uy = dy / d; o.x += ux * (R - d); o.y += uy * (R - d); }
  else {                                     // centre inside the box: leave by the nearest side
    const l = o.x - q.x, r = q.x + q.w - o.x, t = o.y - q.y, bt = q.y + q.h - o.y, m = Math.min(l, r, t, bt);
    if (m === l) { ux = -1; uy = 0; } else if (m === r) { ux = 1; uy = 0; } else if (m === t) { ux = 0; uy = -1; } else { ux = 0; uy = 1; }
    o.x += ux * (m + R); o.y += uy * (m + R);
  }
  PUSH_UX = ux; PUSH_UY = uy;
  return true;
}
// nearest free spot around (x,y), searching beyond the widest merged frontage
function freeSpot(x, y, r) {
  if (!anySolid(x, y, r + 2)) return { x, y };
  for (let ring = 1; ring <= Math.ceil(BLOCK * 2 / 24); ring++) for (let k = 0; k < 8; k++) {
    const a = k * TAU / 8 + ring, px = x + Math.cos(a) * ring * 24, py = y + Math.sin(a) * ring * 24;
    if (!anySolid(px, py, r + 2)) return { x: px, y: py };
  }
  return { x, y };
}
function crushCars(x, y, r) {
  crushTrees(x, y, r);
  const x0 = Math.floor((x - r) / CHUNK), x1 = Math.floor((x + r) / CHUNK);
  const y0 = Math.floor((y - r) / CHUNK), y1 = Math.floor((y + r) / CHUNK);
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
    const ch = getChunk(cx, cy);
    for (const car of ch.cars) {
      if (car.dead) continue;
      const nx = clamp(x, car.x, car.x + car.w), ny = clamp(y, car.y, car.y + car.h);
      if ((nx - x) * (nx - x) + (ny - y) * (ny - y) <= r * r) {
        car.dead = true; ch.dirty = true; if(car.lot)car.lot.dirty=true; persist(car.id, 0);
        for (let i = 0; i < 5; i++) addParticle(car.x + car.w / 2, car.y + car.h / 2, rnd(-80, 80), rnd(-80, 80), 0.5, 3, "#ffb347");
      }
    }
  }
}

function damageBuilding(b, d) {
  if (b.dead || paused || state === "levelup" || !(d > 0)) return;
  if(b.sections){
    const live=b.sections.filter(s=>!s.dead),total=live.reduce((sum,s)=>sum+s.maxHp,0);
    for(const part of live)damageBuilding(part,d*part.maxHp/total);
    return;
  }
  b.hp -= d; persist(b.id, Math.max(0, Math.round(b.hp)));
  const stage = stageOf(b);
  if(b.parent){b.dead=stage===DEAD_STAGE;syncBuildingSections(b.parent);showSectionHealth(b.parent);}
  b.hitFlash = BLDG_SHAKE_TIME; b.barT = BLDG_HPBAR_TIME;
  if (!b.inList && G.dmgList.length < 80) { b.inList = true; G.dmgList.push(b); }
  if (stage !== b.stage) {
    b.stage = stage; b.chunk.dirty = true; if(b.lot)b.lot.dirty=true;
    if (stage >= SMOKE.minStage && stage < DEAD_STAGE) smokers.add(b);
    for (let i = 0; i < 6; i++) addParticle(b.x + Math.random() * b.w, b.y + Math.random() * b.h, rnd(-60, 60), rnd(-60, 60), 0.5, 4, "#999");
  }
  if (stage === DEAD_STAGE) {
    b.dead = true;
    if(b.parent){G.sectionsDestroyed=(G.sectionsDestroyed||0)+1;if(b.parent.dead){G.destroyed++;persist(b.parent.id,0);}}
    else G.destroyed++;
    smokers.delete(b); G.navVersion = (G.navVersion || 0) + 1;
    startBuildingCollapse(b); sfx("collapse");
    G.bldgXp += awardXp(buildingXp(b), b.x + b.w / 2, b.y + b.h / 2, true);          // instant XP + small label; restored-destroyed buildings never reach this
    gainCharge(CHARGE.building);                                                       // charge is earned by fighting
    G.shake = Math.max(G.shake, 5);
    for (let i = 0; i < 16; i++)
      addParticle(b.x + Math.random() * b.w, b.y + Math.random() * b.h, rnd(-130, 130), rnd(-130, 130), rnd(0.4, 0.9), rnd(3, 7), i % 3 ? "#8a8a8a" : "#c9b27a");
  } else if (Math.random() < 0.15) {
    addParticle(b.x + Math.random() * b.w, b.y + Math.random() * b.h, rnd(-50, 50), rnd(-50, 50), 0.4, 3, "#aaa");
  }
}

const buildingXp = b => b.parent ? b.xpShare : clamp(BLDG_XP.base + b.w * b.h * BLDG_XP.perArea + b.d * BLDG_XP.perHeight, BLDG_XP.min, BLDG_XP.max);
// seeded noise helper for deterministic decoration
const rs = (seed, i) => { const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return v - Math.floor(v); };

