/* SW Framework Preloader — [sw-pre], [swpre], [y2pre] no elemento de tela cheia; some após load */
(function () {
  'use strict';

  const SWPre = {
    initAll(root = document) {
      const scope = (root && root.querySelectorAll) ? root : document;
      const isTransition = sessionStorage.getItem('sw_pgt_effect') || sessionStorage.getItem('y2_pgt_effect');
      scope.querySelectorAll('[sw-pre], [swpre], [y2pre], [Y2Pre]').forEach((el) => {
        if (el._swPre) return;
        el._swPre = true;
        if (isTransition) {
          el.remove();
          return;
        }
        const hide = () => {
          el.classList.add('is-out');
          window.setTimeout(() => { if (el.parentNode) el.remove(); }, 500);
        };
        if (document.readyState === 'complete') window.setTimeout(hide, 150);
        else window.addEventListener('load', () => window.setTimeout(hide, 150), { once: true });
      });
    }
  };

  window.SWPre = SWPre;
  window.Y2Pre = SWPre;
  window.SW?.register('SWPre', SWPre);
  if (window.SW) window.SW.Pre = SWPre;
  if (document.readyState !== 'loading') SWPre.initAll(document);
  else document.addEventListener('DOMContentLoaded', () => SWPre.initAll(document));
})();

