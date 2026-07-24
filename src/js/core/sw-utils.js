/* SW Framework Utils */
(function () {
  'use strict';
  let uidCounter = 0;
  const Utils = {
    uid(prefix = 'sw') { uidCounter += 1; return `${String(prefix).replace(/[^a-z0-9_-]/gi, '') || 'sw'}-${uidCounter}`; },
    reducedMotion() { return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches); },
    throttleFrame(callback) {
      let frame = 0;
      let lastArgs;
      return function throttled(...args) {
        lastArgs = args;
        if (frame) return;
        frame = window.requestAnimationFrame(() => { frame = 0; callback.apply(this, lastArgs); });
      };
    },
    debounce(callback, wait = 150) {
      let timer = 0;
      return function debounced(...args) {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => callback.apply(this, args), Math.max(0, Number(wait) || 0));
      };
    },
    resolve(target, root = document) {
      if (target instanceof Element) return target;
      if (typeof target !== 'string') return null;
      try { return root.querySelector(target); } catch (_) { return null; }
    },
    storage: {
      get(key) { try { return window.localStorage.getItem(key); } catch (_) { return null; } },
      set(key, value) { try { window.localStorage.setItem(key, value); return true; } catch (_) { return false; } }
    }
  };
  window.SW.Utils = Utils;
})();
