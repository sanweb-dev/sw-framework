/*! SW Framework 0.1.0-alpha.1 | Sandro Web Solutions | JavaScript */
/* SW Framework Core — Sandro Web Solutions */
(function () {
  'use strict';

  if (window.SW) return;

  const blockedTags = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'META', 'BASE']);
  const unsafeUrl = /^\s*(?:javascript|vbscript|data):/i;
  let reinitFrame = 0;
  let scrollLocks = 0;
  let savedBodyOverflow = '';

  const SW = {
    version: '0.1.0-alpha.1',
    _modules: new Map(),

    register(name, module) {
      if (!name || !module || this._modules.has(name)) return false;
      this._modules.set(name, module);
      if (document.readyState !== 'loading' && typeof module.initAll === 'function') {
        module.initAll(document);
      }
      return true;
    },

    reinit(root = document) {
      const safeRoot = root && typeof root.querySelectorAll === 'function' ? root : document;
      this._modules.forEach((module) => {
        if (typeof module.initAll === 'function') module.initAll(safeRoot);
      });
      this.emit(safeRoot, 'sw:reinit', { root: safeRoot });
    },

    scheduleReinit(root = document) {
      if (reinitFrame) return;
      reinitFrame = window.requestAnimationFrame(() => {
        reinitFrame = 0;
        this.reinit(root);
      });
    },

    emit(element, eventName, detail = {}) {
      const target = typeof element === 'string' ? document.querySelector(element) : (element || document);
      if (!target || !eventName) return false;
      return target.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true, cancelable: true }));
    },

    config({ hue, font, theme } = {}) {
      if (hue !== undefined) {
        const normalizedHue = Number(hue);
        if (Number.isFinite(normalizedHue)) {
          document.documentElement.style.setProperty('--sw-h-pri', String(Math.min(360, Math.max(0, normalizedHue))));
        }
      }
      if (font !== undefined && typeof font === 'string' && font.length <= 200 && !/[;{}]/.test(font)) {
        document.documentElement.style.setProperty('--sw-f-san', font.trim());
      }
      if (theme !== undefined) this.Day?.set(theme);
    },

    $(selector, root = document) {
      if (typeof selector !== 'string') return [];
      try { return Array.from((root || document).querySelectorAll(selector)); } catch (_) { return []; }
    }
  };

  SW.html = {
    sanitize(html) {
      const template = document.createElement('template');
      template.innerHTML = String(html ?? '');
      template.content.querySelectorAll('*').forEach((element) => {
        if (blockedTags.has(element.tagName)) {
          element.remove();
          return;
        }
        Array.from(element.attributes).forEach((attribute) => {
          const name = attribute.name.toLowerCase();
          if (name.startsWith('on') || name === 'srcdoc' || ((name === 'href' || name === 'src' || name === 'action') && unsafeUrl.test(attribute.value))) {
            element.removeAttribute(attribute.name);
          }
        });
      });
      return template.content;
    },

    set(target, html, { trusted = false } = {}) {
      if (!target) return;
      target.replaceChildren();
      if (trusted) {
        const template = document.createElement('template');
        template.innerHTML = String(html ?? '');
        target.appendChild(template.content.cloneNode(true));
        return;
      }
      target.appendChild(this.sanitize(html).cloneNode(true));
    }
  };

  SW.Overlay = {
    lock() {
      if (scrollLocks === 0) {
        savedBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
      scrollLocks += 1;
    },
    unlock() {
      scrollLocks = Math.max(0, scrollLocks - 1);
      if (scrollLocks === 0) document.body.style.overflow = savedBodyOverflow;
    }
  };

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => Array.from(mutation.addedNodes).some((node) => node.nodeType === Node.ELEMENT_NODE))) {
      SW.scheduleReinit(document.body);
    }
  });

  function boot() {
    SW.Day?.init();
    SW.reinit(document);
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    SW.emit(document, 'sw:ready', { version: SW.version });
  }

  document.documentElement.classList.add('sw-js');
  window.SW = SW;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

/* SW Framework Utils */
(function () {
  'use strict';
  let uidCounter = 0;
  const Utils = {
    uid(prefix = 'sw') { uidCounter += 1; return `${String(prefix).replace(/[^a-z0-9_-]/gi, '') || 'sw'}-${uidCounter}`; },
    reducedMotion() { return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches); },
    throttleFrame(callback) {
      let frame = 0;
      let lastArgs;
      return function throttled(...args) {
        lastArgs = args;
        if (frame) return;
        frame = window.requestAnimationFrame(() => { frame = 0; callback.apply(this, lastArgs); });
      };
    },
    debounce(callback, wait = 150) {
      let timer = 0;
      return function debounced(...args) {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => callback.apply(this, args), Math.max(0, Number(wait) || 0));
      };
    },
    resolve(target, root = document) {
      if (target instanceof Element) return target;
      if (typeof target !== 'string') return null;
      try { return root.querySelector(target); } catch (_) { return null; }
    },
    storage: {
      get(key) { try { return window.localStorage.getItem(key); } catch (_) { return null; } },
      set(key, value) { try { window.localStorage.setItem(key, value); return true; } catch (_) { return false; } }
    }
  };
  window.SW.Utils = Utils;
})();

/* SW Framework Day — theme controller */
(function () {
  'use strict';
  const allowedThemes = new Set(['dark', 'light']);
  const STORAGE_KEY = 'sw-theme';
  let storageBound = false;
  let keyboardBound = false;
  let fabInjected = false;

  // Resolve valores tipo var(--sw-f-san) vindos de atributo, com fallback pro segundo argumento do var().
  function resolveVar(value) {
    if (!value || !value.includes('var(')) return value;
    const match = value.match(/var\((--[^,)]+)(?:,\s*([^)]+))?\)/);
    if (!match) return value;
    return getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim() || match[2] || value;
  }

  // Site travado num único tema via <html sw-day-lock="dark"> ou <html sw-day-lock="light"> —
  // desativa a troca por completo (set/toggle/atalho/storage) e some com qualquer botão de toggle.
  function lockedTheme() {
    const raw = document.documentElement.getAttribute('sw-day-lock');
    return allowedThemes.has(raw) ? raw : null;
  }

  const SWDay = {
    get theme() {
      return document.documentElement.getAttribute('sw-theme') || 'dark';
    },
    init() {
      const locked = lockedTheme();
      if (locked) { this.set(locked, false); return; }
      const savedTheme = SW.Utils.storage.get(STORAGE_KEY);
      const systemTheme = window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      this.set(savedTheme || systemTheme, true);
    },
    set(theme, persist = true) {
      if (!allowedThemes.has(theme)) return false;
      const locked = lockedTheme();
      if (locked && theme !== locked) return false;
      document.documentElement.setAttribute('sw-theme', theme);
      document.documentElement.style.colorScheme = theme;
      if (persist) {
        SW.Utils.storage.set(STORAGE_KEY, theme);
      }
      this._syncMedia(theme);
      this._syncButtons(theme);
      SW.emit(document, 'sw:theme:change', { theme });
      return true;
    },
    setTheme(theme, persist = true) {
      return this.set(theme, persist);
    },
    toggle() {
      const current = document.documentElement.getAttribute('sw-theme') || 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      return this.set(next, true);
    },

    // Troca imagem/fundo/fonte conforme o tema via atributos [sw-day-img-{tema}], [sw-day-bg-{tema}], [sw-day-font-{tema}].
    _syncMedia(theme) {
      SW.$(`img[sw-day-img-${theme}]`).forEach((image) => {
        image.src = resolveVar(image.getAttribute(`sw-day-img-${theme}`));
      });
      SW.$(`[sw-day-bg-${theme}]`).forEach((element) => {
        const value = resolveVar(element.getAttribute(`sw-day-bg-${theme}`));
        if (value.trim().startsWith('url(')) {
          element.style.backgroundImage = value;
        } else {
          element.style.background = value;
        }
      });
      SW.$(`[sw-day-font-${theme}]`).forEach((element) => {
        element.style.fontFamily = resolveVar(element.getAttribute(`sw-day-font-${theme}`));
      });
    },

    _syncButtons(theme) {
      SW.$('[sw-day]').forEach((button) => {
        button.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
        // title é só a dica visual (tooltip) — o nome acessível vem de aria-label,
        // fixo, definido uma vez em initAll(). Não trocar aria-label aqui: precisa
        // continuar igual ao botão de tema do cabeçalho ("Alternar Tema..."),
        // independente do estado atual do tema.
        button.setAttribute('title', theme === 'light' ? 'Modo escuro' : 'Modo claro');
        const icon = button.querySelector('.sw-daytg-ico');
        if (icon) icon.className = `sw-daytg-ico ${theme === 'light' ? 'swi-moon' : 'swi-sun'}`;
      });
    },

    initAll(root = document) {
      const locked = lockedTheme();
      const theme = locked || document.documentElement.getAttribute('sw-theme') || 'dark';

      SW.$('[sw-day]', root).forEach((button) => {
        if (button._swDayBound) return;
        button._swDayBound = true;
        // Tema travado: não faz sentido mostrar um toggle que não troca nada.
        if (locked) { button.hidden = true; button.disabled = true; return; }
        if (button.tagName === 'BUTTON' && !button.hasAttribute('type')) button.setAttribute('type', 'button');
        if (!button.hasAttribute('aria-label') && !button.textContent.trim()) button.setAttribute('aria-label', 'Alternar Tema Claro/Escuro');
        if (!button.querySelector('.sw-daytg-ico') && !button.textContent.trim()) {
          const icon = document.createElement('i');
          icon.className = 'sw-daytg-ico';
          button.appendChild(icon);
        }
        button.addEventListener('click', () => this.toggle());
      });

      // Se nenhuma página registrou um botão próprio, injeta um FAB acessível — igual ao Y2Day.
      // Mesmo aria-label do botão de tema do cabeçalho (visível só até 992px, ver layout.css)
      // pra manter um único nome acessível estável entre os dois, qualquer que seja o viewport.
      // Página que não quer NENHUM botão (nem o próprio, nem o padrão) usa <html sw-day-no-fab>.
      // Tema travado (<html sw-day-lock="...">) nunca injeta FAB — não há o que alternar.
      // Botões marcados [sw-day-demo] (exemplos dentro da própria doc do módulo) não contam
      // como "a página já tem botão próprio" — senão a página que documenta o toggle seria a
      // única do site sem o FAB padrão.
      const hasRealButton = SW.$('[sw-day]').some((el) => !el.hasAttribute('sw-day-demo'));
      if (!locked && root === document && !fabInjected && !hasRealButton && !document.documentElement.hasAttribute('sw-day-no-fab')) {
        fabInjected = true;
        const fab = document.createElement('button');
        fab.type = 'button';
        fab.setAttribute('sw-day', '');
        fab.setAttribute('aria-label', 'Alternar Tema Claro/Escuro');
        fab.className = 'sw-day-fab';
        fab.title = 'Ctrl+Shift+D';
        const icon = document.createElement('i');
        icon.className = 'sw-daytg-ico';
        fab.appendChild(icon);
        fab._swDayBound = true;
        fab.addEventListener('click', () => this.toggle());
        document.body.appendChild(fab);
      }

      // Repara o boot: sw-mpa.js já cravou sw-theme no <html> bem cedo (evita flash de cor
      // errada), mas SW.Day.init() roda ANTES deste módulo existir de fato (sw-core.js chama
      // SW.Day?.init() no boot() dele, que executa antes de sw-day.js registrar SWDay — vira
      // no-op silencioso). Sem isto aqui, imagem/fundo/fonte nunca sincronizavam no carregamento
      // da página, só quando o usuário clicava — no reload eles voltavam pro padrão do HTML.
      this._syncMedia(theme);
      this._syncButtons(theme);

      if (!storageBound) {
        storageBound = true;
        window.addEventListener('storage', (event) => {
          if (event.key === STORAGE_KEY && event.newValue && allowedThemes.has(event.newValue)) {
            this.set(event.newValue, false);
          }
        });
      }
      if (!keyboardBound) {
        keyboardBound = true;
        document.addEventListener('keydown', (event) => {
          if (event.ctrlKey && event.shiftKey && (event.key === 'D' || event.key === 'd')) {
            event.preventDefault();
            this.toggle();
          }
        });
      }
    }
  };
  window.SW.Day = SWDay;
  SW.register('SWDay', SWDay);
})();

/* SW Framework Trans — native transitions and scroll reveal */
(function () {
  'use strict';
  const morphNamePattern = /^[a-z][a-z0-9_-]{0,47}$/;

  class SWTrans {
    static initAll(root = document) {
      this.initMorphs();
      this.initOverlay(root);
      this.initReveals(root);
    }

    static initReveals(root = document) {
      const elements = SW.$('[sw-scr]', root).filter((element) => !element._swTransInit);
      if (!elements.length) return;
      if (SW.Utils.reducedMotion() || !('IntersectionObserver' in window)) {
        elements.forEach((element) => { element._swTransInit = true; element.classList.add('is-revealed'); });
        return;
      }
      if (!this.observer) {
        this.observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-revealed');
            SW.emit(entry.target, 'sw:trans:reveal');
            this.observer.unobserve(entry.target);
          });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      }
      elements.forEach((element) => { element._swTransInit = true; this.observer.observe(element); });
    }

    static initMorphs() {
      const groups = new Map();
      SW.$('[sw-morph]').forEach((element) => {
        const name = (element.getAttribute('sw-morph') || '').trim().toLowerCase();
        element.style.removeProperty('view-transition-name');
        if (!morphNamePattern.test(name)) {
          SW.emit(element, 'sw:trans:morph-invalid', { name, reason: 'invalid' });
          return;
        }
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name).push(element);
      });
      groups.forEach((elements, name) => {
        if (elements.length !== 1) {
          elements.forEach((element) => SW.emit(element, 'sw:trans:morph-invalid', { name, reason: 'duplicate' }));
          return;
        }
        elements[0].style.viewTransitionName = `sw-${name}`;
      });
    }

    static initOverlay(root = document) {
      const candidate = root.matches?.('[sw-trans-overlay]') ? root : root.querySelector?.('[sw-trans-overlay]');
      if (candidate && (!this.overlayElement || !this.overlayElement.isConnected)) this.overlayElement = candidate;
      if (!this.overlayElement) return;
      this.overlayElement.setAttribute('role', this.overlayElement.getAttribute('role') || 'status');
      this.overlayElement.setAttribute('aria-live', this.overlayElement.getAttribute('aria-live') || 'polite');
      if (!this.overlayElement.hasAttribute('aria-hidden')) this.overlayElement.setAttribute('aria-hidden', 'true');
      if (this.overlayElement.getAttribute('aria-hidden') !== 'false') this.overlayElement.hidden = true;
    }

    static ensureOverlay() {
      if (this.overlayElement?.isConnected) return this.overlayElement;
      const existing = document.querySelector('[sw-trans-overlay]');
      if (existing) {
        this.overlayElement = existing;
        this.initOverlay(existing);
        return existing;
      }
      const overlay = document.createElement('div');
      const inner = document.createElement('div');
      const indicator = document.createElement('span');
      const message = document.createElement('span');
      overlay.setAttribute('sw-trans-overlay', '');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.hidden = true;
      inner.className = 'sw-trans-overlay__inner';
      indicator.className = 'sw-trans-overlay__indicator';
      indicator.setAttribute('aria-hidden', 'true');
      message.setAttribute('sw-trans-message', '');
      message.textContent = 'Carregando';
      inner.append(indicator, message);
      overlay.append(inner);
      document.body.append(overlay);
      this.overlayElement = overlay;
      this.initOverlay(overlay);
      return overlay;
    }

    static show(message = 'Carregando') {
      const overlay = this.ensureOverlay();
      window.clearTimeout(this.overlayTimer);
      this.overlayDepth = (this.overlayDepth || 0) + 1;
      const messageElement = overlay.querySelector('[sw-trans-message]');
      if (messageElement) messageElement.textContent = String(message || 'Carregando').slice(0, 160);
      overlay.hidden = false;
      overlay.setAttribute('aria-hidden', 'false');
      document.documentElement.setAttribute('aria-busy', 'true');
      SW.emit(overlay, 'sw:trans:overlay-show');
      return overlay;
    }

    static hide({ force = false } = {}) {
      const overlay = this.overlayElement;
      if (!overlay) return;
      this.overlayDepth = force ? 0 : Math.max(0, (this.overlayDepth || 0) - 1);
      if (this.overlayDepth > 0) return;
      overlay.setAttribute('aria-hidden', 'true');
      document.documentElement.removeAttribute('aria-busy');
      SW.emit(overlay, 'sw:trans:overlay-hide');
      const finish = () => { if ((this.overlayDepth || 0) === 0) overlay.hidden = true; };
      if (SW.Utils.reducedMotion()) finish();
      else this.overlayTimer = window.setTimeout(finish, 220);
    }

    static async during(task, { message = 'Carregando' } = {}) {
      if (typeof task !== 'function') throw new TypeError('SW.Trans.during requer uma função.');
      this.show(message);
      try { return await task(); }
      finally { this.hide(); }
    }

    static run(update, { skip = false } = {}) {
      if (typeof update !== 'function') return null;
      if (skip || SW.Utils.reducedMotion() || !document.startViewTransition) { update(); return null; }
      return document.startViewTransition(update);
    }
  }
  SWTrans.overlayDepth = 0;
  window.SW?.register('SWTrans', SWTrans);
  if (window.SW) window.SW.Trans = SWTrans;
})();

/* ==========================================================================
   SW FRAMEWORK — SW-CODE.JS (SYNTAX HIGHLIGHTER ZERO-DEPENDÊNCIA)
   Port de Alta Fidelidade do Y2Code para o Ecossistema Nill / SW Framework
   Nill Ecosystem | Sandro Web Solutions
   ========================================================================== */

