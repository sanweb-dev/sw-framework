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

  /* Page Transition Engine (sw-trans / y2transi) */
  class SWTransi {
    static _ovl = null;
    static _busy = false;

    static initAll(root = document) {
      SWTransi._ensure();
      const scope = (root && root.querySelectorAll) ? root : document;
      scope.querySelectorAll('[sw-trans], [sw-trans-effect], [y2transi], [Y2Transi]').forEach((el) => {
        if (el._swPgt) return;
        el._swPgt = true;
        el.addEventListener('click', (e) => {
          const href = el.getAttribute('href');
          if (!href || href.startsWith('#') || href.startsWith('javascript') || el.target === '_blank') return;
          e.preventDefault();
          if (SWTransi._busy) return;
          SWTransi._busy = true;
          const effect = el.getAttribute('sw-trans-effect') || el.getAttribute('y2transi-effect') || 'slide';
          const dur = parseInt(el.getAttribute('sw-trans-dur') || el.getAttribute('y2transi-dur') || 400);
          const color = el.getAttribute('sw-trans-color') || el.getAttribute('y2transi-color');
          if (color) SWTransi._ovl.style.background = color;
          SWTransi._in(effect, dur, () => { window.location.href = href; });
        });
      });

      if (!window._swTransiLoaded) {
        window._swTransiLoaded = true;
        const eff = sessionStorage.getItem('sw_pgt_effect') || sessionStorage.getItem('y2_pgt_effect');
        if (eff) {
          SWTransi._ensure();
          const dur = parseInt(sessionStorage.getItem('sw_pgt_dur') || sessionStorage.getItem('y2_pgt_dur') || 400);
          sessionStorage.removeItem('sw_pgt_effect');
          sessionStorage.removeItem('y2_pgt_effect');
          sessionStorage.removeItem('sw_pgt_dur');
          sessionStorage.removeItem('y2_pgt_dur');
          SWTransi._out(eff, dur);
        }
      }
    }

    static _ensure() {
      if (SWTransi._ovl) return;
      const ovl = document.createElement('div');
      ovl.className = 'sw-trans-ovl y2transi-ovl';
      ovl.innerHTML = `<svg class="sw-trans-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path class="sw-trans-svg-path" d="M 0 100 V 100 Q 50 100 100 100 V 100 Z" fill="var(--sw-pri, #3b82f6)"></path></svg>`;
      if (sessionStorage.getItem('sw_pgt_effect') || sessionStorage.getItem('y2_pgt_effect')) {
        ovl.style.cssText = 'opacity:1;pointer-events:none';
      }
      document.body.prepend(ovl);
      SWTransi._ovl = ovl;
    }

    static _in(effect, dur, cb) {
      const ovl = SWTransi._ovl;
      sessionStorage.setItem('sw_pgt_effect', effect);
      sessionStorage.setItem('sw_pgt_dur', dur);

      if (effect === 'curtain' || effect === 'wave') {
        ovl.style.cssText = '';
        ovl.className = `sw-trans-ovl y2transi-ovl is-${effect} is-in`;
        SWTransi._animateCurtainIn(dur, cb);
      } else {
        ovl.style.animationDuration = `${dur}ms`;
        ovl.className = `sw-trans-ovl y2transi-ovl is-${effect} is-in`;
        setTimeout(cb, dur);
      }
    }

    static _out(effect, dur) {
      const ovl = SWTransi._ovl;
      if (effect === 'curtain' || effect === 'wave') {
        ovl.className = `sw-trans-ovl y2transi-ovl is-${effect} is-out`;
        SWTransi._animateCurtainOut(dur, () => {
          ovl.className = 'sw-trans-ovl y2transi-ovl';
          SWTransi._busy = false;
        });
      } else {
        ovl.style.cssText = '';
        ovl.style.animationDuration = `${dur}ms`;
        ovl.className = `sw-trans-ovl y2transi-ovl is-${effect} is-out`;
        setTimeout(() => {
          ovl.className = 'sw-trans-ovl y2transi-ovl';
          SWTransi._busy = false;
        }, dur);
      }
    }

    static _animateCurtainIn(dur, cb) {
      const path = SWTransi._ovl?.querySelector('.sw-trans-svg-path');
      if (!path) { setTimeout(cb, dur); return; }
      const start = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - start) / dur);
        const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        if (ease < 0.5) {
          const progress = ease * 2;
          const valY = 100 - (progress * 100);
          const curveY = 100 - (progress * 165);
          path.setAttribute('d', `M 0 100 V ${valY} Q 50 ${curveY} 100 ${valY} V 100 Z`);
        } else {
          const progress = (ease - 0.5) * 2;
          const valY = 50 - (progress * 50);
          const curveY = -65 + (progress * 65);
          path.setAttribute('d', `M 0 100 V ${valY} Q 50 ${curveY} 100 ${valY} V 100 Z`);
        }
        if (p < 1) requestAnimationFrame(tick);
        else {
          path.setAttribute('d', 'M 0 100 V 0 Q 50 0 100 0 V 100 Z');
          cb();
        }
      }
      requestAnimationFrame(tick);
    }

    static _animateCurtainOut(dur, cb) {
      const path = SWTransi._ovl?.querySelector('.sw-trans-svg-path');
      if (!path) { setTimeout(cb, dur); return; }
      const start = performance.now();
      function tick(now) {
        const p = Math.min(1, (now - start) / dur);
        const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        if (ease < 0.5) {
          const progress = ease * 2;
          const curveY = progress * 165;
          path.setAttribute('d', `M 0 0 V 0 Q 50 ${curveY} 100 0 V ${100 - progress * 100} Z`);
        } else {
          const progress = (ease - 0.5) * 2;
          const curveY = 165 - (progress * 165);
          path.setAttribute('d', `M 0 0 V 0 Q 50 ${curveY} 100 0 V ${100 - (50 + progress * 50)} Z`);
        }
        if (p < 1) requestAnimationFrame(tick);
        else {
          path.setAttribute('d', 'M 0 0 V 0 Q 50 0 100 0 V 0 Z');
          cb();
        }
      }
      requestAnimationFrame(tick);
    }
  }

  window.SWTransi = SWTransi;
  window.Y2Transi = SWTransi;
  if (window.SW && window.SW.register) window.SW.register('SWTransi', SWTransi);

  if (document.readyState !== 'loading') {
    SWTransi.initAll(document);
  } else {
    document.addEventListener('DOMContentLoaded', () => SWTransi.initAll(document));
  }
})();

