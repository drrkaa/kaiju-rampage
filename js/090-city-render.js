// [js-split] ===== js/090-city-render.js: City: renderChunk (cached offscreen chunk canvases), building/rubble/roof drawing, purgeChunks =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
function renderChunk(c) {
  // Double buffered: paint into a spare canvas, then swap, so the on-screen canvas is never blank/half-painted.
  let target = c.spare;
  if (!target) { target = document.createElement("canvas"); target.width = target.height = Math.round(CHUNK * GS); }
  const g = target.getContext("2d");
  const X0 = c.cx * CHUNK, Y0 = c.cy * CHUNK;
  g.setTransform(GS, 0, 0, GS, -X0 * GS, -Y0 * GS);
  // --- asphalt, lane dashes, crosswalks
  g.fillStyle = "#42464e"; g.fillRect(X0, Y0, CHUNK, CHUNK);
  g.fillStyle = "rgba(235,200,70,.6)";
  for (let k = 0; k <= 2; k++) for (let t = 0; t < CHUNK; t += 28) {
    const m = t % BLOCK;
    if (m < 40 || m > BLOCK - 40) continue;
    g.fillRect(X0 + k * BLOCK - 1, Y0 + t, 2, 14);
    g.fillRect(X0 + t, Y0 + k * BLOCK - 1, 14, 2);
  }
  g.fillStyle = "rgba(235,235,235,.75)";
  for (let ix = 0; ix <= 2; ix++) for (let iy = 0; iy <= 2; iy++) {
    const px = X0 + ix * BLOCK, py = Y0 + iy * BLOCK;
    for (let s = -20; s <= 20; s += 8) {
      g.fillRect(px + s - 2, py - 38, 4, 10); g.fillRect(px + s - 2, py + 28, 4, 10);
      g.fillRect(px - 38, py + s - 2, 10, 4); g.fillRect(px + 28, py + s - 2, 10, 4);
    }
  }
  // --- blocks: sidewalk + lot
  for (const blk of c.blocks) {
    const x0 = blk.bx * BLOCK, y0 = blk.by * BLOCK, lx = x0 + 32, ly = y0 + 32;
    const bw = blk.bw || 1, bh = blk.bh || 1;
    // Lot boundary covers removed roads; larger lots use plans authored in world pixels.
    g.fillStyle = "#a9acb1"; g.fillRect(x0 + 24, y0 + 24, bw * BLOCK - 48, bh * BLOCK - 48);
    g.strokeStyle = "#80848a"; g.lineWidth = 2; g.strokeRect(x0 + 24, y0 + 24, bw * BLOCK - 48, bh * BLOCK - 48);
    if (blk.plan) { drawLargeLot(g, blk); continue; }
    g.save();
    const rng = mulberry32(blk.bx * 9176 + blk.by * 4421 + 7);
    if (blk.type === "build") {
      g.fillStyle = "#9a9da3"; g.fillRect(lx, ly, 160, 160);
    } else if (blk.type === "park") {          // flat grass, paths, pond; trees come from c.trees
      g.fillStyle = "#62a655"; g.fillRect(lx, ly, 160, 160);
      g.fillStyle = "rgba(255,255,255,.06)";
      for (let k = 0; k < 160; k += 32) g.fillRect(lx + k, ly, 16, 160);
      g.fillStyle = "rgba(222,206,160,.95)"; g.fillRect(lx, ly + 70, 160, 20); g.fillRect(lx + 70, ly, 20, 160);
      g.fillStyle = "rgba(160,140,100,.5)";
      for (let k = 0; k < 160; k += 10) { g.fillRect(lx + k, ly + 78, 5, 4); g.fillRect(lx + 78, ly + k, 4, 5); }
      g.fillStyle = "#79c3e6"; g.beginPath(); g.ellipse(lx + 38, ly + 38, 22, 15, 0, 0, TAU); g.fill();
      g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 2; g.stroke();
    } else if (blk.type === "parking") {
      g.fillStyle = "#4d5058"; g.fillRect(lx, ly, 160, 160);
      g.fillStyle = "rgba(255,255,255,.85)";
      for (let row = 0; row < 2; row++) for (let s = 0; s <= 10; s++)
        g.fillRect(lx + 10 + s * 14, row ? ly + 160 - 8 - 24 : ly + 8, 2, 24);
      g.fillStyle = "rgba(255,230,90,.7)"; for (let k = 0; k < 160; k += 24) g.fillRect(lx + k + 4, ly + 79, 12, 2);
    } else { // plaza: flat paving, fountain and benches as decals
      g.fillStyle = "#d3d0c4"; g.fillRect(lx, ly, 160, 160);
      g.fillStyle = "rgba(0,0,0,.06)";
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) g.fillRect(lx + i * 20, ly + j * 20, 20, 20);
      g.fillStyle = "#b9b6aa"; g.beginPath(); g.arc(lx + 80, ly + 80, 30, 0, TAU); g.fill();
      g.fillStyle = "#6fb4e0"; g.beginPath(); g.arc(lx + 80, ly + 80, 23, 0, TAU); g.fill();
      g.fillStyle = "#b8e6fa"; g.beginPath(); g.arc(lx + 80, ly + 80, 8, 0, TAU); g.fill();
      g.fillStyle = "#a07850";
      for (const [bx2, by2] of [[20, 20], [128, 20], [20, 134], [128, 134]]) g.fillRect(lx + bx2, ly + by2, 12, 6);
    }
    if (blk.type === "plaza" || blk.type === "build") drawPaving(g, lx, ly, 160, 160, blk.bx, blk.by);
    // street lights at the four sidewalk corners
    for (const [px, py] of [[x0 + 28, y0 + 28], [x0 + BLOCK - 28, y0 + 28], [x0 + 28, y0 + BLOCK - 28], [x0 + BLOCK - 28, y0 + BLOCK - 28]]) {
      g.fillStyle = "rgba(255,230,150,.16)"; g.beginPath(); g.arc(px, py, 13, 0, TAU); g.fill();
      g.fillStyle = "#c8c8c8"; g.beginPath(); g.arc(px, py, 2.5, 0, TAU); g.fill();
    }
    g.restore();
  }
  drawGroundWear(g, c);                       // worn / cracked / cratered ground (086-world-ground.js)
  // --- trees: small flat canopies (crushed ones leave a green smear)
  for (const t of c.trees) {
    if (t.dead) { g.fillStyle = "rgba(60,90,40,.45)"; g.beginPath(); g.ellipse(t.x, t.y, t.r * 0.9, t.r * 0.6, 0.5, 0, TAU); g.fill(); continue; }
    g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.arc(t.x + 2, t.y + 2, t.r, 0, TAU); g.fill();
    g.fillStyle = `hsl(${t.hue},45%,${t.lum + 4}%)`; g.beginPath(); g.arc(t.x, t.y, t.r, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,.14)"; g.beginPath(); g.arc(t.x - 1.5, t.y - 1.5, t.r * 0.5, 0, TAU); g.fill();
  }
  // --- cars
  for (const car of c.cars) {
    const x = car.x, y = car.y, w = car.w, h = car.h;
    if (car.dead) { drawWreck(g, car); continue; }
    g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(x + 2, y + 2, w, h);
    g.fillStyle = car.col; g.fillRect(x, y, w, h);
    g.fillStyle = "rgba(20,30,40,.75)";
    if (w > h) { g.fillRect(x + w * 0.3, y + 1.5, w * 0.25, h - 3); g.fillRect(x + w * 0.72, y + 1.5, w * 0.12, h - 3); }
    else { g.fillRect(x + 1.5, y + h * 0.3, w - 3, h * 0.25); g.fillRect(x + 1.5, y + h * 0.72, w - 3, h * 0.12); }
  }
  // --- building shadows first, then buildings back-to-front
  const live = c.b.filter(b => !b.dead);
  for (const b of c.b.flatMap(b => b.sections && b.sections.some(s => s.dead) ? b.sections : [b])) {
    if (b.dead) { drawRubble(g, b); drawRubbleWear(g, c, b); continue; }
    const d = b.d * (1 - BLDG_SAG * b.stage), sx = d * 1.1, sy = d * 0.8;
    g.fillStyle = "rgba(0,0,0,.45)"; g.beginPath();
    g.moveTo(b.x, b.y); g.lineTo(b.x + b.w, b.y); g.lineTo(b.x + b.w + sx, b.y + sy);
    g.lineTo(b.x + b.w + sx, b.y + b.h + sy); g.lineTo(b.x + sx, b.y + b.h + sy); g.lineTo(b.x, b.y + b.h);
    g.closePath(); g.fill();
  }
  live.sort((a, b) => (a.y + a.h) - (b.y + b.h));
  for (const b of live) drawBuilding(g, b);
  c.spare = c.canvas; c.canvas = target; c.dirty = false; c.lastRender = frameNo;
}

