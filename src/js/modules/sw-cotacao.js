/* SW Framework Cotação — <div sw-cotacao sw-cotacao-pares="USD-BRL,EUR-BRL" sw-cotacao-tipo="c" sw-cotacao-mode="cards|table" sw-cotacao-auto="30000">
   Usa a API pública da AwesomeAPI (awesomeapi.com.br), sem token. */
(function () {
  'use strict';

  class SWCotacaoInst {
    constructor(el) {
      this.el = el;
      this.pares = (el.getAttribute('sw-cotacao-pares') || 'USD-BRL,EUR-BRL').split(',').map((p) => p.trim());
      this.tipo = el.getAttribute('sw-cotacao-tipo') || 'c';
      this.mode = el.getAttribute('sw-cotacao-mode') || 'cards';
      this.auto = parseInt(el.getAttribute('sw-cotacao-auto'), 10) || 0;
      this._fetch();
      if (this.auto > 0) window.setInterval(() => this._fetch(), this.auto);
    }

    _fetch() {
      const pairs = this.pares.join(',');
      fetch(`https://economia.awesomeapi.com.br/last/${pairs}`)
        .then((r) => r.json())
        .then((data) => this._render(data))
        .catch(() => { this.el.innerHTML = '<p class="sw-text-mut">Cotação indisponível.</p>'; });
    }

    _render(data) {
      const vals = Object.values(data);
      if (this.mode === 'table') {
        const rows = vals.map((v) => {
          const pct = parseFloat(v.pctChange || 0);
          const cls = pct >= 0 ? 'is-up' : 'is-dwn';
          const sign = pct >= 0 ? '▲' : '▼';
          const bid = parseFloat(v.bid || 0);
          const ask = parseFloat(v.ask || 0);
          const high = parseFloat(v.high || 0);
          const low = parseFloat(v.low || 0);
          const dec = bid < 1 ? 6 : bid < 10 ? 4 : 2;
          return `<tr><td class="sw-cotacao-tcod">${v.code}/${v.codein}</td><td class="sw-cotacao-tval">R$ ${bid.toFixed(dec)}</td><td class="sw-cotacao-tval">R$ ${ask.toFixed(dec)}</td><td class="sw-cotacao-tpct ${cls}">${sign} ${Math.abs(pct).toFixed(2)}%</td><td class="sw-cotacao-tval">R$ ${high.toFixed(dec)}</td><td class="sw-cotacao-tval">R$ ${low.toFixed(dec)}</td></tr>`;
        }).join('');
        this.el.innerHTML = `<table class="sw-cotacao-table"><thead><tr><th>Par</th><th>Compra</th><th>Venda</th><th>Variação</th><th>Máx 24h</th><th>Mín 24h</th></tr></thead><tbody>${rows}</tbody></table>`;
      } else {
        const items = vals.map((v) => {
          const val = parseFloat(this.tipo === 'c' ? v.bid : v.ask);
          const pct = parseFloat(v.pctChange || 0);
          const cls = pct >= 0 ? 'is-up' : 'is-dwn';
          const sign = pct >= 0 ? '▲' : '▼';
          return `<div class="sw-cotacao-it"><span class="sw-cotacao-par">${v.code}/${v.codein}</span><span class="sw-cotacao-val ${cls}">R$ ${val.toFixed(4)}</span><span class="sw-cotacao-sub ${cls}">${sign} ${Math.abs(pct).toFixed(2)}%</span></div>`;
        }).join('');
        this.el.innerHTML = `<div class="sw-cotacao-wrap">${items}</div>`;
      }
    }
  }

  class SWCotacao {
    static initAll(root = document) {
      SW.$('[sw-cotacao]', root).forEach((el) => {
        if (el._swCotacao) return;
        el._swCotacao = new SWCotacaoInst(el);
      });
    }
  }

  window.SW?.register('SWCotacao', SWCotacao);
  if (window.SW) window.SW.Cotacao = SWCotacao;
})();
