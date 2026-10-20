import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { translateInterfaceText as ui } from '../../utils/interfaceLanguage';
import { entryX, entryScreenX, plinkoPegPosition, plinkoWallPoints, PLINKO_POCKET_LEFT, PLINKO_POCKET_WIDTH, PlinkoFrame, PlinkoPeg, PlinkoRail, PlinkoBonus, projectPlinkoPoint, plinkoChipAttachment, plinkoDragonFireJet, plinkoLandingSink, PLINKO_LIZARD_REACH, plinkoPegStyle, PlinkoPegStyle } from '../../utils/plinko';
import { PlinkoChipArtwork } from './PlinkoIcons';
const PlinkoBlob=lazy(()=>import('./PlinkoBlob'));
const ART = '/assets/games/plinko/';
const point = (x: number, y: number) => projectPlinkoPoint({x,y});
function PegArtwork({x,y,size,kind='blue',style,opacity=1,transform}:{x:number;y:number;size:number;kind?:'blue'|'gold'|'red';style:PlinkoPegStyle;opacity?:number;transform?:string}){
 return <image data-peg-art={style} href={`${ART}pegs/${style==='neon'?`neon-${kind}`:`${style}-blue`}-v1.webp`} x={x-size/2} y={y-size/2} width={size} height={size} opacity={opacity} transform={transform} filter={style==='neon'?undefined:kind==='red'?'url(#plinko-red-peg)':kind==='gold'?'url(#plinko-gold-peg)':undefined}/>;
}

function boxGeometry(index:number,count:number){
 // A single tapered back edge gives every shared roof seam the same perspective.
 const boundary=(column:number,back:boolean)=>point(PLINKO_POCKET_LEFT+(back?12:0)+(PLINKO_POCKET_WIDTH-(back?24:0))*column/count,back?532:550);
 const bl=boundary(index,true),br=boundary(index+1,true),fl=boundary(index,false),fr=boundary(index+1,false);
 return {bl,br,fl,fr,bottom:point(0,622).y,color:{front:'url(#plinko-pocket-metal)',top:'url(#plinko-roof-metal)'}};
}

function PlinkoTornadoWind({sample,time,front=false}:{sample:PlinkoFrame;time:number;front?:boolean}){
 const center=plinkoChipAttachment(sample,0,0);
 if(center.opacity<=0)return null;
 return <g data-testid={front?'plinko-tornado-wind-front':'plinko-tornado-wind-back'} className="plinko-tornado-wind" pointerEvents="none" opacity={center.opacity} transform={`translate(${center.x} ${center.y})`}>
   {!front&&<ellipse cy="-3" rx="33" ry="31" fill="url(#plinko-wind-haze)"/>}
   {Array.from({length:5},(_,i)=>{
     const y=-19+i*9,radius=29-i*3.7;
     return <path key={`ribbon-${i}`} d={`M${-radius} ${y}Q0 ${y+(front?12:-12)} ${radius} ${y}`} fill="none" stroke={front?'#d6f8ff':'#8fbbdf'} strokeWidth={front?1.2:1.6} strokeLinecap="round" opacity={front?.65:.35} strokeDasharray={`${radius*.9} ${radius*.45}`} strokeDashoffset={-time*27-i*12}/>;
   })}
   {Array.from({length:16},(_,i)=>{
     const phase=time*(5.5+i%3*.35)+i*2.399,depth=Math.sin(phase);
     if((depth>=0)!==front)return null;
     const level=i%5,radius=30-level*3.8,x=Math.cos(phase)*radius,y=-21+level*9+depth*6,r=(2.5+(i%3)*.8)*(front?1:.8);
     return <g key={i} transform={`translate(${x} ${y}) rotate(${Math.cos(phase)*18})`} opacity={.35+(depth+1)*.18}>
       <ellipse rx={r*1.6} ry={r*.8} fill="url(#plinko-wind-cloud)"/>
       <circle cx={-r*.55} cy={-r*.25} r={r*.65} fill="url(#plinko-wind-cloud)"/>
       <circle cy={-r*.55} r={r*.85} fill="url(#plinko-wind-cloud)"/>
     </g>;
   })}
   {Array.from({length:8},(_,i)=>{const phase=time*6+i*2.399,r=18+(i%4)*4.5,x=Math.cos(phase)*r,y=Math.sin(phase)*r*.3-12+(i%4)*8;if((Math.sin(phase)>=0)!==front)return null;return <path key={`dust-${i}`} d={`M${x} ${y}l${Math.sin(phase)*3} ${-Math.cos(phase)*1.2}`} stroke={i%2?'#fff4cf':'#b6f1ff'} strokeWidth="1.3" strokeLinecap="round" opacity=".65"/>;})}
 </g>;
}

