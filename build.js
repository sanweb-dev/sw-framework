'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const VERSION = '1.1.0';
const root = __dirname;
const distDir = path.join(root, 'dist');
const docsDistDir = path.join(root, 'docs', 'dist');
const cssFiles = ['01-tokens.css', '02-reset.css', '03-layout.css', '04-components.css', '05-forms.css', '06-animations.css', '07-transitions.css', '08-utilities.css', '09-chromatic.css', '10-daynight.css', '11-cards.css', '12-misc.css', '13-icons.css', '14-y2-components.css'].map((file) => path.join(root, 'src', 'css', file));
const iconFontSrcDir = path.join(root, 'src', 'fonts');
const iconFontFiles = ['swicons.eot', 'swicons.svg', 'swicons.ttf', 'swicons.woff', 'swicons.woff2'];
const jsFiles = [
  path.join(root, 'src', 'js', 'core', 'sw-core.js'),
  path.join(root, 'src', 'js', 'core', 'sw-utils.js'),
  path.join(root, 'src', 'js', 'modules', 'sw-day.js'),
  path.join(root, 'src', 'js', 'modules', 'sw-trans.js'),
  ...['sw-code.js', 'sw-icon.js', 'sw-modal.js', 'sw-alert.js', 'sw-panel.js', 'sw-lightbox.js', 'sw-table.js', 'sw-ajax.js', 'sw-select.js', 'sw-valid.js', 'sw-mask.js', 'sw-chip.js',
    'sw-tabs.js', 'sw-accordion.js', 'sw-top.js', 'sw-pre.js', 'sw-dropdown.js', 'sw-lazy.js', 'sw-slider.js', 'sw-carousel.js', 'sw-pagination.js', 'sw-rating.js', 'sw-typewriter.js',
    'sw-textlimit.js', 'sw-tooltip.js', 'sw-parallax.js', 'sw-lgpd.js', 'sw-textarea.js', 'sw-scrollspy.js', 'sw-scroll.js', 'sw-drag.js', 'sw-matinp.js', 'sw-sidebar.js', 'sw-navbar.js', 'sw-seg.js',
    'sw-editor.js', 'sw-cotacao.js', 'sw-instagram.js', 'sw-infinite.js', 'sw-upload.js', 'sw-content.js', 'sw-cropper.js', 'sw-progress.js', 'sw-anim.js']
    .map((file) => path.join(root, 'src', 'js', 'modules', file)),
];
const mpaFile = path.join(root, 'src', 'js', 'core', 'sw-mpa.js');
const fxFile = path.join(root, 'src', 'fx', 'sw-fx.js');
const fxCssFile = path.join(root, 'src', 'fx', 'sw-fx.css');
// SW2 Navbar: variante rica opcional (utility bar, mega menu, painel-carrossel,
// hero full-screen), portada de referências reais — fica no complementar, não no núcleo.
const sw2NavbarCssFile = path.join(root, 'src', 'css', '15-sw2-navbar.css');
const sw2NavbarJsFile = path.join(root, 'src', 'js', 'modules', 'sw2-navbar.js');
const iconsSrcDir = path.join(root, 'src', 'icons');
// Camada opcional sw-fx-premium: motor declarativo GSAP portado do Smooll (sw-premium-*).
// Bundle separado, nunca concatenado em sw.js/sw-mpa.js/sw-fx.js — zero-dependencia do
// nucleo continua intacta; só existe se o desenvolvedor incluir este <script> extra.
const fxPremiumDir = path.join(root, 'src', 'fx-premium');
const fxPremiumFiles = ['sw-premium-effects.js', 'sw-premium-split.js', 'sw-premium-svg.js', 'sw-premium-ui.js',
  'sw-premium-cursor.js', 'sw-premium-sections.js', 'sw-premium-router.js', 'sw-premium-core.js']
  .map((file) => path.join(fxPremiumDir, file));
