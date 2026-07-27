/* SW Framework Pagination — <nav sw-pagination sw-pagination-total sw-pagination-per sw-pagination-cur sw-pagination-delta> */
(function () {
  'use strict';

  class SWPaginationInst {
    constructor(el) {
      this.el = el;
      this.total = parseInt(el.getAttribute('sw-pagination-total'), 10) || 1;
      this.per = parseInt(el.getAttribute('sw-pagination-per'), 10) || 10;
      this.cur = parseInt(el.getAttribute('sw-pagination-cur'), 10) || 1;
      this.delta = parseInt(el.getAttribute('sw-pagination-delta'), 10) || 2;
      this.ends = el.hasAttribute('sw-pagination-ends');
      this.pages = Math.ceil(this.total / this.per);
      this._render();
    }

    _render() {
      const { cur, pages } = this;
      const items = [];
      if (this.ends) items.push({ label: '&#171;', page: 1, cls: `is-arr${cur === 1 ? ' is-dis' : ''}` });
      items.push({ label: '&#8249;', page: cur - 1, cls: `is-arr${cur === 1 ? ' is-dis' : ''}` });

      const range = this._range(1, pages);
      let last = 0;
      range.forEach((p) => {
        if (last && p - last > 1) items.push({ label: '&hellip;', cls: 'is-sep' });
        items.push({ label: p, page: p, cls: p === cur ? 'is-act' : '' });
        last = p;
      });

      items.push({ label: '&#8250;', page: cur + 1, cls: `is-arr${cur === pages ? ' is-dis' : ''}` });
      if (this.ends) items.push({ label: '&#187;', page: pages, cls: `is-arr${cur === pages ? ' is-dis' : ''}` });

      this.el.innerHTML = items.map((it) => {
        if (it.cls === 'is-sep') return `<span class="sw-pagination-it is-sep">${it.label}</span>`;
        return `<a class="sw-pagination-it ${it.cls || ''}" data-page="${it.page || ''}" role="button" tabindex="0">${it.label}</a>`;
      }).join('');

      this.el.querySelectorAll('.sw-pagination-it[data-page]').forEach((a) => {
        a.addEventListener('click', () => this._go(parseInt(a.getAttribute('data-page'), 10)));
        a.addEventListener('keydown', (event) => { if (event.key === 'Enter') this._go(parseInt(a.getAttribute('data-page'), 10)); });
      });
    }

    _range(start, end) {
      const { cur, delta } = this;
      const set = new Set([start, end]);
      for (let i = Math.max(start, cur - delta); i <= Math.min(end, cur + delta); i += 1) set.add(i);
      return [...set].sort((a, b) => a - b);
    }

    _go(page) {
      if (page < 1 || page > this.pages || page === this.cur) return;
      this.cur = page;
      this.el.setAttribute('sw-pagination-cur', page);
      this._render();
      SW.emit(this.el, 'sw:pagination:change', { page });
    }

    goto(page) { this._go(page); }
  }

  class SWPagination {
    static initAll(root = document) {
      SW.$('[sw-pagination]', root).forEach((el) => {
        if (el._swPagination) return;
        el._swPagination = new SWPaginationInst(el);
      });
    }
  }

  window.SW?.register('SWPagination', SWPagination);
  if (window.SW) window.SW.Pagination = SWPagination;
})();
