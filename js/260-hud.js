// [js-split] ===== js/260-hud.js: HUD: slotBox, drawHUD =====
// [js-split] Classic script (no modules): shares one global scope with all other js/ files; load order = tag order in index.html.
"use strict"; // [js-split] (the directive is per-file; the original single script was strict)
// One HUD slot box: label, name, cooldown, locked state and active highlight.
// Temporary action lockouts stay in combat logic; they do not flash over the HUD.
function slotBox(x, y, label, name, color, cdFrac, cdText, locked, active, busy, lvText, iconId) {
  if (PLATFORM.touch && TOUCH_CFG.hideHudSlots) return;      // touch: the on-screen buttons show the same info
  const S = 62;
  ctx.fillStyle = locked ? "rgba(0,0,0,.45)" : "rgba(20,25,40,.8)"; ctx.fillRect(x, y, S, S);
  ctx.strokeStyle = locked ? "rgba(255,255,255,.2)" : color; ctx.lineWidth = active ? 4 : 2;
  if (locked) ctx.setLineDash([4, 4]);
  ctx.strokeRect(x, y, S, S); ctx.setLineDash([]);
  if (locked) { if (iconId) drawIcon(iconId, x + 13, y + 4, 36, color, 0.18); txt("?", x + S / 2, y + 38, 26, "rgba(255,255,255,.25)"); }
  else {
    if (iconId) drawIcon(iconId, x + 13, y + 4, 36, color);
    txt(name, x + S / 2, iconId ? y + 54 : y + 34, iconId ? 10 : 11, "#fff");
    if (cdFrac > 0) {
      ctx.fillStyle = "rgba(0,0,0,.65)"; ctx.fillRect(x, y, S, S * cdFrac);
      txt(cdText, x + S / 2, y + 48, 14, "#fff");
    } else { ctx.fillStyle = color; ctx.globalAlpha = 0.25; ctx.fillRect(x, y + S - 6, S, 6); ctx.globalAlpha = 1; }

  }
  if (lvText && !locked) txt(lvText, x + 4, y + 12, 10, "#fff", "left");
  txt(label, x + S / 2, y + S + 14, 12, locked ? "#777" : "#ddd");
}

