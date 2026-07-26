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
      void element.offsetWidth;
      element.classList.add(cls);
      if (cls.startsWith('sw-rev-')) {
        requestAnimationFrame(() => requestAnimationFrame(() => element.classList.add('is-revealed')));
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