function PlinkoDragonFire({sample,time}:{sample:PlinkoFrame;time:number}){
 const jet=plinkoDragonFireJet(sample,sample.effect,time);
 if(!jet)return null;
 const width=jet.length/.88,height=jet.halfWidth*2.15;
 return <g data-testid="plinko-dragon-fire" data-mouth-x={jet.x} data-mouth-y={jet.y} data-jet-length={jet.length} transform={`translate(${jet.x} ${jet.y}) rotate(${sample.rotation})`} opacity={jet.opacity}>
   <ellipse cx={jet.length*.35} cy="0" rx={jet.length*.7} ry={jet.halfWidth*1.8} fill="url(#plinko-fire-glow)" opacity=".55"/>
   <image href={`${ART}dragon-fire-v1.webp`} x={-width*.075} y={-height/2} width={width} height={height} preserveAspectRatio="none"/>
   <path d={`M0 0 Q${jet.length*.14} ${Math.sin(jet.age*70)*1.6} ${jet.length*.32} 0`} fill="none" stroke="#fff6bf" strokeWidth="2" strokeLinecap="round" opacity={.6+.3*Math.sin(jet.age*60)}/>
   {Array.from({length:13},(_,i)=>{const flow=(jet.age*2.4+i/13)%1,spread=Math.sin(i*9.1)*jet.halfWidth*flow;return <circle key={i} cx={flow*jet.length} cy={spread-flow*flow*7} r={.6+(i%3)*.35} fill={i%2?'#ffeeb0':'#ff8b3b'} opacity={(1-flow)*.85}/>;})}
 </g>;
}

function PlinkoLandingBurst({x,y,width,t}:{x:number;y:number;width:number;t:number}){
 const ease=1-(1-t)**3,glow=Math.sin(Math.PI*t)**.8;
 return <g data-testid="plinko-landing-burst" data-landing-progress={t} pointerEvents="none">
   <ellipse cx={x} cy={y-12-ease*20} rx={width*.58} ry={24+ease*35} fill="url(#plinko-landing-gold)" opacity={glow*.8}/>
   <ellipse cx={x} cy={y-3} rx={width*.38} ry="7" fill="url(#plinko-landing-gold)" opacity={glow}/>
   {[0,.14,.28].map((delay,i)=>{const life=Math.min(1,Math.max(0,(t-delay)/(1-delay))),spread=1-(1-life)**2;return <ellipse key={i} cx={x} cy={y-4-spread*(5+i*3)} rx={width*(.12+spread*.42)} ry={2+spread*7} fill="none" stroke={i%2?'#fff4ce':'#f4ce7d'} strokeWidth={1.5-life} opacity={life>0?Math.sin(life*Math.PI)*(1-life)*.65:0}/>;})}
   {Array.from({length:12},(_,i)=>{
     const life=Math.min(1,Math.max(0,(t-i*.017)/.8)),travel=1-(1-life)**2,side=i%2?1:-1;
     const cx=x+side*(6+travel*width*(.12+(i%4)*.055)),cy=y-4-travel*(12+(i%5)*6),r=(3+(i%3)*1.2)*(1+life*.8);
     return <g key={i} opacity={Math.sin(Math.PI*life)*(1-life)*.85} transform={`translate(${cx} ${cy}) scale(${.6+travel*.7})`}>
       <ellipse rx={r*1.7} ry={r*.9} fill="url(#plinko-landing-dust)"/>
       <circle cx={-r*.6} cy={-r*.4} r={r*.8} fill="url(#plinko-landing-dust)"/>
       <circle cx={r*.25} cy={-r*.65} r={r} fill="url(#plinko-landing-dust)"/>
     </g>;
   })}
   {Array.from({length:18},(_,i)=>{
     const life=Math.min(1,Math.max(0,(t-(i%4)*.025)/.88)),angle=Math.PI+(i/17)*Math.PI,speed=18+(i%5)*9;
     const px=x+Math.cos(angle)*speed*life,py=y-4+Math.sin(angle)*speed*life+life*life*18,r=(1+(i%3)*.6)*Math.sin(life*Math.PI);
     return <g key={i} opacity={Math.sin(Math.PI*life)} transform={`translate(${px} ${py}) rotate(${i*37+life*100})`}>
       {i%3===0?<path d={`M${-r*2} 0Q0 ${-r*.5} 0 ${-r*2}Q${r*.5} 0 ${r*2} 0Q0 ${r*.5} 0 ${r*2}Q${-r*.5} 0 ${-r*2} 0Z`} fill="#fff5cb"/>:<circle r={r} fill={i%2?'#fff2bf':'#eab85b'}/>}
     </g>;
   })}
 </g>;
}

