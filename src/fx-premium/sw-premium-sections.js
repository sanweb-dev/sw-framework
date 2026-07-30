// -- SW PREMIUM SECTIONS MODULE ------------------------------------------------
// sw-premium-section="[tipo]" no wrapper -- filhos diretos sao as secoes
//
// Pipe: sw-premium-section="slide-up|zoom|fold"
//   -> filho[1] entra com zoom, filho[2] entra com fold
//   -> ultimo valor repete se faltar

function swPremiumSetupSection(el, config) {
  const raw  = config.sectionType || 'slide-up';
  const secs = Array.from(el.children);
  if (secs.length < 2) return;
  if (window.matchMedia('(max-width: 992px)').matches) return;

  const types   = raw.split('|').map(s => s.trim());
  const base    = types[0];
  const typeFor = (i) => types[Math.min(i, types.length - 1)];

  if (base === 'h-scroll')            swPremiumSetupHScroll(el, secs, false);
  else if (base === 'h-scroll-right') swPremiumSetupHScroll(el, secs, true);
  else                                swPremiumSetupPinned(el, secs, base, typeFor);
}

// -- DICIONARIO --------------------------------------------------------------
const SWPremiumSectionTypes = {
  'slide':        { from:{yPercent: 100}, to:{yPercent:0},            exit:{yPercent:-100} },
  'slide-up':     { from:{yPercent: 100}, to:{yPercent:0},            exit:{yPercent:-100} },
  'slide-down':   { from:{yPercent:-100}, to:{yPercent:0},            exit:{yPercent: 100} },
  'slide-left':   { from:{xPercent: 100}, to:{xPercent:0},            exit:{xPercent:-100} },
  'slide-right':  { from:{xPercent:-100}, to:{xPercent:0},            exit:{xPercent: 100} },
  'mask':         { from:{clipPath:'circle(0% at 50% 50%)'},           to:{clipPath:'circle(150% at 50% 50%)'} },
  'zoom':         { from:{scale:0, opacity:0},                         to:{scale:1, opacity:1},    exit:{scale:1.4, opacity:0} },
  'skew':         { from:{xPercent:100, skewX:12},                     to:{xPercent:0, skewX:0},   exit:{xPercent:-100, skewX:-12} },
  'fold':         { from:{rotationX:-90, transformOrigin:'top center', transformPerspective:900},
                    to:  {rotationX:  0, transformOrigin:'top center', transformPerspective:900},
                    exit:{rotationX: 90, transformOrigin:'top center', transformPerspective:900} },
  'stack':        { from:{yPercent:100}, to:{yPercent:0} },
};

// -- mede a altura natural de cada filho (antes de posicionar absolute) ------
function swPremiumMeasureHeight(secs, fallback) {
  // salva estilos atuais, forca layout natural para medir
  const saved = secs.map(s => ({ pos: s.style.position, h: s.style.height, w: s.style.width }));

  secs.forEach(s => {
    s.style.position = 'relative';
    s.style.height   = 'auto';
    s.style.width    = '100%';
  });

  const max = Math.max(fallback, ...secs.map(s => s.scrollHeight));

  // restaura
  secs.forEach((s, i) => {
    s.style.position = saved[i].pos;
    s.style.height   = saved[i].h;
    s.style.width    = saved[i].w;
  });

  return max;
}

// -- PINNED -- timeline scrubada + ScrollTrigger pin -------------------------
function swPremiumSetupPinned(wrap, secs, base, typeFor) {
  const vh = swPremiumMeasureHeight(secs, window.innerHeight);

  Object.assign(wrap.style, {
    position: 'relative',
    overflow: 'hidden',
    clipPath: 'inset(0)',
    height:   vh + 'px',
  });

  secs.forEach((sec, i) => {
    Object.assign(sec.style, {
      position: 'absolute',
      top:      '0',
      left:     '0',
      width:    '100%',
      height:   'auto',
    });
  });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger:       wrap,
      start:         'top top',
      end:           '+=' + (secs.length * 100) + '%',
      scrub:         true,
      pin:           true,
      anticipatePin: 1,
    },
  });

  secs.forEach((sec, i) => {
    if (i === 0) return;

    const type  = typeFor(i);
    const props = SWPremiumSectionTypes[type] || SWPremiumSectionTypes['slide-up'];
    const prev  = secs[i - 1];
    const pos   = i === 1 ? 0 : '>';

    tl.fromTo(sec,  { ...props.from }, { ...props.to,   ease: 'none' }, pos);

    if (base !== 'stack' && props.exit) {
      tl.fromTo(prev, { ...props.to }, { ...props.exit, ease: 'none' }, '<');
    }
  });
}

// -- H-SCROLL -----------------------------------------------------------------
function swPremiumSetupHScroll(wrap, secs, reverse) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const track = document.createElement('div');
  Object.assign(track.style, {
    display:    'flex',
    width:      (secs.length * 100) + 'vw',
    height:     '100%',
    willChange: 'transform',
  });

  secs.forEach(sec => {
    Object.assign(sec.style, {
      width:      '100vw',
      height:     '100vh',
      flexShrink: '0',
      overflow:   'hidden',
    });
    track.appendChild(sec);
  });

  Object.assign(wrap.style, { overflow: 'hidden', height: vh + 'px' });
  wrap.appendChild(track);

  const totalX = (secs.length - 1) * vw;
  if (reverse) gsap.set(track, { x: -totalX });

  gsap.to(track, {
    x:    reverse ? 0 : -totalX,
    ease: 'none',
    scrollTrigger: {
      trigger:       wrap,
      start:         'top top',
      end:           '+=' + (secs.length * 100) + '%',
      scrub:         true,
      pin:           true,
      anticipatePin: 1,
    },
  });
}
