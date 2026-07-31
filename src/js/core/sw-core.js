/* SW Framework Core — Sandro Web Solutions */
(function () {
  'use strict';

  if (window.SW) return;

  const blockedTags = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'META', 'BASE']);
  const unsafeUrl = /^\s*(?:javascript|vbscript|data):/i;
  let reinitFrame = 0;
  let scrollLocks = 0;
  let savedBodyOverflow = '';

  const SW = {
    version: '1.0.0',
    _modules: new Map(),

    register(name, module) {
      if (!name || !module || this._modules.has(name)) return false;
      this._modules.set(name, module);
      if (document.readyState !== 'loading' && typeof module.initAll === 'function') {
        module.initAll(document);
      }
      return true;
    },

    reinit(root = document) {
      const safeRoot = root && typeof root.querySelectorAll === 'function' ? root : document;
      this._modules.forEach((module) => {
        if (typeof module.initAll === 'function') module.initAll(safeRoot);
      });
      this.emit(safeRoot, 'sw:reinit', { root: safeRoot });
    },

    scheduleReinit(root = document) {
      if (reinitFrame) return;
      reinitFrame = window.requestAnimationFrame(() => {
        reinitFrame = 0;
        this.reinit(root);
      });
    },

    emit(element, eventName, detail = {}) {
      const target = typeof element === 'string' ? document.querySelector(element) : (element || document);
      if (!target || !eventName) return false;
      return target.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true, cancelable: true }));
    },

    config({ hue, font, theme } = {}) {
      if (hue !== undefined) {
        const normalizedHue = Number(hue);
        if (Number.isFinite(normalizedHue)) {
          document.documentElement.style.setProperty('--sw-h-pri', String(Math.min(360, Math.max(0, normalizedHue))));
        }
      }
      if (font !== undefined && typeof font === 'string' && font.length <= 200 && !/[;{}]/.test(font)) {
        document.documentElement.style.setProperty('--sw-f-san', font.trim());
      }
      if (theme !== undefined) this.Day?.set(theme);
    },

    $(selector, root = document) {
      if (typeof selector !== 'string') return [];
      try { return Array.from((root || document).querySelectorAll(selector)); } catch (_) { return []; }
    }
  };

  SW.html = {
    sanitize(html) {
      const template = document.createElement('template');
      template.innerHTML = String(html ?? '');
      template.content.querySelectorAll('*').forEach((element) => {
        if (blockedTags.has(element.tagName)) {
          element.remove();
          return;
        }
        Array.from(element.attributes).forEach((attribute) => {
          const name = attribute.name.toLowerCase();
          if (name.startsWith('on') || name === 'srcdoc' || ((name === 'href' || name === 'src' || name === 'action') && unsafeUrl.test(attribute.value))) {
            element.removeAttribute(attribute.name);
          }
        });
      });
      return template.content;
    },

    set(target, html, { trusted = false } = {}) {
      if (!target) return;
      target.replaceChildren();
      if (trusted) {
        const template = document.createElement('template');
        template.innerHTML = String(html ?? '');
        target.appendChild(template.content.cloneNode(true));
        return;
      }
      target.appendChild(this.sanitize(html).cloneNode(true));
    }
  };

  SW.Overlay = {
    lock() {
      if (scrollLocks === 0) {
        savedBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
      scrollLocks += 1;
    },
    unlock() {
      scrollLocks = Math.max(0, scrollLocks - 1);
      if (scrollLocks === 0) document.body.style.overflow = savedBodyOverflow;
    }
  };

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => Array.from(mutation.addedNodes).some((node) => node.nodeType === Node.ELEMENT_NODE))) {
      SW.scheduleReinit(document.body);
    }
  });

  function boot() {
    SW.Day?.init();
    SW.reinit(document);
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    SW.emit(document, 'sw:ready', { version: SW.version });
  }

  document.documentElement.classList.add('sw-js');
  window.SW = SW;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
