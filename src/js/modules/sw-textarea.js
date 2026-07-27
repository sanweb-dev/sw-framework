/* SW Framework Textarea auto-resize — <textarea sw-textarea sw-textarea-min sw-textarea-max> */
(function () {
  'use strict';

  const SWTextarea = {
    initAll(root = document) {
      SW.$('[sw-textarea]', root).forEach((el) => {
        if (el._swTextarea) return;
        el._swTextarea = true;
        const min = parseInt(el.getAttribute('sw-textarea-min'), 10) || parseInt(el.style.minHeight, 10) || 60;
        const max = parseInt(el.getAttribute('sw-textarea-max'), 10) || 0;
        el.style.overflow = 'hidden';
        el.style.resize = 'none';
        el.style.minHeight = `${min}px`;

        const resize = () => {
          el.style.height = 'auto';
          let h = el.scrollHeight;
          if (max && h > max) { h = max; el.style.overflow = 'auto'; }
          else el.style.overflow = 'hidden';
          el.style.height = `${h}px`;
        };
        el.addEventListener('input', resize);
        resize();
      });
    }
  };

  window.SW?.register('SWTextarea', SWTextarea);
  if (window.SW) window.SW.Textarea = SWTextarea;
})();
