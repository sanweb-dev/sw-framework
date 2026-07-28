/* SW Framework Anime — Scroll Reveal & Scroll Mount/Unmount
   Atributos: class="reveal-*" · [sw-anime-rev] · [sw-anime-mnt] · [data-sw-scr] · [y2anime-rev] · [y2anime-mnt] */
(function () {
  'use strict';

  class SWAnime {
    static _revObs = null;
    static _scrObs = null;

    static initAll(root = document) {
      const scope = root.querySelectorAll ? root : document;

      // Reveal unidirecional: adiciona is-revealed e para de observar
      scope.querySelectorAll('[class*="reveal-"], [sw-anime-rev], [y2anime-rev]').forEach((el) => {
        if (el._swRev || el._y2Rev) return;
        el._swRev = true;
        el._y2Rev = true;
        SWAnime._getRevObs().observe(el);
      });

      // Scroll mount/unmount: bidirecional
      scope.querySelectorAll('[sw-anime-mnt], [y2anime-mnt], [data-sw-scr], [data-y2-scr]').forEach((el) => {
        if (el._swMnt || el._y2Mnt) return;
        el._swMnt = true;
        el._y2Mnt = true;
        SWAnime._getScrObs().observe(el);
      });
    }

    static _getRevObs() {
      if (!SWAnime._revObs) {
        SWAnime._revObs = new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            e.target.classList.add('is-revealed', 'is-visible');
            SWAnime._revObs.unobserve(e.target);
          });
        }, { threshold: 0.01, rootMargin: '0px 0px 50px 0px' });
      }
      return SWAnime._revObs;
    }

    static _getScrObs() {
      if (!SWAnime._scrObs) {
        SWAnime._scrObs = new IntersectionObserver((entries) => {
          entries.forEach((e) => e.target.classList.toggle('is-revealed', e.isIntersecting));
        }, { threshold: 0.01, rootMargin: '0px 0px 50px 0px' });
      }
      return SWAnime._scrObs;
    }
  }

  window.SWAnime = SWAnime;
  window.Y2Anime = SWAnime;
  if (window.SW?.register) window.SW.register('SWAnime', SWAnime);
  if (window.SW) window.SW.Anime = SWAnime;

  if (document.readyState !== 'loading') {
    SWAnime.initAll(document);
  } else {
    document.addEventListener('DOMContentLoaded', () => SWAnime.initAll(document));
  }
})();
