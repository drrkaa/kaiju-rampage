// ===== js/086-world-ground.js: Ground wear: capped tile-wear Map (G.world.wear), surface classification, stage painting for renderChunk =====
"use strict";
// Wear is deposited where the kaiju walks, fights and where attacks land. It never decays. Each tile (WEAR.tile px) holds one
// number; crossing a stage threshold marks the owning chunk dirty so the (rate limited, double buffered) chunk repaint picks it
// up. Purely visual. The map is capped (WEAR.maxTiles) and, like bState, survives chunk eviction.
const WEAR_PER_CHUNK = CHUNK / WEAR.tile;
const wearKey = (tx, ty) => (tx + 1048576) * 2097152 + (ty + 1048576);
function wearStage(w) { let n = 0; const s = WEAR.stages; for (let i = 0; i < s.length; i++) if (w >= s[i]) n++; return n; }

// Deposit `amt` of wear around (x, y): linear falloff to zero at radius r (plus half a tile).
function groundWearAdd(x, y, amt, r, patchy = false) {
  if (!(amt > 0)) return;
  const wm = WS().wear, T = WEAR.tile, R = r + T * 0.5;
  const tx0 = Math.floor((x - R) / T), tx1 = Math.floor((x + R) / T), ty0 = Math.floor((y - R) / T), ty1 = Math.floor((y + R) / T);
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) {
    const d = Math.hypot((tx + 0.5) * T - x, (ty + 0.5) * T - y);
    if (d >= R) continue;
    const texture = patchy ? 0.35 + 1.3 * rs(tx * 91.7 + ty * 313.3, 19) : 1;
    const add = amt * (1 - d / R) * texture, k = wearKey(tx, ty), old = wm.get(k) || 0;
    if (old >= WEAR.cap) continue;
    const nw = Math.min(WEAR.cap, old + add);
    if (old === 0) { wm.set(k, nw); if (wm.size > WEAR.maxTiles) { let n = 0; for (const kk of wm.keys()) { wm.delete(kk); if (++n >= 1000) break; } } }
    else wm.set(k, nw);
    if (wearStage(nw) !== wearStage(old)) {
      const ch = chunks.get(Math.floor(tx / WEAR_PER_CHUNK) + "," + Math.floor(ty / WEAR_PER_CHUNK));
      if (ch) ch.dirty = true;
    }
  }
}
const tileWear = (x, y) => (WS().wear.get(wearKey(Math.floor(x / WEAR.tile), Math.floor(y / WEAR.tile))) || 0);

// Surface family at a world point, using the chunk's block list: "street" | "walk" (sidewalk, build lots, plaza paving) |
// "lot" (parking asphalt) | "grass" | null (pond / fountain: never worn).
function surfaceIn(c, x, y) {
  const blk = c.blocks.find(b => x >= b.bx * BLOCK && x < (b.bx + (b.bw || 1)) * BLOCK && y >= b.by * BLOCK && y < (b.by + (b.bh || 1)) * BLOCK);
  if (!blk) return "street";
  const lx = x - blk.bx * BLOCK, ly = y - blk.by * BLOCK, width = (blk.bw || 1) * BLOCK, height = (blk.bh || 1) * BLOCK;
  if (lx < 24 || lx >= width - 24 || ly < 24 || ly >= height - 24) return "street";
  if (lx < 32 || lx >= width - 32 || ly < 32 || ly >= height - 32) return "walk";
  if (blk.plan) {
    const p=blk.plan;
    if(p.ponds.some(q=>((x-q.x)/q.rx)**2+((y-q.y)/q.ry)**2<1)) return null;
    if(blk.type==="park") return p.paths.concat(p.courts).some(q=>x>=q.x&&x<q.x+q.w&&y>=q.y&&y<q.y+q.h)?"walk":"grass";
    return blk.type==="parking"?"lot":"walk";
  }
  const type = blk.type, ux = (lx - 32) * 160 / (width - 64), uy = (ly - 32) * 160 / (height - 64);
  if (type === "park") { if (((ux - 38) / 22) ** 2 + ((uy - 38) / 15) ** 2 < 1) return null; return "grass"; }
  if (type === "plaza") { if (Math.hypot(ux - 80, uy - 80) < 30) return null; return "walk"; }
  if (type === "parking") return "lot";
  return "walk";
}
function surfaceAt(x, y) { return surfaceIn(getChunk(Math.floor(x / CHUNK), Math.floor(y / CHUNK)), x, y); }

