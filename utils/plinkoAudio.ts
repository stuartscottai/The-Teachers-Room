/** Plinkemoji's own cartoon sound palette. All voices share one muted master bus. */
export type PlinkoSound = 'hover'|'entry-hover'|'drop'|'peg'|'roof'|'correct'|'wrong'|'reveal'|'card-in'|'card-flip'|'card-out'|'round'|'coin'|'score-flight'|'land'|'rail'|'star'|'bonus';
export const PLINKO_PEG_SOUNDS=['Rubber boing','Bubble pop','Mouse squeak','Duck quack','Toy laser','Tiny giggle','Jaw harp','Slide whistle','Hiccup','Wooden bonk'] as const;
export class PlinkoPegSoundBag {
 private bag:number[]=[];private last=-1;
 constructor(private random= Math.random){}
 next(){
  if(!this.bag.length){this.bag=PLINKO_PEG_SOUNDS.map((_,i)=>i);for(let i=9;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}if(this.bag[9]===this.last)[this.bag[0],this.bag[9]]=[this.bag[9],this.bag[0]];}
  return this.last=this.bag.pop()!;
 }
}
export class PlinkoAudio {
 private ctx:AudioContext|null=null;
 private master:GainNode|null=null;
 private noise:AudioBuffer|null=null;
 private active=0;
 private last=new Map<PlinkoSound,number>();
 private pegs=new PlinkoPegSoundBag();
 constructor(private muted=false){}
 unlock(){
  if(this.muted)return;
  try{
   if(!this.ctx){
    const Audio=window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
    if(!Audio)return;
    this.ctx=new Audio();this.master=this.ctx.createGain();this.master.gain.value=.55;
    const limiter=this.ctx.createDynamicsCompressor();limiter.threshold.value=-18;limiter.knee.value=18;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.12;
    this.master.connect(limiter);limiter.connect(this.ctx.destination);
   }
   if(this.ctx.state==='suspended')void this.ctx.resume().catch(()=>{});
  }catch{/* Sound support must never interrupt the game. */}
 }
 setMuted(muted:boolean){
  this.muted=muted;
  if(this.ctx&&this.master){this.master.gain.cancelScheduledValues(this.ctx.currentTime);this.master.gain.setValueAtTime(muted?0:.55,this.ctx.currentTime);}
  if(!muted&&this.ctx?.state==='suspended')void this.ctx.resume().catch(()=>{});
 }
 dispose(){const ctx=this.ctx;this.ctx=null;this.master=null;this.noise=null;this.active=0;this.last.clear();if(ctx&&ctx.state!=='closed')void ctx.close().catch(()=>{});}
 private tone(from:number,to:number,duration:number,wave:OscillatorType='sine',volume=.1,delay=0,wobble=0,depth=0,formant=0){
  const ctx=this.ctx!,master=this.master!;if(this.active>=48)return;
  const now=ctx.currentTime+delay,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=wave;osc.frequency.setValueAtTime(from,now);osc.frequency.exponentialRampToValueAtTime(Math.max(30,to),now+duration);
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  let filter:BiquadFilterNode|undefined;
  if(formant){filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=formant;filter.Q.value=3;osc.connect(filter);filter.connect(gain);}else osc.connect(gain);
  gain.connect(master);
  let lfo:OscillatorNode|undefined,mod:GainNode|undefined;
  if(wobble){lfo=ctx.createOscillator();mod=ctx.createGain();lfo.frequency.value=wobble;mod.gain.value=depth;lfo.connect(mod);mod.connect(osc.frequency);lfo.start(now);lfo.stop(now+duration+.02);}
  this.active++;osc.onended=()=>{this.active=Math.max(0,this.active-1);osc.disconnect();gain.disconnect();filter?.disconnect();lfo?.disconnect();mod?.disconnect();};osc.start(now);osc.stop(now+duration+.025);
 }
 private air(duration:number,volume:number,from:number,to:number,delay=0,crack=false){
  const ctx=this.ctx!,now=ctx.currentTime+delay;
  if(this.active>=48)return;
  if(!this.noise){this.noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*1.2),ctx.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=this.noise;filter.type=crack?'highpass':'bandpass';filter.Q.value=crack?.6:1.1;filter.frequency.setValueAtTime(from,now);filter.frequency.exponentialRampToValueAtTime(to,now+duration);
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+(crack?.003:duration*.3));gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  source.connect(filter);filter.connect(gain);gain.connect(this.master!);this.active++;source.onended=()=>{this.active=Math.max(0,this.active-1);source.disconnect();filter.disconnect();gain.disconnect();};source.start(now);source.stop(now+duration+.02);
 }
 play(cue:PlinkoSound,detail=0){
  if(this.muted||!this.ctx||!this.master||this.ctx.state==='closed')return false;
  const now=performance.now(),gap=cue==='hover'||cue==='entry-hover'?65:cue==='peg'?45:cue==='coin'?35:cue==='roof'?35:0;
  if(now-(this.last.get(cue)??-Infinity)<gap)return false;this.last.set(cue,now);
  const tone=this.tone.bind(this),air=this.air.bind(this);
  switch(cue){
   case 'hover':tone(740,980,.045,'sine',.035);break;
   case 'entry-hover':tone(520+detail*42,700+detail*42,.055,'sine',.045);break;
   case 'drop':air(.2,.11,1500,180);tone(720,100,.25,'triangle',.12);break;
   case 'peg':{
    switch(this.pegs.next()){
     case 0:tone(640,135,.24,'triangle',.14,0,32,70);break;
     case 1:tone(210,950,.07,'sine',.13);tone(950,170,.1,'sine',.08,.055);break;
     case 2:tone(1700,520,.15,'sine',.1,0,24,140);break;
     case 3:tone(320,190,.13,'sawtooth',.14,0,19,38,950);tone(270,180,.08,'sawtooth',.08,.075,0,0,800);break;
     case 4:tone(1250,95,.18,'square',.055);break;
     case 5:for(let i=0;i<3;i++)tone(340+i*95,660+i*70,.065,'sine',.075,i*.055);break;
     case 6:tone(185,90,.2,'sawtooth',.1,0,25,45,700);break;
     case 7:tone(420,1350,.17,'sine',.1,0,10,55);break;
     case 8:tone(135,780,.055,'triangle',.13);tone(220,95,.09,'sine',.09,.06);break;
     case 9:air(.045,.1,900,350);tone(290,105,.13,'sine',.13);break;
    }break;
   }
   case 'roof':air(.17,.2,1800,3500,0,true);tone(145,55,.14,'triangle',.16);for(let i=0;i<5;i++){tone(1500+i*310,500+i*85,.09+i*.018,'sine',.045,i*.027);air(.04,.045,2500,800,i*.032,true);}break;
   case 'correct':[523,659,784,1047].forEach((f,i)=>{tone(f,f*1.003,.3,'triangle',.075,i*.065);tone(f*2,f*2,.18,'sine',.025,i*.065);});break;
   case 'wrong':tone(360,210,.23,'triangle',.15,0,8,25);tone(245,95,.3,'triangle',.13,.2,9,18);air(.08,.035,800,250);break;
   case 'reveal':[640,960,1280].forEach((f,i)=>tone(f,f,.26,'sine',.06,i*.045));air(.19,.05,700,2600);break;
   case 'card-in':air(.52,.11,180,2800);tone(180,540,.3,'sine',.04,.08);break;
   case 'card-flip':air(.19,.12,700,3300);tone(420,830,.095,'triangle',.055);break;
   case 'card-out':air(.13,.055,400,1200);air(.55,.12,2400,170,.18);break;
   case 'round':air(.4,.1,300,2200);[392,523,659,784,1047].forEach((f,i)=>{tone(f,f,.3,'triangle',.075,.08+i*.075);tone(f/2,f/2,.2,'sine',.05,.08+i*.075);});break;
   case 'score-flight':air(.38,.07,300,1900);tone(500,1150,.3,'sine',.045);break;
   case 'coin':tone(1450+detail*37,1480+detail*37,.11,'sine',.075);tone(2150+detail*43,2080+detail*43,.065,'sine',.035,.009);air(.025,.025,3600,1800);break;
   case 'land':tone(130,65,.22,'sine',.14);air(.34,.08,500,140);[880,1109,1319].forEach((f,i)=>tone(f,f,.22,'sine',.025,.07+i*.04));break;
   case 'rail':tone(280,1250,.18,'triangle',.08,0,35,70);air(.08,.06,1500,3100);break;
   case 'star':tone(1568,2093,.24,'sine',.07);tone(2349,2349,.16,'sine',.025,.06);break;
   case 'bonus':tone(380,900,.22,'triangle',.09);tone(1140,1520,.24,'sine',.05,.12);break;
  }
  return true;
 }
}
