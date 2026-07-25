/* SW Framework Icon — inline loader for the IconPark set (currentColor-aware) */
(function () {
  'use strict';

  const cache = new Map();
  const basePath = 'dist/icons/';

  async function fetchIcon(iconPath) {
    if (cache.has(iconPath)) return cache.get(iconPath);
    const promise = fetch(`${basePath}${iconPath}.svg`)
      .then((response) => { if (!response.ok) throw new Error(`Ícone não encontrado: ${iconPath}`); return response.text(); })
      .catch((error) => { console.error('[SW-Icon]', error.message); return ''; });
    cache.set(iconPath, promise);
    return promise;
  }

  class SWIcon {
    static async use(target, iconPath) {
      const element = typeof target === 'string' ? document.querySelector(target) : target;
      if (!(element instanceof Element) || !iconPath) return false;
      const markup = await fetchIcon(iconPath);
      if (!markup) return false;
      element.innerHTML = markup;
      const svg = element.querySelector('svg');
      if (svg) { svg.removeAttribute('width'); svg.removeAttribute('height'); svg.classList.add('sw-icon-svg'); }
      element.setAttribute('data-sw-icon-state', 'ready');
      return true;
    }

    static initAll(root = document) {
      SW.$('[sw-icon]', root).forEach((element) => {
        const iconPath = element.getAttribute('sw-icon');
        if (element.getAttribute('data-sw-icon-state') === 'ready' || !iconPath) return;
        SWIcon.use(element, iconPath);
      });
    }
  }

  window.SW?.register('SWIcon', SWIcon);
  if (window.SW) window.SW.Icon = SWIcon;
})();
