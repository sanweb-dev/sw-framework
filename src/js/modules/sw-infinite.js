/* SW Framework Infinite Scroll — <div sw-infinite sw-infinite-url="/api/posts?page={page}" sw-infinite-target="#lista" sw-infinite-per sw-infinite-offset>
   Eventos: sw:infinite:load { page, items } · sw:infinite:end · sw:infinite:error { page } */
(function () {
  'use strict';

  class SWInfiniteInst {
    constructor(el) {
      this.el = el;
      this.url = el.getAttribute('sw-infinite-url');
      this.target = document.querySelector(el.getAttribute('sw-infinite-target') || 'body');
      this.offset = parseInt(el.getAttribute('sw-infinite-offset'), 10) || 300;
      this.page = parseInt(el.getAttribute('sw-infinite-start'), 10) || 1;
      this.loading = false;
      this.done = false;

      window.addEventListener('scroll', () => this._check(), { passive: true });
      this._check();
    }

    _check() {
      if (this.loading || this.done) return;
      const dist = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      if (dist <= this.offset) this._load();
    }

    _load() {
      this.loading = true;
      const url = this.url.replace('{page}', this.page);

      const spin = document.createElement('div');
      spin.className = 'sw-infinite-loader';
      spin.textContent = 'Carregando…';
      this.target.appendChild(spin);

      fetch(url)
        .then((r) => r.text())
        .then((html) => {
          spin.remove();
          const tmp = document.createElement('div');
          tmp.innerHTML = html;
          const items = Array.from(tmp.children);

          if (!items.length) {
            this.done = true;
            SW.emit(this.el, 'sw:infinite:end');
            return;
          }

          const frag = document.createDocumentFragment();
          items.forEach((it) => frag.appendChild(it));
          this.target.appendChild(frag);
          SW.reinit(this.target);
          this.page += 1;
          SW.emit(this.el, 'sw:infinite:load', { page: this.page, items });
        })
        .catch(() => {
          spin.remove();
          SW.emit(this.el, 'sw:infinite:error', { page: this.page });
        })
        .finally(() => { this.loading = false; });
    }
  }

  class SWInfinite {
    static initAll(root = document) {
      SW.$('[sw-infinite]', root).forEach((el) => {
        if (el._swInfinite) return;
        el._swInfinite = new SWInfiniteInst(el);
      });
    }
  }

  window.SW?.register('SWInfinite', SWInfinite);
  if (window.SW) window.SW.Infinite = SWInfinite;
})();