(function () {
  'use strict';

  class SWCode {
    static initAll(root = document) {
      const seen = new Set();
      const selectors = 'pre[swcode], pre[sw-code], pre[data-swcode], pre[data-sw-code], pre[y2code], pre[y2-code], pre[data-y2code], pre[data-y2-code]';
      
      const elements = (window.SW && typeof window.SW.$$ === 'function') 
        ? window.SW.$$(selectors, root) 
        : Array.from((root || document).querySelectorAll(selectors));

      elements.forEach(pre => {
        if (pre && !pre._swDone && !pre._y2Done) {
          seen.add(pre);
        }
      });

      const languageCodes = (window.SW && typeof window.SW.$$ === 'function')
        ? window.SW.$$('code[class*="language-"], code[class*="lang-"]', root)
        : Array.from((root || document).querySelectorAll('code[class*="language-"], code[class*="lang-"]'));

      languageCodes.forEach(code => {
        const pre = code.parentElement;
        if (pre && pre.tagName === 'PRE' && !pre._swDone && !pre._y2Done) {
          seen.add(pre);
        }
      });

      seen.forEach(pre => { SWCode._process(pre); });
    }

    static _esc(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    static _highlight(code, lang) {
      code = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const tokens = [];
      let tokenIndex = 0;
      function ph(content, cls) {
        const k = `__TOKEN_${tokenIndex}__`;
        const tk = cls.replace('tk-', '');
        tokens[tokenIndex] = `<span tk="${tk}">${content}</span>`;
        tokenIndex++;
        return k;
      }

      let res = code;

      if (lang === 'js' || lang === 'javascript' || lang === 'ts' || lang === 'typescript') {
        res = res
          .replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, m => ph(m, 'tk-com'))
          .replace(/('[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*"|`[^`\\]*(?:\\.[^`\\]*)*`)/g, m => ph(m, 'tk-str'))
          .replace(/\b(const|let|var|function|return|if|else|for|while|break|continue|switch|case|default|try|catch|finally|throw|new|class|extends|super|import|from|export|async|await|this|typeof|instanceof)\b/g, m => ph(m, 'tk-kw'))
          .replace(/\b(true|false|null|undefined)\b/g, m => ph(m, 'tk-bln'))
          .replace(/\b(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, m => ph(m, 'tk-num'))
          .replace(/\b([a-zA-Z_$][\w$]*)\s*(?=\()/g, (m, f) => f.startsWith('__TOKEN_') ? m : ph(f, 'tk-fn') + m.slice(f.length));
      } else if (lang === 'css' || lang === 'scss' || lang === 'less') {
        res = res
          .replace(/(\/\*[\s\S]*?\*\/)/g, m => ph(m, 'tk-com'))
          .replace(/(@[\w-]+)/g, m => ph(m, 'tk-at'))
          .replace(/(^|\}|\n)([^\{\n]+?)(\s*\{)/g, (m, p, s, b) => p + ph(s.trim(), 'tk-tag') + b)
          .replace(/(--[\w-]+)/g, m => ph(m, 'tk-var'))
          .replace(/([\w-]+)(\s*:\s*)/g, (m, p, s) => ph(p, 'tk-prp') + s)
          .replace(/(:\s*)([^;\}]+)/g, (m, s, v) => s + ph(v, 'tk-str'))
          .replace(/(\b\d+(?:\.\d+)?(px|em|rem|%|vh|vw|ch|ex|cm|mm|in|pt|pc)?\b)/g, m => ph(m, 'tk-num'));
      } else if (lang === 'php') {
        res = res
          .replace(/(&lt;\?php|&lt;\?|\?&gt;)/gi, m => ph(m, 'tk-kw'))
          .replace(/(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)/g, m => ph(m, 'tk-com'))
          .replace(/('[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*")/g, m => ph(m, 'tk-str'))
          .replace(/\b(abstract|and|array|as|break|callable|case|catch|class|clone|const|continue|declare|default|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|eval|exit|extends|final|finally|fn|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|match|namespace|new|or|parent|print|private|protected|public|readonly|require|require_once|return|self|static|switch|throw|trait|try|unset|use|var|while|xor|yield)\b/g, m => ph(m, 'tk-kw'))
          .replace(/(\$[a-zA-Z_][\w]*)/g, m => ph(m, 'tk-var'))
          .replace(/\b(\d+(?:\.\d+)?)\b/g, m => ph(m, 'tk-num'))
          .replace(/\b([a-zA-Z_][\w]*)\s*(?=\()/g, (m, f) => f.startsWith('__TOKEN_') ? m : ph(f, 'tk-fn') + m.slice(f.length));
      } else if (lang === 'json') {
        res = res
          .replace(/("[^"]*")/g, m => ph(m, 'tk-str'))
          .replace(/\b(\d+(?:\.\d+)?)\b/g, m => ph(m, 'tk-num'))
          .replace(/\b(true|false|null)\b/g, m => ph(m, 'tk-bln'));
      } else if (lang === 'bash' || lang === 'sh' || lang === 'shell') {
        res = res
          .replace(/(#.*$)/gm, m => ph(m, 'tk-com'))
          .replace(/('[^']*'|"[^"\\]*(?:\\.[^"\\]*)*")/g, m => ph(m, 'tk-str'))
          .replace(/\b(if|then|else|elif|fi|for|in|do|done|while|until|case|esac|function|return|exit|break|continue|local|export|source|echo|read|shift|set|unset|trap|eval)\b/g, m => ph(m, 'tk-kw'))
          .replace(/(\$\{[^}]+\}|\$[a-zA-Z_][\w]*)/g, m => ph(m, 'tk-var'))
          .replace(/\b(\d+)\b/g, m => ph(m, 'tk-num'));
      } else {
        // Markup/HTML/XML/SVG
        res = res
          .replace(/(&lt;!--[\s\S]*?--&gt;)/g, m => ph(m, 'tk-com'))
          .replace(/(&lt;\/?[a-zA-Z0-9\-]+)([\s\S]*?)(&gt;)/g, (m, t, a, c) => {
            let attrs = a
              .replace(/([a-zA-Z0-9\-:]+)(=)("[^"]*"|'[^']*')/g, (_, n, e, v) => ph(n, 'tk-atr') + e + ph(v, 'tk-str'))
              .replace(/\s([a-zA-Z][a-zA-Z0-9\-:]*)(?=[\s\/>]|$)/g, (_, n) => ' ' + (n.includes('TOKEN') ? n : ph(n, 'tk-atr')));
            return ph(t, 'tk-tag') + attrs + ph(c, 'tk-tag');
          });
      }

      for (let i = tokens.length - 1; i >= 0; i--) {
        res = res.replace(`__TOKEN_${i}__`, tokens[i]);
      }
      return res;
    }

    static _wrapLines(html) {
      return '<div ln>' +
        html.split(/\r?\n/).map(line => `<div ln-r><span ln-n></span><span ln-c>${line || ' '}</span></div>`).join('') +
        '</div>';
    }

    static _process(pre) {
      if (pre._swDone || pre._y2Done) return;
      pre._swDone = true;
      pre._y2Done = true;

      let lang = pre.getAttribute('swcode') || pre.getAttribute('sw-code') || pre.getAttribute('data-swcode') || pre.getAttribute('data-sw-code') || pre.getAttribute('y2code') || pre.getAttribute('y2-code') || '';
      const codeEl = pre.querySelector('code');
      if (!lang && codeEl) {
        const cls = [...codeEl.classList].find(c => c.startsWith('language-') || c.startsWith('lang-'));
        if (cls) lang = cls.replace(/lang(uage)?-/, '');
      }

      const hasLines = pre.hasAttribute('swcode-lines') || pre.hasAttribute('sw-code-lines') || pre.hasAttribute('data-swcode-lines') || pre.hasAttribute('y2code-lines') || pre.hasAttribute('data-y2code-lines');
      const script = pre.querySelector('script[type="text/plain"]');
      const raw = (script ? script.textContent : (codeEl || pre).textContent)
        // Exemplo que precisa mostrar um </script> literal tem que escapar como <\/script>
        // dentro do <script type="text/plain"> (senão fecharia o wrapper cedo demais) —
        // desfaz esse escape aqui antes de exibir, senão a barra invertida aparece na tela.
        .replace(/<\\\/script>/gi, '</script>')
        .replace(/^\s+|\s+$/g, '')
        .replace(/[\uFEFF\u200B\u0000-\u0008\u000B-\u000C\u000D-\u001F]/g, '');

      let hl = SWCode._highlight(raw, lang.toLowerCase() || 'html');
      if (hasLines) hl = SWCode._wrapLines(hl);

      const themes = ['one-dark', 'palenight', 'dracula', 'github-dark', 'monokai'];
      const initTheme = pre.getAttribute('swcode-theme') || pre.getAttribute('sw-code-theme') || pre.getAttribute('data-swcode-theme') || pre.getAttribute('y2code-theme') || 'one-dark';
      let themeIdx = Math.max(0, themes.indexOf(initTheme));

      const wrap = document.createElement('div');
      wrap._swDone = true;
      wrap._y2Done = true;
      wrap.setAttribute('swcode', '');
      wrap.setAttribute('y2code', '');
      wrap.setAttribute('swcode-theme', themes[themeIdx]);
      wrap.setAttribute('y2code-theme', themes[themeIdx]);

      const hdr = document.createElement('div');
      hdr.setAttribute('swcode-hdr', '');
      hdr.setAttribute('y2code-hdr', '');

      const badge = document.createElement('span');
      badge.setAttribute('swcode-lang', '');
      badge.setAttribute('y2code-lang', '');
      badge.textContent = lang || 'code';

      const themeBtn = document.createElement('button');
      themeBtn.type = 'button';
      themeBtn.setAttribute('swcode-thm', '');
      themeBtn.setAttribute('y2code-thm', '');
      themeBtn.textContent = themes[themeIdx];
      themeBtn.onclick = () => {
        themeIdx = (themeIdx + 1) % themes.length;
        wrap.setAttribute('swcode-theme', themes[themeIdx]);
        wrap.setAttribute('y2code-theme', themes[themeIdx]);
        themeBtn.textContent = themes[themeIdx];
      };

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('swcode-cpy', '');
      btn.setAttribute('y2code-cpy', '');
      btn.textContent = 'Copiar';
      btn.onclick = () => {
        navigator.clipboard.writeText(raw).then(() => {
          btn.textContent = 'Copiado!';
          btn.classList.add('swcode-act');
          btn.classList.add('y2code-act');
          setTimeout(() => {
            btn.textContent = 'Copiar';
            btn.classList.remove('swcode-act');
            btn.classList.remove('y2code-act');
          }, 1200);
        });
      };

      hdr.appendChild(badge);
      hdr.appendChild(themeBtn);
      hdr.appendChild(btn);

      const newPre = document.createElement('pre');
      newPre._swDone = true;
      newPre._y2Done = true;
      newPre.setAttribute('swcode-pre', '');
      newPre.setAttribute('y2code-pre', '');
      if (hasLines) {
        newPre.setAttribute('swcode-lines', '');
        newPre.setAttribute('y2code-lines', '');
      }
      newPre.innerHTML = hl;

      if (pre.parentNode) {
        pre.parentNode.insertBefore(wrap, pre);
        wrap.appendChild(hdr);
        wrap.appendChild(newPre);
        pre.parentNode.removeChild(pre);
      }
    }
  }

  window.SW?.register('SWCode', SWCode);
  if (window.SW) window.SW.Code = SWCode;
  window.SWCode = SWCode;
  window.Y2Code = SWCode;
})();

/* SW Framework Icon — inline loader for the IconPark set (currentColor-aware) */
(function () {
  'use strict';

  const cache = new Map();
  const canFetch = window.location.protocol !== 'file:';

  // Calculado a cada chamada (não uma vez no carregamento do módulo): a navegação
  // via AJAX do portal troca a URL com pushState sem recarregar este script, então
  // um valor fixo calculado no início ficaria errado assim que o caminho mudasse.
  function defaultBasePath() {
    const match = window.location.pathname.match(/^(.*\/docs\/)/);
    return match ? `${match[1]}dist/icons/` : (window.location.pathname.includes('/pages/') ? '../dist/icons/' : 'dist/icons/');
  }

  async function fetchIcon(iconPath) {
    if (cache.has(iconPath)) return cache.get(iconPath);
    if (!canFetch) {
      // fetch() não funciona sob file:// (sem servidor); evita erro de rede no console.
      cache.set(iconPath, Promise.resolve(''));
      return '';
    }
    const basePath = SWIcon.basePath ?? defaultBasePath();
    const promise = fetch(`${basePath}${iconPath}.svg`)
      .then((response) => { if (!response.ok) throw new Error(`Ícone não encontrado: ${iconPath}`); return response.text(); })
      .catch((error) => { console.warn('[SW-Icon]', error.message); return ''; });
    cache.set(iconPath, promise);
    return promise;
  }

  // Atalho tipo "icon font" (<i class="sw-bell">) usado nas páginas de docs — mapeia
  // o nome curto pro ícone real do IconPark. Não substitui sw-icon="Categoria/nome",
  // que continua sendo a forma canônica e cobre todos os 2.658 ícones.
  const FONT_ALIASES = {
    bell: 'Music/bell-ring', box: 'Office/box', calendar: 'Edit/calendar',
    chart: 'Charts/chart-histogram-one', check: 'Character/check', 'check-circle': 'Character/check-one',
    'chevron-left': 'Arrows/arrow-left', 'chevron-right': 'Arrows/arrow-right', clock: 'Time/alarm-clock',
    columns: 'Edit/column', copy: 'Edit/copy', cpu: 'Hardware/cpu', 'day-ico': 'Weather/sun',
    download: 'Arrows/download', eye: 'Base/preview-open', file: 'Office/file-text-one',
    folder: 'Office/folder', grid: 'Edit/grid-four', heart: 'Health/heart',
    'horizontal-right': 'Arrows/arrow-right', image: 'Office/image-files', 'info-circle': 'Character/info',
    input: 'Others/voice-input', layout: 'Edit/layout-four', 'layout-grid': 'Edit/grid-four',
    list: 'Edit/list', 'list-ul': 'Components/checklist', mail: 'Office/mail', map: 'Charts/area-map',
    mobile: 'Hardware/phone-one', money: 'Money/paper-money', moon: 'Weather/moon',
    palette: 'Operate/color-filter', search: 'Base/search', 'shape-triangle': 'Safe/alarm',
    shield: 'Safe/shield', star: 'Edit/star', 'star-off': 'Edit/star', sun: 'Weather/sun',
    tag: 'Base/tag', upload: 'Arrows/upload', user: 'Peoples/user', users: 'Peoples/peoples',
    warning: 'Safe/alarm', world: 'Travel/world', x: 'Character/close-small', zap: 'Hardware/bolt-one',
  };

  // Logos de marca (<i class="y2l-github">) — subconjunto real disponível no IconPark.
  // linkedin e firefox não existem no set (2.658 ícones) e ficam sem ícone.
  const BRAND_ALIASES = {
    github: 'Brand/github', twitter: 'Brand/twitter', behance: 'Brand/behance',
    dribbble: 'Brand/dribble', youtube: 'Brand/youtube', instagram: 'Brand/instagram',
    facebook: 'Brand/facebook', telegram: 'Brand/telegram', figma: 'Brand/figma',
  };

  class SWIcon {
    static basePath = null; // sobrescreva se a estrutura de pastas do consumidor for diferente

    static async use(target, iconPath) {
      const element = typeof target === 'string' ? document.querySelector(target) : target;
      if (!(element instanceof Element) || !iconPath) return false;
      const markup = await fetchIcon(iconPath);
      if (!markup) return false;
      element.innerHTML = markup;
      const svg = element.querySelector('svg');
      if (svg) { svg.removeAttribute('width'); svg.removeAttribute('height'); svg.classList.add('sw-icon-svg'); }
      element.setAttribute('data-sw-icon-state', 'ready');
      return true;
    }

    static initAll(root = document) {
      SW.$('[sw-icon]', root).forEach((element) => {
        const iconPath = element.getAttribute('sw-icon');
        if (element.getAttribute('data-sw-icon-state') === 'ready' || !iconPath) return;
        SWIcon.use(element, iconPath);
      });

      SW.$('i', root).forEach((element) => {
        if (element.getAttribute('data-sw-icon-state') === 'ready') return;
        const classes = Array.from(element.classList);
        const swName = classes.find((cls) => cls.startsWith('sw-') && FONT_ALIASES[cls.slice(3)]);
        const brandName = classes.find((cls) => cls.startsWith('y2l-') && BRAND_ALIASES[cls.slice(4)]);
        const iconPath = swName ? FONT_ALIASES[swName.slice(3)] : brandName ? BRAND_ALIASES[brandName.slice(4)] : null;
        if (!iconPath) return;
        element.classList.add('sw-icon-font');
        SWIcon.use(element, iconPath);
      });
    }
  }

  window.SW?.register('SWIcon', SWIcon);
  if (window.SW) window.SW.Icon = SWIcon;
})();

/* SW Framework Modal */
(function () {
  'use strict';
  const focusable = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  class SWModal {
    static initAll(root = document) {
      SW.$('[sw-modal-open], [sw-modal]', root).forEach((trigger) => {
        if (trigger._swModalInit) return;
        trigger._swModalInit = true;
        trigger.addEventListener('click', (event) => {
          const selector = trigger.getAttribute('sw-modal-open') || trigger.getAttribute('sw-modal');
          if (!selector?.startsWith('#')) return;
          event.preventDefault();
          SWModal.show(selector, trigger);
        });
      });
      SW.$('.sw-modal', root).forEach((modal) => {
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-hidden', modal.classList.contains('is-active') ? 'false' : 'true');
        if (modal._swModalCloseInit) return;
        modal._swModalCloseInit = true;
        modal.addEventListener('click', (event) => {
          if (event.target === modal || event.target.closest('[sw-modal-close]')) SWModal.hide(modal);
        });
      });
    }

    static show(target, trigger = document.activeElement) {
      const modal = typeof target === 'string' ? document.querySelector(target) : target;
      if (!modal || modal.classList.contains('is-active')) return false;
      modal._swPreviousFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
      modal.classList.add('is-active');
      modal.setAttribute('aria-hidden', 'false');
      SW.Overlay.lock();
      modal._swKeydown = (event) => {
        if (event.key === 'Escape') SWModal.hide(modal);
        if (event.key === 'Tab') SWModal.trapFocus(modal, event);
      };
      window.addEventListener('keydown', modal._swKeydown);
      window.requestAnimationFrame(() => (modal.querySelector('[autofocus], [sw-modal-close], ' + focusable) || modal).focus({ preventScroll: true }));
      if (!modal.hasAttribute('tabindex')) modal.setAttribute('tabindex', '-1');
      SW.emit(modal, 'sw:modal:open');
      return true;
    }

    static hide(target) {
      const modal = typeof target === 'string' ? document.querySelector(target) : target;
      if (!modal?.classList.contains('is-active')) return false;
      modal.classList.remove('is-active');
      modal.setAttribute('aria-hidden', 'true');
      window.removeEventListener('keydown', modal._swKeydown);
      SW.Overlay.unlock();
      modal._swPreviousFocus?.focus?.({ preventScroll: true });
      SW.emit(modal, 'sw:modal:close');
      return true;
    }

    static trapFocus(modal, event) {
      const items = SW.$(focusable, modal).filter((element) => !element.hidden && element.getClientRects().length);
      if (!items.length) { event.preventDefault(); modal.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }

  window.SW?.register('SWModal', SWModal);
  if (window.SW) window.SW.Modal = SWModal;
})();

/* SW Framework Alert — portado do Y2Alert (y2.sanweb.com.br), CSS injetado em runtime */
(function () {
  'use strict';

  class SWAlert {
    static _boxes = {};
    static _cssReady = false;

    static _css() {
      if (SWAlert._cssReady) return;
      SWAlert._cssReady = true;
      const s = document.createElement('style');
      s.id = '_sw-alert-css';
      s.textContent = `
.sw-alert-box{position:fixed;z-index:999999;display:flex;flex-direction:column;gap:1.2rem;pointer-events:none;width:min(42rem,calc(100vw - 3.2rem))}
.sw-alert-box.tl{top:2rem;left:2rem}.sw-alert-box.tc{top:2rem;left:50%;transform:translateX(-50%)}
.sw-alert-box.tr{top:2rem;right:2rem}.sw-alert-box.bl{bottom:2rem;left:2rem}
.sw-alert-box.bc{bottom:2rem;left:50%;transform:translateX(-50%)}.sw-alert-box.br{bottom:2rem;right:2rem}
.sw-alert-box.cl{top:50%;left:2rem;transform:translateY(-50%)}.sw-alert-box.cc{top:50%;left:50%;transform:translate(-50%,-50%)}.sw-alert-box.cr{top:50%;right:2rem;transform:translateY(-50%)}
.sw-alert{position:relative;display:flex;align-items:center;min-height:6.4rem;padding:1.4rem 2.4rem 1.4rem 6.2rem;border-radius:.8rem;border:1px solid transparent;pointer-events:all;cursor:pointer;font-family:var(--sw-f-san);font-size:1.7rem;font-weight:500;line-height:1.4;color:#fff;background:rgba(20,20,20,.75);backdrop-filter:blur(1.2rem);-webkit-backdrop-filter:blur(1.2rem);box-shadow:0 1.2rem 4rem rgba(0,0,0,.5);text-shadow:0.1rem 0.1rem 0.3rem rgba(0,0,0,.5);animation:_swAlrIn .4s cubic-bezier(0.2, 0.8, 0.4, 1.05);transition:all 0.4s cubic-bezier(0.4, 0, 0.2, 1)}
.sw-alert.is-out{opacity:0;transform:translateX(20px) scale(0.95);filter:blur(4px)}
@keyframes _swAlrIn{from{opacity:0;transform:translateX(40px);filter:blur(10px)}to{opacity:1;transform:none;filter:none}}
.sw-alert-ico{position:absolute;left:1.6rem;top:50%;transform:translateY(-50%);width:3.2rem;height:3.2rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:2.8rem;filter:drop-shadow(0 2px 6px rgba(0,0,0,.4))}
.sw-alert-body{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}.sw-alert-ttl{font-weight:700;margin-bottom:.2rem;font-size:1.4rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.9}
.sw-alert-msg{opacity:1;font-weight:400}
.sw-alert-cls{position:absolute;right:1rem;top:50%;transform:translateY(-50%);width:3.2rem;height:3.2rem;display:flex;align-items:center;justify-content:center;opacity:0.3;font-size:2.4rem;line-height:1;background:none;border:0;cursor:pointer;color:inherit;transition:all .2s;border-radius:50%}
.sw-alert-cls:hover{opacity:1;background:rgba(255,255,255,0.1)}
.sw-alert-bar{position:absolute;bottom:0;left:.8rem;right:.8rem;height:3px;border-radius:99px;opacity:0.6;animation:_swBar linear forwards}
@keyframes _swBar{from{width:calc(100% - 1.6rem)}to{width:0%}}
.sw-alert.ok{border-color:rgba(0,255,100,0.35);color:#e0ffe0}.sw-alert.ok .sw-alert-bar{background:#00ff64}
.sw-alert.err{border-color:rgba(255,50,50,0.35);color:#ffe0e0}.sw-alert.err .sw-alert-bar{background:#ff3232}
.sw-alert.ale{border-color:rgba(255,180,0,0.35);color:#fff5e0}.sw-alert.ale .sw-alert-bar{background:#ffb400}
.sw-alert.inf{border-color:rgba(0,180,255,0.35);color:#e0f5ff}.sw-alert.inf .sw-alert-bar{background:#00b4ff}
.sw-alert.drk{border-color:rgba(255,255,255,0.15);color:#f5f5f5}.sw-alert.drk .sw-alert-bar{background:#fff}
/* Confirmação — estilo SweetAlert2 */
.sw-cfm-ovl{position:fixed!important;inset:0!important;z-index:9999999!important;background:rgba(0,0,0,.6)!important;backdrop-filter:blur(4px)!important;-webkit-backdrop-filter:blur(4px)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:2rem!important;opacity:0!important;transition:opacity .25s ease!important;pointer-events:none!important}
.sw-cfm-ovl.is-act{opacity:1!important;pointer-events:auto!important}
.sw-cfm{font-family:var(--sw-f-hd)!important;display:flex!important;flex-direction:column!important;align-items:center!important;background:var(--sw-sur)!important;border:1px solid var(--sw-bor)!important;border-radius:var(--sw-r-g)!important;width:min(40rem,94vw)!important;box-shadow:0 2.5rem 6rem rgba(0,0,0,.45)!important;overflow:hidden!important;text-align:center!important;transform:scale(.72) translateY(28px)!important;opacity:0!important;transition:transform .38s cubic-bezier(.34,1.4,.64,1),opacity .3s ease!important}
.sw-cfm-ovl.is-act .sw-cfm{transform:scale(1) translateY(0)!important;opacity:1!important}
.sw-cfm-hdr{width:100%!important;padding:3.2rem 2.4rem 1.2rem!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:.8rem!important}
.sw-cfm-ico-wrap{width:7rem!important;height:7rem!important;border-radius:50%!important;background:linear-gradient(135deg,#fbbf24,#f97316)!important;display:flex!important;align-items:center!important;justify-content:center!important;box-shadow:0 .8rem 2.8rem rgba(249,115,22,.5)!important;animation:_swCfmPop .5s cubic-bezier(.34,1.6,.64,1) .1s both!important}
.sw-cfm-ico-wrap i{font-size:3.2rem!important;color:#fff!important;line-height:1!important}
@keyframes _swCfmPop{from{transform:scale(0) rotate(-15deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}
.sw-cfm-ttl{font-family:var(--sw-f-hd)!important;font-size:2rem!important;font-weight:800!important;color:var(--sw-txt)!important;margin:0!important;line-height:1.2!important}
.sw-cfm-bdy{width:100%!important;padding:0 3.2rem 0!important}
.sw-cfm-txt{font-family:var(--sw-f-san)!important;font-size:1.5rem!important;font-weight:400!important;color:var(--sw-txt-mut)!important;line-height:1.7!important;margin:0!important}
.sw-cfm-act{width:100%!important;display:flex!important;flex-direction:row-reverse!important;gap:1rem!important;justify-content:center!important;padding:1.6rem 2.4rem 2.4rem!important}
.sw-cfm-act button{font-family:var(--sw-f-san)!important;padding:1.1rem 2.8rem!important;border:none!important;cursor:pointer!important;font-size:1.5rem!important;font-weight:700!important;border-radius:var(--sw-r-m)!important;transition:transform .2s ease,box-shadow .2s ease,filter .2s ease!important;position:relative!important;overflow:hidden!important;letter-spacing:.01em!important}
.sw-cfm-act button::before{content:''!important;position:absolute!important;top:0!important;left:-100%!important;width:100%!important;height:100%!important;background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent)!important;transition:left .4s ease!important}
.sw-cfm-act button:hover::before{left:100%!important}
.sw-cfm-act button:active{transform:scale(.97)!important}
.sw-cfm-act .is-ok{background:linear-gradient(135deg,#3ecf6a,#28a745)!important;color:#fff!important;box-shadow:0 4px 14px rgba(40,167,69,.4)!important}.sw-cfm-act .is-ok:hover{filter:brightness(1.08)!important;transform:translateY(-2px)!important;box-shadow:0 6px 20px rgba(40,167,69,.5)!important}
.sw-cfm-act .is-no{background:var(--sw-bg-)!important;color:var(--sw-txt-mut)!important;border:1.5px solid var(--sw-bor)!important}.sw-cfm-act .is-no:hover{background:var(--sw-neu-3)!important;transform:translateY(-2px)!important}`;
      document.head.appendChild(s);
    }

    static _getBox(pos) {
      SWAlert._css();
      const p = pos || 'tr';
      if (!SWAlert._boxes[p]) {
        const box = document.createElement('div');
        box.className = `sw-alert-box ${p}`;
        box.setAttribute('aria-live', 'polite');
        box.setAttribute('aria-atomic', 'false');
        document.body.appendChild(box);
        SWAlert._boxes[p] = box;
      }
      return SWAlert._boxes[p];
    }

    static _show(type, msg, title, dur, pos) {
      const duration = dur === undefined || dur === null ? 4000 : Number(dur) || 0;
      const box = SWAlert._getBox(pos);

      const icos = {
        ok: 'swi-check-circle',
        err: 'swi-error-circle',
        ale: 'swi-alarm-exclamation',
        inf: 'swi-info-circle',
        drk: 'swi-diamond',
      };

      const el = document.createElement('div');
      el.className = `sw-alert ${type}`;
      el.setAttribute('role', 'alert');

      const icoClass = icos[type];
      if (icoClass) {
        const icoEl = document.createElement('i');
        icoEl.className = `sw-alert-ico ${icoClass}`;
        el.appendChild(icoEl);
      } else {
        el.style.paddingLeft = '2.4rem';
      }

      const bodyEl = document.createElement('div');
      bodyEl.className = 'sw-alert-body';

      if (title) {
        const ttlEl = document.createElement('div');
        ttlEl.className = 'sw-alert-ttl';
        ttlEl.textContent = title;
        bodyEl.appendChild(ttlEl);
      }

      const message = document.createElement('div');
      message.className = 'sw-alert-msg';
      message.textContent = String(msg ?? '');
      bodyEl.appendChild(message);

      if (duration > 0) {
        const barEl = document.createElement('div');
        barEl.className = 'sw-alert-bar';
        barEl.style.animationDuration = `${duration}ms`;
        bodyEl.appendChild(barEl);
      }

      const clsBtn = document.createElement('button');
      clsBtn.type = 'button';
      clsBtn.className = 'sw-alert-cls';
      clsBtn.setAttribute('aria-label', 'Fechar');
      const clsIco = document.createElement('i');
      clsIco.className = 'swi-cross';
      clsBtn.appendChild(clsIco);

      el.appendChild(bodyEl);
      el.appendChild(clsBtn);

      const dismiss = () => {
        el.classList.add('is-out');
        window.setTimeout(() => el.remove(), 400);
      };

      clsBtn.addEventListener('click', (e) => { e.stopPropagation(); dismiss(); });
      el.addEventListener('click', dismiss);
      if (duration > 0) window.setTimeout(dismiss, duration);

      box.appendChild(el);
      return el;
    }

    // API principal
    static ok(msg, dur, pos, title) { return SWAlert._show('ok', msg, title, dur, pos); }
    static err(msg, dur, pos, title) { return SWAlert._show('err', msg, title, dur, pos); }
    static ale(msg, dur, pos, title) { return SWAlert._show('ale', msg, title, dur, pos); }
    static inf(msg, dur, pos, title) { return SWAlert._show('inf', msg, title, dur, pos); }
    static drk(msg, dur, pos, title) { return SWAlert._show('drk', msg, title, dur, pos); }

    // Aliases PT-BR
    static sucesso(msg, dur, pos) { return SWAlert.ok(msg, dur, pos); }
    static erro(msg, dur, pos) { return SWAlert.err(msg, dur, pos); }
    static alerta(msg, dur, pos) { return SWAlert.ale(msg, dur, pos); }
    static info(msg, dur, pos) { return SWAlert.inf(msg, dur, pos); }

    // Caixa de confirmação — dialog modal com focus trap e ESC
    static confirmar(msg, cb, title, icon) {
      SWAlert._css();
      const ovl = document.createElement('div');
      ovl.className = 'sw-cfm-ovl';
      ovl.setAttribute('role', 'dialog');
      ovl.setAttribute('aria-modal', 'true');
      ovl.setAttribute('aria-labelledby', 'sw-cfm-ttl-' + Date.now());

      const icoClass = icon || 'swi-help-circle';

      const cfm = document.createElement('div'); cfm.className = 'sw-cfm';
      const hdr = document.createElement('div'); hdr.className = 'sw-cfm-hdr';
      const icoWrap = document.createElement('div'); icoWrap.className = 'sw-cfm-ico-wrap';
      const icoEl = document.createElement('i'); icoEl.className = icoClass;
      const ttlEl = document.createElement('div'); ttlEl.className = 'sw-cfm-ttl';
      const bdy = document.createElement('div'); bdy.className = 'sw-cfm-bdy';
      const txt = document.createElement('p'); txt.className = 'sw-cfm-txt';
      const act = document.createElement('div'); act.className = 'sw-cfm-act';
      const btnNo = document.createElement('button'); btnNo.type = 'button'; btnNo.className = 'is-no'; btnNo.textContent = 'Cancelar';
      const btnOk = document.createElement('button'); btnOk.type = 'button'; btnOk.className = 'is-ok'; btnOk.textContent = 'Confirmar';

      icoWrap.appendChild(icoEl);
      ttlEl.textContent = title || 'Confirmação';
      txt.textContent = String(msg ?? '');

      hdr.append(icoWrap, ttlEl);
      bdy.appendChild(txt);
      act.append(btnNo, btnOk);
      cfm.append(hdr, bdy, act);
      ovl.appendChild(cfm);

      document.body.appendChild(ovl);
      document.body.style.overflow = 'hidden';
      window.setTimeout(() => ovl.classList.add('is-act'), 10);

      const focusables = [btnOk, btnNo];
      const trapFocus = (e) => {
        if (e.key !== 'Tab') return;
        const idx = focusables.indexOf(document.activeElement);
        e.preventDefault();
        const next = e.shiftKey ? (idx <= 0 ? focusables.length - 1 : idx - 1) : (idx === focusables.length - 1 ? 0 : idx + 1);
        focusables[next]?.focus();
      };

      const cleanup = (res) => {
        ovl.classList.remove('is-act');
        ovl.addEventListener('transitionend', () => {
          ovl.remove();
          document.body.style.overflow = '';
          document.removeEventListener('keydown', escFn);
          document.removeEventListener('keydown', trapFocus);
          if (typeof cb === 'function') cb(res);
        }, { once: true });
      };

      btnOk.addEventListener('click', () => cleanup(true));
      btnNo.addEventListener('click', () => cleanup(false));
      ovl.addEventListener('click', (e) => { if (e.target === ovl) cleanup(false); });

      const escFn = (e) => { if (e.key === 'Escape') cleanup(false); };
      document.addEventListener('keydown', escFn);
      document.addEventListener('keydown', trapFocus);
      window.setTimeout(() => btnOk.focus(), 100);
    }

    // Inicialização por atributo — [sw-toast="ok|err|ale|inf|drk"]
    static initAll(root) {
      const scope = root || document;
      (scope.querySelectorAll ? scope.querySelectorAll('[sw-toast]') : []).forEach((btn) => {
        if (btn._swAlertBound) return;
        btn._swAlertBound = true;
        btn.addEventListener('click', () => {
          SWAlert._show(
            btn.getAttribute('sw-toast') || 'inf',
            btn.getAttribute('sw-toast-msg') || 'Mensagem',
            btn.getAttribute('sw-toast-title') || '',
            parseInt(btn.getAttribute('sw-toast-dur'), 10) || 4000,
            btn.getAttribute('sw-toast-pos') || 'tr'
          );
        });
      });
    }
  }

  window.SW?.register('SWAlert', SWAlert);
  if (window.SW) window.SW.Alert = SWAlert;
  window.SWAlert = SWAlert;
})();

/* SW Framework Panel */
(function () {
  'use strict';
  class SWPanel {
    static initAll(root = document) {
      SW.$('[sw-panel-open]', root).forEach((trigger) => {
        if (trigger._swPanelInit) return;
        trigger._swPanelInit = true;
        trigger.addEventListener('click', (event) => {
          const selector = trigger.getAttribute('sw-panel-open');
          if (!selector?.startsWith('#')) return;
          event.preventDefault();
          SWPanel.show(selector, trigger);
        });
      });
      SW.$('.sw-panel', root).forEach((panel) => {
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-hidden', panel.classList.contains('is-active') ? 'false' : 'true');
        if (panel._swPanelCloseInit) return;
        panel._swPanelCloseInit = true;
        panel.addEventListener('click', (event) => {
          if (event.target.closest('[sw-panel-close]')) SWPanel.hide(panel);
        });
      });
    }
    static show(target, trigger = document.activeElement) {
      const panel = typeof target === 'string' ? document.querySelector(target) : target;
      if (!panel || panel.classList.contains('is-active')) return false;
      panel._swPreviousFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
      panel.classList.add('is-active');
      panel.setAttribute('aria-hidden', 'false');
      if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
      panel._swKeydown = (event) => { if (event.key === 'Escape') SWPanel.hide(panel); };
      window.addEventListener('keydown', panel._swKeydown);
      SW.Overlay.lock();
      window.requestAnimationFrame(() => (panel.querySelector('[autofocus], [sw-panel-close], button, input, select, textarea, a[href]') || panel).focus({ preventScroll: true }));
      SW.emit(panel, 'sw:panel:open');
      return true;
    }
    static hide(target) {
      const panel = typeof target === 'string' ? document.querySelector(target) : target;
      if (!panel?.classList.contains('is-active')) return false;
      panel.classList.remove('is-active');
      panel.setAttribute('aria-hidden', 'true');
      window.removeEventListener('keydown', panel._swKeydown);
      SW.Overlay.unlock();
      panel._swPreviousFocus?.focus?.({ preventScroll: true });
      SW.emit(panel, 'sw:panel:close');
      return true;
    }
  }
  window.SW?.register('SWPanel', SWPanel);
  if (window.SW) window.SW.Panel = SWPanel;
})();

/* SW Framework Lightbox */
(function () {
  'use strict';
  class SWLight {
    static initAll(root = document) {
      SW.$('[sw-light]', root).forEach((trigger) => {
        if (trigger._swLightInit) return;
        trigger._swLightInit = true;
        trigger.addEventListener('click', (event) => {
          event.preventDefault();
          SWLight.open(trigger.getAttribute('href') || trigger.getAttribute('src') || trigger.getAttribute('sw-light'), trigger);
        });
      });
    }
    static open(source, trigger) {
      let url;
      try { url = new URL(source, window.location.href); } catch (_) { return false; }
      if (!['http:', 'https:', 'blob:', 'data:'].includes(url.protocol)) return false;
      let modal = document.querySelector('#sw-lightbox-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sw-lightbox-modal';
        modal.className = 'sw-modal sw-lightbox';
        modal.setAttribute('aria-label', 'Visualização ampliada da imagem');
        const content = document.createElement('div');
        content.className = 'sw-modal-content sw-lightbox-content';
        const image = document.createElement('img');
        image.id = 'sw-lightbox-img';
        image.alt = '';
        content.appendChild(image);
        modal.appendChild(content);
        document.body.appendChild(modal);
        SW.Modal?.initAll(modal.parentNode);
      }
      modal.querySelector('#sw-lightbox-img').src = url.href;
      return SW.Modal?.show(modal, trigger);
    }
  }
  window.SW?.register('SWLight', SWLight);
  if (window.SW) window.SW.Light = SWLight;
})();

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

/* SW Framework AJAX — safe same-origin HTML fragments */
(function () {
  'use strict';

  class SWAjax {
    static initAll(root = document) {
      SW.$('[sw-ajax], [sw-ajax-src]', root).forEach((element) => {
        if (element._swAjaxInit) return;
        element._swAjaxInit = true;
        const trigger = (element.getAttribute('sw-ajax-trigger') || 'click').toLowerCase();
        if (trigger === 'load') {
          SWAjax.execute(element);
        } else if (trigger === 'hover') {
          element.addEventListener('mouseenter', () => SWAjax.execute(element), { once: true });
        } else {
          element.addEventListener('click', (event) => {
            event.preventDefault();
            SWAjax.execute(element);
          });
        }
      });
    }

    static async execute(trigger, overrideBody) {
      const sourceSelector = trigger.getAttribute('sw-ajax-src');
      const targetSelector = trigger.getAttribute('sw-target');
      const targetType = trigger.getAttribute('sw-ajax-target');
      const trusted = trigger.hasAttribute('sw-ajax-trusted');
      const extractSelector = trigger.getAttribute('sw-ajax-extract');
      const push = trigger.hasAttribute('sw-ajax-push');
      const method = (trigger.getAttribute('sw-ajax-method') || 'GET').toUpperCase();
      const showLoader = (trigger.getAttribute('sw-ajax-loader') || '').toLowerCase() !== 'off';
      const effect = trigger.getAttribute('sw-ajax-effect');
      const duration = trigger.getAttribute('sw-ajax-duration');
      const distance = trigger.getAttribute('sw-ajax-distance');
      const delay = trigger.getAttribute('sw-ajax-delay');
      const target = this.resolveTarget(trigger, targetType, targetSelector);
      let content = '';
      let requestUrl = '';

      try {
        if (sourceSelector) {
          const source = document.querySelector(sourceSelector);
          if (!source) throw new Error(`Elemento interno não encontrado: ${sourceSelector}`);
          content = source.innerHTML;
        } else {
          const rawUrl = trigger.getAttribute('sw-ajax');
          if (!rawUrl) throw new Error('Fonte AJAX ausente.');
          const url = new URL(rawUrl, window.location.href);
          if (url.origin !== window.location.origin && !trigger.hasAttribute('sw-ajax-crossorigin')) {
            throw new Error('SWAjax bloqueou uma origem externa não autorizada.');
          }
          requestUrl = url.href;
          const timeoutMs = Math.min(60000, Math.max(1000, parseInt(trigger.getAttribute('sw-ajax-timeout'), 10) || 15000));
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
          SW.emit(trigger, 'sw:ajax:start', { url: url.href });
          if (target && showLoader) this._setLoading(target.content, true);
          try {
            const fetchOptions = {
              method,
              credentials: 'same-origin',
              headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'text/html' },
              signal: controller.signal
            };
            if (method !== 'GET') {
              const body = overrideBody !== undefined ? overrideBody : (trigger.tagName === 'FORM' ? new FormData(trigger) : undefined);
              if (body !== undefined) {
                fetchOptions.body = body instanceof FormData ? body : JSON.stringify(body);
                if (!(body instanceof FormData)) fetchOptions.headers['Content-Type'] = 'application/json';
              }
            }
            const response = await fetch(url.href, fetchOptions);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
              throw new Error(`Tipo de conteúdo não suportado: ${contentType || 'desconhecido'}`);
            }
            content = await response.text();
          } finally {
            window.clearTimeout(timeout);
          }
        }

        // Resposta de pagina inteira (<html>/<body>): extrai so o fragmento pedido em vez de injetar a pagina crua.
        if (/<html[\s>]/i.test(content) || /<body[\s>]/i.test(content)) {
          const parsed = new DOMParser().parseFromString(content, 'text/html');
          const extracted = extractSelector ? parsed.querySelector(extractSelector) : parsed.body;
          content = extracted ? extracted.innerHTML : content;
        } else if (extractSelector) {
          const scratch = document.createElement('div');
          scratch.innerHTML = content;
          const extracted = scratch.querySelector(extractSelector);
          if (extracted) content = extracted.innerHTML;
        }

        if (!target) throw new Error('Alvo de injeção não encontrado.');
        const render = () => {
          SW.html.set(target.content, content, { trusted });
          SW.reinit(target.content);
          if (effect || duration || distance || delay) {
            this._applyEffect(target.content, { effect, duration, distance, delay });
          }
        };
        if (SW.Trans) {
          // document.startViewTransition() adia o callback pro próximo frame — sem esperar
          // updateCallbackDone, o resto do fluxo (evento done, fim do loading) rodaria antes
          // do conteúdo existir de fato no DOM.
          const transition = SW.Trans.run(render, { skip: targetType === 'panel' || targetType === 'modal' });
          if (transition?.updateCallbackDone) await transition.updateCallbackDone;
        } else {
          render();
        }

        if (targetType === 'panel') SW.Panel?.show(target.overlay);
        if (targetType === 'modal') SW.Modal?.show(target.overlay);
        if (push && requestUrl && window.history?.pushState) window.history.pushState({}, '', requestUrl);
        this._setLoading(target.content, false);
        SW.emit(trigger, 'sw:ajax:done', { sourceSelector });
      } catch (error) {
        console.error('[SW-AJAX]', error);
        SW.emit(trigger, 'sw:ajax:error', { error });
        const message = error.name === 'AbortError' ? 'A requisição demorou demais.' : 'Não foi possível carregar o conteúdo.';
        if (target) {
          this._setLoading(target.content, false);
          this._setError(target.content, message);
        }
        SW.Alert?.err(message);
      }
    }

    // Efeito de entrada declarado direto na tag — sw-ajax-effect/-duration/-distance/-delay.
    // Sem JS: aplica os tokens do catálogo de animações (--sw-spd/--sw-dist/--sw-delay)
    // e a classe .sw-ani-*/.sw-rev-*/.sw-loop-* no elemento injetado.
    static _applyEffect(element, { effect, duration, distance, delay }) {
      const toTime = (value) => (value && /^\d+$/.test(value) ? `${value}ms` : value);
      if (duration) element.style.setProperty('--sw-spd', toTime(duration));
      if (distance) element.style.setProperty('--sw-dist', /^\d+$/.test(distance) ? `${distance}rem` : distance);
      if (delay) element.style.setProperty('--sw-delay', toTime(delay));
      if (!effect) return;
      const cls = /^sw-(ani|rev|loop)-/.test(effect) ? effect : `sw-ani-${effect}`;
      element.className = element.className.replace(/\bsw-(ani|rev|loop)-[a-z-]+\b/g, '').trim();
      element.classList.remove('is-revealed');
      if (cls.startsWith('sw-rev-')) {
        // .sw-rev-* usa transition (não animation) pra revelar. Se a transição já estiver ativa
        // quando o estado oculto (opacity:0) é aplicado, o navegador começa a animar rumo a ele —
        // e como .is-revealed chega logo em seguida, a transição nunca tem tempo real de
        // progredir (o alvo volta pra 1 quase no mesmo instante): visualmente não acontece nada.
        // Desliga a transição, aplica o oculto como salto instantâneo, comita, religa e só então
        // revela — assim a transição de verdade acontece do oculto pro visível.
        element.style.transition = 'none';
        element.classList.add(cls);
        void element.offsetWidth;
        element.style.transition = '';
        requestAnimationFrame(() => element.classList.add('is-revealed'));
      } else {
        element.classList.add(cls);
        void element.offsetWidth;
      }
    }

    static _setLoading(element, isLoading) {
      if (!element) return;
      element.classList.toggle('sw-ajax-loading', isLoading);
      if (isLoading) element.setAttribute('aria-busy', 'true');
      else element.removeAttribute('aria-busy');
    }

    static _setError(element, message) {
      if (!element) return;
      element.classList.add('sw-ajax-error');
      element.setAttribute('title', message);
      window.setTimeout(() => element.classList.remove('sw-ajax-error'), 2000);
    }

    static resolveTarget(trigger, type, selector) {
      if (type === 'panel') {
        const requested = trigger.getAttribute('sw-panel');
        const panelSelector = requested?.startsWith('#') ? requested : '#sw-global-panel';
        let panel = document.querySelector(panelSelector);
        if (!panel) {
          panel = document.createElement('aside');
          panel.id = panelSelector.slice(1);
          panel.className = 'sw-panel';
          panel.setAttribute('aria-hidden', 'true');
          document.body.appendChild(panel);
        }
        return { overlay: panel, content: panel };
      }
      if (type === 'modal') {
        const requested = trigger.getAttribute('sw-modal');
        const modalSelector = requested?.startsWith('#') ? requested : '#sw-global-modal';
        let modal = document.querySelector(modalSelector);
        if (!modal) {
          modal = document.createElement('div');
          modal.id = modalSelector.slice(1);
          modal.className = 'sw-modal';
          const body = document.createElement('div');
          body.className = 'sw-modal-content';
          modal.appendChild(body);
          document.body.appendChild(modal);
        }
        return { overlay: modal, content: modal.querySelector('.sw-modal-content') };
      }
      const content = selector ? document.querySelector(selector) : null;
      return content ? { overlay: content, content } : null;
    }

    // Helpers estáticos — mesmo caminho de execução do atributo, só que disparado via JS.
    static load(url, dest, opts = {}) {
      const trigger = document.createElement('span');
      trigger.setAttribute('sw-ajax', url);
      if (dest) trigger.setAttribute('sw-target', dest);
      if (opts.trusted) trigger.setAttribute('sw-ajax-trusted', '');
      if (opts.crossorigin) trigger.setAttribute('sw-ajax-crossorigin', '');
      if (opts.push) trigger.setAttribute('sw-ajax-push', '');
      if (opts.extract) trigger.setAttribute('sw-ajax-extract', opts.extract);
      return SWAjax.execute(trigger);
    }

    static post(url, data, dest, opts = {}) {
      const trigger = document.createElement('span');
      trigger.setAttribute('sw-ajax', url);
      trigger.setAttribute('sw-ajax-method', 'POST');
      if (dest) trigger.setAttribute('sw-target', dest);
      if (opts.trusted) trigger.setAttribute('sw-ajax-trusted', '');
      if (opts.crossorigin) trigger.setAttribute('sw-ajax-crossorigin', '');
      if (opts.push) trigger.setAttribute('sw-ajax-push', '');
      if (opts.extract) trigger.setAttribute('sw-ajax-extract', opts.extract);
      return SWAjax.execute(trigger, data);
    }
  }

  window.SW?.register('SWAjax', SWAjax);
  if (window.SW) window.SW.Ajax = SWAjax;
})();

/* SW Framework — progressive enhancement for native selects */
(function () {
  'use strict';

  class SWSelect {
    static initAll(root = document) {
      SW.$('select[sw-select], select.sw-select', root).forEach((select) => this.init(select));
    }

    static init(select) {
      if (!(select instanceof HTMLSelectElement) || select._swSelectInit) return false;
      select._swSelectInit = true;
      select.classList.add('sw-select');
      select.addEventListener('change', () => {
        this.sync(select);
        SW.emit(select, 'sw:select-change', { value: select.value, select });
      });
      this.sync(select);
      return true;
    }

    static sync(select) {
      if (!(select instanceof HTMLSelectElement)) return false;
      select.dataset.swSelectState = select.value === '' ? 'empty' : 'selected';
      return true;
    }

    static set(target, value, { emit = true } = {}) {
      const select = typeof target === 'string' ? document.querySelector(target) : target;
      if (!(select instanceof HTMLSelectElement)) return false;
      const normalized = String(value ?? '');
      if (!Array.from(select.options).some((option) => option.value === normalized)) return false;
      select.value = normalized;
      this.sync(select);
      if (emit) select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  }

  window.SW?.register('SWSelect', SWSelect);
  if (window.SW) window.SW.Select = SWSelect;
})();

/* SW Framework — accessible form validation built on native constraints */
(function () {
  'use strict';

  const instances = new WeakMap();
  let fieldCounter = 0;

  class SWValid {
    constructor(form) {
      this.form = form;
      this.form.noValidate = true;
      this.fields().forEach((field) => this.bind(field));
      this.form.addEventListener('submit', (event) => {
        if (!this.check({ focus: true })) {
          event.preventDefault();
          SW.emit(this.form, 'sw:valid-error', { form: this.form });
          return;
        }
        if (!SW.emit(this.form, 'sw:valid-submit', { form: this.form })) event.preventDefault();
      });
    }

    fields() {
      return Array.from(this.form.elements).filter((field) =>
        field instanceof HTMLElement &&
        typeof field.checkValidity === 'function' &&
        !field.disabled &&
        !['button', 'submit', 'reset', 'hidden'].includes(field.type)
      );
    }

    bind(field) {
      if (field._swValidInit) return;
      field._swValidInit = true;
      field.addEventListener('blur', () => {
        field.dataset.swValidTouched = 'true';
        this.validateField(field);
        this.updateState();
      });
      field.addEventListener('input', () => {
        if (field.dataset.swValidTouched === 'true' || field.getAttribute('aria-invalid') === 'true') {
          this.validateField(field);
          this.updateState();
        }
      });
      field.addEventListener('change', () => {
        field.dataset.swValidTouched = 'true';
        this.validateField(field);
        this.updateState();
      });
    }

    errorElement(field) {
      if (!field.id) {
        fieldCounter += 1;
        field.id = `sw-field-${fieldCounter}`;
      }
      const errorId = `${field.id}-error`;
      let error = this.form.querySelector(`#${CSS.escape(errorId)}`);
      if (!error) {
        error = document.createElement('p');
        error.id = errorId;
        error.className = 'sw-form-error';
        error.setAttribute('role', 'alert');
        error.hidden = true;
        (field.closest('.sw-form-group') || field.parentElement || this.form).appendChild(error);
      }
      return error;
    }

    validateField(field) {
      const valid = field.checkValidity();
      const error = this.errorElement(field);
      field.classList.toggle('is-invalid', !valid);
      field.classList.toggle('is-valid', valid && field.dataset.swValidTouched === 'true' && String(field.value || '') !== '');

      if (!valid) {
        field.setAttribute('aria-invalid', 'true');
        const describedBy = new Set((field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
        describedBy.add(error.id);
        field.setAttribute('aria-describedby', Array.from(describedBy).join(' '));
        error.textContent = field.dataset.swError || field.validationMessage || 'Revise este campo.';
        error.hidden = false;
      } else {
        field.removeAttribute('aria-invalid');
        const describedBy = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter((id) => id && id !== error.id);
        if (describedBy.length) field.setAttribute('aria-describedby', describedBy.join(' '));
        else field.removeAttribute('aria-describedby');
        error.textContent = '';
        error.hidden = true;
      }
      return valid;
    }

    updateState() {
      const valid = this.fields().every((field) => field.checkValidity());
      this.form.dataset.swValidState = valid ? 'valid' : 'invalid';
      return valid;
    }

    check({ focus = true } = {}) {
      const fields = this.fields();
      let firstInvalid = null;
      fields.forEach((field) => {
        field.dataset.swValidTouched = 'true';
        if (!this.validateField(field) && !firstInvalid) firstInvalid = field;
      });
      this.form.dataset.swValidState = firstInvalid ? 'invalid' : 'valid';
      if (firstInvalid && focus) firstInvalid.focus({ preventScroll: false });
      return !firstInvalid;
    }

    static initAll(root = document) {
      SW.$('form[sw-valid]', root).forEach((form) => this.init(form));
    }

    static init(form) {
      if (!(form instanceof HTMLFormElement)) return null;
      if (!instances.has(form)) instances.set(form, new SWValid(form));
      const instance = instances.get(form);
      instance.fields().forEach((field) => instance.bind(field));
      return instance;
    }

    static check(target, options = {}) {
      const form = typeof target === 'string' ? document.querySelector(target) : target;
      return this.init(form)?.check(options) ?? false;
    }
  }

  window.SW?.register('SWValid', SWValid);
  if (window.SW) window.SW.Valid = SWValid;
})();

/* SW Framework — bounded, formatting-only masks */
(function () {
  'use strict';

  const limits = Object.freeze({ cpf: 11, cnpj: 14, document: 14, phone: 11, cep: 8, date: 8 });

  const joinParts = (digits, sizes, separators) => {
    let cursor = 0;
    let output = '';
    sizes.forEach((size, index) => {
      const part = digits.slice(cursor, cursor + size);
      if (!part) return;
      if (output && separators[index - 1]) output += separators[index - 1];
      output += part;
      cursor += size;
    });
    return output;
  };

  const formatters = Object.freeze({
    cpf: (digits) => joinParts(digits, [3, 3, 3, 2], ['.', '.', '-']),
    cnpj: (digits) => joinParts(digits, [2, 3, 3, 4, 2], ['.', '.', '/', '-']),
    document: (digits) => digits.length <= 11 ? formatters.cpf(digits) : formatters.cnpj(digits),
    phone: (digits) => {
      if (!digits) return '';
      const area = digits.slice(0, 2);
      const middleSize = digits.length > 10 ? 5 : 4;
      const middle = digits.slice(2, 2 + middleSize);
      const end = digits.slice(2 + middleSize);
      return `${digits.length > 2 ? `(${area}) ` : area}${middle}${end ? `-${end}` : ''}`;
    },
    cep: (digits) => joinParts(digits, [5, 3], ['-']),
    date: (digits) => joinParts(digits, [2, 2, 4], ['/', '/'])
  });

  class SWMask {
    static initAll(root = document) {
      SW.$('input[sw-mask]', root).forEach((input) => this.init(input));
    }

    static init(input) {
      if (!(input instanceof HTMLInputElement) || input._swMaskInit) return false;
      const name = input.getAttribute('sw-mask');
      if (!Object.prototype.hasOwnProperty.call(limits, name)) return false;
      input._swMaskInit = true;
      if (!input.hasAttribute('inputmode')) input.inputMode = 'numeric';
      input.addEventListener('input', () => this.apply(input));
      this.apply(input, false);
      return true;
    }

    static apply(input, emit = true) {
      const name = input.getAttribute('sw-mask');
      if (!(input instanceof HTMLInputElement) || !Object.prototype.hasOwnProperty.call(limits, name)) return '';
      const digits = String(input.value || '').replace(/\D/g, '').slice(0, limits[name]);
      input.value = formatters[name](digits);
      input.dataset.swMaskValue = digits;
      if (emit) SW.emit(input, 'sw:mask-input', { mask: name, raw: digits, value: input.value });
      return digits;
    }

    static raw(target) {
      const input = typeof target === 'string' ? document.querySelector(target) : target;
      if (!(input instanceof HTMLInputElement)) return '';
      return this.apply(input, false);
    }

    static set(target, value, { emit = true } = {}) {
      const input = typeof target === 'string' ? document.querySelector(target) : target;
      if (!(input instanceof HTMLInputElement)) return false;
      input.value = String(value ?? '');
      this.apply(input, emit);
      return true;
    }
  }

  window.SW?.register('SWMask', SWMask);
  if (window.SW) window.SW.Mask = SWMask;
})();

/* SW Framework Chip — [sw-chip] removível via .sw-chip-x */
(function () {
  'use strict';

  let bound = false;

  const SWChip = {
    initAll() {
      if (bound) return;
      bound = true;
      document.addEventListener('click', (event) => {
        const trigger = event.target.closest('.sw-chip-x');
        if (!trigger) return;
        const chip = trigger.closest('[sw-chip]');
        if (!chip) return;
        SW.emit(chip, 'sw:chip:remove', {});
        if (SW.Utils.reducedMotion()) {
          chip.remove();
          return;
        }
        chip.classList.add('is-leaving');
        window.setTimeout(() => chip.remove(), 250);
      });
    }
  };

  window.SW?.register('SWChip', SWChip);
  if (window.SW) window.SW.Chip = SWChip;
})();

/* SW Framework Tabs — [sw-tabs] container, .sw-tabs-it (nav), .sw-tabs-pnl (paineis) */
(function () {
  'use strict';

  class SWTabs {
    constructor(el) {
      if (el._swTabs) return;
      el._swTabs = this;
      this.el = el;
      this._bind();
      this._initNavScroll();
      const first = el.querySelector('.sw-tabs-it.is-act') || el.querySelector('.sw-tabs-it');
      if (first) this._activate(first, false);
    }

    _initNavScroll() {
      if (this.el.classList.contains('is-vrt') || this.el.classList.contains('is-btm')) return;
      const nav = this.el.querySelector('.sw-tabs-nav');
      if (!nav) return;
      if (!nav.parentElement.classList.contains('sw-tabs-nav-wrap')) {
        const wrap = document.createElement('div');
        wrap.className = 'sw-tabs-nav-wrap';
        nav.parentNode.insertBefore(wrap, nav);
        wrap.appendChild(nav);
      }
      const wrap = nav.parentElement;
      if (!wrap.querySelector('.sw-tabs-arr')) {
        const prev = document.createElement('button');
        prev.type = 'button';
        prev.className = 'sw-tabs-arr sw-tabs-arr-prv';
        prev.setAttribute('aria-label', 'Anterior');
        prev.innerHTML = '&#8249;';
        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'sw-tabs-arr sw-tabs-arr-nxt';
        next.setAttribute('aria-label', 'Próximo');
        next.innerHTML = '&#8250;';
        wrap.appendChild(prev);
        wrap.appendChild(next);
        const step = () => Math.max(nav.clientWidth * 0.6, 120);
        prev.addEventListener('click', () => nav.scrollBy({ left: -step(), behavior: 'smooth' }));
        next.addEventListener('click', () => nav.scrollBy({ left: step(), behavior: 'smooth' }));
      }
      const prevBtn = wrap.querySelector('.sw-tabs-arr-prv');
      const nextBtn = wrap.querySelector('.sw-tabs-arr-nxt');
      const check = () => {
        const overflow = nav.scrollWidth > nav.clientWidth + 2;
        const atStart = nav.scrollLeft < 2;
        const atEnd = nav.scrollLeft >= nav.scrollWidth - nav.clientWidth - 2;
        prevBtn?.classList.toggle('is-vis', overflow && !atStart);
        nextBtn?.classList.toggle('is-vis', overflow && !atEnd);
      };
      nav.addEventListener('scroll', check, { passive: true });
      window.addEventListener('resize', check, { passive: true });
      const active = nav.querySelector('.sw-tabs-it.is-act');
      if (active) active.scrollIntoView({ block: 'nearest', inline: 'center' });
      window.setTimeout(check, 50);
    }

    _bind() {
      this.el.addEventListener('click', (event) => {
        const btn = event.target.closest('.sw-tabs-it');
        if (!btn || btn.closest('[sw-tabs]') !== this.el) return;
        this._activate(btn);
      });
      this.el.addEventListener('keydown', (event) => {
        const btn = event.target.closest('.sw-tabs-it');
        if (!btn) return;
        const items = SW.$('.sw-tabs-it:not([disabled])', this.el);
        const idx = items.indexOf(btn);
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          const next = items[(idx + 1) % items.length];
          next?.focus();
          if (next) this._activate(next);
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          const prev = items[(idx - 1 + items.length) % items.length];
          prev?.focus();
          if (prev) this._activate(prev);
        }
      });
    }

    _activate(btn, emit = true) {
      const key = btn.getAttribute('sw-tabs-idx') || btn.getAttribute('href')?.replace('#', '');
      this.el.querySelectorAll('.sw-tabs-it').forEach((item) => {
        item.classList.remove('is-act');
        item.setAttribute('aria-selected', 'false');
        item.setAttribute('tabindex', '-1');
      });
      this.el.querySelectorAll('.sw-tabs-pnl').forEach((panel) => panel.classList.remove('is-act'));

      btn.classList.add('is-act');
      btn.setAttribute('aria-selected', 'true');
      btn.setAttribute('tabindex', '0');

      let panel;
      if (key !== undefined && key !== null && key !== '' && !Number.isNaN(Number(key))) {
        panel = this.el.querySelectorAll('.sw-tabs-pnl')[Number(key)];
      } else if (key) {
        panel = this.el.querySelector(`#${key}, [sw-tabs-pnl="${key}"]`);
      } else {
        const buttons = SW.$('.sw-tabs-it', this.el);
        panel = this.el.querySelectorAll('.sw-tabs-pnl')[buttons.indexOf(btn)];
      }
      if (panel) panel.classList.add('is-act');
      if (emit) SW.emit(this.el, 'sw:tabs:change', { key, btn, panel });
    }

    static initAll(root = document) {
      SW.$('[sw-tabs]', root).forEach((el) => new SWTabs(el));
    }

    static show(container, key) {
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      const btn = el?.querySelector(`[sw-tabs-idx="${key}"], #${key}`);
      if (el?._swTabs && btn) el._swTabs._activate(btn);
    }
  }

  window.SW?.register('SWTabs', SWTabs);
  if (window.SW) window.SW.Tabs = SWTabs;
})();

/* SW Framework Accordion — [sw-accordion] container, .sw-acc-it > .sw-acc-hdr + .sw-acc-bdy */
(function () {
  'use strict';

  class SWAccordion {
    constructor(el) {
      if (el._swAccordion) return;
      el._swAccordion = this;
      this.el = el;
      this.multi = el.getAttribute('sw-accordion-multi') === 'true';
      this._bind();
      this._initAria();
    }

    _bind() {
      this.el.addEventListener('click', (event) => {
        const hdr = event.target.closest('.sw-acc-hdr');
        if (!hdr) return;
        const item = hdr.closest('.sw-acc-it');
        if (!item || item.closest('[sw-accordion]') !== this.el) return;
        this.toggle(item);
      });
      this.el.addEventListener('keydown', (event) => {
        const hdr = event.target.closest('.sw-acc-hdr');
        if (!hdr || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        hdr.click();
      });
    }

    _initAria() {
      this.el.querySelectorAll('.sw-acc-it').forEach((item) => {
        const hdr = item.querySelector('.sw-acc-hdr');
        const bdy = item.querySelector('.sw-acc-bdy');
        if (!hdr || !bdy) return;
        const id = bdy.id || `_swacc-${Math.random().toString(36).slice(2, 8)}`;
        bdy.id = id;
        hdr.setAttribute('aria-controls', id);
        hdr.setAttribute('role', 'button');
        hdr.setAttribute('tabindex', '0');
        const isOpen = item.classList.contains('is-act');
        hdr.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (isOpen) bdy.style.height = 'auto';
      });
    }

    _measure(bdy) {
      const prev = bdy.style.cssText;
      bdy.style.cssText += ';transition:none!important;height:auto!important;';
      const height = bdy.scrollHeight;
      bdy.style.cssText = prev;
      void bdy.offsetHeight;
      return height;
    }

    open(item) {
      if (!this.multi) {
        this.el.querySelectorAll('.sw-acc-it.is-act').forEach((other) => {
          if (other !== item) this.close(other);
        });
      }
      item.classList.add('is-act');
      const bdy = item.querySelector('.sw-acc-bdy');
      if (bdy) {
        const height = this._measure(bdy);
        bdy.style.height = '0';
        void bdy.offsetHeight;
        bdy.style.height = `${height}px`;
        bdy.addEventListener('transitionend', () => {
          if (item.classList.contains('is-act')) bdy.style.height = 'auto';
        }, { once: true });
      }
      item.querySelector('.sw-acc-hdr')?.setAttribute('aria-expanded', 'true');
      SW.emit(item, 'sw:accordion:open', { item });
    }

    close(item) {
      const bdy = item.querySelector('.sw-acc-bdy');
      if (bdy) {
        bdy.style.height = `${bdy.scrollHeight}px`;
        void bdy.offsetHeight;
        bdy.style.height = '0';
      }
      item.classList.remove('is-act');
      item.querySelector('.sw-acc-hdr')?.setAttribute('aria-expanded', 'false');
      SW.emit(item, 'sw:accordion:close', { item });
    }

    toggle(item) {
      if (item.classList.contains('is-act')) this.close(item);
      else this.open(item);
    }

    static initAll(root = document) {
      SW.$('[sw-accordion]', root).forEach((el) => new SWAccordion(el));
    }

    static open(container, index) {
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      const item = el?.querySelectorAll('.sw-acc-it')[index];
      if (el?._swAccordion && item) el._swAccordion.open(item);
    }
  }

  window.SW?.register('SWAccordion', SWAccordion);
  if (window.SW) window.SW.Accordion = SWAccordion;
})();

/* SW Framework Scroll-to-Top — [sw-top] no botão; fica .is-vis após 300px de scroll */
(function () {
  'use strict';
  let bound = false;

  const SWTop = {
    initAll(root = document) {
      SW.$('[sw-top]', root).forEach((btn) => {
        if (btn._swTop) return;
        btn._swTop = true;
        btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: SW.Utils?.reducedMotion() ? 'auto' : 'smooth' }));
      });

      if (bound) return;
      bound = true;
      const update = () => {
        const visible = window.scrollY > 300;
        document.querySelectorAll('[sw-top]').forEach((btn) => btn.classList.toggle('is-vis', visible));
      };
      window.addEventListener('scroll', update, { passive: true });
      update();
    }
  };

  window.SW?.register('SWTop', SWTop);
  if (window.SW) window.SW.Top = SWTop;
})();

/* SW Framework Preloader — [sw-pre] no elemento de tela cheia; some após load */
(function () {
  'use strict';

  const SWPre = {
    initAll(root = document) {
      SW.$('[sw-pre]', root).forEach((el) => {
        if (el._swPre) return;
        el._swPre = true;
        const hide = () => {
          el.classList.add('is-out');
          window.setTimeout(() => el.remove(), 600);
        };
        if (document.readyState === 'complete') window.setTimeout(hide, 200);
        else window.addEventListener('load', () => window.setTimeout(hide, 200), { once: true });
      });
    }
  };

  window.SW?.register('SWPre', SWPre);
  if (window.SW) window.SW.Pre = SWPre;
})();

/* SW Framework Dropdown — [sw-dropdown] > .sw-dropdown-tgl + .sw-dropdown-mn */
(function () {
  'use strict';

  const SWDropdown = {
    initAll(root = document) {
      SW.$('[sw-dropdown]', root).forEach((el) => {
        if (el._swDropdown) return;
        el._swDropdown = true;

        const toggle = el.querySelector('.sw-dropdown-tgl');
        const menu = el.querySelector('.sw-dropdown-mn');
        if (!toggle || !menu) return;

        const open = () => { el.classList.add('is-open'); SW.emit(el, 'sw:dropdown:open'); };
        const close = () => { el.classList.remove('is-open'); SW.emit(el, 'sw:dropdown:close'); };

        toggle.addEventListener('click', (event) => {
          event.stopPropagation();
          el.classList.contains('is-open') ? close() : open();
        });
        menu.addEventListener('click', (event) => {
          if (event.target.closest('.sw-dropdown-it:not(.is-dis)')) close();
        });
        document.addEventListener('click', (event) => {
          if (!el.contains(event.target)) close();
        });
        el.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') close();
        });
      });
    },

    open(el) { (typeof el === 'string' ? document.querySelector(el) : el)?.classList.add('is-open'); },
    close(el) { (typeof el === 'string' ? document.querySelector(el) : el)?.classList.remove('is-open'); }
  };

  window.SW?.register('SWDropdown', SWDropdown);
  if (window.SW) window.SW.Dropdown = SWDropdown;
})();

/* SW Framework Lazy Load — <img sw-lazy sw-lazy-src="real.jpg" src="placeholder.jpg"> */
(function () {
  'use strict';
  let observer = null;

  function load(img) {
    const src = img.getAttribute('sw-lazy-src');
    if (!src) return;
    const probe = new Image();
    probe.onload = () => { img.src = src; img.classList.add('is-ldd'); SW.emit(img, 'sw:lazy:loaded'); };
    probe.onerror = () => { img.classList.add('is-err'); SW.emit(img, 'sw:lazy:error'); };
    probe.src = src;
  }

  const SWLazy = {
    initAll(root = document) {
      if (!observer) {
        observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            load(entry.target);
            observer.unobserve(entry.target);
          });
        }, { rootMargin: '200px' });
      }
      SW.$('img[sw-lazy]', root).forEach((img) => {
        if (img._swLazy) return;
        img._swLazy = true;
        observer.observe(img);
      });
    }
  };

  window.SW?.register('SWLazy', SWLazy);
  if (window.SW) window.SW.Lazy = SWLazy;
})();

/* SW Framework Slider — [sw-slider] > .sw-slider-trk > .sw-slider-it, .sw-slider-prv/-nxt, .sw-slider-dot-grp */
(function () {
  'use strict';

  class SWSliderInst {
    constructor(el) {
      this.el = el;
      this.trk = el.querySelector('.sw-slider-trk');
      this.items = Array.from(el.querySelectorAll('.sw-slider-it'));
      this.btnPrv = el.querySelector('.sw-slider-prv');
      this.btnNxt = el.querySelector('.sw-slider-nxt');
      this.dotWrap = el.querySelector('.sw-slider-dot-grp');
      this.btnPly = el.querySelector('.sw-slider-ply');

      this.show = Math.max(1, parseInt(el.getAttribute('sw-slider-show'), 10) || 1);
      this.loop = el.getAttribute('sw-slider-loop') !== 'false';
      this.auto = parseInt(el.getAttribute('sw-slider-auto'), 10) || 0;
      this.hoverRun = el.getAttribute('sw-slider-hover') === 'run';
      this.effect = el.getAttribute('sw-slider-effect') || 'slide';
      this.dur = el.getAttribute('sw-slider-dur') || null;
      this.scroll = Math.min(this.show, Math.max(1, parseInt(el.getAttribute('sw-slider-scroll'), 10) || this.show));

      this.total = this.items.length;
      this.pages = this.loop
        ? Math.ceil(this.total / this.scroll)
        : Math.max(1, Math.floor((this.total - this.show) / this.scroll) + 1);
      this.page = 0;
      this._paused = false;
      this._timer = null;
      this._busy = false;
      this._infinite = false;

      if (!this.trk || !this.total) return;

      this._setupInfinite();
      this._buildDots();
      this._bind();
      this._layout(false);
      if (this.auto > 0) this._timerStart();
    }

    _setupInfinite() {
      if (!this.loop || this.effect === 'zoom') return;
      this._infinite = true;
      const appCount = this.show + Math.max(0, this.pages * this.scroll - this.total);
      this.items.slice(-this.scroll).slice().reverse()
        .forEach((it) => this.trk.insertBefore(it.cloneNode(true), this.trk.firstChild));
      this.items.slice(0, appCount)
        .forEach((it) => this.trk.appendChild(it.cloneNode(true)));
      this._extPos = 1;
    }

    _buildDots() {
      if (!this.dotWrap) return;
      this.dotWrap.innerHTML = '';
      this.dots = Array.from({ length: this.pages }, (_, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sw-slider-dot';
        btn.setAttribute('aria-label', `Página ${i + 1}`);
        btn.addEventListener('click', () => this._goTo(i));
        this.dotWrap.appendChild(btn);
        return btn;
      });
    }

    _timerStart() {
      window.clearInterval(this._timer);
      this._timer = window.setInterval(() => this._step(1), this.auto);
    }

    _timerStop() {
      window.clearInterval(this._timer);
      this._timer = null;
    }

    _bind() {
      this.btnPrv?.addEventListener('click', (event) => { event.preventDefault(); this._step(-1); });
      this.btnNxt?.addEventListener('click', (event) => { event.preventDefault(); this._step(1); });

      this.btnPly?.addEventListener('click', (event) => {
        event.preventDefault();
        this._paused = !this._paused;
        this._paused ? this._timerStop() : this._timerStart();
        this.btnPly.classList.toggle('is-paused', this._paused);
      });

      if (this.auto > 0 && !this.hoverRun) {
        this.el.addEventListener('mouseenter', () => { if (!this._paused) this._timerStop(); });
        this.el.addEventListener('mouseleave', () => { if (!this._paused) this._timerStart(); });
      }

      let startX = 0;
      this.el.addEventListener('touchstart', (event) => { startX = event.touches[0].clientX; }, { passive: true });
      this.el.addEventListener('touchend', (event) => {
        const diff = startX - event.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) this._step(diff > 0 ? 1 : -1);
      });

      this.el.setAttribute('tabindex', '0');
      this.el.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); this._step(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); this._step(1); }
      });

      if (window.ResizeObserver) {
        this._ro = new ResizeObserver(() => this._layout(false));
        this._ro.observe(this.el);
      } else {
        window.addEventListener('resize', () => this._layout(false), { passive: true });
      }
    }

    _step(dir) {
      if (this._busy) return;
      if (this._infinite) {
        if (this.el.clientWidth === 0) return;
        this._busy = true;
        this._extPos += dir;
        this._layout(true);
        const done = () => {
          this.trk.removeEventListener('transitionend', done);
          if (this._extPos === 0) { this._extPos = this.pages; this._layout(false); }
          else if (this._extPos === this.pages + 1) { this._extPos = 1; this._layout(false); }
          this._busy = false;
        };
        this.trk.addEventListener('transitionend', done);
        const durMs = this.dur ? (this.dur.includes('ms') ? parseFloat(this.dur) : parseFloat(this.dur) * 1000) : 500;
        window.setTimeout(() => { if (this._busy) done(); }, durMs + 100);
      } else {
        let next = this.page + dir;
        if (this.loop) next = ((next % this.pages) + this.pages) % this.pages;
        else next = Math.max(0, Math.min(next, this.pages - 1));
        this._goTo(next);
      }
    }

    _goTo(page) {
      if (this._infinite) this._extPos = page + 1;
      this.page = page;
      this._layout(true);
      SW.emit(this.el, 'sw:slider:change', { page });
    }

    _layout(animate) {
      if (this.effect === 'zoom') { this._layoutZoom(); return; }
      const width = this.el.clientWidth;
      if (width === 0) return;

      const itemW = width / this.show;
      this.trk.querySelectorAll('.sw-slider-it').forEach((it) => { it.style.width = `${itemW}px`; });

      const pos = this._infinite ? this._extPos : this.page;
      const offset = pos * this.scroll * itemW;
      const customTr = this.dur ? `transform ${this.dur} cubic-bezier(.4,0,.2,1)` : '';

      if (!animate) {
        this.trk.style.transition = 'none';
        this.trk.style.transform = `translateX(-${offset}px)`;
        void this.trk.getBoundingClientRect();
        this.trk.style.transition = customTr;
      } else {
        if (customTr) this.trk.style.transition = customTr;
        this.trk.style.transform = `translateX(-${offset}px)`;
      }

      if (this._infinite) this.page = (((this._extPos - 1) % this.pages) + this.pages) % this.pages;
      this.dots?.forEach((dot, i) => dot.classList.toggle('is-act', i === this.page));
    }

    _layoutZoom() {
      const prevIdx = this.items.findIndex((it) => it.classList.contains('is-act'));
      const fadeDur = this.dur || null;
      const incoming = this.items[this.page];
      incoming.classList.remove('is-out');
      if (fadeDur) incoming.style.transition = `opacity ${fadeDur} ease`;
      incoming.style.setProperty('--kb-anim', `sw-slider-kb-${(this.page % 4) + 1}`);
      const child = incoming.firstElementChild;
      if (child) {
        child.style.animation = 'none';
        void incoming.getBoundingClientRect();
        child.style.animation = '';
      }
      incoming.classList.add('is-act');

      if (prevIdx !== -1 && prevIdx !== this.page) {
        const outgoing = this.items[prevIdx];
        if (fadeDur) outgoing.style.transition = `opacity ${fadeDur} ease`;
        outgoing.classList.remove('is-act');
        outgoing.classList.add('is-out');
        outgoing.addEventListener('transitionend', () => outgoing.classList.remove('is-out'), { once: true });
      }
      this.dots?.forEach((dot, i) => dot.classList.toggle('is-act', i === this.page));
    }
  }

  class SWSlider {
    static initAll(root = document) {
      SW.$('[sw-slider]', root).forEach((el) => {
        if (el._swSlider) return;
        el._swSlider = new SWSliderInst(el);
      });
    }

    static next(el) { el._swSlider?._step(1); }
    static prev(el) { el._swSlider?._step(-1); }
    static goTo(el, idx) { el._swSlider?._goTo(idx); }
  }

  window.SW?.register('SWSlider', SWSlider);
  if (window.SW) window.SW.Slider = SWSlider;
})();

