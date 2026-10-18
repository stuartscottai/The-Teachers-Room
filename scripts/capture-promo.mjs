// Record complete, uncropped game surfaces using the local test-suite routes.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('output/playwright/promo-v2');
await fs.mkdir(root, { recursive: true });
const base = process.env.PROMO_BASE_URL || 'http://127.0.0.1:5174';
const modes = process.argv.slice(2);
const selected = modes.length ? modes : ['jeopardy', 'millionaire', 'survey', 'pubquiz', 'darts', 'snakes', 'timebomb', 'stopfire', 'trivia', 'wordwheel', 'blockbeaters', 'livequiz'];
const browser = await chromium.launch({ headless: true, args:['--window-size=1920,1080'] });
const manifestPath = path.join(root, 'captures.json');
let manifest = {};
try { manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')); } catch {}
for (const mode of selected) {
  const size = { width:1920, height:1080 };
  const context = await browser.newContext({ viewport:size, deviceScaleFactor:1,
    reducedMotion:'no-preference', recordVideo:{dir:root,size} });
  await context.addInitScript(() => {
    localStorage.setItem('teachersRoomTourPromptDisabled','1');
    localStorage.setItem('teachers-room-theme','light');
    localStorage.setItem('teachers-room-language','en');
  });
  const createdAt=Date.now();
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const click=async name=>page.getByRole('button',{name}).first().click({timeout:20000});
  const wait=ms=>page.waitForTimeout(ms);
  const timestamp=()=> (Date.now()-createdAt)/1000;
  const screenshot=label=>page.screenshot({path:path.join(root,`${mode}-${label}.png`)});
  try {
    await page.goto(`${base}${mode==='livequiz'?'/test/live-quiz-smoke?mode=teacher&promo=1':`/test/game-smoke?mode=${mode}&promo=1&timer=60`}`);
    await page.locator(mode==='livequiz'?'main h1':'[data-testid="game-smoke-root"] .gameplay-appearance button').first().waitFor({state:'attached'});
    await wait(1600);
    // Native fullscreen clips Chromium's recording surface to its headless
    // screen size. Instead fit the existing game root to the recorded viewport.
    await page.addStyleTag({content:'nav,footer{display:none!important}main{padding-top:0!important}html,body{margin:0!important}.gameplay-viewport,.gameplay-appearance,.gameplay-appearance>div{width:100vw!important;height:100dvh!important}*{cursor:none!important}'});
    if(mode==='livequiz')await page.addStyleTag({content:'main>div{height:100dvh!important;min-height:100dvh!important}'});
    await wait(600);
    const questions=mode==='livequiz'?[]:JSON.parse(await page.getByTestId('game-smoke-root').getAttribute('data-promo-questions'));
    if(mode==='millionaire')await click(/Let's Play/i);
    if(mode==='snakes'){
      await click(/Start Game/i);
      await page.waitForFunction(()=>document.querySelector('.snl-board-webgl')?.getAttribute('data-board-settled')==='true',null,{timeout:90000});
      // Film the complete board first, then restore the normal dice controls.
      await page.locator('.snl-turn-overlay').evaluate(el=>el.style.visibility='hidden');
    }
    if(mode==='darts'){
      // The intro can finish while its Skip button is being located.
      await page.evaluate(()=>Array.from(document.querySelectorAll('button')).find(button=>button.textContent?.trim()==='Skip')?.click());
      await wait(3000);
    }
    if(mode==='livequiz')await click(/Start Game/i);
    await page.evaluate(()=>window.scrollTo(0,0));
    await wait(450);
    const overview=timestamp();
    await screenshot('overview');
    const boardText=await page.locator('body').innerText();
    const bounds=await page.evaluate(()=>{
      const el=document.querySelector('.gameplay-viewport')||document.querySelector('main');
      const r=el.getBoundingClientRect();
      return {x:r.x,y:r.y,width:r.width,height:r.height,viewport:[innerWidth,innerHeight]};
    });
    // Two seconds of the popup, then one second of the unobstructed overview.
    await wait(3000);
    if(mode==='jeopardy')await click(/^100$/);
    if(mode==='trivia')await click(/^1$/);
    if(mode==='blockbeaters')await click(/^Tile /);
    if(mode==='pubquiz'){await click(/Around the world/i);await click(/^Start$/i);}
    if(mode==='timebomb')await click(/ARM BOMB/i);
    if(mode==='stopfire')await click(/^Start Round$/i);
    if(mode==='wordwheel')await click(/^Start$/i);
    if(mode==='darts')await page.mouse.click(960,570);
    if(mode==='snakes'){
      await page.locator('.snl-turn-overlay').evaluate(el=>el.style.visibility='');
      await page.locator('.snl-dice[aria-label="Roll Dice"]').dispatchEvent('click');
    }
    if(mode==='livequiz')await click(/Reveal Answer/i);
    await wait(900);
    const action=timestamp();
    let throwStart,impactAt;
    await screenshot('action');
    const actionText=await page.locator('body').innerText();
    const visibleQuestion=questions.find(q=>actionText.includes(q.question));
    if(['jeopardy','trivia','blockbeaters','millionaire','timebomb','darts','snakes'].includes(mode)){
      if(visibleQuestion){
        const escaped=visibleQuestion.answer.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        const answer=page.getByRole('button',{name:new RegExp(escaped,'i')}).first();
        if(await answer.isVisible())await answer.click();
      }
    }
    if(mode==='pubquiz')await click(/Reveal Answer/i);
    if(mode==='darts'){
      const dart=page.getByRole('button',{name:/Throw Dart/i});
      await dart.waitFor({state:'visible',timeout:15000});
      throwStart=timestamp();
      await dart.click();
      await page.locator('[data-darts-phase=throwing]').waitFor({timeout:10000});
      await wait(180);
      await screenshot('flight');
      await page.waitForFunction(()=>document.querySelector('[data-darts-phase]')?.getAttribute('data-darts-phase')!=='throwing',null,{timeout:20000});
      impactAt=timestamp();
      await screenshot('impact');
    }
    if(mode==='wordwheel'){
      await page.getByPlaceholder(/Type your answer/i).fill('Astronaut');await click(/^Submit$/i);
    }
    if(mode==='survey'){
      await page.getByPlaceholder(/TYPE ANSWER/i).fill('Trees');await page.keyboard.press('Enter');
      await wait(700);await page.getByPlaceholder(/TYPE ANSWER/i).fill('Dogs');await page.keyboard.press('Enter');
    }
    if(mode==='livequiz')await click(/Show Leaderboard/i);
    await wait(1600);
    if(['trivia','jeopardy'].includes(mode)){
      const next=page.getByRole('button',{name:/^Continue$/i});if(await next.isVisible())await next.click();
    }
    await wait(2400);
    const returnAt=timestamp();
    await screenshot('return');
    await wait(2500);
    const video=page.video();
    await context.close();
    const filename=path.join(root,`${mode}.webm`);await video.saveAs(filename);
    manifest[mode]={file:filename,overview,action,throwStart,impactAt,returnAt,width:size.width,height:size.height,bounds,
      question:visibleQuestion?.question,answer:visibleQuestion?.answer,boardText,errors};
    await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2));
    console.log(`${mode}: full surface captured; ${questions.length} question references; ${errors.length} browser errors`);
  } catch(error){
    console.error(`${mode}: ${error.message}`);
    await screenshot('error').catch(()=>{});
    await fs.writeFile(path.join(root,`${mode}-error.txt`),await page.locator('body').innerText()).catch(()=>{});
    await context.close();process.exitCode=1;
  }
}
await browser.close();
