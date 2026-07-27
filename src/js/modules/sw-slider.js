/* SW Framework Slider — [sw-slider] > .sw-slider-trk > .sw-slider-it, .sw-slider-prv/-nxt, .sw-slider-dot-grp */
(function () {
  'use strict';

  class SWSliderInst {
    constructor(el) {
      this.el = el;
      this.trk = el.querySelector('.sw-slider-trk');
      this.items = Array.from(el.querySelectorAll('.sw-slider-it'));
      this.btnPrv = el.querySelector('.sw-slider-prv');
      this.btnNxt = el.querySelector('.sw-slider-nxt');
      this.dotWrap = el.querySelector('.sw-slider-dot-grp');
      this.btnPly = el.querySelector('.sw-slider-ply');

      this.show = Math.max(1, parseInt(el.getAttribute('sw-slider-show'), 10) || 1);
      this.loop = el.getAttribute('sw-slider-loop') !== 'false';
      this.auto = parseInt(el.getAttribute('sw-slider-auto'), 10) || 0;
      this.hoverRun = el.getAttribute('sw-slider-hover') === 'run';
      this.effect = el.getAttribute('sw-slider-effect') || 'slide';
      this.dur = el.getAttribute('sw-slider-dur') || null;
      this.scroll = Math.min(this.show, Math.max(1, parseInt(el.getAttribute('sw-slider-scroll'), 10) || this.show));

      this.total = this.items.length;
      this.pages = this.loop
        ? Math.ceil(this.total / this.scroll)
        : Math.max(1, Math.floor((this.total - this.show) / this.scroll) + 1);
      this.page = 0;
      this._paused = false;
      this._timer = null;
      this._busy = false;
      this._infinite = false;

      if (!this.trk || !this.total) return;

      this._setupInfinite();
      this._buildDots();
      this._bind();
      this._layout(false);
      if (this.auto > 0) this._timerStart();
    }

    _setupInfinite() {
      if (!this.loop || this.effect === 'zoom') return;
      this._infinite = true;
      const appCount = this.show + Math.max(0, this.pages * this.scroll - this.total);
      this.items.slice(-this.scroll).slice().reverse()
        .forEach((it) => this.trk.insertBefore(it.cloneNode(true), this.trk.firstChild));
      this.items.slice(0, appCount)
        .forEach((it) => this.trk.appendChild(it.cloneNode(true)));
      this._extPos = 1;
    }

    _buildDots() {
      if (!this.dotWrap) return;
      this.dotWrap.innerHTML = '';
      this.dots = Array.from({ length: this.pages }, (_, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sw-slider-dot';
        btn.setAttribute('aria-label', `Página ${i + 1}`);
        btn.addEventListener('click', () => this._goTo(i));
        this.dotWrap.appendChild(btn);
        return btn;
      });
    }

    _timerStart() {
      window.clearInterval(this._timer);
      this._timer = window.setInterval(() => this._step(1), this.auto);
    }

    _timerStop() {
      window.clearInterval(this._timer);
      this._timer = null;
    }

    _bind() {
      this.btnPrv?.addEventListener('click', (event) => { event.preventDefault(); this._step(-1); });
      this.btnNxt?.addEventListener('click', (event) => { event.preventDefault(); this._step(1); });

      this.btnPly?.addEventListener('click', (event) => {
        event.preventDefault();
        this._paused = !this._paused;
        this._paused ? this._timerStop() : this._timerStart();
        this.btnPly.classList.toggle('is-paused', this._paused);
      });

      if (this.auto > 0 && !this.hoverRun) {
        this.el.addEventListener('mouseenter', () => { if (!this._paused) this._timerStop(); });
        this.el.addEventListener('mouseleave', () => { if (!this._paused) this._timerStart(); });
      }

      let startX = 0;
      this.el.addEventListener('touchstart', (event) => { startX = event.touches[0].clientX; }, { passive: true });
      this.el.addEventListener('touchend', (event) => {
        const diff = startX - event.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) this._step(diff > 0 ? 1 : -1);
      });

      this.el.setAttribute('tabindex', '0');
      this.el.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); this._step(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); this._step(1); }
      });

      if (window.ResizeObserver) {
        this._ro = new ResizeObserver(() => this._layout(false));
        this._ro.observe(this.el);
      } else {
        window.addEventListener('resize', () => this._layout(false), { passive: true });
      }
    }

    _step(dir) {
      if (this._busy) return;
      if (this._infinite) {
        if (this.el.clientWidth === 0) return;
        this._busy = true;
        this._extPos += dir;
        this._layout(true);
        const done = () => {
          this.trk.removeEventListener('transitionend', done);
          if (this._extPos === 0) { this._extPos = this.pages; this._layout(false); }
          else if (this._extPos === this.pages + 1) { this._extPos = 1; this._layout(false); }
          this._busy = false;
        };
        this.trk.addEventListener('transitionend', done);
        const durMs = this.dur ? (this.dur.includes('ms') ? parseFloat(this.dur) : parseFloat(this.dur) * 1000) : 500;
        window.setTimeout(() => { if (this._busy) done(); }, durMs + 100);
      } else {
        let next = this.page + dir;
        if (this.loop) next = ((next % this.pages) + this.pages) % this.pages;
        else next = Math.max(0, Math.min(next, this.pages - 1));
        this._goTo(next);
      }
    }

    _goTo(page) {
      if (this._infinite) this._extPos = page + 1;
      this.page = page;
      this._layout(true);
      SW.emit(this.el, 'sw:slider:change', { page });
    }

    _layout(animate) {
      if (this.effect === 'zoom') { this._layoutZoom(); return; }
      const width = this.el.clientWidth;
      if (width === 0) return;

      const itemW = width / this.show;
      this.trk.querySelectorAll('.sw-slider-it').forEach((it) => { it.style.width = `${itemW}px`; });

      const pos = this._infinite ? this._extPos : this.page;
      const offset = pos * this.scroll * itemW;
      const customTr = this.dur ? `transform ${this.dur} cubic-bezier(.4,0,.2,1)` : '';

      if (!animate) {
        this.trk.style.transition = 'none';
        this.trk.style.transform = `translateX(-${offset}px)`;
        void this.trk.getBoundingClientRect();
        this.trk.style.transition = customTr;
      } else {
        if (customTr) this.trk.style.transition = customTr;
        this.trk.style.transform = `translateX(-${offset}px)`;
      }

      if (this._infinite) this.page = (((this._extPos - 1) % this.pages) + this.pages) % this.pages;
      this.dots?.forEach((dot, i) => dot.classList.toggle('is-act', i === this.page));
    }

    _layoutZoom() {
      const prevIdx = this.items.findIndex((it) => it.classList.contains('is-act'));
      const fadeDur = this.dur || null;
      const incoming = this.items[this.page];
      incoming.classList.remove('is-out');
      if (fadeDur) incoming.style.transition = `opacity ${fadeDur} ease`;
      incoming.style.setProperty('--kb-anim', `sw-slider-kb-${(this.page % 4) + 1}`);
      const child = incoming.firstElementChild;
      if (child) {
        child.style.animation = 'none';
        void incoming.getBoundingClientRect();
        child.style.animation = '';
      }
      incoming.classList.add('is-act');

      if (prevIdx !== -1 && prevIdx !== this.page) {
        const outgoing = this.items[prevIdx];
        if (fadeDur) outgoing.style.transition = `opacity ${fadeDur} ease`;
        outgoing.classList.remove('is-act');
        outgoing.classList.add('is-out');
        outgoing.addEventListener('transitionend', () => outgoing.classList.remove('is-out'), { once: true });
      }
      this.dots?.forEach((dot, i) => dot.classList.toggle('is-act', i === this.page));
    }
  }

  class SWSlider {
    static initAll(root = document) {
      SW.$('[sw-slider]', root).forEach((el) => {
        if (el._swSlider) return;
        el._swSlider = new SWSliderInst(el);
      });
    }

    static next(el) { el._swSlider?._step(1); }
    static prev(el) { el._swSlider?._step(-1); }
    static goTo(el, idx) { el._swSlider?._goTo(idx); }
  }

  window.SW?.register('SWSlider', SWSlider);
  if (window.SW) window.SW.Slider = SWSlider;
})();
