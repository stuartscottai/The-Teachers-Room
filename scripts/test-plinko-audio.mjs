import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const module={exports:{}};
new Function('module','exports',ts.transpileModule(fs.readFileSync('utils/plinkoAudio.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(module,module.exports);
const {PlinkoAudio,PlinkoPegSoundBag,PLINKO_PEG_SOUNDS}=module.exports;
assert.equal(PLINKO_PEG_SOUNDS.length,10);
let seed=741;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),bag=new PlinkoPegSoundBag(random);
let last=-1;
for(let cycle=0;cycle<100;cycle++){const batch=Array.from({length:10},()=>bag.next());assert.equal(new Set(batch).size,10);assert.notEqual(batch[0],last);assert.ok(batch.every(n=>n>=0&&n<10));last=batch.at(-1);}
const muted=new PlinkoAudio(true);muted.unlock();assert.equal(muted.play('peg'),false);muted.dispose();muted.dispose();
console.log('Passed: ten distinct shuffled peg sounds, no boundary repeats across 100 cycles, safe muted start and cleanup.');
