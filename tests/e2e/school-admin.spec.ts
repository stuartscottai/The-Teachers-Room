import { test, expect } from '@playwright/test';

for (const theme of ['light', 'dark']) {
  test(`school administration remains usable in ${theme} mode`, async ({ page }, testInfo) => {
    const userId = '00000000-0000-4000-8000-000000000009';
    const schoolId = '00000000-0000-4000-8000-000000000010';
    const date = '2026-09-01T12:00:00Z';
    await page.route('**/*.supabase.co/**', async route => {
      const url = new URL(route.request().url());
      let data: any = [];
      if (url.pathname.endsWith('/get_my_entitlements')) data = [{ account_type: 'school', can_use_ai: true, school_id: schoolId, school_name: 'Oakfield School', school_role: 'admin' }];
      if (url.pathname.endsWith('/get_school_teacher_spot_summary')) data = [{ teacher_spot_limit: 10, teacher_count: 2 }];
      if (url.pathname.endsWith('/get_school_join_code')) data = [{ join_code: 'OAKFIELD' }];
      if (url.pathname.endsWith('/get_school_teacher_directory')) data = [
        { user_id: userId, full_name: 'Alex Owner', email: 'alex@example.test', role: 'admin', status: 'active', is_owner: true, joined_at: date, total_games_created: 42, total_game_plays: 120, total_play_events: 25, total_ai_generations: 16, last_activity_at: date },
        { user_id: 'teacher-1', full_name: 'Sam Teacher', email: 'sam@example.test', role: 'teacher', status: 'active', joined_at: date, total_games_created: 12, total_game_plays: 45, total_play_events: 8, total_ai_generations: 6 },
        { user_id: 'teacher-2', full_name: 'Taylor Inactive', email: 'taylor@example.test', role: 'teacher', status: 'inactive', joined_at: date },
      ];
      if (url.pathname.endsWith('/list_school_join_requests')) data = [{ user_id: 'request-1', full_name: 'Jordan Applicant', email: 'jordan@example.test', requested_at: date }];
      if (url.pathname.endsWith('/centre_invites')) data = [{ id: 'invite-1', school_id: schoolId, email: 'newteacher@example.test', token: 'test', status: 'pending', created_at: date, expires_at: '2027-01-01T00:00:00Z' }];
      if (url.pathname.endsWith('/school_storage_folders')) data = [{ id: 'folder-1', school_id: schoolId, name: 'Lesson resources', created_at: date }, { id: 'folder-2', school_id: schoolId, parent_id: 'folder-1', name: 'Cambridge classes', created_at: date }];
      if (url.pathname.endsWith('/school_storage_files')) data = [{ id: 'file-1', school_id: schoolId, file_name: 'Teacher handbook.pdf', mime_type: 'application/pdf', size_bytes: 102400, storage_path: 'test/handbook.pdf', created_by: userId, created_at: date }];
      await route.fulfill({ json: data });
    });
    await page.addInitScript(({ userId, theme }) => {
      localStorage.setItem('teachers-room-theme', theme);
      const user = { id: userId, email: 'alex@example.test', aud: 'authenticated', role: 'authenticated', user_metadata: { full_name: 'Alex Owner', account_type: 'school' }, app_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
      localStorage.setItem('sb-xsefgwhywcuzfnawtyru-auth-token', JSON.stringify({ access_token: 'fixture-access-token', refresh_token: 'fixture-refresh-token', expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }));
    }, { userId, theme });
    await page.goto('/school-admin');
    await expect(page.getByRole('heading', { name: 'Oakfield School' })).toBeVisible();
    await expect(page.locator('.school-overview')).toContainText('8');
    const directory = page.locator('.school-teacher-mobile:visible, .school-teacher-table:visible');
    await expect(directory).toContainText('Sam Teacher');
    await page.getByLabel('Search teachers').fill('Sam');
    await expect(directory).toContainText('Sam Teacher');
    await expect(directory).not.toContainText('Alex Owner');
    await page.getByRole('button', { name: 'Actions for Sam Teacher' }).filter({ visible: true }).click();
    const menu = page.locator('.school-actions-menu:visible');
    await expect(menu.getByRole('button', { name: 'View Games' })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Grant Admin' })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Remove Teacher' })).toBeVisible();
    const contrast = await menu.evaluate(el => {
      const luminance = (css: string) => {
        const rgb = css.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      const surface = luminance(getComputedStyle(el).backgroundColor);
      return [...el.querySelectorAll('button')].map(button => {
        const text = luminance(getComputedStyle(button).color);
        return (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05);
      });
    });
    expect(Math.min(...contrast)).toBeGreaterThanOrEqual(4.5);
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await page.getByLabel('Search teachers').fill('');
    await page.getByLabel('Filter teachers by status').selectOption('inactive');
    await expect(directory).toContainText('Taylor Inactive');
    await expect(directory).not.toContainText('Sam Teacher');
    await page.getByLabel('Filter teachers by status').selectOption('all');
    const metricTops = await directory.locator('.school-usage').first().locator('dd').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().top));
    expect(Math.max(...metricTops) - Math.min(...metricTops)).toBeLessThan(1);
    await page.getByLabel('Search teachers').blur();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`teachers-${theme}.png`), fullPage: true });
    await page.getByRole('tab', { name: 'Access & invites' }).click();
    await expect(page.getByRole('button', { name: 'Add Spots' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Spots' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Regenerate Code' })).toBeVisible();
    await expect(page.locator('#school-panel-access')).toContainText('newteacher@example.test');
    await page.getByRole('button', { name: 'View invite message' }).click();
    const message = page.getByRole('textbox', { name: 'Invitation message', exact: true });
    await expect(message).toHaveValue(/Oakfield School[\s\S]*newteacher@example.test[\s\S]*OAKFIELD/);
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
      (window as any).copiedInvite = '';
      document.execCommand = command => {
        if (command !== 'copy') return false;
        (window as any).copiedInvite = (document.activeElement as HTMLTextAreaElement).value;
        return true;
      };
    });
    await page.getByRole('button', { name: 'Copy message', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Message copied');
    expect(await page.evaluate(() => (window as any).copiedInvite)).toBe(await message.inputValue());
    await page.evaluate(() => { document.execCommand = () => false; });
    await page.getByRole('button', { name: 'Copy message', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('message is selected below');
    expect(await message.evaluate(el => (el as HTMLTextAreaElement).selectionEnd - (el as HTMLTextAreaElement).selectionStart)).toBe((await message.inputValue()).length);
    await page.getByRole('button', { name: 'Close message', exact: true }).click();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`access-${theme}.png`), fullPage: true });
    await page.getByRole('tab', { name: 'Shared files' }).click();
    await expect(page.getByRole('heading', { name: 'Shared files', exact: true })).toBeVisible();
    await expect(page.locator('.school-storage')).toContainText('Teacher handbook.pdf');
    await expect(page.locator('.school-storage')).toContainText('0 files · 1 folder');
    await expect(page.locator('.school-storage')).not.toContainText('Â');
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`files-${theme}.png`), fullPage: true });
    const panelFits = await page.locator('.school-storage').evaluate(section => {
      const bounds = section.getBoundingClientRect();
      return [...section.querySelectorAll('section')].every(child => child.getBoundingClientRect().right <= bounds.right);
    });
    expect(panelFits).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    if (theme === 'dark') {
      const colours = await page.locator('.school-storage h2').evaluate(el => ({ text: getComputedStyle(el).color, surface: getComputedStyle(el.closest('section')!).backgroundColor }));
      expect(colours.text).toBe('rgb(239, 243, 248)');
      expect(colours.surface).toBe('rgb(34, 39, 46)');
    }
  });
}
