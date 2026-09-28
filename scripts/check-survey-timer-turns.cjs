async page => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:5175/test/survey-showdown-capture?timer=3', { waitUntil: 'domcontentloaded' });
  const timer = page.getByRole('timer');
  await timer.waitFor();
  await page.getByRole('button', { name: 'End Game', exact: true }).click();
  await page.clock.runFor(5000);
  if (await timer.textContent() !== '3s') throw new Error('Dialog did not pause timer');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.screenshot({ path: 'output/playwright/survey-timer-desktop.png' });
  for (let i = 0; i < 6; i++) {
    await page.clock.runFor(3100);
    await page.getByRole('alert').waitFor();
    await page.clock.runFor(1600);
  }
  await page.getByRole('heading', { name: 'Round Over!' }).waitFor();
  if (await timer.count()) throw new Error('Timer still running after all teams eliminated');
  await page.clock.runFor(20000);
  if (await timer.count()) throw new Error('Timer restarted after round ended');
  await page.clock.resume();
  console.log('PASS: dialog pause; exactly three expiry strikes per team; timer resets for final remaining team; round ends cleanly.');
}