/* SW Framework Text Carousel — [sw-carousel] > .sw-carousel-trk > itens; troca com efeitos (fade/slide/zoom/bounce/flip) */
(function () {
  'use strict';

  class SWCarouselInst {
    constructor(el) {
      this.el = el;
      this.trk = el.querySelector('.sw-carousel-trk');
      if (!this.trk) return;
      this.items = Array.from(this.trk.children);
      if (!this.items.length) return;
      this.cur = 0;
      this.busy = false;
      this.effect = el.getAttribute('sw-carousel-effect') || (el.classList.contains('is-fde') ? 'fade' : 'slide-left');
      this.dur = parseInt(el.getAttribute('sw-carousel-dur'), 10) || 600;
      this.loop = el.getAttribute('sw-carousel-loop') !== 'false';
      this.auto = parseInt(el.getAttribute('sw-carousel-auto'), 10) || 0;
      this.timer = null;
      this.dts = el.querySelector('.sw-carousel-dts');
      this.prv = el.querySelector('.sw-carousel-prv');
      this.nxt = el.querySelector('.sw-carousel-nxt');
      this._build();
      this._bind();
      if (this.auto) this._resume();
    }

    _build() {
      this.el.style.setProperty('--sw-car-dur', `${this.dur}ms`);
      this.items.forEach((it, i) => {
        it.style.opacity = i === 0 ? '1' : '0';
        it.style.visibility = i === 0 ? 'visible' : 'hidden';
        it.style.transform = 'none';
        it.classList.toggle('is-act', i === 0);
      });
      if (this.dts) {
        this.dts.innerHTML = '';
        this.items.forEach((_, i) => {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = `sw-carousel-dot${i === 0 ? ' is-act' : ''}`;
          dot.setAttribute('aria-label', `Slide ${i + 1}`);
          dot.addEventListener('click', () => this._goTo(i));
          this.dts.appendChild(dot);
        });
      }
    }

    _bind() {
      this.prv?.addEventListener('click', () => this._go(-1));
      this.nxt?.addEventListener('click', () => this._go(1));
      let sx = 0;
      this.el.addEventListener('pointerdown', (event) => { sx = event.clientX; });
      this.el.addEventListener('pointerup', (event) => {
        const dx = event.clientX - sx;
        if (Math.abs(dx) > 40) this._go(dx < 0 ? 1 : -1);
      });
      if (this.auto) {
        this.el.addEventListener('mouseenter', () => this._pause());
        this.el.addEventListener('mouseleave', () => this._resume());
      }
    }

    _go(dir) {
      let next = this.cur + dir;
      if (this.loop) next = (next + this.items.length) % this.items.length;
      else if (next < 0 || next >= this.items.length) return;
      this._goTo(next);
    }

    _goTo(idx) {
      if (this.busy || idx === this.cur) return;
      this.busy = true;
      const prev = this.cur;
      const out = this.items[prev];
      const inn = this.items[idx];
      const eff = inn.getAttribute('sw-carousel-effect') || this.effect;

      out.style.position = 'absolute';
      inn.style.position = 'relative';
      inn.style.transition = 'none';
      inn.style.visibility = 'visible';
      inn.style.opacity = '0';
      inn.style.zIndex = '1';
      out.style.zIndex = '0';
      this._setStart(inn, eff);

      void inn.getBoundingClientRect();
      inn.style.transition = '';
      inn.style.opacity = '1';
      inn.style.transform = 'none';

      out.style.opacity = '0';
      this._setOut(out, eff);

      this.cur = idx;
      if (this.dts) Array.from(this.dts.children).forEach((dot, i) => dot.classList.toggle('is-act', i === idx));
      SW.emit(this.el, 'sw:carousel:change', { index: idx });

      window.setTimeout(() => {
        out.style.visibility = 'hidden';
        out.style.transform = 'none';
        out.style.zIndex = '';
        inn.style.zIndex = '';
        out.classList.remove('is-act');
        inn.classList.add('is-act');
        out.style.position = '';
        inn.style.position = '';
        this.busy = false;
      }, this.dur);
    }

    _setStart(item, eff) {
      const map = {
        'slide-left': 'translateX(100%)', 'slide-right': 'translateX(-100%)',
        'slide-up': 'translateY(100%)', 'slide-down': 'translateY(-100%)',
        'zoom-in': 'scale(0.85)', 'zoom-out': 'scale(1.15)',
        bounce: 'scale(0.7) translateY(40px)', flip: 'rotateY(90deg)'
      };
      item.style.transform = map[eff] || 'none';
    }

    _setOut(item, eff) {
      const map = {
        'slide-left': 'translateX(-100%)', 'slide-right': 'translateX(100%)',
        'slide-up': 'translateY(-100%)', 'slide-down': 'translateY(100%)',
        'zoom-in': 'scale(1.15)', 'zoom-out': 'scale(0.85)',
        bounce: 'scale(0.7) translateY(-40px)', flip: 'rotateY(-90deg)'
      };
      item.style.transform = map[eff] || 'none';
    }

    _pause() { window.clearInterval(this.timer); this.timer = null; }
    _resume() {
      if (!this.auto) return;
      this._pause();
      this.timer = window.setInterval(() => this._go(1), this.auto);
    }
  }

  class SWCarousel {
    static initAll(root = document) {
      SW.$('[sw-carousel]', root).forEach((el) => {
        if (el._swCarousel) return;
        el._swCarousel = new SWCarouselInst(el);
      });
    }

    static next(el) { el._swCarousel?._go(1); }
    static prev(el) { el._swCarousel?._go(-1); }
    static goTo(el, idx) { el._swCarousel?._goTo(idx); }
    static pause(el) { el._swCarousel?._pause(); }
    static resume(el) { el._swCarousel?._resume(); }
  }

  window.SW?.register('SWCarousel', SWCarousel);
  if (window.SW) window.SW.Carousel = SWCarousel;
})();