// Scripts PHP avulsos (sem classe/namespace, ao contrario de src/php/*) -- utilitarios
// autocontidos que um modulo JS especifico chama direto por URL (ex.: sw-instagram.js
// -> /dist/sw-instagram.php). Ficam soltos no dist/ (nao dentro de pacotes/*/php/)
// porque e' assim que o modulo JS os espera por padrao.
const phpStandaloneDir = path.join(root, 'src', 'php-standalone');
const vendorGsapDir = path.join(root, 'vendor', 'gsap');
const vendorGsapFiles = ['gsap.min.js', 'ScrollTrigger.min.js', 'Draggable.min.js', 'Flip.min.js',
  'Observer.min.js', 'MotionPathPlugin.min.js', 'ScrollToPlugin.min.js', 'TextPlugin.min.js']
  .map((file) => path.join(vendorGsapDir, file));

// Template inicial do sw.config.css — mesmo conteúdo mostrado na doc (pages/config.html,
// seção "Template Completo"). Mantido aqui como fonte única pra não desalinhar dos dois lugares.
const SW_CONFIG_TEMPLATE = `/**
 * ╔══════════════════════════════════════════════╗
 * ║        SW CONFIG — Meu Projeto               ║
 * ╚══════════════════════════════════════════════╝
 * Carregue DEPOIS do sw.min.css:
 * <link rel="stylesheet" href="sw.config.css">
 */

/* ── HUES (altere o número, todas as shades da cor derivam daqui) ── */
:root {
    --sw-h-pri: 200;    /* azul   */
    --sw-h-sec: 215;    /* navy   */
}

/* ── CORES DE ESTADO (override direto, se precisar) ── */
:root {
    /* --sw-suc: hsl(145, 65%, 42%); */
    /* --sw-err: hsl(355, 75%, 55%); */
    /* --sw-ale: hsl(40, 85%, 52%); */
    /* --sw-inf: hsl(205, 75%, 52%); */
}

/* ── TIPOGRAFIA ── */
:root {
    /* --sw-f-san: 'Inter', system-ui, sans-serif; */
    /* --sw-f-mon: 'Fira Code', monospace;         */
}

/* ── ARREDONDAMENTO ── */
:root {
    --sw-r-p:  0.4rem;
    --sw-r-m:  0.8rem;
    --sw-r-g:  1.2rem;
    --sw-r-gg: 1.8rem;
    --sw-r-xl: 2.4rem;
}

/* ── TEMA ESCURO (SWDay — é o padrão em :root, sobrescreva direto) ── */
:root {
    /* --sw-bg:  #0d0d14; */
    /* --sw-sur: #12121a; */
    /* --sw-bor: #2a2a38; */
}

/* ── TEMA CLARO (SWDay light) ── */
html[sw-theme="light"] {
    /* --sw-bg:  #f8fafc; */
    /* --sw-sur: #ffffff; */
    /* --sw-bor:    #e2e8f0; */
}
`;

function assertSourceFiles(files) {
  const missing = files.filter((file) => !fs.existsSync(file));
  if (missing.length) throw new Error(`Fontes obrigatórios ausentes:\n${missing.join('\n')}`);
  files.filter((file) => file.endsWith('.js')).forEach((file) => execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }));
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function renameWithRetry(temp, destination) {
  const maxAttempts = 8;
  let delay = 75;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      fs.renameSync(temp, destination);
      return;
    } catch (error) {
      const transient = error.code === 'EPERM' || error.code === 'EBUSY';
      if (!transient || attempt === maxAttempts) throw error;
      // Windows Defender/indexador prendem arquivos recem-criados por um instante durante gravacoes em massa (ex.: os milhares de icones) — retry com backoff resolve sem precisar desativar nada.
      sleepSync(delay);
      delay = Math.min(delay * 2, 1000);
    }
  }
}

function atomicWrite(destination, content) {
  // Pula a escrita se o destino ja tem exatamente este conteudo — evita I/O (e locks externos) redundante
  // em rebuilds sem mudanca real, comum quando so uma fracao dos milhares de icones muda.
  try {
    if (fs.readFileSync(destination, 'utf8') === content) return;
  } catch (_) { /* destino nao existe ainda ou nao pode ser lido — segue para escrita normal */ }
  const temp = `${destination}.${process.pid}.tmp`;
  fs.writeFileSync(temp, content, 'utf8');
  renameWithRetry(temp, destination);
}

function atomicWriteBinary(destination, buffer) {
  try {
    if (fs.readFileSync(destination).equals(buffer)) return;
  } catch (_) { /* destino nao existe ainda ou nao pode ser lido — segue para escrita normal */ }
  const temp = `${destination}.${process.pid}.tmp`;
  fs.writeFileSync(temp, buffer);
  renameWithRetry(temp, destination);
}

