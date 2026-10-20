import React, { useLayoutEffect, useRef } from 'react';
import { motion, useAnimationControls, useReducedMotion, type HTMLMotionProps } from 'framer-motion';

/** One entrance/exit for flip-card games; their card faces and rules stay separate. */
export function QuestionCardMotion({enabled=true,exiting=false,onExitComplete,...props}:HTMLMotionProps<'div'>&{
 enabled?:boolean;exiting?:boolean;onExitComplete?:()=>void;
}) {
 const reduced=useReducedMotion();
  const entrance=useAnimationControls();
  const exitComplete=useRef(onExitComplete);
  exitComplete.current=onExitComplete;
  useLayoutEffect(()=>{
    if(!enabled)return;
    let cancelled=false;
    const animate=async()=>{
      if(!exiting){
        entrance.set(reduced?{opacity:0}:{y:'110vh',rotate:-5,scale:.92,opacity:0});
        await entrance.start(reduced?{opacity:1,transition:{duration:.12}}:{
          y:0,rotate:[-5,2.5,-1,0],scale:1,opacity:1,
          transition:{y:{type:'spring',stiffness:185,damping:16,mass:.9},rotate:{type:'tween',duration:.85,times:[0,.55,.8,1]},scale:{duration:.55},opacity:{duration:.2}}
        });
        return;
      }
      if(reduced){
        await entrance.start({opacity:0,transition:{duration:.12}});
      }else{
        // A small upward lean winds up the downward slide, keeping the answer visible.
        await entrance.start({y:-26,rotate:-3,scale:1.015,transition:{duration:.22,ease:'easeOut'}});
        if(cancelled)return;
        await entrance.start({y:'115vh',rotate:7,scale:.94,opacity:0,transition:{type:'spring',stiffness:85,damping:17,mass:1.15}});
      }
      if(!cancelled)exitComplete.current?.();
    };
    void animate();
    return ()=>{cancelled=true;entrance.stop();};
  },[enabled,exiting,reduced,entrance]);
 return <motion.div {...props} data-question-motion-shell={enabled||undefined} data-card-exiting={exiting||undefined}
  initial={enabled?(reduced?{opacity:0}:{y:'110vh',rotate:-4,scale:.88,opacity:0}):false}
  animate={enabled?entrance:undefined}
 />;
}
