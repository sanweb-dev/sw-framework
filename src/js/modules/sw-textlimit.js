/* SW Framework Textlimit — <textarea sw-textlimit sw-textlimit-max="200" sw-textlimit-txt="{count}/{max}" sw-textlimit-align="center"> */
(function () {
  'use strict';

  const SWTextlimit = {
    initAll(root = document) {
      SW.$('[sw-textlimit]', root).forEach((el) => {
        if (el._swTextlimit) return;
        el._swTextlimit = true;
        const max = parseInt(el.getAttribute('sw-textlimit-max'), 10) || parseInt(el.getAttribute('maxlength'), 10) || 150;
        const tpl = el.getAttribute('sw-textlimit-txt') || '{count}/{max}';
        const align = el.getAttribute('sw-textlimit-align') || (el.hasAttribute('sw-textlimit-center') ? 'center' : '');
        el.setAttribute('maxlength', max);

        if (el.hasAttribute('sw-textlimit-center')) {
          el.style.textAlign = 'center';
        }

        const counter = document.createElement('span');
        counter.className = 'sw-textlimit-cnt';
        if (align) {
          counter.style.textAlign = align;
          counter.classList.add(`is-${align}`);
        }
        el.insertAdjacentElement('afterend', counter);

        const update = () => {
          const n = el.value.length;
          const rem = max - n;
          counter.textContent = tpl.replace('{count}', n).replace('{max}', max).replace('{remaining}', rem);
          counter.classList.toggle('is-ale', rem >= 0 && rem <= Math.ceil(max * 0.2));
          counter.classList.toggle('is-err', rem < 0);
        };
        el.addEventListener('input', update);
        update();
      });
    }
  };

  window.SW?.register('SWTextlimit', SWTextlimit);
  if (window.SW) window.SW.Textlimit = SWTextlimit;
})();
