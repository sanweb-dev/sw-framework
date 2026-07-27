/* SW Framework Accordion — [sw-accordion] container, .sw-acc-it > .sw-acc-hdr + .sw-acc-bdy */
(function () {
  'use strict';

  class SWAccordion {
    constructor(el) {
      if (el._swAccordion) return;
      el._swAccordion = this;
      this.el = el;
      this.multi = el.getAttribute('sw-accordion-multi') === 'true';
      this._bind();
      this._initAria();
    }

    _bind() {
      this.el.addEventListener('click', (event) => {
        const hdr = event.target.closest('.sw-acc-hdr');
        if (!hdr) return;
        const item = hdr.closest('.sw-acc-it');
        if (!item || item.closest('[sw-accordion]') !== this.el) return;
        this.toggle(item);
      });
      this.el.addEventListener('keydown', (event) => {
        const hdr = event.target.closest('.sw-acc-hdr');
        if (!hdr || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        hdr.click();
      });
    }

    _initAria() {
      this.el.querySelectorAll('.sw-acc-it').forEach((item) => {
        const hdr = item.querySelector('.sw-acc-hdr');
        const bdy = item.querySelector('.sw-acc-bdy');
        if (!hdr || !bdy) return;
        const id = bdy.id || `_swacc-${Math.random().toString(36).slice(2, 8)}`;
        bdy.id = id;
        hdr.setAttribute('aria-controls', id);
        hdr.setAttribute('role', 'button');
        hdr.setAttribute('tabindex', '0');
        const isOpen = item.classList.contains('is-act');
        hdr.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (isOpen) bdy.style.height = 'auto';
      });
    }

    _measure(bdy) {
      const prev = bdy.style.cssText;
      bdy.style.cssText += ';transition:none!important;height:auto!important;';
      const height = bdy.scrollHeight;
      bdy.style.cssText = prev;
      void bdy.offsetHeight;
      return height;
    }

    open(item) {
      if (!this.multi) {
        this.el.querySelectorAll('.sw-acc-it.is-act').forEach((other) => {
          if (other !== item) this.close(other);
        });
      }
      item.classList.add('is-act');
      const bdy = item.querySelector('.sw-acc-bdy');
      if (bdy) {
        const height = this._measure(bdy);
        bdy.style.height = '0';
        void bdy.offsetHeight;
        bdy.style.height = `${height}px`;
        bdy.addEventListener('transitionend', () => {
          if (item.classList.contains('is-act')) bdy.style.height = 'auto';
        }, { once: true });
      }
      item.querySelector('.sw-acc-hdr')?.setAttribute('aria-expanded', 'true');
      SW.emit(item, 'sw:accordion:open', { item });
    }

    close(item) {
      const bdy = item.querySelector('.sw-acc-bdy');
      if (bdy) {
        bdy.style.height = `${bdy.scrollHeight}px`;
        void bdy.offsetHeight;
        bdy.style.height = '0';
      }
      item.classList.remove('is-act');
      item.querySelector('.sw-acc-hdr')?.setAttribute('aria-expanded', 'false');
      SW.emit(item, 'sw:accordion:close', { item });
    }

    toggle(item) {
      if (item.classList.contains('is-act')) this.close(item);
      else this.open(item);
    }

    static initAll(root = document) {
      SW.$('[sw-accordion]', root).forEach((el) => new SWAccordion(el));
    }

    static open(container, index) {
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      const item = el?.querySelectorAll('.sw-acc-it')[index];
      if (el?._swAccordion && item) el._swAccordion.open(item);
    }
  }

  window.SW?.register('SWAccordion', SWAccordion);
  if (window.SW) window.SW.Accordion = SWAccordion;
})();
