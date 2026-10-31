"use strict";
// World lots are independent of the 448px rendering chunks. District rows are staggered,
// and rectangles cross chunk seams, so minor roads terminate at buildings and T-junctions.
const CITY_LAYOUT = { district: 6, halo: 40 };
const cityDistricts = new Map(), cityLots = new Map();
function cityDistrict(dx, dy) {
  const key = dx + "," + dy;
  if (cityDistricts.has(key)) return cityDistricts.get(key);
  const N = CITY_LAYOUT.district, shift = ((dy % 2) + 2) % 2 * 3, ox = dx*N + shift, oy = dy*N;
  const rng = mulberry32(dx*9187 ^ dy*39119 ^ 0x417aa), taken = new Set(), out = [];
  const add = (x,y,w,h,forceType) => {
    for(let i=x;i<x+w;i++) for(let j=y;j<y+h;j++) taken.add(j*N+i);
    out.push({ bx:ox+x, by:oy+y, bw:w, bh:h, forceType });
  };
  // Keep just the four spawn cells open. The first interrupted roads are visible immediately east/south.
  for(let j=0;j<N;j++) for(let i=0;i<N;i++) if(ox+i>=-1 && ox+i<=0 && oy+j>=-1 && oy+j<=0) add(i,j,1,1,"park");
  if(dx===0 && dy===0) { add(1,0,2,2,"build"); add(0,2,2,2,"build"); }
  const sizes = [[2,2],[2,1],[1,2],[3,1],[1,3],[1,1]];
  for(let j=0;j<N;j++) for(let i=0;i<N;i++) {
    if(taken.has(j*N+i)) continue;
    const start=Math.floor(rng()*sizes.length);
    let w=1,h=1;
    for(let k=0;k<sizes.length;k++) {
      const [ww,hh]=sizes[(start+k)%sizes.length];
      if(i+ww>N || j+hh>N) continue;
      let free=true; for(let x=i;x<i+ww;x++) for(let y=j;y<j+hh;y++) if(taken.has(y*N+x)) free=false;
      if(free) { w=ww;h=hh;break; }
    }
    add(i,j,w,h);
  }
  cityDistricts.set(key,out); return out;
}
function cityBlocksInBox(x0,y0,x1,y1) {
  const N=CITY_LAYOUT.district, out=[];
  for(let dy=Math.floor(y0/BLOCK/N);dy<=Math.floor(y1/BLOCK/N);dy++) {
    const shift=((dy%2)+2)%2*3;
    for(let dx=Math.floor((x0/BLOCK-shift)/N);dx<=Math.floor((x1/BLOCK-shift)/N);dx++) {
      for(const b of cityDistrict(dx,dy)) if(b.bx*BLOCK<x1 && (b.bx+b.bw)*BLOCK>x0 && b.by*BLOCK<y1 && (b.by+b.bh)*BLOCK>y0) out.push(b);
    }
  }
  return out;
}
function cityLot(desc) {
  const key=desc.bx+","+desc.by;
  if(cityLots.has(key)) return cityLots.get(key);
  const {bx,by,bw,bh}=desc, rng=mulberry32(bx*73856093 ^ by*19349663 ^ 0x51ed27);
  const type=desc.forceType || blockType(bx,by,rng), lot={cx:Math.floor(bx/2),cy:Math.floor(by/2),idPrefix:"lot"+bx+","+by,b:[],cars:[],trees:[],keys:new Set()};
  Object.defineProperty(lot,"dirty",{set(v){if(v) for(const k of lot.keys){const c=chunks.get(k);if(c)c.dirty=true;}},get(){return false;}});
  Object.defineProperty(lot,"evicted",{get(){return ![...lot.keys].some(k=>chunks.has(k));}});
  const blk=Object.assign({},desc,{type}), x0=bx*BLOCK,y0=by*BLOCK,lx=x0+32,ly=y0+32;
  if(bw>1 || bh>1) genLargeLot(lot,blk,rng);
  else if(type==="build") genBuildings(lot,rng,lx,ly);
  else if(type==="parking") genParking(lot,rng,lx,ly);
  else if(type==="park") genTrees(lot,bx,by,lx,ly);
  for(const b of lot.b){b.lot=lot;for(const part of b.sections||[])part.lot=lot;}
  for(let k=0;k<Math.floor(rng()*5);k++) lot.cars.push(mkCar(rng,x0+36+rng()*(bw*BLOCK-80),y0+6,22,11));
  for(let k=0;k<Math.floor(rng()*5);k++) lot.cars.push(mkCar(rng,x0+6,y0+36+rng()*(bh*BLOCK-80),11,22));
  for(const [kind,list] of [["car",lot.cars],["tree",lot.trees]]) list.forEach((o,i)=>{o.lot=lot;o.id=kind+"lot"+key+":"+i;if(bState.get(o.id)===0)o.dead=true;});
  lot.blk=blk;cityLots.set(key,lot);return lot;
}
function clearCityLayout(){cityLots.clear();cityDistricts.clear();}
function purgeCityLayout(){
  for(const [k,l] of cityLots) if(l.evicted) cityLots.delete(k);
  if(cityDistricts.size>200) cityDistricts.clear(); // deterministic metadata can be reconstructed
}
