// SWPremiumEngine -- portado do Smooll (smooll.sanweb.com.br), atributos sw-premium-*
class SWPremiumCore {
  constructor() {
    this._injectBaseStyles();
    this.refresh();
  }

  // Abaixo de 768px o pin trava a tela num viewport pequeno demais pra valer a pena --
  // recursos com pin caem pro fluxo normal (empilhado) em vez de hijackar o scroll.
  isMobileViewport() {
    return window.matchMedia("(max-width: 767.98px)").matches;
  }

  _injectBaseStyles() {
    if (document.getElementById("sw-premium-base")) return;
    const style = document.createElement("style");
    style.id = "sw-premium-base";
    style.textContent = `
      [sw-premium-animate] { will-change: transform, opacity; }
      [sw-premium-animate^="flip"] { backface-visibility: hidden; }
      [sw-premium-animate="reveal"],
      [sw-premium-animate="reveal-left"],
      [sw-premium-animate="reveal-right"],
      [sw-premium-animate="reveal-center"] { overflow: hidden; }
    `;
    document.head.appendChild(style);
  }

  refresh() {
    const sel = [
      "[sw-premium-animate]", "[sw-premium-trigger]", "[sw-premium-video-scrub]", "[sw-premium-counter]",
      "[sw-premium-scroll-class]", "[sw-premium-parallax]", "[sw-premium-progress-bar]", "[sw-premium-batch]",
      "[sw-premium-scroll-horizontal]", "[sw-premium-timeline]",
      "[sw-premium-split]", "[sw-premium-scramble]", "[sw-premium-typewriter]",
      "[sw-premium-draw-svg]", "[sw-premium-path]",
      "[sw-premium-drag]", "[sw-premium-flip]", "[sw-premium-observer]",
      "[sw-premium-magnetic]", "[sw-premium-cursor]", "[sw-premium-hover-tilt]", "[sw-premium-marquee]",
      "[sw-premium-section]",
    ].join(", ");
    this.elements = document.querySelectorAll(sel);
    this.elements.forEach(el => this.processElement(el));
    swPremiumInitScrollTo();
  }

  processElement(el) {
    if (el.hasAttribute("data-sw-premium-init")) return;
    el.setAttribute("data-sw-premium-init", "true");

    const config = this.parseConfig(el);

    this.ensurePerspective(el, config);

    if (config.videoScrub && el.tagName === "VIDEO") {
      this.setupVideoScrub(el, config);
      return;
    }

    if (config.counter) {
      this.setupCounter(el, config);
      return;
    }

    if (config.progressBar) {
      this.setupProgressBar(el, config);
      return;
    }

    if (config.batch) {
      this.setupBatch(el, config);
      return;
    }

    if (config.scrollHorizontal) {
      this.setupHorizontalScroll(el, config);
      return;
    }

    if (config.timeline) {
      this.setupTimeline(el, config);
      return;
    }

    if (config.parallax !== null) {
      this.setupParallax(el, config);
      if (!config.animate) return;
    }

    if (config.scrollClass) {
      this.setupScrollClass(el, config);
      if (!config.animate) return;
    }

    if (config.split) {
      swPremiumSetupSplit(el, config);
      return;
    }

    if (config.scramble) {
      swPremiumSetupScramble(el, config);
      return;
    }

    if (config.typewriter) {
      swPremiumSetupTypewriter(el, config);
      return;
    }

    if (config.drawSVG) {
      swPremiumSetupDrawSVG(el, config);
      return;
    }

    if (config.pathTarget) {
      swPremiumSetupPath(el, config);
      return;
    }

    if (config.drag) {
      swPremiumSetupDrag(el, config);
      return;
    }

    if (config.flip) {
      swPremiumSetupFlip(this, el, config);
      return;
    }

    if (config.observer) {
      swPremiumSetupObserver(this, el, config);
      return;
    }

    if (config.magnetic) {
      swPremiumSetupMagnetic(this, el, config);
      return;
    }

    if (config.cursor) {
      swPremiumSetupCursor(this, el, config);
      return;
    }

    if (config.hoverTilt) {
      swPremiumSetupHoverTilt(this, el, config);
      return;
    }

    if (config.marquee) {
      swPremiumSetupMarquee(this, el, config);
      return;
    }

    if (config.section) {
      swPremiumSetupSection(el, config);
      return;
    }

    const { from, to } = this.buildTweenSettings(config);
    const target = config.stagger && el.children.length > 0 ? Array.from(el.children) : el;

    if (config.trigger === "scroll") {
      const hasScrub = config.scrub !== null && config.scrub !== undefined && config.scrub !== false;
      const pinTarget = config.pin ? (el.closest(config.pin) || el.parentElement) : null;
      to.scrollTrigger = {
        trigger: pinTarget || el,
        start: config.start || "top 85%",
        end: config.end || "bottom 20%",
        ...(pinTarget ? { pin: pinTarget, anticipatePin: 1 } : {}),
        ...(hasScrub
          ? { scrub: config.scrub }
          : { toggleActions: config.scrollOnce ? "play none none none" : "play none none reverse" })
      };

      if (config.scrollOnce) {
        to.onComplete = function() {
          if (this.scrollTrigger) this.scrollTrigger.kill(false);
        };
      }
    }

    // fromTo() com valor de repouso EXPLÍCITO, não from() dependendo do valor
    // computado atual do elemento -- com stagger + ScrollTrigger + immediateRender,
    // gsap.from() às vezes calcula o "repouso" de x/y/scale/rotation errado (ele
    // gruda no próprio valor de partida), e a animação fica "presa" ali pra sempre
    // mesmo reportando progress:1. Opacity nunca pegava esse bug por sorte (repouso
    // 1 é o default nativo do CSS), mas x/y/scale/rotation precisam do alvo escrito
    // na mão pra não correr esse risco.
    gsap.fromTo(target, from, to);
  }

