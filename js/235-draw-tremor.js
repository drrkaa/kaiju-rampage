"use strict";
// Tremor disturbs the ground: branching fractures, broken paving and hopping debris.
// Cached city canvases include roofs and walls. Exclude their visible bounds from
// this dynamic ground pass, including each surviving bay of partially ruined buildings.
// Clip once per bay so overlapping buildings cannot punch holes in the occlusion.
// Older cached world renderers may still call this hook; Tremor draws no rings.
function drawTremorRings() {}

function clipTremorGround(x,y,r) {
  ctx.beginPath();ctx.rect(x-r,y-r,r*2,r*2);ctx.clip();
  buildingsInCircle(x,y,r+64,b=>{
    const d=b.parent?b.parent.d:b.d*(1-BLDG_SAG*b.stage);
    const ox=d*ROOF_OX,oy=d*ROOF_OY;
    const q=b.parent?{
      x:b.x-ox,y:b.y-oy,
      w:b.w+(b.col===b.parent.cols-1?ox:0),
      h:b.h+(b.row===b.parent.rows-1?oy:0)
    }:{x:b.x-ox-3,y:b.y-oy-3,w:b.w+ox+6,h:b.h+oy+6};
    ctx.beginPath();ctx.rect(x-r,y-r,r*2,r*2);ctx.rect(q.x,q.y,q.w,q.h);ctx.clip("evenodd");
  });
}
function drawTremorCracks() {
  const F = TREMOR_FX;
  for (const w of G.waves) {
    const tot = w.life + F.crackLife, fade = clamp(1 - Math.max(0, w.t - w.life * 0.4) / (tot - w.life * 0.4), 0, 1);
    ctx.save();clipTremorGround(w.x,w.y,w.max+80);
    // Small irregular patches reveal broken paving along the fractures, without a circular rim.
    for (const c of w.cracks) for (let i=1;i<c.pts.length;i+=2) {
      const p=c.pts[i];
      const x=w.x+Math.cos(c.a+p.o)*p.f,y=w.y+Math.sin(c.a+p.o)*p.f,size=5+i*1.5;
      ctx.fillStyle=`rgba(72,65,54,${.22*fade})`;ctx.beginPath();
      ctx.moveTo(x-size,y-2);ctx.lineTo(x-2,y-size*.55);ctx.lineTo(x+size*.8,y-size*.3);
      ctx.lineTo(x+size,y+3);ctx.lineTo(x+1,y+size*.5);ctx.lineTo(x-size*.7,y+size*.35);ctx.closePath();ctx.fill();
    }
    ctx.beginPath();
    for (const c of w.cracks) {
      ctx.moveTo(w.x + Math.cos(c.a) * w.max * 0.12, w.y + Math.sin(c.a) * w.max * 0.12);
      for (const p of c.pts) {
        ctx.lineTo(w.x + Math.cos(c.a + p.o) * p.f, w.y + Math.sin(c.a + p.o) * p.f);
      }
      if (c.br) { const p = c.pts[1], bx = w.x + Math.cos(c.a + p.o) * p.f, by = w.y + Math.sin(c.a + p.o) * p.f; ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(c.a + c.br) * 26, by + Math.sin(c.a + c.br) * 26); }
    }
    ctx.strokeStyle=`rgba(62,49,32,${.22*fade})`;ctx.lineWidth=5;ctx.stroke();
    ctx.strokeStyle=`rgba(25,23,20,${.75*fade})`;ctx.lineWidth=1.8;ctx.stroke();
    // Pale chipped edges give the fissures depth instead of an emitted glow.
    ctx.save();ctx.strokeStyle=`rgba(198,184,157,${.35*fade})`;ctx.lineWidth=.7;ctx.stroke();ctx.restore();
    const hopT = 0.55;                                                                           // debris chips hop and land
    if (w.t < hopT) for (const ch of w.chips) {
      const u = w.t / hopT, r = ch.r0 + ch.v * w.t, hop = 4 * u * (1 - u) * ch.h, x = w.x + Math.cos(ch.a) * r, y = w.y + Math.sin(ch.a) * r;
      ctx.fillStyle = `rgba(0,0,0,${0.25 * (1 - u)})`; ctx.fillRect(x - ch.s / 2, y - ch.s / 2, ch.s, ch.s * 0.7);
      ctx.fillStyle = `rgba(150,135,110,${1 - u * 0.6})`; ctx.fillRect(x - ch.s / 2, y - hop - ch.s / 2, ch.s, ch.s);
    }
    ctx.restore();
  }
}
