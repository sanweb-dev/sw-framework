/* SW Framework Scrollspy — <nav sw-scrollspy sw-scrollspy-offset sw-scrollspy-tgt><a href="#sec">...</a></nav> */
(function () {
  'use strict';

  const SWScrollspy = {
    initAll(root = document) {
      SW.$('[sw-scrollspy]', root).forEach((nav) => {
        if (nav._swScrollspy) return;
        nav._swScrollspy = true;
        const offset = parseInt(nav.getAttribute('sw-scrollspy-offset'), 10) || 80;
        const tgtSel = nav.getAttribute('sw-scrollspy-tgt');
        const container = tgtSel ? document.querySelector(tgtSel) : null;
        const scroller = container || window;
        const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
        const targets = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);

        let ticking = false;
        const tick = () => {
          if (ticking) return;
          ticking = true;
          window.requestAnimationFrame(() => {
            const refTop = container ? container.getBoundingClientRect().top : 0;
            let cur = -1;
            targets.forEach((t, i) => { if (t.getBoundingClientRect().top - refTop <= offset) cur = i; });
            const atBottom = container
              ? container.scrollTop + container.clientHeight >= container.scrollHeight - 4
              : window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
            if (atBottom && targets.length) cur = targets.length - 1;
            links.forEach((a, i) => {
              const active = i === cur;
              a.classList.toggle('is-act', active);
              a.setAttribute('aria-current', active ? 'true' : 'false');
              if (active) SW.emit(nav, 'sw:scrollspy:change', { id: targets[i]?.id, link: a });
            });
            ticking = false;
          });
        };

        links.forEach((a, i) => {
          a.addEventListener('click', (event) => {
            event.preventDefault();
            const target = targets[i];
            if (!target) return;
            if (container) {
              const top = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
              container.scrollTo({ top: top - offset + 1, behavior: 'smooth' });
            } else {
              const top = target.getBoundingClientRect().top + window.scrollY;
              window.scrollTo({ top: top - offset + 1, behavior: 'smooth' });
            }
          });
        });

        scroller.addEventListener('scroll', tick, { passive: true });
        tick();
      });
    }
  };

  window.SW?.register('SWScrollspy', SWScrollspy);
  if (window.SW) window.SW.Scrollspy = SWScrollspy;
})();
