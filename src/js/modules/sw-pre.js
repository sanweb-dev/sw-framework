/* SW Framework Preloader — [sw-pre] no elemento de tela cheia; some após load */
(function () {
  'use strict';

  const SWPre = {
    initAll(root = document) {
      SW.$('[sw-pre]', root).forEach((el) => {
        if (el._swPre) return;
        el._swPre = true;
        const hide = () => {
          el.classList.add('is-out');
          window.setTimeout(() => el.remove(), 600);
        };
        if (document.readyState === 'complete') window.setTimeout(hide, 200);
        else window.addEventListener('load', () => window.setTimeout(hide, 200), { once: true });
      });
    }
  };

  window.SW?.register('SWPre', SWPre);
  if (window.SW) window.SW.Pre = SWPre;
})();
