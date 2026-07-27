/* SW Framework Lazy Load — <img sw-lazy sw-lazy-src="real.jpg" src="placeholder.jpg"> */
(function () {
  'use strict';
  let observer = null;

  function load(img) {
    const src = img.getAttribute('sw-lazy-src');
    if (!src) return;
    const probe = new Image();
    probe.onload = () => { img.src = src; img.classList.add('is-ldd'); SW.emit(img, 'sw:lazy:loaded'); };
    probe.onerror = () => { img.classList.add('is-err'); SW.emit(img, 'sw:lazy:error'); };
    probe.src = src;
  }

  const SWLazy = {
    initAll(root = document) {
      if (!observer) {
        observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            load(entry.target);
            observer.unobserve(entry.target);
          });
        }, { rootMargin: '200px' });
      }
      SW.$('img[sw-lazy]', root).forEach((img) => {
        if (img._swLazy) return;
        img._swLazy = true;
        observer.observe(img);
      });
    }
  };

  window.SW?.register('SWLazy', SWLazy);
  if (window.SW) window.SW.Lazy = SWLazy;
})();