function compactCss(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,])\s*/g, '$1').trim();
}

function compactJs(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*[\r\n]/gm, '').trim();
}

function hash(content) { return crypto.createHash('sha256').update(content).digest('hex'); }
function banner(type) { return `/*! SW Framework ${VERSION} | Sandro Web Solutions | ${type} */\n`; }

function normalizeIconSvg(source) {
  return source.replace(/(stroke|fill)="black"/g, '$1="currentColor"');
}

function buildIcons() {
  if (!fs.existsSync(iconsSrcDir)) return { count: 0, categories: 0 };
  const iconsDistDir = path.join(distDir, 'icons');
  const docsIconsDistDir = path.join(docsDistDir, 'icons');
  fs.mkdirSync(iconsDistDir, { recursive: true });
  fs.mkdirSync(docsIconsDistDir, { recursive: true });

  const categories = fs.readdirSync(iconsSrcDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  const manifest = [];
  categories.forEach((categoryEntry) => {
    const category = categoryEntry.name;
    const categorySrcDir = path.join(iconsSrcDir, category);
    const categoryDistDir = path.join(iconsDistDir, category);
    const categoryDocsDir = path.join(docsIconsDistDir, category);
    fs.mkdirSync(categoryDistDir, { recursive: true });
    fs.mkdirSync(categoryDocsDir, { recursive: true });

    fs.readdirSync(categorySrcDir).filter((file) => file.endsWith('.svg')).forEach((file) => {
      const raw = fs.readFileSync(path.join(categorySrcDir, file), 'utf8');
      const normalized = normalizeIconSvg(raw);
      atomicWrite(path.join(categoryDistDir, file), normalized);
      atomicWrite(path.join(categoryDocsDir, file), normalized);
      const name = file.replace(/\.svg$/, '');
      manifest.push({ category, name, path: `icons/${category}/${file}` });
    });
  });

  const manifestContent = `${JSON.stringify({ version: VERSION, count: manifest.length, icons: manifest }, null, 2)}\n`;
  atomicWrite(path.join(iconsDistDir, 'manifest.json'), manifestContent);
  atomicWrite(path.join(docsIconsDistDir, 'manifest.json'), manifestContent);

  return { count: manifest.length, categories: categories.length };
}

// Copia os 5 arquivos da fonte de ícones (swicons — migrada do wficons/Boxicons do Y2) pros
// bundles. A fonte em si (binário) não é gerada aqui, só copiada de src/fonts/; o CSS que a usa
// (13-icons.css, com os ~1031 seletores .swi-*/.swis-*/.swil-*) já faz parte do bundle principal.
function buildIconFont() {
  if (!fs.existsSync(iconFontSrcDir)) return 0;
  const distFontsDir = path.join(distDir, 'fonts');
  const docsFontsDir = path.join(docsDistDir, 'fonts');
  fs.mkdirSync(distFontsDir, { recursive: true });
  fs.mkdirSync(docsFontsDir, { recursive: true });
  let count = 0;
  iconFontFiles.forEach((file) => {
    const source = path.join(iconFontSrcDir, file);
    if (!fs.existsSync(source)) return;
    const raw = fs.readFileSync(source);
    atomicWriteBinary(path.join(distFontsDir, file), raw);
    atomicWriteBinary(path.join(docsFontsDir, file), raw);
    count += 1;
  });
  return count;
}

function copyDirRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  fs.readdirSync(srcDir, { withFileTypes: true }).forEach((entry) => {
    const s = path.join(srcDir, entry.name);
    const d = path.join(destDir, entry.name);
    if (entry.isDirectory()) copyDirRecursive(s, d);
    else atomicWriteBinary(d, fs.readFileSync(s));
  });
}

