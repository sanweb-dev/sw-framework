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
