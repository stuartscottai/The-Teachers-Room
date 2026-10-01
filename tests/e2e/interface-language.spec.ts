import { expect, test } from '@playwright/test';

test('Profile language selector updates the header and persists across reloads and tabs', async ({ page, context, isMobile }) => {
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Website settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Español (España)', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ajustes del sitio web' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Español (España)', exact: true })).toHaveAttribute('aria-pressed', 'true');
  if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click();
  await expect(page.locator('nav').getByRole('link', { name: 'Inicio', exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('teachers-room-language'))).toBe('es');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ajustes del sitio web' })).toBeVisible();
  const other = await context.newPage();
  await other.goto('/profile');
  await expect(other.getByRole('heading', { name: 'Ajustes del sitio web' })).toBeVisible();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(other.getByRole('heading', { name: 'Website settings' })).toBeVisible();
  await other.close();
});

test('Spanish interface labels are protected while original study content remains protected', async ({ page, isMobile }) => {
  await page.addInitScript(() => localStorage.setItem('teachers-room-language', 'es'));
  await page.goto('/test/game-smoke?mode=trivia');
  if (isMobile) await page.getByRole('button', { name: 'Abrir menú' }).click();
  const home = page.locator('nav').getByRole('link', { name: 'Inicio', exact: true }).first().locator('span');
  await expect(home).toHaveAttribute('translate', 'no');
  await expect(home).toHaveAttribute('lang', 'es-ES');
  await expect(page.locator('.gameplay-appearance')).toHaveAttribute('translate', 'no');
  expect(await page.locator('html').evaluate(el => (el as HTMLElement).translate)).toBe(true);
  if (isMobile) await page.getByRole('button', { name: 'Cerrar menú' }).click();
  await expect(page.getByRole('button', { name: 'Salir', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Equipo 1 0', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '1', exact: true }).click();
  await expect(page.getByText('Which option is correct?', { exact: true })).toBeVisible();
  // The saved answer deliberately matches an English feedback word. Only the
  // website's feedback is translated; the student's answer must remain intact.
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect(page.getByRole('heading', { name: '¡Correcto!', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toBeVisible();
});

test('Spanish header labels fit without colliding with the brand', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Mobile uses the separate navigation menu.');
  await page.addInitScript(() => localStorage.setItem('teachers-room-language', 'es'));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/test/game-smoke?mode=trivia');
  const positions = await page.locator('nav').first().evaluate(nav => {
    const brand = nav.querySelector('a.flex-shrink-0')!.getBoundingClientRect();
    const menu = nav.querySelector('.hidden.xl\\:flex')!.getBoundingClientRect();
    return { brandRight: brand.right, menuLeft: menu.left, menuRight: menu.right, viewport: innerWidth };
  });
  expect(positions.menuLeft).toBeGreaterThanOrEqual(positions.brandRight);
  expect(positions.menuRight).toBeLessThanOrEqual(positions.viewport);
});

test('Spanish public information includes reviews, plan benefits and searchable FAQ answers', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('teachers-room-language', 'es');
    localStorage.setItem('teachersRoomTourPromptDisabled', '1');
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("TheTeachers'Room");
  await expect(page.getByRole('heading', { level: 1 })).toHaveAttribute('translate', 'no');
  await expect(page.getByText('Ideal para practicar la expresión oral', { exact: true })).toBeVisible();
  await expect(page.getByText('Profesora de inglés como segunda lengua', { exact: true })).toBeVisible();
  await expect(page.getByText(/Puedo convertir un punto de gramática/)).toBeVisible();

  await page.goto('/pricing');
  await expect(page.getByText('Utiliza todas las herramientas de creación manual', { exact: true })).toBeVisible();
  await expect(page.getByText('Créditos para crear aproximadamente 50 juegos con IA al mes', { exact: true })).toBeVisible();
  await expect(page.getByText('100 MB de almacenamiento compartido para el centro', { exact: true })).toBeVisible();

  await page.goto('/info');
  await page.getByRole('button', { name: /Preguntas frecuentes/ }).click();
  await page.getByRole('button', { name: '¿Cómo funciona Live Quiz?', exact: true }).click();
  await expect(page.getByText(/permite al docente dirigir el juego/)).toBeVisible();
  await page.getByPlaceholder('Buscar Live Quiz, imágenes, enlaces para alumnos, cuentas de centro...').fill('dictar');
  await expect(page.getByRole('button', { name: /¿Se pueden dictar las instrucciones para la IA\? Preguntas frecuentes/ })).toBeVisible();
});

test('Spanish workbook controls preserve original lesson text and answers', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('teachers-room-language', 'es'));
  await page.goto('/class/v9k2fp');
  await expect(page.getByRole('heading', { name: 'Cuaderno de trabajo B2', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar una copia', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Página 3: Reading · Emojis', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resaltar', exact: true })).toBeVisible();
  await expect(page.getByTestId('reading-passage')).toContainText('Initially, I was a bit sceptical.');
  await expect(page.getByRole('radio', { name: '2. There are a lot of benefits to using emojis.', exact: true })).toBeVisible();
  await expect(page.locator('.class-workbook')).toHaveAttribute('translate', 'no');
});

test('Spanish blog cards and complete articles use editorial translations', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('teachers-room-language', 'es'));
  await page.goto('/blog');
  await expect(page.getByRole('heading', { name: 'La IA en el aula: ¿aliada o enemiga?', exact: true })).toBeVisible();
  await expect(page.getByText('12 de octubre de 2024', { exact: true })).toBeVisible();
  await expect(page.getByText('Leer artículo →', { exact: true }).first()).toBeVisible();
  await page.getByRole('link', { name: /La IA en el aula: ¿aliada o enemiga/ }).click();
  await expect(page.getByRole('heading', { name: 'El temor al plagio', exact: true })).toBeVisible();
  await expect(page.locator('article').getByText(/La inteligencia artificial ha llegado a la educación/)).toBeVisible();
  await page.goto('/blog/6');
  await expect(page.locator('article').getByRole('link', { name: 'AI Report Writer', exact: true })).toHaveAttribute('href', 'https://aireportwriter.app/');
});
