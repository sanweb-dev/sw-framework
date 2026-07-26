const { test, expect } = require('@playwright/test');

const baseUrl = 'http://127.0.0.1:4173/docs';

test.setTimeout(30000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const captureAnimations = (key, event) => {
      if (!event.viewTransition) return;
      event.viewTransition.ready.then(() => {
        const names = document.getAnimations()
          .map((animation) => animation.animationName)
          .filter((name) => typeof name === 'string' && name.startsWith('sw-'));
        sessionStorage.setItem(key, JSON.stringify(names));
      }).catch(() => {});
    };
    window.addEventListener('pageswap', (event) => {
      sessionStorage.setItem('sw-test-pageswap', event.viewTransition ? 'transition' : 'event');
      captureAnimations('sw-test-pageswap-animations', event);
    });
    window.addEventListener('pagereveal', (event) => {
      sessionStorage.setItem('sw-test-pagereveal', event.viewTransition ? 'transition' : 'event');
      captureAnimations('sw-test-pagereveal-animations', event);
    });
  });
});

test('MPA classifica link, voltar, avançar e recarregar conforme a capacidade do motor', async ({ page, browserName }) => {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`${baseUrl}/index.html`);
  await expect(page).toHaveTitle(/SW Framework - Documentação Oficial/);
  await expect(page.locator('html')).toHaveAttribute('data-sw-trans-direction', 'neutral');
  const capabilities = await page.evaluate(() => ({
    navigation: 'navigation' in window,
    pageswap: 'onpageswap' in window,
    pagereveal: 'onpagereveal' in window,
    optedIn: Array.from(document.styleSheets).some((sheet) => {
      try { return Array.from(sheet.cssRules).some((rule) => rule.constructor.name === 'CSSViewTransitionRule'); }
      catch (_) { return false; }
    })
  }));
  expect(capabilities.optedIn).toBe(browserName !== 'firefox');
  await page.evaluate(() => ['sw-test-pageswap', 'sw-test-pagereveal', 'sw-test-pageswap-animations', 'sw-test-pagereveal-animations']
    .forEach((key) => sessionStorage.removeItem(key)));

  await page.getByRole('link', { name: 'Explorar documentação' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Todos os Componentes/ })).toBeVisible();
  const forwardSwap = await page.evaluate(() => sessionStorage.getItem('sw-test-pageswap'));
  if (capabilities.optedIn) expect(forwardSwap).toBe('transition');
  else expect([null, 'event']).toContain(forwardSwap);
  await expect(page.locator('html')).toHaveAttribute('data-sw-trans-direction', capabilities.navigation ? 'forward' : 'neutral');
  if (browserName === 'webkit') {
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('sw-test-pagereveal'))).toBe('transition');
    await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('sw-test-pagereveal-animations') || '[]')))
      .toContain('sw-slide-in-right');
  }

  await page.evaluate(() => ['sw-test-pageswap', 'sw-test-pagereveal', 'sw-test-pagereveal-animations']
    .forEach((key) => sessionStorage.removeItem(key)));
  await page.goBack();
  await expect(page).toHaveTitle(/SW Framework - Documentação Oficial/);
  const backSwap = await page.evaluate(() => sessionStorage.getItem('sw-test-pageswap'));
  if (browserName === 'webkit') expect(backSwap).toBe('transition');
  else if (browserName === 'chromium') expect(backSwap).toBe('event');
  else expect([null, 'event']).toContain(backSwap);
  await expect(page.locator('html')).toHaveAttribute('data-sw-trans-direction', capabilities.navigation ? 'back' : 'neutral');
  if (browserName === 'webkit') {
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('sw-test-pagereveal'))).toBe('transition');
    await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('sw-test-pagereveal-animations') || '[]')))
      .toContain('sw-slide-in-left');
  }

  await page.evaluate(() => sessionStorage.removeItem('sw-test-pageswap'));
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1, name: /Todos os Componentes/ })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-sw-trans-direction', capabilities.navigation ? 'forward' : 'neutral');

  await page.goBack();
  await expect(page).toHaveTitle(/SW Framework - Documentação Oficial/);
  await expect(page.locator('html')).toHaveAttribute('data-sw-trans-direction', capabilities.navigation ? 'back' : 'neutral');
  await page.evaluate(() => sessionStorage.removeItem('sw-test-pageswap'));
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load' }),
    page.evaluate(() => window.location.reload())
  ]);
  await expect(page.getByRole('link', { name: 'Explorar documentação' })).toBeVisible();
  const reloadSwap = await page.evaluate(() => sessionStorage.getItem('sw-test-pageswap'));
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType('navigation')[0]?.type)).toBe('reload');
  expect([null, 'event']).toContain(reloadSwap);
  await expect(page.locator('html')).toHaveAttribute('data-sw-trans-direction', 'neutral');
  console.log(`[SW MPA] ${browserName}: ${JSON.stringify({ ...capabilities, forwardSwap, backSwap, reloadSwap })}`);
  expect(errors).toEqual([]);
});
