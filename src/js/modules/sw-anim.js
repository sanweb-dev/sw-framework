/* SW Framework Anime — Scroll Reveal & Scroll Mount/Unmount
   Atributos: class="reveal-*" · [sw-anime-rev] · [sw-anime-mnt] · [data-sw-scr] · [data-y2-scr]
   ─────────────────────────────────────────────────────────────────────────────
   IMPORTANTE: O observer só é registrado APÓS dois frames de animação para
   garantir que o browser já finalizou o layout. Assim elementos fora da
   viewport nunca disparam no carregamento inicial. */
(function () {
  'use strict';

  class SWAnime {
    static _revObs = null;
    static _mntObs = null;

    /* ── Registra os observers com delay de 2 frames ─────────────────── */
    static initAll(root) {
      const scope = (root && root.querySelectorAll) ? root : document;

      // Espera 2 frames para o browser terminar o layout antes de observar
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {

          // Reveal unidirecional (anima uma vez)
          scope.querySelectorAll('[class*="reveal-"]:not([sw-anime-mnt]):not([sw-scroll-once])').forEach(function (el) {
            if (el._swRev) return;
            el._swRev = true;
            SWAnime._getRevObs().observe(el);
          });

          scope.querySelectorAll('[sw-anime-rev]').forEach(function (el) {
            if (el._swRev) return;
            el._swRev = true;
            SWAnime._getRevObs().observe(el);
          });

          // Scroll-once (anima uma vez, como reveal, mas declarado com atributo)
          scope.querySelectorAll('[sw-scroll-once]').forEach(function (el) {
            if (el._swOnce) return;
            el._swOnce = true;
            SWAnime._getRevObs().observe(el);
          });

          // Mount/unmount bidirecional
          scope.querySelectorAll('[sw-anime-mnt], [y2anime-mnt], [data-sw-scr], [data-y2-scr]').forEach(function (el) {
            if (el._swMnt) return;
            el._swMnt = true;
            SWAnime._getMntObs().observe(el);
          });

        });
      });
    }

    /* ── Observer de reveal (unidirecional, anima 1x) ────────────────── */
    static _getRevObs() {
      if (!SWAnime._revObs) {
        SWAnime._revObs = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            e.target.classList.add('is-revealed');
            SWAnime._revObs.unobserve(e.target);
          });
        }, {
          threshold: 0.1,
          rootMargin: '0px 0px -50px 0px'
        });
      }
      return SWAnime._revObs;
    }

    /* ── Observer de mount/unmount (bidirecional) ────────────────────── */
    static _getMntObs() {
      if (!SWAnime._mntObs) {
        SWAnime._mntObs = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              e.target.classList.add('is-revealed');
            } else {
              e.target.classList.remove('is-revealed');
            }
          });
        }, {
          threshold: 0.05,
          rootMargin: '0px'
        });
      }
      return SWAnime._mntObs;
    }
  }

  window.SWAnime = SWAnime;
  window.Y2Anime = SWAnime;
  if (window.SW && window.SW.register) window.SW.register('SWAnime', SWAnime);
  if (window.SW) window.SW.Anime = SWAnime;

  // Inicia após o DOM pronto
  if (document.readyState !== 'loading') {
    SWAnime.initAll(document);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      SWAnime.initAll(document);
    });
  }
})();
