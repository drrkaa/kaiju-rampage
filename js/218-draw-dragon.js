"use strict";
// Reference-inspired golden, three-headed winged kaiju. Uses drawBoss's pose transform.
function drawDragonBoss(e, pose, flash, scale) {
  const g = bossDragonGeometry(e, pose), phase = e.phase || 1;
  const gold = flash ? "#fff" : e.def.body, edge = flash ? "#fff" : "#d5b456";
  const bone = flash ? "#fff" : "#fff0b1", dark = flash ? "#fff" : "#6d5426";
  const fill = color => { ctx.fillStyle = color; ctx.fill(); ctx.stroke(); };
  if (phase >= 2) {
    ctx.fillStyle = `rgba(255,210,65,${.035 + phase * .015})`;
    ctx.beginPath(); ctx.ellipse(-3, 0, 91, 85, 0, 0, TAU); ctx.fill();
  }
  // Tails separate at the pelvis and curl independently.
  for (const q of g.tails) {
    ctx.beginPath();
    for (const side of [-1, 1]) for (let j=0;j<=16;j++) {
      const k=side<0?j/16:1-j/16, p=dragonCurvePoint(q,k), w=(1-k)*7+.5;
      if (side<0&&!j)ctx.moveTo(p.x,p.y-w);else ctx.lineTo(p.x,p.y+side*w);
    }
    ctx.closePath();fill(gold);
    for(let j=2;j<10;j++){
      const p=dragonCurvePoint(q,j/10);
      ctx.beginPath();ctx.moveTo(p.x+3,p.y);ctx.lineTo(p.x-2,p.y+q.side*(6-j*.3));ctx.lineTo(p.x-5,p.y);ctx.closePath();fill(edge);
    }
  }
  for(const side of [-1,1]){
    const stride=Math.sin(e.walkA||0)*side*6;
    ctx.beginPath();ctx.ellipse(-13+stride,side*27,17,10,side*-.3,0,TAU);fill(gold);
    for(let j=0;j<3;j++){ctx.beginPath();ctx.moveTo(-2+stride,side*25+j*side*3);ctx.lineTo(8+stride,side*25+j*side*3);ctx.lineTo(-1+stride,side*27+j*side*3);ctx.closePath();fill(bone);}
  }
  // Membranes have long finger bones and scalloped trailing edges.
  for(const wing of g.wings){
    const p=wing.points,side=wing.side;
    ctx.beginPath();ctx.moveTo(wing.rootX,wing.rootY);ctx.lineTo(p[0].x,p[0].y);ctx.lineTo(p[1].x,p[1].y);
    for(let i=2;i<p.length;i++)ctx.quadraticCurveTo(p[i].x+12,(Math.abs(p[i].y)-17)*side,p[i].x,p[i].y);
    ctx.closePath();fill(flash?"#fff":"#b79c3e");
    for(let i=1;i<5;i++){
      const a=p[i],b=p[i+1];ctx.fillStyle=i%2?"rgba(255,231,112,.18)":"rgba(64,42,16,.12)";
      ctx.beginPath();ctx.moveTo(wing.rootX,wing.rootY);ctx.lineTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.closePath();ctx.fill();
    }
    ctx.strokeStyle=edge;ctx.lineWidth=2.2;
    for(let i=1;i<5;i++){
      ctx.beginPath();ctx.moveTo(wing.rootX,wing.rootY);ctx.quadraticCurveTo(19-i*7,side*(35+i*2),p[i].x,p[i].y);ctx.stroke();
      ctx.strokeStyle="rgba(255,240,166,.25)";ctx.lineWidth=.8;
      for(let j=1;j<5;j++){
        const k=j/5;ctx.beginPath();ctx.moveTo(lerp(wing.rootX,p[i].x,k),lerp(wing.rootY,p[i].y,k));
        ctx.lineTo(lerp(wing.rootX,p[i+1].x,k),lerp(wing.rootY,p[i+1].y,k));ctx.stroke();
      }
      ctx.strokeStyle=edge;ctx.lineWidth=2.2;
    }
    ctx.strokeStyle="#201a13";ctx.lineWidth=2.4/scale;
    ctx.beginPath();ctx.moveTo(p[1].x-2,p[1].y-side*6);ctx.lineTo(p[1].x+1,p[1].y+side*9);ctx.lineTo(p[1].x+3,p[1].y-side*3);ctx.closePath();fill(bone);
  }
  ctx.beginPath();ctx.ellipse(-2,0,37,29,0,0,TAU);fill(gold);
  // Dense shoulder scales, darker flanks, and a pale dorsal ridge.
  for(const side of [-1,1]){
    ctx.fillStyle="rgba(49,34,12,.2)";ctx.beginPath();ctx.ellipse(-3,side*20,28,8,side*.2,0,TAU);ctx.fill();
    for(let row=0;row<3;row++)for(let col=0;col<6;col++){
      const x=-26+col*9+(row%2)*4,y=side*(6+row*6);
      ctx.strokeStyle="rgba(65,45,17,.32)";ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x,y+side*3);ctx.lineTo(x+4,y);ctx.stroke();
    }
  }
  ctx.strokeStyle="#201a13";ctx.lineWidth=2.4/scale;
  for(let i=0;i<7;i++){
    const x=-30+i*8;ctx.beginPath();ctx.moveTo(x-4,-4);ctx.lineTo(x+2,-9);ctx.lineTo(x+5,0);ctx.lineTo(x+2,9);ctx.lineTo(x-4,4);ctx.closePath();fill(edge);
  }
  // Three independently swaying necks; scale bands follow their center curves.
  for(const q of g.heads){
    ctx.strokeStyle="#201a13";ctx.lineWidth=17;
    ctx.beginPath();ctx.moveTo(q.x0,q.y0);ctx.bezierCurveTo(q.cx1,q.cy1,q.cx2,q.cy2,q.x,q.y);ctx.stroke();
    ctx.strokeStyle=gold;ctx.lineWidth=14;ctx.stroke();
    ctx.strokeStyle="rgba(255,238,164,.45)";ctx.lineWidth=2.5;ctx.stroke();
    for(let j=1;j<10;j++){
      const p=dragonCurvePoint(q,j/10),next=dragonCurvePoint(q,Math.min(1,j/10+.01));
      const a=Math.atan2(next.y-p.y,next.x-p.x),nx=-Math.sin(a),ny=Math.cos(a);
      ctx.strokeStyle=dark;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x+nx*5,p.y+ny*5);ctx.lineTo(p.x-nx*5,p.y-ny*5);ctx.stroke();
    }
    ctx.save();ctx.translate(q.x+(pose.rear<0?4:0),q.y);ctx.rotate(q.angle);
    ctx.strokeStyle="#201a13";ctx.lineWidth=2.4/scale;
    for(const side of [-1,1]){
      ctx.beginPath();ctx.moveTo(-3,side*7);ctx.quadraticCurveTo(-11,side*19,-22,side*17);ctx.lineTo(-10,side*6);ctx.closePath();fill(bone);
      ctx.beginPath();ctx.moveTo(0,side*8);ctx.lineTo(-9,side*14);ctx.lineTo(5,side*8);ctx.closePath();fill(edge);
    }
    const gape=clamp(pose.mouth,0,1),jawTip=27+5*gape;
    // A separate lower jaw projects out in a roar; the skull stays readable from above.
    ctx.beginPath();ctx.moveTo(1,-8);ctx.lineTo(18,-8-3*gape);ctx.lineTo(jawTip,-5-4*gape);
    ctx.quadraticCurveTo(jawTip+4,0,jawTip,5+4*gape);ctx.lineTo(18,8+3*gape);ctx.lineTo(1,8);ctx.closePath();fill(edge);
    ctx.beginPath();ctx.moveTo(-9,-7);ctx.lineTo(-3,-12);ctx.lineTo(6,-11);ctx.lineTo(15,-7);
    ctx.lineTo(25,-5);ctx.lineTo(28,-2);ctx.lineTo(28,2);ctx.lineTo(25,5);ctx.lineTo(15,7);
    ctx.lineTo(6,11);ctx.lineTo(-3,12);ctx.lineTo(-9,7);ctx.closePath();fill(gold);
    // Dorsal nose ridge and paired brows separate the eyes from the long snout.
    ctx.fillStyle=edge;ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(2,-4);ctx.lineTo(21,-2);
    ctx.lineTo(26,0);ctx.lineTo(21,2);ctx.lineTo(2,4);ctx.closePath();ctx.fill();
    for(const side of [-1,1]){
      ctx.fillStyle="#281c0e";ctx.beginPath();ctx.moveTo(-2,side*7);ctx.lineTo(6,side*4);
      ctx.lineTo(10,side*6);ctx.lineTo(3,side*10);ctx.closePath();ctx.fill();
      ctx.fillStyle=phase>=3?"#fff7da":"#ff7239";ctx.beginPath();ctx.ellipse(4,side*7,2.8,1.3,side*-.3,0,TAU);ctx.fill();
      ctx.strokeStyle=edge;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-3,side*5);ctx.lineTo(4,side*3);ctx.lineTo(10,side*4);ctx.stroke();
      ctx.fillStyle=dark;ctx.beginPath();ctx.ellipse(23,side*2.7,1.6,.9,side*-.3,0,TAU);ctx.fill();
    }
    ctx.strokeStyle="#201a13";ctx.lineWidth=1.4/scale;
    // Mouth wraps around the nose. Side tooth rows remain visible in the overhead view.
    ctx.beginPath();ctx.moveTo(10,-6);ctx.quadraticCurveTo(19,-5,26,-3);
    ctx.lineTo(jawTip,-4-4*gape);ctx.quadraticCurveTo(jawTip+3,0,jawTip,4+4*gape);
    ctx.lineTo(26,3);ctx.quadraticCurveTo(19,5,10,6);ctx.lineTo(18,0);ctx.closePath();fill(flash?"#fff":"#281a16");
    if(gape>.12){
      ctx.fillStyle=flash?"#fff":"#a66551";ctx.beginPath();ctx.moveTo(23,-1.8*gape);
      ctx.quadraticCurveTo(jawTip+1,-3*gape,jawTip,0);ctx.quadraticCurveTo(jawTip+1,3*gape,23,1.8*gape);ctx.closePath();ctx.fill();
    }
    for(const side of [-1,1]){
      ctx.fillStyle=bone;
      for(let j=0;j<4;j++){
        const x=13+j*4,y=side*(5-j*.35+gape*1.6),fang=j===1?3.6:2.2;
        ctx.beginPath();ctx.moveTo(x-1.4,y);ctx.lineTo(x+.6,y-side*fang);ctx.lineTo(x+1.7,y+side*.5);ctx.closePath();ctx.fill();
      }
      // A larger lower fang becomes visible as the jaw opens.
      if(gape>.2){ctx.beginPath();ctx.moveTo(jawTip-2,side*(4+4*gape));ctx.lineTo(jawTip-1,side*2);ctx.lineTo(jawTip+1,side*(3+4*gape));ctx.closePath();ctx.fill();}
    }
    // Keep charging light inside the throat so it doesn't hide teeth and jaw contours.
    if(pose.glow>0){ctx.save();ctx.globalCompositeOperation="lighter";
      ctx.fillStyle=`rgba(255,218,92,${pose.glow*.55})`;ctx.beginPath();ctx.ellipse(jawTip-3,0,3.5,2+gape,0,0,TAU);ctx.fill();ctx.restore();}
    ctx.restore();
  }
  ctx.strokeStyle="#201a13";ctx.lineWidth=2.4/scale;
}
