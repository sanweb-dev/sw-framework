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
      // Lista de itens e thumb deslizante são nós persistentes (criados uma vez só)
      // -- só o CONTEÚDO da lista é substituído a cada render, nunca a lista em si,
      // senão o thumb seria destruído junto e perderia a posição de partida da animação.
      this.list = document.createElement('div');
      this.list.className = 'sw-pagination-list';
      this.thumb = document.createElement('div');
      this.thumb.className = 'sw-pagination-thumb';
      this.el.appendChild(this.thumb);
      this.el.appendChild(this.list);
      this._render(true);
    }

    _render(first) {
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

      this.list.innerHTML = items.map((it) => {
        if (it.cls === 'is-sep') return `<span class="sw-pagination-it is-sep">${it.label}</span>`;
        return `<a class="sw-pagination-it ${it.cls || ''}" data-page="${it.page || ''}" role="button" tabindex="0">${it.label}</a>`;
      }).join('');

      this.list.querySelectorAll('.sw-pagination-it[data-page]').forEach((a) => {
        a.addEventListener('click', () => this._go(parseInt(a.getAttribute('data-page'), 10)));
        a.addEventListener('keydown', (event) => { if (event.key === 'Enter') this._go(parseInt(a.getAttribute('data-page'), 10)); });
      });

      this._moveThumb(first);
    }

    _moveThumb(first) {
      const act = this.list.querySelector('.sw-pagination-it.is-act');
      if (!act) { this.thumb.style.width = '0'; return; }
      // translateY também, não só translateX -- com flex-wrap, itens podem cair pra
      // uma segunda linha em telas estreitas, e o thumb precisa acompanhar ali também.
      const x = act.offsetLeft;
      const y = act.offsetTop;
      const w = act.offsetWidth;
      if (first) {
        // Sem transição no primeiro posicionamento -- senão desliza do canto 0,0
        // até a página atual assim que a página carrega, um "flash" indesejado.
        this.thumb.style.transition = 'none';
        this.thumb.style.transform = `translate(${x}px, ${y}px)`;
        this.thumb.style.width = `${w}px`;
        void this.thumb.offsetWidth;
        this.thumb.style.transition = '';
      } else {
        this.thumb.style.transform = `translate(${x}px, ${y}px)`;
        this.thumb.style.width = `${w}px`;
      }
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

  // Reposiciona o thumb de todas as paginações no resize -- flex-wrap pode mudar
  // quantas linhas os itens ocupam quando a largura da janela muda.
  window.addEventListener('resize', () => {
    SW.$('[sw-pagination]').forEach((el) => el._swPagination?._moveThumb(true));
  }, { passive: true });

  window.SW?.register('SWPagination', SWPagination);
  if (window.SW) window.SW.Pagination = SWPagination;
})();
