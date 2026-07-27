/* SW Framework Drag — [sw-drag] sw-drag-handle/-axis/-bounds */
(function () {
  'use strict';

  class SWDragInst {
    constructor(el) {
      this.el = el;
      this.handle = el.getAttribute('sw-drag-handle') ? el.querySelector(el.getAttribute('sw-drag-handle')) : el;
      this.axis = el.getAttribute('sw-drag-axis') || 'both';
      this.bounds = el.getAttribute('sw-drag-bounds') || null;

      if (!this.handle) return;
      if (el.style.position === '' || el.style.position === 'static') el.style.position = 'absolute';

      this.handle.style.cursor = 'grab';
      this.handle.addEventListener('mousedown', (event) => this._start(event));
      this.handle.addEventListener('touchstart', (event) => this._start(event), { passive: false });
    }

    _start(event) {
      event.preventDefault();
      const pt = event.touches ? event.touches[0] : event;
      const ox = pt.clientX - this.el.offsetLeft;
      const oy = pt.clientY - this.el.offsetTop;
      this.handle.style.cursor = 'grabbing';
      SW.emit(this.el, 'sw:drag:start');

      const move = (ev) => {
        const p = ev.touches ? ev.touches[0] : ev;
        let nx = p.clientX - ox;
        let ny = p.clientY - oy;

        if (this.bounds === 'parent') {
          const par = this.el.parentElement;
          nx = Math.max(0, Math.min(nx, par.offsetWidth - this.el.offsetWidth));
          ny = Math.max(0, Math.min(ny, par.offsetHeight - this.el.offsetHeight));
        } else if (this.bounds === 'window') {
          nx = Math.max(0, Math.min(nx, window.innerWidth - this.el.offsetWidth));
          ny = Math.max(0, Math.min(ny, window.innerHeight - this.el.offsetHeight));
        }

        if (this.axis !== 'y') this.el.style.left = `${nx}px`;
        if (this.axis !== 'x') this.el.style.top = `${ny}px`;
        SW.emit(this.el, 'sw:drag:move', { x: nx, y: ny });
      };
      const end = () => {
        this.handle.style.cursor = 'grab';
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', end);
        document.removeEventListener('touchmove', move);
        document.removeEventListener('touchend', end);
        SW.emit(this.el, 'sw:drag:end');
      };

      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', end);
      document.addEventListener('touchmove', move, { passive: false });
      document.addEventListener('touchend', end);
    }
  }

  class SWDrag {
    static initAll(root = document) {
      SW.$('[sw-drag]', root).forEach((el) => {
        if (el._swDrag) return;
        el._swDrag = new SWDragInst(el);
      });
    }
  }

  window.SW?.register('SWDrag', SWDrag);
  if (window.SW) window.SW.Drag = SWDrag;
})();
