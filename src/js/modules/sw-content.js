/* SW Framework Content — <div sw-content="/api/posts" sw-content-tmpl="#tmpl" sw-content-empty sw-content-err sw-content-trigger="load|click|visible" sw-content-paginate>
   <template>...{{campo}}...</template></div> — fetch JSON, interpola em <template>. API: SW.Content.load(el) */
(function () {
  'use strict';

  class SWContentInst {
    constructor(el) {
      this.el = el;
      this.url = el.getAttribute('sw-content');
      this.tmplSel = el.getAttribute('sw-content-tmpl') || null;
      this.emptyMsg = el.getAttribute('sw-content-empty') || '';
      this.errMsg = el.getAttribute('sw-content-err') || 'Erro ao carregar conteúdo.';
      this.trigger = el.getAttribute('sw-content-trigger') || 'load';
      this.paginate = el.hasAttribute('sw-content-paginate');
      this.page = 1;
      this.loading = false;
      this.tmpl = this.tmplSel ? document.querySelector(this.tmplSel) : el.querySelector('template');
      this._bind();
    }

    _bind() {
      if (this.trigger === 'load') this.load();
      if (this.trigger === 'click') {
        const btn = document.querySelector(this.el.getAttribute('sw-content-btn') || '[sw-content-load]');
        btn?.addEventListener('click', () => this.load());
      }
      if (this.trigger === 'visible') {
        const observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) { observer.disconnect(); this.load(); }
        });
        observer.observe(this.el);
      }
    }

    async load(page = this.page) {
      if (this.loading) return;
      this.loading = true;
      this.page = page;

      let url = this.url;
      if (this.paginate) url += `${url.includes('?') ? '&' : '?'}page=${page}`;

      try {
        const res = await fetch(url, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        this._render(json);
      } catch (_) {
        this._showErr();
      } finally {
        this.loading = false;
      }
    }

    _render(json) {
      const list = Array.isArray(json) ? json : Array.isArray(json.dados) ? json.dados : [json];
      const container = document.createElement('div');

      if (!list.length) {
        if (this.emptyMsg) container.innerHTML = `<p class="sw-text-mut" style="padding:1rem">${this.emptyMsg}</p>`;
      } else {
        list.forEach((item) => {
          const node = this._renderItem(item);
          if (node) container.appendChild(node);
        });
      }

      if (this.paginate && json.paginas > 1) container.appendChild(this._buildPager(json));

      const keep = this.el.querySelector('template');
      this.el.innerHTML = '';
      if (keep) this.el.appendChild(keep);
      this.el.appendChild(container);
      SW.reinit(container);

      SW.emit(this.el, 'sw:content:loaded', { dados: json });
    }

    _renderItem(item) {
      if (!this.tmpl) return null;
      const clone = this.tmpl.content.cloneNode(true);
      this._interpolate(clone, item);
      const wrap = document.createElement('div');
      wrap.appendChild(clone);
      return wrap.firstElementChild || wrap;
    }

    _interpolate(node, data) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = node.textContent.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? '');
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        Array.from(node.attributes).forEach((attr) => {
          attr.value = attr.value.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? '');
        });
      }
      node.childNodes.forEach((c) => this._interpolate(c, data));
    }

    _buildPager(json) {
      const div = document.createElement('div');
      div.className = 'sw-content-pager';
      if (json.pagina > 1) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('sw-btn', '');
        btn.className = 'sw-btn-sm';
        btn.textContent = '← Anterior';
        btn.addEventListener('click', () => this.load(json.pagina - 1));
        div.appendChild(btn);
      }
      const info = document.createElement('span');
      info.className = 'sw-text-mut';
      info.textContent = `Página ${json.pagina} de ${json.paginas}`;
      div.appendChild(info);
      if (json.pagina < json.paginas) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('sw-btn', '');
        btn.className = 'sw-btn-sm';
        btn.textContent = 'Próxima →';
        btn.addEventListener('click', () => this.load(json.pagina + 1));
        div.appendChild(btn);
      }
      return div;
    }

    _showErr() {
      this.el.innerHTML = `<p class="sw-text-err" style="padding:1rem">${this.errMsg}</p>`;
    }
  }

  class SWContent {
    static initAll(root = document) {
      SW.$('[sw-content]', root).forEach((el) => {
        if (el._swContent) return;
        el._swContent = new SWContentInst(el);
      });
    }

    static load(el) { el._swContent?.load(); }
  }

  window.SW?.register('SWContent', SWContent);
  if (window.SW) window.SW.Content = SWContent;
})();
