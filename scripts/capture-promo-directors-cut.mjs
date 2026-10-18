// Offline full-HD frames: game time advances once per output frame, regardless
// of how long the machine takes to draw it. No low-bitrate browser recording.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('output/playwright/promo-directors-cut');
const base = process.env.PROMO_BASE_URL || 'http://127.0.0.1:5174';
const fps = 30;
await fs.mkdir(root, { recursive: true });
const manifestPath = path.join(root, 'frames.json');
let manifest = {};
try { manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')); } catch {}
const browser = await chromium.launch({ headless: true, args: ['--window-size=1920,1080'] });
const selected = process.argv.slice(2);
const wants = name => !selected.length || selected.includes(name) || selected.some(take => take.startsWith(`${name}-`))
  || (name === 'darts' && selected.includes('dart-throw'));
const save = async () => {
  await fs.writeFile(path.join(root, `capture-${process.pid}.json`), JSON.stringify(manifest, null, 2));
  let current = {};
  try { current = JSON.parse(await fs.readFile(manifestPath, 'utf8')); } catch {}
  await fs.writeFile(manifestPath, JSON.stringify({ ...current, ...manifest }, null, 2));
};

async function open(mode, { mobile = false, stage = 'question' } = {}) {
  // Match the website's tighter card-to-screen spacing using the browser's
  // normal layout at 125% density. Screenshots still contain native 1920x1080
  // pixels; no video enlargement, stretching, cropping or card CSS overrides.
  const compactDesktop = !mobile && ['trivia', 'timebomb', 'snakes', 'wordwheel', 'darts'].includes(mode);
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : compactDesktop ? { width: 1536, height: 864 } : { width: 1920, height: 1080 },
    deviceScaleFactor: compactDesktop ? 1.25 : 1, reducedMotion: 'no-preference',
  });
  if (mode === 'snakes') await context.addInitScript(() => {
    // Own the two WebGL render loops explicitly. A general-purpose fake clock
    // can stall when the room and dice recursively schedule animation frames.
    const NativeDate = Date, epoch = NativeDate.now();
    let time = 0, nextId = 1;
    const timers = new Map(), rafs = new Map();
    window.Date = class extends NativeDate {
      constructor(...args) { args.length ? super(...args) : super(epoch + time); }
      static now() { return epoch + time; }
    };
    Object.defineProperty(performance, 'now', { configurable: true, value: () => time });
    const schedule = (callback, delay, interval, args) => {
      const id = nextId++;
      timers.set(id, { callback, due: time + Math.max(0, Number(delay) || 0), interval, args });
      return id;
    };
    window.setTimeout = (callback, delay, ...args) => schedule(callback, delay, 0, args);
    window.setInterval = (callback, delay, ...args) => schedule(callback, delay, Math.max(1, Number(delay) || 1), args);
    window.clearTimeout = window.clearInterval = id => timers.delete(id);
    window.requestAnimationFrame = callback => { const id = nextId++; rafs.set(id, callback); return id; };
    window.cancelAnimationFrame = id => rafs.delete(id);
    window.__promoAdvanceClock = dt => {
      time += dt;
      for (const [id, timer] of [...timers].sort((a,b) => a[1].due - b[1].due)) {
        if (timer.due > time || !timers.has(id)) continue;
        if (timer.interval) timer.due = time + timer.interval;
        else timers.delete(id);
        if (typeof timer.callback === 'function') timer.callback(...timer.args);
      }
      const batch = [...rafs.values()]; rafs.clear();
      for (const callback of batch) callback(time);
    };
  });
  await context.addInitScript(() => {
    localStorage.setItem('teachersRoomTourPromptDisabled', '1');
    localStorage.setItem('teachers-room-theme', 'light');
    localStorage.setItem('teachers-room-language', 'en');
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Pause on the blank page, before any game has started its clocks.
  if (mode !== 'snakes') {
    await page.clock.install({ time: 0 });
    await page.clock.pauseAt(100000);
  }
  const url = mode === 'livequiz' ? '/test/live-quiz-smoke?mode=teacher&promo=1'
    : mode === 'mobile' ? `/test/live-quiz-smoke?mode=student&promo=1&stage=${stage}`
      : `/test/game-smoke?mode=${mode}&promo=1&timer=60`;
  await page.goto(base + url);
  await page.locator(mode === 'mobile' ? 'main h1,main h2' : mode === 'livequiz' ? 'main button' : '[data-testid="game-smoke-root"] button').first().waitFor({ state: 'attached' });
  await page.addStyleTag({ content: `nav,footer{display:none!important}main{padding-top:0!important}html,body{margin:0!important}*{cursor:none!important}
    .gameplay-viewport,.gameplay-appearance,.gameplay-appearance>div{width:100vw!important;height:100dvh!important}
    .gameplay-appearance>div{top:0!important}
    ${['livequiz','mobile'].includes(mode) ? '.playful-route-frame>div{height:100dvh!important;min-height:100dvh!important}' : ''}
    ${mode === 'mobile' ? '.playful-route-frame>div>div{min-height:0!important;height:100%!important}' : ''}` });
  await page.evaluate(() => document.fonts.ready);
  const click = async name => page.getByRole('button', { name }).first().dispatchEvent('click');

  async function advance(ms) {
    if (mode === 'snakes') await page.evaluate(dt => window.__promoAdvanceClock(dt), ms);
    else await page.clock.fastForward(ms);
    await page.evaluate(async dt => {
      const state = window.__promoFrameState ||= { animations: new WeakMap(), videos: new WeakMap() };
      const header = document.querySelector('.team-scoreboard-header,[data-scoreboard-header]');
      const overlay = document.querySelector('[data-written-question-overlay]:not([data-written-inline])');
      if (header && overlay && getComputedStyle(overlay).position === 'fixed') {
        overlay.style.setProperty('top', `${Math.max(0, header.getBoundingClientRect().bottom)}px`, 'important');
      }
      for (const animation of document.getAnimations()) {
        let time = state.animations.get(animation);
        if (time === undefined) { time = 0; animation.pause(); }
        time += dt;
        animation.currentTime = time;
        state.animations.set(animation, time);
      }
      for (const video of document.querySelectorAll('video')) {
        if (video.readyState < 2 || !Number.isFinite(video.duration)) continue;
        let time = state.videos.get(video) ?? 0;
        video.pause();
        time = Math.min(video.duration - .001, time + dt / 1000);
        state.videos.set(video, time);
        if (Math.abs(video.currentTime - time) > .005) {
          await new Promise(resolve => {
            video.addEventListener('seeked', resolve, { once: true });
            video.currentTime = time;
          });
        }
      }
    }, ms);
  }

  async function until(test, limit = 150) {
    for (let attempt = 0; attempt < limit; attempt++) {
      if (await page.evaluate(test)) return;
      await advance(500);
      if (attempt && attempt % 25 === 0) console.log(`${mode}: preparing renderer (${attempt} steps)`);
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw Error(`${mode}: timed out waiting for game readiness`);
  }

  await advance(1200);
  if (mode === 'millionaire') { await click(/Let's Play/i); await advance(1000); }
  if (mode === 'darts') {
    await page.waitForTimeout(3000);
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Skip')?.click());
    await advance(1200);
  }
  if (mode === 'snakes') {
    await until(() => document.querySelector('.snl-board-webgl')?.getAttribute('data-board-settled') === 'true', 300);
    await click(/Start Game/i);
    await until(() => document.querySelector('.snl-board-webgl')?.getAttribute('data-board-settled') === 'true', 200);
  }
  async function still(name) {
    const filename = path.join(root, `${name}.png`);
    await page.screenshot({ path: filename });
    manifest[name] = { still: filename, width: mobile ? 390 : 1920, height: mobile ? 844 : 1080, errors };
    await save();
  }
  async function film(name, seconds, actions = {}) {
    const dir = path.join(root, name);
    await fs.mkdir(dir, { recursive: true });
    const frames = Math.round(seconds * fps);
    for (let frame = 0; frame < frames; frame++) {
      if (actions[frame]) await actions[frame]();
      await advance(Math.round((frame + 1) * 1000 / fps) - Math.round(frame * 1000 / fps));
      await page.screenshot({ path: path.join(dir, `${String(frame).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 97 });
      if (frame && frame % 30 === 0) console.log(`${name}: ${frame}/${frames} frames`);
    }
    manifest[name] = { dir, frames, fps, seconds: frames / fps, width: mobile ? 390 : 1920, height: mobile ? 844 : 1080, errors };
    await save();
    console.log(`${name}: complete (${frames} full-resolution frames)`);
  }
  async function answer() {
    const questions = JSON.parse(await page.getByTestId('game-smoke-root').getAttribute('data-promo-questions'));
    const body = await page.locator('body').innerText();
    const question = questions.find(question => body.includes(question.question));
    if (!question) throw Error(`${mode}: no visible fixture question`);
    const escaped = question.answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await click(new RegExp(escaped, 'i'));
    return question;
  }
  return { page, context, click, advance, until, still, film, answer };
}

async function run(mode, task) {
  const scene = await open(mode);
  try { await task(scene); }
  catch (error) {
    await scene.page.screenshot({ path: path.join(root, `${mode}-error.png`) }).catch(() => {});
    await fs.writeFile(path.join(root, `${mode}-error.txt`), String(error.stack) + '\n' + await scene.page.locator('body').innerText());
    throw error;
  } finally { await scene.context.close(); }
}

try {
  const boards = ['trivia', 'timebomb', 'snakes', 'wordwheel', 'millionaire', 'darts', 'survey', 'jeopardy', 'pubquiz', 'stopfire', 'blockbeaters', 'livequiz'];
  for (const mode of boards) {
    if (!wants(mode)) continue;
    console.log(`Preparing ${mode}`);
    await run(mode, async scene => {
      const { page, click, advance, until, still, film, answer } = scene;
      if (mode === 'snakes') await page.locator('.snl-turn-overlay').evaluate(element => element.style.visibility = 'hidden');
      if (mode === 'stopfire') { await click(/^Start Round$/i); await advance(1000); }
      if (mode === 'livequiz') { await still('live-lobby'); await click(/Start Game/i); await advance(500); }
      if (!selected.length || selected.includes(mode) || selected.includes(`board-${mode}`)) await still(`board-${mode}`);

      if (mode === 'trivia') {
        await click(/^1$/); await advance(1000);
        await film('trivia-qa', 4, { 45: answer });
      }
      if (mode === 'timebomb') {
        await click(/ARM BOMB/i); await advance(500);
        await film('timebomb-qa', 4, { 45: answer, 90: answer });
        // Keep the approved explosion take when only the card is requested.
        if (selected.includes('timebomb-qa')) return;
        // Let the actual game timer expire and film its real radioactive effect.
        for (let tick = 0; tick < 350 && !await page.locator('.time-bomb-splat-video').count(); tick++) await advance(100);
        await page.locator('.time-bomb-splat-video').waitFor({ state: 'attached' });
        await page.locator('.time-bomb-splat-video').evaluate(video => new Promise(resolve => {
          if (video.readyState >= 2) resolve(); else video.addEventListener('loadeddata', resolve, { once: true });
        }));
        await film('barrel-explosion', 3);
      }
      if (mode === 'snakes') {
        await page.locator('.snl-turn-overlay').evaluate(element => element.style.visibility = '');
        await page.locator('.snl-dice[aria-label="Roll Dice"]').dispatchEvent('click');
        await until(() => document.querySelector('.snl-board-webgl')?.getAttribute('data-game-phase') === 'question');
        await advance(1000);
        await film('snakes-qa', 4, { 45: answer });
        if (!selected.includes('snakes-qa')) {
          await click(/^Continue$/i); await advance(850);
          await film('snakes-move', 4);
        }
      }
      if (mode === 'wordwheel') {
        await click(/^Start$/i); await advance(600);
        await film('wordwheel-qa', 4, {
          35: () => page.getByPlaceholder(/Type your answer/i).fill('Astronaut'),
          50: () => click(/^Submit$/i),
        });
      }
      if (mode === 'millionaire') await film('millionaire-qa', 5, { 40: answer });
      if (mode === 'darts') {
        const canvas = await page.locator('canvas').first().boundingBox();
        if (!canvas) throw Error('Darts canvas is missing');
        const centre = { x: canvas.x + canvas.width / 2, y: canvas.y + canvas.height / 2 };
        await page.mouse.move(centre.x, centre.y); await advance(100);
        await page.mouse.click(centre.x, centre.y); await advance(1000); await answer(); await advance(1200);
        await click(/Throw Dart/i);
        await film('dart-throw', 2);
        const phase = await page.locator('[data-darts-phase]').getAttribute('data-darts-phase');
        if (phase !== 'result' && phase !== 'aim') throw Error(`Dart did not land: ${phase}`);
        if (!/bullseye/i.test(await page.locator('body').innerText())) throw Error('Promo dart must land in the bullseye');
      }
      if (mode === 'survey') {
        await page.getByPlaceholder(/TYPE ANSWER/i).fill('Spaceship');
        await page.getByPlaceholder(/TYPE ANSWER/i).press('Enter');
        await film('survey-x', 2);
      }
      if (mode === 'livequiz') {
        await film('live-teacher', 3, { 60: () => click(/Reveal Answer/i) });
        await click(/Show Leaderboard/i);
        await film('live-scoreboard', 3);
        await click(/End Game/i); await advance(1000);
        await film('winners', 4);
      }
    });
  }
  if (wants('mobile') || wants('livequiz')) {
    for (const stage of ['lobby', 'question']) {
      const scene = await open('mobile', { mobile: true, stage });
      try {
        if (stage === 'lobby') await scene.still('mobile-lobby');
        else await scene.film('live-mobile', 3, { 45: () => scene.click(/Red and blue/i) });
      } finally { await scene.context.close(); }
    }
  }
} finally { await browser.close(); }
