/* SW Framework documentation interactions */
(function () {
  'use strict';
  const animationClasses = new Set(['sw-ani-fade', 'sw-ani-up', 'sw-ani-down', 'sw-ani-left', 'sw-ani-right', 'sw-ani-pop', 'sw-ani-flip', 'sw-ani-roll', 'sw-ani-soft', 'sw-ani-blur', 'sw-ani-scale', 'sw-ani-zoom-out']);
  const loopClasses = new Set(['sw-loop-spin', 'sw-loop-pulse', 'sw-loop-float', 'sw-loop-fade', 'sw-loop-bounce', 'sw-loop-glow', 'sw-loop-wave']);

  function markCurrentPage() {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('[data-doc-page]').forEach((link) => {
      if (link.getAttribute('href') === current) link.setAttribute('aria-current', 'page');
    });
  }

  function replayAnimation(name) {
    if (!animationClasses.has(name)) return;
    const sample = document.querySelector('[data-animation-sample]');
    if (!sample) return;
    animationClasses.forEach((animationClass) => sample.classList.remove(animationClass));
    void sample.offsetWidth;
    sample.classList.add(name);
    sample.textContent = name;
  }

  function selectLoop(name) {
    if (!loopClasses.has(name)) return;
    const sample = document.querySelector('[data-loop-sample]');
    const pauseButton = document.querySelector('[data-loop-pause]');
    if (!sample) return;
    loopClasses.forEach((loopClass) => sample.classList.remove(loopClass));
    sample.classList.remove('sw-loop-paused');
    sample.classList.add(name);
    sample.textContent = name;
    if (pauseButton) {
      pauseButton.setAttribute('aria-pressed', 'false');
      pauseButton.textContent = 'Pausar loop';
    }
  }

  function toggleLoop() {
    const sample = document.querySelector('[data-loop-sample]');
    const pauseButton = document.querySelector('[data-loop-pause]');
    if (!sample || !pauseButton) return;
    const paused = sample.classList.toggle('sw-loop-paused');
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.textContent = paused ? 'Retomar loop' : 'Pausar loop';
  }

  document.addEventListener('click', (event) => {
    const themeButton = event.target.closest('[data-theme-toggle]');
    if (themeButton) SW.Day.toggle();

    const alertButton = event.target.closest('[data-doc-alert]');
    if (alertButton) SW.Alert.info(alertButton.dataset.docAlert || 'Exemplo executado.');

    const replayButton = event.target.closest('[data-replay]');
    if (replayButton) replayAnimation(replayButton.dataset.replay);

    const loopButton = event.target.closest('[data-loop]');
    if (loopButton) selectLoop(loopButton.dataset.loop);

    if (event.target.closest('[data-loop-pause]')) toggleLoop();

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
