/* SW Framework Rich Text Editor — <textarea sw-editor sw-editor-simple sw-editor-height sw-editor-min sw-editor-max sw-editor-resizable> */
(function () {
  'use strict';

  class SWEditorInst {
    constructor(el) {
      this.el = el;
      this.name = el.getAttribute('name') || el.getAttribute('sw-editor-name') || 'content';
      this.ph = el.getAttribute('sw-editor-placeholder') || el.getAttribute('placeholder') || '';
      this.h = parseInt(el.getAttribute('sw-editor-height'), 10) || 150;
      this.minH = parseInt(el.getAttribute('sw-editor-min'), 10) || 100;
      this.maxH = parseInt(el.getAttribute('sw-editor-max'), 10) || 800;
      this.rzbl = el.getAttribute('sw-editor-resizable') !== 'false';
      this.isSimple = el.hasAttribute('sw-editor-simple') || el.getAttribute('sw-editor-mode') === 'simple';
      this.val = el.value || '';
      this._render();
      this._bind();
    }

    _render() {
      const box = document.createElement('div');
      box.className = 'sw-editor-box' + (this.isSimple ? ' is-simple' : '');

      const tb = document.createElement('div');
      tb.className = 'sw-editor-tb';

      if (!this.isSimple) {
        const fmtGrp = document.createElement('div');
        fmtGrp.className = 'sw-editor-grp';
        const fmt = document.createElement('select');
        fmt.className = 'sw-editor-fmt';
        fmt.title = 'Formato do bloco';
        fmt.innerHTML = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].map((t) => `<option value="${t}">${t}</option>`).join('');
        fmtGrp.appendChild(fmt);
        tb.appendChild(fmtGrp);
        this.fmt = fmt;
      }

      const groups = this.isSimple
        ? [
          [
            ['bold', '<b>B</b>', 'Negrito (Ctrl+B)'],
            ['italic', '<i>I</i>', 'Itálico (Ctrl+I)'],
            ['underline', '<u>U</u>', 'Sublinhado (Ctrl+U)'],
            ['strikeThrough', '<s>S</s>', 'Tachado']
          ]
        ]
        : [
          [
            ['bold', '<i class="swi swi-bold"></i>', 'Negrito (Ctrl+B)'],
            ['italic', '<i class="swi swi-italic"></i>', 'Itálico (Ctrl+I)'],
            ['underline', '<i class="swi swi-underline"></i>', 'Sublinhado (Ctrl+U)'],
            ['strikeThrough', '<i class="swi swi-strikethrough"></i>', 'Tachado']
          ],
          [
            ['foreColor', '<i class="swi swi-font-color"></i>', 'Cor da fonte'],
            ['backColor', '<i class="swi swi-highlight"></i>', 'Cor de fundo'],
            ['clean', '<i class="swi swi-eraser"></i>', 'Limpar formatação']
          ],
          [
            ['justifyLeft', '<i class="swi swi-align-left"></i>', 'Alinhar esquerda'],
            ['justifyCenter', '<i class="swi swi-align-middle"></i>', 'Centralizar'],
            ['justifyRight', '<i class="swi swi-align-right"></i>', 'Alinhar direita'],
            ['justifyFull', '<i class="swi swi-align-justify"></i>', 'Justificar']
          ],
          [
            ['insertUnorderedList', '<i class="swi swi-list-ul"></i>', 'Lista'],
            ['insertOrderedList', '<i class="swi swi-list-ol"></i>', 'Lista numerada'],
            ['hr', '<i class="swi swi-minus"></i>', 'Linha horizontal'],
            ['link', '<i class="swi swi-link"></i>', 'Link (Ctrl+K)'],
            ['image', '<i class="swi swi-image"></i>', 'Imagem'],
            ['code', '<i class="swi swi-code"></i>', 'Ver HTML'],
            ['fullscreen', '<i class="swi swi-expand"></i>', 'Tela cheia']
          ]
        ];

      groups.forEach((grp) => {
        const g = document.createElement('div');
        g.className = 'sw-editor-grp';
        grp.forEach(([cmd, content, title]) => {
          g.innerHTML += `<button type="button" class="sw-editor-btn" data-cmd="${cmd}" title="${title}">${content}</button>`;
        });
        tb.appendChild(g);
      });

      if (!this.isSimple) {
        const fgI = document.createElement('input');
        fgI.type = 'color'; fgI.className = 'sw-editor-fg'; fgI.value = '#e53e3e';
        fgI.style.cssText = 'position:absolute;opacity:0;width:1px;height:1px;pointer-events:none';
        const bgI = document.createElement('input');
        bgI.type = 'color'; bgI.className = 'sw-editor-bg'; bgI.value = '#ffff00';
        bgI.style.cssText = 'position:absolute;opacity:0;width:1px;height:1px;pointer-events:none';
        tb.appendChild(fgI);
        tb.appendChild(bgI);
        this.fgI = fgI;
        this.bgI = bgI;

        window.setTimeout(() => {
          const fgBtn = tb.querySelector('[data-cmd="foreColor"]');
          if (fgBtn) {
            fgBtn.style.position = 'relative';
            fgBtn.appendChild(fgI);
            fgI.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;cursor:pointer';
          }
          const bgBtn = tb.querySelector('[data-cmd="backColor"]');
          if (bgBtn) {
            bgBtn.style.position = 'relative';
            bgBtn.appendChild(bgI);
            bgI.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;cursor:pointer';
          }
        }, 0);
      }

      const wrap = document.createElement('div');
      wrap.className = 'sw-editor-wrap';
      const ed = document.createElement('div');
      ed.className = 'sw-editor-ed';
      ed.contentEditable = 'true';
      ed.style.minHeight = `${this.h}px`;
      if (this.ph) ed.setAttribute('placeholder', this.ph);
      ed.innerHTML = this.val || '<p><br></p>';

      const code = document.createElement('textarea');
      code.className = 'sw-editor-code';
      code.value = ed.innerHTML;
      code.spellcheck = false;

      wrap.appendChild(ed);
      wrap.appendChild(code);

      const hidden = document.createElement('textarea');
      hidden.className = 'sw-editor-hidden';
      hidden.name = this.name;
      hidden.style.display = 'none';
      hidden.value = ed.innerHTML;

      const rz = document.createElement('div');
      rz.className = 'sw-editor-rz';
      rz.innerHTML = '<i class="swi swi-minus"></i>';
      if (!this.rzbl) rz.style.display = 'none';

      const stat = document.createElement('div');
      stat.className = 'sw-editor-stat';
      stat.innerHTML = '<span class="sw-editor-chars">0 caracteres · 0 palavras</span>';

      box.appendChild(tb);
      box.appendChild(wrap);
      box.appendChild(rz);
      box.appendChild(stat);
      box.appendChild(hidden);

      this.el.parentNode.insertBefore(box, this.el.nextSibling);
      this.el.style.display = 'none';

      this.box = box; this.tb = tb; this.wrap = wrap;
      this.ed = ed; this.code = code; this.hidden = hidden;
      this.rz = rz; this.stat = stat;
      this._updateStatus();
    }

    _bind() {
      this._sel = null;
      const saveSel = () => {
        const s = window.getSelection();
        if (s && s.rangeCount) { try { this._sel = s.getRangeAt(0).cloneRange(); } catch (_) { this._sel = null; } }
      };
      const restSel = () => {
        if (!this._sel) return;
        try { const s = window.getSelection(); s.removeAllRanges(); s.addRange(this._sel); } catch (_) { /* seleção fora do documento */ }
      };

      this.ed.addEventListener('mouseup', saveSel);
      this.ed.addEventListener('keyup', saveSel);
      this.ed.addEventListener('focus', saveSel);
      if (this.fgI) this.fgI.addEventListener('mousedown', saveSel);
      if (this.bgI) this.bgI.addEventListener('mousedown', saveSel);

      this.tb.addEventListener('mousedown', (event) => {
        const btn = event.target.closest('.sw-editor-btn');
        if (!btn) return;
        const cmd = btn.getAttribute('data-cmd');
        saveSel();
        if (cmd === 'foreColor' || cmd === 'backColor') return;
        event.preventDefault();
        this._exec(cmd, restSel);
        window.setTimeout(() => { this.ed.focus(); this._updateBtns(); }, 0);
      });

      if (this.fmt) {
        this.fmt.addEventListener('change', () => {
          document.execCommand('formatBlock', false, this.fmt.value);
          this._sync(); this.ed.focus(); this._updateBtns();
        });
      }

      if (this.fgI) {
        this.fgI.addEventListener('input', () => {
          this.ed.focus(); restSel();
          document.execCommand('foreColor', false, this.fgI.value);
          this._sync();
        });
      }
      if (this.bgI) {
        this.bgI.addEventListener('input', () => {
          this.ed.focus(); restSel();
          document.execCommand('hiliteColor', false, this.bgI.value);
          this._sync();
        });
      }

      this.ed.addEventListener('input', () => { this._sync(); this._updateStatus(); });
      this.ed.addEventListener('keyup', () => this._updateBtns());
      this.ed.addEventListener('mouseup', () => this._updateBtns());
      this.ed.addEventListener('keydown', (event) => this._shortcuts(event, restSel));
      this.code.addEventListener('input', () => { this._sync(); this._updateStatus(); });

      if (this.rzbl) this._bindResize();
    }

    _bindResize() {
      let startY = 0;
      let startH = 0;
      const move = (event) => {
        const h = Math.max(this.minH, Math.min(this.maxH, startH + event.clientY - startY));
        this.wrap.style.height = `${h}px`;
        this.ed.style.minHeight = `${h}px`;
      };
      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        this.box.classList.remove('sw-editor-resizing');
        document.body.style.userSelect = '';
      };
      this.rz.addEventListener('mousedown', (event) => {
        event.preventDefault();
        startY = event.clientY;
        startH = this.wrap.offsetHeight;
        this.box.classList.add('sw-editor-resizing');
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
      });
    }

    _exec(cmd, restSel) {
      if (cmd === 'code') {
        const show = this.code.style.display !== 'block';
        if (show) {
          this.code.value = this.ed.innerHTML;
          this.code.style.minHeight = `${this.ed.offsetHeight}px`;
          this.ed.style.display = 'none';
          this.code.style.display = 'block';
          this.box.classList.add('sw-editor-codeview');
        } else {
          this.ed.innerHTML = this.code.value;
          this.code.style.display = 'none';
          this.ed.style.display = '';
          this.box.classList.remove('sw-editor-codeview');
        }
        this._sync(); this._updateBtns(); return;
      }
      if (cmd === 'clean') { document.execCommand('removeFormat'); document.execCommand('unlink'); this._sync(); return; }
      if (cmd === 'hr') { document.execCommand('insertHorizontalRule'); this._sync(); return; }
      if (cmd === 'link') { const u = window.prompt('URL do link:'); if (u) { this.ed.focus(); restSel(); document.execCommand('createLink', false, u); } this._sync(); return; }
      if (cmd === 'image') { const u = window.prompt('URL da imagem:'); if (u) { this.ed.focus(); restSel(); document.execCommand('insertImage', false, u); } this._sync(); return; }
      if (cmd === 'fullscreen') {
        const on = !this.box.classList.contains('sw-editor-fullscreen');
        this.box.classList.toggle('sw-editor-fullscreen', on);
        document.body.style.overflow = on ? 'hidden' : '';
        this.wrap.style.height = on ? 'calc(100vh - 10rem)' : '';
        this._updateBtns(); return;
      }
      if (cmd === 'undo' || cmd === 'redo') { document.execCommand(cmd); this._sync(); return; }
      this.ed.focus();
      if (this._sel) restSel();
      document.execCommand(cmd);
      this._sync();
    }

    _sync() {
      if (this.code.style.display === 'block') {
        this.hidden.value = this.code.value;
      } else {
        this.hidden.value = this.ed.innerHTML;
        this.code.value = this.ed.innerHTML;
      }
    }

    _updateStatus() {
      const t = this.ed.innerText || '';
      const w = t.trim() ? t.trim().split(/\s+/).length : 0;
      this.stat.querySelector('.sw-editor-chars').textContent = `${t.length} caracteres · ${w} palavras`;
    }

    _updateBtns() {
      this.tb.querySelectorAll('.sw-editor-btn').forEach((b) => b.classList.remove('is-act'));
      ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'].forEach((cmd) => {
        try { if (document.queryCommandState(cmd)) this.tb.querySelector(`[data-cmd="${cmd}"]`)?.classList.add('is-act'); } catch (_) { /* comando indisponível neste contexto */ }
      });
      if (this.code.style.display === 'block') this.tb.querySelector('[data-cmd="code"]')?.classList.add('is-act');
      if (this.box.classList.contains('sw-editor-fullscreen')) this.tb.querySelector('[data-cmd="fullscreen"]')?.classList.add('is-act');
      if (this.fmt) {
        try { const fb = document.queryCommandValue('formatBlock'); if (fb) this.fmt.value = fb.toUpperCase(); } catch (_) { /* comando indisponível neste contexto */ }
      }
    }

    _shortcuts(event, restSel) {
      if (!event.ctrlKey && !event.metaKey) return;
      const k = event.key.toLowerCase();
      const map = { b: 'bold', i: 'italic', u: 'underline', k: 'link', z: 'undo', y: 'redo' };
      const fmts = { 0: 'P', 1: 'H1', 2: 'H2', 3: 'H3', 4: 'H4', 5: 'H5', 6: 'H6' };
      if (map[k]) { event.preventDefault(); this._exec(map[k], restSel); this._sync(); }
      else if (fmts[k] && this.fmt) { event.preventDefault(); document.execCommand('formatBlock', false, fmts[k]); this._sync(); }
    }

    getValue() { return this.hidden.value; }
    setValue(html) { this.ed.innerHTML = html || '<p><br></p>'; this._sync(); this._updateStatus(); }
  }

  class SWEditor {
    static initAll(root = document) {
      SW.$('[sw-editor]', root).forEach((el) => {
        if (el._swEditor) return;
        el._swEditor = new SWEditorInst(el);
      });
    }
  }

  window.SW?.register('SWEditor', SWEditor);
  if (window.SW) window.SW.Editor = SWEditor;
})();
