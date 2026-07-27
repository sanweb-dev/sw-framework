/* SW Framework Table */
(function () {
  'use strict';
  class SWTable {
    static initAll(root = document) {
      SW.$('table[sw-table]', root).forEach((table) => {
        if (table._swTableInit || !table.tBodies[0]) return;
        table._swTableInit = new SWTableInstance(table);
      });
    }
  }
  class SWTableInstance {
    constructor(table) {
      this.table = table;
      this.tbody = table.tBodies[0];
      this.rows = Array.from(this.tbody.rows);
      this.per = parseInt(table.getAttribute('sw-table-per'), 10) || 0;
      this.page = 1;
      this.ajaxUrl = table.getAttribute('sw-table-url') || null;
      this.buildControls();
      this.bindSort();
      if (this.per) this.buildPagination();
      if (this.ajaxUrl) this.loadPage(1);
    }
    buildControls() {
      const controls = document.createElement('div');
      controls.className = 'sw-table-controls';
      const field = document.createElement('div');
      field.className = 'sw-table-search';
      const label = document.createElement('label');
      label.className = 'sw-sr-only';
      label.textContent = 'Buscar na tabela';
      const input = document.createElement('input');
      input.type = 'search';
      input.className = 'sw-input sw-input-sm';
      input.placeholder = 'Buscar na tabela…';
      input.setAttribute('aria-label', 'Buscar na tabela');
      label.htmlFor = input.id = `sw-table-search-${Math.random().toString(36).slice(2, 9)}`;
      field.append(label, input);
      this.count = document.createElement('div');
      this.count.className = 'sw-text-mut sw-table-count';
      this.count.setAttribute('aria-live', 'polite');
      controls.append(field, this.count);
      this.table.parentNode.insertBefore(controls, this.table);
      if (!this.table.parentElement.classList.contains('sw-table-scroll')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'sw-table-scroll';
        wrapper.setAttribute('role', 'region');
        wrapper.setAttribute('aria-label', this.table.querySelector('caption')?.textContent || 'Tabela rolável');
        wrapper.tabIndex = 0;
        this.table.parentNode.insertBefore(wrapper, this.table);
        wrapper.appendChild(this.table);
      }
      input.addEventListener('input', () => this.filter(input.value));
      this.updateCount(this.rows.length);
    }
    buildPagination() {
      this.pager = document.createElement('nav');
      this.pager.className = 'sw-table-pager sw-pagination';
      this.table.parentNode.parentNode.insertBefore(this.pager, this.table.parentNode.nextSibling);
      this.renderPage();
    }
    renderPage() {
      const visibleRows = this.rows.filter((row) => !row.hidden);
      const totalPages = Math.max(1, Math.ceil(visibleRows.length / this.per));
      this.page = Math.min(this.page, totalPages);
      this.rows.forEach((row) => { if (!row.hidden) row.classList.add('sw-table-row-hid'); });
      visibleRows.slice((this.page - 1) * this.per, this.page * this.per).forEach((row) => row.classList.remove('sw-table-row-hid'));
      if (!this.pager) return;
      this.pager.innerHTML = '';
      this.pager.setAttribute('sw-pagination', '');
      this.pager.setAttribute('sw-pagination-total', String(visibleRows.length));
      this.pager.setAttribute('sw-pagination-per', String(this.per));
      this.pager.setAttribute('sw-pagination-cur', String(this.page));
      this.pager._swPagination = null;
      SW.Pagination?.initAll(this.pager.parentNode);
      this.pager.addEventListener('sw:pagination:change', (event) => {
        this.page = event.detail.page;
        this.ajaxUrl ? this.loadPage(this.page) : this.renderPage();
      }, { once: false });
    }
    async loadPage(page) {
      if (!this.ajaxUrl) return;
      this.page = page;
      const url = new URL(this.ajaxUrl, window.location.href);
      url.searchParams.set('page', page);
      url.searchParams.set('per', this.per || 10);
      const response = await fetch(url.href, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      const html = await response.text();
      const scratch = document.createElement('tbody');
      scratch.innerHTML = html;
      this.tbody.replaceChildren(...scratch.children);
      this.rows = Array.from(this.tbody.rows);
      this.bindSort();
      SW.emit(this.table, 'sw:table:page', { page });
      if (this.pager) this.renderPage();
    }
    filter(value) {
      const term = String(value).toLocaleLowerCase().trim();
      let visible = 0;
      this.rows.forEach((row) => {
        const matches = row.textContent.toLocaleLowerCase().includes(term);
        row.hidden = !matches;
        if (matches) visible += 1;
      });
      this.updateCount(visible);
      if (this.per) { this.page = 1; this.renderPage(); }
    }
    updateCount(visible) { this.count.textContent = `${visible} de ${this.rows.length} registros`; }
    bindSort() {
      Array.from(this.table.tHead?.rows[0]?.cells || []).forEach((header, index) => {
        header.tabIndex = 0;
        header.setAttribute('role', 'columnheader');
        header.setAttribute('aria-sort', 'none');
        const sort = () => this.sortBy(header, index);
        header.addEventListener('click', sort);
        header.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); sort(); }
        });
      });
    }
    sortBy(header, index) {
      const ascending = header.getAttribute('aria-sort') !== 'ascending';
      this.table.querySelectorAll('th[aria-sort]').forEach((cell) => cell.setAttribute('aria-sort', 'none'));
      header.setAttribute('aria-sort', ascending ? 'ascending' : 'descending');
      this.rows.sort((rowA, rowB) => {
        const a = rowA.cells[index]?.textContent.trim() || '';
        const b = rowB.cells[index]?.textContent.trim() || '';
        return (ascending ? 1 : -1) * a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
      }).forEach((row) => this.tbody.appendChild(row));
    }
  }
  window.SW?.register('SWTable', SWTable);
  if (window.SW) window.SW.Table = SWTable;
})();