  parseConfig(el) {
    let scrubVal = el.getAttribute("sw-premium-scroll-scrub");
    if (scrubVal === "true") scrubVal = true;
    else if (!isNaN(parseFloat(scrubVal))) scrubVal = parseFloat(scrubVal);

    const getNum = (attr) => {
      const v = el.getAttribute(attr);
      return v !== null && !isNaN(parseFloat(v)) ? parseFloat(v) : null;
    };

    return {
      animate:         el.getAttribute("sw-premium-animate"),
      duration:        parseFloat(el.getAttribute("sw-premium-duration") || "1"),
      delay:           parseFloat(el.getAttribute("sw-premium-delay") || "0"),
      ease:            el.getAttribute("sw-premium-ease") || "power3.out",
      stagger:         parseFloat(el.getAttribute("sw-premium-stagger") || "0"),
      repeat:          getNum("sw-premium-repeat"),
      yoyo:            el.getAttribute("sw-premium-yoyo") === "true",
      fromX:           getNum("sw-premium-from-x"),
      fromY:           getNum("sw-premium-from-y"),
      fromScale:       getNum("sw-premium-from-scale"),
      fromRotation:    getNum("sw-premium-from-rotation"),
      fromOpacity:     getNum("sw-premium-from-opacity"),
      trigger:         el.getAttribute("sw-premium-trigger"),
      start:           el.getAttribute("sw-premium-scroll-start"),
      end:             el.getAttribute("sw-premium-scroll-end"),
      scrub:           scrubVal,
      pin:             el.getAttribute("sw-premium-scroll-pin"),
      split:           el.getAttribute("sw-premium-split"),
      scrollOnce:      el.hasAttribute("sw-premium-scroll-once"),
      videoScrub:      el.getAttribute("sw-premium-video-scrub") === "true",
      // Counter
      counter:         el.getAttribute("sw-premium-counter") === "true",
      counterFrom:     parseFloat(el.getAttribute("sw-premium-counter-from") || "0"),
      counterPrefix:   el.getAttribute("sw-premium-counter-prefix") || "",
      counterSuffix:   el.getAttribute("sw-premium-counter-suffix") || "",
      counterDecimals: parseInt(el.getAttribute("sw-premium-counter-decimals") || "0"),
      // Scroll class toggle
      scrollClass:     el.getAttribute("sw-premium-scroll-class"),
      // Parallax continuo (px de deslocamento y total)
      parallax:        getNum("sw-premium-parallax"),
      parallaxX:       getNum("sw-premium-parallax-x"),
      // Barra de progresso global
      progressBar:     el.hasAttribute("sw-premium-progress-bar"),
      progressAxis:    el.getAttribute("sw-premium-progress-bar") === "vertical" ? "height" : "width",
      // Batch: anima filhos em lote conforme entram no viewport
      batch:           el.hasAttribute("sw-premium-batch"),
      batchAnimate:    el.getAttribute("sw-premium-batch-animate") || "fade-up",
      batchStagger:    parseFloat(el.getAttribute("sw-premium-batch-stagger") || "0.07"),
      // Scroll horizontal com pin
      scrollHorizontal: el.hasAttribute("sw-premium-scroll-horizontal"),
      horizContent:    el.getAttribute("sw-premium-horiz-content") || ".horiz-content",
      horizReverse:    el.hasAttribute("sw-premium-horiz-reverse"),
      // Timeline scrubada e pinada
      timeline:        el.hasAttribute("sw-premium-timeline"),
      timelineEnd:     el.getAttribute("sw-premium-tl-end") || "+=300%",

      // -- TEXT --
      splitStagger:    getNum("sw-premium-split-stagger"),
      scramble:        el.hasAttribute("sw-premium-scramble"),
      scrambleChars:   el.getAttribute("sw-premium-scramble-chars") || "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&",
      scrambleSpeed:   parseFloat(el.getAttribute("sw-premium-scramble-speed") || "1.5"),
      typewriter:       el.hasAttribute("sw-premium-typewriter"),
      typewriterSpeed:  parseFloat(el.getAttribute("sw-premium-typewriter-speed") || "0.05"),
      typewriterCursor: el.getAttribute("sw-premium-typewriter-cursor") !== null
                          ? el.getAttribute("sw-premium-typewriter-cursor")
                          : "|",
      typewriterRepeat: el.hasAttribute("sw-premium-typewriter-repeat"),
      typewriterPause:  parseFloat(el.getAttribute("sw-premium-typewriter-pause") || "1.5"),

      // -- SVG --
      drawSVG:         el.hasAttribute("sw-premium-draw-svg"),
      drawSVGFrom:     el.getAttribute("sw-premium-draw-svg-from") || "0%",
      drawSVGTo:       el.getAttribute("sw-premium-draw-svg-to")   || "100%",
      scrollTriggerEl: el.getAttribute("sw-premium-scroll-trigger") || null,
      pathTarget:      el.getAttribute("sw-premium-path"),
      pathAlign:       el.getAttribute("sw-premium-path-align") === "true",

      // -- UI --
      drag:            el.hasAttribute("sw-premium-drag"),
      dragType:        el.getAttribute("sw-premium-drag") || "xy",
      dragBounds:      el.getAttribute("sw-premium-drag-bounds"),
      dragSnap:        el.getAttribute("sw-premium-drag-snap"),
      dragInertia:     el.hasAttribute("sw-premium-drag-inertia"),
      dragEdgeResistance: parseFloat(el.getAttribute("sw-premium-drag-edge-resistance") || "0.65"),
      flip:            el.hasAttribute("sw-premium-flip"),
      flipClass:       el.getAttribute("sw-premium-flip-class"),
      flipTarget:      el.getAttribute("sw-premium-flip-target"),
      observer:        el.hasAttribute("sw-premium-observer"),
      observerType:    el.getAttribute("sw-premium-observer-type")      || "wheel,touch",
      observerTolerance: parseFloat(el.getAttribute("sw-premium-observer-tolerance") || "10"),

      // -- PREMIUM --
      magnetic:        el.hasAttribute("sw-premium-magnetic"),
      magneticStrength:parseFloat(el.getAttribute("sw-premium-magnetic-strength") || "0.35"),
      cursor:          el.hasAttribute("sw-premium-cursor"),
      cursorSrc:       el.getAttribute("sw-premium-cursor-img") || "",
      cursorMode:      el.getAttribute("sw-premium-cursor-mode") || "replace", // "replace" ou "follow"
      cursorSize:      parseFloat(el.getAttribute("sw-premium-cursor-size") || "36"),
      cursorEase:      el.getAttribute("sw-premium-cursor-ease") || "power3.out",
      cursorDelay:     parseFloat(el.getAttribute("sw-premium-cursor-delay") || "0.5"),
      hoverTilt:       el.hasAttribute("sw-premium-hover-tilt"),
      tiltStrength:    parseFloat(el.getAttribute("sw-premium-tilt-strength") || "15"),
      marquee:         el.hasAttribute("sw-premium-marquee"),
      marqueeSpeed:    parseFloat(el.getAttribute("sw-premium-marquee-speed") || "60"),
      marqueeDirection:el.getAttribute("sw-premium-marquee-direction") || "left",

      // -- SECTIONS --
      section:         el.hasAttribute("sw-premium-section"),
      sectionType:     el.getAttribute("sw-premium-section") || "stack",
    };
  }

