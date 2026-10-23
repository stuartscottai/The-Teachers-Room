import React from 'react';
import { useWorkspaceDialog } from '../GameWorkspace';
import { translateInterfaceText as ui } from '../../../utils/interfaceLanguage';

/** Shared accessible editor; each game keeps ownership of its team and score state. */
export function TeamEditDialog({name,score,onNameChange,onScoreChange,onSave,onCancel,scoreLabel=ui('Score'),min,max}:{
 name:string;score:number;onNameChange:(name:string)=>void;onScoreChange:(score:number)=>void;
 onSave:()=>void;onCancel:()=>void;scoreLabel?:string;min?:number;max?:number;
}){
 const ref=useWorkspaceDialog<HTMLFormElement>(true,onCancel);
 return <div className="fixed inset-0 z-[3600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
  <form ref={ref} role="dialog" aria-modal="true" aria-label={ui('Edit team')} className="trivia-theme-dialog trivia-comic-dialog bg-white text-slate-900 p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 max-h-[90dvh] overflow-y-auto" onSubmit={event=>{event.preventDefault();onSave();}}>
   <h2 className="text-xl font-bold mb-5">{ui('Edit team')}</h2>
   <label className="block mb-4 text-sm font-bold">{ui('Team name')}<input autoFocus value={name} maxLength={50} onChange={event=>onNameChange(event.target.value)} className="mt-2 w-full p-3 border border-slate-200 rounded-lg text-base"/></label>
   <label className="block mb-5 text-sm font-bold">{scoreLabel}<input type="number" value={score} min={min} max={max} step="1" onChange={event=>onScoreChange(Number(event.target.value)||0)} className="mt-2 w-full p-3 border border-slate-200 rounded-lg text-lg"/></label>
   <div className="grid grid-cols-2 gap-3"><button type="button" className="p-3 rounded-lg bg-slate-100 font-bold" onClick={onCancel}>{ui('Cancel')}</button><button type="submit" className="p-3 rounded-lg bg-brand-blue text-white font-bold">{ui('Save')}</button></div>
  </form>
 </div>;
}
