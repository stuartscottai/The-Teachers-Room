export const PLINKO_VALUES = [10, 20, 30];
export const PLINKO_PEG_STYLES = ['arcade','jelly','neon','rivet','crystal'] as const;
export type PlinkoPegStyle = typeof PLINKO_PEG_STYLES[number];
export const plinkoPegStyle = (round:number):PlinkoPegStyle => PLINKO_PEG_STYLES[Math.max(0,Math.floor(round)-1)%PLINKO_PEG_STYLES.length];
export const PLINKO_POCKET_LEFT = 44;
export const PLINKO_POCKET_WIDTH = 472;
export const PLINKO_FLOOR_Y = 578;
export const PLINKO_ROOF_Y = 532;
export function plinkoRoundLayout(roundIndex: number) {
  const round = Math.max(0, Math.floor(roundIndex));
  const size = Math.min(8, 5 + round);
  return { rows: size, columns: size, entryCount: 10, pocketCount: 3 + round };
}
export const entryX = (entry: number, count = 10) => 44 + (entry + .5) * (472 / count);
export const entryScreenX = (entry: number, count = 10) => projectPlinkoPoint({x:entryX(entry, count),y:80}).x;
export const plinkoPocketCenter = (pocket: number, count: number) => PLINKO_POCKET_LEFT + (pocket + .5) * PLINKO_POCKET_WIDTH / count;
export const plinkoPocketAt = (x: number, count: number) => Math.max(0, Math.min(count - 1, Math.floor((x - PLINKO_POCKET_LEFT) / (PLINKO_POCKET_WIDTH / count))));
export const PLINKO_CHIP_RADIUS = 9.5;
export const PLINKO_PEG_RADIUS = 8;
export const PLINKO_COLLISION_RADIUS = PLINKO_CHIP_RADIUS + PLINKO_PEG_RADIUS;
export const PLINKO_MIN_X = 44;
export const PLINKO_MAX_X = 516;
export const PLINKO_SHAPES = ['square', 'triangle', 'star', 'smile', 'logo'] as const;
export const PLINKO_BONUSES = ['two-balls', 'bouncy', 'dynamite', 'lizard', 'chicken', 'doll', 'dragon', 'tornado', 'sonic', 'blob'] as const;
export const PLINKO_LIZARD_REACH = 105;
export type PlinkoBonus = typeof PLINKO_BONUSES[number];
export type PlinkoShape = typeof PLINKO_SHAPES[number];
export type PlinkoPeg = { x: number; y: number; kind: 'blue' | 'red' | 'gold' };
export type PlinkoRail = { side: 'left' | 'right'; top: number; bottom: number; kind: 'boost'; zigzags: number };
export type PlinkoAppearance = 'face' | 'bouncy' | 'dynamite' | 'lizard' | 'chicken' | 'egg' | 'doll' | 'doll-left' | 'doll-right' | 'dragon' | 'tornado' | 'sonic' | 'blob';
export type PlinkoEffect = { kind: 'blast' | 'tongue' | 'fire' | 'vortex' | 'blob-grow' | 'blob-burst'; x:number; y:number; tx:number; ty:number; time:number; duration:number; anchor?:number; targets?:Array<{x:number;y:number}> };
/** Relative skin coordinates are shared by physics and the live 3D mesh. */
export type PlinkoBlobSkin = { points:Array<{x:number;y:number}>; phase:'falling'|'growing'|'startled'|'deflating'|'deflated'; growth:number; reactionAt?:number; burst?:{x:number;y:number;time:number}; contacts:number[] };
export const PLINKO_DUMPLING_REACTION=.55;
export const PLINKO_DUMPLING_DEFLATION=.24;
export const PLINKO_DUMPLING_AIRTIME=6;
export const PLINKO_BLOB_NODES=48;
type BlobNode={r:number;v:number};
export function plinkoBlobWallContact(center:{x:number;y:number},points:Array<{x:number;y:number}>,walls:Array<Array<{x:number;y:number}>>){
 for(const [rail,wall] of walls.entries())for(let j=1;j<wall.length;j++)for(let i=0;i<points.length;i++){
  const a={x:center.x+points[i].x,y:center.y+points[i].y},q=points[(i+1)%points.length],b={x:center.x+q.x,y:center.y+q.y},c=wall[j-1],d=wall[j];
  const rx=b.x-a.x,ry=b.y-a.y,sx=d.x-c.x,sy=d.y-c.y,cross=rx*sy-ry*sx;
  if(Math.abs(cross)<.000001)continue;
  const u=((c.x-a.x)*sy-(c.y-a.y)*sx)/cross,v=((c.x-a.x)*ry-(c.y-a.y)*rx)/cross;
  if(u>=0&&u<=1&&v>=0&&v<=1)return {x:a.x+u*rx,y:a.y+u*ry,rail};
 }
 return null;
}
export type PlinkoFrame = { x:number; y:number; hits:number; redHits:number; pegUnits:number; peg:number; rotation:number; rail:number; railHits:number; landing:number; removed:number[]; time:number; brokenAt:number[]; roof:number; roofHits:number; pocket:number; appearance:PlinkoAppearance; scale:number; exitEligible:boolean; fuse:number; blob?:PlinkoBlobSkin; effect?:PlinkoEffect };
export type PlinkoPhysicsOptions = { bonus?:PlinkoBonus|null; rails?:PlinkoRail[]; startTime?:number; balls?:number; entryCount?:number; pocketCount?:number };
// Stars reveal distinct random choices; selecting one consumes the whole offer.
export function plinkoBonusOffers(stars:number,random=Math.random):PlinkoBonus[] {
 const pool=[...PLINKO_BONUSES];
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 return pool.slice(0,Math.max(0,Math.min(pool.length,Math.floor(stars))));
}
export function plinkoPocketStars(roundIndex:number,count:number):number[] {
 const emptyCount=Math.max(1,count-Math.round(count*.75));
 const empty=new Set(Array.from({length:emptyCount},(_,i)=>(Math.floor((i+.5)*count/emptyCount)+Math.max(0,roundIndex))%count));
 return Array.from({length:count},(_,i)=>empty.has(i)?0:1+(i+Math.max(0,roundIndex))%3);
}

