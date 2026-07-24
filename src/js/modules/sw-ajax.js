/* SW Framework AJAX — safe same-origin HTML fragments */
(function () {
  'use strict';

  class SWAjax {
    static initAll(root = document) {
      SW.$('[sw-ajax], [sw-ajax-src]', root).forEach((element) => {
        if (element._swAjaxInit) return;
        element._swAjaxInit = true;
        element.addEventListener('click', (event) => {
          event.preventDefault();
          SWAjax.execute(element);
        });
      });
    }

    static async execute(trigger) {
      const sourceSelector = trigger.getAttribute('sw-ajax-src');
      const targetSelector = trigger.getAttribute('sw-target');
      const targetType = trigger.getAttribute('sw-ajax-target');
      const trusted = trigger.hasAttribute('sw-ajax-trusted');
      let content = '';

      try {
        if (sourceSelector) {
          const source = document.querySelector(sourceSelector);
          if (!source) throw new Error(`Elemento interno não encontrado: ${sourceSelector}`);
          content = source.tagName === 'TEMPLATE' ? source.innerHTML : source.innerHTML;
        } else {
          const rawUrl = trigger.getAttribute('sw-ajax');
          if (!rawUrl) throw new Error('Fonte AJAX ausente.');
          const url = new URL(rawUrl, window.location.href);
          if (url.origin !== window.location.origin && !trigger.hasAttribute('sw-ajax-crossorigin')) {
            throw new Error('SWAjax bloqueou uma origem externa não autorizada.');
          }
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), 15000);
          SW.emit(trigger, 'sw:ajax:start', { url: url.href });
          try {
            const response = await fetch(url.href, {
              method: 'GET',
              credentials: 'same-origin',
              headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'text/html' },
              signal: controller.signal
            });
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

        const target = this.resolveTarget(trigger, targetType, targetSelector);
        if (!target) throw new Error('Alvo de injeção não encontrado.');
        const render = () => {
          SW.html.set(target.content, content, { trusted });
          SW.reinit(target.content);
        };
        if (SW.Trans) SW.Trans.run(render, { skip: targetType === 'panel' || targetType === 'modal' });
        else render();

        if (targetType === 'panel') SW.Panel?.show(target.overlay);
        if (targetType === 'modal') SW.Modal?.show(target.overlay);
        SW.emit(trigger, 'sw:ajax:done', { sourceSelector });
      } catch (error) {
        console.error('[SW-AJAX]', error);
        SW.emit(trigger, 'sw:ajax:error', { error });
        SW.Alert?.err(error.name === 'AbortError' ? 'A requisição demorou demais.' : 'Não foi possível carregar o conteúdo.');
      }
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
  }

  window.SW?.register('SWAjax', SWAjax);
  if (window.SW) window.SW.Ajax = SWAjax;
})();
