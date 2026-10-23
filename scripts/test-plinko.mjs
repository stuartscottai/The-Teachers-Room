import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const module={exports:{}};
new Function('module','exports',ts.transpileModule(fs.readFileSync('utils/plinko.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(module,module.exports);
const p=module.exports;
assert.deepEqual(Array.from({length:12},(_,i)=>p.plinkoPegStyle(i+1)),['arcade','jelly','neon','rivet','crystal','arcade','jelly','neon','rivet','crystal','arcade','jelly']);
let seed=2701;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
for(let stars=0;stars<=10;stars++)for(let i=0;i<20;i++){
 const offers=p.plinkoBonusOffers(stars,random);
 assert.equal(offers.length,Math.min(p.PLINKO_BONUSES.length,stars));assert.equal(new Set(offers).size,offers.length);
 assert.ok(offers.every(b=>p.PLINKO_BONUSES.includes(b)));
}
// Settling uses a monotonic eased sink with no jump at either end.
assert.equal(p.plinkoLandingSink(.48),0);assert.equal(p.plinkoLandingSink(1),1);
assert.ok(p.plinkoLandingSink(.4801)<.000001);
assert.ok(1-p.plinkoLandingSink(.9999)<.000001);
let previousSink=0;for(let i=0;i<=100;i++){const sink=p.plinkoLandingSink(i/100);assert.ok(sink>=previousSink);previousSink=sink;}
// Fire follows its mouth and only burns the growing, forward-facing stream.
const firePose={x:280,y:250,rotation:0,scale:1,pocket:-1};
const fireEffect={kind:'fire',x:280,y:250,tx:400,ty:250,time:0,duration:.62};
const shortJet=p.plinkoDragonFireJet(firePose,fireEffect,.03),fullJet=p.plinkoDragonFireJet(firePose,fireEffect,.2);
assert.ok(fullJet.length>shortJet.length*2,'Flame grows out from the mouth');
assert.ok(p.plinkoFireContains(fullJet,{x:fullJet.x+fullJet.length*.7,y:fullJet.y}));
assert.ok(!p.plinkoFireContains(fullJet,{x:fullJet.x-20,y:fullJet.y}),'No burning behind the dragon');
assert.ok(!p.plinkoFireContains(fullJet,{x:fullJet.x+fullJet.length*.5,y:fullJet.y+fullJet.halfWidth*2}),'No burning outside the stream');
assert.equal(p.plinkoDragonFireJet({...firePose,pocket:0},fireEffect,.2),null,'Breath stops inside a box');
const turnedJet=p.plinkoDragonFireJet({...firePose,rotation:90},fireEffect,.2);
assert.ok(p.plinkoFireContains(turnedJet,{x:turnedJet.x,y:turnedJet.y+turnedJet.length*.7}),'Rotated breath burns in its visible direction');
let turns=0,bodies=0,maxDuration=0,wallHits=0;
const abilities={};
let lizardSwings=0,limitedTongues=0;
for(let round=0;round<8;round++){
 const pegs=p.makePlinkoPegs(round),rails=p.makePlinkoRails(round),original=JSON.stringify(pegs),layout=p.plinkoRoundLayout(round),size=Math.min(8,round+5);
 assert.equal(layout.rows,size);assert.equal(layout.columns,size);assert.equal(layout.entryCount,10);assert.equal(layout.pocketCount,3+round);
 assert.equal(pegs.length,Array.from({length:size},(_,i)=>size-i%2).reduce((a,b)=>a+b,0));
 assert.ok(rails.every(r=>r.kind==='boost'&&r.zigzags===Math.min(5,round+1)));
 assert.equal(p.plinkoWallPoints('left',rails[0].zigzags).length,Math.min(5,round+1)*2+1);
 const values=p.plinkoRoundValues(round,50,random),stars=p.plinkoPocketStars(round,values.length);
 assert.ok(stars.every(n=>n>=0&&n<=3));
 assert.equal(stars.filter(Boolean).length,Math.min(stars.length-1,Math.round(stars.length*.75)));
 assert.ok(stars.includes(0),'Every round must have a box without stars');
 assert.deepEqual(stars,p.plinkoPocketStars(round,values.length),'Star placement is stable for all teams in a round');
 assert.deepEqual([...values].sort((a,b)=>a-b),Array.from({length:3+round},(_,i)=>(i+1)*10+round*50).sort((a,b)=>a-b));
 for(const bonus of [null,...p.PLINKO_BONUSES])for(let entry=0;entry<10;entry++)for(let attempt=0;attempt<3;attempt++){
  let balls;
  try{balls=p.simulatePlinkoTurn(pegs,entry,random,{bonus,rails,startTime:random()*20,entryCount:10,pocketCount:layout.pocketCount});}
  catch(error){throw new Error(`Round ${round+1} entry ${entry+1} bonus ${bonus}: ${error.message}`);}
  const eligible=balls.filter(b=>b.exitEligible);
  assert.equal(eligible.length,bonus==='two-balls'?2:1);
  if(bonus==='chicken')assert.equal(balls.filter(b=>b.appearance==='egg').length,10);
  if(bonus==='doll'){assert.ok(balls.length<=16);assert.ok(balls.every(b=>b.generation<=5));assert.equal(eligible[0].generation,Math.max(...balls.map(b=>b.generation)));}
  const roofs=balls.flatMap(b=>b.frames.filter(f=>f.roof>=0));
  assert.ok(roofs.length>=1);
  assert.equal(new Set(roofs.map(f=>f.roof)).size,roofs.length);
  const removed=new Set(balls.flatMap(b=>b.frames.at(-1).removed));
  assert.equal(balls.reduce((n,b)=>n+b.hits,0),removed.size,'Pegs shared across every creature and helper');
  for(const ball of balls){
   const last=ball.frames.at(-1);assert.equal(last.landing,1);
   if(ball.exitEligible){
    assert.equal(last.y,p.PLINKO_FLOOR_Y);assert.ok(ball.pocket>=0);
    const firstLanding=ball.frames.find(f=>f.pocket>=0),lastLanding=ball.frames.find(f=>f.landing===1);
    assert.ok(lastLanding.time-firstLanding.time>=1.08,'The full gentle landing plays before the turn settles');
   }
   const entered=ball.frames.find(f=>f.pocket>=0);
   if(entered)assert.ok(entered.brokenAt[ball.pocket]>=0&&entered.brokenAt[ball.pocket]<entered.time,'A chip can only enter a previously broken roof');
   assert.equal(ball.pegUnits,ball.hits-ball.redHits*3);
   const score=p.plinkoDropScore(ball,values,2,bonus);
   assert.equal(score.pocketPoints,ball.exitEligible?values[ball.pocket]:0);
   for(const f of ball.frames){assert.ok(Number.isFinite(f.x+f.y+f.rotation+f.time));assert.ok(f.x>=p.PLINKO_MIN_X-.01&&f.x<=p.PLINKO_MAX_X+.01);}
   maxDuration=Math.max(maxDuration,ball.duration+ball.delay);wallHits+=last.railHits;bodies++;
  }
  if(bonus==='dynamite'){
   assert.equal(balls[0].abilityUses,1,'Dynamite must explode once');
   const blast=balls[0].frames.find(f=>f.effect?.kind==='blast');
   assert.ok(blast.effect.duration>=1,'The detailed explosion has time to bloom and dissipate');
   assert.ok(balls[0].frames.at(-1).time>=blast.effect.time+blast.effect.duration-.02,'An early landing must not cut off the blast');
  }
  if(bonus==='sonic'){
   const frames=balls[0].frames;assert.ok(frames.every(f=>f.y>=80),'Sonic stays on screen');
   assert.ok(frames[60].rotation-frames[30].rotation>250,'Sonic visibly spins several times per second');
   assert.ok(Math.hypot(frames[0].x-frames[12].x,frames[0].y-frames[12].y)>35,'Sonic launches immediately');
  }
  if(bonus==='blob'){
   const frames=balls[0].frames,growing=frames.filter(f=>f.blob?.phase==='growing');
   assert.ok(growing.length>100,'Blob pauses to inflate against real obstacles');
   assert.ok(growing.some(f=>f.blob.contacts.length),'Skin meets and resists pegs');
   const burst=frames.find(f=>f.blob?.burst);
   assert.ok(burst,'Blob reaches an electric side');
   assert.equal(balls[0].abilityUses,1,'Blob bursts exactly once');
   const reaction=frames.filter(f=>f.blob?.phase==='startled'),collapse=frames.filter(f=>f.blob?.phase==='deflating');
   assert.ok(reaction.length>=60,'The full-size shocked face remains visible for half a second');
   assert.ok(reaction.every(f=>f.x===reaction[0].x&&f.y===reaction[0].y),'Dumpling holds still to look at the camera');
   assert.ok(reaction.every(f=>f.hits===reaction[0].hits&&!f.blob.burst),'The reaction cannot collect extra pegs or pop early');
   assert.ok(reaction.every(f=>JSON.stringify(f.blob.points)===JSON.stringify(reaction[0].blob.points)),'The face changes while the original large silhouette stays intact');
   assert.ok(burst.time-reaction[0].time>=p.PLINKO_DUMPLING_REACTION-.01,'The pop follows the reaction beat');
   assert.ok(collapse.length>=25,'Deflation plays smoothly before flight');
   const skinWidth=f=>Math.max(...f.blob.points.map(q=>q.x))-Math.min(...f.blob.points.map(q=>q.x));
   assert.ok(skinWidth(collapse.at(-1))<skinWidth(collapse[0])*.2,'The full body visibly collapses');
   assert.ok(collapse.every(f=>f.x===reaction[0].x&&f.y===reaction[0].y),'Flight waits until after deflation');
   assert.ok(p.plinkoBlobWallContact(burst,burst.blob.points,rails.map(r=>p.plinkoWallPoints(r.side,r.zigzags))),'Burst is caused by the visible skin touching a wall');
   assert.ok(frames.some(f=>f.blob?.phase==='deflated'),'The body deflates after contact');
   const flying=frames.filter(f=>f.blob?.phase==='deflated'&&f.pocket<0),launched=flying[0];
   assert.ok(flying.at(-1).time-launched.time>=p.PLINKO_DUMPLING_AIRTIME-.05,'Air-powered loops finish before entering a box');
   assert.ok(Math.min(...flying.filter(f=>f.time<launched.time+.5).map(f=>f.y))<launched.y-25,'Deflated Dumpling launches upwards first');
   assert.ok(Math.max(...flying.map(f=>f.x))-Math.min(...flying.map(f=>f.x))>100,'The balloon travels around the board rather than falling in place');
   assert.ok(flying.every(f=>f.y>=80),'The circular flight stays below the top of the board');
   for(const f of frames){
    assert.equal(f.blob.points.length,p.PLINKO_BLOB_NODES);
    assert.ok(f.blob.points.every(q=>Number.isFinite(q.x+q.y)),'Every spring node stays finite');
   }
   const lastGrowth=growing.at(-1),width=Math.max(...lastGrowth.blob.points.map(q=>q.x))-Math.min(...lastGrowth.blob.points.map(q=>q.x)),height=Math.max(...lastGrowth.blob.points.map(q=>q.y))-Math.min(...lastGrowth.blob.points.map(q=>q.y));
   assert.ok(width>height*1.3,'The blob gets fatter rather than uniformly scaling');
   assert.ok(width>50,'The body visibly inflates');
   assert.ok(frames.at(-1).time>burst.time+1.15,'Burst and flutter finish before scoring');
  }
  if(bonus==='lizard')for(const f of balls[0].frames){
   const e=f.effect;if(e?.kind!=='tongue')continue;
   if(f.time-e.time<e.duration){assert.ok(Math.hypot(e.tx-f.x,e.ty-f.y)<=p.PLINKO_LIZARD_REACH+.1,'Tongue reach is capped');limitedTongues++;}
   if(e.anchor!==undefined && f.pocket<0 && f.time-e.time>.1 && f.time-e.time<.65){
    lizardSwings++;
    assert.ok(!f.removed.includes(e.anchor),'The tether peg remains until the lizard releases it');
    assert.deepEqual({x:e.tx,y:e.ty},p.plinkoPegPosition(pegs[e.anchor],e.anchor,f.time),'The tongue follows its moving anchor peg');
   }
  }
  if(bonus)abilities[bonus]=(abilities[bonus]||0)+balls.reduce((n,b)=>n+b.abilityUses,0);
  assert.equal(JSON.stringify(pegs),original);turns++;
 }
}
assert.ok(lizardSwings>0,'Lizards latch and swing from pegs');
assert.ok(limitedTongues>0,'Limited tongues are exercised');
console.log(JSON.stringify({turns,bodies,maxDuration,wallHits,lizardSwings,limitedTongues,abilities}));
