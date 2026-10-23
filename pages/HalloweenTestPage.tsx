import React, { useRef, useState } from 'react';
import { HalloweenDecorations, HalloweenDecorationsHandle, HalloweenSoundStatus } from '../components/games/shared/HalloweenDecorations';
import '../components/games/halloween-style.css';

export default function HalloweenTestPage(){
 const ghost=useRef<HalloweenDecorationsHandle>(null);
 const [ready,setReady]=useState(false),[muted,setMuted]=useState(false),[status,setStatus]=useState<HalloweenSoundStatus>('ready');
 const messages={ready:'Sound ready',playing:'Scream played',muted:'Sound muted',blocked:'Sound was blocked by your browser. Click Play ghost again.',unavailable:'Sound is unavailable in this browser.'};
 return <main style={{minHeight:'calc(100dvh - 64px)',position:'relative',overflow:'hidden',background:'#100c19',color:'#fff0cf',display:'grid',placeItems:'center',padding:24}}>
  <HalloweenDecorations ref={ghost} muted={muted} onReady={()=>setReady(true)} onSoundStatus={setStatus}/>
  <section style={{position:'relative',zIndex:100,maxWidth:460,width:'100%',padding:32,border:'3px solid #e77f20',borderRadius:22,background:'#211323',boxShadow:'0 6px 0 #050307',textAlign:'center'}}>
   <h1 className="font-display text-3xl font-bold mb-3">Halloween ghost preview</h1>
   <p className="mb-6">Try the same ghost and full-length scream used in the games, without waiting three minutes.</p>
   <button disabled={!ready} onClick={()=>ghost.current?.trigger()} style={{display:'block',width:'100%',minHeight:52,padding:12,border:'2px solid #ffce77',borderRadius:12,background:'#ff9d2b',color:'#211019',fontWeight:800,opacity:ready?1:.5}}>{ready?'Play ghost + scream':'Loading ghost...'}</button>
   <label style={{display:'flex',justifyContent:'center',alignItems:'center',gap:10,marginTop:24,cursor:'pointer'}}><input type="checkbox" checked={muted} onChange={e=>setMuted(e.target.checked)}/>Mute sound</label>
   <p role="status" style={{marginTop:16,minHeight:48,color:'#ffd292'}}>{muted?'Sound muted':messages[status]}</p>
  </section>
 </main>;
}
