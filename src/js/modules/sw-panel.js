/* SW Framework Panel */
(function () {
  'use strict';

  // Overlay compartilhado — um só elemento reaproveitado por todos os painéis
  // (só um painel fica ativo por vez na prática). Criado sob demanda, igual ao
  // padrão já usado pelo drawer mobile do sw-navbar.
  function getOverlay() {
    let ovl = document.querySelector('.sw-panel-ovl');
    if (!ovl) {
      ovl = document.createElement('div');
      ovl.className = 'sw-panel-ovl';
      document.body.appendChild(ovl);
      ovl.addEventListener('click', () => {
        const active = document.querySelector('.sw-panel.is-active');
        if (active) SWPanel.hide(active);
      });
    }
    return ovl;
  }

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
      panel._swOutsideClick = (event) => {
        if (!panel.contains(event.target) && !trigger?.contains?.(event.target)) SWPanel.hide(panel);
      };
      window.setTimeout(() => document.addEventListener('click', panel._swOutsideClick), 0);
      getOverlay().classList.add('is-active');
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
      document.removeEventListener('click', panel._swOutsideClick);
      document.querySelector('.sw-panel-ovl')?.classList.remove('is-active');
      SW.Overlay.unlock();
      panel._swPreviousFocus?.focus?.({ preventScroll: true });
      SW.emit(panel, 'sw:panel:close');
      return true;
    }
  }
  window.SW?.register('SWPanel', SWPanel);
  if (window.SW) window.SW.Panel = SWPanel;
})();
