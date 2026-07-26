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
