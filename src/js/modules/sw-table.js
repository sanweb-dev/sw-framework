/* SW Framework Table — DataTables-like interactive table */
(function () {
  'use strict';

  class SWTable {
    static initAll(root = document) {
      SW.$('[sw-table]', root).forEach(el => {
        if (el._swTab) return;
        el._swTab = true;
        new SWTableInst(el);
      });
    }
    static reload(el) { el._swTabInst?.reload(); }
    static search(el, query) { el._swTabInst?.search(query); }
    static export(el, fmt) { el._swTabInst?._export(fmt); }

    /**
     * SWTable.fromData(el, cols, rows, opts?)
     * Popula (ou re-popula) uma tabela com dados JS puros.
     */
    static fromData(el, cols, rows, opts = {}) {
      const tbl = typeof el === 'string' ? document.querySelector(el) : el;
      if (!tbl) return null;

      const colDefs = cols.map(c => typeof c === 'string'
        ? { label: c, field: null, nosort: false, novis: false }
        : { label: c.label ?? String(c), field: c.field ?? null, nosort: !!c.nosort, novis: !!c.novis }
      );

      let thead = tbl.querySelector('thead');
      if (!thead) { thead = document.createElement('thead'); tbl.insertBefore(thead, tbl.firstChild); }
      thead.innerHTML = '<tr>' + colDefs.map(c =>
        '<th' + (c.nosort ? ' sw-table-nosort' : '') + (c.novis ? ' sw-table-novis' : '') + '>' + c.label + '</th>'
      ).join('') + '</tr>';

      let tbody = tbl.querySelector('tbody');
      if (!tbody) { tbody = document.createElement('tbody'); tbl.appendChild(tbody); }
      tbody.innerHTML = rows.map(row => {
        const cells = Array.isArray(row)
          ? row.map(v => `<td>${v ?? ''}</td>`).join('')
          : colDefs.map(c => `<td>${c.field != null ? (row[c.field] ?? '') : ''}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

      if (tbl._swTabInst) {
        const inst = tbl._swTabInst;
        inst._fromTable(tbl);
        inst.cur = 1;
        inst.query = '';
        const inp = inst.outer?.querySelector('.tbl-srch-inp');
        if (inp) inp.value = '';
        inst._filter();
        return inst;
      }

      if (!tbl.hasAttribute('sw-table')) tbl.setAttribute('sw-table', '');
      Object.entries(opts).forEach(([k, v]) => {
        if (v === false || v === undefined) return;
        tbl.setAttribute(`sw-table-${k}`, v === true ? '' : String(v));
      });
      tbl._swTab = true;
      return new SWTableInst(tbl);
    }
  }

  class SWTableInst {
    constructor(el) {
      this.el = el;
      this.per = parseInt(el.getAttribute('sw-table-per') || 10, 10);
      this.perOpts = (el.getAttribute('sw-table-per-opts') || '10,25,50,100').split(',').map(Number);
      this.doSearch = el.getAttribute('sw-table-search') !== 'false';
      this.doSort = el.getAttribute('sw-table-sort') !== 'false';
      this.doStripe = el.getAttribute('sw-table-stripe') !== 'false';
      this.doSelect = el.hasAttribute('sw-table-select');
      this.doColvis = el.hasAttribute('sw-table-colvis');
      this.doState = el.hasAttribute('sw-table-state');
      this.exports = (el.getAttribute('sw-table-export') || '').split(',').map(s => s.trim()).filter(Boolean);
      this.url = el.getAttribute('sw-table-url');
      this.cur = 1;
      this.sortCol = -1;
      this.sortDir = 'asc';
      this.query = '';
      this._rows = [];
      this._filtered = [];
      this._hidden = new Set();
      this._selected = new Set();
      this._colDefs = [];
      this._stKey = `swtab_${location.pathname}_${el.id || el.className.split(' ')[0] || 'tbl'}`;

      el._swTabInst = this;

      if (this.doState) this._loadState();
      this._buildShell();

      if (this.url) {
        this._buildCtrl();
        this._buildFoot();
        this._loadAjax();
      } else {
        this._fromTable(el);
        this._buildCtrl();
        this._buildFoot();
        this._filter();
      }
    }

    _fromTable(tbl) {
      const ths = Array.from(tbl.querySelectorAll('thead th'));
      this._colDefs = ths.map(th => ({
        label: th.textContent.trim(),
        nosort: th.hasAttribute('sw-table-nosort'),
        novis: th.hasAttribute('sw-table-novis'),
      }));
      this._rows = Array.from(tbl.querySelectorAll('tbody tr')).map(tr =>
        Array.from(tr.querySelectorAll('td')).map(td => ({ html: td.innerHTML, text: td.textContent.trim() }))
      );
      this._filtered = [...this._rows];
      tbl.querySelector('tbody').innerHTML = '';
    }

    _buildShell() {
      const outer = document.createElement('div');
      outer.className = 'tbl-outer';
      this.el.parentNode.insertBefore(outer, this.el);
      this.outer = outer;

      const scroll = document.createElement('div');
      scroll.className = 'tbl-scroll';
      outer.appendChild(scroll);
      scroll.appendChild(this.el);
      this.scroll = scroll;

      this.el.classList.add('tbl-tbl');
      if (this.doStripe) this.el.classList.add('tbl-stripe');
    }

    _buildCtrl() {
      const ctrl = document.createElement('div');
      ctrl.className = 'tbl-ctrl';
      this.outer.insertBefore(ctrl, this.scroll);

      const ctrlL = document.createElement('div');
      ctrlL.className = 'tbl-ctrl-l';
      ctrl.appendChild(ctrlL);

      const perWrap = document.createElement('div');
      perWrap.className = 'tbl-per';
      perWrap.innerHTML = '<label class="tbl-per-lbl">Exibir <select class="tbl-per-sel">' +
        this.perOpts.map(v => '<option value="' + v + '"' + (v === this.per ? ' selected' : '') + '>' + v + '</option>').join('') +
        '</select> por página</label>';
      perWrap.querySelector('.tbl-per-sel').addEventListener('change', e => {
        this.per = parseInt(e.target.value, 10);
        this.cur = 1;
        this.url ? this._loadAjax() : this._filter();
        if (this.doState) this._saveState();
      });
      ctrlL.appendChild(perWrap);

      if (this.exports.length) {
        const _expIco = {
          csv: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
          copy: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
        };
        const _expTip = { csv: 'Exportar CSV', copy: 'Copiar para área de transferência' };
        const expDiv = document.createElement('div');
        expDiv.className = 'tbl-exp';
        this.exports.forEach(fmt => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'tbl-exp-btn';
          btn.title = _expTip[fmt] || fmt;
          btn.innerHTML = _expIco[fmt] || fmt.toUpperCase();
          btn.addEventListener('click', () => this._export(fmt));
          expDiv.appendChild(btn);
        });
        ctrlL.appendChild(expDiv);
      }

      if (this.doColvis) {
        const colvisDiv = document.createElement('div');
        colvisDiv.className = 'tbl-colvis';
        const cvBtn = document.createElement('button');
        cvBtn.type = 'button';
        cvBtn.className = 'tbl-colvis-btn';
        cvBtn.title = 'Visibilidade de colunas';
        cvBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
        const drop = document.createElement('div');
        drop.className = 'tbl-colvis-drop';
        this._colDefs.forEach((col, i) => {
          if (col.novis) return;
          const lbl = document.createElement('label');
          lbl.className = 'tbl-colvis-it';
          const chk = document.createElement('input');
          chk.type = 'checkbox';
          chk.checked = !this._hidden.has(i);
          chk.addEventListener('change', () => {
            chk.checked ? this._hidden.delete(i) : this._hidden.add(i);
            this._applyVisibility();
            if (this.doState) this._saveState();
          });
          lbl.appendChild(chk);
          lbl.append(' ' + col.label);
          drop.appendChild(lbl);
        });
        cvBtn.addEventListener('click', e => { e.stopPropagation(); colvisDiv.classList.toggle('is-open'); });
        document.addEventListener('click', () => colvisDiv.classList.remove('is-open'), { passive: true });
        colvisDiv.appendChild(cvBtn);
        colvisDiv.appendChild(drop);
        ctrlL.appendChild(colvisDiv);
      }

      if (this.doSearch) {
        const srchWrap = document.createElement('div');
        srchWrap.className = 'tbl-srch';
        srchWrap.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
        const inp = document.createElement('input');
        inp.type = 'search';
        inp.placeholder = 'Buscar…';
        inp.className = 'tbl-srch-inp';
        inp.value = this.query;
        let debounce;
        inp.addEventListener('input', () => {
          clearTimeout(debounce);
          debounce = setTimeout(() => {
            this.query = inp.value.toLowerCase();
            this.cur = 1;
            this.url ? this._loadAjax() : this._filter();
            SW.emit(this.el, 'sw:table:search', { query: this.query });
          }, 300);
        });
        srchWrap.appendChild(inp);
        ctrl.appendChild(srchWrap);
      }

      if (this.doSort) {
        this.el.querySelectorAll('thead th').forEach((th, i) => {
          const colIdx = this.doSelect ? i - 1 : i;
          if (colIdx < 0 || this._colDefs[colIdx]?.nosort) return;
          th.classList.add('tbl-sort');
          if (colIdx === this.sortCol) th.classList.add(`is-${this.sortDir}`);
          th.addEventListener('click', () => {
            if (this.sortCol === colIdx) {
              this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
              this.sortCol = colIdx;
              this.sortDir = 'asc';
            }
            this.el.querySelectorAll('thead th.tbl-sort').forEach(h => h.classList.remove('is-asc', 'is-desc'));
            th.classList.add(`is-${this.sortDir}`);
            this.cur = 1;
            this.url ? this._loadAjax() : this._filter();
            SW.emit(this.el, 'sw:table:sort', { col: this.sortCol, dir: this.sortDir });
            if (this.doState) this._saveState();
          });
        });
      }

      if (this.doSelect) {
        const theadTr = this.el.querySelector('thead tr');
        if (theadTr) {
          const th = document.createElement('th');
          th.className = 'tbl-sel-th';
          th.innerHTML = `<input type="checkbox" class="tbl-chk tbl-sel-all" title="Selecionar tudo">`;
          theadTr.insertBefore(th, theadTr.firstChild);
          th.querySelector('.tbl-sel-all').addEventListener('change', e => {
            this.el.querySelectorAll('tbody .tbl-sel-row').forEach(cb => {
              cb.checked = e.target.checked;
              const idx = parseInt(cb.closest('tr').dataset.ridx, 10);
              e.target.checked ? this._selected.add(idx) : this._selected.delete(idx);
            });
            this._updateSelInfo();
            SW.emit(this.el, 'sw:table:select', { selected: [...this._selected] });
          });
        }
      }

      this._applyVisibility();
    }

    _buildFoot() {
      const foot = document.createElement('div');
      foot.className = 'tbl-foot';
      this.outer.appendChild(foot);
      this.foot = foot;
    }

    _filter() {
      let data = [...this._rows];
      if (this.query) {
        data = data.filter(row => row.some(c => c.text.toLowerCase().includes(this.query)));
      }
      if (this.sortCol >= 0) {
        data.sort((a, b) => {
          const va = a[this.sortCol]?.text ?? '';
          const vb = b[this.sortCol]?.text ?? '';
          const na = parseFloat(va), nb = parseFloat(vb);
          const cmp = !isNaN(na) && !isNaN(nb) ? na - nb : va.localeCompare(vb, 'pt-BR', { sensitivity: 'base' });
          return this.sortDir === 'asc' ? cmp : -cmp;
        });
      }
      this._filtered = data;
      this.cur = Math.min(this.cur, Math.ceil(data.length / this.per) || 1);
      this._render();
    }

    _render() {
      const start = (this.cur - 1) * this.per;
      const page = this._filtered.slice(start, start + this.per);
      const tbody = this.el.querySelector('tbody');
      const total = this._rows.length;
      const filt = this._filtered.length;
      const from = filt ? start + 1 : 0;
      const to = Math.min(start + this.per, filt);

      if (!page.length) {
        tbody.innerHTML = `<tr><td class="tbl-empty" colspan="99">Nenhum registro encontrado.</td></tr>`;
      } else {
        tbody.innerHTML = page.map((row, ri) => {
          const absIdx = start + ri;
          const selCell = this.doSelect
            ? `<td class="tbl-sel-td"><input type="checkbox" class="tbl-chk tbl-sel-row"${this._selected.has(absIdx) ? ' checked' : ''}></td>`
            : '';
          const cells = row.map((cell, ci) => {
            const hide = this._hidden.has(ci) ? ' style="display:none"' : '';
            return `<td${hide}>${cell.html}</td>`;
          }).join('');
          return `<tr data-ridx="${absIdx}">${selCell}${cells}</tr>`;
        }).join('');

        if (this.doSelect) {
          tbody.querySelectorAll('.tbl-sel-row').forEach(cb => {
            cb.addEventListener('change', () => {
              const idx = parseInt(cb.closest('tr').dataset.ridx, 10);
              cb.checked ? this._selected.add(idx) : this._selected.delete(idx);
              this._updateSelInfo();
              SW.emit(this.el, 'sw:table:select', { selected: [...this._selected] });
            });
          });
        }
      }

      const pages = Math.ceil(filt / this.per);
      const selInfo = this._selected.size ? `<span class="tbl-sel-info">${this._selected.size} selecionado(s) &bull; </span>` : '';
      const info = filt < total
        ? `${selInfo}Exibindo ${from}–${to} de ${filt} (filtrado de ${total})`
        : `${selInfo}Exibindo ${from}–${to} de ${total} registros`;

      this.foot.innerHTML = `
        <div class="tbl-info">${info}</div>
        <nav class="tbl-pag" aria-label="Paginação">${this._pagHTML(pages)}</nav>`;

      this.foot.querySelectorAll('[data-p]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = parseInt(btn.dataset.p, 10);
          if (isNaN(p) || p === this.cur) return;
          this.cur = p;
          this.url ? this._loadAjax() : this._render();
          SW.emit(this.el, 'sw:table:page', { page: this.cur });
        });
      });
    }

    _pagHTML(pages) {
      if (pages <= 1) return '';
      const c = this.cur;
      const btn = (p, label, extra = '') => {
        const disabled = p < 1 || p > pages || p === c;
        return `<button class="tbl-pg-it${p === c ? ' is-act' : ''}${extra}" data-p="${p}" ${disabled ? 'disabled' : ''} type="button">${label}</button>`;
      };

      let nums = [];
      if (pages <= 7) {
        nums = Array.from({ length: pages }, (_, i) => i + 1);
      } else {
        nums = [1];
        if (c > 3) nums.push('…');
        for (let i = Math.max(2, c - 1); i <= Math.min(pages - 1, c + 1); i++) nums.push(i);
        if (c < pages - 2) nums.push('…');
        nums.push(pages);
      }

      return (
        btn(c - 1, '‹', ' tbl-pg-nav') +
        nums.map(n => n === '…' ? `<span class="tbl-pg-ell">…</span>` : btn(n, n)).join('') +
        btn(c + 1, '›', ' tbl-pg-nav')
      );
    }

    _loadAjax() {
      const colDefs = JSON.parse(this.el.getAttribute('sw-table-cols') || '[]');
      const tbody = this.el.querySelector('tbody') || this.el.appendChild(document.createElement('tbody'));
      tbody.innerHTML = `<tr><td class="tbl-proc" colspan="99"></td></tr>`;

      const sortField = this.sortCol >= 0 ? (colDefs[this.sortCol]?.field || '') : '';
      const params = new URLSearchParams({
        page: this.cur, per: this.per,
        search: this.query, sort: sortField, dir: this.sortDir,
      });

      fetch(`${this.url}?${params}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
        .then(async r => {
          const contentType = r.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            return r.json();
          }
          const text = await r.text();
          try { return JSON.parse(text); } catch (_) { return { html: text }; }
        })
        .then(res => {
          if (res.html !== undefined) {
            const scratch = document.createElement('tbody');
            scratch.innerHTML = res.html;
            const rows = Array.from(scratch.children);
            if (!rows.length) {
              tbody.innerHTML = `<tr><td class="tbl-empty" colspan="99">Nenhum registro encontrado.</td></tr>`;
            } else {
              tbody.replaceChildren(...rows);
            }
            this._rows = Array.from(tbody.rows).map(tr =>
              Array.from(tr.querySelectorAll('td')).map(td => ({ html: td.innerHTML, text: td.textContent.trim() }))
            );
            this._filtered = [...this._rows];
            const total = res.total ?? this._rows.length;
            const filtered = res.filtered ?? total;
            const pages = Math.ceil(filtered / (this.per || 10));
            const start = (this.cur - 1) * (this.per || 10);
            const from = filtered ? start + 1 : 0;
            const to = Math.min(start + (this.per || 10), filtered);
            const info = filtered < total
              ? `Exibindo ${from}–${to} de ${filtered} (filtrado de ${total})`
              : `Exibindo ${from}–${to} de ${total} registros`;

            this.foot.innerHTML = `
              <div class="tbl-info">${info}</div>
              <nav class="tbl-pag">${this._pagHTML(pages)}</nav>`;

            this.foot.querySelectorAll('[data-p]').forEach(btn => {
              btn.addEventListener('click', () => {
                const p = parseInt(btn.dataset.p, 10);
                if (isNaN(p) || p === this.cur) return;
                this.cur = p;
                this._loadAjax();
                SW.emit(this.el, 'sw:table:page', { page: this.cur });
              });
            });
            if (this._hidden.size) this._applyVisibility();
            return;
          }

          const arr = Array.isArray(res) ? res : (res.data || res.rows || []);
          const total = res.total ?? res.count ?? arr.length;
          const filtered = res.filtered ?? total;

          if (!colDefs.length && arr.length) {
            Object.keys(arr[0]).forEach(k => colDefs.push({ label: k, field: k }));
          }

          if (!this.el.querySelector('thead') && colDefs.length) {
            const thead = document.createElement('thead');
            thead.innerHTML = '<tr>' + colDefs.map(c => '<th>' + c.label + '</th>').join('') + '</tr>';
            this.el.insertBefore(thead, this.el.firstChild);
            this._colDefs = colDefs.map(c => ({ label: c.label, nosort: false, novis: false }));
            if (this.doSort) {
              this.el.querySelectorAll('thead th').forEach((th, i) => {
                th.classList.add('tbl-sort');
                th.addEventListener('click', () => {
                  this.sortCol = i;
                  this.sortDir = this.sortCol === i && this.sortDir === 'asc' ? 'desc' : 'asc';
                  this.el.querySelectorAll('thead th.tbl-sort').forEach(h => h.classList.remove('is-asc', 'is-desc'));
                  th.classList.add(`is-${this.sortDir}`);
                  this.cur = 1;
                  this._loadAjax();
                });
              });
            }
          }

          tbody.innerHTML = arr.length
            ? arr.map(row =>
              '<tr>' + colDefs.map(c => '<td>' + (row[c.field] ?? '') + '</td>').join('') + '</tr>'
            ).join('')
            : `<tr><td class="tbl-empty" colspan="99">Nenhum registro encontrado.</td></tr>`;

          const pages = Math.ceil(filtered / this.per);
          const start = (this.cur - 1) * this.per;
          const from = filtered ? start + 1 : 0;
          const to = Math.min(start + this.per, filtered);
          const info = filtered < total
            ? `Exibindo ${from}–${to} de ${filtered} (filtrado de ${total})`
            : `Exibindo ${from}–${to} de ${total} registros`;

          this.foot.innerHTML = `
            <div class="tbl-info">${info}</div>
            <nav class="tbl-pag">${this._pagHTML(pages)}</nav>`;

          this.foot.querySelectorAll('[data-p]').forEach(btn => {
            btn.addEventListener('click', () => {
              const p = parseInt(btn.dataset.p, 10);
              if (isNaN(p) || p === this.cur) return;
              this.cur = p;
              this._loadAjax();
              SW.emit(this.el, 'sw:table:page', { page: this.cur });
            });
          });

          if (this._hidden.size) this._applyVisibility();
        })
        .catch(() => {
          tbody.innerHTML = `<tr><td class="tbl-empty" colspan="99">Erro ao carregar dados.</td></tr>`;
        });
    }

    _applyVisibility() {
      const offset = this.doSelect ? 1 : 0;
      this.el.querySelectorAll('thead th').forEach((th, i) => {
        const ci = i - offset;
        if (ci < 0) return;
        th.style.display = this._hidden.has(ci) ? 'none' : '';
      });
      this.el.querySelectorAll('tbody tr').forEach(tr => {
        tr.querySelectorAll('td').forEach((td, i) => {
          const ci = i - offset;
          if (ci < 0) return;
          td.style.display = this._hidden.has(ci) ? 'none' : '';
        });
      });
    }

    _updateSelInfo() {
      const info = this.foot?.querySelector('.tbl-info');
      if (!info) return;
      const selSpan = info.querySelector('.tbl-sel-info');
      const newTxt = this._selected.size ? `<span class="tbl-sel-info">${this._selected.size} selecionado(s) &bull; </span>` : '';
      if (selSpan) selSpan.outerHTML = newTxt; else info.insertAdjacentHTML('afterbegin', newTxt);
    }

    _export(fmt) {
      const offset = this.doSelect ? 1 : 0;
      const ths = Array.from(this.el.querySelectorAll('thead th'))
        .filter((_, i) => {
          const ci = i - offset;
          return ci >= 0 && !this._hidden.has(ci);
        })
        .map(th => th.textContent.trim().replace(/[⇅↑↓]/g, '').trim());

      const rows = (this._filtered.length ? this._filtered : this._rows).map(row =>
        row.filter((_, ci) => !this._hidden.has(ci)).map(c => c.text)
      );

      if (fmt === 'copy') {
        const txt = [ths, ...rows].map(r => r.join('\t')).join('\n');
        navigator.clipboard?.writeText(txt).then(() => {
          if (window.SWAlert) SWAlert.ok(`${rows.length} linha(s) copiadas`);
        });
        return;
      }

      if (fmt === 'csv') {
        const esc = v => `"${String(v).replace(/"/g, '""')}"`;
        const csv = [ths, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
        a.download = 'tabela.csv';
        a.click();
        URL.revokeObjectURL(a.href);
      }
    }

    _saveState() {
      try {
        localStorage.setItem(this._stKey, JSON.stringify({
          per: this.per, sortCol: this.sortCol, sortDir: this.sortDir,
          query: this.query, hidden: [...this._hidden],
        }));
      } catch (_) { /* quota exceeded */ }
    }

    _loadState() {
      try {
        const s = JSON.parse(localStorage.getItem(this._stKey) || 'null');
        if (!s) return;
        this.per = s.per ?? this.per;
        this.sortCol = s.sortCol ?? this.sortCol;
        this.sortDir = s.sortDir ?? this.sortDir;
        this.query = s.query ?? this.query;
        this._hidden = new Set(s.hidden || []);
      } catch (_) { /* corrupted */ }
    }

    reload() { this.url ? this._loadAjax() : this._filter(); }
    search(q) {
      this.query = q.toLowerCase();
      this.cur = 1;
      const inp = this.outer?.querySelector('.tbl-srch-inp');
      if (inp) inp.value = q;
      this.reload();
    }
  }

  /* Compatibility alias for sw-table-ajax */
  class SWTableAjax {
    static initAll(root = document) {
      SW.$('[sw-table-ajax]', root).forEach(el => {
        if (el._swTab) return;
        el._swTab = true;
        if (!el.hasAttribute('sw-table-url')) {
          const u = el.getAttribute('sw-table-ajax');
          if (u) el.setAttribute('sw-table-url', u);
          else el.setAttribute('sw-table-url', el.getAttribute('sw-table-url') || '');
        }
        el.setAttribute('sw-table', '');
        new SWTableInst(el);
      });
    }
  }

  window.SW?.register('SWTable', SWTable);
  window.SW?.register('SWTableAjax', SWTableAjax);
  if (window.SW) window.SW.Table = SWTable;
})();
