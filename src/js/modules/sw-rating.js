/* SW Framework Rating — [sw-rating="4.5"] só leitura · [sw-rating class="is-int"] interativo, sw-rating-max */
(function () {
  'use strict';

  class SWRatingInst {
    constructor(el) {
      this.el = el;
      this.max = parseInt(el.getAttribute('sw-rating-max'), 10) || 5;
      this.value = parseFloat(el.getAttribute('sw-rating-val')) || 0;
      this._inp = el.querySelector('input[type="hidden"]');
      this._render();
    }

    _render(hov = -1) {
      this.el.innerHTML = Array.from({ length: this.max }, (_, i) => {
        const active = hov >= 0 ? i < hov : i < this.value;
        return `<span class="sw-rating-str${active ? ' is-on' : ''}" data-v="${i + 1}" role="button" tabindex="0" aria-label="Nota ${i + 1}">★</span>`;
      }).join('');
      this.el.querySelectorAll('.sw-rating-str').forEach((star) => {
        const v = parseInt(star.getAttribute('data-v'), 10);
        star.addEventListener('mouseenter', () => this._render(v));
        star.addEventListener('mouseleave', () => this._render());
        star.addEventListener('click', () => this._set(v));
        star.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') this._set(v); });
      });
    }

    _set(val) {
      this.value = val;
      if (this._inp) this._inp.value = val;
      this._render();
      SW.emit(this.el, 'sw:rating:change', { value: val });
    }

    getValue() { return this.value; }
    setValue(v) { this._set(Number(v)); }
  }

  class SWRating {
    static initAll(root = document) {
      SW.$('[sw-rating]', root).forEach((el) => {
        if (el._swRating) return;
        const raw = el.getAttribute('sw-rating');
        const max = parseInt(el.getAttribute('sw-rating-max'), 10) || 5;
        if (raw !== '' && raw !== null && !Number.isNaN(parseFloat(raw))) {
          el._swRating = true;
          SWRating._renderStatic(el, parseFloat(raw), max);
        } else {
          el._swRating = new SWRatingInst(el);
        }
      });
    }

    static _renderStatic(el, val, max) {
      el.innerHTML = Array.from({ length: max }, (_, i) => {
        const full = i + 1 <= Math.floor(val);
        const half = !full && i + 0.5 < val;
        const cls = full ? ' is-on' : half ? ' is-half' : '';
        return `<span class="sw-rating-str${cls}" aria-hidden="true">★</span>`;
      }).join('');
    }
  }

  window.SW?.register('SWRating', SWRating);
  if (window.SW) window.SW.Rating = SWRating;
})();
