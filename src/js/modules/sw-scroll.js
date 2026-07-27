/* SW Framework Smooth Scroll — <a sw-scroll href="#secao"> ou sw-scroll-target/-offset · SW.Scroll.to('#sel', offset) */
(function () {
  'use strict';

  const SWScroll = {
    initAll(root = document) {
      SW.$('[sw-scroll]', root).forEach((el) => {
        if (el._swScroll) return;
        el._swScroll = true;
        el.addEventListener('click', (event) => {
          const sel = el.getAttribute('sw-scroll-target') || el.getAttribute('href');
          const offset = parseInt(el.getAttribute('sw-scroll-offset'), 10) || 80;
          if (!sel || !sel.startsWith('#')) return;
          event.preventDefault();
          SWScroll.to(sel, offset);
        });
      });
    },

    to(sel, offset = 80) {
      const target = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (!target) return;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: SW.Utils?.reducedMotion() ? 'auto' : 'smooth' });
      SW.emit(target, 'sw:scroll:arrived');
    }
  };

  window.SW?.register('SWScroll', SWScroll);
  if (window.SW) window.SW.Scroll = SWScroll;
})();