  // -- Parallax continuo -----------------------------------------------------
  setupParallax(el, config) {
    const trigger = el.offsetParent || el.parentElement || el;
    const scrub   = config.scrub !== null && config.scrub !== undefined ? config.scrub : true;
    const fromProps = {}, toProps = {};

    if (config.parallax !== null) {
      const half = Math.abs(config.parallax) / 2;
      fromProps.y = half;
      toProps.y   = -half;
    }
    if (config.parallaxX !== null) {
      const half = Math.abs(config.parallaxX) / 2;
      fromProps.x = half;
      toProps.x   = -half;
    }

    gsap.fromTo(el, fromProps, {
      ...toProps,
      ease: "none",
      scrollTrigger: {
        trigger,
        start: config.start || "top bottom",
        end:   config.end   || "bottom top",
        scrub,
        invalidateOnRefresh: true,
      }
    });
  }

  // -- Progress bar ------------------------------------------------------------
  setupProgressBar(el, config) {
    const axis = config.progressAxis; // "width" ou "height"
    ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: self => {
        el.style[axis] = (self.progress * 100).toFixed(2) + "%";
      }
    });
  }

  // -- Batch -------------------------------------------------------------------
  setupBatch(el, config) {
    const items = Array.from(el.children);
    if (!items.length) return;

    const effect = SWPremiumEffects[config.batchAnimate] || { y: 30, opacity: 0 };
    const fromProps = { ...effect };

    // Calcula o estado "to" (inverso do from)
    const toProps = {};
    Object.keys(fromProps).forEach(k => {
      if (k === "opacity") toProps[k] = 1;
      else if (k === "filter") toProps[k] = "blur(0px)";
      else if (k === "clipPath") toProps[k] = "inset(0% 0% 0% 0%)";
      else toProps[k] = 0;
    });

    gsap.set(items, fromProps);

    ScrollTrigger.batch(items, {
      start: config.start || "top 90%",
      onEnter: batch => gsap.to(batch, {
        ...toProps,
        duration: config.duration || 0.6,
        stagger: config.batchStagger,
        ease: config.ease || "power3.out",
        overwrite: true
      }),
      onLeave: config.scrollOnce ? undefined : batch => gsap.set(batch, fromProps),
      onEnterBack: config.scrollOnce ? undefined : batch => gsap.to(batch, {
        ...toProps,
        duration: config.duration || 0.5,
        stagger: config.batchStagger,
        ease: "power2.out",
        overwrite: true,
      }),
      onLeaveBack: config.scrollOnce ? undefined : batch => gsap.set(batch, fromProps),
    });
  }

  // -- Video Scrub ---------------------------------------------------------------
  setupVideoScrub(video, config) {
    video.controls = false;
    video.pause();
    const createScrubTween = () => {
      const shouldPin = config.pin && !this.isMobileViewport();
      gsap.to(video, {
        currentTime: video.duration,
        ease: "none",
        scrollTrigger: {
          trigger: shouldPin ? (video.closest(config.pin) || video.parentElement) : video,
          start: config.start || "top top",
          end: config.end || "+=150% bottom",
          scrub: config.scrub !== null ? config.scrub : 0.5,
          pin: shouldPin
        }
      });
    };
    if (video.readyState >= 1) createScrubTween();
    else video.addEventListener("loadedmetadata", createScrubTween);
  }

  // -- Counter ---------------------------------------------------------------------
  setupCounter(el, config) {
    const raw = el.textContent.replace(/[^0-9.]/g, "");
    const target = parseFloat(raw) || 0;
    const obj = { val: config.counterFrom };
    gsap.to(obj, {
      val: target,
      duration: config.duration,
      ease: config.ease,
      scrollTrigger: {
        trigger: el,
        start: config.start || "top 85%",
        toggleActions: config.scrollOnce ? "play none none none" : "play none none reverse",
      },
      onUpdate: () => {
        el.textContent = config.counterPrefix + obj.val.toFixed(config.counterDecimals) + config.counterSuffix;
      }
    });
  }

  // -- Scroll Class -------------------------------------------------------------
  setupScrollClass(el, config) {
    ScrollTrigger.create({
      trigger: el,
      start: config.start || "top 85%",
      end: config.end || "bottom 15%",
      onEnter:     () => el.classList.add(config.scrollClass),
      onLeave:     () => { if (!config.scrollOnce) el.classList.remove(config.scrollClass); },
      onEnterBack: () => el.classList.add(config.scrollClass),
      onLeaveBack: () => { if (!config.scrollOnce) el.classList.remove(config.scrollClass); },
    });
  }

  // -- Horizontal Scroll ---------------------------------------------------------
  setupHorizontalScroll(el, config) {
    if (this.isMobileViewport()) return; // mobile: sem pin/hijack, paineis ficam no fluxo normal da pagina

    const track = el.querySelector("[sw-premium-horiz-track]");
    if (!track) return;

    const panels     = Array.from(track.children);
    const contentSel = config.horizContent;
    const xOff       = 180;
    const isRTL      = config.horizReverse;

    // Direcao de entrada do conteudo por painel: sw-premium-horiz-dir="left"|"right"
    const panelDir = (i) => {
      const attr = panels[i].getAttribute("sw-premium-horiz-dir");
      if (attr === "left")  return -xOff;
      if (attr === "right") return  xOff;
      return i % 2 === 0 ? -xOff : xOff;
    };

    // Painel inicial visivel: primeiro (LTR) ou ultimo (RTL)
    const firstVisible = isRTL ? panels.length - 1 : 0;
    let lastActive = firstVisible;

    panels.forEach((panel, i) => {
      if (i === firstVisible) gsap.set(panel, { x: 0, opacity: 1 });
      else                    gsap.set(panel, { x: panelDir(i), opacity: 0 });
    });

    const animatePanel = (idx) => {
      if (idx === lastActive) return;
      panels.forEach((panel, i) => {
        if (i === idx) {
          gsap.to(panel, { x: 0, opacity: 1, duration: 0.6, ease: "power3.out", overwrite: "auto" });
        } else {
          gsap.to(panel, { x: panelDir(i), opacity: 0, duration: 0.4, ease: "power2.in", overwrite: "auto" });
        }
      });
      lastActive = idx;
    };

    const scrub = config.scrub !== null && config.scrub !== undefined ? config.scrub : 1;
    const stConfig = {
      trigger: el,
      pin: el,
      scrub,
      start: config.start || "top top",
      end: () => "+=" + (track.scrollWidth - window.innerWidth),
      invalidateOnRefresh: true,
      anticipatePin: 1,
      onUpdate: self => {
        const vw    = window.innerWidth;
        const total = track.scrollWidth - vw;
        // RTL: progresso invertido -- comeca no ultimo painel
        const px    = isRTL ? (1 - self.progress) * total : self.progress * total;
        const active = Math.min(Math.floor((px + vw * 0.5) / vw), panels.length - 1);
        animatePanel(active);
      },
      onLeaveBack: () => animatePanel(firstVisible),
    };

    if (isRTL) {
      // RTL: track comeca no fim e move para x=0
      gsap.fromTo(track,
        { x: () => -(track.scrollWidth - window.innerWidth) },
        { x: 0, ease: "none", scrollTrigger: stConfig }
      );
    } else {
      gsap.to(track, {
        x: () => -(track.scrollWidth - window.innerWidth),
        ease: "none",
        scrollTrigger: stConfig
      });
    }
  }

  // -- Timeline Pinada -----------------------------------------------------------
  setupTimeline(el, config) {
    if (this.isMobileViewport()) return; // mobile: sem pin, conteudo fica no fluxo normal (empilhado)

    const steps = Array.from(el.querySelectorAll("[sw-premium-tl-step]"));
    const boxes = Array.from(el.querySelectorAll("[sw-premium-tl-box]"));
    const scrub = config.scrub !== null && config.scrub !== undefined ? config.scrub : 1;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        pin: true,
        scrub: scrub,
        start: config.start || "top top",
        end: config.timelineEnd,
        onUpdate: self => {
          const count = steps.length;
          if (!count) return;
          steps.forEach(s => s.classList.remove("active"));
          const idx = Math.min(Math.floor(self.progress * count), count - 1);
          steps[idx].classList.add("active");
        }
      }
    });

    boxes.forEach(box => {
      const raw = box.getAttribute("sw-premium-tl-steps");
      if (!raw) return;
      try {
        const tweens = JSON.parse(raw);
        tweens.forEach((props, i) => {
          if (i === 0) tl.from(box, { ...props, duration: 1 });
          else tl.to(box, { ...props, duration: 1 }, "+=0.2");
        });
      } catch(e) { console.warn("sw-premium-tl-steps JSON invalido:", e); }
    });
  }

  buildTweenSettings(config) {
    let animProps = { opacity: 0, y: 50 };
    if (config.animate && SWPremiumEffects[config.animate]) {
      animProps = { ...SWPremiumEffects[config.animate] };
    }
    if (config.fromX        !== null) animProps.x        = config.fromX;
    if (config.fromY        !== null) animProps.y        = config.fromY;
    if (config.fromScale    !== null) animProps.scale    = config.fromScale;
    if (config.fromRotation !== null) animProps.rotation = config.fromRotation;
    if (config.fromOpacity  !== null) animProps.opacity  = config.fromOpacity;

    let ease = config.ease;
    if (config.animate === "bounce-in")   ease = config.ease !== "power3.out" ? config.ease : "back.out(3)";
    if (config.animate === "elastic-up")  ease = config.ease !== "power3.out" ? config.ease : "elastic.out(1, 0.3)";
    if (config.animate === "drop")        ease = config.ease !== "power3.out" ? config.ease : "back.out(1.5)";
    if (config.animate === "stretch-x" || config.animate === "stretch-y")
                                          ease = config.ease !== "power3.out" ? config.ease : "power4.out";

    // Valor de repouso de cada propriedade quando a animação termina -- 1 pra
    // opacity/scale (tamanho e visibilidade normais), 0 pro resto (sem deslocamento/
    // rotação/inclinação). transformOrigin não anima, só define o pivô, passa direto.
    const restingValue = {
      opacity: 1, scale: 1, scaleX: 1, scaleY: 1,
      x: 0, y: 0, rotation: 0, rotationX: 0, rotationY: 0, rotationZ: 0, skewX: 0, skewY: 0,
      filter: "blur(0px)", clipPath: "inset(0% 0% 0% 0%)",
    };
    const toProps = {};
    Object.keys(animProps).forEach((key) => {
      if (key === "transformOrigin") { toProps[key] = animProps[key]; return; }
      toProps[key] = key in restingValue ? restingValue[key] : 0;
    });

    const t = {
      ...toProps,
      duration: config.duration,
      delay:    config.delay,
      ease:     ease,
    };
    if (config.stagger > 0)           t.stagger   = config.stagger;
    if (config.repeat !== null)       t.repeat    = config.repeat;
    if (config.yoyo)                  t.yoyo      = true;
    if (!(config.scrub || config.trigger === "scroll")) t.clearProps = "all";
    return { from: animProps, to: t };
  }

  ensurePerspective(el, config) {
    const isFlip = ["flip-left","flip-right","flip-up","flip-down"].includes(el.getAttribute("sw-premium-animate"));
    if (!isFlip) return;
    const target = (config && config.stagger > 0 && el.children.length > 0) ? el : el.parentElement;
    if (target) target.style.perspective = target.style.perspective || "800px";
  }
}

