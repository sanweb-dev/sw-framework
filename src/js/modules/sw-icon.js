/* SW Framework Icon — inline loader for the IconPark set (currentColor-aware) */
(function () {
  'use strict';

  const cache = new Map();
  const canFetch = window.location.protocol !== 'file:';

  // Calculado a cada chamada (não uma vez no carregamento do módulo): a navegação
  // via AJAX do portal troca a URL com pushState sem recarregar este script, então
  // um valor fixo calculado no início ficaria errado assim que o caminho mudasse.
  function defaultBasePath() {
    const match = window.location.pathname.match(/^(.*\/docs\/)/);
    return match ? `${match[1]}dist/icons/` : (window.location.pathname.includes('/pages/') ? '../dist/icons/' : 'dist/icons/');
  }

  async function fetchIcon(iconPath) {
    if (cache.has(iconPath)) return cache.get(iconPath);
    if (!canFetch) {
      // fetch() não funciona sob file:// (sem servidor); evita erro de rede no console.
      cache.set(iconPath, Promise.resolve(''));
      return '';
    }
    const basePath = SWIcon.basePath ?? defaultBasePath();
    const promise = fetch(`${basePath}${iconPath}.svg`)
      .then((response) => { if (!response.ok) throw new Error(`Ícone não encontrado: ${iconPath}`); return response.text(); })
      .catch((error) => { console.warn('[SW-Icon]', error.message); return ''; });
    cache.set(iconPath, promise);
    return promise;
  }

  // Atalho tipo "icon font" (<i class="sw-bell">) usado nas páginas de docs — mapeia
  // o nome curto pro ícone real do IconPark. Não substitui sw-icon="Categoria/nome",
  // que continua sendo a forma canônica e cobre todos os 2.658 ícones.
  const FONT_ALIASES = {
    bell: 'Music/bell-ring', box: 'Office/box', calendar: 'Edit/calendar',
    chart: 'Charts/chart-histogram-one', check: 'Character/check', 'check-circle': 'Character/check-one',
    'chevron-left': 'Arrows/arrow-left', 'chevron-right': 'Arrows/arrow-right', clock: 'Time/alarm-clock',
    columns: 'Edit/column', copy: 'Edit/copy', cpu: 'Hardware/cpu', 'day-ico': 'Weather/sun',
    download: 'Arrows/download', eye: 'Base/preview-open', file: 'Office/file-text-one',
    folder: 'Office/folder', grid: 'Edit/grid-four', heart: 'Health/heart',
    'horizontal-right': 'Arrows/arrow-right', image: 'Office/image-files', 'info-circle': 'Character/info',
    input: 'Others/voice-input', layout: 'Edit/layout-four', 'layout-grid': 'Edit/grid-four',
    list: 'Edit/list', 'list-ul': 'Components/checklist', mail: 'Office/mail', map: 'Charts/area-map',
    mobile: 'Hardware/phone-one', money: 'Money/paper-money', moon: 'Weather/moon',
    palette: 'Operate/color-filter', search: 'Base/search', 'shape-triangle': 'Safe/alarm',
    shield: 'Safe/shield', star: 'Edit/star', 'star-off': 'Edit/star', sun: 'Weather/sun',
    tag: 'Base/tag', upload: 'Arrows/upload', user: 'Peoples/user', users: 'Peoples/peoples',
    warning: 'Safe/alarm', world: 'Travel/world', x: 'Character/close-small', zap: 'Hardware/bolt-one',
  };

  // Logos de marca (<i class="y2l-github">) — subconjunto real disponível no IconPark.
  // linkedin e firefox não existem no set (2.658 ícones) e ficam sem ícone.
  const BRAND_ALIASES = {
    github: 'Brand/github', twitter: 'Brand/twitter', behance: 'Brand/behance',
    dribbble: 'Brand/dribble', youtube: 'Brand/youtube', instagram: 'Brand/instagram',
    facebook: 'Brand/facebook', telegram: 'Brand/telegram', figma: 'Brand/figma',
  };

  class SWIcon {
    static basePath = null; // sobrescreva se a estrutura de pastas do consumidor for diferente

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

      SW.$('i', root).forEach((element) => {
        if (element.getAttribute('data-sw-icon-state') === 'ready') return;
        const classes = Array.from(element.classList);
        const swName = classes.find((cls) => cls.startsWith('sw-') && FONT_ALIASES[cls.slice(3)]);
        const brandName = classes.find((cls) => cls.startsWith('y2l-') && BRAND_ALIASES[cls.slice(4)]);
        const iconPath = swName ? FONT_ALIASES[swName.slice(3)] : brandName ? BRAND_ALIASES[brandName.slice(4)] : null;
        if (!iconPath) return;
        element.classList.add('sw-icon-font');
        SWIcon.use(element, iconPath);
      });
    }
  }

  window.SW?.register('SWIcon', SWIcon);
  if (window.SW) window.SW.Icon = SWIcon;
})();