function drawRubble(g, b) {
  if(b.sections){for(const s of b.sections)drawSectionRubble(g,s);return;}
  if(b.parent){drawSectionRubble(g,b);return;}
  // flat, light, low debris: clearly walkable
  g.fillStyle = "#6d675f"; g.fillRect(b.x, b.y, b.w, b.h);
  for (let k = 0; k < 16; k++) {
    g.fillStyle = k % 4 === 0 ? "#b07a4a" : k % 3 ? "#8a847a" : "#a59d90";
    g.fillRect(b.x + rs(b.seed, k) * (b.w - 8), b.y + rs(b.seed, k + 40) * (b.h - 6), 3 + rs(b.seed, k + 80) * 7, 2 + rs(b.seed, k + 120) * 5);
  }
  g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 1; g.setLineDash([4, 3]); g.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1); g.setLineDash([]);
}

function drawBuilding(g, b) {
  if(b.sections){drawSectionedBuilding(g,b);return;}
  drawBuildingShell(g,b);
}
function drawBuildingShell(g, b) {
  const d = b.d * (1 - BLDG_SAG * b.stage), ox = d * ROOF_OX, oy = d * ROOF_OY;
  const x = b.x, y = b.y, w = b.w, h = b.h;
  g.fillStyle = "#0c0e11"; g.fillRect(x - 3, y - 3, w + 6, h + 6);          // thick dark base: reads as a solid object
  // south wall
  g.fillStyle = b.wallS; g.beginPath();
  g.moveTo(x, y + h); g.lineTo(x + w, y + h); g.lineTo(x + w - ox, y + h - oy); g.lineTo(x - ox, y + h - oy); g.closePath(); g.fill();
  // east wall
  g.fillStyle = b.wallE; g.beginPath();
  g.moveTo(x + w, y); g.lineTo(x + w, y + h); g.lineTo(x + w - ox, y + h - oy); g.lineTo(x + w - ox, y - oy); g.closePath(); g.fill();
  g.strokeStyle = "rgba(0,0,0,.9)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 1, y + h + 1); g.lineTo(x + w + 1, y + h + 1); g.lineTo(x + w + 1, y - 1); g.stroke();
  // windows (dashed lines across the south wall)
  if (d >= 10) {
    const rows = Math.max(0, Math.min(b.floors, 4) - (b.stage >= 3 ? 2 : b.stage >= 2 ? 1 : 0));
    g.strokeStyle = b.stage ? "rgba(255,220,140,.25)" : "rgba(255,235,160,.55)"; g.lineWidth = 2.2; g.setLineDash([5, 4]);
    for (let k = 1; k <= rows; k++) {
      const f = k / (rows + 1);
      g.beginPath(); g.moveTo(x - ox * f + 3, y + h - oy * f); g.lineTo(x + w - ox * f - 3, y + h - oy * f); g.stroke();
    }
    g.setLineDash([]);
  }
  // roof
  const rx = x - ox, ry = y - oy;
  g.fillStyle = b.roof; g.fillRect(rx, ry, w, h);
  g.strokeStyle = "rgba(0,0,0,.55)"; g.lineWidth = 2; g.strokeRect(rx + 1, ry + 1, w - 2, h - 2);
  g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(rx + 1, ry + h - 1); g.lineTo(rx + 1, ry + 1); g.lineTo(rx + w - 1, ry + 1); g.stroke();   // light rim
  drawRoofDetail(g, b, rx, ry);
  drawBuildingDamage(g,b,rx,ry);
}
function drawBuildingDamage(g,b,rx,ry) {
  const {x,y,w,h}=b,d=b.d*(1-BLDG_SAG*b.stage),ox=d*ROOF_OX,oy=d*ROOF_OY;
  // staged damage (BLDG_STAGES): soot -> cracks -> broken windows / jagged holes -> big cavity + broken corner
  const st = b.stage;
  if (st >= 1) {
    g.fillStyle = "rgba(25,18,12,.4)";
    for (let k = 0; k < st * 2; k++) {
      g.beginPath(); g.ellipse(rx + rs(b.seed, k + 7) * w, ry + rs(b.seed, k + 17) * h, 4 + rs(b.seed, k) * 8, 3 + rs(b.seed, k + 3) * 6, 0, 0, TAU); g.fill();
    }
    g.strokeStyle = "rgba(0,0,0,.65)"; g.lineWidth = 1.5; g.beginPath();
    g.moveTo(rx + w * 0.2, ry); g.lineTo(rx + w * 0.5, ry + h * 0.5); g.lineTo(rx + w * 0.3, ry + h);
    g.moveTo(x + w * 0.3 - ox * 0.3, y + h - 1); g.lineTo(x + w * 0.36 - ox * 0.6, y + h - oy * 0.55);       // crack on the wall face
    if (st >= 2) {
      g.moveTo(rx + w, ry + h * 0.3); g.lineTo(rx + w * 0.5, ry + h * 0.5); g.lineTo(rx + w * 0.9, ry + h);
      g.moveTo(x + w * 0.7 - ox * 0.2, y + h - 1); g.lineTo(x + w * 0.62 - ox * 0.8, y + h - oy * 0.8);
      g.moveTo(x + w - 1, y + h * 0.3); g.lineTo(x + w - ox * 0.7, y + h * 0.1 - oy * 0.4);
    }
    g.stroke();
  }
  if (st >= 3) {                                      // jagged holes: exposed dark-brown interior with rubble inside
    g.fillStyle = "rgba(48,34,26,.92)"; jag(g, rx + w * 0.4, ry + h * 0.4, Math.min(w, h) * 0.2, b.seed, 8);
    g.fillStyle = "rgba(120,78,46,.8)"; jag(g, rx + w * 0.4, ry + h * 0.4, Math.min(w, h) * 0.1, b.seed + 5, 6);
    g.fillStyle = "rgba(38,28,22,.9)"; jag(g, x + w * 0.25 - ox * 0.5, y + h - oy * 0.5, 6, b.seed + 11, 6); jag(g, x + w * 0.65 - ox * 0.5, y + h - oy * 0.4, 5, b.seed + 17, 6);
  }
  if (st >= 4) {                                      // big cavity, second hole, broken roof corner
    g.fillStyle = "rgba(42,30,24,.95)"; jag(g, rx + w * 0.62, ry + h * 0.62, Math.min(w, h) * 0.3, b.seed + 3, 9);
    g.fillStyle = "rgba(150,95,50,.75)"; jag(g, rx + w * 0.62, ry + h * 0.62, Math.min(w, h) * 0.14, b.seed + 9, 7);
    g.fillStyle = "#6a655d"; jag(g, rx + w - 3, ry + 3, 12, b.seed + 21, 6);
  }
}
// Irregular polygon (never an axis-aligned rectangle) used for holes / broken chunks.
function jag(g, cx, cy, r, seed, n) {
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, rr = r * (0.55 + 0.45 * rs(seed, i + 90));
    if (i) g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); else g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  g.closePath(); g.fill();
}

