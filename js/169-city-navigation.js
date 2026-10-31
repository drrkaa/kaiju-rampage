"use strict";
// One bounded route field for all nearby ground enemies. Intact buildings block cells AND
// edges; destruction invalidates the field so newly opened routes become usable.
function citySegmentFree(x0,y0,x1,y1,r) {
  const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)/18));
  for(let i=1;i<=n;i++) if(anySolid(lerp(x0,x1,i/n),lerp(y0,y1,i/n),r)) return false;
  return true;
}
function cityRouteField() {
  const C=CITY_NAV,S=C.cell,N=C.half*2+1,P=G.P,px=Math.round(P.x/S),py=Math.round(P.y/S),version=G.navVersion||0;
  let f=G.cityNav;
  if(f && f.version===version && Math.abs(f.px-px)<2 && Math.abs(f.py-py)<2 && G.t<f.until) return f;
  f={px,py,version,until:G.t+C.refresh,n:N,x0:(px-C.half)*S,y0:(py-C.half)*S,walk:new Uint8Array(N*N),cost:new Int16Array(N*N)};
  f.cost.fill(-1);
  let start=-1,best=Infinity;
  for(let y=0;y<N;y++) for(let x=0;x<N;x++) {
    const i=y*N+x,wx=f.x0+x*S,wy=f.y0+y*S;
    if(anySolid(wx,wy,C.clearance)) continue;
    f.walk[i]=1;
    const d=(wx-P.x)**2+(wy-P.y)**2;
    if(d<best && citySegmentFree(P.x,P.y,wx,wy,3)){best=d;start=i;}
  }
  if(start>=0) {
    const queue=new Int32Array(N*N);let head=0,tail=1;queue[0]=start;f.cost[start]=0;
    while(head<tail) {
      const i=queue[head++],x=i%N,y=Math.floor(i/N);
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const xx=x+dx,yy=y+dy,j=yy*N+xx;
        if(xx<0||yy<0||xx>=N||yy>=N||!f.walk[j]||f.cost[j]>=0) continue;
        if(anySolid(f.x0+(x+dx*.5)*S,f.y0+(y+dy*.5)*S,C.clearance)) continue;
        f.cost[j]=f.cost[i]+1;queue[tail++]=j;
      }
    }
  }
  G.cityNav=f;return f;
}
function cityRouteDirection(e,mx,my) {
  const P=G.P,dx=P.x-e.x,dy=P.y-e.y,d=Math.hypot(dx,dy);
  if(d<140 || mx*dx+my*dy<=0) return null;
  if(e.routeCheck===undefined || e.routeCheck<G.t || e.routeVersion!==(G.navVersion||0)) {
    e.routeCheck=G.t+CITY_NAV.losEvery;e.routeVersion=G.navVersion||0;
    e.routeBlocked=!citySegmentFree(e.x,e.y,P.x,P.y,e.r+2);
  }
  if(!e.routeBlocked) return null;
  const f=cityRouteField(),S=CITY_NAV.cell,N=f.n,x=Math.round((e.x-f.x0)/S),y=Math.round((e.y-f.y0)/S);
  let best=-1,score=Infinity;
  for(let yy=y-1;yy<=y+1;yy++) for(let xx=x-1;xx<=x+1;xx++) {
    const i=yy*N+xx;if(xx<0||yy<0||xx>=N||yy>=N||f.cost[i]<0) continue;
    const wx=f.x0+xx*S,wy=f.y0+yy*S,s=f.cost[i]*S+Math.hypot(wx-e.x,wy-e.y);
    if(s<score && citySegmentFree(e.x,e.y,wx,wy,e.r+2)){score=s;best=i;}
  }
  if(best<0) return null;
  let target=best;
  // Smooth along several reachable nodes without cutting a building corner.
  for(let k=0;k<4;k++) {
    const x=best%N,y=Math.floor(best/N);let next=-1;
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const xx=x+dx,yy=y+dy,i=yy*N+xx;
      if(xx>=0&&yy>=0&&xx<N&&yy<N&&f.cost[i]>=0&&f.cost[i]<f.cost[best] && (next<0||f.cost[i]<f.cost[next])) next=i;
    }
    if(next<0) break;
    best=next;
    if(citySegmentFree(e.x,e.y,f.x0+best%N*S,f.y0+Math.floor(best/N)*S,e.r+2)) target=best;
    else break;
  }
  const tx=f.x0+target%N*S-e.x,ty=f.y0+Math.floor(target/N)*S-e.y,l=Math.hypot(tx,ty);
  return l>3 ? {x:tx/l,y:ty/l} : null;
}
