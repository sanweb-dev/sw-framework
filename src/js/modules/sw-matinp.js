/* SW Framework Material Input — <div class="fld-mat"><input sw-matinp sw-matinp-label="Nome" sw-matinp-req ...></div> */
(function () {
  'use strict';

  const masks = {
    telefone: (v) => applyPattern(v.replace(/\D/g, ''), v.replace(/\D/g, '').length <= 10 ? '(##) ####-####' : '(##) #####-####'),
    cpf: (v) => applyPattern(v.replace(/\D/g, ''), '###.###.###-##'),
    cnpj: (v) => applyPattern(v.replace(/\D/g, ''), '##.###.###/####-##'),
    cep: (v) => applyPattern(v.replace(/\D/g, ''), '#####-###'),
    data: (v) => applyPattern(v.replace(/\D/g, ''), '##/##/####'),
    hora: (v) => applyPattern(v.replace(/\D/g, ''), '##:##'),
    cartao: (v) => applyPattern(v.replace(/\D/g, ''), '#### #### #### ####')
  };

  function applyPattern(digits, pattern) {
    let i = 0;
    return pattern.split('').map((c) => (c === '#' ? (digits[i++] ?? '') : (i < digits.length ? c : ''))).join('');
  }

  const rules = {
    req: (v, _p, el) => v.trim() !== '' || (el.getAttribute('sw-matinp-msg-req') || 'Campo obrigatório.'),
    email: (v, _p, el) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || (el.getAttribute('sw-matinp-msg-email') || 'E-mail inválido.'),
    url: (v, _p, el) => !v || /^https?:\/\/.+/.test(v) || (el.getAttribute('sw-matinp-msg-url') || 'URL inválida.'),
    minlen: (v, p, el) => !v || v.length >= parseInt(p, 10) || (el.getAttribute('sw-matinp-msg-minlen') || `Mínimo ${p} caracteres.`),
    maxlen: (v, p, el) => !v || v.length <= parseInt(p, 10) || (el.getAttribute('sw-matinp-msg-maxlen') || `Máximo ${p} caracteres.`),
    min: (v, p, el) => !v || parseFloat(v) >= parseFloat(p) || (el.getAttribute('sw-matinp-msg-min') || `Valor mínimo: ${p}.`),
    max: (v, p, el) => !v || parseFloat(v) <= parseFloat(p) || (el.getAttribute('sw-matinp-msg-max') || `Valor máximo: ${p}.`),
    match: (v, p, el) => {
      const other = document.querySelector(p);
      return !other || v === other.value || (el.getAttribute('sw-matinp-msg-match') || 'Os valores não coincidem.');
    },
    regex: (v, p, el) => {
      try { return !v || new RegExp(p).test(v) || (el.getAttribute('sw-matinp-msg-regex') || 'Formato inválido.'); }
      catch (_) { return true; }
    }
  };

  class SWMatinpInst {
    constructor(el) {
      this._inp = el;
      this._wrap = el.closest('.fld-mat') || el.parentElement;
      this._mask = el.getAttribute('sw-matinp-mask') || null;
      this._validateOn = el.getAttribute('sw-matinp-validate') || 'blur';
      el._swMatinp = this;
      this._build();
      this._bindEvents();
    }

    _build() {
      const el = this._inp;
      const wrap = this._wrap;
      if (!el.placeholder) el.placeholder = ' ';

      let lbl = wrap.querySelector('.fld-mat-lbl');
      if (!lbl && el.getAttribute('sw-matinp-label')) {
        lbl = document.createElement('label');
        lbl.className = 'fld-mat-lbl';
        lbl.textContent = el.getAttribute('sw-matinp-label');
        if (el.id) lbl.setAttribute('for', el.id);
        el.insertAdjacentElement('afterend', lbl);
      }

      const hintText = el.getAttribute('sw-matinp-hint');
      if (hintText) {
        let hint = wrap.querySelector('.fld-mat-hint');
        if (!hint) {
          hint = document.createElement('span');
          hint.className = 'fld-mat-hint';
          wrap.appendChild(hint);
        }
        hint.textContent = hintText;
        this._hint = hint;
      }

      let msg = wrap.querySelector('.fld-mat-msg');
      if (!msg) {
        msg = document.createElement('span');
        msg.className = 'fld-mat-msg';
        msg.setAttribute('aria-live', 'polite');
        wrap.appendChild(msg);
      }
      this._msg = msg;
    }

    _bindEvents() {
      const el = this._inp;
      if (this._mask && masks[this._mask]) {
        el.addEventListener('input', () => {
          const pos = el.selectionStart;
          el.value = masks[this._mask](el.value);
          try { el.setSelectionRange(pos, pos); } catch (_) { /* posição fora do range em alguns navegadores */ }
          SW.emit(el, 'sw:matinp:change', { value: el.value });
        });
      }

      if (this._validateOn === 'input') {
        el.addEventListener('input', () => { this.validate(); SW.emit(el, 'sw:matinp:change', { value: el.value }); });
      } else if (this._validateOn === 'change') {
        el.addEventListener('change', () => this.validate());
      } else {
        el.addEventListener('blur', () => this.validate());
        el.addEventListener('input', () => {
          if (this._wrap.classList.contains('is-err')) this.validate();
          SW.emit(el, 'sw:matinp:change', { value: el.value });
        });
      }
    }

    validate() {
      const el = this._inp;
      const val = el.value;
      let error = '';
      for (const [rule, fn] of Object.entries(rules)) {
        if (!el.hasAttribute(`sw-matinp-${rule}`)) continue;
        const param = el.getAttribute(`sw-matinp-${rule}`) || '';
        const res = fn(val, param, el);
        if (res !== true) { error = res; break; }
      }
      if (error) {
        this.setError(error);
        SW.emit(el, 'sw:matinp:invalid', { value: val, error });
        return false;
      }
      this.clearError();
      if (val !== '') {
        this._wrap.classList.add('is-ok');
        SW.emit(el, 'sw:matinp:valid', { value: val });
      }
      return true;
    }

    setError(msg) {
      this._wrap.classList.add('is-err');
      this._wrap.classList.remove('is-ok');
      if (this._msg) this._msg.textContent = msg;
      if (this._hint) this._hint.style.display = 'none';
    }

    clearError() {
      this._wrap.classList.remove('is-err');
      if (this._msg) this._msg.textContent = '';
      if (this._hint) this._hint.style.display = '';
    }

    getValue() { return this._inp.value; }
    setValue(v) { this._inp.value = v; this.validate(); }
    reset() { this._inp.value = ''; this.clearError(); this._wrap.classList.remove('is-ok'); }
  }

  class SWMatinp {
    static initAll(root = document) {
      SW.$('[sw-matinp]', root).forEach((el) => {
        if (el._swMatinp) return;
        new SWMatinpInst(el);
      });
    }

    static addRule(name, fn) { rules[name] = fn; }
  }

  window.SW?.register('SWMatinp', SWMatinp);
  if (window.SW) window.SW.Matinp = SWMatinp;
})();
