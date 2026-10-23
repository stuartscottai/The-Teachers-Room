import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(file,imports={}){
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('module','exports','require',code)(module,module.exports,name=>{if(name in imports)return imports[name];throw Error(`Unexpected import ${name}`);});return module.exports;
}
const {TRIVIA_STYLES,PICKABLE_TRIVIA_STYLES,HALLOWEEN_STYLE_ENABLED,HALLOWEEN_STYLE_END,normalizeTriviaStyle}=load('utils/triviaStyles.ts');
assert.equal(TRIVIA_STYLES.length,8);
assert.equal(HALLOWEEN_STYLE_ENABLED,Date.now()<Date.parse(HALLOWEEN_STYLE_END));
assert.equal(PICKABLE_TRIVIA_STYLES.includes('halloween'),HALLOWEEN_STYLE_ENABLED);
assert.equal(normalizeTriviaStyle('halloween'),'halloween','Existing seasonal games remain valid after the picker offer expires');
const realNow=Date.now;
try{
 Date.now=()=>Date.parse(HALLOWEEN_STYLE_END)+1;
 const expired=load('utils/triviaStyles.ts');
 assert.equal(expired.PICKABLE_TRIVIA_STYLES.includes('halloween'),false);
 assert.equal(expired.PICKABLE_TRIVIA_STYLES.includes('neon-lights'),true);
 assert.equal(expired.normalizeTriviaStyle('halloween'),'halloween');
 assert.equal(expired.normalizeTriviaStyle(undefined),'classic');
}finally{Date.now=realNow;}

for(const style of TRIVIA_STYLES)assert.equal(normalizeTriviaStyle(style),style);
for(const value of [undefined,null,'','jelly-glass','unknown','__proto__',{},7])assert.equal(normalizeTriviaStyle(value),'classic');
const {GameType}=load('types.ts');
const {supportsFlipGameStyle,FLIP_STYLE_GAMES}=load('utils/flipGameStyles.ts',{'../types':{GameType}});
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))};
let calls=[],current={type:GameType.TRIVIA,triviaStyle:'classic',topic:'Preserve this',playCount:12},readError=null,updateError=null;
const client={from(table){
 let update;const filters=[];
 const query={select(){if(update){calls.push({table,update,filters:[...filters]});return Promise.resolve({data:updateError?null:[{id:'saved'}],error:updateError});}return query;},eq(k,v){filters.push([k,v]);return query;},maybeSingle(){calls.push({table,read:true,filters:[...filters]});return Promise.resolve({data:current?{config:current}:null,error:readError});},update(value){update=value;return query;}};return query;
}};
const {saveTriviaStyle}=load('services/triviaStyleStorage.ts',{'./supabase':{supabase:client},'../types':{GameType},'../utils/flipGameStyles':{supportsFlipGameStyle}});
const game={id:'00000000-0000-4000-8000-000000000001',authorId:'owner',title:'Keep title',config:{type:GameType.TRIVIA,triviaStyle:'classic'},questions:[{question:'Keep me',answer:'Yes'}]};
storage.set('teachersRoomGames',JSON.stringify([game]));
assert.equal(await saveTriviaStyle(game,'toy-blocks'),true);
const saved=JSON.parse(storage.get('teachersRoomGames'))[0];assert.equal(saved.config.triviaStyle,'toy-blocks');assert.deepEqual(saved.questions,game.questions);assert.equal(saved.title,game.title);
assert.equal(await saveTriviaStyle({...game,id:'not-in-library'},'comic-pop'),true);assert.equal(JSON.parse(storage.get('teachersRoomGames')).length,1,'Selecting a style must not create a new library entry');
for(const style of TRIVIA_STYLES){
 calls=[];assert.equal(await saveTriviaStyle(game,style,'owner'),true);
 assert.equal(calls.length,2);assert.deepEqual(calls[0].filters,[['id',game.id],['user_id','owner']]);assert.deepEqual(calls[1].filters,calls[0].filters);
 assert.deepEqual(calls[1].update,{config:{...current,triviaStyle:style}},'Preserve the latest stored config and update no content or ownership');
}
calls=[];assert.equal(await saveTriviaStyle(game,'comic-pop','another-user'),true);assert.equal(calls.length,0,'Never write the creator’s settings when playing a shared game');
current=null;calls=[];assert.equal(await saveTriviaStyle({...game,authorId:undefined},'toy-blocks','owner'),true);assert.equal(calls.length,1,'An unsaved UUID must not create a database record');
current={type:GameType.PLINKO};calls=[];assert.equal(await saveTriviaStyle(game,'jelly-glass','owner'),true);assert.equal(calls.length,1,'Temporary Trivia play must not convert another saved game');
readError={message:'Test offline'};const warn=console.warn;console.warn=()=>{};assert.equal(await saveTriviaStyle(game,'comic-pop','owner'),false);console.warn=warn;
console.log('Passed: eight selected styles, Classic fallback, guest round-trip, owner-only filtered persistence, fresh config preservation, shared/unsaved/converted-game protection and save failure.');


readError=null;updateError=null;
assert.equal(FLIP_STYLE_GAMES.length,9);
for(const type of FLIP_STYLE_GAMES){
 current={type,topic:'Preserve me'};
 for(const style of TRIVIA_STYLES){
  calls=[];const fixture={...game,config:{type}};
  assert.equal(await saveTriviaStyle(fixture,style,'owner'),true);
  assert.equal(calls.length,2);
  assert.deepEqual(calls[1].update.config,{...current,triviaStyle:style});
 }
}
assert.equal(supportsFlipGameStyle(GameType.MILLIONAIRE),false);
assert.equal(supportsFlipGameStyle(GameType.TIME_BOMB),false);
assert.equal(supportsFlipGameStyle(GameType.PLINKO),true);
console.log('Passed: all eight skins persist safely across all nine eligible games.');
