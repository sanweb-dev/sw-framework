/* SW Framework Typewriter — [sw-typewriter sw-typewriter-words='["A","B"]'] */
(function () {
  'use strict';

  class SWTypewriterInst {
    constructor(el) {
      const raw = el.getAttribute('sw-typewriter-words') || el.textContent.trim();
      let words;
      try { words = JSON.parse(raw); } catch (_) { words = raw.split(',').map((w) => w.trim()); }
      this.words = words.filter(Boolean);
      this.speed = parseInt(el.getAttribute('sw-typewriter-speed'), 10) || 100;
      this.back = parseInt(el.getAttribute('sw-typewriter-back'), 10) || 50;
      this.delay = parseInt(el.getAttribute('sw-typewriter-delay'), 10) || 1500;
      this.loop = el.getAttribute('sw-typewriter-loop') !== 'false';
      this.cur = el.getAttribute('sw-typewriter-cur') ?? '|';
      this.wordIdx = 0;
      this.charIdx = 0;
      this.del = false;

      if (!this.words.length) return;
      el.textContent = '';
      el.innerHTML = `<span class="sw-typewriter-txt"></span><span class="sw-typewriter-cur" aria-hidden="true">${this.cur}</span>`;
      this._txt = el.querySelector('.sw-typewriter-txt');
      this._run();
    }

    _run() {
      const word = this.words[this.wordIdx];
      if (this.del) {
        this._txt.textContent = word.slice(0, --this.charIdx);
        if (this.charIdx === 0) {
          this.del = false;
          this.wordIdx = (this.wordIdx + 1) % this.words.length;
          window.setTimeout(() => this._run(), 300);
          return;
        }
        window.setTimeout(() => this._run(), this.back);
        return;
      }
      this._txt.textContent = word.slice(0, ++this.charIdx);
      if (this.charIdx === word.length) {
        if (!this.loop && this.wordIdx === this.words.length - 1) return;
        this.del = true;
        window.setTimeout(() => this._run(), this.delay);
        return;
      }
      window.setTimeout(() => this._run(), this.speed);
    }
  }

  class SWTypewriter {
    static initAll(root = document) {
      SW.$('[sw-typewriter]', root).forEach((el) => {
        if (el._swTypewriter) return;
        el._swTypewriter = true;
        new SWTypewriterInst(el);
      });
    }
  }

  window.SW?.register('SWTypewriter', SWTypewriter);
  if (window.SW) window.SW.Typewriter = SWTypewriter;
})();
