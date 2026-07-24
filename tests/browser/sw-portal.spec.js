const { test, expect } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const docsDir = path.resolve(__dirname, '..', '..', 'docs');
const pages = [
  ['componentes.html', 'Componentes do SW Framework'],
  ['animacoes.html', 'Animações do SW Framework'],
  ['transitions.html', 'Transições do SW Framework']
];

test('portal documental é navegável, sem erros e sem overflow', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  for (const [file, heading] of pages) {
    await page.goto(pathToFileURL(path.join(docsDir, file)).href);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.locator('nav[aria-label="Documentação principal"]')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});

test('exemplos interativos funcionam com teclado e fallback nativo', async ({ page }) => {
  await page.goto(pathToFileURL(path.join(docsDir, 'componentes.html')).href);
  await page.getByRole('button', { name: 'Abrir modal de exemplo' }).click();
  await expect(page.locator('#docs-modal')).toHaveAttribute('aria-hidden', 'false');
  await page.keyboard.press('Escape');
  await expect(page.locator('#docs-modal')).toHaveAttribute('aria-hidden', 'true');

  await page.goto(pathToFileURL(path.join(docsDir, 'animacoes.html')).href);
  const sample = page.locator('[data-animation-sample]');
  await page.getByRole('button', { name: /Reproduzir pop/ }).click();
  await expect(sample).toHaveClass(/sw-ani-pop/);

  await page.goto(pathToFileURL(path.join(docsDir, 'transitions.html')).href);
  const state = page.locator('[data-transition-state]');
  await page.getByRole('button', { name: 'Alternar estado do exemplo' }).click();
  await expect(state).toHaveAttribute('data-transition-state', 'active');
});

test('catálogo de motion reproduz presets, pausa loops e respeita movimento reduzido', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(pathToFileURL(path.join(docsDir, 'animacoes.html')).href);

  const sample = page.locator('[data-animation-sample]');
  await page.getByRole('button', { name: 'Reproduzir entrada suave' }).click();
  await expect(sample).toHaveClass(/sw-ani-soft/);
  await expect(sample).toContainText('sw-ani-soft');
  await expect(sample).toHaveCSS('animation-name', 'none');
  await expect(sample).toHaveCSS('opacity', '1');

  const depthReveal = page.locator('[sw-scr="3dl"]');
  await depthReveal.scrollIntoViewIfNeeded();
  await expect(depthReveal).toHaveClass(/is-revealed/);
  await expect(depthReveal).toBeVisible();

  const loop = page.locator('[data-loop-sample]');
  await page.getByRole('button', { name: 'Usar flutuação' }).click();
  await expect(loop).toHaveClass(/sw-loop-float/);
  await expect(loop).toContainText('sw-loop-float');
  const pause = page.locator('[data-loop-pause]');
  await pause.click();
  await expect(loop).toHaveClass(/sw-loop-paused/);
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
  await expect(pause).toHaveAccessibleName('Retomar loop');
});

test('SWTrans aplica morph único e controla overlay acessível', async ({ page }, testInfo) => {
  await page.goto(pathToFileURL(path.join(docsDir, 'transitions.html')).href);
  const morph = page.locator('[sw-morph="docs-state-card"]');
  await expect(morph).toHaveCSS('view-transition-name', 'sw-docs-state-card');

  await page.getByRole('button', { name: 'Testar overlay de carregamento' }).click();
  const overlay = page.locator('[sw-trans-overlay]');
  await expect(overlay).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('html')).toHaveAttribute('aria-busy', 'true');
  await expect(overlay).toContainText('Preparando exemplo');
  await page.screenshot({ path: path.join(docsDir, '..', 'tests', 'artifacts', `sw-trans-overlay-${testInfo.project.name}.png`) });
  await expect(overlay).toHaveAttribute('aria-hidden', 'true', { timeout: 3000 });
  await expect(page.locator('html')).not.toHaveAttribute('aria-busy', 'true');

  const duplicates = await page.evaluate(() => {
    const first = document.createElement('div');
    const second = document.createElement('div');
    first.setAttribute('sw-morph', 'duplicado');
    second.setAttribute('sw-morph', 'duplicado');
    document.body.append(first, second);
    SW.reinit(document);
    const values = [getComputedStyle(first).viewTransitionName, getComputedStyle(second).viewTransitionName];
    first.remove(); second.remove();
    return values;
  });
  expect(duplicates).toEqual(['none', 'none']);
});

test('formulário integra select nativo, validação acessível e máscaras limitadas', async ({ page }) => {
  await page.goto(pathToFileURL(path.join(docsDir, 'componentes.html')).href);

  const form = page.locator('#docs-form-demo');
  const name = page.locator('#docs-name');
  const documentInput = page.locator('#docs-document');
  const stack = page.locator('#docs-stack');

  await expect.poll(() => page.evaluate(() => ({
    select: typeof SW.Select?.set === 'function',
    valid: typeof SW.Valid?.check === 'function',
    mask: typeof SW.Mask?.raw === 'function'
  }))).toEqual({ select: true, valid: true, mask: true });

  await name.evaluate((input) => input.setAttribute('data-sw-error', '<img src=x onerror=alert(1)> Informe o nome.'));
  await form.getByRole('button', { name: 'Validar exemplo' }).click();
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#docs-name-error')).toHaveAttribute('role', 'alert');
  await expect(page.locator('#docs-name-error')).toContainText('<img src=x onerror=alert(1)>');
  await expect(form.locator('img')).toHaveCount(0);

  await name.fill('Portal SW');
  await documentInput.fill('12345678901234567890');
  await expect(documentInput).toHaveValue('12.345.678/9012-34');
  await expect(documentInput).toHaveAttribute('data-sw-mask-value', '12345678901234');

  await stack.selectOption('painel');
  await expect(stack).toHaveAttribute('data-sw-select-state', 'selected');
  await expect(form).toHaveAttribute('data-sw-valid-state', 'valid');

  await form.evaluate((element) => {
    const input = document.createElement('input');
    input.id = 'docs-dynamic-phone';
    input.setAttribute('sw-mask', 'phone');
    input.value = '11987654321';
    element.appendChild(input);
  });
  await expect(page.locator('#docs-dynamic-phone')).toHaveValue('(11) 98765-4321');
});