// Organiza dist/ num pacote de download único, pra quem baixa não ter que
// escolher arquivo por arquivo: sw.min.css + sw.min.js já combinam núcleo +
// tudo que era opcional (efeitos, transições, GSAP premium) num arquivo só.
//
// Decisão de Sandro (31/07/2026): parar de fragmentar em 3 pacotes por
// enquanto. "Complementar" fica reservado pro pacote de PHP quando estiver
// pronto (o MVC atual ainda recarrega página no CRUD; falta reescrever com
// AJAX antes de lançar isso como feature) — não é misturado com CSS/JS aqui.
// A galeria de ícones em SVG (`dist/icons/`) também fica de fora — ela só
// existe pra alimentar a galeria visual do próprio site de documentação;
// o uso real do ícone é via a fonte (`fonts/`), que continua no pacote.
function buildPackages() {
  const pkgDir = path.join(distDir, 'pacotes');
  const completa = path.join(pkgDir, 'completa');

  // Limpa a pasta antes de remontar — evita que arquivo de um build anterior
  // (ex.: os antigos sw-fx.min.js soltos, de antes do sw.compl.js existir, ou
  // as pastas 1-principal/2-complementar de antes da consolidação) fique
  // esquecido ali dentro depois que o esquema de nomes muda.
  fs.rmSync(pkgDir, { recursive: true, force: true });
  fs.mkdirSync(completa, { recursive: true });

  ['sw.min.css', 'sw.min.js', 'sw.config.css'].forEach((file) => {
    atomicWriteBinary(path.join(completa, file), fs.readFileSync(path.join(distDir, file)));
  });
  copyDirRecursive(path.join(distDir, 'fonts'), path.join(completa, 'fonts'));
  atomicWrite(path.join(completa, 'LEIA-ME.md'),
    '# SW Framework\n\n' +
    '`sw.min.css` + `sw.min.js` = tudo que roda no navegador num arquivo só: núcleo\n' +
    '(84 componentes, tema claro/escuro, ícones, modal, dropdown, navbar, sidebar,\n' +
    'formulários...) + efeitos (scramble, tilt 3D, marquee, magnetismo), transição\n' +
    'suave entre páginas e o motor de animação avançado com GSAP embutido.\n\n' +
    '## Instalação\n\n```html\n<link rel="stylesheet" href="sw.min.css">\n<script src="sw.min.js" defer></script>\n```\n\n' +
    '`sw.config.css` é opcional — um ponto de partida pra personalizar cores, fontes e\n' +
    'bordas (carregue por último, depois do sw.min.css). A pasta `fonts/` (ícones em\n' +
    'fonte) deve ficar ao lado do CSS/JS. Precisa do SVG de algum ícone específico? A\n' +
    'galeria completa fica hospedada em sw.sanweb.com.br — não vem junto neste pacote.\n\n' +
    'Backend PHP ainda não está aqui — vem num pacote próprio quando estiver pronto.\n');
}

function buildFxPremium() {
  if (!fs.existsSync(fxPremiumDir) || !fs.existsSync(vendorGsapDir)) return null;
  assertSourceFiles([...vendorGsapFiles, ...fxPremiumFiles]);

  const gsapCode = vendorGsapFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  const engineCode = fxPremiumFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  // Motor compartilha um unico closure entre os 8 arquivos (como o build.js original do
  // Smooll faz) — SWPremiumCore referencia funcoes/classes dos demais arquivos sem expor
  // nada em window além do window.SWPremium publicado pelo auto-boot em sw-premium-core.js.
  return `${gsapCode}\n(function(){\n"use strict";\n${engineCode}\n})();\n`;
}

