import { expect, test, type Locator } from '@playwright/test';

test.use({ locale: 'es-ES' });

const expectOriginalLanguage = async (content: Locator) => {
  await expect(content.first()).toBeVisible();
  expect(await content.evaluateAll(elements => elements.every(element => !(element as HTMLElement).translate))).toBe(true);
};

test('every classroom game protects its content while site navigation remains translatable', async ({ page }) => {
  test.setTimeout(90_000);
  for (const mode of ['trivia', 'jeopardy', 'pubquiz', 'darts', 'snakes', 'millionaire', 'timebomb', 'survey', 'stopfire', 'wordwheel', 'blockbeaters']) {
    await page.goto(`/test/game-smoke?mode=${mode}&lightweight=1`);
    const arena = page.locator('.gameplay-appearance');
    await expect(arena).toHaveAttribute('translate', 'no');
    await expect(arena).toHaveClass(/notranslate/);
    expect(await page.locator('nav').first().evaluate(element => (element as HTMLElement).translate)).toBe(true);
  }
});

test('shared game previews preserve prompts and answers in both views', async ({ page }) => {
  await page.goto('/test/preview-smoke');
  await expectOriginalLanguage(page.getByText('Which image should load?', { exact: true }));
  await expectOriginalLanguage(page.getByText('The preview image', { exact: true }));
  await page.getByRole('button', { name: 'Study cards', exact: true }).click();
  await expectOriginalLanguage(page.getByText('Which image should load?', { exact: true }));
  await page.getByRole('button', { name: 'Reveal answer', exact: true }).first().click();
  await expectOriginalLanguage(page.getByText('The preview image', { exact: true }));
});

test('student practice and its separate answer review preserve original content', async ({ page }) => {
  await page.goto('/test/student-practice-smoke');
  await page.getByPlaceholder(/Enter your name/i).fill('Stu');
  await page.getByRole('button', { name: /Start Game/i }).click();
  await page.getByRole('button', { name: /^1$/ }).click();
  await expectOriginalLanguage(page.getByText('Which answer should be selected for this practice test?', { exact: true }));
  await expectOriginalLanguage(page.getByRole('button', { name: /Wrong A/i }));
  await page.getByRole('button', { name: /Wrong A/i }).click();
  await page.getByRole('button', { name: /Continue/i }).click();
  await page.getByRole('button', { name: /Review wrong answers/i }).click();
  await expectOriginalLanguage(page.getByText('Which answer should be selected for this practice test?', { exact: true }));
  await expectOriginalLanguage(page.locator('.bg-emerald-50').getByText('Correct', { exact: true }));
});


test('live student questions and answers preserve Valencian on a Spanish browser', async ({ page }) => {
  const sessionId = '00000000-0000-4000-8000-000000000001';
  const participantId = '00000000-0000-4000-8000-000000000002';
  await page.route('**/rest/v1/rpc/*', async route => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    const rows = name === 'get_live_quiz_student_session'
      ? [{ id: sessionId, status: 'question', title: 'Practiquem valencià', timer_seconds: 300, question_started_at: new Date().toISOString(), host_last_seen_at: new Date().toISOString() }]
      : name === 'get_live_quiz_student_question'
      ? [{ question_index: 0, category: 'Valencià', question: 'Quin dia és hui?', options: ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous'] }]
      : name === 'list_live_quiz_student_participants'
      ? [{ id: participantId, session_id: sessionId, display_name: 'Alumne', score: 0 }]
      : [];
    await route.fulfill({ json: rows });
  });
  await page.goto(`/live/play/${sessionId}/${participantId}`);
  await expectOriginalLanguage(page.getByRole('heading', { name: 'Quin dia és hui?' }));
  await expectOriginalLanguage(page.getByRole('button', { name: /Dilluns/ }));
  await expectOriginalLanguage(page.getByText('Valencià', { exact: true }));
  expect(await page.locator('nav').first().evaluate(element => (element as HTMLElement).translate)).toBe(true);
});
