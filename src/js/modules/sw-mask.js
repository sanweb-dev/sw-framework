/* SW Framework — bounded, formatting-only masks */
(function () {
  'use strict';

  const limits = Object.freeze({ cpf: 11, cnpj: 14, document: 14, phone: 11, cep: 8, date: 8 });

  const joinParts = (digits, sizes, separators) => {
    let cursor = 0;
    let output = '';
    sizes.forEach((size, index) => {
      const part = digits.slice(cursor, cursor + size);
      if (!part) return;
      if (output && separators[index - 1]) output += separators[index - 1];
      output += part;
      cursor += size;
    });
    return output;
  };

  const formatters = Object.freeze({
    cpf: (digits) => joinParts(digits, [3, 3, 3, 2], ['.', '.', '-']),
    cnpj: (digits) => joinParts(digits, [2, 3, 3, 4, 2], ['.', '.', '/', '-']),
    document: (digits) => digits.length <= 11 ? formatters.cpf(digits) : formatters.cnpj(digits),
    phone: (digits) => {
      if (!digits) return '';
      const area = digits.slice(0, 2);
      const middleSize = digits.length > 10 ? 5 : 4;
      const middle = digits.slice(2, 2 + middleSize);
      const end = digits.slice(2 + middleSize);
      return `${digits.length > 2 ? `(${area}) ` : area}${middle}${end ? `-${end}` : ''}`;
    },
    cep: (digits) => joinParts(digits, [5, 3], ['-']),
    date: (digits) => joinParts(digits, [2, 2, 4], ['/', '/'])
  });

  class SWMask {
    static initAll(root = document) {
      SW.$('input[sw-mask]', root).forEach((input) => this.init(input));
    }

    static init(input) {
      if (!(input instanceof HTMLInputElement) || input._swMaskInit) return false;
      const name = input.getAttribute('sw-mask');
      if (!Object.prototype.hasOwnProperty.call(limits, name)) return false;
      input._swMaskInit = true;
      if (!input.hasAttribute('inputmode')) input.inputMode = 'numeric';
      input.addEventListener('input', () => this.apply(input));
      this.apply(input, false);
      return true;
    }

    static apply(input, emit = true) {
      const name = input.getAttribute('sw-mask');
      if (!(input instanceof HTMLInputElement) || !Object.prototype.hasOwnProperty.call(limits, name)) return '';
      const digits = String(input.value || '').replace(/\D/g, '').slice(0, limits[name]);
      input.value = formatters[name](digits);
      input.dataset.swMaskValue = digits;
      if (emit) SW.emit(input, 'sw:mask-input', { mask: name, raw: digits, value: input.value });
      return digits;
    }

    static raw(target) {
      const input = typeof target === 'string' ? document.querySelector(target) : target;
      if (!(input instanceof HTMLInputElement)) return '';
      return this.apply(input, false);
    }

    static set(target, value, { emit = true } = {}) {
      const input = typeof target === 'string' ? document.querySelector(target) : target;
      if (!(input instanceof HTMLInputElement)) return false;
      input.value = String(value ?? '');
      this.apply(input, emit);
      return true;
    }
  }

  window.SW?.register('SWMask', SWMask);
  if (window.SW) window.SW.Mask = SWMask;
})();
