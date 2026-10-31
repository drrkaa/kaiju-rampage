"use strict";
// Large lots have native-size plans. Paths, parking bays, trees and furniture keep their scale.
function genLargeLot(lot, blk, rng) {
  const x=blk.bx*BLOCK+32,y=blk.by*BLOCK+32,w=blk.bw*BLOCK-64,h=blk.bh*BLOCK-64;
  const p=blk.plan={x,y,w,h,paths:[],ponds:[],beds:[],benches:[],bays:[],courts:[]};
  const rect=(xx,yy,ww,hh)=>({x:xx,y:yy,w:ww,h:hh});
  if(blk.type==="build") {
    if(blk.bw>1 && blk.bh>1) { // campus: central hall across the former road, annexes and courtyards
      addBuilding(lot,rng,x+8,y+(h-132)/2,w-16,132);
      addBuilding(lot,rng,x+12,y+10,92,76);addBuilding(lot,rng,x+w-104,y+10,92,76);
      addBuilding(lot,rng,x+w-108,y+h-90,96,78);
      p.paths.push(rect(x+w/2-12,y,24,h),rect(x,y+h-46,w,22));
      p.beds.push(rect(x+18,y+h-76,72,26),rect(x+114,y+h-76,72,26));
    } else if(w>h) { // distribution hall with an unscaled loading apron
      addBuilding(lot,rng,x+8,y+8,w-16,h-68);
      p.paths.push(rect(x,y+h-38,w,24));
      for(let xx=x+26;xx<x+w-30;xx+=52)p.bays.push(rect(xx,y+h-58,30,16));
    } else { // factory spine with a side service lane and small equipment buildings
      addBuilding(lot,rng,x+8,y+8,w-68,h-16);
      p.paths.push(rect(x+w-38,y,24,h));
      for(let yy=y+28;yy<y+h-40;yy+=94)addBuilding(lot,rng,x+w-56,yy,42,48);
    }
  } else if(blk.type==="parking") {
    for(let yy=y+12;yy+80<=y+h;yy+=88) {
      p.paths.push(rect(x,yy+25,w,30));
      for(let xx=x+12;xx+14<x+w-10;xx+=15)for(const off of [0,56]) {
        p.bays.push(rect(xx,yy+off,14,24));
        if(rng()<.52)lot.cars.push(mkCar(rng,xx+1.5,yy+off+1,11,22));
      }
    }
  } else if(blk.type==="park") {
    // Promenade, loop trail, small pond, sports court and trees grown around those features.
    p.paths.push(rect(x+w/2-10,y,20,h),rect(x,y+h/2-10,w,20),rect(x+28,y+28,w-56,12),rect(x+28,y+h-40,w-56,12));
    p.ponds.push({x:x+64,y:y+78,rx:30,ry:21});
    const cw=w>h?92:54,ch=w>h?54:92;
    p.courts.push(rect(x+w-cw-22,y+h-ch-22,cw,ch));
    for(let n=0;n<Math.floor(w*h/1700);n++) {
      const tx=x+14+rng()*(w-28),ty=y+14+rng()*(h-28);
      if(p.paths.some(q=>tx>q.x-9&&tx<q.x+q.w+9&&ty>q.y-9&&ty<q.y+q.h+9)||p.courts.some(q=>tx>q.x-9&&tx<q.x+q.w+9&&ty>q.y-9&&ty<q.y+q.h+9)||p.ponds.some(q=>Math.hypot((tx-q.x)/q.rx,(ty-q.y)/q.ry)<1.4))continue;
      lot.trees.push({x:tx,y:ty,r:6+rng()*4,hue:105+rng()*25,lum:30+rng()*10,dead:false});
    }
    for(let xx=x+38;xx<x+w-16;xx+=82)p.benches.push(rect(xx,y+h/2+17,14,6));
  } else { // civic square: human-size fountain, garden beds, seating and market stalls
    p.ponds.push({x:x+w/2,y:y+h/2,rx:23,ry:23});
    for(let xx=x+22;xx+62<x+w;xx+=96) {
      p.beds.push(rect(xx,y+18,62,20),rect(xx,y+h-38,62,20));
      p.benches.push(rect(xx+22,y+46,14,6),rect(xx+22,y+h-52,14,6));
    }
    if(h>220) for(let yy=y+80;yy<y+h-60;yy+=78)p.beds.push(rect(x+18,yy,22,46),rect(x+w-40,yy,22,46));
  }
}
function drawLargeLot(g,blk) {
  const p=blk.plan,{x,y,w,h}=p;
  g.fillStyle=blk.type==="park"?"#62a655":blk.type==="parking"?"#4d5058":blk.type==="plaza"?"#d3d0c4":"#9a9da3";g.fillRect(x,y,w,h);
  if(blk.type==="park") {g.fillStyle="rgba(255,255,255,.045)";for(let xx=x;xx<x+w;xx+=32)g.fillRect(xx,y,16,h);}
  if(blk.type==="plaza") drawPaving(g,x,y,w,h,blk.bx,blk.by);
  for(const q of p.paths){g.fillStyle=blk.type==="park"?"#cfbb91":blk.type==="parking"?"#42464e":"#b6b3a9";g.fillRect(q.x,q.y,q.w,q.h);}
  for(const q of p.beds){g.fillStyle="#9e9c91";g.fillRect(q.x-3,q.y-3,q.w+6,q.h+6);g.fillStyle="#547d49";g.fillRect(q.x,q.y,q.w,q.h);for(let xx=q.x+6;xx<q.x+q.w;xx+=14){g.fillStyle="#a9ac65";g.beginPath();g.arc(xx,q.y+q.h/2,3,0,TAU);g.fill();}}
  for(const q of p.ponds){g.fillStyle="#b8b5a5";g.beginPath();g.ellipse(q.x,q.y,q.rx+5,q.ry+5,0,0,TAU);g.fill();g.fillStyle="#79c3e6";g.beginPath();g.ellipse(q.x,q.y,q.rx,q.ry,0,0,TAU);g.fill();g.strokeStyle="#c1e4ed";g.lineWidth=2;g.stroke();}
  for(const q of p.benches){g.fillStyle="#856245";g.fillRect(q.x,q.y,q.w,q.h);}
  for(const q of p.bays){g.strokeStyle=blk.type==="parking"?"rgba(255,255,255,.7)":"rgba(232,201,106,.8)";g.lineWidth=1.5;g.strokeRect(q.x,q.y,q.w,q.h);}
  for(const q of p.courts){g.fillStyle="#6b8d92";g.fillRect(q.x,q.y,q.w,q.h);g.strokeStyle="#e8ded0";g.lineWidth=1.5;g.strokeRect(q.x+4,q.y+4,q.w-8,q.h-8);g.beginPath();g.moveTo(q.x,q.y+q.h/2);g.lineTo(q.x+q.w,q.y+q.h/2);g.stroke();g.beginPath();g.arc(q.x+q.w/2,q.y+q.h/2,9,0,TAU);g.stroke();}
  for(const [xx,yy] of [[x-4,y-4],[x+w+4,y-4],[x-4,y+h+4],[x+w+4,y+h+4]]){g.fillStyle="rgba(255,230,150,.16)";g.beginPath();g.arc(xx,yy,13,0,TAU);g.fill();g.fillStyle="#c8c8c8";g.beginPath();g.arc(xx,yy,2.5,0,TAU);g.fill();}
}
