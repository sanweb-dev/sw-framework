const { test, expect } = require('@playwright/test');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const docsDir = path.resolve(__dirname, '..', '..', 'docs');
// As páginas de componentes/animações/transições moram em docs/pages/ desde a reestruturação
// de 25/07/2026 — docsDir continua apontando pra docs/ porque também é usado pra achar
// tests/artifacts (via "..") mais abaixo neste arquivo.
const pagesDir = path.join(docsDir, 'pages');
// Nivel e texto do titulo real de cada pagina hoje -- componentes.html usa <h1>,
// animacoes.html/transitions.html usam <h2> (nenhum <h1> proprio na pagina) e o
// texto mudou desde que este teste foi escrito.
const pages = [
  ['componentes.html', 1, 'Todos os Componentes'],
  ['animacoes.html', 2, 'Animações Nativas'],
  ['transitions.html', 2, 'Transições Nativas']
];

// Acima de 992px o topo (nav[aria-label="Documentação principal"]) é ocultado de propósito
// (ver layout.css, "Topo removido no desktop como na Y2") — a navegação nesse viewport é a
// barra lateral (.doc-aside), sempre visível. Verifica que ao menos uma das duas está ativa.
async function expectNavigationVisible(page) {
  const [navVisible, sidebarVisible] = await Promise.all([
    page.locator('nav[aria-label="Documentação principal"]').isVisible(),
    page.locator('.doc-aside').isVisible()
  ]);
  expect(navVisible || sidebarVisible).toBe(true);
}

test('portal documental é navegável, sem erros e sem overflow', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));

  for (const [file, level, heading] of pages) {
    await page.goto(pathToFileURL(path.join(pagesDir, file)).href);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level, name: heading })).toBeVisible();
    await expectNavigationVisible(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});

// As 4 secoes de "demonstracao interativa" que os testes abaixo clicavam (modal
// de exemplo, replay de animacao/loop, cartao com morph, overlay de exemplo,
// formulario com validacao) foram removidas de componentes.html/animacoes.html/
// transitions.html num redesign anterior e nunca reconstruidas -- Sandro decidiu
// (31/07/2026) simplificar os testes em vez de recriar essa UI. O que cada teste
// verificava de fato (nao so' a demo em si) foi preservado onde ainda faz sentido:
// - "modal funciona com teclado" ja e' coberto por sw-demo.spec.js.
// - "reduced-motion desliga animacao" ja e' coberto pelo teste unitario de CSS.
// - nomes de morph duplicados desativados: preservado abaixo, criado em memoria.
// - integracao select/valid/mask + seguranca XSS: preservado abaixo, criado em memoria.

test('SWTrans desativa view-transition-name quando o mesmo nome de morph se repete', async ({ page }) => {
  await page.goto(pathToFileURL(path.join(pagesDir, 'transitions.html')).href);

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

test('formulário: mensagem de erro nunca vira HTML, e máscara dinâmica funciona', async ({ page }) => {
  await page.goto(pathToFileURL(path.join(pagesDir, 'componentes.html')).href);

  await expect.poll(() => page.evaluate(() => ({
    valid: typeof SW.Valid?.check === 'function',
    mask: typeof SW.Mask?.raw === 'function'
  }))).toEqual({ valid: true, mask: true });

  // Reconstroi em memoria so' o suficiente pra checar 2 contratos que nao dependem
  // da demo removida: (1) sw-valid nunca injeta a mensagem de erro como HTML bruto
  // (protecao XSS), (2) sw-mask formata um input criado dinamicamente.
  const xssSafe = await page.evaluate(() => {
    const form = document.createElement('form');
    form.setAttribute('sw-valid', '');
    const input = document.createElement('input');
    input.required = true;
    input.dataset.swError = '<img src=x onerror=alert(1)> Informe o nome.';
    form.appendChild(input);
    document.body.appendChild(form);
    SW.reinit(document);
    SW.Valid.check(form);
    // innerHTML.includes('<img') sozinho da falso positivo -- texto escapado
    // vira "&lt;img..." que ainda contem a substring como texto. O que importa
    // de verdade e' se um <img> de VERDADE (elemento real, executavel) existe
    // DENTRO do formulario de teste (a pagina em si pode ter outras <img> reais,
    // como logo/avatar, sem relacao nenhuma com isto).
    const noRealImgTag = form.querySelectorAll('img').length === 0;
    const errorText = form.querySelector('.sw-form-error')?.textContent || '';
    form.remove();
    return { noRealImgTag, errorTextIncludesTag: errorText.includes('<img') };
  });
  expect(xssSafe.noRealImgTag).toBe(true);
  expect(xssSafe.errorTextIncludesTag).toBe(true);

  const dynamicPhone = await page.evaluate(() => {
    const input = document.createElement('input');
    input.id = 'test-dynamic-phone';
    input.setAttribute('sw-mask', 'phone');
    input.value = '11987654321';
    document.body.appendChild(input);
    SW.reinit(document);
    const value = input.value;
    input.remove();
    return value;
  });
  expect(dynamicPhone).toBe('(11) 98765-4321');
});
