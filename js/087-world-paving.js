"use strict";
// Seeded mixed paving slabs, confined to each lot; roads and collision stay aligned.
function drawPaving(g, x, y, w, h, bx, by) {
  const rng = mulberry32(bx * 8147 ^ by * 19391 ^ 793), nx = Math.ceil(w / 20), ny = Math.ceil(h / 20), T = 20, used = new Set();
  g.lineWidth = 1; g.strokeStyle = "rgba(45,47,50,.22)";
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (used.has(j * nx + i)) continue;
    let sw = rng() < .55 && i < nx - 1 ? 2 : 1, sh = rng() < .4 && j < ny - 1 ? 2 : 1;
    if (used.has(j * nx + i + 1)) sw = 1;
    if (sh === 2) for (let k = 0; k < sw; k++) if (used.has((j + 1) * nx + i + k)) sh = 1;
    for (let yy = 0; yy < sh; yy++) for (let xx = 0; xx < sw; xx++) used.add((j + yy) * nx + i + xx);
    g.fillStyle = `rgba(255,255,255,${rng() * .055})`; g.fillRect(x + i*T, y + j*T, Math.min(sw*T,w-i*T), Math.min(sh*T,h-j*T));
    g.strokeRect(x + i*T, y + j*T, Math.min(sw*T,w-i*T), Math.min(sh*T,h-j*T));
  }
}