/* SW Framework Pagination — <nav sw-pagination sw-pagination-total sw-pagination-per sw-pagination-cur sw-pagination-delta> */
(function () {
  'use strict';

  class SWPaginationInst {
    constructor(el) {
      this.el = el;
      this.total = parseInt(el.getAttribute('sw-pagination-total'), 10) || 1;
      this.per = parseInt(el.getAttribute('sw-pagination-per'), 10) || 10;
      this.cur = parseInt(el.getAttribute('sw-pagination-cur'), 10) || 1;
      this.delta = parseInt(el.getAttribute('sw-pagination-delta'), 10) || 2;
      this.pages = Math.ceil(this.total / this.per);
      this._render();
    }

    _render() {
      const { cur, pages } = this;
      const items = [];
      items.push({ label: '&#8249;', page: cur - 1, cls: `is-arr${cur === 1 ? ' is-dis' : ''}` });

      const range = this._range(1, pages);
      let last = 0;
      range.forEach((p) => {
        if (last && p - last > 1) items.push({ label: '&hellip;', cls: 'is-sep' });
        items.push({ label: p, page: p, cls: p === cur ? 'is-act' : '' });
        last = p;
      });

      items.push({ label: '&#8250;', page: cur + 1, cls: `is-arr${cur === pages ? ' is-dis' : ''}` });

      this.el.innerHTML = items.map((it) => {
        if (it.cls === 'is-sep') return `<span class="sw-pagination-it is-sep">${it.label}</span>`;
        return `<a class="sw-pagination-it ${it.cls || ''}" data-page="${it.page || ''}" role="button" tabindex="0">${it.label}</a>`;
      }).join('');

      this.el.querySelectorAll('.sw-pagination-it[data-page]').forEach((a) => {
        a.addEventListener('click', () => this._go(parseInt(a.getAttribute('data-page'), 10)));
        a.addEventListener('keydown', (event) => { if (event.key === 'Enter') this._go(parseInt(a.getAttribute('data-page'), 10)); });
      });
    }

    _range(start, end) {
      const { cur, delta } = this;
      const set = new Set([start, end]);
      for (let i = Math.max(start, cur - delta); i <= Math.min(end, cur + delta); i += 1) set.add(i);
      return [...set].sort((a, b) => a - b);
    }

    _go(page) {
      if (page < 1 || page > this.pages || page === this.cur) return;
      this.cur = page;
      this.el.setAttribute('sw-pagination-cur', page);
      this._render();
      SW.emit(this.el, 'sw:pagination:change', { page });
    }

    goto(page) { this._go(page); }
  }

  class SWPagination {
    static initAll(root = document) {
      SW.$('[sw-pagination]', root).forEach((el) => {
        if (el._swPagination) return;
        el._swPagination = new SWPaginationInst(el);
      });
    }
  }

  window.SW?.register('SWPagination', SWPagination);
  if (window.SW) window.SW.Pagination = SWPagination;
})();

