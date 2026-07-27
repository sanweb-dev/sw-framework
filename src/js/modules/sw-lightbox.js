/* SW Framework Lightbox — <a sw-lightbox href="foto.jpg" sw-lightbox-grp="galeria" sw-lightbox-cap="Legenda"><img src="thumb.jpg"></a> */
(function () {
  'use strict';

  class SWLight {
    static _ovl = null;
    static _items = [];
    static _cur = 0;
    static _timer = null;

    static _norm(el) {
      return {
        src: el.getAttribute('href') || el.getAttribute('sw-lightbox-src') || '',
        cap: el.getAttribute('sw-lightbox-cap') || el.title || '',
        zoom: el.hasAttribute('sw-lightbox-zoom'),
        auto: parseInt(el.getAttribute('sw-lightbox-auto'), 10) || 0,
        count: el.getAttribute('sw-lightbox-count') !== 'false'
      };
    }

    static initAll(root = document) {
      SWLight._ensure();
      SW.$('[sw-lightbox]', root).forEach((el) => {
        if (el._swLightInit) return;
        el._swLightInit = true;
        el.addEventListener('click', (event) => {
          event.preventDefault();
          const grp = el.getAttribute('sw-lightbox-grp');
          const els = grp ? SW.$(`[sw-lightbox][sw-lightbox-grp="${grp}"]`) : [el];
          SWLight._items = els.map(SWLight._norm);
          SWLight._cur = Math.max(0, els.indexOf(el));
          SWLight._show(SWLight._cur);
        });
      });
    }

    static _ensure() {
      if (SWLight._ovl) return;
      const ovl = document.createElement('div');
      ovl.className = 'sw-lightbox-ovl';
      ovl.innerHTML = `
        <div class="sw-lightbox-wrap"><img class="sw-lightbox-img" src="" alt=""></div>
        <div class="sw-lightbox-ldr"></div>
        <button type="button" class="sw-lightbox-cls" aria-label="Fechar"></button>
        <button type="button" class="sw-lightbox-prv" aria-label="Anterior"><i class="swi swi-chevron-left"></i></button>
        <button type="button" class="sw-lightbox-nxt" aria-label="Próximo"><i class="swi swi-chevron-right"></i></button>
        <div class="sw-lightbox-cap"></div>
        <div class="sw-lightbox-cnt"></div>`;
      document.body.appendChild(ovl);
      SWLight._ovl = ovl;

      ovl.querySelector('.sw-lightbox-cls').addEventListener('click', SWLight.close);
      ovl.querySelector('.sw-lightbox-prv').addEventListener('click', () => SWLight._step(-1));
      ovl.querySelector('.sw-lightbox-nxt').addEventListener('click', () => SWLight._step(1));
      ovl.addEventListener('click', (event) => { if (event.target === ovl) SWLight.close(); });

      ovl.querySelector('.sw-lightbox-img').addEventListener('click', () => {
        if (SWLight._items[SWLight._cur]?.zoom) ovl.querySelector('.sw-lightbox-wrap').classList.toggle('is-zoom');
      });

      let startX = 0;
      ovl.addEventListener('touchstart', (event) => { startX = event.touches[0].clientX; }, { passive: true });
      ovl.addEventListener('touchend', (event) => {
        const diff = startX - event.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) SWLight._step(diff > 0 ? 1 : -1);
      });

      document.addEventListener('keydown', (event) => {
        if (!SWLight._ovl?.classList.contains('is-open')) return;
        if (event.key === 'Escape') SWLight.close();
        if (event.key === 'ArrowLeft') SWLight._step(-1);
        if (event.key === 'ArrowRight') SWLight._step(1);
      });
    }

    static _show(idx) {
      const item = SWLight._items[idx];
      if (!item) return;

      const img = SWLight._ovl.querySelector('.sw-lightbox-img');
      const wrap = SWLight._ovl.querySelector('.sw-lightbox-wrap');
      const loader = SWLight._ovl.querySelector('.sw-lightbox-ldr');
      wrap.classList.remove('is-zoom');
      wrap.classList.toggle('has-zoom', !!item.zoom);
      img.style.opacity = '0';
      loader.classList.add('is-vis');
      img.onload = () => { img.style.opacity = '1'; loader.classList.remove('is-vis'); };
      img.onerror = () => { loader.classList.remove('is-vis'); };
      img.src = item.src;

      SWLight._ovl.querySelector('.sw-lightbox-cap').textContent = item.cap;

      const showNav = SWLight._items.length > 1;
      SWLight._ovl.querySelector('.sw-lightbox-cnt').textContent = showNav && item.count ? `${idx + 1} / ${SWLight._items.length}` : '';
      SWLight._ovl.querySelector('.sw-lightbox-prv').style.display = showNav ? '' : 'none';
      SWLight._ovl.querySelector('.sw-lightbox-nxt').style.display = showNav ? '' : 'none';
      SWLight._ovl.classList.add('is-open');
      document.body.style.overflow = 'hidden';

      SW.emit(document, 'sw:lightbox:open', { index: idx, src: item.src });

      SWLight._timerStop();
      if (item.auto > 0 && showNav) SWLight._timer = window.setInterval(() => SWLight._step(1), item.auto);
    }

    static _timerStop() {
      if (SWLight._timer) { window.clearInterval(SWLight._timer); SWLight._timer = null; }
    }

    static _step(dir) {
      SWLight._cur = (SWLight._cur + dir + SWLight._items.length) % SWLight._items.length;
      SWLight._show(SWLight._cur);
      SW.emit(document, 'sw:lightbox:nav', { index: SWLight._cur });
    }

    static close() {
      SWLight._timerStop();
      SWLight._ovl?.classList.remove('is-open');
      document.body.style.overflow = '';
      SW.emit(document, 'sw:lightbox:close', {});
    }

    static next() { SWLight._step(1); }
    static prev() { SWLight._step(-1); }

    static open(src, opts = {}) {
      const cap = typeof opts === 'string' ? opts : (opts.caption || '');
      SWLight._ensure();
      SWLight._items = [{ src, cap, zoom: opts.zoom || false, auto: 0, count: true }];
      SWLight._cur = 0;
      SWLight._show(0);
    }
  }

  window.SW?.register('SWLight', SWLight);
  if (window.SW) window.SW.Light = SWLight;
})();
