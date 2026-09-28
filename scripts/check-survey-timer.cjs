async page => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.goto('http://localhost:5175/test/survey-showdown-capture?timer=3');
  const timer = page.getByRole('timer');
  await timer.waitFor();
  if (await timer.textContent() !== '3s') throw new Error('Initial timer wrong');
  await page.getByRole('button', { name: 'Pause timer' }).click();
  await page.clock.runFor(5000);
  if (await timer.textContent() !== '3s') throw new Error('Pause failed');
  await page.getByRole('button', { name: 'Resume timer' }).click();
  await page.clock.runFor(3100);
  await page.getByRole('alert').waitFor();
  await page.clock.runFor(1600);
  if (await timer.textContent() !== '3s') throw new Error('Next turn did not reset');
  await page.getByPlaceholder('TYPE ANSWER...').fill('Paper');
  await page.getByPlaceholder('TYPE ANSWER...').press('Enter');
  if (await timer.textContent() !== '3s') throw new Error('Correct answer did not reset');
  await page.clock.runFor(1000);
  await page.getByRole('button', { name: 'Pause timer' }).click();
  const remaining = await timer.textContent();
  await page.clock.runFor(5000);
  if (await timer.textContent() !== remaining) throw new Error('Remaining time not preserved');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'output/playwright/survey-timer-mobile.png' });
  await page.goto('http://localhost:5175/test/survey-showdown-capture', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('TYPE ANSWER...').waitFor();
  if (await page.getByRole('timer').count()) throw new Error('No Timer still displays timer');
  await page.clock.resume();
  console.log('PASS: pause/resume, expiry and reset, correct-answer reset, mobile layout, no-timer mode');
}