function main() {
  console.log(`SW Framework ${VERSION} — build iniciado`);
  const phpStandaloneFiles = fs.existsSync(phpStandaloneDir)
    ? fs.readdirSync(phpStandaloneDir).filter((f) => f.endsWith('.php')).map((f) => path.join(phpStandaloneDir, f))
    : [];
  assertSourceFiles([...cssFiles, mpaFile, ...jsFiles, fxFile, fxCssFile, sw2NavbarCssFile, sw2NavbarJsFile, ...phpStandaloneFiles]);
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(docsDistDir, { recursive: true });

  // Nomes fragmentados de builds antigos — apaga dos dois destinos pra não ficarem
  // esquecidos ali quando o esquema de nomes muda. sw.compl.*/sw.all.* existiram
  // até 31/07/2026, quando viraram parte de sw.min.* (pacote único).
  const obsoleteNames = ['sw-fx.js', 'sw-fx.min.js', 'sw-fx.css', 'sw-fx.min.css',
    'sw-mpa.js', 'sw-mpa.min.js', 'sw-fx-premium.js', 'sw-fx-premium.min.js',
    'sw.compl.css', 'sw.compl.min.css', 'sw.compl.js', 'sw.compl.min.js',
    'sw.all.css', 'sw.all.min.css', 'sw.all.js', 'sw.all.min.js'];
  obsoleteNames.forEach((name) => {
    fs.rmSync(path.join(distDir, name), { force: true });
    fs.rmSync(path.join(docsDistDir, name), { force: true });
  });

  // fx.js, mpa.js, fx-premium e fx.css são só FONTES internas agora — nunca viram
  // arquivo público próprio. Tudo sai consolidado em sw.min.* (pacote único),
  // sem nome fragmentado (FX/MPA/premium não existem como bundle separado).
  const outputs = new Map();
  const coreCssRaw = cssFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  const coreJsRaw = jsFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  const mpaRaw = fs.readFileSync(mpaFile, 'utf8');
  const fxRaw = fs.readFileSync(fxFile, 'utf8');
  const fxCssRaw = fs.readFileSync(fxCssFile, 'utf8');
  const sw2NavbarCssRaw = fs.readFileSync(sw2NavbarCssFile, 'utf8');
  const sw2NavbarJsRaw = fs.readFileSync(sw2NavbarJsFile, 'utf8');
  const fxPremiumBundle = buildFxPremium();
  const fxPremiumRaw = fxPremiumBundle || '';

  // sw.min.css / sw.min.js = pacote único e padrão: núcleo + tudo que antes
  // era "complementar" (FX + MPA + FX Premium/GSAP) já combinado num arquivo
  // só. Decisão de Sandro (31/07/2026): parar de fragmentar em sw.compl.*/
  // sw.all.* — "complementar" fica reservado pro pacote de PHP, quando
  // estiver pronto; até lá, todo o resto do front-end mora aqui dentro.
  const complJsRaw = [fxRaw, mpaRaw, sw2NavbarJsRaw, fxPremiumRaw].filter(Boolean).join('\n');
  const complCssRaw = [fxCssRaw, sw2NavbarCssRaw].join('\n');
  const allJsRaw = `${coreJsRaw}\n${complJsRaw}`;
  const allCssRaw = `${coreCssRaw}\n${complCssRaw}`;

  outputs.set('sw.css', banner('CSS') + allCssRaw);
  outputs.set('sw.min.css', banner('CSS compactado') + compactCss(allCssRaw));
  outputs.set('sw.js', banner('JavaScript') + allJsRaw);
  outputs.set('sw.min.js', banner('JavaScript compactado') + compactJs(allJsRaw));

  const manifest = { version: VERSION, generatedAt: new Date().toISOString(), files: {} };
  outputs.forEach((content, name) => {
    atomicWrite(path.join(distDir, name), content);
    if (name.endsWith('.min.css') || name.endsWith('.min.js')) atomicWrite(path.join(docsDistDir, name), content);
    manifest.files[name] = { bytes: Buffer.byteLength(content), sha256: hash(content) };
  });
  atomicWrite(path.join(distDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  // sw.config.css não é minificado nem versionado no manifest — é um ponto de partida
  // pra o desenvolvedor editar por cima, não um artefato de build determinístico. Grava
  // nos dois lugares porque a doc (docs/pages/*.html) referencia via docs/dist/, igual
  // aos outros bundles.
  atomicWrite(path.join(distDir, 'sw.config.css'), SW_CONFIG_TEMPLATE);
  atomicWrite(path.join(docsDistDir, 'sw.config.css'), SW_CONFIG_TEMPLATE);
  atomicWrite(path.join(docsDistDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const icons = buildIcons();
  const fontFiles = buildIconFont();
  phpStandaloneFiles.forEach((file) => {
    const raw = fs.readFileSync(file);
    atomicWriteBinary(path.join(distDir, path.basename(file)), raw);
    atomicWriteBinary(path.join(docsDistDir, path.basename(file)), raw);
  });
  buildPackages();
  console.log(`Build concluído: ${outputs.size} bundles, versão ${VERSION}${icons.count ? ` + ${icons.count} ícones (${icons.categories} categorias)` : ''}${fontFiles ? ` + fonte swicons (${fontFiles} arquivos)` : ''} + 1 pacote (completa)`);
}

try { main(); } catch (error) { console.error(`Build interrompido: ${error.message}`); process.exitCode = 1; }
