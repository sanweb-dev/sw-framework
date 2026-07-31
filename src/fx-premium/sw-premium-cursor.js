// -- SW PREMIUM CURSOR MODULE --------------------------------------------------
// sw-premium-magnetic   -> campo magnetico no cursor (pure GSAP)
// sw-premium-cursor     -> cursor customizado com lerp (pure GSAP)
// sw-premium-hover-tilt -> inclinacao 3D do card pelo mouse (pure GSAP)
// sw-premium-marquee    -> ticker infinito de texto (pure GSAP)

function swPremiumSetupMagnetic(core, el, config) {
  const strength = config.magneticStrength; // 0-1

  function onMove(e) {
    const rect   = el.getBoundingClientRect();
    const cx     = rect.left + rect.width  / 2;
    const cy     = rect.top  + rect.height / 2;
    const dx     = e.clientX - cx;
    const dy     = e.clientY - cy;
    const dist   = Math.sqrt(dx * dx + dy * dy);
    const maxD   = Math.max(rect.width, rect.height) * 1.6;

    if (dist < maxD) {
      const pull = (1 - dist / maxD) * Math.min(rect.width, rect.height) * strength;
      gsap.to(el, { x: (dx / dist) * pull, y: (dy / dist) * pull, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
    } else {
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
    }
  }

  function onLeave() {
    gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
  }

  window.addEventListener('mousemove', onMove);
  el.addEventListener('mouseleave', onLeave);

  core._cleanups = core._cleanups || [];
  core._cleanups.push(() => {
    window.removeEventListener('mousemove', onMove);
    el.removeEventListener('mouseleave', onLeave);
  });
}

function swPremiumSetupCursor(core, el, config) {
  if (window.matchMedia && !window.matchMedia('(pointer: fine)').matches) return;

  // "replace" = some o cursor nativo, o elemento VIRA o cursor (comportamento original).
  // "follow"  = cursor nativo continua visivel, o elemento so acompanha do lado, com
  // atraso -- bom pra logo/mascote/svg seguindo o mouse sem sumir a setinha normal.
  const isFollow = config.cursorMode === 'follow';
  const size = config.cursorSize;

  if (!document.getElementById('sw-premium-cursor-css')) {
    const s = document.createElement('style');
    s.id = 'sw-premium-cursor-css';
    s.textContent =
      '.sw-premium-cursor{position:fixed;top:0;left:0;pointer-events:none;z-index:99999;border-radius:50%;transform:translate(-50%,-50%);mix-blend-mode:difference;background:#fff;width:10px;height:10px;transition:width .25s,height .25s}' +
      '.sw-premium-cursor.hover{width:36px;height:36px}' +
      '.sw-premium-cursor.is-follow{mix-blend-mode:normal}';
    document.head.appendChild(s);
  }

  const img = config.cursorSrc;
  const cur = document.createElement('div');
  cur.className = 'sw-premium-cursor';

  if (img || isFollow) {
    cur.classList.add('is-follow');
    Object.assign(cur.style, {
      backgroundImage:    img ? 'url(' + img + ')' : '',
      backgroundSize:     'contain',
      backgroundRepeat:   'no-repeat',
      backgroundPosition: 'center',
      backgroundColor:    'transparent',
      borderRadius:       '0',
      width:              size + 'px',
      height:             size + 'px',
    });
  }

  document.body.appendChild(cur);
  if (!isFollow) document.body.style.cursor = 'none';

  // Segue via gsap.to() (nao um loop manual de lerp) pra poder usar QUALQUER ease
  // do GSAP no arrasto -- inclusive "elastic.out(1, 0.3)" pra um efeito de mola/
  // atraso elastico de verdade, nao só uma interpolação linear suavizada.
  gsap.set(cur, { xPercent: -50, yPercent: -50, x: innerWidth / 2, y: innerHeight / 2 });
  function onMove(e) {
    gsap.to(cur, {
      x: e.clientX, y: e.clientY,
      duration: config.cursorDelay, ease: config.cursorEase, overwrite: 'auto',
    });
  }
  document.addEventListener('mousemove', onMove);

  // Delegacao -- funciona com conteudo carregado via PJAX
  function onEnter(e) { if (e.target.closest('a, button, [sw-premium-magnetic]')) cur.classList.add('hover'); }
  function onLeave(e) { if (e.target.closest('a, button, [sw-premium-magnetic]')) cur.classList.remove('hover'); }
  document.body.addEventListener('mouseenter', onEnter, true);
  document.body.addEventListener('mouseleave', onLeave, true);

  core._cleanups = core._cleanups || [];
  core._cleanups.push(() => {
    document.removeEventListener('mousemove', onMove);
    document.body.removeEventListener('mouseenter', onEnter, true);
    document.body.removeEventListener('mouseleave', onLeave, true);
    if (cur.parentNode) cur.parentNode.removeChild(cur);
    document.body.style.cursor = '';
  });
}

function swPremiumSetupHoverTilt(core, el, config) {
  const strength = config.tiltStrength;
  el.style.willChange = 'transform';

  function onMove(e) {
    const rect = el.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;
    const rx   = ((e.clientY - cy) / (rect.height / 2)) * -strength;
    const ry   = ((e.clientX - cx) / (rect.width  / 2)) *  strength;
    gsap.to(el, {
      rotationX:         rx,
      rotationY:         ry,
      transformPerspective: 600,
      duration:          0.4,
      ease:              'power3.out',
      overwrite:         'auto',
    });
  }

  function onLeave() {
    gsap.to(el, { rotationX: 0, rotationY: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
  }

  el.addEventListener('mousemove', onMove);
  el.addEventListener('mouseleave', onLeave);

  core._cleanups = core._cleanups || [];
  core._cleanups.push(() => {
    el.removeEventListener('mousemove', onMove);
    el.removeEventListener('mouseleave', onLeave);
  });
}

function swPremiumSetupMarquee(core, el, config) {
  const speed   = config.marqueeSpeed;
  const reverse = config.marqueeDirection === 'right';

  const origin = el.firstElementChild;
  if (!origin) return;

  // wrapper flex que segura as copias -- precisa do MESMO gap que o origin já usa
  // entre os próprios itens, senão a costura entre uma cópia e a próxima fica sem
  // espaço nenhum (0px) enquanto o resto do texto respeita o gap normal, e a
  // repetição "quebra" visualmente bem na emenda de cada cópia.
  const originGap = getComputedStyle(origin).columnGap;
  const gapPx = (originGap && originGap !== 'normal') ? (parseFloat(originGap) || 0) : 0;
  const rail = document.createElement('div');
  Object.assign(rail.style, {
    display:    'flex',
    alignItems: 'center',
    willChange: 'transform',
    position:   'relative',
    gap:        `${gapPx}px`,
  });

  Object.assign(el.style, {
    overflow: 'hidden',
    width:    '100%',
    display:  'block',
  });

  el.appendChild(rail);

  let tickerFn = null;

  function init() {
    // mede apos layout real -- retry se ainda for 0
    const item = origin.cloneNode(true);
    item.style.flexShrink = '0';
    rail.appendChild(item);

    const itemW = item.offsetWidth;
    if (!itemW) {
      rail.removeChild(item);
      requestAnimationFrame(init);
      return;
    }
    // distancia real do inicio de uma copia ate o inicio da proxima -- inclui o
    // gap do rail, senao a reciclagem dispara cedo demais e reintroduz a mesma
    // quebra que o gap do rail acabou de corrigir.
    const step = itemW + gapPx;

    // clones suficientes para cobrir viewport * 2 + 1 extra de seguranca
    const copies = Math.ceil((window.innerWidth * 2) / step) + 2;
    for (let i = 1; i < copies; i++) {
      const c = origin.cloneNode(true);
      c.style.flexShrink = '0';
      rail.appendChild(c);
    }

    origin.style.display = 'none'; // esconde o original -- rail tem as copias

    let pos = reverse ? -(copies - 1) * step : 0;

    tickerFn = () => {
      pos += reverse ? speed / 60 : -(speed / 60);

      // recicla: puxa o 1o filho para o fim (esquerda) ou o ultimo para o inicio (direita)
      if (!reverse && pos <= -step) {
        pos += step;
        rail.appendChild(rail.firstElementChild);
      } else if (reverse && pos >= 0) {
        pos -= step;
        rail.insertBefore(rail.lastElementChild, rail.firstElementChild);
      }

      gsap.set(rail, { x: pos });
    };
    gsap.ticker.add(tickerFn);

    core._cleanups = core._cleanups || [];
    core._cleanups.push(() => {
      if (tickerFn) { gsap.ticker.remove(tickerFn); tickerFn = null; }
    });
  }

  // aguarda fontes + layout antes de medir
  if (document.readyState === 'complete') {
    requestAnimationFrame(init);
  } else {
    window.addEventListener('load', () => requestAnimationFrame(init), { once: true });
  }
}