// Auto-boot -- só ativa se o desenvolvedor incluiu este bundle opcional.
// Mesmo idioma de src/js/modules/sw-sidebar.js: se o script for injetado depois que
// DOMContentLoaded já disparou (ex.: navegação AJAX do sidebar de docs carregando este
// bundle sob demanda numa página que não o tinha no <head> original), esse listener nunca
// dispararia -- por isso o boot roda direto quando o documento já está pronto.
function swPremiumBoot() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.defaults({ duration: 0.001 });
  }

  // Registra todos os plugins disponiveis no bundle
  const pluginsToRegister = [
    ScrollTrigger,
    ...(typeof Draggable          !== 'undefined' ? [Draggable]          : []),
    ...(typeof Flip               !== 'undefined' ? [Flip]               : []),
    ...(typeof Observer           !== 'undefined' ? [Observer]           : []),
    ...(typeof MotionPathPlugin   !== 'undefined' ? [MotionPathPlugin]   : []),
    ...(typeof ScrollToPlugin     !== 'undefined' ? [ScrollToPlugin]     : []),
    ...(typeof TextPlugin         !== 'undefined' ? [TextPlugin]         : []),
  ];
  gsap.registerPlugin(...pluginsToRegister);

  const coreInstance   = new SWPremiumCore();
  const routerInstance = typeof SWPremiumRouter !== 'undefined' ? new SWPremiumRouter(coreInstance) : null;

  window.SWPremium = {
    core:    coreInstance,
    router:  routerInstance,
    destroy: () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
      (coreInstance._cleanups || []).forEach(fn => fn());
      coreInstance._cleanups = [];
    },
  };

  // bfcache: browser restaura pagina com inline styles do GSAP (opacity:0)
  // pageshow com persisted:true = voltou pelo botao "voltar" do browser
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      ScrollTrigger.getAll().forEach(t => t.kill());
      coreInstance.refresh();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", swPremiumBoot);
} else {
  swPremiumBoot();
}
