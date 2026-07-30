// -- SW PREMIUM UI MODULE ------------------------------------------------------
// sw-premium-drag      -> Draggable (plugin free -- CDN)
// sw-premium-flip      -> Flip Plugin (plugin free -- CDN)
// sw-premium-observer  -> Observer Plugin para fullpage sections (plugin free -- CDN)
// sw-premium-scroll-to -> ScrollToPlugin -- botoes de scroll suave (plugin free -- CDN)

function swPremiumSetupDrag(el, config) {
  if (typeof Draggable === 'undefined') {
    console.warn('SW Premium: Draggable nao encontrado no bundle.');
    return;
  }

  const type   = config.dragType === 'xy' ? 'x,y' : config.dragType;
  const bounds = config.dragBounds === 'parent'
    ? el.parentElement
    : (config.dragBounds ? document.querySelector(config.dragBounds) : undefined);

  const opts = {
    type:           type,
    bounds:         bounds,
    edgeResistance: config.dragEdgeResistance,
    cursor:         'grab',
    activeCursor:   'grabbing',
    onDrag:         function() { gsap.to(this.target, { scale: 1.03, duration: 0.15 }); },
    onDragEnd:      function() { gsap.to(this.target, { scale: 1, duration: 0.3, ease: 'back.out(2)' }); },
  };

  if (config.dragSnap) {
    try { opts.snap = JSON.parse(config.dragSnap); } catch(e) {}
  }

  if (config.dragInertia && typeof InertiaPlugin !== 'undefined') {
    opts.inertia = true;
  }

  Draggable.create(el, opts);
}

function swPremiumSetupFlip(core, el, config) {
  if (typeof Flip === 'undefined') {
    console.warn('SW Premium: Flip Plugin nao encontrado no bundle.');
    return;
  }

  const flipClass    = config.flipClass;
  const flipTarget   = config.flipTarget
    ? document.querySelector(config.flipTarget)
    : el;

  if (!flipClass) return;

  el.style.cursor = 'pointer';

  el.addEventListener('click', () => {
    const state = Flip.getState(flipTarget);
    flipTarget.classList.toggle(flipClass);
    Flip.from(state, {
      duration: config.duration,
      ease:     config.ease,
      scale:    true,
      absolute: true,
    });
  });
}

function swPremiumSetupObserver(core, el, config) {
  if (typeof Observer === 'undefined') {
    console.warn('SW Premium: Observer Plugin nao encontrado no bundle.');
    return;
  }

  const sections = Array.from(el.querySelectorAll('[sw-premium-observer-section]'));
  if (!sections.length) return;

  // Setup inicial
  el.style.overflow  = 'hidden';
  el.style.position  = 'relative';
  el.style.height    = '100vh';

  sections.forEach((s, i) => {
    s.style.position = 'absolute';
    s.style.inset    = '0';
    s.style.width    = '100%';
    s.style.height   = '100%';
    if (i !== 0) gsap.set(s, { yPercent: 100 });
  });

  let current   = 0;
  let animating = false;

  function goTo(index) {
    if (animating || index < 0 || index >= sections.length) return;
    animating = true;

    const prev = sections[current];
    const next = sections[index];
    const dir  = index > current ? 1 : -1;

    gsap.set(next, { yPercent: dir * 100, zIndex: 1 });
    gsap.set(prev, { zIndex: 0 });

    const dur = config.duration || 0.9;
    gsap.timeline({ onComplete: () => { animating = false; current = index; } })
      .to(prev, { yPercent: dir * -100, duration: dur, ease: config.ease || 'power2.inOut' })
      .to(next, { yPercent: 0,          duration: dur, ease: config.ease || 'power2.inOut' }, '<');
  }

  Observer.create({
    target:    el,
    type:      config.observerType,
    tolerance: config.observerTolerance,
    onDown:    () => goTo(current + 1),
    onUp:      () => goTo(current - 1),
    preventDefault: true,
  });
}

// sw-premium-scroll-to: inicializado separadamente em SWPremiumCore.initScrollTo()
function swPremiumInitScrollTo() {
  if (typeof ScrollToPlugin === 'undefined') return;

  document.querySelectorAll('[sw-premium-scroll-to]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const target   = el.getAttribute('sw-premium-scroll-to');
      const dur      = parseFloat(el.getAttribute('sw-premium-duration')     || '1');
      const ease     = el.getAttribute('sw-premium-ease')                    || 'power3.out';
      const offsetY  = parseFloat(el.getAttribute('sw-premium-scroll-offset')|| '0');

      gsap.to(window, {
        duration: dur,
        ease:     ease,
        scrollTo: { y: target, offsetY: offsetY },
      });
    });
  });
}
