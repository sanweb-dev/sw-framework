'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const VERSION = '0.1.0-alpha.1';
const root = __dirname;
const distDir = path.join(root, 'dist');
const docsDistDir = path.join(root, 'docs', 'dist');
const cssFiles = ['01-tokens.css', '02-reset.css', '03-layout.css', '04-components.css', '05-forms.css', '06-animations.css', '07-transitions.css', '08-utilities.css'].map((file) => path.join(root, 'src', 'css', file));
const jsFiles = [
  path.join(root, 'src', 'js', 'core', 'sw-core.js'),
  path.join(root, 'src', 'js', 'core', 'sw-utils.js'),
  path.join(root, 'src', 'js', 'modules', 'sw-day.js'),
  path.join(root, 'src', 'js', 'modules', 'sw-trans.js'),
  ...['sw-code.js', 'sw-modal.js', 'sw-alert.js', 'sw-panel.js', 'sw-lightbox.js', 'sw-table.js', 'sw-ajax.js', 'sw-select.js', 'sw-valid.js', 'sw-mask.js']
    .map((file) => path.join(root, 'src', 'js', 'modules', file)),
];
const mpaFile = path.join(root, 'src', 'js', 'core', 'sw-mpa.js');
const fxFile = path.join(root, 'src', 'fx', 'sw-fx.js');

function assertSourceFiles(files) {
  const missing = files.filter((file) => !fs.existsSync(file));
  if (missing.length) throw new Error(`Fontes obrigatórios ausentes:\n${missing.join('\n')}`);
  files.filter((file) => file.endsWith('.js')).forEach((file) => execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }));
}

function atomicWrite(destination, content) {
  const temp = `${destination}.${process.pid}.tmp`;
  fs.writeFileSync(temp, content, 'utf8');
  fs.renameSync(temp, destination);
}

function compactCss(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,])\s*/g, '$1').trim();
}

function compactJs(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*[\r\n]/gm, '').trim();
}

function hash(content) { return crypto.createHash('sha256').update(content).digest('hex'); }
function banner(type) { return `/*! SW Framework ${VERSION} | Sandro Web Solutions | ${type} */\n`; }

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
  console.log(`Build concluído: ${outputs.size} bundles, versão ${VERSION}`);
}

try { main(); } catch (error) { console.error(`Build interrompido: ${error.message}`); process.exitCode = 1; }
