/* SW2 Navbar — camada opcional, rica, shipada em sw.compl.min.js.
   Base: <nav sw2-navbar> · Menu: [sw2-navbar-mn] > [sw2-navbar-it]
   Dropdown/Mega menu: [sw2-navbar-it][sw2-navbar-drop] + [sw2-navbar-drop-mn]
   Toggle mobile: [sw2-navbar-tgl] · Painel-carrossel: [sw2-navbar-panel-arr] */
(function () {
  'use strict';

  function getOverlay(nav) {
    if (nav._sw2Ovl) return nav._sw2Ovl;
    const ovl = document.createElement('div');
    ovl.setAttribute('sw2-navbar-ovl', '');
    document.body.appendChild(ovl);
    ovl.addEventListener('click', () => setOpen(nav, false));
    nav._sw2Ovl = ovl;
    return ovl;
  }

  function setOpen(nav, open) {
    nav.toggleAttribute('open', open);
    getOverlay(nav).toggleAttribute('vis', open);
  }

  function initToggle(nav) {
    const btn = nav.querySelector('[sw2-navbar-tgl]');
    if (!btn || btn._sw2Tgl) return;
    btn._sw2Tgl = true;
    btn.addEventListener('click', () => setOpen(nav, !nav.hasAttribute('open')));
  }

  function closeAllDrops(nav) {
    SW.$('[sw2-navbar-it][open]', nav).forEach((it) => it.removeAttribute('open'));
    SW.$('[sw2-navbar-drop-it][has-sub][open]', nav).forEach((it) => it.removeAttribute('open'));
  }

  function initDropdowns(nav) {
    SW.$('[sw2-navbar-it][sw2-navbar-drop]', nav).forEach((trigger) => {
      if (trigger._sw2Drop) return;
      trigger._sw2Drop = true;
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        const isOpen = trigger.hasAttribute('open');
        closeAllDrops(nav);
        trigger.toggleAttribute('open', !isOpen);
      });
    });

    // Submenu de nível 3 — gatilho é <div> (não <a>), clicável, capaz de conter
    // o [sw2-navbar-drop-sub] como filho direto sem aninhar <a> em <a>.
    SW.$('[sw2-navbar-drop-it][has-sub]', nav).forEach((trigger) => {
      if (trigger._sw2Sub) return;
      trigger._sw2Sub = true;
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const isOpen = trigger.hasAttribute('open');
        SW.$('[sw2-navbar-drop-it][has-sub][open]', nav).forEach((it) => { if (it !== trigger) it.removeAttribute('open'); });
        trigger.toggleAttribute('open', !isOpen);
      });
    });

    document.addEventListener('click', (event) => {
      if (nav.contains(event.target)) return;
      closeAllDrops(nav);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      closeAllDrops(nav);
      setOpen(nav, false);
    });
  }

  // Clique num item de navegação (sem dropdown) marca ativo e fecha o drawer mobile
  function initActiveAndMobileClose(nav) {
    SW.$('[sw2-navbar-mn]', nav).forEach((mn) => {
      if (mn._sw2Act) return;
      mn._sw2Act = true;
      mn.addEventListener('click', (event) => {
        const it = event.target.closest('[sw2-navbar-it]');
        if (!it || it.hasAttribute('sw2-navbar-drop') || !mn.contains(it)) return;
        SW.$('[sw2-navbar-it][act]', mn).forEach((el) => el.removeAttribute('act'));
        it.setAttribute('act', '');
        setOpen(nav, false);
      });
    });
  }

  // Painel-carrossel de categorias — setas avançam/recuam um cartão por vez.
  // [sw2-navbar-panel] é IRMÃO do <nav>, não filho — por isso procura a partir
  // da raiz inteira (root), não escopado a um nav específico.
  function initPanelCarousel(root) {
    SW.$('[sw2-navbar-panel]', root).forEach((panel) => {
      if (panel._sw2Panel) return;
      panel._sw2Panel = true;
      const track = panel.querySelector('[sw2-navbar-panel-cards]');
      const [prev, next] = panel.querySelectorAll('[sw2-navbar-panel-arr]');
      if (!track) return;
      const step = () => (track.querySelector('[sw2-navbar-cat-card]')?.offsetWidth || 240) + 32;
      prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
      next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    });
  }

  const SW2Navbar = {
    initAll(root = document) {
      SW.$('[sw2-navbar]', root).forEach((nav) => {
        if (nav._sw2Navbar) return;
        nav._sw2Navbar = true;
        initToggle(nav);
        initDropdowns(nav);
        initActiveAndMobileClose(nav);
      });
      initPanelCarousel(root);
    }
  };

  window.SW?.register('SW2Navbar', SW2Navbar);
  if (window.SW) window.SW.Navbar2 = SW2Navbar;
})();
