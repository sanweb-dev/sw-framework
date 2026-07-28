/* SW Framework Parallax — Parallax Scroll + Mouse
   Atributos: [sw-parallax] ou [swparal]
   sw-parallax-type="background|element|mouse|fixed"
   sw-parallax-speed="0.4"
   sw-parallax-dir="vertical|horizontal|both"
   sw-parallax-inv="true"
   sw-parallax-range="50"
   sw-parallax-mobile="false" */
(function () {
  'use strict';

  let items = [];
  let bound = false;
  let ticking = false;

  function getAttr(el, name, def = null) {
    return el.getAttribute(`sw-parallax-${name}`) ||
           el.getAttribute(`swparal-${name}`) ||
           el.getAttribute(`sw-paral-${name}`) ||
           def;
  }

  function cap(v, range) { return range ? Math.max(-range, Math.min(range, v)) : v; }

  function bindMouse(el, speed, dir, inv, range) {
    el.addEventListener('mousemove', (event) => {
      el.style.transition = 'none';
      const r = el.getBoundingClientRect();
      const ox = cap((event.clientX - r.left - r.width / 2) * speed * (inv ? -1 : 1), range);
      const oy = cap((event.clientY - r.top - r.height / 2) * speed * (inv ? -1 : 1), range);
      const tx = dir !== 'vertical' ? ox : 0;
      const ty = dir !== 'horizontal' ? oy : 0;
      el.style.transform = `translate(${tx}px,${ty}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
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
          if (dir === 'horizontal') {
            el.style.backgroundPositionX = `calc(50% + ${off}px)`;
          } else {
            el.style.backgroundPositionY = `calc(50% + ${off}px)`;
          }
        } else {
          const tx = (dir === 'horizontal' || dir === 'both') ? off : 0;
          const ty = (dir === 'vertical' || dir === 'both') ? off : 0;
          el.style.transform = `translate(${tx}px,${ty}px)`;
        }
      });
      ticking = false;
    });
  }

  class SWParallax {
    static initAll(root = document) {
      const els = (root.querySelectorAll ? root : document).querySelectorAll('[sw-parallax], [swparal]');
      els.forEach((el) => {
        if (el._swParallax) return;
        const mobile = getAttr(el, 'mobile');
        if (mobile === 'false' && window.innerWidth <= 768) return;
        el._swParallax = true;

        const type = getAttr(el, 'type', 'background');
        const speedAttr = getAttr(el, 'speed');
        const speed = speedAttr !== null ? parseFloat(speedAttr) : 0.4;
        const dir = getAttr(el, 'dir', 'vertical');
        const inv = getAttr(el, 'inv') === 'true';
        const rangeAttr = getAttr(el, 'range');
        const range = rangeAttr !== null ? parseFloat(rangeAttr) : 0;

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
  }

  // Exportação global e no SW namespace
  window.SWParallax = SWParallax;
  window.SWPrl = SWParallax;
  if (window.SW?.register) window.SW.register('SWParallax', SWParallax);
  if (window.SW) {
    window.SW.Parallax = SWParallax;
    window.SW.Prl = SWParallax;
  }
})();
