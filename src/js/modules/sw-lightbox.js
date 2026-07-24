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
