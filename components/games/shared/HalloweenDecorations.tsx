import React, { forwardRef, lazy, Suspense, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
const HalloweenScene = lazy(() => import('./HalloweenScene'));
const GHOST_IMAGE='/assets/games/halloween/ghost-scare-v1.webp';
const SCREAM='/assets/audio/halloween/scary-scream-401725-v2.mp3';
export const HALLOWEEN_SCARE_INTERVAL=180_000;
export const HALLOWEEN_SCARE_DURATION=3312;
export type HalloweenSoundStatus='ready'|'playing'|'muted'|'blocked'|'unavailable';
export type HalloweenDecorationsHandle={trigger:()=>void};
type Props={muted?:boolean;onReady?:()=>void;onSoundStatus?:(status:HalloweenSoundStatus)=>void};
/** The preview and three-minute timer use exactly the same effect and sound path. */
export const HalloweenDecorations=forwardRef<HalloweenDecorationsHandle,Props>(function HalloweenDecorations({muted=false,onReady,onSoundStatus},ref){
 const [scare,setScare]=useState(false),mute=useRef(muted),bus=useRef<GainNode|null>(null),trigger=useRef(()=>{}),callbacks=useRef({onReady,onSoundStatus});
 mute.current=muted;callbacks.current={onReady,onSoundStatus};
 useImperativeHandle(ref,()=>({trigger:()=>trigger.current()}),[]);
 useEffect(()=>{if(bus.current)bus.current.gain.value=muted?0:.65;},[muted]);
 useEffect(()=>{
  let disposed=false,ready=false,ctx:AudioContext|null=null,voice:AudioBuffer|null=null,sequence=0;
  let dismiss:ReturnType<typeof setTimeout>|undefined;
  const voices=new Set<AudioScheduledSourceNode>();
  const report=(status:HalloweenSoundStatus)=>{if(!disposed)callbacks.current.onSoundStatus?.(status);};
  const image=new Image();image.onload=()=>{ready=true;callbacks.current.onReady?.();};image.src=GHOST_IMAGE;
  // Fetch independently of the first click: selecting Halloween may itself be the last interaction.
  const data=fetch(SCREAM).then(r=>r.ok?r.arrayBuffer():null).catch(()=>null);
  const prepare=()=>{
   if(disposed)return null;
   try{
    if(!ctx){
     const Audio=window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
     if(!Audio){report('unavailable');return null;}
     ctx=new Audio();bus.current=ctx.createGain();bus.current.gain.value=mute.current?0:.65;bus.current.connect(ctx.destination);
     const current=ctx;
     void data.then(b=>b?current.decodeAudioData(b):null).then(b=>{if(!disposed){voice=b;report(mute.current?'muted':'ready');}}).catch(()=>{});
    }
    return ctx;
   }catch{report('unavailable');return null;}
  };
  const unlock=()=>{const current=prepare();if(current?.state==='suspended')void current.resume().catch(()=>report('blocked'));};
  const track=(source:AudioScheduledSourceNode)=>{voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect();};};
  const stop=()=>{for(const source of voices){try{source.stop();}catch{/* Already ended. */}}voices.clear();};
  const play=(current:AudioContext,onFinished:()=>void)=>{
   if(!bus.current)return;
   if(voice){const source=current.createBufferSource();source.buffer=voice;source.playbackRate.value=1;source.connect(bus.current);track(source);source.onended=()=>{voices.delete(source);source.disconnect();onFinished();};source.start();}
   else{
    const length=HALLOWEEN_SCARE_DURATION/1000;
    // A voiced, wavering cry keeps the scare audible if the clip is unavailable.
    for(const [frequency,level] of [[440,.22],[880,.08]]){
     const source=current.createOscillator(),gain=current.createGain(),filter=current.createBiquadFilter();
     source.type='sawtooth';source.frequency.setValueAtTime(frequency,current.currentTime);source.frequency.exponentialRampToValueAtTime(frequency*.55,current.currentTime+length*.9);
     filter.type='bandpass';filter.frequency.value=frequency*2;filter.Q.value=1.4;
     gain.gain.setValueAtTime(.001,current.currentTime);gain.gain.linearRampToValueAtTime(level,current.currentTime+.02);gain.gain.exponentialRampToValueAtTime(.001,current.currentTime+length-.01);
     source.connect(filter);filter.connect(gain);gain.connect(bus.current);track(source);source.onended=()=>{voices.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};source.start();source.stop(current.currentTime+length);
    }
   }
   report('playing');
  };
  trigger.current=()=>{
   if(document.hidden||!ready||disposed)return;
   if(dismiss)clearTimeout(dismiss);stop();const id=++sequence,duration=voice?voice.duration*1000:HALLOWEEN_SCARE_DURATION,deadline=performance.now()+duration;
   const finish=()=>{if(disposed||sequence!==id)return;sequence++;if(dismiss)clearTimeout(dismiss);setScare(false);stop();};
   dismiss=setTimeout(finish,duration);
   setScare(true);
   if(mute.current)report('muted');
   else{
    const current=prepare();
    const sound=()=>{if(!disposed&&sequence===id&&!mute.current&&performance.now()<deadline&&current?.state==='running'){
     if(dismiss)clearTimeout(dismiss);dismiss=setTimeout(finish,duration+100);
     play(current,finish);
    }};
    if(current?.state==='running')sound();
    else if(current)void current.resume().then(sound).catch(()=>report('blocked'));
   }
  };
  // The previous activation may be the style-picker click, before this component mounted.
  prepare();
  if(navigator.userActivation?.hasBeenActive)unlock();
  window.addEventListener('pointerdown',unlock,true);window.addEventListener('keydown',unlock,true);
  const timer=setInterval(()=>trigger.current(),HALLOWEEN_SCARE_INTERVAL);
  return ()=>{
   disposed=true;trigger.current=()=>{};sequence++;clearInterval(timer);if(dismiss)clearTimeout(dismiss);image.onload=null;
   window.removeEventListener('pointerdown',unlock,true);window.removeEventListener('keydown',unlock,true);
   stop();bus.current=null;if(ctx&&ctx.state!=='closed')void ctx.close().catch(()=>{});
  };
 },[]);
 return <>
  <div className="halloween-decor" aria-hidden="true"><Suspense fallback={null}><HalloweenScene /></Suspense></div>
  {scare&&createPortal(<div className="halloween-fullscreen-scare" aria-hidden="true" data-testid="halloween-fullscreen-scare"><img src={GHOST_IMAGE} alt="" draggable={false}/></div>,document.fullscreenElement??document.body)}
 </>;
});
