/* SW Framework Drag — Elementos Arrastáveis (Mouse + Touch)
   Uso: <div sw-drag>Elemento</div>
        <div sw-drag sw-drag-handle=".handle" sw-drag-axis="x|y" sw-drag-bounds="parent|window"></div> */
(function () {
  'use strict';

  function getAttr(el, name) {
    return el.getAttribute(`sw-drag-${name}`) ||
           el.getAttribute(`swdrag-${name}`) ||
           el.getAttribute(`y2drag-${name}`) ||
           null;
  }

  class SWDragInst {
    constructor(el) {
      this.el = el;
      const handleSelector = getAttr(el, 'handle');
      this.handle = handleSelector ? el.querySelector(handleSelector) || el : el;
      this.axis = getAttr(el, 'axis') || 'both';
      this.bounds = getAttr(el, 'bounds') || null;

      if (!this.handle) return;
      if (el.style.position === '' || el.style.position === 'static') {
        el.style.position = 'absolute';
      }

      this.handle.style.cursor = 'grab';
      this.handle.addEventListener('mousedown', (event) => this._start(event));
      this.handle.addEventListener('touchstart', (event) => this._start(event), { passive: false });
    }

    _start(event) {
      event.preventDefault();
      const pt = event.touches ? event.touches[0] : event;
      this._ox = pt.clientX - this.el.offsetLeft;
      this._oy = pt.clientY - this.el.offsetTop;
      this.handle.style.cursor = 'grabbing';

      this._emit('start');

      const move = (ev) => {
        const p = ev.touches ? ev.touches[0] : ev;
        let nx = p.clientX - this._ox;
        let ny = p.clientY - this._oy;

        if (this.bounds === 'parent' && this.el.parentElement) {
          const par = this.el.parentElement;
          nx = Math.max(0, Math.min(nx, par.offsetWidth - this.el.offsetWidth));
          ny = Math.max(0, Math.min(ny, par.offsetHeight - this.el.offsetHeight));
        } else if (this.bounds === 'window') {
          nx = Math.max(0, Math.min(nx, window.innerWidth - this.el.offsetWidth));
          ny = Math.max(0, Math.min(ny, window.innerHeight - this.el.offsetHeight));
        }

        if (this.axis !== 'y') this.el.style.left = `${nx}px`;
        if (this.axis !== 'x') this.el.style.top = `${ny}px`;

        this._emit('move', { x: nx, y: ny });
      };

      const end = () => {
        this.handle.style.cursor = 'grab';
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', end);
        document.removeEventListener('touchmove', move);
        document.removeEventListener('touchend', end);

        this._emit('end');
      };

      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', end);
      document.addEventListener('touchmove', move, { passive: false });
      document.addEventListener('touchend', end);
    }

    _emit(type, detail = {}) {
      if (window.SW?.emit) {
        window.SW.emit(this.el, `sw:drag:${type}`, detail);
        window.SW.emit(this.el, `swdrag:${type}`, detail);
      }
      this.el.dispatchEvent(new CustomEvent(`sw:drag:${type}`, { detail, bubbles: true }));
      this.el.dispatchEvent(new CustomEvent(`yd:y2drag:${type}`, { detail, bubbles: true }));
    }
  }

  class SWDrag {
    static initAll(root = document) {
      const els = (root.querySelectorAll ? root : document).querySelectorAll('[sw-drag], [swdrag], [y2drag]');
      els.forEach((el) => {
        if (el._swDrag || el._y2Mov) return;
        const inst = new SWDragInst(el);
        el._swDrag = inst;
        el._swMov = inst;
        el._y2Mov = inst;
      });
    }
  }

  window.SWDrag = SWDrag;
  window.SWMov = SWDrag;
  window.Y2Drag = SWDrag;
  if (window.SW?.register) window.SW.register('SWDrag', SWDrag);
  if (window.SW) {
    window.SW.Drag = SWDrag;
    window.SW.Mov = SWDrag;
  }
})();
