/* SW Framework documentation interactions */
(function () {
  'use strict';
  function markCurrentPage() {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('[data-doc-page]').forEach((link) => {
      if (link.getAttribute('href') === current) link.setAttribute('aria-current', 'page');
    });
  }

  document.addEventListener('click', (event) => {
    const themeButton = event.target.closest('[data-theme-toggle]');
    if (themeButton) SW.Day.toggle();

    const alertButton = event.target.closest('[data-doc-alert]');
    if (alertButton) SW.Alert.info(alertButton.dataset.docAlert || 'Exemplo executado.');

    const transitionButton = event.target.closest('[data-transition-toggle]');
    if (transitionButton) {
      const stage = document.querySelector('[data-transition-state]');
      if (!stage) return;
      const update = () => {
        const active = stage.dataset.transitionState !== 'active';
        stage.dataset.transitionState = active ? 'active' : 'idle';
        transitionButton.setAttribute('aria-pressed', String(active));
        const label = stage.querySelector('[data-transition-label]');
        if (label) label.textContent = active ? 'Estado B' : 'Estado A';
      };
      if (window.SW?.Trans) SW.Trans.run(update);
      else update();
    }

    const loaderButton = event.target.closest('[data-loader-demo]');
    if (loaderButton && window.SW?.Trans) {
      SW.Trans.during(() => new Promise((resolve) => window.setTimeout(resolve, 650)), { message: 'Preparando exemplo' });
    }
  });

  document.addEventListener('sw:valid-submit', (event) => {
    if (event.target.id !== 'docs-form-demo') return;
    event.preventDefault();
    SW.Alert.ok('Exemplo validado com controles nativos.');
  });

  markCurrentPage();
})();