function drawHUD() {
  const P = G.P, act = P.action, at = act ? act.type : null;
  bar(16, 16, 250, 20, P.hp / P.maxHp, P.hp / P.maxHp > 0.3 ? "#d33" : "#f55");
  txt(`HP ${Math.ceil(P.hp)} / ${P.maxHp}`, 141, 32, 14, "#fff");
  bar(16, 42, 250, 12, P.xp / xpNeed(P.lvl), "#4e8");
  if (G.xpPulse > 0) { ctx.fillStyle = `rgba(200,255,220,${0.5 * G.xpPulse})`; ctx.fillRect(16, 42, 250 * clamp(P.xp / xpNeed(P.lvl), 0, 1), 12); ctx.strokeStyle = `rgba(200,255,220,${0.8 * G.xpPulse})`; ctx.lineWidth = 2; ctx.strokeRect(15, 41, 252, 14); }
  const passive = UPGRADES.find(u => u.damagePassive && P.up[u.id]);
  if (passive) { drawIcon(passive.id, 16, 94, 22, passive.color); txt(passive.name + " Lv " + P.up[passive.id], 46, 111, 12, passive.color, "left"); }
  const hasB = hasBreath(), ready = hasB && P.charge >= BREATH.minStart;   // the charge meter itself is drawn bottom-centre by drawRampageHud (265)
  txt(`LV ${P.lvl}`, 16, 94, 16, "#cfe", "left");
  txtShadow(fmtTime(G.t), W / 2, 36, 28, "#fff");
  if (G.nextBoss < BOSS_TIMES.length)
    txt(`Next rival: ${BOSSES[G.nextBoss].name} at ${fmtTime(BOSS_TIMES[G.nextBoss])}`, W / 2, 56, 12, "rgba(255,255,255,.6)", "center", false);
  txt(`Stomped: ${G.kills}`, W - 16, 32, 18, "#fff", "right");
  txt(`Buildings flattened: ${G.destroyed}`, 16, 74, 14, "#fff", "left");
  txt(muted ? "M: sound OFF" : "M: sound on", W - 16, 72, 11, "rgba(255,255,255,.4)", "right", false);

  // --- bottom-centre: LMB swipe, RMB breath, Q, E, SPACE
  const S = 62, gap = 10, total = 5 * S + 4 * gap, x0 = W / 2 - total / 2, y0 = H - S - 34, busy = !!act;
  slotBox(x0, y0, "LMB", "Swipe", "#fa4", P.swipeCd > 0 ? P.swipeCd / swipeCdNow() : 0, P.swipeCd.toFixed(1), false, at === "swipe", busy, "Lv " + swipeLevel(), "swipe");
  slotBox(x0 + S + gap, y0, "RMB", "Breath", "#4cf", ready ? 0 : 1 - P.charge / BREATH.minStart, Math.floor(P.charge) + "%", !hasB, at === "breath", busy, hasB ? "Lv " + breathLevel() : "", "breath");
  if (act && act.type === "breath") {              // wind-up / exhale indicator on the RMB slot
    const bx = x0 + S + gap, k = act.phase === "wind" ? act.t / BREATH.windup : act.phase === "exhale" ? 1 - act.t / BREATH.exhale : 1;
    ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(bx, y0 - 8, S, 6);
    ctx.fillStyle = act.phase === "wind" ? "#bff" : act.phase === "exhale" ? "#9ab" : "#fff"; ctx.fillRect(bx, y0 - 8, S * clamp(k, 0, 1), 6);
    txt(act.phase === "wind" ? "CHARGING" : act.phase === "exhale" ? "EXHALE" : "FIRING", bx + S / 2, y0 - 12, 10, "#cde");
  }
  for (let i = 0; i < 3; i++) {
    const id = P.slots[i], bx = x0 + (2 + i) * (S + gap);
    if (!id) slotBox(bx, y0, SLOT_LABELS[i], "", "#fff", 0, "", true, false, false);
    else {
      const heavy = id === "superlaser" || id === "mega", spec = heavy ? heavyChargeSpec(id) : null;
      const fraction = heavy ? clamp(1 - P.charge / spec.minCharge, 0, 1) : P.cds[id] > 0 ? P.cds[id] / abilCd(id) : 0;
      const text = heavy ? Math.floor(P.charge) + "/" + spec.cost : P.cds[id].toFixed(1);
      slotBox(bx, y0, SLOT_LABELS[i], ABILS[id].name.split(" ").pop(), ABILS[id].color, fraction, text, false, heavy ? at === "mega" : at === id, busy, heavy ? spec.cost + "%" : "", id);
    }
  }
  drawRampageHud();                                // charge meter, boss timeline, tease / unlock banners (265)
  // boss bars
  const bs = bossesAlive();
  bs.forEach((b, i) => {
    const y = 78 + i * 34;
    bar(W / 2 - 220, y, 440, 16, b.hp / b.maxHp, b.inv ? "#999" : b.def.id === "omega" ? "#e43" : "#a4c", "rgba(0,0,0,.6)");
    for (const f of b.def.phaseAt) { ctx.fillStyle = "#fff"; ctx.fillRect(W / 2 - 220 + 440 * f, y - 2, 2, 20); }   // phase markers
    txt(b.def.name + `  (phase ${b.phase}/${b.def.phaseAt.length + 1})` + (b.tired ? "  TIRED!" : ""), W / 2, y + 30, 13, b.tired ? "#ffe27a" : "#fbd");
  });
  // off-screen boss arrows
  for (const b of bs) {
    const sx = W / 2 + (b.x - G.cam.x) * G.zoom, sy = H / 2 + (b.y - G.cam.y) * G.zoom;
    if (sx > 30 && sx < W - 30 && sy > 30 && sy < H - 30) continue;
    const a = Math.atan2(sy - H / 2, sx - W / 2), ex = clamp(W / 2 + Math.cos(a) * W, 40, W - 40), ey = clamp(H / 2 + Math.sin(a) * H, 40, H - 40);
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = "#f55";
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -12); ctx.lineTo(-10, 12); ctx.fill(); ctx.restore();
  }
  if (bs.length) { ctx.fillStyle = `rgba(${bs[0].def.tint},${0.06 * clamp((1 - G.zoom) / (1 - BOSS_ZOOM), 0, 1)})`; ctx.fillRect(0, 0, W, H); }   // subtle per-boss arena tint
  // boss intro: dim edges + cinematic bars
  if (G.introT > 0 && G.introBoss) {
    const k = Math.min(1, G.introT / 0.4, (2.6 - G.introT) / 0.3 + 0.01);
    ctx.fillStyle = `rgba(120,0,0,${0.18 * k})`; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, 54 * k); ctx.fillRect(0, H - 54 * k, W, 54 * k);
    ctx.globalAlpha = k; txtShadow("WARNING: " + G.introBoss.name, W / 2, H / 2 - 120, 44, "#ff6a5a");
    txt(G.introBoss.sub, W / 2, H / 2 - 88, 18, "#fff", "center", false); ctx.globalAlpha = 1;
  } else if (G.banner) {
    const a = Math.min(1, G.banner.t / 0.5, (G.banner.max - G.banner.t) / 0.2 + 0.2);
    ctx.globalAlpha = clamp(a, 0, 1); txtShadow(G.banner.text, W / 2, H * 0.25, 40, "#ffd24a"); ctx.globalAlpha = 1;
  }
  if (G.hurtT > 0) { ctx.fillStyle = `rgba(255,0,0,${G.hurtT * 0.5})`; ctx.fillRect(0, 0, W, H); }
  if (state === "play") {                              // crosshair
    ctx.strokeStyle = P.failT > 0 ? "#f55" : ready ? "#bff" : "#fff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 11, 0, TAU);
    ctx.moveTo(mouse.x - 18, mouse.y); ctx.lineTo(mouse.x - 6, mouse.y); ctx.moveTo(mouse.x + 6, mouse.y); ctx.lineTo(mouse.x + 18, mouse.y);
    ctx.moveTo(mouse.x, mouse.y - 18); ctx.lineTo(mouse.x, mouse.y - 6); ctx.moveTo(mouse.x, mouse.y + 6); ctx.lineTo(mouse.x, mouse.y + 18);
    ctx.stroke();
  }
}

