/* SW Framework Tabs — [sw-tabs] container, .sw-tabs-it (nav), .sw-tabs-pnl (paineis) */
(function () {
  'use strict';

  class SWTabs {
    constructor(el) {
      if (el._swTabs) return;
      el._swTabs = this;
      this.el = el;
      this._bind();
      this._initNavScroll();
      const first = el.querySelector('.sw-tabs-it.is-act') || el.querySelector('.sw-tabs-it');
      if (first) this._activate(first, false);
    }

    _initNavScroll() {
      if (this.el.classList.contains('is-vrt') || this.el.classList.contains('is-btm')) return;
      const nav = this.el.querySelector('.sw-tabs-nav');
      if (!nav) return;
      if (!nav.parentElement.classList.contains('sw-tabs-nav-wrap')) {
        const wrap = document.createElement('div');
        wrap.className = 'sw-tabs-nav-wrap';
        nav.parentNode.insertBefore(wrap, nav);
        wrap.appendChild(nav);
      }
      const wrap = nav.parentElement;
      if (!wrap.querySelector('.sw-tabs-arr')) {
        const prev = document.createElement('button');
        prev.type = 'button';
        prev.className = 'sw-tabs-arr sw-tabs-arr-prv';
        prev.setAttribute('aria-label', 'Anterior');
        prev.innerHTML = '&#8249;';
        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'sw-tabs-arr sw-tabs-arr-nxt';
        next.setAttribute('aria-label', 'Próximo');
        next.innerHTML = '&#8250;';
        wrap.appendChild(prev);
        wrap.appendChild(next);
        const step = () => Math.max(nav.clientWidth * 0.6, 120);
        prev.addEventListener('click', () => nav.scrollBy({ left: -step(), behavior: 'smooth' }));
        next.addEventListener('click', () => nav.scrollBy({ left: step(), behavior: 'smooth' }));
      }
      const prevBtn = wrap.querySelector('.sw-tabs-arr-prv');
      const nextBtn = wrap.querySelector('.sw-tabs-arr-nxt');
      const check = () => {
        const overflow = nav.scrollWidth > nav.clientWidth + 2;
        const atStart = nav.scrollLeft < 2;
        const atEnd = nav.scrollLeft >= nav.scrollWidth - nav.clientWidth - 2;
        prevBtn?.classList.toggle('is-vis', overflow && !atStart);
        nextBtn?.classList.toggle('is-vis', overflow && !atEnd);
      };
      nav.addEventListener('scroll', check, { passive: true });
      window.addEventListener('resize', check, { passive: true });
      const active = nav.querySelector('.sw-tabs-it.is-act');
      if (active) active.scrollIntoView({ block: 'nearest', inline: 'center' });
      window.setTimeout(check, 50);
    }

    _bind() {
      this.el.addEventListener('click', (event) => {
        const btn = event.target.closest('.sw-tabs-it');
        if (!btn || btn.closest('[sw-tabs]') !== this.el) return;
        this._activate(btn);
      });
      this.el.addEventListener('keydown', (event) => {
        const btn = event.target.closest('.sw-tabs-it');
        if (!btn) return;
        const items = SW.$('.sw-tabs-it:not([disabled])', this.el);
        const idx = items.indexOf(btn);
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          const next = items[(idx + 1) % items.length];
          next?.focus();
          if (next) this._activate(next);
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          const prev = items[(idx - 1 + items.length) % items.length];
          prev?.focus();
          if (prev) this._activate(prev);
        }
      });
    }

    _activate(btn, emit = true) {
      const key = btn.getAttribute('sw-tabs-idx') || btn.getAttribute('href')?.replace('#', '');
      this.el.querySelectorAll('.sw-tabs-it').forEach((item) => {
        item.classList.remove('is-act');
        item.setAttribute('aria-selected', 'false');
        item.setAttribute('tabindex', '-1');
      });
      this.el.querySelectorAll('.sw-tabs-pnl').forEach((panel) => panel.classList.remove('is-act'));

      btn.classList.add('is-act');
      btn.setAttribute('aria-selected', 'true');
      btn.setAttribute('tabindex', '0');

      let panel;
      if (key !== undefined && key !== null && key !== '' && !Number.isNaN(Number(key))) {
        panel = this.el.querySelectorAll('.sw-tabs-pnl')[Number(key)];
      } else if (key) {
        panel = this.el.querySelector(`#${key}, [sw-tabs-pnl="${key}"]`);
      } else {
        const buttons = SW.$('.sw-tabs-it', this.el);
        panel = this.el.querySelectorAll('.sw-tabs-pnl')[buttons.indexOf(btn)];
      }
      if (panel) panel.classList.add('is-act');
      if (emit) SW.emit(this.el, 'sw:tabs:change', { key, btn, panel });
    }

    static initAll(root = document) {
      SW.$('[sw-tabs]', root).forEach((el) => new SWTabs(el));
    }

    static show(container, key) {
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      const btn = el?.querySelector(`[sw-tabs-idx="${key}"], #${key}`);
      if (el?._swTabs && btn) el._swTabs._activate(btn);
    }
  }

  window.SW?.register('SWTabs', SWTabs);
  if (window.SW) window.SW.Tabs = SWTabs;
})();
