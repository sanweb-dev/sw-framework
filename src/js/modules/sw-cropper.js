/* SW Framework Cropper — sem dependências externas (canvas nativo)
   <div sw-cropper sw-cropper-ratio="1" sw-cropper-upload="/api/imgs/upload" sw-cropper-ref sw-cropper-local sw-cropper-tipo sw-cropper-preview="#prev" sw-cropper-out="#img">
     <input type="file" accept="image/*" sw-cropper-input>
     <canvas sw-cropper-canvas></canvas>
     <button type="button" sw-cropper-btn>Cortar e Enviar</button>
   </div>
   Eventos: sw:cropper:ready · sw:cropper:done { url, thumb, id } · sw:cropper:error { erro } */
(function () {
  'use strict';

  class SWCropperInst {
    constructor(el) {
      this.el = el;
      this.ratio = parseFloat(el.getAttribute('sw-cropper-ratio') ?? '1') || 1;
      this.url = el.getAttribute('sw-cropper-upload') || '/api/imgs/upload';
      this.refId = el.getAttribute('sw-cropper-ref') || '';
      this.local = el.getAttribute('sw-cropper-local') || '';
      this.tipo = el.getAttribute('sw-cropper-tipo') || 'avatar';
      this.previewSel = el.getAttribute('sw-cropper-preview') || null;
      this.outSel = el.getAttribute('sw-cropper-out') || null;

      this.input = el.querySelector('[sw-cropper-input]');
      this.btnCrop = el.querySelector('[sw-cropper-btn]');
      this.canvas = el.querySelector('[sw-cropper-canvas]');
      this.img = new Image();
      this.box = null; // { x, y, w, h } em coordenadas do canvas

      el._swCropperInst = this;
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
      const maxW = Math.min(500, this.canvas.parentElement?.clientWidth || this.img.width || 400);
      const scale = Math.min(1, maxW / this.img.width);
      this.canvas.width = this.img.width * scale;
      this.canvas.height = this.img.height * scale;
      this.canvas.style.display = 'block';
      this._scale = scale;

      const effectiveRatio = this.ratio > 0 ? this.ratio : (this.canvas.width / this.canvas.height);
      const w = Math.min(this.canvas.width, this.canvas.height * effectiveRatio);
      const h = w / effectiveRatio;
      this.box = { x: (this.canvas.width - w) / 2, y: (this.canvas.height - h) / 2, w, h };

      this._draw();
      this._bindDrag();
      SW.emit(this.el, 'sw:cropper:ready');
    }

    _draw() {
      if (!this.canvas || !this.box) return;
      const ctx = this.canvas.getContext('2d');
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.drawImage(this.img, 0, 0, this.canvas.width, this.canvas.height);
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.clearRect(this.box.x, this.box.y, this.box.w, this.box.h);
      ctx.drawImage(
        this.img,
        this.box.x / this._scale, this.box.y / this._scale,
        this.box.w / this._scale, this.box.h / this._scale,
        this.box.x, this.box.y, this.box.w, this.box.h
      );
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.box.x, this.box.y, this.box.w, this.box.h);
      ctx.restore();

      if (this.previewSel) {
        const prevEl = document.querySelector(this.previewSel);
        if (prevEl) {
          const pCanvas = document.createElement('canvas');
          pCanvas.width = this.box.w;
          pCanvas.height = this.box.h;
          const pCtx = pCanvas.getContext('2d');
          pCtx.drawImage(
            this.img,
            this.box.x / this._scale, this.box.y / this._scale,
            this.box.w / this._scale, this.box.h / this._scale,
            0, 0, this.box.w, this.box.h
          );
          prevEl.style.backgroundImage = `url(${pCanvas.toDataURL('image/png')})`;
          prevEl.style.backgroundSize = 'cover';
          prevEl.style.backgroundPosition = 'center';
        }
      }
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

      this.canvas.onmousedown = down;
      this.canvas.onmousemove = move;
      window.addEventListener('mouseup', up);
      this.canvas.ontouchstart = down;
      this.canvas.ontouchmove = move;
      window.addEventListener('touchend', up);
    }

    async _crop() {
      if (!this.box) return;
      const out = document.createElement('canvas');
      const targetW = 800;
      const targetH = Math.round(800 / (this.ratio > 0 ? this.ratio : (this.box.w / this.box.h)));
      out.width = targetW;
      out.height = targetH;
      const ctx = out.getContext('2d');
      ctx.drawImage(
        this.img,
        this.box.x / this._scale, this.box.y / this._scale,
        this.box.w / this._scale, this.box.h / this._scale,
        0, 0, targetW, targetH
      );
      const dataUrl = out.toDataURL('image/webp', 0.9);

      if (!this.url || this.url === '#') {
        if (this.outSel) {
          document.querySelectorAll(this.outSel).forEach((el) => {
            el.src = dataUrl;
            el.style.display = 'block';
          });
        }
        SW.emit(this.el, 'sw:cropper:done', { url: dataUrl, thumb: dataUrl, id: 'demo' });
        if (window.SWAlert) SWAlert.ok('Recorte concluído (Modo Demo)!');
        return;
      }

      const csrf = document.querySelector('meta[name="csrf-token"]')?.content || window._csrf || '';
      const fd = new FormData();
      fd.append('dataUrl', dataUrl);
      fd.append('ref_id', this.refId);
      fd.append('local', this.local);
      fd.append('tipo', this.tipo);

      try {
        const res = await fetch(this.url, {
          method: 'POST',
          headers: { 'X-CSRF-Token': csrf, 'X-Requested-With': 'XMLHttpRequest' },
          body: fd,
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.erro || 'Erro no upload');

        if (this.outSel) {
          document.querySelectorAll(this.outSel).forEach((el) => {
            el.src = `${json.thumb || json.img}?t=${Date.now()}`;
            el.style.display = 'block';
          });
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

    static get(el) { return el._swCropperInst || el._swCropper; }
  }

  window.SW?.register('SWCropper', SWCropper);
  if (window.SW) window.SW.Cropper = SWCropper;
})();
