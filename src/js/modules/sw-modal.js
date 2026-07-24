/* SW Framework Modal */
(function () {
  'use strict';
  const focusable = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  class SWModal {
    static initAll(root = document) {
      SW.$('[sw-modal-open], [sw-modal]', root).forEach((trigger) => {
        if (trigger._swModalInit) return;
        trigger._swModalInit = true;
        trigger.addEventListener('click', (event) => {
          const selector = trigger.getAttribute('sw-modal-open') || trigger.getAttribute('sw-modal');
          if (!selector?.startsWith('#')) return;
          event.preventDefault();
          SWModal.show(selector, trigger);
        });
      });
      SW.$('.sw-modal', root).forEach((modal) => {
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-hidden', modal.classList.contains('is-active') ? 'false' : 'true');
        if (modal._swModalCloseInit) return;
        modal._swModalCloseInit = true;
        modal.addEventListener('click', (event) => {
          if (event.target === modal || event.target.closest('[sw-modal-close]')) SWModal.hide(modal);
        });
      });
    }

    static show(target, trigger = document.activeElement) {
      const modal = typeof target === 'string' ? document.querySelector(target) : target;
      if (!modal || modal.classList.contains('is-active')) return false;
      modal._swPreviousFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
      modal.classList.add('is-active');
      modal.setAttribute('aria-hidden', 'false');
      SW.Overlay.lock();
      modal._swKeydown = (event) => {
        if (event.key === 'Escape') SWModal.hide(modal);
        if (event.key === 'Tab') SWModal.trapFocus(modal, event);
      };
      window.addEventListener('keydown', modal._swKeydown);
      window.requestAnimationFrame(() => (modal.querySelector('[autofocus], [sw-modal-close], ' + focusable) || modal).focus({ preventScroll: true }));
      if (!modal.hasAttribute('tabindex')) modal.setAttribute('tabindex', '-1');
      SW.emit(modal, 'sw:modal:open');
      return true;
    }

    static hide(target) {
      const modal = typeof target === 'string' ? document.querySelector(target) : target;
      if (!modal?.classList.contains('is-active')) return false;
      modal.classList.remove('is-active');
      modal.setAttribute('aria-hidden', 'true');
      window.removeEventListener('keydown', modal._swKeydown);
      SW.Overlay.unlock();
      modal._swPreviousFocus?.focus?.({ preventScroll: true });
      SW.emit(modal, 'sw:modal:close');
      return true;
    }

    static trapFocus(modal, event) {
      const items = SW.$(focusable, modal).filter((element) => !element.hidden && element.getClientRects().length);
      if (!items.length) { event.preventDefault(); modal.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }

  window.SW?.register('SWModal', SWModal);
  if (window.SW) window.SW.Modal = SWModal;
})();
