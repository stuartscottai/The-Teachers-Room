import { useLayoutEffect, type RefObject } from 'react';

/** Reveal only the active chip horizontally; never move the page or question card. */
export function useActiveTeamScroll(ref:RefObject<HTMLElement>,currentTeam:number){
 useLayoutEffect(()=>{
  const media=matchMedia('(max-width:767px)');
  const reveal=()=>{
   const row=ref.current;if(!row||!media.matches)return;
   const active=row.querySelector<HTMLElement>('[aria-current="true"]');if(!active)return;
   const a=active.getBoundingClientRect(),r=row.getBoundingClientRect();
   const left=a.left-r.left,right=a.right-r.left;
   if(left<4)row.scrollBy({left:left-4,behavior:'instant'});
   else if(right>row.clientWidth-4)row.scrollBy({left:right-row.clientWidth+4,behavior:'instant'});
  };
  reveal();const observer=new ResizeObserver(reveal);if(ref.current)observer.observe(ref.current);
  media.addEventListener('change',reveal);
  return ()=>{observer.disconnect();media.removeEventListener('change',reveal);};
 },[ref,currentTeam]);
}
