// -- SW PREMIUM SVG MODULE ----------------------------------------------------
// sw-premium-draw-svg  -> revela stroke de SVG (pure GSAP, sem plugin premium)
// sw-premium-path      -> elemento segue um <path> SVG (MotionPathPlugin -- free)

function swPremiumSetupDrawSVG(el, config) {
  // Suporte a <path>, <line>, <polyline>, <polygon>, <circle>, <ellipse>, <rect>
  let length;
  try {
    length = el.getTotalLength();
  } catch(e) {
    // Fallback para formas sem getTotalLength (rect, etc.)
    length = 1000;
  }

  const from = config.drawSVGFrom; // ex: "0%"
  const to   = config.drawSVGTo;   // ex: "100%"

  const toPx   = to.endsWith('%')   ? (parseFloat(to)   / 100) * length : parseFloat(to);
  const fromPx = from.endsWith('%') ? (parseFloat(from) / 100) * length : parseFloat(from);

  const initState = { strokeDasharray: length, strokeDashoffset: length - fromPx };
  const fromState = { strokeDashoffset: length - fromPx };
  const toState   = { strokeDashoffset: length - toPx, duration: config.duration, ease: config.ease };

  gsap.set(el, initState);

  if (config.trigger === 'scroll') {
    const hasScrub  = config.scrub !== null && config.scrub !== false && config.scrub !== undefined;
    const triggerEl = config.scrollTriggerEl
      ? (document.querySelector(config.scrollTriggerEl) || el)
      : el;

    const st = {
      trigger: triggerEl,
      start:   config.start || 'top 85%',
      end:     config.end   || 'bottom 20%',
    };

    if (hasScrub) {
      st.scrub = config.scrub;
      gsap.fromTo(el, fromState, { ...toState, scrollTrigger: st });
    } else if (config.scrollOnce) {
      st.toggleActions = 'play none none none';
      gsap.to(el, { ...toState, scrollTrigger: st });
    } else {
      // repeat: usa fromTo explicito + callbacks para reset limpo
      ScrollTrigger.create({
        trigger: triggerEl,
        start:   config.start || 'top 85%',
        end:     config.end   || 'bottom 20%',
        onEnter:     () => gsap.fromTo(el, fromState, toState),
        onLeave:     () => gsap.set(el, fromState),
        onEnterBack: () => gsap.fromTo(el, fromState, toState),
        onLeaveBack: () => gsap.set(el, fromState),
      });
    }
  } else {
    const t = { ...toState };
    if (config.delay > 0) t.delay = config.delay;
    gsap.fromTo(el, fromState, t);
  }
}

function swPremiumSetupPath(el, config) {
  if (typeof MotionPathPlugin === 'undefined') {
    console.warn('SW Premium: MotionPathPlugin nao encontrado. Adicione ao bundle.');
    return;
  }

  const pathEl = document.querySelector(config.pathTarget);
  if (!pathEl) {
    console.warn('SW Premium: sw-premium-path -- alvo "' + config.pathTarget + '" nao encontrado.');
    return;
  }

  // <circle>, <ellipse>, <rect> nao sao aceitos como align pelo MotionPathPlugin
  const isPathEl = pathEl.tagName.toLowerCase() === 'path';
  const motionConfig = {
    path:        pathEl,
    align:       isPathEl ? pathEl : el,
    autoRotate:  config.pathAlign,
    alignOrigin: [0.5, 0.5],
  };

  const tween = {
    duration:    config.duration,
    ease:        config.repeat !== null ? 'none' : config.ease,
    repeat:      config.repeat !== null ? config.repeat : -1,
    motionPath:  motionConfig,
  };

  if (config.trigger === 'scroll') {
    tween.repeat = undefined;
    tween.ease   = 'none';
    tween.scrollTrigger = {
      trigger: el,
      start:   config.start || 'top bottom',
      end:     config.end   || 'bottom top',
      scrub:   config.scrub !== null ? config.scrub : 1,
    };
  }

  gsap.to(el, tween);
}
