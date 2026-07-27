/* SW Framework Custom Select — <div sw-select><select sw-select-ph="..." sw-select-search="false">...</select></div>
   Multi-seleção: adicione "multiple" no <select>.
   Com busca (padrão) e seleção única, o próprio campo visível já é o input de busca —
   sem precisar abrir o dropdown antes de digitar. */
(function () {
  'use strict';

  class SWSelectInst {
    constructor(el) {
      this.el = el;
      this.native = el.querySelector('select');
      if (!this.native) return;

      this.multi = this.native.multiple;
      this.search = this.native.getAttribute('sw-select-search') !== 'false';
      this.inlineSearch = this.search && !this.multi;
      this.ph = this.native.getAttribute('sw-select-ph') || this.native.querySelector('option[value=""]')?.textContent || 'Selecione…';
      this.opts = Array.from(this.native.options).filter((o) => o.value !== '');
      this._sel = new Set();

      this.opts.filter((o) => o.selected).forEach((o) => this._sel.add(o.value));

      this._build();
      this._close = this._close.bind(this);
    }

    _build() {
      this.native.style.display = 'none';
      // Sem busca inline: dropdown usa seu próprio campo de busca (multi-select, ou sw-select-search="false" some com ele todo)
      const dropdownSearchHtml = this.search && !this.inlineSearch
        ? '<div class="sw-select-srch-wrap"><input class="sw-select-srch" type="text" placeholder="Buscar…" autocomplete="off"></div>' : '';

      const boxTxtHtml = this.inlineSearch
        ? `<input class="sw-select-box-inp is-ph" type="text" placeholder="${this.ph}" autocomplete="off">`
        : `<span class="sw-select-box-txt is-ph">${this.ph}</span>`;

      this.el.insertAdjacentHTML('beforeend', `
        <div class="sw-select-box" ${this.inlineSearch ? '' : 'tabindex="0"'} role="combobox" aria-expanded="false">
          ${boxTxtHtml}
          <span class="sw-select-arr" aria-hidden="true"></span>
        </div>
        <div class="sw-select-drp" role="listbox">
          ${dropdownSearchHtml}
          <div class="sw-select-list">
            ${this.opts.map((o) => `<div class="sw-select-it${this._sel.has(o.value) ? ' is-sel' : ''}" data-val="${o.value}" role="option" aria-selected="${this._sel.has(o.value)}">${o.textContent}</div>`).join('')}
          </div>
        </div>`);

      this._box = this.el.querySelector('.sw-select-box');
      this._drp = this.el.querySelector('.sw-select-drp');
      this._list = this.el.querySelector('.sw-select-list');
      this._txt = this.el.querySelector('.sw-select-box-txt');
      this._boxInp = this.el.querySelector('.sw-select-box-inp');
      this._srch = this.el.querySelector('.sw-select-srch');

      if (this.inlineSearch) {
        this._boxInp.addEventListener('focus', () => this._open());
        this._boxInp.addEventListener('click', (event) => event.stopPropagation());
        this._boxInp.addEventListener('input', (event) => {
          if (!this.el.classList.contains('is-open')) this._open();
          this._filter(event.target.value);
        });
        this._boxInp.addEventListener('keydown', (event) => { if (event.key === 'Escape') this._boxInp.blur(); });
        this._box.addEventListener('click', () => this._boxInp.focus());
      } else {
        this._box.addEventListener('click', () => (this.el.classList.contains('is-open') ? this._close() : this._open()));
        this._box.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this._open(); }
          if (event.key === 'Escape') this._close();
        });
      }

      this._list.addEventListener('click', (event) => {
        const it = event.target.closest('.sw-select-it');
        if (!it || it.classList.contains('is-dis')) return;
        this._pick(it.getAttribute('data-val'));
        if (!this.multi) this._close();
      });

      this._srch?.addEventListener('input', (event) => this._filter(event.target.value));

      this._updateDisplay();
    }

    _filter(query) {
      const q = query.toLowerCase();
      this._list.querySelectorAll('.sw-select-it').forEach((it) => {
        it.classList.toggle('is-hid', !it.textContent.toLowerCase().includes(q));
      });
      const any = this._list.querySelector('.sw-select-it:not(.is-hid)');
      let empty = this._list.querySelector('.sw-select-empty');
      if (!any) {
        if (!empty) {
          empty = document.createElement('div');
          empty.className = 'sw-select-empty';
          empty.textContent = 'Nenhum resultado';
          this._list.appendChild(empty);
        }
      } else if (empty) {
        empty.remove();
      }
    }

    _open() {
      this.el.classList.add('is-open');
      this._box.setAttribute('aria-expanded', 'true');
      if (this.inlineSearch) {
        this._boxInp.select();
      } else {
        this._srch?.focus();
      }
      window.setTimeout(() => document.addEventListener('click', this._close), 0);
    }

    _close(event) {
      if (event && this.el.contains(event.target)) return;
      this.el.classList.remove('is-open');
      this._box.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', this._close);
      if (this.inlineSearch) {
        this._filter('');
        this._updateDisplay();
      }
    }

    _pick(val) {
      if (this.multi) {
        this._sel.has(val) ? this._sel.delete(val) : this._sel.add(val);
      } else {
        this._sel.clear();
        this._sel.add(val);
      }
      this._list.querySelectorAll('.sw-select-it').forEach((it) => {
        const on = this._sel.has(it.getAttribute('data-val'));
        it.classList.toggle('is-sel', on);
        it.setAttribute('aria-selected', on);
      });
      Array.from(this.native.options).forEach((o) => { o.selected = this._sel.has(o.value); });
      this.native.dispatchEvent(new Event('change', { bubbles: true }));
      this._updateDisplay();
      const first = this.opts.find((o) => this._sel.has(o.value));
      SW.emit(this.el, 'sw:select:change', { value: [...this._sel], label: first?.textContent });
    }

    _updateDisplay() {
      if (this.inlineSearch) {
        const opt = this.opts.find((o) => this._sel.has(o.value));
        this._boxInp.value = opt?.textContent || '';
        this._boxInp.classList.toggle('is-ph', !opt);
        return;
      }

      if (!this._sel.size) {
        this._txt.textContent = this.ph;
        this._txt.classList.add('is-ph');
        return;
      }
      this._txt.classList.remove('is-ph');
      if (this.multi) {
        this._txt.innerHTML = '';
        this.opts.filter((o) => this._sel.has(o.value)).forEach((o) => {
          const label = o.textContent;
          const tag = document.createElement('span');
          tag.className = 'sw-select-tag';
          tag.textContent = label;
          const rm = document.createElement('span');
          rm.className = 'sw-select-tag-rm';
          rm.textContent = '×';
          rm.addEventListener('click', (event) => {
            event.stopPropagation();
            this._pick(o.value);
          });
          tag.appendChild(rm);
          this._txt.appendChild(tag);
        });
      } else {
        const opt = this.opts.find((o) => this._sel.has(o.value));
        this._txt.textContent = opt?.textContent || this.ph;
      }
    }

    getValue() { return this.multi ? [...this._sel] : [...this._sel][0]; }
    setValue(v) { this._pick(String(v)); }
  }

  class SWSelect {
    static initAll(root = document) {
      SW.$('[sw-select]', root).forEach((el) => {
        if (el._swSelect) return;
        el._swSelect = new SWSelectInst(el);
      });
    }

    static set(target, value, opts = {}) {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      el?._swSelect?.setValue(value);
      return opts;
    }
  }

  window.SW?.register('SWSelect', SWSelect);
  if (window.SW) window.SW.Select = SWSelect;
})();