export function projectPlinkoPoint({ x, y }: { x: number; y: number }) {
  return { x: 280 + (x - 280) * .82, y: 50 + (y - 40) * .92,
    depth: Math.max(0, Math.min(1, (y - 532) / (PLINKO_FLOOR_Y - 532))) };
}


export function plinkoLandingSink(landing:number){
 const t=Math.min(1,Math.max(0,(landing-.48)/.52));
 return t*t*(3-2*t);
}

export type PlinkoChipPose = {x:number;y:number;rotation:number;scale:number;landing?:number;pocket?:number};
/** The same nested transforms as the chip SVG, including its final sink. */
export function plinkoChipAttachment(sample:PlinkoChipPose,localX:number,localY:number){
 const p=projectPlinkoPoint(sample),r=sample.rotation*Math.PI/180;
 const sink=plinkoLandingSink(sample.landing??0),shrink=1-sink*.5;
 const x=localX*sample.scale,y=localY*sample.scale;
 return {x:p.x+(x*Math.cos(r)-y*Math.sin(r))*shrink,y:p.y+sink*26+(x*Math.sin(r)+y*Math.cos(r))*(1-p.depth*.4)*shrink,opacity:1-sink};
}
export const PLINKO_DRAGON_MOUTH={x:2.8,y:.65};
/** Shared by the visible jet and peg collisions: a growing, directed cone. */
export function plinkoDragonFireJet(sample:PlinkoChipPose,effect:PlinkoEffect|undefined,time:number){
 if(!effect||effect.kind!=='fire'||(sample.pocket??-1)>=0)return null;
 const age=time-effect.time;
 if(age<=0||age>=effect.duration)return null;
 const mouth=plinkoChipAttachment(sample,PLINKO_DRAGON_MOUTH.x,PLINKO_DRAGON_MOUTH.y),r=sample.rotation*Math.PI/180;
 const reach=Math.min(1,age/.12)*Math.min(1,(effect.duration-age)/.16);
 const flicker=1+.035*Math.sin(age*83);
 return {...mouth,dx:Math.cos(r),dy:Math.sin(r),length:140*reach*flicker,halfWidth:(4+22*reach)*flicker,age,progress:age/effect.duration};
}
export function plinkoFireContains(jet:NonNullable<ReturnType<typeof plinkoDragonFireJet>>,position:{x:number;y:number},radius=0){
 const dx=position.x-jet.x,dy=position.y-jet.y,along=dx*jet.dx+dy*jet.dy,across=Math.abs(dx*jet.dy-dy*jet.dx);
 return along>=-radius&&along<=jet.length+radius&&across<=2+jet.halfWidth*Math.max(0,along)/Math.max(1,jet.length)+radius;
}

