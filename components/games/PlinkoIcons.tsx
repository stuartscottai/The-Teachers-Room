import React from 'react';
import { Square, Triangle, Star, Smile, GraduationCap } from 'lucide-react';
import { PlinkoBonus, PlinkoShape, PlinkoAppearance } from '../../utils/plinko';

export const PLINKO_FACES = ['Grinning', 'Winking', 'Sunglasses', 'Heart eyes', 'Surprised', 'Cheeky'] as const;
const FACE_EMOJI = ['😀','😉','😎','😍','😮','😛'];
const CREATURES: Record<string,string> = { dynamite:'🧨',lizard:'🦎',chicken:'🐔',egg:'🥚',doll:'🪆','doll-left':'🪆','doll-right':'🪆',dragon:'🐲',tornado:'🌪️' };
export const PLINKO_BONUS_COPY: Record<PlinkoBonus, {label:string;description:string}> = {
  'two-balls': {label:'Two Balls',description:'Two of your chips. Both collect peg points and box points.'},
  bouncy: {label:'Extra Bouncy Ball',description:'A super bouncy ball with much stronger rebounds.'},
  dynamite: {label:'Dynamite',description:'A three-second countdown, then an explosion clears nearby pegs.'},
  lizard: {label:'The Lizard',description:'A short tongue grabs nearby pegs and swings from them. Its reach is limited.'},
  chicken: {label:'The Chicken',description:'Lays ten bouncing eggs. Eggs collect pegs; only the chicken scores the box.'},
  doll: {label:'The Russian Doll',description:'Opens on peg hits, up to five times. Pieces collect pegs; only the smallest released doll scores the box.'},
  dragon: {label:'The Dragon',description:'Breathes fire repeatedly to scorch pegs in its path.'},
  sonic: {label:'Sonic',description:'Zooms in straight lines without gravity, ricochets off pegs and walls, then drops into a box.'},
  blob: {label:'Dumpling',description:'Stops halfway down and stretches around pegs. Touching an electric side makes it pop and flutter into a box.'},
  tornado: {label:'The Tornado',description:'Pulls nearby pegs into its spinning path and rebounds from them.'},
};
export const PLINKO_SHAPE_NAMES: Record<PlinkoShape,string> = {square:'Square',triangle:'Triangle',star:'Star',smile:'Happy face',logo:'Teachers Room logo'};
export function PlinkoChipArtwork({appearance='face',face=0}:{appearance?:PlinkoAppearance;face?:number}) {
  const half=appearance==='doll-left'||appearance==='doll-right';
  if(appearance!=='face'&&appearance!=='egg') return <svg x="-12" y="-12" width="24" height="24" viewBox={half ? (appearance==='doll-left'?'0 0 12 24':'12 0 12 24'):'0 0 24 24'} overflow="hidden"><image href={`/assets/games/plinko/bonuses/${half?'doll':appearance==='blob'?'dumpling':appearance}-${appearance==='dragon'||appearance==='sonic'?'v2':'v1'}.webp`} width="24" height="24"/></svg>;
  return <svg x="-12" y="-12" width="24" height="24" viewBox={half ? (appearance==='doll-left'?'0 0 12 24':'12 0 12 24'):'0 0 24 24'} overflow="hidden"><text x="12" y="20" textAnchor="middle" fontSize="22" fontFamily="Segoe UI Emoji, Apple Color Emoji, sans-serif">{appearance==='face'?FACE_EMOJI[Math.max(0,face)%6]:CREATURES[appearance]}</text></svg>;
}
export function PlinkoFaceIcon({face,size=42}:{face:number;size?:number}) {return <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden="true"><PlinkoChipArtwork face={face}/></svg>;}
export function PlinkoBonusIcon({bonus,size=32}:{bonus:PlinkoBonus;size?:number}) {
  return <img src={`/assets/games/plinko/bonuses/${bonus==='blob'?'dumpling':bonus}-${bonus==='sonic'?'v2':'v1'}.webp`} width={size} height={size} alt="" aria-hidden="true" draggable={false}/>;
}
export function PlinkoShapeIcon({shape,size=24}:{shape:PlinkoShape;size?:number}) {const Icon={square:Square,triangle:Triangle,star:Star,smile:Smile,logo:GraduationCap}[shape];return <Icon size={size} aria-hidden="true"/>;}
