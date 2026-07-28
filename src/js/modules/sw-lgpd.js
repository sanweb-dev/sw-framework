/* SW Framework LGPD/Cookies — <div sw-lgpd sw-lgpd-msg sw-lgpd-modelo> ou SWLgpd.init({...}) / SW.Lgpd.init({...}) */
(function () {
  'use strict';

  const SWLgpd = {
    initAll(root = document) {
      SW.$('[sw-lgpd]', root).forEach((el) => {
        if (el._swLgpd) return;
        el._swLgpd = true;
        SWLgpd.init({
          msg: el.getAttribute('sw-lgpd-msg') || 'Usamos cookies para melhorar sua experiência.',
          accept: el.getAttribute('sw-lgpd-ok') || 'Aceitar',
          reject: el.getAttribute('sw-lgpd-nao') || null,
          link: el.getAttribute('sw-lgpd-link') || '',
          modelo: parseInt(el.getAttribute('sw-lgpd-modelo'), 10) || 1,
          days: parseInt(el.getAttribute('sw-lgpd-dias'), 10) || 365,
          key: el.getAttribute('sw-lgpd-key') || 'sw_lgpd'
        });
        el.remove();
      });
    },

    init(opts = {}) {
      const cfg = {
        msg: 'Usamos cookies para melhorar sua experiência.',
        accept: 'Aceitar',
        reject: null,
        link: '',
        linkTxt: 'Saiba mais',
        modelo: 1,
        days: 365,
        key: 'sw_lgpd',
        onAccept: null,
        onReject: null,
        ...opts
      };

      if (window.localStorage.getItem(cfg.key)) return;
      document.querySelectorAll('[sw-lgpd], .sw-lgpd').forEach((el) => el.remove());

      const bar = document.createElement('div');
      bar._swLgpd = true;
      bar.setAttribute('sw-lgpd', '');
      bar.className = 'sw-lgpd';
      if (cfg.modelo > 1) bar.classList.add(`is-m${cfg.modelo}`);

      const linkHtml = cfg.link ? ` <a href="${cfg.link}" target="_blank" rel="noopener">${cfg.linkTxt}</a>` : '';
      const icon = '<svg class="sw-lgpd-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>';
      const rejectBtn = cfg.reject ? `<button type="button" sw-btn class="sw-btn-out sw-lgpd-rej">${cfg.reject}</button>` : '';
      bar.innerHTML = `${icon}<p class="sw-lgpd-txt">${cfg.msg}${linkHtml}</p><div class="sw-lgpd-act">${rejectBtn}<button type="button" sw-btn class="sw-btn-pri sw-lgpd-ok">${cfg.accept}</button></div>`;
      document.body.appendChild(bar);
      void bar.offsetHeight;
      window.requestAnimationFrame(() => bar.classList.add('is-vis'));

      const close = (accepted) => {
        bar.classList.remove('is-vis');
        window.setTimeout(() => bar.remove(), 450);
        if (accepted) {
          const exp = new Date();
          exp.setDate(exp.getDate() + cfg.days);
          window.localStorage.setItem(cfg.key, exp.toISOString());
          cfg.onAccept?.();
        } else {
          cfg.onReject?.();
        }
      };
      bar.querySelector('.sw-lgpd-ok')?.addEventListener('click', () => close(true));
      bar.querySelector('.sw-lgpd-rej')?.addEventListener('click', () => close(false));
    },

    clear(key = 'sw_lgpd') { window.localStorage.removeItem(key); }
  };

  window.SW?.register('SWLgpd', SWLgpd);
  if (window.SW) window.SW.Lgpd = SWLgpd;
  window.SWLgpd = SWLgpd;
})();
