/* SW Framework Tooltip — [sw-tooltip="Texto"] sw-tooltip-pos/-delay/-html/-clr/-follow */
(function () {
  'use strict';

  const posMap = { bot: 'bottom', lft: 'left', rgt: 'right', top: 'top' };
  let tipEl = null;
  let timer = null;

  function ensure() {
    if (tipEl) return;
    tipEl = document.createElement('div');
    tipEl.className = 'sw-tooltip';
    document.body.appendChild(tipEl);
  }

  function place(el, tip, pos) {
    const r = el.getBoundingClientRect();
    const tr = tip.getBoundingClientRect();
    const sy = window.scrollY;
    let top;
    let left;
    switch (pos) {
      case 'bottom': top = r.bottom + sy + 8; left = r.left + r.width / 2 - tr.width / 2; break;
      case 'left': top = r.top + sy + r.height / 2 - tr.height / 2; left = r.left - tr.width - 8; break;
      case 'right': top = r.top + sy + r.height / 2 - tr.height / 2; left = r.right + 8; break;
      default: top = r.top + sy - tr.height - 8; left = r.left + r.width / 2 - tr.width / 2;
    }
    tip.style.top = `${top}px`;
    tip.style.left = `${Math.max(4, Math.min(left, window.innerWidth - tr.width - 4))}px`;
  }

  const SWTooltip = {
    initAll(root = document) {
      ensure();
      SW.$('[sw-tooltip]', root).forEach((el) => {
        if (el._swTooltip) return;
        el._swTooltip = true;
        const text = el.getAttribute('sw-tooltip');
        const posRaw = el.getAttribute('sw-tooltip-pos') || 'top';
        const pos = posMap[posRaw] || posRaw;
        const delay = parseInt(el.getAttribute('sw-tooltip-delay'), 10) || 250;
        const html = el.getAttribute('sw-tooltip-html') === 'true';
        const clr = el.getAttribute('sw-tooltip-clr') || '';
        const follow = el.getAttribute('sw-tooltip-follow') === 'true';
        let lastX = 0;
        let lastY = 0;

        const placeCursor = (tip) => {
          const tr = tip.getBoundingClientRect();
          tip.style.top = `${lastY + window.scrollY - tr.height - 12}px`;
          tip.style.left = `${Math.max(4, Math.min(lastX + window.scrollX - tr.width / 2, window.innerWidth - tr.width - 4))}px`;
        };

        const show = () => {
          window.clearTimeout(timer);
          timer = window.setTimeout(() => {
            if (html) tipEl.innerHTML = text; else tipEl.textContent = text;
            tipEl.className = `sw-tooltip is-${pos}${clr ? ` is-${clr}` : ''}`;
            document.body.appendChild(tipEl);
            follow ? placeCursor(tipEl) : place(el, tipEl, pos);
            tipEl.classList.add('is-vis');
          }, delay);
        };
        const hide = () => {
          window.clearTimeout(timer);
          tipEl?.classList.remove('is-vis');
        };
        const onMove = (event) => {
          lastX = event.clientX;
          lastY = event.clientY;
          if (!tipEl?.classList.contains('is-vis')) return;
          placeCursor(tipEl);
        };

        el.addEventListener('mouseenter', (event) => { lastX = event.clientX; lastY = event.clientY; show(); });
        el.addEventListener('mouseleave', hide);
        el.addEventListener('focus', show);
        el.addEventListener('blur', hide);
        if (follow) el.addEventListener('mousemove', onMove);
      });
    },

    create(el, opts = {}) {
      el.setAttribute('sw-tooltip', opts.text || '');
      if (opts.pos !== undefined) el.setAttribute('sw-tooltip-pos', opts.pos);
      if (opts.color !== undefined) el.setAttribute('sw-tooltip-clr', opts.color);
      if (opts.html !== undefined) el.setAttribute('sw-tooltip-html', opts.html ? 'true' : 'false');
      if (opts.delay !== undefined) el.setAttribute('sw-tooltip-delay', opts.delay);
      el._swTooltip = false;
      SWTooltip.initAll(el.parentElement || document);
    },

    destroy(el) {
      el._swTooltip = false;
      el.removeAttribute('sw-tooltip');
    },

    update(el, text) {
      el.setAttribute('sw-tooltip', text);
      el._swTooltip = false;
      SWTooltip.initAll(el.parentElement || document);
    }
  };

  window.SW?.register('SWTooltip', SWTooltip);
  if (window.SW) window.SW.Tooltip = SWTooltip;
})();