function drawRoofDetail(g, b, rx, ry) {
  const w = b.w, h = b.h, s = b.seed;
  if (b.stage >= 3) return;
  if (b.kind === "helipad") {
    const cx = rx + w / 2, cy = ry + h / 2, r = Math.min(w, h) * 0.32;
    g.strokeStyle = "#e8e8e8"; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
    g.fillStyle = "#e8e8e8"; g.fillRect(cx - r * 0.45, cy - r * 0.5, 3, r); g.fillRect(cx + r * 0.45 - 3, cy - r * 0.5, 3, r); g.fillRect(cx - r * 0.45, cy - 1.5, r * 0.9, 3);
  } else if (b.kind === "tank") {
    const cx = rx + w * (0.3 + rs(s, 1) * 0.4), cy = ry + h * (0.3 + rs(s, 2) * 0.4);
    g.fillStyle = "#6b4f3a"; g.beginPath(); g.arc(cx, cy, 9, 0, TAU); g.fill();
    g.fillStyle = "#8a6a50"; g.beginPath(); g.arc(cx - 1.5, cy - 1.5, 6, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,.2)"; g.beginPath(); g.arc(cx - 3, cy - 3, 2.5, 0, TAU); g.fill();
  } else if (b.kind === "antenna") {
    const cx = rx + w * 0.5, cy = ry + h * 0.5;
    g.strokeStyle = "#333"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - 8, cy - 8); g.lineTo(cx + 8, cy + 8); g.moveTo(cx + 8, cy - 8); g.lineTo(cx - 8, cy + 8); g.stroke();
    g.fillStyle = "#e33"; g.beginPath(); g.arc(cx, cy, 2.5, 0, TAU); g.fill();
  } else if (b.kind === "skylight") {
    g.fillStyle = "rgba(150,200,230,.7)"; g.fillRect(rx + w * 0.25, ry + h * 0.25, w * 0.5, h * 0.5);
    g.strokeStyle = "rgba(255,255,255,.6)"; g.lineWidth = 1; g.strokeRect(rx + w * 0.25, ry + h * 0.25, w * 0.5, h * 0.5);
    g.beginPath(); g.moveTo(rx + w * 0.5, ry + h * 0.25); g.lineTo(rx + w * 0.5, ry + h * 0.75); g.stroke();
  }
  // AC units on most roofs
  const n = b.kind === "ac" ? 3 : 1;
  for (let k = 0; k < n; k++) {
    const ax = rx + 5 + rs(s, 30 + k) * (w - 22), ay = ry + 5 + rs(s, 50 + k) * (h - 18);
    g.fillStyle = "#9aa0a6"; g.fillRect(ax, ay, 12, 9);
    g.fillStyle = "#555"; g.beginPath(); g.arc(ax + 6, ay + 4.5, 3, 0, TAU); g.fill();
  }
}

function purgeChunks() {
  purgeCityLayout();
  for (const b of smokers) if (b.dead || (b.lot ? b.lot.evicted : b.chunk.evicted)) smokers.delete(b);
  for (const c of chunks.values()) if (c.canvas && frameNo - c.last > CHUNK_CANVAS_KEEP) { c.canvas = null; c.spare = null; c.dirty = true; }
  if (chunks.size > CHUNK_DATA_MAX) {
    const arr = [...chunks.entries()].sort((a, b) => a[1].last - b[1].last);
    for (let i = 0; i < arr.length - CHUNK_DATA_MAX * 0.8; i++) { arr[i][1].evicted = true; chunks.delete(arr[i][0]); }
  }
}

