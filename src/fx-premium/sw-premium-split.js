// -- SW PREMIUM TEXT MODULE --------------------------------------------------
// sw-premium-split, sw-premium-scramble, sw-premium-typewriter
// Chamado por SWPremiumCore -- nao depende de plugins premium do GSAP

function swPremiumSetupSplit(el, config) {
  const mode   = config.split;          // "chars" | "words" | "lines"
  const text   = el.textContent.trim();

  if (mode === 'chars') {
    el.innerHTML = text.split('').map(ch =>
      ch === ' '
        ? '<span style="display:inline-block;white-space:pre"> </span>'
        : `<span style="display:inline-block">${ch}</span>`
    ).join('');
  } else if (mode === 'words') {
    el.innerHTML = text.split(/\s+/).map(w =>
      `<span style="display:inline-block;margin-right:0.3em">${w}</span>`
    ).join('');
  } else if (mode === 'lines') {
    // Cada palavra num wrapper overflow:hidden para efeito de linha-revelando
    el.innerHTML = text.split(/\s+/).map(w =>
      `<span style="display:inline-block;overflow:hidden;vertical-align:bottom;padding-bottom:0.05em">` +
      `<span style="display:inline-block">${w}</span></span>`
    ).join(' ');
    const innerSpans = el.querySelectorAll('span > span');
    const t = swPremiumBuildTextTween(config, el, innerSpans, 0.06);
    gsap.from(innerSpans, t);
    return;
  } else {
    return; // modo desconhecido
  }

  const spans      = el.querySelectorAll('span');
  const defStagger = mode === 'chars' ? 0.025 : 0.07;
  const t          = swPremiumBuildTextTween(config, el, spans, defStagger);
  gsap.from(spans, t);
}

function swPremiumSetupScramble(el, config) {
  const original = el.textContent.trim();
  const chars    = config.scrambleChars;
  const speed    = config.scrambleSpeed;   // iters por char
  const duration = config.duration;

  el.setAttribute('data-sw-premium-original', original);

  function run() {
    let iter = 0;
    const total    = original.length;
    const interval = Math.max(16, (duration * 1000) / (total * speed));

    const tick = setInterval(() => {
      el.textContent = original.split('').map((ch, i) => {
        if (ch === ' ') return ' ';
        if (i < Math.floor(iter)) return original[i];
        return chars[Math.floor(Math.random() * chars.length)];
      }).join('');

      iter += 1 / speed;
      if (iter >= total) {
        clearInterval(tick);
        el.textContent = original;
      }
    }, interval);
  }

  if (config.trigger === 'scroll') {
    ScrollTrigger.create({
      trigger: el,
      start: config.start || 'top 85%',
      onEnter:     run,
      onEnterBack: config.scrollOnce ? null : run,
    });
  } else {
    if (config.delay > 0) gsap.delayedCall(config.delay, run);
    else run();
  }
}

function swPremiumSetupTypewriter(el, config) {
  const original = el.textContent.trim();
  const cursor   = config.typewriterCursor;
  const speed    = config.typewriterSpeed;
  const repeat   = config.typewriterRepeat;
  const pause    = config.typewriterPause;
  let   blinkTimer = null;

  el.textContent = cursor;

  function stopBlink() {
    if (blinkTimer) { clearInterval(blinkTimer); blinkTimer = null; }
  }

  function startBlink(onDone) {
    let visible = true;
    blinkTimer = setInterval(() => {
      visible = !visible;
      el.textContent = visible ? original + cursor : original;
    }, 530);
    if (onDone) gsap.delayedCall(pause, onDone);
  }

  function erase(onDone) {
    let text = original;
    function del() {
      if (text.length > 0) {
        text = text.slice(0, -1);
        el.textContent = text + cursor;
        gsap.delayedCall(speed * 0.6, del);
      } else {
        el.textContent = cursor;
        gsap.delayedCall(0.3, onDone);
      }
    }
    del();
  }

  function run() {
    stopBlink();
    el.textContent = cursor;
    let i = 0;

    function type() {
      if (i < original.length) {
        el.textContent = original.slice(0, i + 1) + cursor;
        i++;
        gsap.delayedCall(speed, type);
      } else {
        if (repeat) {
          startBlink(() => { stopBlink(); erase(run); });
        } else if (cursor) {
          startBlink(null);
        }
      }
    }
    type();
  }

  if (config.trigger === 'scroll') {
    ScrollTrigger.create({
      trigger: el,
      start: config.start || 'top 85%',
      once: !repeat,
      onEnter: run,
      onEnterBack: repeat ? run : undefined,
    });
  } else {
    if (config.delay > 0) gsap.delayedCall(config.delay, run);
    else run();
  }
}

// helper interno -- constroi o objeto tween respeitando scroll/stagger
function swPremiumBuildTextTween(config, trigger, targets, defaultStagger) {
  const effect    = SWPremiumEffects[config.animate] || { y: 40, opacity: 0 };
  const fromProps = Object.assign({}, effect);

  if (config.fromX       !== null) fromProps.x        = config.fromX;
  if (config.fromY       !== null) fromProps.y        = config.fromY;
  if (config.fromScale   !== null) fromProps.scale     = config.fromScale;
  if (config.fromRotation!== null) fromProps.rotation  = config.fromRotation;
  if (config.fromOpacity !== null) fromProps.opacity   = config.fromOpacity;

  const t = {
    ...fromProps,
    duration:   config.duration,
    ease:       config.ease,
    stagger:    config.splitStagger !== null ? config.splitStagger : defaultStagger,
  };

  if (config.trigger === 'scroll') {
    t.scrollTrigger = {
      trigger: trigger,
      start: config.start || 'top 85%',
      toggleActions: config.scrollOnce
        ? 'play none none none'
        : 'play none none reverse',
    };
  } else if (config.delay > 0) {
    t.delay = config.delay;
  }

  return t;
}
