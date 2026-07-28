/* SW Framework Rating — Avaliação por Estrelas
   Uso read-only:  <div sw-rating="4.5"></div>
   Uso interativo: <div sw-rating class="is-int"></div>
   Com formulário: <div sw-rating class="is-int"><input type="hidden" name="nota" value="0"></div> */
(function () {
  'use strict';

  class SWRatingInst {
    constructor(el) {
      this.el = el;
      this.max = parseInt(el.getAttribute('sw-rating-max') || el.getAttribute('swrating-max') || el.getAttribute('y2rating-max') || 5, 10);
      const initialVal = el.getAttribute('sw-rating-val') || el.getAttribute('swrating-val') || el.getAttribute('y2rating-val') || 0;
      this.value = parseFloat(initialVal);
      this._inp = el.querySelector('input[type="hidden"]');
      this._render();
    }

    _render(hov = -1) {
      const isY2 = this.el.hasAttribute('y2rating') || this.el.classList.contains('y2rating');
      const strCls = isY2 ? 'y2rating-str' : 'sw-rating-str';
      const html = Array.from({ length: this.max }, (_, i) => {
        const active = hov >= 0 ? i < hov : i < this.value;
        return `<span class="${strCls}${active ? ' is-on' : ''}" data-v="${i + 1}" role="button" tabindex="0" aria-label="Nota ${i + 1}">★</span>`;
      }).join('');

      this.el.innerHTML = html;
      if (this._inp) {
        this.el.appendChild(this._inp);
      }

      const selector = `.${strCls}`;
      this.el.querySelectorAll(selector).forEach((star) => {
        const v = parseInt(star.getAttribute('data-v'), 10);
        star.addEventListener('mouseenter', () => this._render(v));
        star.addEventListener('mouseleave', () => this._render());
        star.addEventListener('click', () => this._set(v === this.value ? 0 : v));
        star.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this._set(v === this.value ? 0 : v);
          }
        });
      });
    }

    _set(val) {
      this.value = val;
      if (this._inp) this._inp.value = val;
      this._render();

      const detail = { value: val };
      if (window.SW?.emit) {
        window.SW.emit(this.el, 'sw:rating:change', detail);
        window.SW.emit(this.el, 'swrating:change', detail);
      }
      this.el.dispatchEvent(new CustomEvent('sw:rating:change', { detail, bubbles: true }));
      this.el.dispatchEvent(new CustomEvent('yd:y2rating:change', { detail, bubbles: true }));
    }

    getValue() { return this.value; }
    setValue(v) { this._set(Number(v) || 0); }
  }

  class SWRating {
    static initAll(root = document) {
      const els = (root.querySelectorAll ? root : document).querySelectorAll('[sw-rating], [swrating], [y2rating]');
      els.forEach((el) => {
        if (el._swRating || el._y2Rat) return;

        const raw = el.getAttribute('sw-rating') ?? el.getAttribute('swrating') ?? el.getAttribute('y2rating');
        const max = parseInt(el.getAttribute('sw-rating-max') || el.getAttribute('swrating-max') || el.getAttribute('y2rating-max') || 5, 10);

        if (raw !== '' && raw !== null && !Number.isNaN(parseFloat(raw))) {
          el._swRating = true;
          el._swRat = true;
          SWRating._renderStatic(el, parseFloat(raw), max);
        } else {
          const inst = new SWRatingInst(el);
          el._swRating = inst;
          el._swRat = inst;
          el._y2Rat = inst;
        }
      });
    }

    static _renderStatic(el, val, max) {
      const isY2 = el.hasAttribute('y2rating') || el.classList.contains('y2rating');
      const strCls = isY2 ? 'y2rating-str' : 'sw-rating-str';
      el.innerHTML = Array.from({ length: max }, (_, i) => {
        const full = i + 1 <= Math.floor(val);
        const half = !full && i + 0.5 <= val;
        const cls = full ? ' is-on' : half ? ' is-half' : '';
        return `<span class="${strCls}${cls}" aria-hidden="true">★</span>`;
      }).join('');
    }
  }

  window.SWRating = SWRating;
  window.SWRat = SWRating;
  window.Y2Rating = SWRating;
  if (window.SW?.register) window.SW.register('SWRating', SWRating);
  if (window.SW) {
    window.SW.Rating = SWRating;
    window.SW.Rat = SWRating;
  }
})();
