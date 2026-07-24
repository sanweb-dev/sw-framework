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
      this.buildControls();
      this.bindSort();
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
    filter(value) {
      const term = String(value).toLocaleLowerCase().trim();
      let visible = 0;
      this.rows.forEach((row) => {
        const matches = row.textContent.toLocaleLowerCase().includes(term);
        row.hidden = !matches;
        if (matches) visible += 1;
      });
      this.updateCount(visible);
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