function insidePolygon(x: number, y: number, points: number[][]) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inShape(shape: PlinkoShape, x: number, y: number) {
  if (shape === 'square') return Math.abs(x) <= .94 && Math.abs(y) <= .94;
  if (shape === 'triangle') return insidePolygon(x, y, [[0, -1.05], [1.08, .98], [-1.08, .98]]);
  if (shape === 'star') {
    const points = Array.from({ length: 10 }, (_, i) => {
      const angle = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .48 : 1.12;
      return [Math.cos(angle) * r, Math.sin(angle) * r];
    });
    return insidePolygon(x, y, points);
  }
  const radius = Math.hypot(x, y);
  if (shape === 'smile') return (radius > .82 && radius < 1.08)
    || Math.hypot(x - .36, y + .28) < .17 || Math.hypot(x + .36, y + .28) < .17
    || (y > .08 && Math.abs(Math.hypot(x, y - .02) - .56) < .14);
  // The app's logo: graduation cap inside its circular yellow badge.
  return (radius > .92 && radius < 1.1)
    || insidePolygon(x, y, [[0, -.7], [.88, -.3], [0, .12], [-.88, -.3]])
    || (Math.abs(x) < .57 && y > .16 && y < .43)
    || (Math.abs(x - .82) < .1 && y > -.25 && y < .68);
}

export function makePlinkoPegs(layout: number): PlinkoPeg[] {
  const index = ((layout % 5) + 5) % 5;
  const pegs: PlinkoPeg[] = [];
  const {rows, columns} = plinkoRoundLayout(layout);
  const spacing = 350 / (columns - 1);
  for (let row = 0; row < rows; row++) {
    const count = columns - row % 2;
    for (let col = 0; col < count; col++) {
      const x = 105 + col * spacing + (row % 2 ? spacing / 2 : 0), y = 160 + row * (316 / (rows - 1));
      const featured = inShape(PLINKO_SHAPES[index], (x - 280) / 205, (y - 318) / 170);
      const red = (row * columns + col + index * 3) % 9 === 0;
      pegs.push({ x, y, kind: red ? 'red' : featured ? 'gold' : 'blue' });
    }
  }
  return pegs;
}

// Shared by rendering and collision detection: timing affects the actual contact.
export function plinkoPegPosition(peg: PlinkoPeg, index: number, time: number) {
  return { x: peg.x + Math.sin(time * 1.7 + Math.floor(index / 5) * .65) * 6, y: peg.y };
}
export function plinkoPegVelocity(index: number, time: number) {
  return Math.cos(time * 1.7 + Math.floor(index / 5) * .65) * 10.2;
}
export function plinkoWallPoints(side:'left'|'right',zigzags=1) {
  const count=Math.max(1,Math.min(5,zigzags));
  return Array.from({length:count*2+1},(_,i)=>({x:side==='left'?(i%2?88:44):(i%2?472:516),y:100+i*420/(count*2)}));
}
export function makePlinkoRails(roundIndex=0):PlinkoRail[] {
  const zigzags=Math.min(5,Math.max(1,Math.floor(roundIndex)+1));
  return [{side:'left',top:100,bottom:520,kind:'boost',zigzags},{side:'right',top:100,bottom:520,kind:'boost',zigzags}];
}

