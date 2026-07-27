'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const VERSION = '0.1.0-alpha.1';
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
    'sw-textlimit.js', 'sw-tooltip.js', 'sw-parallax.js', 'sw-lgpd.js', 'sw-textarea.js', 'sw-scrollspy.js', 'sw-scroll.js', 'sw-drag.js', 'sw-matinp.js', 'sw-sidebar.js',
    'sw-editor.js', 'sw-cotacao.js', 'sw-instagram.js', 'sw-infinite.js', 'sw-upload.js', 'sw-content.js', 'sw-cropper.js']
    .map((file) => path.join(root, 'src', 'js', 'modules', file)),
];
const mpaFile = path.join(root, 'src', 'js', 'core', 'sw-mpa.js');
const fxFile = path.join(root, 'src', 'fx', 'sw-fx.js');
const iconsSrcDir = path.join(root, 'src', 'icons');

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

function main() {
  console.log(`SW Framework ${VERSION} — build iniciado`);
  assertSourceFiles([...cssFiles, mpaFile, ...jsFiles, fxFile]);
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(docsDistDir, { recursive: true });

  const outputs = new Map();
  const css = banner('CSS') + cssFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  const mpa = banner('JavaScript MPA') + fs.readFileSync(mpaFile, 'utf8');
  const js = banner('JavaScript') + jsFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  const fx = banner('FX') + fs.readFileSync(fxFile, 'utf8');
  outputs.set('sw.css', css);
  outputs.set('sw.min.css', banner('CSS compactado') + compactCss(css));
  outputs.set('sw-mpa.js', mpa);
  outputs.set('sw-mpa.min.js', banner('JavaScript MPA compactado') + compactJs(mpa));
  outputs.set('sw.js', js);
  outputs.set('sw.min.js', banner('JavaScript compactado') + compactJs(js));
  outputs.set('sw-fx.js', fx);
  outputs.set('sw-fx.min.js', banner('FX compactado') + compactJs(fx));

  const manifest = { version: VERSION, generatedAt: new Date().toISOString(), files: {} };
  outputs.forEach((content, name) => {
    atomicWrite(path.join(distDir, name), content);
    if (name.endsWith('.min.css') || name.endsWith('.min.js')) atomicWrite(path.join(docsDistDir, name), content);
    manifest.files[name] = { bytes: Buffer.byteLength(content), sha256: hash(content) };
  });
  atomicWrite(path.join(distDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  atomicWrite(path.join(docsDistDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const icons = buildIcons();
  const fontFiles = buildIconFont();
  console.log(`Build concluído: ${outputs.size} bundles, versão ${VERSION}${icons.count ? ` + ${icons.count} ícones (${icons.categories} categorias)` : ''}${fontFiles ? ` + fonte swicons (${fontFiles} arquivos)` : ''}`);
}

try { main(); } catch (error) { console.error(`Build interrompido: ${error.message}`); process.exitCode = 1; }