// ---- painting. Palettes per surface: scuff / dirt (exposed ground) / crack / crater (dark pit)
const WEAR_PAL = {
  street: { scuff: "rgba(20,22,26,", dirt: "rgba(98,80,62,", crack: "rgba(8,8,10,", pit: "rgba(40,30,24," },
  lot: { scuff: "rgba(20,22,26,", dirt: "rgba(98,80,62,", crack: "rgba(8,8,10,", pit: "rgba(40,30,24," },
  walk: { scuff: "rgba(96,92,86,", dirt: "rgba(124,104,84,", crack: "rgba(40,40,44,", pit: "rgba(52,42,34," },
  grass: { scuff: "rgba(150,146,72,", dirt: "rgba(112,84,52,", crack: "rgba(52,36,22,", pit: "rgba(48,34,24," },
  rubble: { scuff: "rgba(40,36,32,", dirt: "rgba(60,52,44,", crack: "rgba(20,18,16,", pit: "rgba(30,26,22," },
};
// Cracks are seeded per tile and per crack index, so a crack GROWS (more segments, wider, branches) as the stage rises instead of
// being replaced by a different pattern. WEAR.crackSegs / crackCount / crackWidth are indexed by stage-1.
function wearCrack(g, x, y, sd, c, segs, len, branch) {
  let a = rs(sd, 30 + c) * TAU, px = x + (rs(sd, 40 + c) - 0.5) * 8, py = y + (rs(sd, 50 + c) - 0.5) * 8;
  g.moveTo(px, py);
  for (let s = 0; s < segs; s++) {
    a += (rs(sd, 60 + c * 8 + s) - 0.5) * 1.3; px = clamp(px + Math.cos(a) * len, x - 16, x + 16); py = clamp(py + Math.sin(a) * len, y - 16, y + 16); g.lineTo(px, py);
    if (branch && s === 1) {                                // a side branch off the second segment
      const ba = a + (rs(sd, 150 + c) > 0.5 ? 1 : -1) * (0.7 + rs(sd, 160 + c) * 0.5);
      g.moveTo(px, py); g.lineTo(clamp(px + Math.cos(ba) * len * 1.1, x - 16, x + 16), clamp(py + Math.sin(ba) * len * 1.1, y - 16, y + 16)); g.moveTo(px, py);
    }
  }
}
function paintWearTile(g, tx, ty, w, surf) {
  const T = WEAR.tile, st = wearStage(w), pal = WEAR_PAL[surf]; if (!st || !pal) return;
  const x = tx * T + T / 2, y = ty * T + T / 2, sd = tx * 131.7 + ty * 17.3, k = Math.min(1, (w - WEAR.stages[st - 1]) / ((WEAR.stages[st] || WEAR.cap) - WEAR.stages[st - 1]));
  // stage 1+: soft scuffs, lighter than before (the cracks carry the message)
  g.fillStyle = pal.scuff + (0.12 + 0.05 * st + 0.05 * k) + ")";
  for (let i = 0; i < 2; i++) { g.beginPath(); g.ellipse(x + (rs(sd, i) - 0.5) * 12, y + (rs(sd, i + 5) - 0.5) * 12, 8 + rs(sd, i + 9) * 6, 5 + rs(sd, i + 13) * 5, rs(sd, i + 17) * 3, 0, TAU); g.fill(); }
  if (st >= 3) {                                            // broken: exposed dirt patch (under the cracks) with chipped-out bits
    g.fillStyle = pal.dirt + (0.5 + 0.12 * k) + ")"; jag(g, x + (rs(sd, 70) - 0.5) * 6, y + (rs(sd, 71) - 0.5) * 6, 10 + 4 * k, sd, 7);
    g.fillStyle = pal.pit + "0.55)"; jag(g, x + (rs(sd, 72) - 0.5) * 8, y + (rs(sd, 73) - 0.5) * 8, 5 + 2 * k, sd + 1, 6);
  }
  // Exposed substrate and displaced slabs become a continuous damaged trail on repeat visits.
  if (st >= 2) {
    g.fillStyle = surf === "grass" ? "#70513a" : "#564638";
    jag(g, x, y, st >= 3 ? 18 : 13, sd + 210, 9);
    if (surf !== "grass") for (let shard = 0; shard < (st >= 3 ? 5 : 3); shard++) {
      const a = shard * TAU / 5 + rs(sd, 220) * 2;
      const xx = x + Math.cos(a) * 10, yy = y + Math.sin(a) * 10;
      g.fillStyle = shard % 2 ? "#96928a" : "#b0aaa0"; jag(g, xx, yy, 5 + rs(sd, 230 + shard) * 4, sd + shard + 240, 5);
      g.strokeStyle = "rgba(235,224,200,.65)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(xx-4,yy-2);g.lineTo(xx+2,yy-4);g.stroke();
    }
  }
  // cracks: stage 1 = a few short hairlines, stage 2 = a longer network, stage 3 = wide branching cracks, stage 4 = shattered
  const cs = WEAR.crack, i0 = Math.min(st, cs.count.length) - 1;
  g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = pal.crack + (cs.alpha[i0] + 0.1 * k) + ")"; g.lineWidth = cs.width[i0]; g.beginPath();
  for (let c = 0; c < Math.max(1, cs.count[i0] - (rs(sd, 310) < .4 ? 1 : 0)); c++) wearCrack(g, x, y, sd, c, cs.segs[i0], cs.len[i0], st >= 2);
  // Pale chipped edges beside dark fissures keep damage readable on asphalt too.
  g.save(); g.translate(1.5, 1.5); g.strokeStyle = "rgba(224,211,183,.65)"; g.lineWidth = cs.width[i0] + 1.2; g.stroke(); g.restore();
  g.strokeStyle = pal.crack + (cs.alpha[i0] + 0.1 * k) + ")"; g.lineWidth = cs.width[i0]; g.stroke();
  if (st >= 3) {                                            // chips and loose fragments
    g.fillStyle = pal.crack + "0.5)";
    for (let i = 0; i < 4; i++) g.fillRect(x + (rs(sd, 80 + i) - 0.5) * 24, y + (rs(sd, 90 + i) - 0.5) * 24, 2 + rs(sd, 100 + i) * 3, 1.5 + rs(sd, 110 + i) * 2.5);
  }
  if (st >= 4) {                                            // crater: dark pit with a lighter debris rim
    g.fillStyle = pal.dirt + "0.75)"; jag(g, x, y, 14, sd + 3, 9);
    g.fillStyle = pal.pit + (0.8 + 0.15 * k) + ")"; jag(g, x, y, 9 + 2 * k, sd + 7, 8);
    g.fillStyle = "rgba(150,140,125,.7)";
    for (let i = 0; i < 4; i++) g.fillRect(x + Math.cos(i * 1.6 + sd) * 12, y + Math.sin(i * 1.6 + sd) * 11, 2 + rs(sd, 120 + i) * 2.5, 2);
  }
}
// Whole-chunk overlay (called by renderChunk after the ground, before trees / cars / buildings). Tiles under buildings are
// skipped (hidden anyway); tiles under dead buildings are painted over the rubble by drawRubbleWear.
function drawGroundWear(g, c) {
  const wm = WS().wear; if (!wm.size) return;
  const tx0 = c.cx * WEAR_PER_CHUNK, ty0 = c.cy * WEAR_PER_CHUNK, T = WEAR.tile;
  for (let tx = tx0; tx < tx0 + WEAR_PER_CHUNK; tx++) for (let ty = ty0; ty < ty0 + WEAR_PER_CHUNK; ty++) {
    const w = wm.get(wearKey(tx, ty)); if (!w || w < WEAR.stages[0]) continue;
    const x = (tx + 0.5) * T, y = (ty + 0.5) * T;
    let hidden = false;
    for (const b of c.b.flatMap(buildingParts)) { const q = b.dead ? b : colRect(b); if (x > q.x && x < q.x + q.w && y > q.y && y < q.y + q.h) { hidden = true; break; } }
    if (hidden) continue;
    const s = surfaceIn(c, x, y); if (s) paintWearTile(g, tx, ty, w, s);
  }
}
function drawRubbleWear(g, c, b) {                          // worn tiles over a destroyed building's rubble
  const wm = WS().wear; if (!wm.size) return;
  const T = WEAR.tile;
  for (let tx = Math.floor(b.x / T); tx * T < b.x + b.w; tx++) for (let ty = Math.floor(b.y / T); ty * T < b.y + b.h; ty++) {
    const w = wm.get(wearKey(tx, ty)); if (!w || w < WEAR.stages[0]) continue;
    const x = (tx + 0.5) * T, y = (ty + 0.5) * T;
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) paintWearTile(g, tx, ty, w, "rubble");
  }
}
