class SWPremiumRouter {
  constructor(core) {
    this.core   = core;
    this.viewId = 'sw-premium-view';
    this._ol    = null;
    this.initPjax();

    window.addEventListener('popstate', () => {
      this.navigate(window.location.href, 'fade', true);
    });
  }

  // -- overlay singleton --------------------------------------------------
  _overlay() {
    if (!this._ol) {
      const o = document.createElement('div');
      o.id = 'sw-premium-router-ol';
      Object.assign(o.style, {
        position: 'fixed', inset: '0', zIndex: '99998',
        pointerEvents: 'none', background: '#0d0d0f',
        display: 'none',
      });
      document.body.appendChild(o);
      this._ol = o;
    }
    return this._ol;
  }

  _syncHead(newDoc) {
    document.querySelectorAll('[data-sw-premium-pjax]').forEach(el => el.remove());
    newDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => {
      if (el.tagName === 'LINK') {
        const href = el.getAttribute('href');
        if (href && document.querySelector(`link[href="${href}"]`)) return;
      }
      const clone = el.cloneNode(true);
      clone.setAttribute('data-sw-premium-pjax', '');
      document.head.appendChild(clone);
    });
  }

  initPjax() {
    document.querySelectorAll('a[sw-premium-link]').forEach(link => {
      const clone = link.cloneNode(true);
      link.parentNode.replaceChild(clone, link);
      clone.addEventListener('click', this.handleLink);
    });
  }

  handleLink = (e) => {
    e.preventDefault();
    const target = e.currentTarget;
    const url    = target.getAttribute('href');
    const type   = target.getAttribute('sw-premium-link') || 'fade';
    if (url && url !== '#') this.navigate(url, type);
  }

  async navigate(url, transition = 'fade', isPopState = false) {
    if (window.location.protocol === 'file:') {
      window.location.href = url;
      return;
    }

    const view = document.getElementById(this.viewId);
    if (!view) {
      if (!isPopState) window.location.href = url;
      return;
    }

    // suporte a pipe: "slide|fade" -> out=slide, in=fade
    const parts   = transition.split('|');
    const typeOut  = parts[0].trim();
    const typeIn   = (parts[1] || parts[0]).trim();

    const needsOverflow = typeOut.startsWith('slide') || typeIn.startsWith('slide');
    if (needsOverflow) document.body.style.overflow = 'hidden';

    await this.animateOut(view, typeOut);

    try {
      const res     = await fetch(url);
      const html    = await res.text();
      const parser  = new DOMParser();
      const newDoc  = parser.parseFromString(html, 'text/html');
      const newView = newDoc.getElementById(this.viewId);

      if (newView) {
        view.innerHTML = newView.innerHTML;
        document.title = newDoc.title;

        if (!isPopState) history.pushState(null, newDoc.title, url);

        this._syncHead(newDoc);

        ScrollTrigger.getAll().forEach(t => t.kill());
        (this.core._cleanups || []).forEach(fn => fn());
        this.core._cleanups = [];
        gsap.set(view, { clearProps: 'all' });

        this.core.refresh();
        ScrollTrigger.refresh();
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo(0, 0);
        document.documentElement.style.scrollBehavior = '';
        this.initPjax();

        await this.animateIn(view, typeIn);
      } else {
        window.location.href = url;
      }
    } catch(err) {
      console.error('SWPremiumRouter:', err);
      window.location.href = url;
    } finally {
      if (needsOverflow) document.body.style.overflow = '';
    }
  }

  // -- ANIMATE OUT ----------------------------------------------------------
  animateOut(view, type) {
    const dur  = 0.42;
    const ease = 'power2.in';

    return new Promise(resolve => {
      switch (type) {

        case 'slide':
        case 'slide-left':
          gsap.to(view, { x: '-100vw', duration: dur, ease, onComplete: resolve });
          break;

        case 'slide-right':
          gsap.to(view, { x: '100vw', duration: dur, ease, onComplete: resolve });
          break;

        case 'slide-up':
          gsap.to(view, { y: '-100vh', duration: dur, ease, onComplete: resolve });
          break;

        case 'slide-down':
          gsap.to(view, { y: '100vh', duration: dur, ease, onComplete: resolve });
          break;

        case 'scale':
        case 'scale-down':
          gsap.to(view, { scale: .88, opacity: 0, duration: dur, ease, onComplete: resolve });
          break;

        case 'scale-up':
          gsap.to(view, { scale: 1.12, opacity: 0, duration: dur, ease, onComplete: resolve });
          break;

        case 'flip':
          gsap.to(view, {
            rotationY: 90, opacity: 0, duration: dur,
            ease, transformPerspective: 1200, onComplete: resolve,
          });
          break;

        case 'flip-x':
          gsap.to(view, {
            rotationX: 90, opacity: 0, duration: dur,
            ease, transformPerspective: 1200, onComplete: resolve,
          });
          break;

        case 'blur':
        case 'blur-out':
          gsap.to(view, { filter: 'blur(18px)', opacity: 0, duration: dur, ease, onComplete: resolve });
          break;

        case 'wipe':
        case 'curtain': {
          const o = this._overlay();
          gsap.killTweensOf(o);
          o.style.display = 'block';
          gsap.fromTo(o,
            { xPercent: -100 },
            { xPercent: 0, duration: dur + .1, ease: 'power3.inOut', onComplete: resolve }
          );
          break;
        }

        default: // fade
          gsap.to(view, { opacity: 0, y: -18, duration: dur, ease, onComplete: resolve });
      }
    });
  }

  // -- ANIMATE IN -------------------------------------------------------------
  animateIn(view, type) {
    const dur  = 0.52;
    const ease = 'power3.out';

    return new Promise(resolve => {
      switch (type) {

        case 'slide':
        case 'slide-left':
          gsap.fromTo(view,
            { x: '100vw' },
            { x: '0vw', duration: dur, ease, clearProps: 'all', onComplete: resolve });
          break;

        case 'slide-right':
          gsap.fromTo(view,
            { x: '-100vw' },
            { x: '0vw', duration: dur, ease, clearProps: 'all', onComplete: resolve });
          break;

        case 'slide-up':
          gsap.fromTo(view,
            { y: '100vh' },
            { y: '0vh', duration: dur, ease, clearProps: 'all', onComplete: resolve });
          break;

        case 'slide-down':
          gsap.fromTo(view,
            { y: '-100vh' },
            { y: '0vh', duration: dur, ease, clearProps: 'all', onComplete: resolve });
          break;

        case 'scale':
        case 'scale-up':
          gsap.fromTo(view,
            { scale: 1.08, opacity: 0 },
            { scale: 1, opacity: 1, duration: dur, ease, clearProps: 'all', onComplete: resolve });
          break;

        case 'scale-down':
          gsap.fromTo(view,
            { scale: 0.92, opacity: 0 },
            { scale: 1, opacity: 1, duration: dur, ease, clearProps: 'all', onComplete: resolve });
          break;

        case 'flip':
          gsap.fromTo(view,
            { rotationY: -90, opacity: 0 },
            { rotationY: 0, opacity: 1, duration: dur, ease,
              transformPerspective: 1200, clearProps: 'all', onComplete: resolve });
          break;

        case 'flip-x':
          gsap.fromTo(view,
            { rotationX: -90, opacity: 0 },
            { rotationX: 0, opacity: 1, duration: dur, ease,
              transformPerspective: 1200, clearProps: 'all', onComplete: resolve });
          break;

        case 'blur':
        case 'blur-in':
          gsap.fromTo(view,
            { filter: 'blur(18px)', opacity: 0 },
            { filter: 'blur(0px)', opacity: 1, duration: dur, ease, clearProps: 'all', onComplete: resolve });
          break;

        case 'wipe':
        case 'curtain': {
          const o = this._overlay();
          gsap.killTweensOf(o);
          gsap.to(o, {
            xPercent: 100, duration: dur, ease: 'power3.inOut',
            onComplete: () => {
              o.style.display = 'none';
              gsap.set(o, { clearProps: 'all' });
              resolve();
            },
          });
          break;
        }

        default: // fade
          gsap.fromTo(view,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: dur, ease, clearProps: 'all', onComplete: resolve });
      }
    });
  }
}