function PlinkoExplosion({x,y,t}:{x:number;y:number;t:number}) {
  const bloom=1-Math.pow(1-Math.min(1,t*2.8),3),fade=Math.max(0,1-Math.max(0,t-.48)/.52);
  return <g data-testid="plinko-explosion" pointerEvents="none">
    <circle cx={x} cy={y} r={35+100*bloom} fill="url(#plinko-blast-light)" opacity={Math.max(0,1-t*1.7)}/>
    <circle cx={x} cy={y} r={8+143*Math.sqrt(t)} fill="none" stroke="#ffdf9a" strokeWidth={5*(1-t)} opacity={(1-t)**3}/>
    {Array.from({length:9},(_,i)=>{const a=i*2.399,r=35+75*t;return <circle key={i} cx={x+Math.cos(a)*r} cy={y+Math.sin(a)*r-t*32} r={9+20*t} fill="url(#plinko-blast-smoke)" opacity={Math.sin(t*Math.PI)*.6}/>;})}
    <image href={`${ART}explosion-v2.webp`} x={x-135*bloom} y={y-135*bloom-t*15} width={270*bloom} height={270*bloom} opacity={fade}/>
    <circle cx={x} cy={y} r={22+45*t} fill="#fff4cb" opacity={Math.max(0,1-t*7)}/>
    {Array.from({length:22},(_,i)=>{const a=i*2.399,speed=60+(i%5)*19,px=x+Math.cos(a)*speed*t,py=y+Math.sin(a)*speed*t+t*t*52;return <g key={i} opacity={(1-t)**1.4} transform={`translate(${px} ${py}) rotate(${i*47+t*210})`}><path d="M-5 0H2" stroke={i%3?'#ffd875':'#ff7837'} strokeWidth={i%3?1.5:2.5} strokeLinecap="round"/><circle r={i%3?1:2} fill="#fff3b2"/></g>;})}
  </g>;
}