/* SW Framework Rating — [sw-rating="4.5"] só leitura · [sw-rating class="is-int"] interativo, sw-rating-max */
(function () {
  'use strict';

  class SWRatingInst {
    constructor(el) {
      this.el = el;
      this.max = parseInt(el.getAttribute('sw-rating-max'), 10) || 5;
      this.value = parseFloat(el.getAttribute('sw-rating-val')) || 0;
      this._inp = el.querySelector('input[type="hidden"]');
      this._render();
    }

    _render(hov = -1) {
      this.el.innerHTML = Array.from({ length: this.max }, (_, i) => {
        const active = hov >= 0 ? i < hov : i < this.value;
        return `<span class="sw-rating-str${active ? ' is-on' : ''}" data-v="${i + 1}" role="button" tabindex="0" aria-label="Nota ${i + 1}">★</span>`;
      }).join('');
      this.el.querySelectorAll('.sw-rating-str').forEach((star) => {
        const v = parseInt(star.getAttribute('data-v'), 10);
        star.addEventListener('mouseenter', () => this._render(v));
        star.addEventListener('mouseleave', () => this._render());
        star.addEventListener('click', () => this._set(v));
        star.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') this._set(v); });
      });
    }

    _set(val) {
      this.value = val;
      if (this._inp) this._inp.value = val;
      this._render();
      SW.emit(this.el, 'sw:rating:change', { value: val });
    }

    getValue() { return this.value; }
    setValue(v) { this._set(Number(v)); }
  }

  class SWRating {
    static initAll(root = document) {
      SW.$('[sw-rating]', root).forEach((el) => {
        if (el._swRating) return;
        const raw = el.getAttribute('sw-rating');
        const max = parseInt(el.getAttribute('sw-rating-max'), 10) || 5;
        if (raw !== '' && raw !== null && !Number.isNaN(parseFloat(raw))) {
          el._swRating = true;
          SWRating._renderStatic(el, parseFloat(raw), max);
        } else {
          el._swRating = new SWRatingInst(el);
        }
      });
    }

    static _renderStatic(el, val, max) {
      el.innerHTML = Array.from({ length: max }, (_, i) => {
        const full = i + 1 <= Math.floor(val);
        const half = !full && i + 0.5 < val;
        const cls = full ? ' is-on' : half ? ' is-half' : '';
        return `<span class="sw-rating-str${cls}" aria-hidden="true">★</span>`;
      }).join('');
    }
  }

  window.SW?.register('SWRating', SWRating);
  if (window.SW) window.SW.Rating = SWRating;
})();

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

