/* SW Framework Scroll-to-Top — [sw-top] no botão; fica .is-vis após 300px de scroll */
(function () {
  'use strict';
  let bound = false;

  const SWTop = {
    initAll(root = document) {
      SW.$('[sw-top]', root).forEach((btn) => {
        if (btn._swTop) return;
        btn._swTop = true;
        btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: SW.Utils?.reducedMotion() ? 'auto' : 'smooth' }));
      });

      if (bound) return;
      bound = true;
      const update = () => {
        const visible = window.scrollY > 300;
        document.querySelectorAll('[sw-top]').forEach((btn) => btn.classList.toggle('is-vis', visible));
      };
      window.addEventListener('scroll', update, { passive: true });
      update();
    }
  };

  window.SW?.register('SWTop', SWTop);
  if (window.SW) window.SW.Top = SWTop;
})();