export function PlinkoBoard({ round=1, entryCount, pegTime, pegs, values, stars, face=0, entry, choosing, falling, frame, trail, extraBalls = [], rails = [], bonus, winningPockets = [], pegPoints, onPreview, onDrop }: {
  round?:number; stars:number[]; face?:number; entryCount: number; pegTime: number; pegs: PlinkoPeg[]; values: number[]; entry: number; choosing: boolean; falling: boolean;
  frame: PlinkoFrame | null; trail: PlinkoFrame[]; extraBalls?: Array<{frame: PlinkoFrame; trail: PlinkoFrame[]}>;
  rails?: PlinkoRail[]; bonus?: PlinkoBonus | null; winningPockets?: number[]; pegPoints: number;
  onPreview: (entry: number) => void; onDrop: (entry: number) => void;
}) {
  const pegStyle=plinkoPegStyle(round);
  const balls = frame ? [{ frame, trail }, ...extraBalls] : [];
  const removed = new Set(balls.flatMap(b => b.frame.removed));
  const seenImpacts=useRef(new Set<number>());
  const [impacts,setImpacts]=useState<Array<{index:number;x:number;y:number;kind:'blue'|'gold'|'red';started:number}>>([]);
  useEffect(()=>{
    if(!falling){seenImpacts.current.clear();setImpacts(previous=>previous.length?[]:previous);return;}
    const newlyHit=[...new Set([...(frame?.removed??[]),...extraBalls.flatMap(ball=>ball.frame.removed)])].filter(index=>!seenImpacts.current.has(index));
    if(!newlyHit.length)return;
    const started=performance.now();
    const additions=newlyHit.flatMap(index=>{
      seenImpacts.current.add(index);const peg=pegs[index];if(!peg)return [];
      const position=plinkoPegPosition(peg,index,pegTime);return [{index,...point(position.x,position.y),kind:peg.kind,started}];
    });
    setImpacts(previous=>[...previous.filter(hit=>started-hit.started<700),...additions].slice(-18));
  },[falling,frame,extraBalls,pegs,pegTime]);
  const brokenAt = values.map((_, i) => Math.max(-1, ...balls.map(b => b.frame.brokenAt[i] ?? -1)));
  const entryWidth = 472 / entryCount, screenEntryWidth = entryWidth * .82;
  const entryLeft = point(44,40).x, entryTop = point(44,40).y, entryHeight = point(44,102).y - entryTop;
  const aimX = entryScreenX(entry, entryCount);
  const aimTop = point(0,102).y, aimBottom = point(0,Math.min(...pegs.map(p => p.y)) - 8).y;
  const drawChip = (sample: PlinkoFrame | null, ball: number) => {
    const p = projectPlinkoPoint(sample || { x: entryX(entry, entryCount), y: 80 });
    const sink = plinkoLandingSink(sample?.landing ?? 0);
    return <g key={ball} data-landing={sample?.landing ?? 0} data-testid={ball === 0 ? 'plinko-chip' : 'plinko-chip-extra'} data-ball-index={ball} data-physics-x={sample?.x ?? entryX(entry, entryCount)} data-physics-y={sample?.y ?? 80} opacity={1 - sink} transform={`translate(${p.x} ${p.y + sink * 26}) scale(${1 - sink * .5})`}>
      <ellipse cx="1" cy="3" rx="7" ry="3" fill="#000" opacity=".4" filter="url(#plinko-light)"/>

      {bonus === 'bouncy' && <circle r="10" fill="none" stroke="#9df8ff" strokeWidth="1" strokeDasharray="3 3"/>}
      <g transform={`scale(1 ${1 - p.depth * .4}) rotate(${sample?.rotation ?? 0})`}><g transform={`scale(${sample?.scale ?? 1})`}><PlinkoChipArtwork appearance={sample?.appearance ?? (bonus && bonus!=='two-balls' ? bonus : 'face')} face={face}/></g></g>
      {sample?.appearance==='dynamite' && sample.fuse>0 && <text y="-15" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff" stroke="#8e1930" strokeWidth=".5">{Math.ceil(sample.fuse)}</text>}
    </g>;
  };
  return <div className={`plinko-cabinet ${choosing ? 'is-choosing' : ''}`} data-entries={entryCount} data-pockets={values.length} data-peg-style={pegStyle} onPointerMove={event => {
    if (!choosing || event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width * 560;
    onPreview(Math.max(0, Math.min(entryCount - 1, Math.floor((x - entryLeft) / screenEntryWidth))));
  }}>
    <svg className="plinko-board" viewBox="0 0 560 640" preserveAspectRatio="none" role="img" aria-label={ui('Plinkemoji board with {count} scoring pockets', {count:values.length})}>
      <defs>
        <linearGradient id="plinko-wall-metal"><stop stopColor="#7359b9"/><stop offset=".35" stopColor="#e8d29c"/><stop offset=".55" stopColor="#7274ae"/><stop offset="1" stopColor="#272344"/></linearGradient>
        <linearGradient id="plinko-slot" x2="0" y2="1"><stop stopColor="#253663"/><stop offset=".45" stopColor="#152650"/><stop offset="1" stopColor="#080e26"/></linearGradient>
        <linearGradient id="plinko-pocket-floor" x2="0" y2="1"><stop stopColor="#060a1c"/><stop offset=".3" stopColor="#111b50"/><stop offset=".75" stopColor="#3e28a1"/><stop offset="1" stopColor="#13153c"/></linearGradient>
        <linearGradient id="plinko-roof-metal" x2="0" y2="1"><stop stopColor="#fff3c8"/><stop offset=".3" stopColor="#d1ae70"/><stop offset="1" stopColor="#8c6c3d"/></linearGradient>
        <linearGradient id="plinko-pocket-metal" x2="0" y2="1"><stop stopColor="#fff0bd"/><stop offset=".18" stopColor="#bc965a"/><stop offset=".6" stopColor="#edc886"/><stop offset="1" stopColor="#78552e"/></linearGradient>
        <linearGradient id="plinko-box-side" x1="0" x2="1"><stop stopColor="#b18a4e"/><stop offset=".3" stopColor="#53351f"/><stop offset=".75" stopColor="#926b39"/><stop offset="1" stopColor="#e3bd79"/></linearGradient>
        <linearGradient id="plinko-box-bevel" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff4ce"/><stop offset=".3" stopColor="#dbb473"/><stop offset=".6" stopColor="#8f652f"/><stop offset="1" stopColor="#e6be78"/></linearGradient>
        <radialGradient id="plinko-wind-haze"><stop stopColor="#a2eaff" stopOpacity=".2"/><stop offset="1" stopColor="#91b9e9" stopOpacity="0"/></radialGradient>
        <radialGradient id="plinko-wind-cloud" cx=".35" cy=".25"><stop stopColor="#f2fcff"/><stop offset=".55" stopColor="#c7e2f1" stopOpacity=".85"/><stop offset="1" stopColor="#7799ba" stopOpacity="0"/></radialGradient>
        <radialGradient id="plinko-fire-glow"><stop stopColor="#ffd45f" stopOpacity=".75"/><stop offset="1" stopColor="#ff6b22" stopOpacity="0"/></radialGradient>
        <linearGradient id="plinko-aim-shadow" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#7192df" stopOpacity=".2"/><stop offset="1" stopColor="#7192df" stopOpacity="0"/></linearGradient>
        <radialGradient id="plinko-blast-light"><stop stopColor="#fff6be"/><stop offset=".4" stopColor="#ffb735" stopOpacity=".65"/><stop offset="1" stopColor="#ff6924" stopOpacity="0"/></radialGradient>
        <radialGradient id="plinko-blast-smoke"><stop stopColor="#7f7475" stopOpacity=".8"/><stop offset="1" stopColor="#28273c" stopOpacity="0"/></radialGradient>
        <radialGradient id="plinko-landing-dust" cx=".35" cy=".25"><stop stopColor="#fff8e4"/><stop offset=".55" stopColor="#e8d4ad" stopOpacity=".75"/><stop offset="1" stopColor="#bda981" stopOpacity="0"/></radialGradient>
        <radialGradient id="plinko-landing-gold"><stop stopColor="#fff9ca" stopOpacity=".95"/><stop offset=".4" stopColor="#ffd25e" stopOpacity=".65"/><stop offset="1" stopColor="#ffbc36" stopOpacity="0"/></radialGradient>
        <filter id="plinko-light"><feGaussianBlur stdDeviation="3"/></filter>
        <filter id="plinko-red-peg"><feColorMatrix type="matrix" values=".9 .5 .35 0 0 0 .18 .08 0 0 0 .04 .12 0 .02 0 0 0 1 0"/></filter>
        <filter id="plinko-gold-peg"><feColorMatrix type="matrix" values=".65 .55 .3 0 0 .4 .5 .2 0 0 .03 .08 .08 0 0 0 0 0 1 0"/></filter>
        <radialGradient id="plinko-hit"><stop stopColor="#fff6c4" stopOpacity=".9"/><stop offset="1" stopColor="#7cddff" stopOpacity="0"/></radialGradient>
        <linearGradient id="plinko-prize" x2="0" y2="1"><stop stopColor="#fff4ba" stopOpacity="0"/><stop offset=".6" stopColor="#fbbf24" stopOpacity=".35"/><stop offset="1" stopColor="#fff7ce" stopOpacity=".6"/></linearGradient>
      </defs>
      <image href={`${ART}cabinet-modular-v1.png`} x="0" y="0" width="560" height="640" preserveAspectRatio="none"/>
      {Array.from({length:entryCount}, (_, i) => <g key={i} data-entry-slot={i}>
        <rect x={entryLeft + i * screenEntryWidth} y={entryTop} width={screenEntryWidth} height={entryHeight} fill="url(#plinko-slot)" stroke="#ab91bd" strokeWidth="1.2"/>
        <path d={`M${entryLeft + i * screenEntryWidth + 2} ${entryTop+2}h${screenEntryWidth-4}`} stroke="#e7cfa1" opacity=".7"/>
        {choosing && entry === i && <rect x={entryLeft+i*screenEntryWidth+1} y={entryTop+1} width={screenEntryWidth-2} height={entryHeight-2} fill="#88aeea" fillOpacity=".12" stroke="#ffe6a0" strokeWidth="1.8"/>}
      </g>)}
      {rails.map((rail, index) => {
        const points = plinkoWallPoints(rail.side,rail.zigzags).map(projectPlinkoPoint);
        const path = points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
        const outer = point(rail.side === 'left' ? 31 : 529,100).x;
        const face = `${path} L${outer} ${points.at(-1)!.y} L${outer} ${points[0].y}Z`;
        const hit = balls.some(b => b.frame.rail === index) && falling;
        const color = '#65e9ff';
        return <g key={index} data-rail={rail.kind} data-zigzag-side={rail.side} className={hit ? 'plinko-electric-hit' : ''}>
          <path d={face} fill="url(#plinko-wall-metal)" stroke="#29213f" strokeWidth="2"/>
          {<path d={path} stroke={color} strokeWidth={hit ? 12 : 7} fill="none" opacity=".5" filter="url(#plinko-light)"/>}
          <path d={path} stroke={color} strokeWidth="3.5" fill="none" strokeLinejoin="round"/>
          {<path d={path} stroke="#fff" strokeWidth=".8" strokeDasharray="5 15" fill="none" className="plinko-current"/>}
        </g>;
      })}
      {choosing && <rect data-testid="plinko-drop-aimer" pointerEvents="none" x={aimX-screenEntryWidth*.45} y={aimTop} width={screenEntryWidth*.9} height={Math.max(0, aimBottom-aimTop)} fill="url(#plinko-aim-shadow)"/>}
      {pegs.map((peg, index) => {
        const p = projectPlinkoPoint(plinkoPegPosition(peg, index, pegTime)), hit = balls.some(ball => ball.frame.peg === index) && falling;
        if (removed.has(index) && !hit) return null;
        const red = peg.kind === 'red';
        const amount = red ? -pegPoints * 2 : pegPoints;
        return <g key={index} data-peg={index} data-kind={peg.kind} data-hit={removed.has(index)}>
          {hit && <circle cx={p.x} cy={p.y} r="16" fill="url(#plinko-hit)"/>}
          <PegArtwork x={p.x} y={p.y} size={22} kind={peg.kind} style={pegStyle} opacity={removed.has(index)?0:1}/>
          {hit && <text x={p.x + 8} y={p.y - 8} className={`plinko-hit-score ${red ? 'is-red' : ''}`}>{amount >= 0 ? '+' : ''}{amount}</text>}
        </g>;
      })}
      {impacts.map(hit=><g key={hit.index} className="plinko-peg-impact" data-testid="plinko-peg-impact" data-hit-peg={hit.index} data-kind={hit.kind} transform={`translate(${hit.x} ${hit.y})`} pointerEvents="none" onAnimationEnd={event=>{if(event.target===event.currentTarget)setImpacts(previous=>previous.filter(impact=>impact.index!==hit.index));}}>
        <g className="plinko-impact-smoke" fill="#d2d7e4">
          {Array.from({length:5},(_,i)=>{const angle=-Math.PI+i*Math.PI/4;return <g key={i} className="plinko-impact-puff" style={{'--puff-x':`${Math.cos(angle)*(10+i%2*4)}px`,'--puff-y':`${Math.sin(angle)*12-6}px`,'--puff-delay':`${i*13}ms`} as React.CSSProperties}><ellipse rx="4" ry="3"/><circle cx="-2" cy="-2" r="2.5"/><circle cx="2" cy="-1.5" r="3"/></g>;})}
        </g>
        <g className="plinko-impact-flash"><circle r="7" fill="#fff3bd" opacity=".7"/><image href={`${ART}explosion-v2.webp`} x="-13" y="-13" width="26" height="26"/></g>
        <circle className="plinko-impact-ring" r="7" fill="none" stroke={hit.kind==='red'?'#ff947f':'#ffe9a6'} strokeWidth="1.3"/>
        <g className="plinko-impact-sparks" stroke="#ffe4a4" strokeWidth="1.1" strokeLinecap="round">{Array.from({length:5},(_,i)=>{const angle=i*Math.PI*2/5+.3;return <path key={i} d={`M${Math.cos(angle)*7} ${Math.sin(angle)*7}l${Math.cos(angle)*4} ${Math.sin(angle)*4}`}/>;})}</g>
      </g>)}
      {values.map((value, index) => {
        const {bl,br,fl,fr,color}=boxGeometry(index,values.length);
        const cx=(bl.x+br.x)/2, cy=(bl.y+fl.y)/2;
        const opening=`M${bl.x} ${bl.y}H${br.x}L${fr.x} ${fr.y}H${fl.x}Z`;
        const age=brokenAt[index]<0 ? -1 : Math.max(0,pegTime-brokenAt[index]);
        const shards=[`${bl.x},${bl.y} ${br.x},${br.y} ${cx},${cy}`,`${br.x},${br.y} ${fr.x},${fr.y} ${cx},${cy}`,`${fr.x},${fr.y} ${fl.x},${fl.y} ${cx},${cy}`,`${fl.x},${fl.y} ${bl.x},${bl.y} ${cx},${cy}`];
        return <g key={index} data-testid={`plinko-pocket-${index}`} data-value={value} data-winning={winningPockets.includes(index)} data-roof-state={age<0 ? 'closed' : 'open'} data-break-age={age}>
          <defs><clipPath id={`plinko-box-interior-${index}`}><path d={opening}/></clipPath></defs>
          <path d={opening} fill="#14224b" stroke="#15162b" strokeWidth="4" strokeLinejoin="round"/>
          <path d={`M${bl.x} ${bl.y}L${bl.x+4} ${fl.y-2}H${fr.x-4}L${br.x} ${br.y}`} fill="url(#plinko-pocket-floor)" stroke="#363061" strokeWidth="1.5"/>
          {winningPockets.includes(index) && <path d={opening} fill="url(#plinko-prize)" className="plinko-pocket-glow"/>}
          {age<0 ? <g data-testid={`plinko-roof-${index}`}><path d={opening} fill={color.top} stroke="#15162b" strokeWidth="4" strokeLinejoin="round"/></g>
            : age<.85 && <g clipPath={`url(#plinko-box-interior-${index})`} data-testid="plinko-roof-fragments">{shards.map((points, shard) => <polygon key={shard} points={points} fill={color.top} stroke="#15162b" strokeWidth="1.2" opacity={Math.max(0,1-age/.85)} transform={`translate(${(shard%2 ? 1 : -1)*age*5} ${age*age*75}) translate(${cx} ${cy}) rotate(${(shard%2 ? 1 : -1)*age*65}) scale(${1-age*.35}) translate(${-cx} ${-cy})`}/>)}</g>}
          <path d={`M${bl.x} ${bl.y}L${fl.x} ${fl.y}M${br.x} ${br.y}L${fr.x} ${fr.y}`} stroke="#15162b" strokeWidth="4" strokeLinejoin="round"/>
        </g>;
      })}
      {falling && balls.flatMap((ball, ballIndex) => ball.trail.map((sample, index) => {
        const p = projectPlinkoPoint(sample);
        return <circle key={`${ballIndex}-${index}`} cx={p.x} cy={p.y} r={1.5+index*.25} fill={ballIndex ? '#8fe7ff' : '#ffe9ac'} opacity={.035+index*.035}/>;
      }))}
      {falling&&balls.filter(ball=>ball.frame.appearance==='sonic').map((ball,i)=>{
        const p=point(ball.frame.x,ball.frame.y),previous=ball.trail.at(-1),q=previous?point(previous.x,previous.y):{x:p.x-1,y:p.y},a=Math.atan2(p.y-q.y,p.x-q.x);
        return <g key={`sonic-speed-${i}`} data-testid="plinko-sonic-speed" pointerEvents="none">
          {ball.trail.map((sample,n)=>{const s=point(sample.x,sample.y),life=(n+1)/Math.max(1,ball.trail.length),wobble=Math.sin(sample.time*21+n)*3;return <g key={n} data-testid="plinko-sonic-smoke" opacity={life*.35} transform={`translate(${s.x-Math.cos(a)*8} ${s.y-Math.sin(a)*8+wobble})`} fill={n%2?'#dbe6ef':'#9fadc2'}><ellipse rx={3+(1-life)*6} ry={2+(1-life)*4}/><circle cx="-2" cy="-2" r={2+(1-life)*3}/><circle cx="3" cy="-1" r={2+(1-life)*2}/></g>;})}
          <g stroke="#73dbff" strokeLinecap="round" opacity=".65">{[-5,0,5].map((offset,n)=><path key={n} d={`M${p.x-Math.cos(a)*(16+n*3)-Math.sin(a)*offset} ${p.y-Math.sin(a)*(16+n*3)+Math.cos(a)*offset}l${-Math.cos(a)*18} ${-Math.sin(a)*18}`} strokeWidth={n===1?2.3:1.3}/>)}</g>
        </g>;
      })}
      {balls.map((ball,i)=>{
        const effect=ball.frame.effect;
        if(!effect) return null;
        const age=pegTime-effect.time;
        if(age<0||age>effect.duration) return null;
        const a=point(effect.x,effect.y),b=point(effect.tx,effect.ty),t=age/effect.duration;
        return <g key={`effect-${i}`} pointerEvents="none" opacity={effect.kind==='tongue'||effect.kind==='blast'||effect.kind==='fire'?1:1-t*.8} data-effect={effect.kind}>
          {effect.kind==='blast' && <>
            <PlinkoExplosion x={a.x} y={a.y} t={t}/>
            {effect.targets?.map((target,n)=>{const p=point(target.x,target.y),angle=Math.atan2(p.y-a.y,p.x-a.x),distance=t*(35+n%4*12);return <PegArtwork key={n} x={p.x+Math.cos(angle)*distance} y={p.y+Math.sin(angle)*distance+t*t*45} size={12} style={pegStyle} opacity={(1-t)**2} transform={`rotate(${t*280} ${p.x} ${p.y})`}/>;})}
          </>}
          {effect.kind==='tongue' && (()=>{
            const sample=ball.frame,mouth=plinkoChipAttachment(sample,3.5,-1.2),sink=1-mouth.opacity;
            if(sink>=1)return null;
            const reach=Math.min(1,age/.09)*Math.min(1,Math.max(0,(effect.duration-age)/.17));
            const distance=Math.hypot(b.x-mouth.x,b.y-mouth.y)||1,limited=Math.min(1,PLINKO_LIZARD_REACH*.92/distance);
            const tip={x:mouth.x+(b.x-mouth.x)*reach*limited,y:mouth.y+(b.y-mouth.y)*reach*limited};
            const bend=effect.anchor===undefined?Math.sin(t*Math.PI)*12:Math.sin(t*Math.PI)*3;
            const path=`M${mouth.x} ${mouth.y}Q${(mouth.x+tip.x)/2} ${(mouth.y+tip.y)/2+bend} ${tip.x} ${tip.y}`;
            return <g opacity={1-sink} data-testid="plinko-lizard-tongue" data-anchor={effect.anchor} data-mouth-x={mouth.x} data-mouth-y={mouth.y}>
              <path d={path} fill="none" stroke="#8b184d" strokeWidth="4.6" strokeLinecap="round"/>
              <path d={path} fill="none" stroke="#fa638c" strokeWidth="3.2" strokeLinecap="round"/>
              <path d={path} fill="none" stroke="#ffb1ba" strokeWidth=".9" strokeLinecap="round"/>
              <ellipse cx={tip.x} cy={tip.y} rx="3.5" ry="2.6" fill="#ff90b0" stroke="#a32c61" strokeWidth=".8"/>
              {effect.anchor!==undefined && reach>.95 && <circle cx={b.x} cy={b.y} r="10" fill="none" stroke="#ffb4ce" strokeWidth="1" opacity=".65"/>}
            </g>;
          })()}
          {effect.kind==='fire' && <PlinkoDragonFire sample={ball.frame} time={pegTime}/>}
          {effect.kind==='vortex' && <><path d={`M${b.x} ${b.y}Q${a.x+30} ${a.y-30} ${a.x} ${a.y}`} fill="none" stroke="#b0eaff" strokeWidth="2" strokeDasharray="3 4"/><PegArtwork x={b.x+(a.x-b.x)*t} y={b.y+(a.y-b.y)*t} size={14*(1-t)} style={pegStyle}/></>}
        </g>;
      })}
      {falling && balls.map((ball,index)=>ball.frame.appearance==='tornado' && <PlinkoTornadoWind key={`wind-back-${index}`} sample={ball.frame} time={pegTime}/>)}
      {choosing ? (bonus==='blob'?null:drawChip(null, 0)) : balls.map((ball, index) => ball.frame.appearance==='blob'?null:drawChip(ball.frame, index))}
      {falling && balls.map((ball,index)=>ball.frame.appearance==='tornado' && <PlinkoTornadoWind key={`wind-front-${index}`} sample={ball.frame} time={pegTime} front/>)}
      {values.map((value,index)=>{
        const {fl,fr,bottom,color}=boxGeometry(index,values.length);
        const font=Math.min(38,(fr.x-fl.x-8)/(String(value).length*.68));
        return <g key={index} data-box-front={index}>
          <rect data-box-style="cartoon" x={fl.x} y={fl.y} width={fr.x-fl.x} height={bottom-fl.y} fill={color.front} stroke="#15162b" strokeWidth="4" strokeLinejoin="round"/>
          <text x={(fl.x+fr.x)/2} y={fl.y+(bottom-fl.y)*.52+font*.15} textAnchor="middle" className={`plinko-pocket-number ${winningPockets.includes(index) ? 'is-winning' : ''}`} style={{fontSize:font}}>{value}</text>
          <text data-testid={`plinko-box-stars-${index}`} x={(fl.x+fr.x)/2} y={bottom-7} textAnchor="middle" fill="#fff4b6" stroke="#4b3559" strokeWidth="1.4" paintOrder="stroke" fontSize={Math.min(13,(fr.x-fl.x)/4)}>{'★'.repeat(stars[index]??0)}</text>
        </g>;
      })}
      {falling && balls.map((ball,index)=>{
        const sample=ball.frame;
        if(!sample.exitEligible || sample.pocket<0 || sample.landing>=1)return null;
        const width=PLINKO_POCKET_WIDTH/values.length;
        const origin=point(PLINKO_POCKET_LEFT+(sample.pocket+.5)*width,540);
        return <PlinkoLandingBurst key={`landing-${index}`} x={origin.x} y={origin.y} width={width} t={sample.landing}/>;
      })}
    </svg>
    {bonus==='blob'&&<Suspense fallback={null}><PlinkoBlob sample={frame??{x:entryX(entry,entryCount),y:80,rotation:0,scale:1,landing:0,time:pegTime} as PlinkoFrame}/></Suspense>}
    <div className="plinko-entries" role="group" aria-label={ui('Chip entry points')} style={{left:`${entryLeft/560*100}%`,top:`${entryTop/640*100}%`,width:`${screenEntryWidth*entryCount/560*100}%`,height:`${entryHeight/640*100}%`}}>
      {Array.from({length:entryCount}, (_, index) => <button key={index} disabled={!choosing} aria-label={ui('Entry {number}', {number:index+1})} aria-pressed={choosing && entry===index}
        style={{left:`${index/entryCount*100}%`,width:`${100/entryCount}%`}}
        onFocus={() => onPreview(index)} onClick={() => onDrop(index)} className={choosing && entry===index ? 'selected' : ''}><span>{index+1}</span></button>)}
    </div>
  </div>;
}
