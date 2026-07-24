/* SW Framework — progressive enhancement for native selects */
(function () {
  'use strict';

  class SWSelect {
    static initAll(root = document) {
      SW.$('select[sw-select], select.sw-select', root).forEach((select) => this.init(select));
    }

    static init(select) {
      if (!(select instanceof HTMLSelectElement) || select._swSelectInit) return false;
      select._swSelectInit = true;
      select.classList.add('sw-select');
      select.addEventListener('change', () => {
        this.sync(select);
        SW.emit(select, 'sw:select-change', { value: select.value, select });
      });
      this.sync(select);
      return true;
    }

    static sync(select) {
      if (!(select instanceof HTMLSelectElement)) return false;
      select.dataset.swSelectState = select.value === '' ? 'empty' : 'selected';
      return true;
    }

    static set(target, value, { emit = true } = {}) {
      const select = typeof target === 'string' ? document.querySelector(target) : target;
      if (!(select instanceof HTMLSelectElement)) return false;
      const normalized = String(value ?? '');
      if (!Array.from(select.options).some((option) => option.value === normalized)) return false;
      select.value = normalized;
      this.sync(select);
      if (emit) select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  }

  window.SW?.register('SWSelect', SWSelect);
  if (window.SW) window.SW.Select = SWSelect;
})();
