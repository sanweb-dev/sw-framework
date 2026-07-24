/*! SW Framework 0.1.0-alpha.1 | Sandro Web Solutions | FX */
/* SW Framework FX — native, optional and progressively enhanced interactions */
(function () {
  'use strict';

  const SCRAMBLE_CHARACTERS = Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$@%&*');
  const MAX_SCRAMBLE_LENGTH = 160;
  const SCRAMBLE_DURATION = 540;
  const DEFAULT_TYPEWRITER_SPEED = 40;
  const TILT_LIMIT = 6;
  const MAGNET_LIMIT = 8;
  const MAGNET_STRENGTH = 0.12;

  const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const finePointerQuery = window.matchMedia?.('(hover: hover) and (pointer: fine)');

  const scrambleInitialized = new WeakSet();
  const typewriterInitialized = new WeakSet();
  const splitInitialized = new WeakSet();
  const scrubInitialized = new WeakSet();
  const marqueeInitialized = new WeakSet();
  const tiltInitialized = new WeakSet();
  const magneticInitialized = new WeakSet();

  const scrambleStates = new WeakMap();
  const typewriterStates = new WeakMap();
  const splitStates = new WeakMap();
  const scrubObservers = new WeakMap();
  const tiltStates = new WeakMap();
  const magneticStates = new WeakMap();

  function findAll(root, selector) {
    const elements = SW.$(selector, root);
    if (root instanceof Element && root.matches(selector)) elements.unshift(root);
    return elements;
  }

  function motionAllowed() {
    return !(motionQuery?.matches || SW.Utils?.reducedMotion?.());
  }

  function pointerAllowed(event) {
    return motionAllowed() && finePointerQuery?.matches !== false && event.pointerType !== 'touch';
  }

  function clamp(value, min, max) {
    if (max === undefined) return Math.min(min, Math.max(-min, value));
    return Math.min(max, Math.max(min, value));
  }

  /* --- SCRAMBLE --- */
  function stopScramble(element, emitEnd = false) {
    const state = scrambleStates.get(element);
    if (state?.frame) window.cancelAnimationFrame(state.frame);
    if (state) element.textContent = state.original;
    scrambleStates.delete(element);
    element.setAttribute('data-sw-scramble-state', 'idle');
    if (emitEnd) SW.emit(element, 'sw:fx-end', { effect: 'scramble' });
  }

  function runScramble(element) {
    if (!(element instanceof Element) || !motionAllowed() || element.childElementCount) return false;
    if (scrambleStates.has(element)) stopScramble(element);
    const characters = Array.from(element.textContent || '');
    if (!characters.length || characters.length > MAX_SCRAMBLE_LENGTH) return false;

    const state = { frame: 0, original: characters.join(''), startedAt: 0 };
    scrambleStates.set(element, state);
    element.setAttribute('data-sw-scramble-state', 'active');
    SW.emit(element, 'sw:fx-start', { effect: 'scramble' });

    const render = (time) => {
      if (!element.isConnected || !motionAllowed()) {
        stopScramble(element, true);
        return;
      }
      if (!state.startedAt) state.startedAt = time;
      const progress = Math.min(1, (time - state.startedAt) / SCRAMBLE_DURATION);
      const revealed = Math.floor(progress * characters.length);
      element.textContent = characters.map((character, index) => {
        if (index < revealed || /\s/.test(character)) return character;
        return SCRAMBLE_CHARACTERS[Math.floor(Math.random() * SCRAMBLE_CHARACTERS.length)];
      }).join('');

      if (progress < 1) state.frame = window.requestAnimationFrame(render);
      else stopScramble(element, true);
    };

    state.frame = window.requestAnimationFrame(render);
    return true;
  }

  /* --- TYPEWRITER --- */
  function stopTypewriter(element, emitEnd = false) {
    const state = typewriterStates.get(element);
    if (state?.timer) window.clearTimeout(state.timer);
    if (state) element.textContent = state.original;
    typewriterStates.delete(element);
    element.setAttribute('data-sw-typewriter-state', 'idle');
    if (emitEnd) SW.emit(element, 'sw:fx-end', { effect: 'typewriter' });
  }

  function runTypewriter(element) {
    if (!(element instanceof Element) || element.childElementCount) return false;
    const original = typewriterStates.get(element)?.original || element.textContent || '';
    if (!original.length) return false;

    if (!motionAllowed()) {
      element.textContent = original;
      element.setAttribute('data-sw-typewriter-state', 'idle');
      return false;
    }

    if (typewriterStates.has(element)) stopTypewriter(element);

    const speedAttr = parseInt(element.getAttribute('data-sw-speed'), 10);
    const speed = !isNaN(speedAttr) && speedAttr > 0 ? speedAttr : DEFAULT_TYPEWRITER_SPEED;

    const state = { timer: null, original, currentIndex: 0 };
    typewriterStates.set(element, state);
    element.textContent = '';
    element.setAttribute('data-sw-typewriter-state', 'active');
    SW.emit(element, 'sw:fx-start', { effect: 'typewriter' });

    const step = () => {
      if (!element.isConnected || !motionAllowed()) {
        stopTypewriter(element, true);
        return;
      }
      state.currentIndex++;
      element.textContent = original.slice(0, state.currentIndex);
      if (state.currentIndex < original.length) {
        state.timer = window.setTimeout(step, speed);
      } else {
        stopTypewriter(element, true);
      }
    };

    state.timer = window.setTimeout(step, speed);
    return true;
  }

  /* --- SPLIT TEXT --- */
  function runSplitText(element) {
    if (!(element instanceof Element) || splitInitialized.has(element)) return;
    const mode = element.getAttribute('sw-split') || 'words';
    const text = element.textContent || '';
    if (!text.trim()) return;

    splitInitialized.add(element);
    splitStates.set(element, { original: text });
    element.setAttribute('aria-label', text);

    const container = document.createElement('span');
    container.className = 'sw-split-container';
    container.setAttribute('aria-hidden', 'true');

    if (mode === 'chars') {
      Array.from(text).forEach((char, index) => {
        const charSpan = document.createElement('span');
        charSpan.className = 'sw-split-char';
        charSpan.style.setProperty('--sw-char-index', String(index));
        charSpan.textContent = char === ' ' ? '\u00A0' : char;
        container.appendChild(charSpan);
      });
    } else {
      const words = text.split(/\s+/);
      words.forEach((word, wordIdx) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'sw-split-word';
        wordSpan.style.setProperty('--sw-word-index', String(wordIdx));

        if (mode === 'words,chars') {
          Array.from(word).forEach((char, charIdx) => {
            const charSpan = document.createElement('span');
            charSpan.className = 'sw-split-char';
            charSpan.style.setProperty('--sw-char-index', String(charIdx));
            charSpan.textContent = char;
            wordSpan.appendChild(charSpan);
          });
        } else {
          wordSpan.textContent = word;
        }

        container.appendChild(wordSpan);
        if (wordIdx < words.length - 1) {
          container.appendChild(document.createTextNode(' '));
        }
      });
    }

    element.textContent = '';
    element.appendChild(container);
    element.setAttribute('data-sw-split-state', 'ready');
  }

  /* --- SCROLL SCRUB --- */
  function updateScrub(element) {
    if (!motionAllowed()) {
      element.style.setProperty('--sw-scrub-progress', '1');
      element.setAttribute('data-sw-scrub-state', 'idle');
      return;
    }

    const rect = element.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (rect.bottom < 0 || rect.top > vh) return;

    const totalDistance = vh + rect.height;
    const currentPosition = vh - rect.top;
    const rawProgress = currentPosition / totalDistance;
    const progress = clamp(rawProgress, 0, 1);

    element.style.setProperty('--sw-scrub-progress', progress.toFixed(3));
    element.setAttribute('data-sw-scrub-state', 'active');
  }

  function initScrub(root) {
    findAll(root, '[sw-scrub]').forEach((element) => {
      if (scrubInitialized.has(element)) return;
      scrubInitialized.add(element);

      if (!('IntersectionObserver' in window)) {
        element.style.setProperty('--sw-scrub-progress', '1');
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            updateScrub(element);
            const onScroll = () => updateScrub(element);
            window.addEventListener('scroll', onScroll, { passive: true });
            scrubObservers.set(element, onScroll);
          } else {
            const onScroll = scrubObservers.get(element);
            if (onScroll) {
              window.removeEventListener('scroll', onScroll);
              scrubObservers.delete(element);
            }
          }
        });
      }, { threshold: [0, 0.25, 0.5, 0.75, 1] });

      observer.observe(element);
      element.setAttribute('data-sw-scrub-state', 'idle');
    });
  }

  /* --- MARQUEE --- */
  function initMarquee(root) {
    findAll(root, '[sw-marquee]').forEach((element) => {
      if (marqueeInitialized.has(element)) return;
      marqueeInitialized.add(element);

      if (!element.querySelector('.sw-marquee-content')) {
        const innerHTML = element.innerHTML;
        element.textContent = '';

        const track = document.createElement('div');
        track.className = 'sw-marquee-content';
        track.innerHTML = innerHTML;

        const clone = track.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');

        element.appendChild(track);
        element.appendChild(clone);
      }

      element.setAttribute('data-sw-marquee-state', 'active');

      const pause = () => element.setAttribute('data-sw-marquee-state', 'paused');
      const resume = () => element.setAttribute('data-sw-marquee-state', 'active');

      element.addEventListener('pointerenter', pause);
      element.addEventListener('pointerleave', resume);
      element.addEventListener('focusin', pause);
      element.addEventListener('focusout', resume);
    });
  }

  /* --- POINTER EFFECTS (TILT & MAGNETIC) --- */
  function stateStore(type) {
    return type === 'tilt' ? tiltStates : magneticStates;
  }

  function resetPointer(element, type) {
    const store = stateStore(type);
    const state = store.get(element);
    if (state?.frame) window.cancelAnimationFrame(state.frame);
    if (state?.active) {
      if (state.baseTransform) element.style.transform = state.baseTransform;
      else element.style.removeProperty('transform');
    }
    if (state) {
      state.frame = 0;
      state.active = false;
      state.baseTransform = '';
    }
    element.setAttribute(`data-sw-${type}-state`, 'idle');
  }

  function renderPointer(element, type, state) {
    state.frame = 0;
    if (!motionAllowed() || !element.isConnected) {
      resetPointer(element, type);
      return;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      resetPointer(element, type);
      return;
    }
    const x = state.clientX - rect.left - rect.width / 2;
    const y = state.clientY - rect.top - rect.height / 2;

    if (type === 'tilt') {
      const rotateX = clamp((-y / (rect.height / 2)) * TILT_LIMIT, TILT_LIMIT);
      const rotateY = clamp((x / (rect.width / 2)) * TILT_LIMIT, TILT_LIMIT);
      element.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(1.01)`;
    } else {
      const translateX = clamp(x * MAGNET_STRENGTH, MAGNET_LIMIT);
      const translateY = clamp(y * MAGNET_STRENGTH, MAGNET_LIMIT);
      element.style.transform = `translate3d(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px, 0)`;
    }
    element.setAttribute(`data-sw-${type}-state`, 'active');
  }

  class SWFx {
    static initAll(root = document) {
      this.initScramble(root);
      this.initTypewriter(root);
      this.initSplitText(root);
      this.initScrub(root);
      this.initMarquee(root);
      this.initPointerEffect(root, '[sw-tilt]', 'tilt');
      this.initPointerEffect(root, '[sw-magnetic]:not([sw-tilt])', 'magnetic');
    }

    static initScramble(root) {
      findAll(root, '[sw-scramble]').forEach((element) => {
        if (scrambleInitialized.has(element)) return;
        scrambleInitialized.add(element);
        element.setAttribute('data-sw-scramble-state', 'idle');
        element.addEventListener('pointerenter', () => runScramble(element));
        element.addEventListener('focus', () => runScramble(element));
      });
    }

    static initTypewriter(root) {
      findAll(root, '[sw-typewriter]').forEach((element) => {
        if (typewriterInitialized.has(element)) return;
        typewriterInitialized.add(element);
        element.setAttribute('data-sw-typewriter-state', 'idle');
        element.addEventListener('pointerenter', () => runTypewriter(element));
        element.addEventListener('focus', () => runTypewriter(element));
      });
    }

    static initSplitText(root) {
      findAll(root, '[sw-split]').forEach((element) => runSplitText(element));
    }

    static initScrub(root) {
      initScrub(root);
    }

    static initMarquee(root) {
      initMarquee(root);
    }

    static initPointerEffect(root, selector, type) {
      const initialized = type === 'tilt' ? tiltInitialized : magneticInitialized;
      const store = stateStore(type);
      findAll(root, selector).forEach((element) => {
        if (initialized.has(element)) return;
        initialized.add(element);
        store.set(element, { frame: 0, active: false, baseTransform: '', clientX: 0, clientY: 0 });
        element.setAttribute(`data-sw-${type}-state`, 'idle');

        element.addEventListener('pointermove', (event) => {
          if (!pointerAllowed(event)) {
            resetPointer(element, type);
            return;
          }
          const state = store.get(element);
          if (!state.active) {
            state.baseTransform = element.style.transform;
            state.active = true;
          }
          state.clientX = event.clientX;
          state.clientY = event.clientY;
          if (!state.frame) state.frame = window.requestAnimationFrame(() => renderPointer(element, type, state));
        }, { passive: true });

        element.addEventListener('pointerleave', () => resetPointer(element, type));
        element.addEventListener('pointercancel', () => resetPointer(element, type));
      });
    }

    static scramble(element) {
      return runScramble(element);
    }

    static typewriter(element) {
      return runTypewriter(element);
    }

    static splitText(element) {
      return runSplitText(element);
    }

    static reset(root = document) {
      findAll(root, '[sw-scramble]').forEach((element) => stopScramble(element));
      findAll(root, '[sw-typewriter]').forEach((element) => stopTypewriter(element));
      findAll(root, '[sw-tilt]').forEach((element) => resetPointer(element, 'tilt'));
      findAll(root, '[sw-magnetic]').forEach((element) => resetPointer(element, 'magnetic'));
    }
  }

  motionQuery?.addEventListener?.('change', (event) => {
    if (event.matches) SWFx.reset(document);
  });

  window.SW?.register('SWFx', SWFx);
  if (window.SW) window.SW.Fx = SWFx;
})();