export function plinkoRoundValues(roundIndex: number, increase = 50, random = Math.random): number[] {
  const values = Array.from({length:plinkoRoundLayout(roundIndex).pocketCount}, (_, i) => (i + 1) * 10 + roundIndex * increase);
  if (roundIndex > 0) for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

export function applyPlinkoRail(_kind:PlinkoRail['kind'],speed:number,verticalSpeed:number,inward:number) {
 return {vx:inward*Math.min(340,Math.max(220,Math.abs(speed)*1.9)),vy:Math.max(-190,Math.min(verticalSpeed,-145))};
}
export function plinkoDropScore(drop:{pegUnits:number;pocket:number;exitEligible?:boolean},values:number[],pegPoints:number,_bonus?:PlinkoBonus|null) {
 const pocketPoints=drop.exitEligible!==false&&drop.pocket>=0?(values[drop.pocket]??0):0;
 const pegScore=drop.pegUnits*pegPoints;
 return {pegScore,pocketPoints,total:pegScore+pocketPoints};
}

// A single timeline owns pegs, box lids and every spawned body. Helper eggs
// and doll halves score peg contacts but never receive box points or stars.
export function simulatePlinkoTurn(pegs:PlinkoPeg[],entry:number,random=Math.random,options:PlinkoPhysicsOptions={}) {
 const dt=1/120,bonus=options.bonus,rails=options.rails??makePlinkoRails(0),startTime=options.startTime??0;
 const pocketCount=options.pocketCount??3,entryCount=options.entryCount??10,pocketWidth=PLINKO_POCKET_WIDTH/pocketCount;
 let removed:number[]=[],brokenAt:number[]=Array(pocketCount).fill(-1);
 const gone=new Set<number>();
 const appearance:PlinkoAppearance=bonus&&bonus!=='two-balls'?bonus:'face';
 type Body={x:number;y:number;vx:number;vy:number;hits:number;redHits:number;pegUnits:number;rotation:number;railHits:number;roofHits:number;frames:PlinkoFrame[];delay:number;pocket:number;floorAt:number;floorX:number;floorRotation:number;appearance:PlinkoAppearance;scale:number;radius:number;exitEligible:boolean;finished:boolean;nextAbility:number;laid:number;generation:number;exploded:boolean;tether?:{index:number;until:number;length:number};effect?:PlinkoEffect;abilityUses:number;blobAt?:number;blobReaction?:{at:number;time:number;x:number;y:number;rail:number;points:Array<{x:number;y:number}>;growth:number};blobLaunched?:boolean;blobBurstAt?:number;blobTouches?:Map<number,number>;blobNodes?:BlobNode[];blobSkin?:PlinkoBlobSkin;blobBurst?:{x:number;y:number;time:number}};
 const states:Body[]=[];
 const spawn=(x:number,y:number,vx:number,vy:number,delay:number,kind:PlinkoAppearance,scale=1,eligible=true,generation=0)=>{
  const b:Body={x,y,vx,vy,hits:0,redHits:0,pegUnits:0,rotation:0,railHits:0,roofHits:0,frames:[],delay,pocket:-1,floorAt:-1,floorX:0,floorRotation:0,appearance:kind,scale,radius:PLINKO_CHIP_RADIUS*scale,exitEligible:eligible,finished:false,nextAbility:delay+.4,laid:0,generation,exploded:false,abilityUses:0};
  states.push(b);return b;
 };
 for(let i=0;i<(options.balls??(bonus==='two-balls'?2:1));i++)spawn(entryX(entry,entryCount),80,(random()-.5)*48,0,i*.55,appearance);
 if(appearance==='sonic'){states[0].vx=entry<5?390:-390;states[0].vy=190;}
 const walls=rails.map(r=>plinkoWallPoints(r.side,r.zigzags));
 const destroy=(b:Body,index:number)=>{
  if(gone.has(index))return false;
  gone.add(index);removed=[...gone];b.hits++;
  if(pegs[index].kind==='red'){b.redHits++;b.pegUnits-=2;}else b.pegUnits++;
  return true;
 };
 const near=(b:Body,time:number,radius:number)=>pegs.map((p,index)=>({...plinkoPegPosition(p,index,time),index})).filter(p=>!gone.has(p.index)&&Math.hypot(p.x-b.x,p.y-b.y)<=radius).sort((a,z)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(z.x-b.x,z.y-b.y));
 for(let step=0;step<7200;step++){
  const elapsed=step*dt,time=startTime+elapsed;
  for(const b of states){
   if(b.finished||elapsed+.0001<b.delay)continue;
   let peg=-1,rail=-1,roof=-1,landing=0;
   const age=elapsed-b.delay;
   if(b.appearance==='chicken')while(b.laid<10&&age>=.25+b.laid*.12){
    const n=b.laid++,angle=-Math.PI+.25+n*Math.PI/10;
    spawn(b.x,b.y+8,Math.cos(angle)*150,Math.sin(angle)*125,elapsed,'egg',.47,false);b.abilityUses++;
   }
   if(b.appearance==='dynamite'&&!b.exploded&&age>=3){
    b.exploded=true;b.abilityUses++;const targets=near(b,time,125);targets.forEach(p=>destroy(b,p.index));
    b.effect={kind:'blast',x:b.x,y:b.y,tx:b.x,ty:b.y,time,duration:1.15,targets};
    if(b.floorAt<0)b.vy=Math.min(b.vy,-100);
   }
   if(b.floorAt<0){
    if((b.appearance==='lizard'||b.appearance==='dragon')&&elapsed>=b.nextAbility){
     b.nextAbility=elapsed+(b.appearance==='lizard'?1.1:.92);b.abilityUses++;
     const targets=near(b,time,b.appearance==='lizard'?PLINKO_LIZARD_REACH-8:130);
     const latch=b.appearance==='lizard'?targets.find(p=>p.y<b.y-22&&Math.hypot(p.x-b.x,p.y-b.y)>45):undefined;
     const aim=latch??targets[0]??{x:b.x+(b.vx>=0?1:-1)*(PLINKO_LIZARD_REACH-10),y:b.y+20};
     if(b.appearance==='lizard'){
      if(latch){
       b.tether={index:latch.index,until:elapsed+.68,length:Math.min(PLINKO_LIZARD_REACH-7,Math.hypot(latch.x-b.x,latch.y-b.y))};
       b.vx+=(b.vx>=0?1:-1)*95;b.vy*=.6;
      }else if(targets[0])destroy(b,targets[0].index);
      b.effect={kind:'tongue',x:b.x,y:b.y,tx:aim.x,ty:aim.y,time,duration:.85,anchor:latch?.index};
     }
     else {b.rotation=Math.atan2((aim.y-b.y)*.92,(aim.x-b.x)*.82)*180/Math.PI;b.effect={kind:'fire',x:b.x,y:b.y,tx:aim.x,ty:aim.y,time,duration:.62};}
    }
    if(b.appearance==='tornado'){
     const target=near(b,time,110)[0];
     if(target){const dx=target.x-b.x,dy=target.y-b.y,d=Math.hypot(dx,dy)||1;b.vx+=dx/d*480*dt;b.vy+=dy/d*480*dt;
      if(d<58&&elapsed>=b.nextAbility){destroy(b,target.index);b.nextAbility=elapsed+.12;b.abilityUses++;b.vx-=dx/d*85;b.vy-=dy/d*85;b.effect={kind:'vortex',x:b.x,y:b.y,tx:target.x,ty:target.y,time,duration:.3,targets:[target]};}
     }
    }
   }
   if(b.tether){
    const tether=b.tether,anchor=plinkoPegPosition(pegs[tether.index],tether.index,time);
    if(b.effect)b.effect={...b.effect,tx:anchor.x,ty:anchor.y};
    if(elapsed>=tether.until || b.floorAt>=0 || gone.has(tether.index)){
     destroy(b,tether.index);b.tether=undefined;
     if(b.floorAt<0){b.vx+=(b.vx>=0?1:-1)*40;b.vy=Math.min(b.vy,55);}
    }
   }
   let inflating=false;
   if(b.appearance==='blob'&&b.floorAt<0){
    if(b.blobAt===undefined&&b.y>=295){b.blobAt=elapsed;b.blobTouches=new Map();b.vx=0;b.vy=0;b.rotation=0;}
    const reaction=b.blobReaction;
    if(reaction&&b.blobBurstAt===undefined&&elapsed-reaction.at>=PLINKO_DUMPLING_REACTION){
     b.blobBurstAt=elapsed;b.blobBurst={x:reaction.x,y:reaction.y,time};b.abilityUses++;
     b.effect={kind:'blob-burst',x:reaction.x,y:reaction.y,tx:b.x,ty:b.y,time,duration:1.15};
    }
    inflating=b.blobAt!==undefined&&(b.blobBurstAt===undefined||elapsed-b.blobBurstAt<PLINKO_DUMPLING_DEFLATION);
    if(inflating&&!reaction)b.x+=(280-b.x)*(1-Math.exp(-dt*2));
    if(b.blobBurstAt!==undefined&&!inflating){
     if(!b.blobLaunched){b.blobLaunched=true;b.vx=0;b.vy=-370;}
     const flight=elapsed-b.blobBurstAt-PLINKO_DUMPLING_DEFLATION;
     if(flight<PLINKO_DUMPLING_AIRTIME){
      // Escaping air drives loops, beginning upwards, then dwindles before gravity wins.
      const air=1-Math.max(0,flight-3.8)/(PLINKO_DUMPLING_AIRTIME-3.8);
      const direction=reaction!.x<b.x?1:-1,angle=-Math.PI/2+direction*flight*4.1;
      const speed=110+air*260,steer=1-Math.exp(-dt*9);
      let vx=Math.cos(angle)*speed,vy=Math.sin(angle)*speed;
      // Keep the balloon in the playfield while it still has air, including after impacts.
      vx+=Math.max(0,100-b.x)*9-Math.max(0,b.x-460)*9;
      vy+=Math.max(0,130-b.y)*10-Math.max(0,b.y-425)*12;
      b.vx+=(vx-b.vx)*steer;b.vy+=(vy-b.vy)*steer;
     }
    }
   }
   if(b.floorAt>=0){
    landing=Math.min(1,(elapsed-b.floorAt)/1.1);
    const settle=landing*landing*(3-2*landing),bounce=Math.min(1,landing/.65),hop=10*Math.sin(Math.PI*bounce)**2*Math.exp(-2*bounce);
    b.x=b.floorX+(plinkoPocketCenter(b.pocket,pocketCount)-b.floorX)*settle;b.y=PLINKO_FLOOR_Y-hop;b.rotation=b.floorRotation+70*settle;
    if(landing>=1&&(b.appearance!=='dynamite'||(b.exploded&&age>=4.15)))b.finished=true;
   }else if(age>0&&!inflating){
    const previousY=b.y;
    if(b.vy>0&&b.y>=PLINKO_ROOF_Y-b.radius&&brokenAt[plinkoPocketAt(b.x,pocketCount)]>=0){b.vy=Math.min(b.vy,145);b.vx*=.985;}
    const balloonPowered=b.appearance==='blob'&&b.blobBurstAt!==undefined&&elapsed-b.blobBurstAt-PLINKO_DUMPLING_DEFLATION<PLINKO_DUMPLING_AIRTIME;
    const speeding=b.appearance==='sonic'&&age<5.5&&b.roofHits===0;
    b.vy+=(speeding||balloonPowered?0:b.appearance==='dynamite'&&!b.exploded?360:540)*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.rotation+=b.vx*dt/(b.radius||1)*180/Math.PI;
    if(b.appearance==='dragon')b.rotation=b.effect?.kind==='fire'&&time-b.effect.time<b.effect.duration?Math.atan2((b.effect.ty-b.effect.y)*.92,(b.effect.tx-b.effect.x)*.82)*180/Math.PI:Math.max(-25,Math.min(25,b.vx*.1));
    if(b.appearance==='lizard')b.rotation=Math.max(-30,Math.min(30,b.vx*.12));
    if(b.tether){
     const anchor=plinkoPegPosition(pegs[b.tether.index],b.tether.index,time),dx=b.x-anchor.x,dy=b.y-anchor.y,d=Math.hypot(dx,dy)||1;
     if(d>b.tether.length){
      const nx=dx/d,ny=dy/d,outward=b.vx*nx+b.vy*ny;
      b.x=anchor.x+nx*b.tether.length;b.y=anchor.y+ny*b.tether.length;
      if(outward>0){b.vx-=outward*nx;b.vy-=outward*ny;}
     }
    }
    for(let w=0;w<walls.length;w++)for(let segment=0;segment<walls[w].length-1;segment++){
     const a=walls[w][segment],z=walls[w][segment+1],sx=z.x-a.x,sy=z.y-a.y;
     const t=Math.max(0,Math.min(1,((b.x-a.x)*sx+(b.y-a.y)*sy)/(sx*sx+sy*sy))),cx=a.x+sx*t,cy=a.y+sy*t;
     if(Math.hypot(b.x-cx,b.y-cy)>=b.radius)continue;
     const inward=rails[w].side==='left'?1:-1,length=Math.hypot(sx,sy),nx=sy/length*inward,ny=-sx/length*inward,approach=b.vx*nx+b.vy*ny;
     b.x=cx+nx*(b.radius+.2);b.y=cy+ny*(b.radius+.2);
     if(approach>=0)continue;
     b.vx-=1.85*approach*nx;b.vy-=1.85*approach*ny;const impact=applyPlinkoRail('boost',b.vx,b.vy,inward);b.vx=impact.vx;b.vy=impact.vy;rail=w;b.railHits++;
    }
    b.x=Math.max(PLINKO_MIN_X,Math.min(PLINKO_MAX_X,b.x));
    for(let index=0;index<pegs.length;index++){
     if(gone.has(index)||b.tether?.index===index)continue;
     const p=plinkoPegPosition(pegs[index],index,time),pv=plinkoPegVelocity(index,time),dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy),radius=b.radius+PLINKO_PEG_RADIUS;
     if(d>=radius)continue;
     let nx=d>.001?dx/d:.1,ny=d>.001?dy/d:-1;if(Math.abs(nx)<.08&&ny<0){nx=b.vx<0?-.14:.14;ny=-Math.sqrt(1-nx*nx);}
     b.x=p.x+nx*(radius+.1);b.y=p.y+ny*(radius+.1);const approach=(b.vx-pv)*nx+b.vy*ny;
     if(approach<0){const rebound=b.appearance==='bouncy'?1.06:.8;b.vx-=(1+rebound)*approach*nx;b.vy-=(1+rebound)*approach*ny;}
     b.vx=Math.max(-320,Math.min(320,b.vx));b.vy=Math.max(-300,b.vy);destroy(b,index);peg=index;
     if(b.appearance==='doll'&&b.generation<5){
      b.exitEligible=false;b.finished=true;landing=1;b.abilityUses++;
      const next=b.generation+1,scale=Math.max(.44,1-next*.1);
      spawn(b.x-4,b.y,-120,-95,elapsed,'doll-left',b.scale*.65,false);
      spawn(b.x+4,b.y,120,-95,elapsed,'doll-right',b.scale*.65,false);
      spawn(b.x,b.y,Math.max(-65,Math.min(65,b.vx)),60,elapsed,'doll',scale,true,next);
      break;
     }
    }
    if(speeding){const speed=Math.hypot(b.vx,b.vy)||1;b.vx=b.vx/speed*435;b.vy=b.vy/speed*435;}
    if(b.appearance==='sonic')b.rotation=age*1100;
    if(b.y<80){b.y=80;b.vy=Math.abs(b.vy);}
    if(!b.finished){
     if(b.vy>0&&previousY+b.radius<=PLINKO_ROOF_Y&&b.y+b.radius>=PLINKO_ROOF_Y){
      const box=plinkoPocketAt(b.x,pocketCount);if(brokenAt[box]<0){brokenAt=[...brokenAt];brokenAt[box]=time;roof=box;b.roofHits++;b.y=PLINKO_ROOF_Y-b.radius-.2;b.vy=-Math.max(280,Math.min(390,Math.abs(b.vy)*.85));if(Math.abs(b.vx)<70)b.vx=(random()<.5?-1:1)*105;}
     }
     if(b.y+b.radius>=PLINKO_ROOF_Y)for(let divider=1;divider<pocketCount;divider++){
      const wall=PLINKO_POCKET_LEFT+divider*pocketWidth,clearance=b.radius+1;
      if(Math.abs(b.x-wall)<clearance){const side=b.x>=wall?1:-1;b.x=wall+side*clearance;b.vx=side*Math.abs(b.vx)*.5;}
     }
     if(b.y>=PLINKO_FLOOR_Y){b.y=PLINKO_FLOOR_Y;b.floorAt=elapsed;b.floorX=b.x;b.floorRotation=b.rotation;b.pocket=plinkoPocketAt(b.x,pocketCount);}
    }
   }
   if(b.appearance==='blob'&&b.blobReaction&&inflating){
    const reaction=b.blobReaction,deflating=b.blobBurstAt!==undefined;
    const progress=deflating?Math.min(1,(elapsed-b.blobBurstAt!)/PLINKO_DUMPLING_DEFLATION):0;
    const collapse=progress*progress*(3-2*progress);
    const points=reaction.points.map((point,i)=>{
     const angle=i*Math.PI*2/PLINKO_BLOB_NODES,c=Math.cos(angle),s=Math.sin(angle),r=1/Math.hypot(c/12,s/7);
     const q={x:point.x*(1-collapse)+c*r*collapse,y:point.y*(1-collapse)+s*r*collapse};
     b.blobNodes![i]={r:Math.hypot(q.x,q.y),v:0};return q;
    });
    b.blobSkin={points,phase:deflating?'deflating':'startled',growth:reaction.growth,reactionAt:reaction.time,burst:b.blobBurst,contacts:[]};
   }else if(b.appearance==='blob'){
    const growing=inflating,growth=growing?Math.max(0,elapsed-b.blobAt!):0,deflated=b.blobBurstAt!==undefined;
    const width=growing?PLINKO_CHIP_RADIUS+growth*43:deflated?12:PLINKO_CHIP_RADIUS;
    const height=growing?PLINKO_CHIP_RADIUS+growth*23:deflated?7:PLINKO_CHIP_RADIUS;
    b.blobNodes??=Array.from({length:PLINKO_BLOB_NODES},()=>({r:PLINKO_CHIP_RADIUS,v:0}));
    const targets=growing?near(b,time,width+PLINKO_PEG_RADIUS):[];
    const touching=targets.filter(p=>{
     const angle=(Math.atan2(p.y-b.y,p.x-b.x)+Math.PI*2)%(Math.PI*2),node=angle/(Math.PI*2)*PLINKO_BLOB_NODES,i=Math.floor(node),t=node-i;
     const r=b.blobNodes![i].r*(1-t)+b.blobNodes![(i+1)%PLINKO_BLOB_NODES].r*t;
     return b.blobTouches!.has(p.index)||Math.hypot(p.x-b.x,p.y-b.y)<r+PLINKO_PEG_RADIUS;
    });
    for(const p of touching){
     if(!b.blobTouches!.has(p.index))b.blobTouches!.set(p.index,elapsed);
     if(elapsed-b.blobTouches!.get(p.index)!>=.32)destroy(b,p.index);
    }
    // A damped spring ring: pegs hold back the skin until they snap, then it recoils.
    const previous=b.blobNodes.map(n=>n.r),contacts=touching.filter(p=>!gone.has(p.index));
    const points=b.blobNodes.map((node,i)=>{
     const angle=i*Math.PI*2/PLINKO_BLOB_NODES,c=Math.cos(angle),s=Math.sin(angle);
     const ellipse=1/Math.hypot(c/width,s/height);
     const wobble=1+(growing?.035:.08)*Math.sin(angle*3+time*4.2)+.025*Math.cos(angle*5-time*3.1);
     const crownAngle=Math.atan2(Math.sin(angle+Math.PI/2),Math.cos(angle+Math.PI/2));
     const crown=deflated?0:height*(growing?.16:.25)*Math.exp(-Math.pow(crownAngle/.24,2));
     let target=ellipse*wobble+crown;
     for(const p of contacts){
      const dx=p.x-b.x,dy=p.y-b.y,along=dx*c+dy*s,across=Math.abs(dx*s-dy*c);
      if(along>0&&across<PLINKO_PEG_RADIUS+6)target=Math.min(target,Math.max(5,along-Math.sqrt(Math.max(0,(PLINKO_PEG_RADIUS+3)**2-across**2))));
     }
     const neighbors=(previous[(i+PLINKO_BLOB_NODES-1)%PLINKO_BLOB_NODES]+previous[(i+1)%PLINKO_BLOB_NODES])/2;
     node.v+=((target-node.r)*180+(neighbors-node.r)*85-node.v*13)*dt;
     node.r=Math.max(3,node.r+node.v*dt);
     // Vertical movement makes a small travelling squash wave in the free skin.
     const squash=growing?1:1+Math.min(.15,Math.abs(b.vy)*.00035)*Math.sin(time*9);
     return {x:c*node.r*squash,y:s*node.r/squash};
    });
    if(growing){
     const contact=plinkoBlobWallContact(b,points,walls);
     b.effect={kind:'blob-grow',x:b.x,y:b.y,tx:b.x,ty:b.y,time,duration:dt*3,targets:contacts};
     if(contact){
      // Hold the full-size silhouette for an "oh no" look before the pop.
      b.blobReaction={...contact,at:elapsed,time,points,growth};rail=contact.rail;b.railHits++;
      b.vx=0;b.vy=0;
     }
    }
    b.blobSkin={points,phase:b.blobReaction&&!deflated?'startled':deflated?'deflated':growing?'growing':'falling',growth,reactionAt:b.blobReaction?.time,burst:b.blobBurst,contacts:contacts.map(p=>p.index)};
   }
   if(b.appearance==='dragon'&&b.floorAt<0){
    const jet=plinkoDragonFireJet(b,b.effect,time);
    if(jet)for(let index=0;index<pegs.length;index++){
     if(gone.has(index))continue;
     const position=projectPlinkoPoint(plinkoPegPosition(pegs[index],index,time));
     if(plinkoFireContains(jet,position,PLINKO_PEG_RADIUS*.82))destroy(b,index);
    }
   }
   if(b.effect?.kind==='tongue'&&!b.tether){const dx=b.effect.tx-b.x,dy=b.effect.ty-b.y,d=Math.hypot(dx,dy);if(d>PLINKO_LIZARD_REACH-7)b.effect={...b.effect,tx:b.x+dx/d*(PLINKO_LIZARD_REACH-7),ty:b.y+dy/d*(PLINKO_LIZARD_REACH-7)};}
   // Tiny helper bodies stop after eight seconds, without ever granting a box.
   if(!b.exitEligible&&age>=8){b.finished=true;landing=1;}
   b.frames.push({x:b.x,y:b.y,hits:b.hits,redHits:b.redHits,pegUnits:b.pegUnits,peg,rotation:b.rotation,rail,railHits:b.railHits,landing,removed,time,brokenAt,roof,roofHits:b.roofHits,pocket:b.pocket,appearance:b.appearance,scale:b.scale,exitEligible:b.exitEligible,blob:b.blobSkin,fuse:b.appearance==='dynamite'&&!b.exploded?Math.max(0,3-age):0,effect:b.effect});
  }
  if(states.every(b=>b.finished))break;
 }
 if(states.some(b=>!b.finished))throw new Error('Plinko turn did not settle');
 return states.map(b=>({frames:b.frames,pocket:b.pocket,hits:b.hits,redHits:b.redHits,pegUnits:b.pegUnits,roofHits:b.roofHits,duration:Math.max(dt,(b.frames.length-1)*dt),delay:b.delay,exitEligible:b.exitEligible,appearance:b.appearance,generation:b.generation,abilityUses:b.abilityUses}));
}
export function simulatePlinkoDrop(pegs:PlinkoPeg[],entry:number,random=Math.random,options:PlinkoPhysicsOptions={}) {
 return simulatePlinkoTurn(pegs,entry,random,{...options,balls:1})[0];
}
