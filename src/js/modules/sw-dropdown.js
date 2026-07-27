/* SW Framework Dropdown — [sw-dropdown] > .sw-dropdown-tgl + .sw-dropdown-mn */
(function () {
  'use strict';

  const SWDropdown = {
    initAll(root = document) {
      SW.$('[sw-dropdown]', root).forEach((el) => {
        if (el._swDropdown) return;
        el._swDropdown = true;

        const toggle = el.querySelector('.sw-dropdown-tgl');
        const menu = el.querySelector('.sw-dropdown-mn');
        if (!toggle || !menu) return;

        const open = () => { el.classList.add('is-open'); SW.emit(el, 'sw:dropdown:open'); };
        const close = () => { el.classList.remove('is-open'); SW.emit(el, 'sw:dropdown:close'); };

        toggle.addEventListener('click', (event) => {
          event.stopPropagation();
          el.classList.contains('is-open') ? close() : open();
        });
        menu.addEventListener('click', (event) => {
          if (event.target.closest('.sw-dropdown-it:not(.is-dis)')) close();
        });
        document.addEventListener('click', (event) => {
          if (!el.contains(event.target)) close();
        });
        el.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') close();
        });
      });
    },

    open(el) { (typeof el === 'string' ? document.querySelector(el) : el)?.classList.add('is-open'); },
    close(el) { (typeof el === 'string' ? document.querySelector(el) : el)?.classList.remove('is-open'); }
  };

  window.SW?.register('SWDropdown', SWDropdown);
  if (window.SW) window.SW.Dropdown = SWDropdown;
})();
