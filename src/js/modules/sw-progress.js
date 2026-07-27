/* SW Framework Progress — anima [sw-prg-circ][sw-prg-animate] do 0 até o valor real ao entrar na tela,
   com contagem do número em .sw-prg-circ span sincronizada. */
(function () {
  'use strict';

  let observer = null;

  function animate(el) {
    const target = parseFloat(el.dataset.swPrgTarget);
    if (Number.isNaN(target)) return;
    const span = el.querySelector('span');
    const suffix = el.getAttribute('sw-prg-suffix') ?? '%';
    const duration = parseInt(el.getAttribute('sw-prg-duration'), 10) || 1400;

    requestAnimationFrame(() => el.style.setProperty('--sw-prg-val', target));

    if (!span || SW.Utils?.reducedMotion()) {
      if (span) span.textContent = `${target}${suffix}`;
      return;
    }
    const start = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      span.textContent = `${Math.round(progress * target)}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const SWProgress = {
    initAll(root = document) {
      if (!observer) {
        observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);
            animate(entry.target);
          });
        }, { threshold: 0.4 });
      }
      SW.$('[sw-prg-circ][sw-prg-animate]', root).forEach((el) => {
        if (el._swProgress) return;
        el._swProgress = true;
        const current = el.style.getPropertyValue('--sw-prg-val').trim();
        el.dataset.swPrgTarget = current || '0';
        el.style.setProperty('--sw-prg-val', 0);
        observer.observe(el);
      });
    }
  };

  window.SW?.register('SWProgress', SWProgress);
  if (window.SW) window.SW.Progress = SWProgress;
})();
