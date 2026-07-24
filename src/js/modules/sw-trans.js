/* SW Framework Trans — native transitions and scroll reveal */
(function () {
  'use strict';
  const morphNamePattern = /^[a-z][a-z0-9_-]{0,47}$/;

  class SWTrans {
    static initAll(root = document) {
      this.initMorphs();
      this.initOverlay(root);
      this.initReveals(root);
    }

    static initReveals(root = document) {
      const elements = SW.$('[sw-scr]', root).filter((element) => !element._swTransInit);
      if (!elements.length) return;
      if (SW.Utils.reducedMotion() || !('IntersectionObserver' in window)) {
        elements.forEach((element) => { element._swTransInit = true; element.classList.add('is-revealed'); });
        return;
      }
      if (!this.observer) {
        this.observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-revealed');
            SW.emit(entry.target, 'sw:trans:reveal');
            this.observer.unobserve(entry.target);
          });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      }
      elements.forEach((element) => { element._swTransInit = true; this.observer.observe(element); });
    }

    static initMorphs() {
      const groups = new Map();
      SW.$('[sw-morph]').forEach((element) => {
        const name = (element.getAttribute('sw-morph') || '').trim().toLowerCase();
        element.style.removeProperty('view-transition-name');
        if (!morphNamePattern.test(name)) {
          SW.emit(element, 'sw:trans:morph-invalid', { name, reason: 'invalid' });
          return;
        }
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name).push(element);
      });
      groups.forEach((elements, name) => {
        if (elements.length !== 1) {
          elements.forEach((element) => SW.emit(element, 'sw:trans:morph-invalid', { name, reason: 'duplicate' }));
          return;
        }
        elements[0].style.viewTransitionName = `sw-${name}`;
      });
    }

    static initOverlay(root = document) {
      const candidate = root.matches?.('[sw-trans-overlay]') ? root : root.querySelector?.('[sw-trans-overlay]');
      if (candidate && (!this.overlayElement || !this.overlayElement.isConnected)) this.overlayElement = candidate;
      if (!this.overlayElement) return;
      this.overlayElement.setAttribute('role', this.overlayElement.getAttribute('role') || 'status');
      this.overlayElement.setAttribute('aria-live', this.overlayElement.getAttribute('aria-live') || 'polite');
      if (!this.overlayElement.hasAttribute('aria-hidden')) this.overlayElement.setAttribute('aria-hidden', 'true');
      if (this.overlayElement.getAttribute('aria-hidden') !== 'false') this.overlayElement.hidden = true;
    }

    static ensureOverlay() {
      if (this.overlayElement?.isConnected) return this.overlayElement;
      const existing = document.querySelector('[sw-trans-overlay]');
      if (existing) {
        this.overlayElement = existing;
        this.initOverlay(existing);
        return existing;
      }
      const overlay = document.createElement('div');
      const inner = document.createElement('div');
      const indicator = document.createElement('span');
      const message = document.createElement('span');
      overlay.setAttribute('sw-trans-overlay', '');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.hidden = true;
      inner.className = 'sw-trans-overlay__inner';
      indicator.className = 'sw-trans-overlay__indicator';
      indicator.setAttribute('aria-hidden', 'true');
      message.setAttribute('sw-trans-message', '');
      message.textContent = 'Carregando';
      inner.append(indicator, message);
      overlay.append(inner);
      document.body.append(overlay);
      this.overlayElement = overlay;
      this.initOverlay(overlay);
      return overlay;
    }

    static show(message = 'Carregando') {
      const overlay = this.ensureOverlay();
      window.clearTimeout(this.overlayTimer);
      this.overlayDepth = (this.overlayDepth || 0) + 1;
      const messageElement = overlay.querySelector('[sw-trans-message]');
      if (messageElement) messageElement.textContent = String(message || 'Carregando').slice(0, 160);
      overlay.hidden = false;
      overlay.setAttribute('aria-hidden', 'false');
      document.documentElement.setAttribute('aria-busy', 'true');
      SW.emit(overlay, 'sw:trans:overlay-show');
      return overlay;
    }

    static hide({ force = false } = {}) {
      const overlay = this.overlayElement;
      if (!overlay) return;
      this.overlayDepth = force ? 0 : Math.max(0, (this.overlayDepth || 0) - 1);
      if (this.overlayDepth > 0) return;
      overlay.setAttribute('aria-hidden', 'true');
      document.documentElement.removeAttribute('aria-busy');
      SW.emit(overlay, 'sw:trans:overlay-hide');
      const finish = () => { if ((this.overlayDepth || 0) === 0) overlay.hidden = true; };
      if (SW.Utils.reducedMotion()) finish();
      else this.overlayTimer = window.setTimeout(finish, 220);
    }

    static async during(task, { message = 'Carregando' } = {}) {
      if (typeof task !== 'function') throw new TypeError('SW.Trans.during requer uma função.');
      this.show(message);
      try { return await task(); }
      finally { this.hide(); }
    }

    static run(update, { skip = false } = {}) {
      if (typeof update !== 'function') return null;
      if (skip || SW.Utils.reducedMotion() || !document.startViewTransition) { update(); return null; }
      return document.startViewTransition(update);
    }
  }
  SWTrans.overlayDepth = 0;
  window.SW?.register('SWTrans', SWTrans);
  if (window.SW) window.SW.Trans = SWTrans;
})();
