/* SW Framework Panel */
(function () {
  'use strict';
  class SWPanel {
    static initAll(root = document) {
      SW.$('[sw-panel-open]', root).forEach((trigger) => {
        if (trigger._swPanelInit) return;
        trigger._swPanelInit = true;
        trigger.addEventListener('click', (event) => {
          const selector = trigger.getAttribute('sw-panel-open');
          if (!selector?.startsWith('#')) return;
          event.preventDefault();
          SWPanel.show(selector, trigger);
        });
      });
      SW.$('.sw-panel', root).forEach((panel) => {
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-hidden', panel.classList.contains('is-active') ? 'false' : 'true');
        if (panel._swPanelCloseInit) return;
        panel._swPanelCloseInit = true;
        panel.addEventListener('click', (event) => {
          if (event.target.closest('[sw-panel-close]')) SWPanel.hide(panel);
        });
      });
    }
    static show(target, trigger = document.activeElement) {
      const panel = typeof target === 'string' ? document.querySelector(target) : target;
      if (!panel || panel.classList.contains('is-active')) return false;
      panel._swPreviousFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
      panel.classList.add('is-active');
      panel.setAttribute('aria-hidden', 'false');
      if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
      panel._swKeydown = (event) => { if (event.key === 'Escape') SWPanel.hide(panel); };
      window.addEventListener('keydown', panel._swKeydown);
      SW.Overlay.lock();
      window.requestAnimationFrame(() => (panel.querySelector('[autofocus], [sw-panel-close], button, input, select, textarea, a[href]') || panel).focus({ preventScroll: true }));
      SW.emit(panel, 'sw:panel:open');
      return true;
    }
    static hide(target) {
      const panel = typeof target === 'string' ? document.querySelector(target) : target;
      if (!panel?.classList.contains('is-active')) return false;
      panel.classList.remove('is-active');
      panel.setAttribute('aria-hidden', 'true');
      window.removeEventListener('keydown', panel._swKeydown);
      SW.Overlay.unlock();
      panel._swPreviousFocus?.focus?.({ preventScroll: true });
      SW.emit(panel, 'sw:panel:close');
      return true;
    }
  }
  window.SW?.register('SWPanel', SWPanel);
  if (window.SW) window.SW.Panel = SWPanel;
})();