/* SW Framework Textlimit — <textarea sw-textlimit sw-textlimit-max="200" sw-textlimit-txt="{count}/{max}"> */
(function () {
  'use strict';

  const SWTextlimit = {
    initAll(root = document) {
      SW.$('[sw-textlimit]', root).forEach((el) => {
        if (el._swTextlimit) return;
        el._swTextlimit = true;
        const max = parseInt(el.getAttribute('sw-textlimit-max'), 10) || parseInt(el.getAttribute('maxlength'), 10) || 150;
        const tpl = el.getAttribute('sw-textlimit-txt') || '{count}/{max}';
        el.setAttribute('maxlength', max);

        const counter = document.createElement('span');
        counter.className = 'sw-textlimit-cnt';
        el.insertAdjacentElement('afterend', counter);

        const update = () => {
          const n = el.value.length;
          const rem = max - n;
          counter.textContent = tpl.replace('{count}', n).replace('{max}', max).replace('{remaining}', rem);
          counter.classList.toggle('is-ale', rem >= 0 && rem <= Math.ceil(max * 0.2));
          counter.classList.toggle('is-err', rem < 0);
        };
        el.addEventListener('input', update);
        update();
      });
    }
  };

  window.SW?.register('SWTextlimit', SWTextlimit);
  if (window.SW) window.SW.Textlimit = SWTextlimit;
})();

/* SW Framework Tooltip — [sw-tooltip="Texto"] sw-tooltip-pos/-delay/-html/-clr/-follow */
(function () {
  'use strict';

  const posMap = { bot: 'bottom', lft: 'left', rgt: 'right', top: 'top' };
  let tipEl = null;
  let timer = null;

  function ensure() {
    if (tipEl) return;
    tipEl = document.createElement('div');
    tipEl.className = 'sw-tooltip';
    document.body.appendChild(tipEl);
  }

  function place(el, tip, pos) {
    const r = el.getBoundingClientRect();
    const tr = tip.getBoundingClientRect();
    const sy = window.scrollY;
    let top;
    let left;
    switch (pos) {
      case 'bottom': top = r.bottom + sy + 8; left = r.left + r.width / 2 - tr.width / 2; break;
      case 'left': top = r.top + sy + r.height / 2 - tr.height / 2; left = r.left - tr.width - 8; break;
      case 'right': top = r.top + sy + r.height / 2 - tr.height / 2; left = r.right + 8; break;
      default: top = r.top + sy - tr.height - 8; left = r.left + r.width / 2 - tr.width / 2;
    }
    tip.style.top = `${top}px`;
    tip.style.left = `${Math.max(4, Math.min(left, window.innerWidth - tr.width - 4))}px`;
  }

  const SWTooltip = {
    initAll(root = document) {
      ensure();
      SW.$('[sw-tooltip]', root).forEach((el) => {
        if (el._swTooltip) return;
        el._swTooltip = true;
        const text = el.getAttribute('sw-tooltip');
        const posRaw = el.getAttribute('sw-tooltip-pos') || 'top';
        const pos = posMap[posRaw] || posRaw;
        const delay = parseInt(el.getAttribute('sw-tooltip-delay'), 10) || 250;
        const html = el.getAttribute('sw-tooltip-html') === 'true';
        const clr = el.getAttribute('sw-tooltip-clr') || '';
        const follow = el.getAttribute('sw-tooltip-follow') === 'true';
        let lastX = 0;
        let lastY = 0;

        const placeCursor = (tip) => {
          const tr = tip.getBoundingClientRect();
          tip.style.top = `${lastY + window.scrollY - tr.height - 12}px`;
          tip.style.left = `${Math.max(4, Math.min(lastX + window.scrollX - tr.width / 2, window.innerWidth - tr.width - 4))}px`;
        };

        const show = () => {
          window.clearTimeout(timer);
          timer = window.setTimeout(() => {
            if (html) tipEl.innerHTML = text; else tipEl.textContent = text;
            tipEl.className = `sw-tooltip is-${pos}${clr ? ` is-${clr}` : ''}`;
            document.body.appendChild(tipEl);
            follow ? placeCursor(tipEl) : place(el, tipEl, pos);
            tipEl.classList.add('is-vis');
          }, delay);
        };
        const hide = () => {
          window.clearTimeout(timer);
          tipEl?.classList.remove('is-vis');
        };
        const onMove = (event) => {
          lastX = event.clientX;
          lastY = event.clientY;
          if (!tipEl?.classList.contains('is-vis')) return;
          placeCursor(tipEl);
        };

        el.addEventListener('mouseenter', (event) => { lastX = event.clientX; lastY = event.clientY; show(); });
        el.addEventListener('mouseleave', hide);
        el.addEventListener('focus', show);
        el.addEventListener('blur', hide);
        if (follow) el.addEventListener('mousemove', onMove);
      });
    },

    create(el, opts = {}) {
      el.setAttribute('sw-tooltip', opts.text || '');
      if (opts.pos !== undefined) el.setAttribute('sw-tooltip-pos', opts.pos);
      if (opts.color !== undefined) el.setAttribute('sw-tooltip-clr', opts.color);
      if (opts.html !== undefined) el.setAttribute('sw-tooltip-html', opts.html ? 'true' : 'false');
      if (opts.delay !== undefined) el.setAttribute('sw-tooltip-delay', opts.delay);
      el._swTooltip = false;
      SWTooltip.initAll(el.parentElement || document);
    },

    destroy(el) {
      el._swTooltip = false;
      el.removeAttribute('sw-tooltip');
    },

    update(el, text) {
      el.setAttribute('sw-tooltip', text);
      el._swTooltip = false;
      SWTooltip.initAll(el.parentElement || document);
    }
  };

  window.SW?.register('SWTooltip', SWTooltip);
  if (window.SW) window.SW.Tooltip = SWTooltip;
})();

