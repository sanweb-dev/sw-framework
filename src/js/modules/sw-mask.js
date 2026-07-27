/* SW Framework — input masks: nomes fixos (cpf/cnpj/telefone/cep/data/hora/cartao/dinheiro/valor)
   e padrões por token via sw-mask="custom" sw-mask-mask="##.###.###-#" (# dígito, A letra, * qualquer)
   ou registrados com SWMask.addMask(nome, padrão). */
(function () {
  'use strict';

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

  const moneyFormat = (digits) => {
    if (!digits) return '';
    return digits.replace(/(\d)(\d{2})$/, '$1,$2').replace(/(?=(\d{3})+(?!\d))\B/g, '.');
  };

  // Máscara por padrão de tokens: # dígito, A letra, * qualquer caractere.
  // Literais do padrão (., -, /, espaço...) são inseridos sozinhos conforme o usuário digita.
  const patternFormat = (pattern, raw) => {
    let out = '';
    let ri = 0;
    for (let pi = 0; pi < pattern.length && ri < raw.length; pi += 1) {
      const token = pattern[pi];
      if (token === '#' || token === 'A' || token === '*') {
        while (ri < raw.length) {
          const ch = raw[ri];
          ri += 1;
          const ok = token === '*' || (token === '#' && /[0-9]/.test(ch)) || (token === 'A' && /[a-zA-Z]/.test(ch));
          if (ok) { out += ch; break; }
        }
      } else {
        out += token;
        if (raw[ri] === token) ri += 1;
      }
    }
    return out;
  };

  const limits = { cpf: 11, cnpj: 14, document: 14, phone: 11, telefone: 11, cep: 8, date: 8, data: 8, hora: 4, cartao: 16 };

  const formatters = {};
  formatters.cpf = (digits) => joinParts(digits, [3, 3, 3, 2], ['.', '.', '-']);
  formatters.cnpj = (digits) => joinParts(digits, [2, 3, 3, 4, 2], ['.', '.', '/', '-']);
  formatters.document = (digits) => (digits.length <= 11 ? formatters.cpf(digits) : formatters.cnpj(digits));
  formatters.phone = (digits) => {
    if (!digits) return '';
    const area = digits.slice(0, 2);
    const middleSize = digits.length > 10 ? 5 : 4;
    const middle = digits.slice(2, 2 + middleSize);
    const end = digits.slice(2 + middleSize);
    return `${digits.length > 2 ? `(${area}) ` : area}${middle}${end ? `-${end}` : ''}`;
  };
  formatters.telefone = formatters.phone;
  formatters.cep = (digits) => joinParts(digits, [5, 3], ['-']);
  formatters.date = (digits) => joinParts(digits, [2, 2, 4], ['/', '/']);
  formatters.data = formatters.date;
  formatters.hora = (digits) => joinParts(digits, [2, 2], [':']);
  formatters.cartao = (digits) => joinParts(digits, [4, 4, 4, 4], [' ', ' ', ' ']);
  formatters.valor = (digits) => moneyFormat(digits.slice(0, 15));
  formatters.dinheiro = (digits) => {
    const value = moneyFormat(digits.slice(0, 15));
    return value ? `R$ ${value}` : '';
  };

  const customMasks = {}; // registradas via SWMask.addMask(nome, padrão)

  class SWMask {
    static initAll(root = document) {
      SW.$('input[sw-mask]', root).forEach((input) => this.init(input));
    }

    static init(input) {
      if (!(input instanceof HTMLInputElement) || input._swMaskInit) return false;
      const name = input.getAttribute('sw-mask');
      const pattern = name === 'custom' ? input.getAttribute('sw-mask-mask') : customMasks[name];
      if (!formatters[name] && !pattern) return false;
      input._swMaskInit = true;
      input._swMaskPattern = pattern || null;
      if (!input.hasAttribute('inputmode') && !pattern) input.inputMode = 'numeric';
      input.addEventListener('input', () => this.apply(input));
      this.apply(input, false);
      return true;
    }

    static _digits(input) {
      const name = input.getAttribute('sw-mask');
      const pattern = input._swMaskPattern;
      const raw = String(input.value || '');
      if (pattern) return raw.replace(/[^0-9a-zA-Z]/g, '');
      const limit = limits[name];
      const digits = raw.replace(/\D/g, '');
      return typeof limit === 'number' ? digits.slice(0, limit) : digits;
    }

    static apply(input, emit = true) {
      if (!(input instanceof HTMLInputElement)) return '';
      const name = input.getAttribute('sw-mask');
      const pattern = input._swMaskPattern;
      const digits = this._digits(input);
      const formatted = pattern ? patternFormat(pattern, digits) : (formatters[name] ? formatters[name](digits) : '');
      input.value = formatted;
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

    static addMask(name, pattern) {
      customMasks[name] = pattern;
    }
  }

  window.SW?.register('SWMask', SWMask);
  if (window.SW) window.SW.Mask = SWMask;
  window.SWMask = SWMask;
})();
