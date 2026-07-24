/* SW Framework Alert */
(function () {
  'use strict';

  class SWAlert {
    static initAll() {
      if (document.querySelector('#sw-toast-container')) return;
      const container = document.createElement('div');
      container.id = 'sw-toast-container';
      container.className = 'sw-toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'false');
      document.body.appendChild(container);
    }

    static show(msg, type = 'info', duration = 3500) {
      this.initAll();
      const normalizedType = ['ok', 'err', 'ale', 'info'].includes(type) ? type : 'info';
      const timeout = Math.min(30000, Math.max(1000, Number(duration) || 3500));
      const toast = document.createElement('div');
      toast.className = `sw-toast sw-badge sw-badge-${normalizedType === 'ok' ? 'suc' : normalizedType === 'err' ? 'err' : normalizedType === 'ale' ? 'ale' : 'pri'}`;
      toast.setAttribute('role', normalizedType === 'err' ? 'alert' : 'status');

      const icon = document.createElement('span');
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = ({ ok: '✅', err: '❌', ale: '⚠️', info: 'ℹ️' })[normalizedType];
      const message = document.createElement('span');
      message.textContent = String(msg ?? '');
      toast.append(icon, message);
      document.querySelector('#sw-toast-container').appendChild(toast);

      window.setTimeout(() => {
        toast.classList.add('is-leaving');
        window.setTimeout(() => toast.remove(), 300);
      }, timeout);
      return toast;
    }

    static ok(msg, duration) { return this.show(msg, 'ok', duration); }
    static err(msg, duration) { return this.show(msg, 'err', duration); }
    static ale(msg, duration) { return this.show(msg, 'ale', duration); }
    static info(msg, duration) { return this.show(msg, 'info', duration); }
    static confirm(msg) { return Promise.resolve(window.confirm(String(msg ?? ''))); }
  }

  window.SW?.register('SWAlert', SWAlert);
  if (window.SW) window.SW.Alert = SWAlert;
})();
