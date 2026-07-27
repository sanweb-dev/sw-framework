/* SW Framework Text Carousel — [sw-carousel] > .sw-carousel-trk > itens; troca com efeitos (fade/slide/zoom/bounce/flip) */
(function () {
  'use strict';

  class SWCarouselInst {
    constructor(el) {
      this.el = el;
      this.trk = el.querySelector('.sw-carousel-trk');
      if (!this.trk) return;
      this.items = Array.from(this.trk.children);
      if (!this.items.length) return;
      this.cur = 0;
      this.busy = false;
      this.effect = el.getAttribute('sw-carousel-effect') || (el.classList.contains('is-fde') ? 'fade' : 'slide-left');
      this.dur = parseInt(el.getAttribute('sw-carousel-dur'), 10) || 600;
      this.loop = el.getAttribute('sw-carousel-loop') !== 'false';
      this.auto = parseInt(el.getAttribute('sw-carousel-auto'), 10) || 0;
      this.timer = null;
      this.dts = el.querySelector('.sw-carousel-dts');
      this.prv = el.querySelector('.sw-carousel-prv');
      this.nxt = el.querySelector('.sw-carousel-nxt');
      this._build();
      this._bind();
      if (this.auto) this._resume();
    }

    _build() {
      this.el.style.setProperty('--sw-car-dur', `${this.dur}ms`);
      this.items.forEach((it, i) => {
        it.style.opacity = i === 0 ? '1' : '0';
        it.style.visibility = i === 0 ? 'visible' : 'hidden';
        it.style.transform = 'none';
        it.classList.toggle('is-act', i === 0);
      });
      if (this.dts) {
        this.dts.innerHTML = '';
        this.items.forEach((_, i) => {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = `sw-carousel-dot${i === 0 ? ' is-act' : ''}`;
          dot.setAttribute('aria-label', `Slide ${i + 1}`);
          dot.addEventListener('click', () => this._goTo(i));
          this.dts.appendChild(dot);
        });
      }
    }

    _bind() {
      this.prv?.addEventListener('click', () => this._go(-1));
      this.nxt?.addEventListener('click', () => this._go(1));
      let sx = 0;
      this.el.addEventListener('pointerdown', (event) => { sx = event.clientX; });
      this.el.addEventListener('pointerup', (event) => {
        const dx = event.clientX - sx;
        if (Math.abs(dx) > 40) this._go(dx < 0 ? 1 : -1);
      });
      if (this.auto) {
        this.el.addEventListener('mouseenter', () => this._pause());
        this.el.addEventListener('mouseleave', () => this._resume());
      }
    }

    _go(dir) {
      let next = this.cur + dir;
      if (this.loop) next = (next + this.items.length) % this.items.length;
      else if (next < 0 || next >= this.items.length) return;
      this._goTo(next);
    }

    _goTo(idx) {
      if (this.busy || idx === this.cur) return;
      this.busy = true;
      const prev = this.cur;
      const out = this.items[prev];
      const inn = this.items[idx];
      const eff = inn.getAttribute('sw-carousel-effect') || this.effect;

      out.style.position = 'absolute';
      inn.style.position = 'relative';
      inn.style.transition = 'none';
      inn.style.visibility = 'visible';
      inn.style.opacity = '0';
      inn.style.zIndex = '1';
      out.style.zIndex = '0';
      this._setStart(inn, eff);

      void inn.getBoundingClientRect();
      inn.style.transition = '';
      inn.style.opacity = '1';
      inn.style.transform = 'none';

      out.style.opacity = '0';
      this._setOut(out, eff);

      this.cur = idx;
      if (this.dts) Array.from(this.dts.children).forEach((dot, i) => dot.classList.toggle('is-act', i === idx));
      SW.emit(this.el, 'sw:carousel:change', { index: idx });

      window.setTimeout(() => {
        out.style.visibility = 'hidden';
        out.style.transform = 'none';
        out.style.zIndex = '';
        inn.style.zIndex = '';
        out.classList.remove('is-act');
        inn.classList.add('is-act');
        out.style.position = '';
        inn.style.position = '';
        this.busy = false;
      }, this.dur);
    }

    _setStart(item, eff) {
      const map = {
        'slide-left': 'translateX(100%)', 'slide-right': 'translateX(-100%)',
        'slide-up': 'translateY(100%)', 'slide-down': 'translateY(-100%)',
        'zoom-in': 'scale(0.85)', 'zoom-out': 'scale(1.15)',
        bounce: 'scale(0.7) translateY(40px)', flip: 'rotateY(90deg)'
      };
      item.style.transform = map[eff] || 'none';
    }

    _setOut(item, eff) {
      const map = {
        'slide-left': 'translateX(-100%)', 'slide-right': 'translateX(100%)',
        'slide-up': 'translateY(-100%)', 'slide-down': 'translateY(100%)',
        'zoom-in': 'scale(1.15)', 'zoom-out': 'scale(0.85)',
        bounce: 'scale(0.7) translateY(-40px)', flip: 'rotateY(-90deg)'
      };
      item.style.transform = map[eff] || 'none';
    }

    _pause() { window.clearInterval(this.timer); this.timer = null; }
    _resume() {
      if (!this.auto) return;
      this._pause();
      this.timer = window.setInterval(() => this._go(1), this.auto);
    }
  }

  class SWCarousel {
    static initAll(root = document) {
      SW.$('[sw-carousel]', root).forEach((el) => {
        if (el._swCarousel) return;
        el._swCarousel = new SWCarouselInst(el);
      });
    }

    static next(el) { el._swCarousel?._go(1); }
    static prev(el) { el._swCarousel?._go(-1); }
    static goTo(el, idx) { el._swCarousel?._goTo(idx); }
    static pause(el) { el._swCarousel?._pause(); }
    static resume(el) { el._swCarousel?._resume(); }
  }

  window.SW?.register('SWCarousel', SWCarousel);
  if (window.SW) window.SW.Carousel = SWCarousel;
})();