/* SW Framework Parallax — [sw-parallax] sw-parallax-type="background|element|mouse|fixed" -speed -dir -inv -range -mobile */
(function () {
  'use strict';

  let items = [];
  let bound = false;
  let ticking = false;

  function cap(v, range) { return range ? Math.max(-range, Math.min(range, v)) : v; }

  function bindMouse(el, speed, dir, inv, range) {
    el.addEventListener('mousemove', (event) => {
      const r = el.getBoundingClientRect();
      const ox = cap((event.clientX - r.left - r.width / 2) * speed * (inv ? -1 : 1), range);
      const oy = cap((event.clientY - r.top - r.height / 2) * speed * (inv ? -1 : 1), range);
      const tx = dir !== 'vertical' ? ox : 0;
      const ty = dir !== 'horizontal' ? oy : 0;
      el.style.transform = `translate(${tx}px,${ty}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform 0.5s var(--sw-ease)';
      el.style.transform = '';
      window.setTimeout(() => { el.style.transition = ''; }, 500);
    });
  }

  function tick() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      items.forEach(({ el, speed, type, dir, inv, range }) => {
        const r = el.getBoundingClientRect();
        const center = r.top + r.height / 2 - window.innerHeight / 2;
        const off = cap(center * speed * (inv ? -1 : 1), range);
        if (type === 'background') {
          if (dir === 'horizontal') el.style.backgroundPositionX = `calc(50% + ${off}px)`;
          else el.style.backgroundPositionY = `calc(50% + ${off}px)`;
        } else {
          const tx = dir === 'horizontal' || dir === 'both' ? off : 0;
          const ty = dir === 'vertical' || dir === 'both' ? off : 0;
          el.style.transform = `translate(${tx}px,${ty}px)`;
        }
      });
      ticking = false;
    });
  }

  const SWParallax = {
    initAll(root = document) {
      SW.$('[sw-parallax]', root).forEach((el) => {
        if (el._swParallax) return;
        if (el.getAttribute('sw-parallax-mobile') === 'false' && window.innerWidth <= 768) return;
        el._swParallax = true;
        const type = el.getAttribute('sw-parallax-type') || 'background';
        const speed = parseFloat(el.getAttribute('sw-parallax-speed')) || 0.4;
        const dir = el.getAttribute('sw-parallax-dir') || 'vertical';
        const inv = el.getAttribute('sw-parallax-inv') === 'true';
        const range = parseFloat(el.getAttribute('sw-parallax-range')) || 0;

        if (type === 'mouse') {
          bindMouse(el, speed, dir, inv, range);
        } else if (type === 'fixed') {
          el.style.backgroundAttachment = 'fixed';
          el.style.backgroundSize = el.style.backgroundSize || 'cover';
          el.style.backgroundPosition = el.style.backgroundPosition || 'center';
        } else {
          items.push({ el, speed, type, dir, inv, range });
        }
      });
      if (items.length && !bound) {
        bound = true;
        window.addEventListener('scroll', tick, { passive: true });
        tick();
      }
    }
  };

  window.SW?.register('SWParallax', SWParallax);
  if (window.SW) window.SW.Parallax = SWParallax;
})();

/* SW Framework LGPD/Cookies — <div sw-lgpd sw-lgpd-msg sw-lgpd-modelo> ou SW.Lgpd.init({...}) */
(function () {
  'use strict';

  const SWLgpd = {
    initAll(root = document) {
      SW.$('[sw-lgpd]', root).forEach((el) => {
        if (el._swLgpd) return;
        el._swLgpd = true;
        SWLgpd.init({
          msg: el.getAttribute('sw-lgpd-msg') || 'Usamos cookies para melhorar sua experiência.',
          accept: el.getAttribute('sw-lgpd-ok') || 'Aceitar',
          reject: el.getAttribute('sw-lgpd-nao') || null,
          link: el.getAttribute('sw-lgpd-link') || '',
          modelo: parseInt(el.getAttribute('sw-lgpd-modelo'), 10) || 1,
          days: parseInt(el.getAttribute('sw-lgpd-dias'), 10) || 365,
          key: el.getAttribute('sw-lgpd-key') || 'sw_lgpd'
        });
        el.remove();
      });
    },

    init(opts = {}) {
      const cfg = {
        msg: 'Usamos cookies para melhorar sua experiência.',
        accept: 'Aceitar',
        reject: null,
        link: '',
        linkTxt: 'Saiba mais',
        modelo: 1,
        days: 365,
        key: 'sw_lgpd',
        onAccept: null,
        onReject: null,
        ...opts
      };

      if (window.localStorage.getItem(cfg.key)) return;
      document.querySelectorAll('[sw-lgpd]').forEach((el) => el.remove());

      const bar = document.createElement('div');
      bar._swLgpd = true;
      bar.setAttribute('sw-lgpd', '');
      bar.className = 'sw-lgpd';
      if (cfg.modelo > 1) bar.classList.add(`is-m${cfg.modelo}`);

      const linkHtml = cfg.link ? ` <a href="${cfg.link}" target="_blank" rel="noopener">${cfg.linkTxt}</a>` : '';
      const icon = '<svg class="sw-lgpd-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>';
      const rejectBtn = cfg.reject ? `<button sw-btn class="sw-btn-out sw-lgpd-rej">${cfg.reject}</button>` : '';
      bar.innerHTML = `${icon}<p class="sw-lgpd-txt">${cfg.msg}${linkHtml}</p><div class="sw-lgpd-act">${rejectBtn}<button sw-btn class="sw-btn-pri sw-lgpd-ok">${cfg.accept}</button></div>`;
      document.body.appendChild(bar);
      void bar.offsetHeight;
      window.requestAnimationFrame(() => bar.classList.add('is-vis'));

      const close = (accepted) => {
        bar.classList.remove('is-vis');
        window.setTimeout(() => bar.remove(), 450);
        if (accepted) {
          const exp = new Date();
          exp.setDate(exp.getDate() + cfg.days);
          window.localStorage.setItem(cfg.key, exp.toISOString());
          cfg.onAccept?.();
        } else {
          cfg.onReject?.();
        }
      };
      bar.querySelector('.sw-lgpd-ok')?.addEventListener('click', () => close(true));
      bar.querySelector('.sw-lgpd-rej')?.addEventListener('click', () => close(false));
    },

    clear(key = 'sw_lgpd') { window.localStorage.removeItem(key); }
  };

  window.SW?.register('SWLgpd', SWLgpd);
  if (window.SW) window.SW.Lgpd = SWLgpd;
})();

/* SW Framework Textarea auto-resize — <textarea sw-textarea sw-textarea-min sw-textarea-max> */
(function () {
  'use strict';

  const SWTextarea = {
    initAll(root = document) {
      SW.$('[sw-textarea]', root).forEach((el) => {
        if (el._swTextarea) return;
        el._swTextarea = true;
        const min = parseInt(el.getAttribute('sw-textarea-min'), 10) || parseInt(el.style.minHeight, 10) || 60;
        const max = parseInt(el.getAttribute('sw-textarea-max'), 10) || 0;
        el.style.overflow = 'hidden';
        el.style.resize = 'none';
        el.style.minHeight = `${min}px`;

        const resize = () => {
          el.style.height = 'auto';
          let h = el.scrollHeight;
          if (max && h > max) { h = max; el.style.overflow = 'auto'; }
          else el.style.overflow = 'hidden';
          el.style.height = `${h}px`;
        };
        el.addEventListener('input', resize);
        resize();
      });
    }
  };

  window.SW?.register('SWTextarea', SWTextarea);
  if (window.SW) window.SW.Textarea = SWTextarea;
})();

/* SW Framework Scrollspy — <nav sw-scrollspy sw-scrollspy-offset sw-scrollspy-tgt><a href="#sec">...</a></nav> */
(function () {
  'use strict';

  const SWScrollspy = {
    initAll(root = document) {
      SW.$('[sw-scrollspy]', root).forEach((nav) => {
        if (nav._swScrollspy) return;
        nav._swScrollspy = true;
        const offset = parseInt(nav.getAttribute('sw-scrollspy-offset'), 10) || 80;
        const tgtSel = nav.getAttribute('sw-scrollspy-tgt');
        const container = tgtSel ? document.querySelector(tgtSel) : null;
        const scroller = container || window;
        const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
        const targets = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);

        let ticking = false;
        const tick = () => {
          if (ticking) return;
          ticking = true;
          window.requestAnimationFrame(() => {
            const refTop = container ? container.getBoundingClientRect().top : 0;
            let cur = -1;
            targets.forEach((t, i) => { if (t.getBoundingClientRect().top - refTop <= offset) cur = i; });
            const atBottom = container
              ? container.scrollTop + container.clientHeight >= container.scrollHeight - 4
              : window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
            if (atBottom && targets.length) cur = targets.length - 1;
            links.forEach((a, i) => {
              const active = i === cur;
              a.classList.toggle('is-act', active);
              a.setAttribute('aria-current', active ? 'true' : 'false');
              if (active) SW.emit(nav, 'sw:scrollspy:change', { id: targets[i]?.id, link: a });
            });
            ticking = false;
          });
        };

        links.forEach((a, i) => {
          a.addEventListener('click', (event) => {
            event.preventDefault();
            const target = targets[i];
            if (!target) return;
            if (container) {
              const top = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
              container.scrollTo({ top: top - offset + 1, behavior: 'smooth' });
            } else {
              const top = target.getBoundingClientRect().top + window.scrollY;
              window.scrollTo({ top: top - offset + 1, behavior: 'smooth' });
            }
          });
        });

        scroller.addEventListener('scroll', tick, { passive: true });
        tick();
      });
    }
  };

  window.SW?.register('SWScrollspy', SWScrollspy);
  if (window.SW) window.SW.Scrollspy = SWScrollspy;
})();

/* SW Framework Smooth Scroll — <a sw-scroll href="#secao"> ou sw-scroll-target/-offset · SW.Scroll.to('#sel', offset) */
(function () {
  'use strict';

  const SWScroll = {
    initAll(root = document) {
      SW.$('[sw-scroll]', root).forEach((el) => {
        if (el._swScroll) return;
        el._swScroll = true;
        el.addEventListener('click', (event) => {
          const sel = el.getAttribute('sw-scroll-target') || el.getAttribute('href');
          const offset = parseInt(el.getAttribute('sw-scroll-offset'), 10) || 80;
          if (!sel || !sel.startsWith('#')) return;
          event.preventDefault();
          SWScroll.to(sel, offset);
        });
      });
    },

    to(sel, offset = 80) {
      const target = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (!target) return;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: SW.Utils?.reducedMotion() ? 'auto' : 'smooth' });
      SW.emit(target, 'sw:scroll:arrived');
    }
  };

  window.SW?.register('SWScroll', SWScroll);
  if (window.SW) window.SW.Scroll = SWScroll;
})();

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

/* SW Framework Material Input — <div class="fld-mat"><input sw-matinp sw-matinp-label="Nome" sw-matinp-req ...></div> */
(function () {
  'use strict';

  const masks = {
    telefone: (v) => applyPattern(v.replace(/\D/g, ''), v.replace(/\D/g, '').length <= 10 ? '(##) ####-####' : '(##) #####-####'),
    cpf: (v) => applyPattern(v.replace(/\D/g, ''), '###.###.###-##'),
    cnpj: (v) => applyPattern(v.replace(/\D/g, ''), '##.###.###/####-##'),
    cep: (v) => applyPattern(v.replace(/\D/g, ''), '#####-###'),
    data: (v) => applyPattern(v.replace(/\D/g, ''), '##/##/####'),
    hora: (v) => applyPattern(v.replace(/\D/g, ''), '##:##'),
    cartao: (v) => applyPattern(v.replace(/\D/g, ''), '#### #### #### ####')
  };

  function applyPattern(digits, pattern) {
    let i = 0;
    return pattern.split('').map((c) => (c === '#' ? (digits[i++] ?? '') : (i < digits.length ? c : ''))).join('');
  }

  const rules = {
    req: (v, _p, el) => v.trim() !== '' || (el.getAttribute('sw-matinp-msg-req') || 'Campo obrigatório.'),
    email: (v, _p, el) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || (el.getAttribute('sw-matinp-msg-email') || 'E-mail inválido.'),
    url: (v, _p, el) => !v || /^https?:\/\/.+/.test(v) || (el.getAttribute('sw-matinp-msg-url') || 'URL inválida.'),
    minlen: (v, p, el) => !v || v.length >= parseInt(p, 10) || (el.getAttribute('sw-matinp-msg-minlen') || `Mínimo ${p} caracteres.`),
    maxlen: (v, p, el) => !v || v.length <= parseInt(p, 10) || (el.getAttribute('sw-matinp-msg-maxlen') || `Máximo ${p} caracteres.`),
    min: (v, p, el) => !v || parseFloat(v) >= parseFloat(p) || (el.getAttribute('sw-matinp-msg-min') || `Valor mínimo: ${p}.`),
    max: (v, p, el) => !v || parseFloat(v) <= parseFloat(p) || (el.getAttribute('sw-matinp-msg-max') || `Valor máximo: ${p}.`),
    match: (v, p, el) => {
      const other = document.querySelector(p);
      return !other || v === other.value || (el.getAttribute('sw-matinp-msg-match') || 'Os valores não coincidem.');
    },
    regex: (v, p, el) => {
      try { return !v || new RegExp(p).test(v) || (el.getAttribute('sw-matinp-msg-regex') || 'Formato inválido.'); }
      catch (_) { return true; }
    }
  };

  class SWMatinpInst {
    constructor(el) {
      this._inp = el;
      this._wrap = el.closest('.fld-mat') || el.parentElement;
      this._mask = el.getAttribute('sw-matinp-mask') || null;
      this._validateOn = el.getAttribute('sw-matinp-validate') || 'blur';
      el._swMatinp = this;
      this._build();
      this._bindEvents();
    }

    _build() {
      const el = this._inp;
      const wrap = this._wrap;
      if (!el.placeholder) el.placeholder = ' ';

      let lbl = wrap.querySelector('.fld-mat-lbl');
      if (!lbl && el.getAttribute('sw-matinp-label')) {
        lbl = document.createElement('label');
        lbl.className = 'fld-mat-lbl';
        lbl.textContent = el.getAttribute('sw-matinp-label');
        if (el.id) lbl.setAttribute('for', el.id);
        el.insertAdjacentElement('afterend', lbl);
      }

      const hintText = el.getAttribute('sw-matinp-hint');
      if (hintText) {
        let hint = wrap.querySelector('.fld-mat-hint');
        if (!hint) {
          hint = document.createElement('span');
          hint.className = 'fld-mat-hint';
          wrap.appendChild(hint);
        }
        hint.textContent = hintText;
        this._hint = hint;
      }

      let msg = wrap.querySelector('.fld-mat-msg');
      if (!msg) {
        msg = document.createElement('span');
        msg.className = 'fld-mat-msg';
        msg.setAttribute('aria-live', 'polite');
        wrap.appendChild(msg);
      }
      this._msg = msg;
    }

    _bindEvents() {
      const el = this._inp;
      if (this._mask && masks[this._mask]) {
        el.addEventListener('input', () => {
          const pos = el.selectionStart;
          el.value = masks[this._mask](el.value);
          try { el.setSelectionRange(pos, pos); } catch (_) { /* posição fora do range em alguns navegadores */ }
          SW.emit(el, 'sw:matinp:change', { value: el.value });
        });
      }

      if (this._validateOn === 'input') {
        el.addEventListener('input', () => { this.validate(); SW.emit(el, 'sw:matinp:change', { value: el.value }); });
      } else if (this._validateOn === 'change') {
        el.addEventListener('change', () => this.validate());
      } else {
        el.addEventListener('blur', () => this.validate());
        el.addEventListener('input', () => {
          if (this._wrap.classList.contains('is-err')) this.validate();
          SW.emit(el, 'sw:matinp:change', { value: el.value });
        });
      }
    }

    validate() {
      const el = this._inp;
      const val = el.value;
      let error = '';
      for (const [rule, fn] of Object.entries(rules)) {
        if (!el.hasAttribute(`sw-matinp-${rule}`)) continue;
        const param = el.getAttribute(`sw-matinp-${rule}`) || '';
        const res = fn(val, param, el);
        if (res !== true) { error = res; break; }
      }
      if (error) {
        this.setError(error);
        SW.emit(el, 'sw:matinp:invalid', { value: val, error });
        return false;
      }
      this.clearError();
      if (val !== '') {
        this._wrap.classList.add('is-ok');
        SW.emit(el, 'sw:matinp:valid', { value: val });
      }
      return true;
    }

    setError(msg) {
      this._wrap.classList.add('is-err');
      this._wrap.classList.remove('is-ok');
      if (this._msg) this._msg.textContent = msg;
      if (this._hint) this._hint.style.display = 'none';
    }

    clearError() {
      this._wrap.classList.remove('is-err');
      if (this._msg) this._msg.textContent = '';
      if (this._hint) this._hint.style.display = '';
    }

    getValue() { return this._inp.value; }
    setValue(v) { this._inp.value = v; this.validate(); }
    reset() { this._inp.value = ''; this.clearError(); this._wrap.classList.remove('is-ok'); }
  }

  class SWMatinp {
    static initAll(root = document) {
      SW.$('[sw-matinp]', root).forEach((el) => {
        if (el._swMatinp) return;
        new SWMatinpInst(el);
      });
    }

    static addRule(name, fn) { rules[name] = fn; }
  }

  window.SW?.register('SWMatinp', SWMatinp);
  if (window.SW) window.SW.Matinp = SWMatinp;
})();

/* SW Framework Sidebar — <aside sw-sidebar sw-sidebar-mode="fixed|toggle|collapse|hover">
   Botão externo: [sw-sidebar-open="#id"] · Overlay: [sw-sidebar-ovl]
   Submenu: <a sw-sidebar-sub>...</a> seguido de <div sw-sidebar-sub-items>...</div> */
(function () {
  'use strict';

  function initSubmenus(sdb) {
    SW.$('[sw-sidebar-sub]', sdb).forEach((trigger) => {
      if (trigger._swSidebarSub) return;
      trigger._swSidebarSub = true;
      const items = trigger.nextElementSibling;
      if (!items || !items.hasAttribute('sw-sidebar-sub-items')) return;

      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        if (sdb.hasAttribute('col')) return;
        const isOpen = items.hasAttribute('open');
        if (isOpen) { items.removeAttribute('open'); trigger.removeAttribute('open'); }
        else { items.setAttribute('open', ''); trigger.setAttribute('open', ''); }
        SW.emit(sdb, 'sw:sidebar:submenu', { trigger, items, open: !isOpen });
      });
    });
  }

  const SWSidebar = {
    initAll(root = document) {
      SW.$('[sw-sidebar]', root).forEach((el) => {
        if (el._swSidebar) return;
        el._swSidebar = true;

        const mode = el.getAttribute('sw-sidebar-mode') || 'toggle';
        const start = el.getAttribute('sw-sidebar-start') || 'open';

        if (mode === 'fixed') { initSubmenus(el); return; }

        if (mode === 'toggle') {
          const overlay = document.querySelector('[sw-sidebar-ovl]');
          if (overlay && !overlay._swSidebarOvl) {
            overlay._swSidebarOvl = true;
            overlay.addEventListener('click', () => SWSidebar.close(el));
          }
          document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !el.hasAttribute('hid')) SWSidebar.close(el);
          });
        }

        if (mode === 'collapse') {
          start === 'icons' ? el.setAttribute('col', '') : el.removeAttribute('col');
          el.querySelector('[sw-sidebar-tgl]')?.addEventListener('click', () => {
            el.hasAttribute('col') ? el.removeAttribute('col') : el.setAttribute('col', '');
            SW.emit(el, 'sw:sidebar:toggle');
          });
        }

        if (mode === 'hover') {
          el.setAttribute('col', '');
          el.addEventListener('mouseenter', () => { el.removeAttribute('col'); SW.emit(el, 'sw:sidebar:open'); });
          el.addEventListener('mouseleave', () => { el.setAttribute('col', ''); SW.emit(el, 'sw:sidebar:close'); });
        }

        initSubmenus(el);
      });

      SW.$('[sw-sidebar-open]', root).forEach((btn) => {
        if (btn._swSidebarBtn) return;
        btn._swSidebarBtn = true;
        btn.addEventListener('click', () => {
          const sdb = document.querySelector(btn.getAttribute('sw-sidebar-open'));
          if (!sdb) return;
          sdb.hasAttribute('hid') ? SWSidebar.open(sdb) : SWSidebar.close(sdb);
        });
      });
    },

    open(sdb) {
      sdb = typeof sdb === 'string' ? document.querySelector(sdb) : sdb;
      const overlay = document.querySelector('[sw-sidebar-ovl]');
      sdb?.removeAttribute('hid');
      overlay?.setAttribute('vis', '');
      SW.emit(sdb, 'sw:sidebar:open');
    },

    close(sdb) {
      sdb = typeof sdb === 'string' ? document.querySelector(sdb) : sdb;
      const overlay = document.querySelector('[sw-sidebar-ovl]');
      sdb?.setAttribute('hid', '');
      overlay?.removeAttribute('vis');
      SW.emit(sdb, 'sw:sidebar:close');
    }
  };

  window.SW?.register('SWSidebar', SWSidebar);
  if (window.SW) window.SW.Sidebar = SWSidebar;
})();

/* SW Framework Rich Text Editor — <textarea sw-editor sw-editor-height sw-editor-min sw-editor-max sw-editor-resizable> */
(function () {
  'use strict';

  class SWEditorInst {
    constructor(el) {
      this.el = el;
      this.name = el.getAttribute('name') || el.getAttribute('sw-editor-name') || 'content';
      this.ph = el.getAttribute('sw-editor-placeholder') || '';
      this.h = parseInt(el.getAttribute('sw-editor-height'), 10) || 150;
      this.minH = parseInt(el.getAttribute('sw-editor-min'), 10) || 100;
      this.maxH = parseInt(el.getAttribute('sw-editor-max'), 10) || 800;
      this.rzbl = el.getAttribute('sw-editor-resizable') !== 'false';
      this.val = el.value || '';
      this._render();
      this._bind();
    }

    _render() {
      const box = document.createElement('div');
      box.className = 'sw-editor-box';

      const tb = document.createElement('div');
      tb.className = 'sw-editor-tb';

      const fmtGrp = document.createElement('div');
      fmtGrp.className = 'sw-editor-grp';
      const fmt = document.createElement('select');
      fmt.className = 'sw-editor-fmt';
      fmt.title = 'Formato do bloco';
      fmt.innerHTML = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].map((t) => `<option value="${t}">${t}</option>`).join('');
      fmtGrp.appendChild(fmt);
      tb.appendChild(fmtGrp);

      const groups = [
        [['bold', 'swi-bold', 'Negrito (Ctrl+B)'], ['italic', 'swi-italic', 'Itálico (Ctrl+I)'], ['underline', 'swi-underline', 'Sublinhado (Ctrl+U)'], ['strikeThrough', 'swi-strikethrough', 'Tachado']],
        [['foreColor', 'swi-font-color', 'Cor da fonte'], ['backColor', 'swi-highlight', 'Cor de fundo'], ['clean', 'swi-eraser', 'Limpar formatação']],
        [['justifyLeft', 'swi-align-left', 'Alinhar esquerda'], ['justifyCenter', 'swi-align-middle', 'Centralizar'], ['justifyRight', 'swi-align-right', 'Alinhar direita'], ['justifyFull', 'swi-align-justify', 'Justificar']],
        [['insertUnorderedList', 'swi-list-ul', 'Lista'], ['insertOrderedList', 'swi-list-ol', 'Lista numerada'], ['hr', 'swi-minus', 'Linha horizontal'], ['link', 'swi-link', 'Link (Ctrl+K)'], ['image', 'swi-image', 'Imagem'], ['code', 'swi-code', 'Ver HTML'], ['fullscreen', 'swi-expand', 'Tela cheia']]
      ];
      groups.forEach((grp) => {
        const g = document.createElement('div');
        g.className = 'sw-editor-grp';
        grp.forEach(([cmd, icon, title]) => {
          g.innerHTML += `<button type="button" class="sw-editor-btn" data-cmd="${cmd}" title="${title}"><i class="swi ${icon}"></i></button>`;
        });
        tb.appendChild(g);
      });

      const fgI = document.createElement('input');
      fgI.type = 'color'; fgI.className = 'sw-editor-fg'; fgI.value = '#e53e3e';
      fgI.style.cssText = 'position:absolute;opacity:0;width:1px;height:1px;pointer-events:none';
      const bgI = document.createElement('input');
      bgI.type = 'color'; bgI.className = 'sw-editor-bg'; bgI.value = '#ffff00';
      bgI.style.cssText = 'position:absolute;opacity:0;width:1px;height:1px;pointer-events:none';
      tb.appendChild(fgI);
      tb.appendChild(bgI);

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
      this.fmt = fmt; this.fgI = fgI; this.bgI = bgI;
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
      this.fgI.addEventListener('mousedown', saveSel);
      this.bgI.addEventListener('mousedown', saveSel);

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

      this.fmt.addEventListener('change', () => {
        document.execCommand('formatBlock', false, this.fmt.value);
        this._sync(); this.ed.focus(); this._updateBtns();
      });

      this.fgI.addEventListener('input', () => {
        this.ed.focus(); restSel();
        document.execCommand('foreColor', false, this.fgI.value);
        this._sync();
      });
      this.bgI.addEventListener('input', () => {
        this.ed.focus(); restSel();
        document.execCommand('hiliteColor', false, this.bgI.value);
        this._sync();
      });

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
      try { const fb = document.queryCommandValue('formatBlock'); if (fb) this.fmt.value = fb.toUpperCase(); } catch (_) { /* comando indisponível neste contexto */ }
    }

    _shortcuts(event, restSel) {
      if (!event.ctrlKey && !event.metaKey) return;
      const k = event.key.toLowerCase();
      const map = { b: 'bold', i: 'italic', u: 'underline', k: 'link', z: 'undo', y: 'redo' };
      const fmts = { 0: 'P', 1: 'H1', 2: 'H2', 3: 'H3', 4: 'H4', 5: 'H5', 6: 'H6' };
      if (map[k]) { event.preventDefault(); this._exec(map[k], restSel); this._sync(); }
      else if (fmts[k]) { event.preventDefault(); document.execCommand('formatBlock', false, fmts[k]); this._sync(); }
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

/* SW Framework Cotação — <div sw-cotacao sw-cotacao-pares="USD-BRL,EUR-BRL" sw-cotacao-tipo="c" sw-cotacao-mode="cards|table" sw-cotacao-auto="30000">
   Usa a API pública da AwesomeAPI (awesomeapi.com.br), sem token. */
(function () {
  'use strict';

  class SWCotacaoInst {
    constructor(el) {
      this.el = el;
      this.pares = (el.getAttribute('sw-cotacao-pares') || 'USD-BRL,EUR-BRL').split(',').map((p) => p.trim());
      this.tipo = el.getAttribute('sw-cotacao-tipo') || 'c';
      this.mode = el.getAttribute('sw-cotacao-mode') || 'cards';
      this.auto = parseInt(el.getAttribute('sw-cotacao-auto'), 10) || 0;
      this._fetch();
      if (this.auto > 0) window.setInterval(() => this._fetch(), this.auto);
    }

    _fetch() {
      const pairs = this.pares.join(',');
      fetch(`https://economia.awesomeapi.com.br/last/${pairs}`)
        .then((r) => r.json())
        .then((data) => this._render(data))
        .catch(() => { this.el.innerHTML = '<p class="sw-text-mut">Cotação indisponível.</p>'; });
    }

    _render(data) {
      const vals = Object.values(data);
      if (this.mode === 'table') {
        const rows = vals.map((v) => {
          const pct = parseFloat(v.pctChange || 0);
          const cls = pct >= 0 ? 'is-up' : 'is-dwn';
          const sign = pct >= 0 ? '▲' : '▼';
          const bid = parseFloat(v.bid || 0);
          const ask = parseFloat(v.ask || 0);
          const high = parseFloat(v.high || 0);
          const low = parseFloat(v.low || 0);
          const dec = bid < 1 ? 6 : bid < 10 ? 4 : 2;
          return `<tr><td class="sw-cotacao-tcod">${v.code}/${v.codein}</td><td class="sw-cotacao-tval">R$ ${bid.toFixed(dec)}</td><td class="sw-cotacao-tval">R$ ${ask.toFixed(dec)}</td><td class="sw-cotacao-tpct ${cls}">${sign} ${Math.abs(pct).toFixed(2)}%</td><td class="sw-cotacao-tval">R$ ${high.toFixed(dec)}</td><td class="sw-cotacao-tval">R$ ${low.toFixed(dec)}</td></tr>`;
        }).join('');
        this.el.innerHTML = `<table class="sw-cotacao-table"><thead><tr><th>Par</th><th>Compra</th><th>Venda</th><th>Variação</th><th>Máx 24h</th><th>Mín 24h</th></tr></thead><tbody>${rows}</tbody></table>`;
      } else {
        const items = vals.map((v) => {
          const val = parseFloat(this.tipo === 'c' ? v.bid : v.ask);
          const pct = parseFloat(v.pctChange || 0);
          const cls = pct >= 0 ? 'is-up' : 'is-dwn';
          const sign = pct >= 0 ? '▲' : '▼';
          return `<div class="sw-cotacao-it"><span class="sw-cotacao-par">${v.code}/${v.codein}</span><span class="sw-cotacao-val ${cls}">R$ ${val.toFixed(4)}</span><span class="sw-cotacao-sub ${cls}">${sign} ${Math.abs(pct).toFixed(2)}%</span></div>`;
        }).join('');
        this.el.innerHTML = `<div class="sw-cotacao-wrap">${items}</div>`;
      }
    }
  }

  class SWCotacao {
    static initAll(root = document) {
      SW.$('[sw-cotacao]', root).forEach((el) => {
        if (el._swCotacao) return;
        el._swCotacao = new SWCotacaoInst(el);
      });
    }
  }

  window.SW?.register('SWCotacao', SWCotacao);
  if (window.SW) window.SW.Cotacao = SWCotacao;
})();

/* SW Framework Instagram — <div sw-instagram sw-instagram-user="..." sw-instagram-proxy="/instagram.php" sw-instagram-cols="3" sw-instagram-limit="12">
   ou modo legado: sw-instagram-urls="url1,url2" sw-instagram-mode="embed|iframe" */
(function () {
  'use strict';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fmt(n) {
    n = parseInt(n, 10) || 0;
    if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace('.0', '')}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}K`;
    return n;
  }
  function code(url) {
    const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
  }
  function loadEmbedScript() {
    if (window.instgrm?.Embeds) { window.instgrm.Embeds.process(); return; }
    if (window._swInstaLoading) return;
    window._swInstaLoading = true;
    const s = document.createElement('script');
    s.src = 'https://www.instagram.com/embed.js';
    s.async = true;
    document.body.appendChild(s);
  }

  class SWInstagramInst {
    constructor(el) {
      this.el = el;
      this.cols = parseInt(el.getAttribute('sw-instagram-cols'), 10) || 3;
      this.gap = el.getAttribute('sw-instagram-gap') || '.4rem';
      this.limit = parseInt(el.getAttribute('sw-instagram-limit'), 10) || 12;
      el.style.setProperty('--sw-instagram-cols', this.cols);
      el.style.setProperty('--sw-instagram-gap', this.gap);

      const user = el.getAttribute('sw-instagram-user');
      const jsonUrl = el.getAttribute('sw-instagram-json');
      const proxy = el.getAttribute('sw-instagram-proxy') || '/dist/sw-instagram.php';

      if (user || jsonUrl) {
        this._proxy = jsonUrl ? null : proxy;
        el.classList.add('sw-instagram-grid');
        this._showSkeletons();
        const src = jsonUrl ? jsonUrl : `${proxy}?user=${encodeURIComponent(user)}&limit=${this.limit}`;
        fetch(src)
          .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
          .then((data) => this._renderFeed(data))
          .catch(() => this._renderError());
        return;
      }

      this.urls = (el.getAttribute('sw-instagram-urls') || el.getAttribute('sw-instagram-url') || '').split(',').map((u) => u.trim()).filter(Boolean);
      this.mode = el.getAttribute('sw-instagram-mode') || 'embed';

      if (!this.urls.length) {
        el.innerHTML = '<p class="sw-text-mut" style="padding:1rem">Nenhuma URL configurada.</p>';
        return;
      }

      el.classList.add('sw-instagram-grid');

      if (this.mode === 'iframe') {
        el.innerHTML = this.urls.map((url) => {
          const c = code(url);
          return c ? `<div class="sw-instagram-it is-iframe"><iframe src="https://www.instagram.com/p/${c}/embed/" scrolling="no" frameborder="0" allowtransparency="true" loading="lazy" title="Post Instagram"></iframe></div>` : '';
        }).join('');
      } else {
        el.innerHTML = this.urls.map((url) => `<div class="sw-instagram-it"><blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14" style="min-width:unset!important;max-width:100%!important;width:100%!important;margin:0!important"></blockquote></div>`).join('');
        loadEmbedScript();
      }
    }

    _showSkeletons() {
      this.el.innerHTML = Array(Math.min(this.limit, 9)).fill(0).map(() => '<div class="sw-instagram-it"><div class="sw-instagram-skl"></div></div>').join('');
    }

    _renderFeed(data) {
      if (data.error || !data.posts?.length) { this._renderError(data.error); return; }
      const posts = data.posts.slice(0, this.limit);
      let html = '<div class="sw-instagram-feed">';
      if (data.user) {
        const ig = `https://instagram.com/${data.user}`;
        const avatarSrc = this._imgUrl(data.avatar);
        html += `<div class="sw-instagram-hdr">${avatarSrc ? `<img class="sw-instagram-avatar" src="${avatarSrc}" alt="@${data.user}" loading="lazy">` : ''}<div class="sw-instagram-hdr-info"><span class="sw-instagram-uname">@${data.user}</span>${data.name && data.name !== data.user ? `<span class="sw-instagram-fullname">${esc(data.name)}</span>` : ''}${data.followers ? `<span class="sw-instagram-fol">${fmt(data.followers)} seguidores</span>` : ''}</div><a class="sw-instagram-hdr-lnk" href="${ig}" target="_blank" rel="noopener noreferrer" title="Ver no Instagram"><i class="swi swi-link-external"></i></a></div>`;
      }
      html += '<div class="sw-instagram-cards">';
      posts.forEach((p) => {
        const cap = esc(p.caption || '');
        const img = this._imgUrl(p.image || p.thumb || '');
        html += `<a class="sw-instagram-it is-card" href="${p.url}" target="_blank" rel="noopener noreferrer"><div class="sw-instagram-img"><img src="${img}" alt="${cap.substring(0, 80)}" loading="lazy" onerror="this.style.display='none'"><div class="sw-instagram-ovl">${cap ? `<p class="sw-instagram-cap">${cap}</p>` : ''}<div class="sw-instagram-stats">${p.likes ? `<span>♥ ${fmt(p.likes)}</span>` : ''}${p.comments ? `<span>💬 ${fmt(p.comments)}</span>` : ''}</div></div>${p.is_video ? '<div class="sw-instagram-vid">▶</div>' : ''}</div></a>`;
      });
      html += '</div></div>';
      this.el.innerHTML = html;
    }

    _renderError(msg = 'Não foi possível carregar o feed.') {
      this.el.innerHTML = `<p class="sw-text-mut" style="padding:1rem;grid-column:1/-1;text-align:center">${esc(msg)}</p>`;
    }

    _imgUrl(src) {
      if (!src) return '';
      if (src.startsWith('?img=') && this._proxy) return this._proxy + src;
      return src;
    }
  }

  class SWInstagram {
    static initAll(root = document) {
      SW.$('[sw-instagram]', root).forEach((el) => {
        if (el._swInstagram) return;
        el._swInstagram = new SWInstagramInst(el);
      });
    }
  }

  window.SW?.register('SWInstagram', SWInstagram);
  if (window.SW) window.SW.Instagram = SWInstagram;
})();

