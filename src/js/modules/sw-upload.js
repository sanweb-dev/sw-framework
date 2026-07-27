/* SW Framework Upload — <div sw-upload sw-upload-accept sw-upload-max sw-upload-size sw-upload-txt><input type="file"></div>
   Eventos: sw:upload:add { files } · sw:upload:remove { index } · API: SW.Upload.getFiles(el) */
(function () {
  'use strict';

  function fmtSize(bytes) {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  class SWUploadInst {
    constructor(el) {
      this.el = el;
      this.input = el.querySelector('input[type="file"]');
      this.accept = el.getAttribute('sw-upload-accept') || this.input?.accept || '*';
      this.max = parseInt(el.getAttribute('sw-upload-max'), 10) || 0;
      this.maxSize = parseInt(el.getAttribute('sw-upload-size'), 10) || 10 * 1024 * 1024;
      this.txt = el.getAttribute('sw-upload-txt') || 'Arraste ou <strong>clique aqui</strong>';
      this.files = [];
      el._swUploadInst = this;

      this._build();
      this._bind();
    }

    _build() {
      if (!this.input) {
        this.input = document.createElement('input');
        this.input.type = 'file';
        this.el.appendChild(this.input);
      }
      this.input.style.display = 'none';
      if (this.accept !== '*') this.input.accept = this.accept;
      if (this.max !== 1) this.input.multiple = true;

      this.zone = document.createElement('div');
      this.zone.className = 'sw-upload-zone';
      this.zone.innerHTML = `<i class="swi swi-image-add sw-upload-ico"></i><p class="sw-upload-txt">${this.txt}</p><p class="sw-upload-sub">Tamanho máx: ${fmtSize(this.maxSize)}</p>`;
      this.el.insertBefore(this.zone, this.input);

      this.prev = document.createElement('div');
      this.prev.className = 'sw-upload-prev';
      this.el.appendChild(this.prev);

      this.errEl = document.createElement('div');
      this.errEl.className = 'sw-upload-err';
      this.el.appendChild(this.errEl);
    }

    _bind() {
      this.zone.addEventListener('click', () => this.input.click());
      this.input.addEventListener('change', () => this._add(Array.from(this.input.files)));
      this.zone.addEventListener('dragover', (event) => { event.preventDefault(); this.zone.classList.add('is-ov'); });
      this.zone.addEventListener('dragleave', () => this.zone.classList.remove('is-ov'));
      this.zone.addEventListener('drop', (event) => {
        event.preventDefault();
        this.zone.classList.remove('is-ov');
        this._add(Array.from(event.dataTransfer.files));
      });
    }

    _add(newFiles) {
      this.errEl.textContent = '';
      const errors = [];
      newFiles.forEach((f) => {
        if (this.max && this.files.length >= this.max) { errors.push(`Máximo de ${this.max} arquivo(s).`); return; }
        if (f.size > this.maxSize) { errors.push(`"${f.name}" excede ${fmtSize(this.maxSize)}.`); return; }
        this.files.push(f);
      });
      if (errors.length) this.errEl.textContent = errors[0];
      this._renderPrev();
      SW.emit(this.el, 'sw:upload:add', { files: this.files });
    }

    _renderPrev() {
      this.prev.innerHTML = '';
      this.files.forEach((f, i) => {
        const item = document.createElement('div');
        item.className = 'sw-upload-item';
        if (f.type.startsWith('image/')) {
          const img = document.createElement('img');
          img.src = URL.createObjectURL(f);
          img.onload = () => URL.revokeObjectURL(img.src);
          item.appendChild(img);
        } else {
          item.innerHTML = `<div class="sw-upload-item-name">${f.name}</div>`;
        }
        const rm = document.createElement('div');
        rm.className = 'sw-upload-item-rm';
        rm.addEventListener('click', (event) => { event.stopPropagation(); this._remove(i); });
        item.appendChild(rm);
        this.prev.appendChild(item);
      });
    }

    _remove(i) {
      this.files.splice(i, 1);
      this._renderPrev();
      SW.emit(this.el, 'sw:upload:remove', { index: i });
    }

    clear() { this.files = []; this._renderPrev(); }
  }

  class SWUpload {
    static initAll(root = document) {
      SW.$('[sw-upload]', root).forEach((el) => {
        if (el._swUpload) return;
        el._swUpload = true;
        new SWUploadInst(el);
      });
    }

    static getFiles(el) {
      return (typeof el === 'string' ? document.querySelector(el) : el)?._swUploadInst?.files || [];
    }
  }

  window.SW?.register('SWUpload', SWUpload);
  if (window.SW) window.SW.Upload = SWUpload;
})();
