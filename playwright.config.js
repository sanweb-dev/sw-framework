const { defineConfig } = require('@playwright/test');
const path = require('node:path');

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests', 'browser'),
  outputDir: path.join(__dirname, 'test-results'),
  webServer: {
    command: 'node tests/static-server.js',
    url: 'http://127.0.0.1:4173/docs/index.html',
    reuseExistingServer: true,
    timeout: 10000
  },
  timeout: 15000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    headless: true,
    locale: 'pt-BR',
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'mobile-375', use: { browserName: 'chromium', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
    { name: 'tablet-768', use: { browserName: 'chromium', viewport: { width: 768, height: 1024 } } },
    { name: 'desktop-1280', use: { browserName: 'chromium', viewport: { width: 1280, height: 900 } } },
    { name: 'firefox-desktop-1280', use: { browserName: 'firefox', viewport: { width: 1280, height: 900 } } },
    { name: 'webkit-desktop-1280', use: { browserName: 'webkit', viewport: { width: 1280, height: 900 } } }
  ]
});
