import { supportsFlipGameStyle } from '../utils/flipGameStyles';
import { supabase } from './supabase';
import { GameType, type GeneratedGame, type TriviaStyle } from '../types';

/** Update just the saved preference, preserving questions, assets and ownership. */
export async function saveTriviaStyle(game:GeneratedGame,style:TriviaStyle,userId?:string):Promise<boolean>{
  if(!supportsFlipGameStyle(game.config.type)||!game.id)return true;
  try{
    if(!userId){
      const library:GeneratedGame[]=JSON.parse(localStorage.getItem('teachersRoomGames')||'[]');
      const index=library.findIndex(saved=>saved.id===game.id&&saved.config.type===game.config.type);
      if(index>=0){library[index]={...library[index],config:{...library[index].config,triviaStyle:style}};localStorage.setItem('teachersRoomGames',JSON.stringify(library));}
      return true;
    }
    // Shared/temporary games can be styled for this session without editing their owner.
    if(game.authorId&&game.authorId!==userId)return true;
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(game.id))return true;
    const {data,error}=await supabase.from('saved_games').select('config').eq('id',game.id).eq('user_id',userId).maybeSingle();
    if(error)throw error;
    if(!data||data.config?.type!==game.config.type)return true;
    const result=await supabase.from('saved_games').update({config:{...data.config,triviaStyle:style}}).eq('id',game.id).eq('user_id',userId).select('id');
    if(result.error)throw result.error;
    return Boolean(result.data?.length);
  }catch(error){console.warn('Could not save game style',error);return false;}
}
