/* SW Framework Navbar — <nav sw-navbar sw-navbar-mode="static|fixed|sticky" sw-navbar-fx="glass|grad">
   Brand: [sw-navbar-brand] · Menu: [sw-navbar-mn] > [sw-navbar-it] · Toggle mobile: [sw-navbar-tgl]
   Dropdown: [sw-navbar-it][sw-navbar-drop] + [sw-navbar-drop-mn] > [sw-navbar-drop-it]
   Submenu aninhado (nível 3, abre pro lado): [sw-navbar-drop-it][has-sub] > [sw-navbar-drop-sub] */
(function () {
  'use strict';

  // Cada navbar mobile (drawer lateral) ganha seu próprio overlay, criado sob
  // demanda — evita depender de marcação extra e funciona mesmo com várias
  // navbars de demonstração na mesma página (cada uma com seu overlay isolado).
  function getOverlay(nav) {
    if (nav._swNavbarOvl) return nav._swNavbarOvl;
    const ovl = document.createElement('div');
    ovl.setAttribute('sw-navbar-ovl', '');
    document.body.appendChild(ovl);
    ovl.addEventListener('click', () => setOpen(nav, false));
    nav._swNavbarOvl = ovl;
    return ovl;
  }

  function setOpen(nav, open) {
    nav.toggleAttribute('open', open);
    getOverlay(nav).toggleAttribute('vis', open);
    SW.emit(nav, 'sw:navbar:toggle', { open });
  }

  function initToggle(nav) {
    const btn = nav.querySelector('[sw-navbar-tgl]');
    if (!btn || btn._swNavbarTgl) return;
    btn._swNavbarTgl = true;
    btn.addEventListener('click', () => setOpen(nav, !nav.hasAttribute('open')));
  }

  function closeAll(nav) {
    SW.$('[sw-navbar-it][open]', nav).forEach((it) => it.removeAttribute('open'));
    SW.$('[sw-navbar-drop-it][has-sub][open]', nav).forEach((it) => it.removeAttribute('open'));
  }

  function initDropdowns(nav) {
    SW.$('[sw-navbar-it][sw-navbar-drop]', nav).forEach((trigger) => {
      if (trigger._swNavbarDrop) return;
      trigger._swNavbarDrop = true;
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        const isOpen = trigger.hasAttribute('open');
        SW.$('[sw-navbar-it][open]', nav).forEach((it) => { if (it !== trigger) it.removeAttribute('open'); });
        trigger.toggleAttribute('open', !isOpen);
        SW.emit(trigger, 'sw:navbar:dropdown', { open: !isOpen });
      });
    });

    // Submenu de nível 3 — gatilho é <div> (não <a>), por isso clicável e capaz
    // de conter o [sw-navbar-drop-sub] como filho direto sem aninhar <a> em <a>.
    SW.$('[sw-navbar-drop-it][has-sub]', nav).forEach((trigger) => {
      if (trigger._swNavbarSub) return;
      trigger._swNavbarSub = true;
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const isOpen = trigger.hasAttribute('open');
        SW.$('[sw-navbar-drop-it][has-sub][open]', nav).forEach((it) => { if (it !== trigger) it.removeAttribute('open'); });
        trigger.toggleAttribute('open', !isOpen);
      });
    });

    document.addEventListener('click', (event) => {
      if (nav.contains(event.target)) return;
      closeAll(nav);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      closeAll(nav);
      setOpen(nav, false);
    });
  }

  // Clique num item de navegação (sem submenu) marca ele como ativo e fecha o menu mobile
  function initActiveAndMobileClose(nav) {
    SW.$('[sw-navbar-mn]', nav).forEach((mn) => {
      if (mn._swNavbarAct) return;
      mn._swNavbarAct = true;
      mn.addEventListener('click', (event) => {
        const it = event.target.closest('[sw-navbar-it]');
        if (!it || it.hasAttribute('sw-navbar-drop') || !mn.contains(it)) return;
        SW.$('[sw-navbar-it][act]', mn).forEach((el) => el.removeAttribute('act'));
        it.setAttribute('act', '');
        setOpen(nav, false);
      });
    });
  }

  // Encolhe/ganha blur e sombra depois de rolar — só nos modos fixed/sticky
  // Acha o ancestral que realmente rola (útil quando a navbar fica dentro de um
  // container com overflow, ex.: caixa de demonstração na doc) — cai pro window se nenhum.
  function findScrollParent(el) {
    let node = el.parentElement;
    while (node) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowY)) return node;
      node = node.parentElement;
    }
    return window;
  }

  // Histerese: liga em [threshold], só desliga bem abaixo dele (metade do valor).
  // Sem isso, encolher a navbar muda a altura do conteúdo acima da posição atual
  // de rolagem — o navegador reajusta o scroll pra compensar (scroll anchoring),
  // o que pode cruzar o limiar de novo e entrar num loop de ligar/desligar sem fim
  // (a navbar "treme") bem perto do ponto de troca. Faixa morta resolve.
  function initScrollShrink(nav) {
    const mode = nav.getAttribute('sw-navbar-mode');
    if (mode !== 'fixed' && mode !== 'sticky') return;
    const threshold = Number(nav.getAttribute('sw-navbar-shrink-at')) || 40;
    const releaseAt = threshold / 2;
    const scroller = findScrollParent(nav);
    const getY = () => (scroller === window ? window.scrollY : scroller.scrollTop);
    const update = () => {
      const y = getY();
      if (y > threshold) nav.setAttribute('scrolled', '');
      else if (y < releaseAt) nav.removeAttribute('scrolled');
    };
    update();
    scroller.addEventListener('scroll', update, { passive: true });
  }

  const SWNavbar = {
    initAll(root = document) {
      SW.$('[sw-navbar]', root).forEach((nav) => {
        if (nav._swNavbar) return;
        nav._swNavbar = true;
        initToggle(nav);
        initDropdowns(nav);
        initActiveAndMobileClose(nav);
        initScrollShrink(nav);
      });
    }
  };

  window.SW?.register('SWNavbar', SWNavbar);
  if (window.SW) window.SW.Navbar = SWNavbar;
})();
