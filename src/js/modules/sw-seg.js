/* SW Framework Segmented Control — <div class="seg"> com <input type="radio"> + <label>
   ou <div class="seg-it is-act"> — insere um .seg-thumb que desliza até o item ativo. */
(function () {
  'use strict';

  function getActiveItem(seg) {
    const checkedInput = seg.querySelector('input[type="radio"]:checked');
    if (checkedInput) return checkedInput.nextElementSibling;
    return seg.querySelector('.seg-it.is-act');
  }

  function moveThumb(seg, thumb) {
    const active = getActiveItem(seg);
    if (!active) { thumb.style.width = '0'; return; }
    const segRect = seg.getBoundingClientRect();
    const itemRect = active.getBoundingClientRect();
    thumb.style.width = `${itemRect.width}px`;
    thumb.style.transform = `translateX(${itemRect.left - segRect.left}px)`;
  }

  function ensureThumb(seg) {
    let thumb = seg.querySelector(':scope > .seg-thumb');
    if (!thumb) {
      thumb = document.createElement('div');
      thumb.className = 'seg-thumb';
      seg.insertBefore(thumb, seg.firstChild);
    }
    return thumb;
  }

  const SWSeg = {
    initAll(root = document) {
      SW.$('.seg', root).forEach((seg) => {
        const thumb = ensureThumb(seg);
        if (!seg._swSeg) {
          seg._swSeg = true;
          seg.addEventListener('change', () => moveThumb(seg, thumb));
          seg.addEventListener('click', (event) => {
            if (event.target.closest('.seg-it')) moveThumb(seg, thumb);
          });
          window.addEventListener('resize', () => moveThumb(seg, thumb), { passive: true });
        }
        // Sem transição no posicionamento inicial — evita o thumb "deslizando"
        // de x:0 até o item ativo assim que a página carrega.
        thumb.style.transition = 'none';
        moveThumb(seg, thumb);
        requestAnimationFrame(() => { thumb.style.transition = ''; });
      });
    }
  };

  window.SW?.register('SWSeg', SWSeg);
  if (window.SW) window.SW.Seg = SWSeg;
})();
