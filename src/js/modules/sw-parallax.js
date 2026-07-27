/* SW Framework Parallax — [sw-parallax] sw-parallax-type="background|element|mouse|fixed" -speed -dir -inv -range -mobile */
(function () {
  'use strict';

  let items = [];
  let bound = false;
  let ticking = false;

  function cap(v, range) { return range ? Math.max(-range, Math.min(range, v)) : v; }

  function bindMouse(el, speed, dir, inv, range) {
    el.addEventListener('mousemove', (event) => {
      const r = el.getBoundingClientRect();
      const ox = cap((event.clientX - r.left - r.width / 2) * speed * (inv ? -1 : 1), range);
      const oy = cap((event.clientY - r.top - r.height / 2) * speed * (inv ? -1 : 1), range);
      const tx = dir !== 'vertical' ? ox : 0;
      const ty = dir !== 'horizontal' ? oy : 0;
      el.style.transform = `translate(${tx}px,${ty}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform 0.5s var(--sw-ease)';
      el.style.transform = '';
      window.setTimeout(() => { el.style.transition = ''; }, 500);
    });
  }

  function tick() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      items.forEach(({ el, speed, type, dir, inv, range }) => {
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2 - window.innerHeight / 2;
        const off = cap(center * speed * (inv ? -1 : 1), range);
        if (type === 'background') {
          if (dir === 'horizontal') el.style.backgroundPositionX = `calc(50% + ${off}px)`;
          else el.style.backgroundPositionY = `calc(50% + ${off}px)`;
        } else {
          const tx = dir === 'horizontal' || dir === 'both' ? off : 0;
          const ty = dir === 'vertical' || dir === 'both' ? off : 0;
          el.style.transform = `translate(${tx}px,${ty}px)`;
        }
      });
      ticking = false;
    });
  }

  const SWParallax = {
    initAll(root = document) {
      SW.$('[sw-parallax]', root).forEach((el) => {
        if (el._swParallax) return;
        if (el.getAttribute('sw-parallax-mobile') === 'false' && window.innerWidth <= 768) return;
        el._swParallax = true;
        const type = el.getAttribute('sw-parallax-type') || 'background';
        const speed = parseFloat(el.getAttribute('sw-parallax-speed')) || 0.4;
        const dir = el.getAttribute('sw-parallax-dir') || 'vertical';
        const inv = el.getAttribute('sw-parallax-inv') === 'true';
        const range = parseFloat(el.getAttribute('sw-parallax-range')) || 0;

        if (type === 'mouse') {
          bindMouse(el, speed, dir, inv, range);
        } else if (type === 'fixed') {
          el.style.backgroundAttachment = 'fixed';
          el.style.backgroundSize = el.style.backgroundSize || 'cover';
          el.style.backgroundPosition = el.style.backgroundPosition || 'center';
        } else {
          items.push({ el, speed, type, dir, inv, range });
        }
      });
      if (items.length && !bound) {
        bound = true;
        window.addEventListener('scroll', tick, { passive: true });
        tick();
      }
    }
  };

  window.SW?.register('SWParallax', SWParallax);
  if (window.SW) window.SW.Parallax = SWParallax;
})();
