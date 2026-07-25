const { test, expect } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');

const demoUrl = pathToFileURL(path.resolve(__dirname, '..', '..', 'docs', 'index.html')).href;
const artifactsDir = path.resolve(__dirname, '..', 'artifacts');

test.beforeAll(() => fs.mkdirSync(artifactsDir, { recursive: true }));

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  page.__swErrors = errors;
  await page.goto(demoUrl);
  await page.waitForLoadState('networkidle');
  await expect.poll(() => page.evaluate(() => Boolean(window.SW))).toBe(true);
});

test.afterEach(async ({ page }) => {
  expect(page.__swErrors, `Erros do navegador: ${page.__swErrors.join(' | ')}`).toEqual([]);
});

test('carrega sem overflow horizontal e gera captura visual', async ({ page }, testInfo) => {
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth
  }));
  expect(metrics.page).toBeLessThanOrEqual(metrics.viewport + 1);
  await page.screenshot({ path: path.join(artifactsDir, `${testInfo.project.name}.png`), fullPage: true });
});

test('alterna e persiste o tema', async ({ page }) => {
  await page.getByRole('button', { name: /Alternar Tema/ }).click();
  await expect(page.locator('html')).toHaveAttribute('sw-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('sw-theme', 'light');
});

test('abre alerta com conteúdo seguro', async ({ page }) => {
  await page.getByRole('button', { name: /Testar Notificação/ }).click();
  const toast = page.getByRole('status');
  await expect(toast).toContainText('SW Framework ativado');
});

test('modal controla foco, teclado e scroll', async ({ page }) => {
  const trigger = page.getByRole('button', { name: /Testar SWModal/ });
  await trigger.click();
  const modal = page.locator('#modal-demo');
  await expect(modal).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await expect(page.getByRole('button', { name: /Fechar/ }).last()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(modal).toHaveAttribute('aria-hidden', 'true');
  await expect(trigger).toBeFocused();
});

test('painel de configuração abre, altera cor e fecha', async ({ page }) => {
  await page.getByRole('button', { name: /Configurar SW/ }).click();
  const panel = page.locator('#panel-config');
  await expect(panel).toHaveAttribute('aria-hidden', 'false');
  await page.locator('#sw-demo-hue').evaluate((input) => { input.value = '120'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sw-h-pri').trim())).toBe('120');
  await panel.getByRole('button', { name: /Fechar/ }).click();
  await expect(panel).toHaveAttribute('aria-hidden', 'true');
});

test('tabela pesquisa e ordena por teclado', async ({ page }) => {
  const search = page.getByRole('searchbox', { name: /Buscar na tabela/ });
  await search.fill('SW-FX');
  await expect(page.locator('tbody tr:not([hidden])')).toHaveCount(1);
  await expect(page.locator('.sw-table-count')).toContainText('1 de 3');
  await search.fill('');
  const header = page.getByRole('columnheader', { name: 'ID' });
  await header.focus();
  await page.keyboard.press('Enter');
  await expect(header).toHaveAttribute('aria-sort', 'ascending');
});

test('AJAX interno abre painel e reinicializa o conteúdo', async ({ page }) => {
  await page.getByRole('button', { name: /Testar SW-AJAX/ }).click();
  const panel = page.locator('#sw-global-panel');
  await expect(panel).toHaveAttribute('aria-hidden', 'false');
  await expect(panel).toContainText('Conteúdo Injetado via SW-AJAX');
  await panel.getByRole('button', { name: /Fechar/ }).click();
  await expect(panel).toHaveAttribute('aria-hidden', 'true');
});

test('módulos Utils, Day e Trans estão públicos e o reveal é inicializado', async ({ page }) => {
  const modules = await page.evaluate(() => ({
    utils: typeof SW.Utils?.throttleFrame === 'function',
    day: typeof SW.Day?.toggle === 'function',
    trans: typeof SW.Trans?.run === 'function'
  }));
  expect(modules).toEqual({ utils: true, day: true, trans: true });
  const reveal = page.locator('[sw-scr]').first();
  await reveal.scrollIntoViewIfNeeded();
  await expect(reveal).toHaveClass(/is-revealed/);
});

test('SW-FX limita scramble e ponteiro, restaura transform e reage a movimento reduzido', async ({ page }) => {
  const api = await page.evaluate(() => ({
    scramble: typeof SW.Fx?.scramble === 'function',
    reset: typeof SW.Fx?.reset === 'function',
    finePointer: matchMedia('(hover: hover) and (pointer: fine)').matches
  }));
  expect(api.scramble).toBe(true);
  expect(api.reset).toBe(true);

  const heading = page.locator('[sw-scramble]').first();
  const originalHeading = await heading.textContent();
  await heading.evaluate((element) => element.addEventListener('sw:fx-start', () => {
    element.setAttribute('data-sw-test-fx-started', 'true');
  }, { once: true }));
  await heading.hover({ force: true });
  await expect(heading).toHaveAttribute('data-sw-test-fx-started', 'true');
  await expect(heading).toHaveAttribute('data-sw-scramble-state', 'idle', { timeout: 2000 });
  await expect(heading).toHaveText(originalHeading);

  const tilt = page.locator('[sw-tilt]').first();
  await tilt.scrollIntoViewIfNeeded();
  const box = await tilt.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.3);
  if (api.finePointer) {
    await expect(tilt).toHaveAttribute('data-sw-tilt-state', 'active');
    await expect(tilt).toHaveCSS('transform', /matrix/);
    const tiltTransform = await tilt.evaluate((element) => element.style.transform);
    const tiltValues = Array.from(tiltTransform.matchAll(/rotate[XY]\((-?[\d.]+)deg\)/g), (match) => Math.abs(Number(match[1])));
    expect(tiltValues).toHaveLength(2);
    expect(Math.max(...tiltValues)).toBeLessThanOrEqual(6);
  } else {
    await expect(tilt).not.toHaveAttribute('data-sw-tilt-state', 'active');
  }
  await page.mouse.move(1, 1);
  await expect(tilt).toHaveAttribute('data-sw-tilt-state', 'idle');
  await expect(tilt).not.toHaveAttribute('style', /transform/);

  const magnetic = page.locator('[sw-magnetic]').first();
  const originalTransform = 'scale(0.97)';
  await magnetic.evaluate((element, transform) => { element.style.transform = transform; SW.reinit(document); }, originalTransform);
  const magneticBox = await magnetic.boundingBox();
  await page.mouse.move(magneticBox.x + magneticBox.width * 0.65, magneticBox.y + magneticBox.height / 2);
  if (api.finePointer) {
    await expect(magnetic).toHaveAttribute('data-sw-magnetic-state', 'active');
    const magneticTransform = await magnetic.evaluate((element) => element.style.transform);
    const magneticValues = Array.from(magneticTransform.matchAll(/(-?[\d.]+)px/g), (match) => Math.abs(Number(match[1])));
    expect(magneticValues).toHaveLength(3);
    expect(Math.max(...magneticValues)).toBeLessThanOrEqual(8);
  }
  await page.mouse.move(1, 1);
  await expect.poll(() => magnetic.evaluate((element) => element.style.transform)).toBe(originalTransform);

  const guards = await page.evaluate(() => {
    const longText = document.createElement('div');
    longText.textContent = 'A'.repeat(161);
    const markedText = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = 'Conteúdo preservado';
    markedText.appendChild(strong);
    const unicode = document.createElement('div');
    unicode.id = 'sw-fx-unicode-test';
    unicode.textContent = 'Olá 🚀 Nill';
    document.body.append(longText, markedText, unicode);
    SW.reinit(unicode);
    return {
      longStarted: SW.Fx.scramble(longText),
      longLength: longText.textContent.length,
      markedStarted: SW.Fx.scramble(markedText),
      markedChildren: markedText.childElementCount,
      unicodeStarted: SW.Fx.scramble(unicode),
      unicodeOriginal: unicode.textContent
    };
  });
  expect(guards).toEqual({
    longStarted: false,
    longLength: 161,
    markedStarted: false,
    markedChildren: 1,
    unicodeStarted: true,
    unicodeOriginal: 'Olá 🚀 Nill'
  });
  const unicode = page.locator('#sw-fx-unicode-test');
  await expect(unicode).toHaveAttribute('data-sw-scramble-state', 'idle', { timeout: 2000 });
  await expect(unicode).toHaveText('Olá 🚀 Nill');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await expect(tilt).toHaveCSS('transform', 'none');
  await page.evaluate(() => SW.Fx.scramble(document.querySelector('[sw-scramble]')));
  await expect(heading).toHaveText(originalHeading);
});
