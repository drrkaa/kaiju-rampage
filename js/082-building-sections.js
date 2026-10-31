"use strict";
// Large structures remain one authored building, with independently damageable bays.
const BUILDING_SECTIONS = { minSpan: 240, minArea: 30000, bay: 140 };
const buildingParts = b => b.sections || (b._parts || (b._parts = [b]));
function createBuildingSections(b) {
  const C = BUILDING_SECTIONS;
  if (Math.max(b.w,b.h)<C.minSpan || b.w*b.h<C.minArea) return;
  const cols=Math.max(1,Math.ceil(b.w/C.bay)),rows=Math.max(1,Math.ceil(b.h/C.bay));
  const parts=[],legacy=b.hp/b.maxHp,destroyed=b.dead;
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const w=b.w/cols,h=b.h/rows,maxHp=b.maxHp/(cols*rows);
    parts.push(Object.assign({},b,{id:b.id+"/bay:"+col+","+row,parent:b,col,row,x:b.x+col*w,y:b.y+row*h,w,h,
      maxHp,hp:maxHp,stage:0,dead:false,shot:-1,seed:b.seed+col*137+row*521,xpShare:buildingXp(b)/(cols*rows)}));
  }
  const hasSaved=parts.some(s=>bState.has(s.id));
  for(const s of parts){
    const saved=bState.get(s.id);s.hp=destroyed?0:saved===undefined?s.maxHp*(hasSaved?1:legacy):saved;
    s.dead=s.hp<=0;s.stage=stageOf(s);
    if(!s.dead&&s.stage>=SMOKE.minStage)smokers.add(s);
  }
  smokers.delete(b);b.sections=parts;b.cols=cols;b.rows=rows;syncBuildingSections(b);
}
function syncBuildingSections(b) {
  b.hp=b.sections.reduce((sum,s)=>sum+Math.max(0,s.hp),0);
  b.dead=b.sections.every(s=>s.dead);b.stage=stageOf(b);
}
function showSectionHealth(b) {
  for(const s of b.sections)if(!s.dead){
    s.barT=BLDG_HPBAR_TIME;
    if(!s.inList&&G.dmgList.length<80){s.inList=true;G.dmgList.push(s);}
  }
}
function drawSectionedBuilding(g,b) {
  for(const s of b.sections)if(s.dead)drawSectionRubble(g,s);
  const live=b.sections.filter(s=>!s.dead);
  if(!live.length)return;
  // Preserve the original continuous roof, windows and decoration across intact bays.
  g.save();g.beginPath();
  for(const s of live){
    // Internal cuts end at the roof seam; only the outer bays include the walls.
    const ox=b.d*ROOF_OX,oy=b.d*ROOF_OY;
    g.rect(s.x-ox,s.y-oy,s.w+(s.col===b.cols-1?ox:0),s.h+(s.row===b.rows-1?oy:0));
  }
  g.clip();drawBuildingShell(g,Object.assign({},b,{sections:null,stage:0}));g.restore();
  for(const s of live){
    const d=b.d,rx=s.x-d*ROOF_OX,ry=s.y-d*ROOF_OY;
    drawBuildingDamage(g,s,rx,ry);
    // Subtle expansion joints make the structural bays readable before they break.
    g.strokeStyle="rgba(20,24,30,.16)";g.lineWidth=1;g.setLineDash([5,4]);
    if(s.col>0){g.beginPath();g.moveTo(rx,ry+3);g.lineTo(rx,ry+s.h-3);g.stroke();}
    if(s.row>0){g.beginPath();g.moveTo(rx+3,ry);g.lineTo(rx+s.w-3,ry);g.stroke();}
    g.setLineDash([]);
    for(const [dc,dr,edge] of [[-1,0,"left"],[1,0,"right"],[0,-1,"top"],[0,1,"bottom"]]){
      const neighbor=b.sections.find(p=>p.col===s.col+dc&&p.row===s.row+dr);
      if(neighbor&&neighbor.dead)drawBrokenBuildingEdge(g,s,edge);
    }
  }
}
function drawSectionRubble(g,s) {
  const {x,y,w,h,seed}=s;
  g.fillStyle="#56524c";g.fillRect(x,y,w,h);
  // Exposed foundation, floor joists and fractured roof slabs stay in the footprint.
  g.strokeStyle="#32312f";g.lineWidth=5;
  for(let xx=x+12;xx<x+w;xx+=27){g.beginPath();g.moveTo(xx,y+4);g.lineTo(xx+rs(seed,xx)*8,y+h-5);g.stroke();}
  for(let k=0;k<28;k++){
    const px=x+7+rs(seed,k)*(w-14),py=y+7+rs(seed,k+40)*(h-14),r=4+rs(seed,k+80)*11;
    g.fillStyle=k%4===0?"#3b332c":k%3?"#928c80":"#bab2a3";jag(g,px,py,r,seed+k,5);
    if(k%3===0){g.strokeStyle="rgba(226,215,195,.45)";g.lineWidth=1;g.beginPath();g.moveTo(px-r*.5,py);g.lineTo(px+r*.4,py-r*.5);g.stroke();}
  }
  // Low broken foundation stubs and bent rebar distinguish ruins from bare paving.
  g.strokeStyle="#a59d8c";g.lineWidth=3;g.beginPath();g.moveTo(x+3,y+h*.3);g.lineTo(x+4,y+h-5);g.lineTo(x+w*.4,y+h-4);g.stroke();
  g.strokeStyle="#393b3b";g.lineWidth=1.3;
  for(let k=0;k<7;k++){const px=x+10+rs(seed,k+120)*(w-20),py=y+10+rs(seed,k+150)*(h-20);g.beginPath();g.moveTo(px,py);g.lineTo(px+3,py-8);g.lineTo(px+8,py-6);g.stroke();}
}
function drawBrokenBuildingEdge(g,s,edge) {
  const d=s.parent?s.parent.d:s.d*(1-BLDG_SAG*s.stage),ox=d*ROOF_OX,oy=d*ROOF_OY;
  const vertical=edge==="left"||edge==="right",length=vertical?s.h:s.w;
  const x=s.x-ox+(edge==="right"?s.w:0),y=s.y-oy+(edge==="bottom"?s.h:0);
  const sign=edge==="left"||edge==="top"?1:-1;
  // Rotate local +Y toward world +X for top/bottom seams. The opposite rotation
  // drew these edges one whole bay to the left on tall, multi-row buildings.
  g.save();g.translate(x,y);if(!vertical)g.rotate(-Math.PI/2);
  const dir=vertical?sign:-sign;
  // Dark exposed interior with an uneven, pale fractured lip at roof height.
  g.fillStyle="#39312b";g.beginPath();g.moveTo(-dir*3,0);
  const points=[];
  for(let i=0;i<=Math.ceil(length/9);i++){const t=Math.min(length,i*9),px=dir*(5+rs(s.seed,i+200)*9);points.push([px,t]);g.lineTo(px,t);}
  g.lineTo(-dir*3,length);g.closePath();g.fill();
  g.strokeStyle="#bdb5a3";g.lineWidth=2;g.beginPath();points.forEach(([px,py],i)=>i?g.lineTo(px,py):g.moveTo(px,py));g.stroke();
  g.strokeStyle="#5a5043";g.lineWidth=4;
  for(let t=8;t<length;t+=21){g.beginPath();g.moveTo(dir*2,t);g.lineTo(-dir*(8+rs(s.seed,t)*8),t+3);g.stroke();}
  g.strokeStyle="#33383b";g.lineWidth=1;
  for(let t=14;t<length;t+=19){g.beginPath();g.moveTo(dir*4,t);g.lineTo(-dir*11,t-4);g.lineTo(-dir*15,t);g.stroke();}
  g.restore();
}
