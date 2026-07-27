/* SW Framework Cropper — sem dependências externas (canvas nativo)
   <div sw-cropper sw-cropper-ratio="1" sw-cropper-upload="/api/imgs/upload" sw-cropper-ref sw-cropper-local sw-cropper-tipo sw-cropper-out="#img">
     <input type="file" accept="image/*" sw-cropper-input>
     <button type="button" sw-cropper-btn>Cortar e Enviar</button>
     <canvas sw-cropper-canvas></canvas>
   </div>
   Eventos: sw:cropper:ready · sw:cropper:done { url, thumb, id } · sw:cropper:error { erro } */
(function () {
  'use strict';

  class SWCropperInst {
    constructor(el) {
      this.el = el;
      this.ratio = parseFloat(el.getAttribute('sw-cropper-ratio') ?? '1');
      this.url = el.getAttribute('sw-cropper-upload') || '/api/imgs/upload';
      this.refId = el.getAttribute('sw-cropper-ref') || '';
      this.local = el.getAttribute('sw-cropper-local') || '';
      this.tipo = el.getAttribute('sw-cropper-tipo') || 'avatar';
      this.outSel = el.getAttribute('sw-cropper-out') || null;

      this.input = el.querySelector('[sw-cropper-input]');
      this.btnCrop = el.querySelector('[sw-cropper-btn]');
      this.canvas = el.querySelector('[sw-cropper-canvas]');
      this.img = new Image();
      this.box = null; // { x, y, w, h } em coordenadas do canvas

      this._bind();
    }

    _bind() {
      this.input?.addEventListener('change', (event) => this._onFile(event));
      this.btnCrop?.addEventListener('click', () => this._crop());
    }

    _onFile(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        this.img.onload = () => this._setup();
        this.img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }

    _setup() {
      if (!this.canvas) return;
      const maxW = this.canvas.parentElement?.clientWidth || this.img.width;
      const scale = Math.min(1, maxW / this.img.width);
      this.canvas.width = this.img.width * scale;
      this.canvas.height = this.img.height * scale;
      this.canvas.style.display = 'block';
      this._scale = scale;

      const w = Math.min(this.canvas.width, this.canvas.height * this.ratio);
      const h = w / this.ratio;
      this.box = { x: (this.canvas.width - w) / 2, y: (this.canvas.height - h) / 2, w, h };

      this._draw();
      this._bindDrag();
      SW.emit(this.el, 'sw:cropper:ready');
    }

    _draw() {
      const ctx = this.canvas.getContext('2d');
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.drawImage(this.img, 0, 0, this.canvas.width, this.canvas.height);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.clearRect(this.box.x, this.box.y, this.box.w, this.box.h);
      ctx.drawImage(this.img, this.box.x / this._scale, this.box.y / this._scale, this.box.w / this._scale, this.box.h / this._scale, this.box.x, this.box.y, this.box.w, this.box.h);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.box.x, this.box.y, this.box.w, this.box.h);
      ctx.restore();
    }

    _bindDrag() {
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let origX = 0;
      let origY = 0;

      const pos = (event) => {
        const r = this.canvas.getBoundingClientRect();
        const p = event.touches ? event.touches[0] : event;
        return { x: (p.clientX - r.left) * (this.canvas.width / r.width), y: (p.clientY - r.top) * (this.canvas.height / r.height) };
      };

      const down = (event) => {
        const p = pos(event);
        if (p.x < this.box.x || p.x > this.box.x + this.box.w || p.y < this.box.y || p.y > this.box.y + this.box.h) return;
        dragging = true;
        startX = p.x; startY = p.y;
        origX = this.box.x; origY = this.box.y;
      };
      const move = (event) => {
        if (!dragging) return;
        const p = pos(event);
        this.box.x = Math.max(0, Math.min(this.canvas.width - this.box.w, origX + (p.x - startX)));
        this.box.y = Math.max(0, Math.min(this.canvas.height - this.box.h, origY + (p.y - startY)));
        this._draw();
      };
      const up = () => { dragging = false; };

      this.canvas.addEventListener('mousedown', down);
      this.canvas.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      this.canvas.addEventListener('touchstart', down, { passive: true });
      this.canvas.addEventListener('touchmove', move, { passive: true });
      window.addEventListener('touchend', up);
    }

    async _crop() {
      if (!this.box) return;
      const out = document.createElement('canvas');
      out.width = 800;
      out.height = 800 / this.ratio;
      const ctx = out.getContext('2d');
      ctx.drawImage(this.img, this.box.x / this._scale, this.box.y / this._scale, this.box.w / this._scale, this.box.h / this._scale, 0, 0, out.width, out.height);
      const dataUrl = out.toDataURL('image/webp', 0.88);

      const csrf = document.querySelector('meta[name="csrf-token"]')?.content || window._csrf || '';
      const fd = new FormData();
      fd.append('dataUrl', dataUrl);
      fd.append('ref_id', this.refId);
      fd.append('local', this.local);
      fd.append('tipo', this.tipo);

      try {
        const res = await fetch(this.url, { method: 'POST', headers: { 'X-CSRF-Token': csrf, 'X-Requested-With': 'XMLHttpRequest' }, body: fd });
        const json = await res.json();
        if (!json.ok) throw new Error(json.erro || 'Erro no upload');

        if (this.outSel) {
          document.querySelectorAll(this.outSel).forEach((el) => { el.src = `${json.thumb || json.img}?t=${Date.now()}`; });
        }
        SW.emit(this.el, 'sw:cropper:done', { url: json.img, thumb: json.thumb, id: json.id });
      } catch (err) {
        SW.emit(this.el, 'sw:cropper:error', { erro: err.message });
      }
    }
  }

  class SWCropper {
    static initAll(root = document) {
      SW.$('[sw-cropper]', root).forEach((el) => {
        if (el._swCropper) return;
        el._swCropper = new SWCropperInst(el);
      });
    }

    static get(el) { return el._swCropper; }
  }

  window.SW?.register('SWCropper', SWCropper);
  if (window.SW) window.SW.Cropper = SWCropper;
})();
