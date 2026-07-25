const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('SWAlert renders messages as text, not HTML', () => {
  const source = read('src/js/modules/sw-alert.js');
  assert.match(source, /message\.textContent\s*=\s*String\(msg/);
  assert.doesNotMatch(source, /toast\.innerHTML\s*=.*msg/s);
});

test('SWAjax restricts remote requests and sanitizes inserted HTML', () => {
  const source = read('src/js/modules/sw-ajax.js');
  assert.match(source, /url\.origin\s*!==\s*window\.location\.origin/);
  assert.match(source, /SW\.html\.set/);
  assert.match(source, /AbortController/);
  assert.doesNotMatch(source, /targetEl\.innerHTML\s*=\s*htmlContent/);
});

test('Core sanitizes HTML, batches reinitialization and delegates theme validation', () => {
  const core = read('src/js/core/sw-core.js');
  const day = read('src/js/modules/sw-day.js');
  assert.match(day, /new Set\(\['dark', 'light'\]\)/);
  assert.match(core, /requestAnimationFrame/);
  assert.match(core, /sanitize/);
  assert.match(core, /this\.Day\?\.set\(theme\)/);
});

test('Modal implements an accessible dialog lifecycle', () => {
  const source = read('src/js/modules/sw-modal.js');
  assert.match(source, /aria-modal/);
  assert.match(source, /role', 'dialog/);
  assert.match(source, /focusable/);
  assert.match(source, /previousFocus/i);
});

test('Motion CSS offers a reduced-motion fallback', () => {
  const animations = read('src/css/06-animations.css');
  const transitions = read('src/css/07-transitions.css');
  assert.match(animations, /prefers-reduced-motion:\s*reduce/);
  assert.match(transitions, /prefers-reduced-motion:\s*reduce/);
});

test('Motion catalog exposes exactly 40 documented and restrained presets', () => {
  const animations = read('src/css/06-animations.css');
  const docs = read('docs/animacoes.html');
  const docsJs = read('docs/assets/docs.js');
  const entries = ['fade', 'up', 'down', 'left', 'right', 'pop', 'flip', 'roll', 'soft', 'blur', 'scale', 'zoom-out'];
  const reveals = ['up', 'down', 'left', 'right', 'in', 'out', 'blur'];
  const loops = ['spin', 'pulse', 'float', 'fade', 'bounce', 'glow', 'wave'];
  const hovers = ['up', 'in', 'lift', 'glow', 'tada', 'flip', 'soft', 'shrink'];
  const scrolls = ['up', 'down', 'fade', 'blur', 'pop', '3dl'];

  entries.forEach((name) => assert.match(animations, new RegExp(`\\.sw-ani-${name.replace('-', '\\-')}\\s*\\{`)));
  reveals.forEach((name) => assert.match(animations, new RegExp(`\\.sw-rev-${name}\\b`)));
  loops.forEach((name) => assert.match(animations, new RegExp(`\\.sw-loop-${name}\\s*\\{`)));
  hovers.forEach((name) => assert.match(animations, new RegExp(`\\.sw-hov-${name}:hover\\s*\\{`)));
  scrolls.forEach((name) => assert.match(animations, new RegExp(`\\[sw-scr="${name}"\\]`)));

  assert.equal(entries.length + reveals.length + loops.length + hovers.length + scrolls.length, 40);
  assert.match(animations, /\.sw-loop-paused\s*\{[^}]*animation-play-state:\s*paused/s);
  assert.doesNotMatch(animations, /scale\(0\.4\)|rotate\(-360deg\)|translateX\(-10rem\)|will-change/);
  assert.match(docs, /40 presets/);
  assert.match(docs, /12 entradas, 7 reveals, 7 loops, 8 hovers e 6 presets de scroll/);
  assert.match(docsJs, /new Set\(\['sw-ani-fade'/);
  assert.doesNotMatch(docsJs, /innerHTML|eval\(/);
});

test('Utility breakpoints use broadly compatible top-level media queries', () => {
  const utilities = read('src/css/08-utilities.css');
  assert.doesNotMatch(utilities, /\.sw-hide-mobile\s*\{\s*@media/);
  assert.match(utilities, /@media \(max-width:\s*767\.98px\)/);
});

test('Documentation has semantic and accessible foundations', () => {
  const html = read('docs/index.html');
  assert.match(html, /<main[\s>]/);
  assert.match(html, /class="sw-modal"/);
  assert.match(html, /<caption/);
  assert.match(html, /for="sw-demo-hue"/);
  assert.doesNotMatch(html, /justify-space-between/);
});

test('Build performs preflight validation and produces a manifest', () => {
  const source = read('build.js');
  assert.match(source, /node:crypto/);
  assert.match(source, /manifest\.json/);
  assert.match(source, /assertSourceFiles/);
});

test('Utils, Day and Trans exist as independent modules in build order', () => {
  const utils = read('src/js/core/sw-utils.js');
  const day = read('src/js/modules/sw-day.js');
  const trans = read('src/js/modules/sw-trans.js');
  const build = read('build.js');
  assert.match(utils, /throttleFrame/);
  assert.match(utils, /reducedMotion/);
  assert.match(day, /allowedThemes/);
  assert.match(trans, /IntersectionObserver/);
  assert.match(trans, /startViewTransition/);
  assert.ok(build.indexOf('sw-utils.js') < build.indexOf('sw-day.js'));
  assert.ok(build.indexOf('sw-day.js') < build.indexOf('sw-trans.js'));
});

test('Core no longer owns the theme implementation', () => {
  const core = read('src/js/core/sw-core.js');
  assert.doesNotMatch(core, /SW\.Day\s*=\s*\{/);
  assert.match(core, /SW\.Day\?\.init/);
});

test('Documentation portal exposes dedicated, honest and semantic pages', () => {
  const pages = ['componentes.html', 'animacoes.html', 'transitions.html'];
  pages.forEach((page) => {
    const html = read(`docs/${page}`);
    assert.match(html, /<meta name="description"/);
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
    assert.match(html, /<main[\s>]/);
    assert.match(html, /assets\/docs\.css/);
    assert.match(html, /assets\/docs\.js/);
  });
  const transitions = read('docs/transitions.html');
  assert.match(transitions, /ainda não implementado/i);
  assert.match(transitions, /Chromium 149/);
  assert.match(transitions, /WebKit 26\.5/);
  assert.match(transitions, /Firefox 151/);
});

test('SWTrans validates unique morph names and exposes an accessible loader', () => {
  const source = read('src/js/modules/sw-trans.js');
  const css = read('src/css/07-transitions.css');
  assert.match(source, /morphNamePattern/);
  assert.match(source, /viewTransitionName/);
  assert.match(source, /aria-busy/);
  assert.match(source, /textContent/);
  assert.match(source, /static async during/);
  assert.match(css, /\[sw-trans-overlay\]/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test('MPA test server is loopback-only and confines requests to docs', () => {
  const server = read('tests/static-server.js');
  const config = read('playwright.config.js');
  assert.match(server, /127\.0\.0\.1/);
  assert.match(server, /docsRoot/);
  assert.match(server, /path\.relative/);
  assert.match(server, /X-Content-Type-Options/);
  assert.match(config, /webServer/);
  assert.match(config, /tests\/static-server\.js/);
});

test('MPA direction bootstrap validates state and loads before framework styles', () => {
  const source = read('src/js/core/sw-mpa.js');
  const css = read('src/css/07-transitions.css');
  const build = read('build.js');
  assert.match(source, /new Set\(\['neutral', 'forward', 'back'\]\)/);
  assert.match(source, /navigationType !== 'traverse'/);
  assert.match(source, /sessionStorage/);
  assert.match(source, /getEntriesByType\?\.\('navigation'\)/);
  assert.match(source, /navigationEntry\?\.type === 'reload'/);
  assert.match(source, /pageswap/);
  assert.match(source, /pagereveal/);
  assert.match(source, /pageshow/);
  assert.match(css, /data-sw-trans-direction="forward"/);
  assert.match(css, /data-sw-trans-direction="back"/);
  assert.match(build, /sw-mpa\.min\.js/);

  ['index.html', 'componentes.html', 'animacoes.html', 'transitions.html'].forEach((page) => {
    const html = read(`docs/${page}`);
    const scriptPosition = html.indexOf('<script src="dist/sw-mpa.min.js"></script>');
    const stylePosition = html.indexOf('<link rel="stylesheet"');
    assert.ok(scriptPosition > -1 && scriptPosition < stylePosition, `${page} precisa classificar a direção antes do CSS`);
  });
});

test('Form modules preserve native controls and handle input safely', () => {
  const select = read('src/js/modules/sw-select.js');
  const valid = read('src/js/modules/sw-valid.js');
  const mask = read('src/js/modules/sw-mask.js');
  const build = read('build.js');

  assert.match(select, /HTMLSelectElement/);
  assert.match(select, /sw:select-change/);
  assert.doesNotMatch(select, /role['"],\s*['"]listbox/);
  assert.match(valid, /checkValidity/);
  assert.match(valid, /aria-invalid/);
  assert.match(valid, /textContent/);
  assert.doesNotMatch(valid, /innerHTML/);
  assert.match(mask, /replace\(\/\\D\/g/);
  assert.match(mask, /slice\(0,/);
  assert.match(mask, /sw:mask-input/);
  assert.ok(build.indexOf('sw-select.js') < build.indexOf('sw-valid.js'));
  assert.ok(build.indexOf('sw-valid.js') < build.indexOf('sw-mask.js'));
});

test('Browser matrix includes Chromium viewports plus Firefox and WebKit desktops', () => {
  const config = read('playwright.config.js');
  assert.match(config, /name:\s*'firefox-desktop-1280'/);
  assert.match(config, /browserName:\s*'firefox'/);
  assert.match(config, /name:\s*'webkit-desktop-1280'/);
  assert.match(config, /browserName:\s*'webkit'/);
});

test('SW-FX bounds optional effects and preserves safe progressive fallbacks', () => {
  const fx = read('src/fx/sw-fx.js');
  const animations = read('src/css/06-animations.css');
  const docs = read('docs/index.html');

  assert.match(fx, /MAX_SCRAMBLE_LENGTH\s*=\s*160/);
  assert.match(fx, /SCRAMBLE_DURATION\s*=\s*540/);
  assert.match(fx, /DEFAULT_TYPEWRITER_SPEED\s*=\s*40/);
  assert.match(fx, /TILT_LIMIT\s*=\s*6/);
  assert.match(fx, /MAGNET_LIMIT\s*=\s*8/);
  assert.match(fx, /new WeakSet\(\)/);
  assert.match(fx, /new WeakMap\(\)/);
  assert.match(fx, /requestAnimationFrame/);
  assert.match(fx, /runTypewriter/);
  assert.match(fx, /runSplitText/);
  assert.match(fx, /updateScrub/);
  assert.match(fx, /initMarquee/);
  assert.match(fx, /motionQuery\?\.addEventListener\?\.\('change'/);
  assert.match(fx, /element\.childElementCount/);
  assert.match(fx, /element\.style\.removeProperty\('transform'\)/);
  assert.doesNotMatch(fx, /eval\(|new Function/);
  assert.match(animations, /\[sw-typewriter\]/);
  assert.match(animations, /\[sw-marquee\]/);
  assert.match(animations, /\[sw-scrub\]/);
  assert.doesNotMatch(docs, /SW-FX \(GSAP/);
  assert.match(docs, />40 presets</);
});

