/* SW Framework Textarea auto-resize — <textarea sw-textarea sw-textarea-min="60" sw-textarea-max="240"> */
(function () {
  'use strict';

  const SWTextarea = {
    initAll(root = document) {
      SW.$('[sw-textarea]', root).forEach((el) => {
        if (el._swTextarea) return;
        el._swTextarea = true;

        const min = parseInt(el.getAttribute('sw-textarea-min'), 10) || parseInt(el.style.minHeight, 10) || 60;
        const max = parseInt(el.getAttribute('sw-textarea-max'), 10) || 0;
        el.style.overflowY = 'hidden';
        el.style.resize = 'none';
        el.style.minHeight = `${min}px`;

        const resize = () => {
          el.style.height = 'auto';
          const cs = window.getComputedStyle(el);
          const borderBox = cs.boxSizing === 'border-box';
          const borderTop = parseFloat(cs.borderTopWidth) || 0;
          const borderBottom = parseFloat(cs.borderBottomWidth) || 0;
          const borderExtra = borderBox ? (borderTop + borderBottom) : 0;

          let h = el.scrollHeight + borderExtra;
          if (h < min) h = min;
          if (max && h > max) {
            h = max;
            el.style.overflowY = 'auto';
          } else {
            el.style.overflowY = 'hidden';
          }
          el.style.height = `${h}px`;
        };

        el.addEventListener('input', resize);
        el.addEventListener('change', resize);
        window.addEventListener('resize', resize);
        setTimeout(resize, 0);
        resize();
      });
    }
  };

  window.SW?.register('SWTextarea', SWTextarea);
  if (window.SW) window.SW.Textarea = SWTextarea;
})();
