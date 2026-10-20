import { useEffect, useRef } from 'react';
import type { PlinkoSound } from '../../../utils/plinkoAudio';

/** Shared cue timing; each game supplies its own mute-controlled audio player. */
export function useQuestionCardSounds({questionKey,isFlipped,exiting,writing,matches,hasOptions,mcResult,onSound,revealCue}:{
 questionKey:number|string|null;isFlipped:boolean;exiting:boolean;writing:boolean;matches:boolean;
 revealCue?:PlinkoSound;hasOptions:boolean;mcResult:'correct'|'incorrect'|null;onSound?:(cue:PlinkoSound)=>void;
}) {
 const sound=useRef(onSound);sound.current=onSound;
 const previous=useRef<{key:number|string|null;flipped:boolean;exiting:boolean}>({key:null,flipped:false,exiting:false});
 useEffect(()=>{
  if(questionKey===null){previous.current={key:null,flipped:false,exiting:false};return;}
  const old=previous.current;
  previous.current={key:questionKey,flipped:isFlipped,exiting};
  if(old.key!==questionKey){sound.current?.('card-in');return;}
  if(old.flipped!==isFlipped){
   sound.current?.('card-flip');
   if(isFlipped){
    if(revealCue)sound.current?.(revealCue);
    else if(writing)sound.current?.(matches?'correct':'wrong');
    else if(hasOptions&&mcResult)sound.current?.(mcResult==='correct'?'correct':'wrong');
    else sound.current?.('reveal');
   }
  }
  if(exiting&&!old.exiting)sound.current?.('card-out');
 },[questionKey,isFlipped,exiting,writing,matches,hasOptions,mcResult,revealCue]);
}
