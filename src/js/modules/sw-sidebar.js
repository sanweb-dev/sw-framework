/* SW Framework Sidebar — <aside sw-sidebar sw-sidebar-mode="fixed|toggle|collapse|hover">
   Botão externo: [sw-sidebar-open="#id"] · Overlay: [sw-sidebar-ovl]
   Submenu: <a sw-sidebar-sub>...</a> seguido de <div sw-sidebar-sub-items>...</div> */
(function () {
  'use strict';

  function initSubmenus(sdb) {
    SW.$('[sw-sidebar-sub]', sdb).forEach((trigger) => {
      if (trigger._swSidebarSub) return;
      trigger._swSidebarSub = true;
      const items = trigger.nextElementSibling;
      if (!items || !items.hasAttribute('sw-sidebar-sub-items')) return;

      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        if (sdb.hasAttribute('col')) return;
        const isOpen = items.hasAttribute('open');
        if (isOpen) { items.removeAttribute('open'); trigger.removeAttribute('open'); }
        else { items.setAttribute('open', ''); trigger.setAttribute('open', ''); }
        SW.emit(sdb, 'sw:sidebar:submenu', { trigger, items, open: !isOpen });
      });
    });
  }

  // Clique num item comum (sem submenu) marca ele como ativo dentro do mesmo [sw-sidebar-mn]
  function initActiveState(sdb) {
    SW.$('[sw-sidebar-mn]', sdb).forEach((mn) => {
      if (mn._swSidebarAct) return;
      mn._swSidebarAct = true;
      mn.addEventListener('click', (event) => {
        const it = event.target.closest('[sw-sidebar-it]');
        if (!it || it.hasAttribute('sw-sidebar-sub') || !mn.contains(it)) return;
        SW.$('[sw-sidebar-it][act]', mn).forEach((el) => el.removeAttribute('act'));
        it.setAttribute('act', '');
      });
    });
  }

  const SWSidebar = {
    initAll(root = document) {
      SW.$('[sw-sidebar]', root).forEach((el) => {
        if (el._swSidebar) return;
        el._swSidebar = true;

        const mode = el.getAttribute('sw-sidebar-mode') || 'toggle';
        const start = el.getAttribute('sw-sidebar-start') || 'open';

        if (mode === 'fixed') { initSubmenus(el); initActiveState(el); return; }

        if (mode === 'toggle') {
          const overlay = document.querySelector('[sw-sidebar-ovl]');
          if (overlay && !overlay._swSidebarOvl) {
            overlay._swSidebarOvl = true;
            overlay.addEventListener('click', () => SWSidebar.close(el));
          }
          document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !el.hasAttribute('hid')) SWSidebar.close(el);
          });
        }

        if (mode === 'collapse') {
          start === 'icons' ? el.setAttribute('col', '') : el.removeAttribute('col');
          const toggle = () => {
            el.hasAttribute('col') ? el.removeAttribute('col') : el.setAttribute('col', '');
            SW.emit(el, 'sw:sidebar:toggle');
          };
          // Botão dedicado (se existir) ou o próprio ícone do cabeçalho — qualquer um alterna
          el.querySelector('[sw-sidebar-tgl]')?.addEventListener('click', toggle);
          const icon = el.querySelector('[sw-sidebar-hdr-ico]');
          if (icon) {
            icon.style.cursor = 'pointer';
            icon.addEventListener('click', toggle);
          }
        }

        if (mode === 'hover') {
          el.setAttribute('col', '');
          el.addEventListener('mouseenter', () => { el.removeAttribute('col'); SW.emit(el, 'sw:sidebar:open'); });
          el.addEventListener('mouseleave', () => { el.setAttribute('col', ''); SW.emit(el, 'sw:sidebar:close'); });
        }

        initSubmenus(el);
        initActiveState(el);
      });

      SW.$('[sw-sidebar-open]', root).forEach((btn) => {
        if (btn._swSidebarBtn) return;
        btn._swSidebarBtn = true;
        btn.addEventListener('click', () => {
          const sdb = document.querySelector(btn.getAttribute('sw-sidebar-open'));
          if (!sdb) return;
          sdb.hasAttribute('hid') ? SWSidebar.open(sdb) : SWSidebar.close(sdb);
        });
      });
    },

    open(sdb) {
      sdb = typeof sdb === 'string' ? document.querySelector(sdb) : sdb;
      const overlay = document.querySelector('[sw-sidebar-ovl]');
      sdb?.removeAttribute('hid');
      overlay?.setAttribute('vis', '');
      SW.emit(sdb, 'sw:sidebar:open');
    },

    close(sdb) {
      sdb = typeof sdb === 'string' ? document.querySelector(sdb) : sdb;
      const overlay = document.querySelector('[sw-sidebar-ovl]');
      sdb?.setAttribute('hid', '');
      overlay?.removeAttribute('vis');
      SW.emit(sdb, 'sw:sidebar:close');
    }
  };

  window.SW?.register('SWSidebar', SWSidebar);
  if (window.SW) window.SW.Sidebar = SWSidebar;
})();
