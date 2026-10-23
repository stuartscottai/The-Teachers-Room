import { HalloweenDecorations } from './HalloweenDecorations';
import './flip-mobile-scorebar.css';
import React, { useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Volume2, VolumeX, Maximize2, Minimize2, ArrowLeft, Flag } from 'lucide-react';
import { GeneratedGame, GameRunOptions, TriviaStyle } from '../../../types';
import { normalizeTriviaStyle } from '../../../utils/triviaStyles';
import { saveTriviaStyle } from '../../../services/triviaStyleStorage';
import { useAuth } from '../../../contexts/AuthContext';
import { translateInterfaceText as ui } from '../../../utils/interfaceLanguage';
import { TriviaStylePicker } from '../TriviaStylePicker';
import { TeamScoreboardHeader } from './TeamScoreboardHeader';
import { GameMenuButton } from './GameMenuButton';
import { useWorkspaceDialog } from '../GameWorkspace';
import '../trivia-comic.css';
import '../trivia-skins.css';
import '../trivia-layout.css';
import './flip-game-presentation.css';

import { FlipGamePresentationContext as Presentation, type FlipGameHeaderProps as HeaderProps, type FlipGameControls as Controls } from './FlipGamePresentationContext';

/** Keep each game's score state and actions in that game; move only its UI. */
export function FlipGameHeader({headerRef,confirmActions,...props}:HeaderProps){
 const context=useContext(Presentation);
 useLayoutEffect(()=>{if(!context)return;context.setMounted(true);return()=>context.setMounted(false);},[context?.setMounted]);
 useLayoutEffect(()=>{context?.refresh(value=>value+1);},[context?.refresh,props.isMuted,props.isFullscreen]);
 useLayoutEffect(()=>{context?.setCount(props.scores.length);},[context?.setCount,props.scores.length]);
 if(!context)throw new Error('FlipGameHeader requires the shared game presentation.');
 context.controls.current={...props,confirmActions};
 return <><div ref={headerRef} hidden aria-hidden="true"/>{context.host&&createPortal(<TeamScoreboardHeader {...props} layout="sidebar" optionsOnly onOptions={context.showMenu}/>,context.host)}</>;
}

export function FlipGamePresentation({game,options,children,onSelectedStyle,onSyncReady}:{game:GeneratedGame;options:GameRunOptions;children:React.ReactNode;onSelectedStyle?:(style:TriviaStyle)=>void;onSyncReady?:(sync:()=>void)=>void}){
 const {user}=useAuth();
 const [style,setStyle]=useState(()=>normalizeTriviaStyle(options.triviaStyle??game.config.triviaStyle));
 const [host,setHost]=useState<HTMLDivElement|null>(null),[mounted,setMounted]=useState(false),[open,setOpen]=useState(false),[confirm,setConfirm]=useState<'quit'|'end'|null>(null),[error,setError]=useState(false);
 const [,refresh]=useState(0);
 const [count,setCount]=useState(options.players||2);
 const controls=useRef<Controls|null>(null),paused=useRef(false),saves=useRef(Promise.resolve()),version=useRef(0),styleRef=useRef(style);
 styleRef.current=style;paused.current=open||confirm!==null;
 const dialogRef=useWorkspaceDialog(open||confirm!==null,()=>{setOpen(false);setConfirm(null);});
 const context=useMemo(()=>({host,controls,paused,setMounted,setCount,refresh,showMenu:()=>setOpen(true)}),[host]);
 useLayoutEffect(()=>{onSyncReady?.(()=>onSelectedStyle?.(styleRef.current));},[onSyncReady,onSelectedStyle]);
 const choose=(next:TriviaStyle)=>{setStyle(next);setError(false);const v=++version.current;saves.current=saves.current.then(async()=>{const ok=await saveTriviaStyle(game,next,user?.id);if(v===version.current)setError(!ok);});};
 const invoke=(kind:'quit'|'end')=>{setOpen(false);if(controls.current?.confirmActions)setConfirm(kind);else controls.current?.[kind==='quit'?'onQuit':'onEnd']();};
 return <Presentation.Provider value={context}><div data-flip-game-shell data-trivia-style={style} className={`trivia-game flip-game-shell ${style==='comic-pop'?'trivia-comic':style!=='classic'?'trivia-skinned':''} ${mounted?'has-sidebar':''}`}>
  {style==='halloween'&&<HalloweenDecorations muted={controls.current?.isMuted??options.muted}/>}
  {mounted&&<GameMenuButton onClick={()=>setOpen(true)}/>}
  <div className="flip-game-main">{children}</div>
  <aside className="flip-game-sidebar flip-mobile-scorebar" aria-label={ui('Teams')} style={{'--flip-mobile-columns':count>=5?3:count===4?2:Math.max(count,1),height:`${Math.max(50,count/6*100)}%`,display:mounted?undefined:'none'} as React.CSSProperties}><div ref={setHost} className="flip-game-header-host"/></aside>
  {(open||confirm)&&<div className="flip-game-menu-overlay" onClick={event=>{if(event.target===event.currentTarget){setOpen(false);setConfirm(null);}}}>
   <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={ui(confirm?(confirm==='quit'?'Quit current game?':'End game now?'):'Game options')} className="trivia-theme-dialog trivia-comic-dialog bg-white text-slate-900 p-5 rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl max-h-full overflow-y-auto">
    <div className="flex justify-between items-center gap-3 mb-5"><h2 className="font-display text-2xl font-bold">{ui(confirm?(confirm==='quit'?'Quit current game?':'End game now?'):'Game options')}</h2><button aria-label={ui('Close')} onClick={()=>{setOpen(false);setConfirm(null);}} className="p-2 rounded-lg border"><X size={20}/></button></div>
    {confirm?<div className="grid grid-cols-2 gap-3"><button className="p-3 rounded-xl border" onClick={()=>setConfirm(null)}>{ui('Cancel')}</button><button className="p-3 rounded-xl border" onClick={()=>{const action=confirm;setConfirm(null);controls.current?.[action==='quit'?'onQuit':'onEnd']();}}>{ui(confirm==='quit'?'Quit':'End Game')}</button></div>:<>
     <TriviaStylePicker value={style} onChange={choose}/>{error&&<p role="alert">{ui('Failed to save. Please try again.')}</p>}
     <div className="grid grid-cols-2 gap-3 mt-5">
      <button className="p-3 border rounded-xl flex items-center justify-center gap-2" onClick={()=>{controls.current?.onToggleMute();}}>{controls.current?.isMuted?<VolumeX size={20}/>:<Volume2 size={20}/>} {ui(controls.current?.isMuted?'Unmute':'Mute')}</button>
      <button className="p-3 border rounded-xl flex items-center justify-center gap-2" disabled={!document.fullscreenEnabled} onClick={()=>controls.current?.onToggleFullscreen()}>{controls.current?.isFullscreen?<Minimize2 size={20}/>:<Maximize2 size={20}/>} {ui(controls.current?.isFullscreen?'Exit fullscreen':'Enter fullscreen')}</button>
      <button className="p-3 border rounded-xl flex items-center justify-center gap-2" onClick={()=>invoke('quit')}><ArrowLeft size={20}/>{ui('Quit')}</button>
      <button className="p-3 border rounded-xl flex items-center justify-center gap-2" onClick={()=>invoke('end')}><Flag size={20}/>{ui('End Game')}</button>
     </div><button className="mt-5 p-3 border rounded-xl w-full font-bold bg-brand-blue text-white" onClick={()=>setOpen(false)}>{ui('Done')}</button>
    </>}
   </div>
  </div>}
 </div></Presentation.Provider>;
}
