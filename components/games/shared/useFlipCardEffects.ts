import { useEffect, useRef, useState, type PointerEvent, type FocusEvent, type KeyboardEvent } from 'react';
import { PlinkoAudio, type PlinkoSound } from '../../../utils/plinkoAudio';
import { useQuestionCardSounds } from './useQuestionCardSounds';

export function useFlipCardEffects({questionKey,isFlipped,muted,writing=false,matches=false,hasOptions=false,mcResult=null,revealCue}:{
 questionKey:string|number|null;isFlipped:boolean;muted:boolean;writing?:boolean;matches?:boolean;
 hasOptions?:boolean;mcResult?:'correct'|'incorrect'|null;revealCue?:PlinkoSound;
}) {
 const audio=useRef<PlinkoAudio|null>(null);
 if(!audio.current)audio.current=new PlinkoAudio(muted,false);
 const [exiting,setExiting]=useState(false);
 const pending=useRef<(()=>void)|null>(null),finishing=useRef(false);
 useEffect(()=>{audio.current?.setMuted(muted);},[muted]);
 useEffect(()=>{
  const unlock=()=>audio.current?.unlock();
  window.addEventListener('pointerdown',unlock,true);window.addEventListener('keydown',unlock,true);
  return ()=>{window.removeEventListener('pointerdown',unlock,true);window.removeEventListener('keydown',unlock,true);audio.current?.dispose();};
 },[]);
 const sound=(cue:PlinkoSound)=>{audio.current?.play(cue);};
 useQuestionCardSounds({questionKey,isFlipped,exiting,writing,matches,hasOptions,mcResult,revealCue,onSound:sound});
 const close=(action:()=>void,correct?:boolean)=>{
  if(finishing.current){action();return;}
  if(pending.current)return;
  if(questionKey===null){action();return;}
  if(correct!==undefined&&!writing&&!hasOptions)sound(correct?'correct':'wrong');
  pending.current=action;setExiting(true);
 };
 const onExitComplete=()=>{
  const action=pending.current;if(!action)return;
  pending.current=null;setExiting(false);finishing.current=true;
  try{action();}finally{finishing.current=false;}
 };
 const hover=(target:EventTarget|null,related:EventTarget|null)=>{
  const button=target instanceof Element?target.closest('button'):null;
  if(button&&!button.disabled&&!(related instanceof Node&&button.contains(related)))sound('hover');
 };
 return {key:questionKey??'inactive',close,sound,exiting,motionProps:{exiting,onExitComplete,
  onPointerOverCapture:(event:PointerEvent<HTMLDivElement>)=>{if(event.pointerType==='mouse')hover(event.target,event.relatedTarget);},
  onFocusCapture:(event:FocusEvent<HTMLDivElement>)=>hover(event.target,event.relatedTarget),
  onKeyDownCapture:(event:KeyboardEvent<HTMLDivElement>)=>{if(pending.current){event.preventDefault();event.stopPropagation();}},
  style:exiting?{pointerEvents:'none' as const}:undefined,
 }};
}
