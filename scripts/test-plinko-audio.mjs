import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const module={exports:{}};
new Function('module','exports',ts.transpileModule(fs.readFileSync('utils/plinkoAudio.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(module,module.exports);
const {PlinkoAudio,PlinkoPegSoundBag,PLINKO_PEG_SOUNDS,PLINKO_PEG_CLIPS}=module.exports;
assert.equal(PLINKO_PEG_SOUNDS.length,7);
const soundCount=PLINKO_PEG_SOUNDS.length;
const sources=JSON.parse(fs.readFileSync('public/assets/audio/plinkemoji/pegs/sources.json','utf8'));
assert.deepEqual(PLINKO_PEG_CLIPS.map(c=>c.file),sources.map(s=>s.file));
for(const clip of sources){
 assert.ok(fs.statSync(`public/assets/audio/plinkemoji/pegs/${clip.file}`).size>1000);
 assert.ok(clip.durationSeconds>0&&clip.durationSeconds<=.85);
 assert.ok(clip.source.startsWith('https://pixabay.com/sound-effects/'));
}
let seed=741;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),bag=new PlinkoPegSoundBag(random);
let last=-1;
for(let cycle=0;cycle<100;cycle++){const batch=Array.from({length:soundCount},()=>bag.next());assert.equal(new Set(batch).size,soundCount);assert.notEqual(batch[0],last);assert.ok(batch.every(n=>n>=0&&n<soundCount));last=batch.at(-1);}
const muted=new PlinkoAudio(true);muted.unlock();assert.equal(muted.play('peg'),false);muted.dispose();muted.dispose();
assert.equal(muted.play('dumpling-pop'),false,'The Dumpling scream respects mute');
const scream=fs.readFileSync('public/assets/audio/plinkemoji/dumpling-scream-v1.wav');
assert.equal(scream.toString('ascii',0,4),'RIFF');
assert.equal(scream.toString('ascii',8,12),'WAVE');
assert.ok(scream.length>5000&&scream.length<80000,'The short cry stays small enough to load quickly');
console.log('Passed: seven trimmed Pixabay peg clips and shuffled sounds, no boundary repeats across 100 cycles, safe muted start and cleanup.');
