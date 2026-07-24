/* SW Framework Day — theme controller */
(function () {
  'use strict';
  const allowedThemes = new Set(['dark', 'light']);
  const SWDay = {
    init() {
      const savedTheme = SW.Utils.storage.get('sw-theme');
      const systemTheme = window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      this.set(savedTheme || systemTheme, true);
    },
    set(theme, persist = true) {
      if (!allowedThemes.has(theme)) return false;
      document.documentElement.setAttribute('sw-theme', theme);
      document.documentElement.style.colorScheme = theme;
      if (persist) {
        SW.Utils.storage.set('sw-theme', theme);
      }
      SW.emit(document, 'sw:theme:change', { theme });
      return true;
    },
    setTheme(theme, persist = true) {
      return this.set(theme, persist);
    },
    toggle() {
      const current = document.documentElement.getAttribute('sw-theme') || 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      return this.set(next, true);
    }
  };
  window.SW.Day = SWDay;
  if (document.readyState !== 'loading') {
    SWDay.init();
  } else {
    document.addEventListener('DOMContentLoaded', () => SWDay.init());
  }
})();