/* SW Framework Infinite Scroll — <div sw-infinite sw-infinite-url="/api/posts?page={page}" sw-infinite-target="#lista" sw-infinite-per sw-infinite-offset>
   Eventos: sw:infinite:load { page, items } · sw:infinite:end · sw:infinite:error { page } */
(function () {
  'use strict';

  class SWInfiniteInst {
    constructor(el) {
      this.el = el;
      this.url = el.getAttribute('sw-infinite-url');
      this.target = document.querySelector(el.getAttribute('sw-infinite-target') || 'body');
      this.offset = parseInt(el.getAttribute('sw-infinite-offset'), 10) || 300;
      this.page = parseInt(el.getAttribute('sw-infinite-start'), 10) || 1;
      this.loading = false;
      this.done = false;

      window.addEventListener('scroll', () => this._check(), { passive: true });
      this._check();
    }

    _check() {
      if (this.loading || this.done) return;
      const dist = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      if (dist <= this.offset) this._load();
    }

    _load() {
      this.loading = true;
      const url = this.url.replace('{page}', this.page);

      const spin = document.createElement('div');
      spin.className = 'sw-infinite-loader';
      spin.textContent = 'Carregando…';
      this.target.appendChild(spin);

      fetch(url)
        .then((r) => r.text())
        .then((html) => {
          spin.remove();
          const tmp = document.createElement('div');
          tmp.innerHTML = html;
          const items = Array.from(tmp.children);

          if (!items.length) {
            this.done = true;
            SW.emit(this.el, 'sw:infinite:end');
            return;
          }

          const frag = document.createDocumentFragment();
          items.forEach((it) => frag.appendChild(it));
          this.target.appendChild(frag);
          SW.reinit(this.target);
          this.page += 1;
          SW.emit(this.el, 'sw:infinite:load', { page: this.page, items });
        })
        .catch(() => {
          spin.remove();
          SW.emit(this.el, 'sw:infinite:error', { page: this.page });
        })
        .finally(() => { this.loading = false; });
    }
  }

  class SWInfinite {
    static initAll(root = document) {
      SW.$('[sw-infinite]', root).forEach((el) => {
        if (el._swInfinite) return;
        el._swInfinite = new SWInfiniteInst(el);
      });
    }
  }

  window.SW?.register('SWInfinite', SWInfinite);
  if (window.SW) window.SW.Infinite = SWInfinite;
})();

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

/* SW Framework Content — <div sw-content="/api/posts" sw-content-tmpl="#tmpl" sw-content-empty sw-content-err sw-content-trigger="load|click|visible" sw-content-paginate>
   <template>...{{campo}}...</template></div> — fetch JSON, interpola em <template>. API: SW.Content.load(el) */
(function () {
  'use strict';

  class SWContentInst {
    constructor(el) {
      this.el = el;
      this.url = el.getAttribute('sw-content');
      this.tmplSel = el.getAttribute('sw-content-tmpl') || null;
      this.emptyMsg = el.getAttribute('sw-content-empty') || '';
      this.errMsg = el.getAttribute('sw-content-err') || 'Erro ao carregar conteúdo.';
      this.trigger = el.getAttribute('sw-content-trigger') || 'load';
      this.paginate = el.hasAttribute('sw-content-paginate');
      this.page = 1;
      this.loading = false;
      this.tmpl = this.tmplSel ? document.querySelector(this.tmplSel) : el.querySelector('template');
      this._bind();
    }

    _bind() {
      if (this.trigger === 'load') this.load();
      if (this.trigger === 'click') {
        const btn = document.querySelector(this.el.getAttribute('sw-content-btn') || '[sw-content-load]');
        btn?.addEventListener('click', () => this.load());
      }
      if (this.trigger === 'visible') {
        const observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) { observer.disconnect(); this.load(); }
        });
        observer.observe(this.el);
      }
    }

    async load(page = this.page) {
      if (this.loading) return;
      this.loading = true;
      this.page = page;

      let url = this.url;
      if (this.paginate) url += `${url.includes('?') ? '&' : '?'}page=${page}`;

      try {
        const res = await fetch(url, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        this._render(json);
      } catch (_) {
        this._showErr();
      } finally {
        this.loading = false;
      }
    }

    _render(json) {
      const list = Array.isArray(json) ? json : Array.isArray(json.dados) ? json.dados : [json];
      const container = document.createElement('div');

      if (!list.length) {
        if (this.emptyMsg) container.innerHTML = `<p class="sw-text-mut" style="padding:1rem">${this.emptyMsg}</p>`;
      } else {
        list.forEach((item) => {
          const node = this._renderItem(item);
          if (node) container.appendChild(node);
        });
      }

      if (this.paginate && json.paginas > 1) container.appendChild(this._buildPager(json));

      const keep = this.el.querySelector('template');
      this.el.innerHTML = '';
      if (keep) this.el.appendChild(keep);
      this.el.appendChild(container);
      SW.reinit(container);

      SW.emit(this.el, 'sw:content:loaded', { dados: json });
    }

    _renderItem(item) {
      if (!this.tmpl) return null;
      const clone = this.tmpl.content.cloneNode(true);
      this._interpolate(clone, item);
      const wrap = document.createElement('div');
      wrap.appendChild(clone);
      return wrap.firstElementChild || wrap;
    }

    _interpolate(node, data) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent = node.textContent.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? '');
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        Array.from(node.attributes).forEach((attr) => {
          attr.value = attr.value.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? '');
        });
      }
      node.childNodes.forEach((c) => this._interpolate(c, data));
    }

    _buildPager(json) {
      const div = document.createElement('div');
      div.className = 'sw-content-pager';
      if (json.pagina > 1) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('sw-btn', '');
        btn.className = 'sw-btn-sm';
        btn.textContent = '← Anterior';
        btn.addEventListener('click', () => this.load(json.pagina - 1));
        div.appendChild(btn);
      }
      const info = document.createElement('span');
      info.className = 'sw-text-mut';
      info.textContent = `Página ${json.pagina} de ${json.paginas}`;
      div.appendChild(info);
      if (json.pagina < json.paginas) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('sw-btn', '');
        btn.className = 'sw-btn-sm';
        btn.textContent = 'Próxima →';
        btn.addEventListener('click', () => this.load(json.pagina + 1));
        div.appendChild(btn);
      }
      return div;
    }

    _showErr() {
      this.el.innerHTML = `<p class="sw-text-err" style="padding:1rem">${this.errMsg}</p>`;
    }
  }

  class SWContent {
    static initAll(root = document) {
      SW.$('[sw-content]', root).forEach((el) => {
        if (el._swContent) return;
        el._swContent = new SWContentInst(el);
      });
    }

    static load(el) { el._swContent?.load(); }
  }

  window.SW?.register('SWContent', SWContent);
  if (window.SW) window.SW.Content = SWContent;
})();

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
