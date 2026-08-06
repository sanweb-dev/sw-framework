(function (window, document) {
  'use strict';

  const root = document.documentElement;
  const directions = new Set(['neutral', 'forward', 'back']);
  const storageKey = 'sw:trans:direction';
  try {
    const savedTheme = window.localStorage.getItem('sw-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      root.setAttribute('sw-theme', savedTheme);
      root.style.colorScheme = savedTheme;
    }
  } catch (_) {}

  const normalize = (direction) => directions.has(direction) ? direction : 'neutral';

  const classify = (activation) => {
    if (!activation?.from || !activation.entry) return 'neutral';
    if (activation.navigationType === 'push') return 'forward';
    if (activation.navigationType !== 'traverse') return 'neutral';

    const fromIndex = activation.from.index;
    const entryIndex = activation.entry.index;
    if (!Number.isInteger(fromIndex) || !Number.isInteger(entryIndex) || fromIndex === entryIndex) return 'neutral';
    return entryIndex < fromIndex ? 'back' : 'forward';
  };

  const apply = (direction) => {
    const safeDirection = normalize(direction);
    root.dataset.swTransDirection = safeDirection;
    return safeDirection;
  };

  /* Estilo de transição nativa (data-sw-mpa-style): ao contrário da direção
   * (recalculada a cada navegação pela Navigation API), o estilo é uma
   * preferência que o usuário escolhe e que fica "grudada" na aba até
   * escolher outra — por isso vive no sessionStorage sem ser removida
   * depois de lida, e é reaplicada em toda carga de página. */
  const styles = new Set(['default', 'fade', 'zoom', 'circle', 'slide-y', 'scoped']);
  const styleKey = 'sw:trans:style';
  const normalizeStyle = (style) => styles.has(style) ? style : 'default';
  const applyStyle = (style) => {
    const safeStyle = normalizeStyle(style);
    root.dataset.swMpaStyle = safeStyle;
    return safeStyle;
  };
  const readStyle = () => {
    try { return normalizeStyle(window.sessionStorage.getItem(styleKey)); }
    catch (_) { return 'default'; }
  };
  const setStyle = (style) => {
    const safeStyle = normalizeStyle(style);
    try { window.sessionStorage.setItem(styleKey, safeStyle); } catch (_) {}
    return applyStyle(safeStyle);
  };
  applyStyle(readStyle());
  window.SWMpa = { setStyle, getStyle: readStyle };

  /* Gatilho 100% por atributo -- sem onclick, sem JS escrito por quem usa:
   *   <a href="destino.html" sw-trans-style="fade">Ir</a>
   *   <a href="destino.html" sw-trans-style="scoped" sw-trans-name="main-x">Ir</a>
   * sw-trans-name nomeia (view-transition-name) o <main> desta MESMA pagina
   * (a que esta' SAINDO) ANTES de navegar -- a pagina de destino so' precisa
   * ter sw-morph="main-x" no elemento equivalente (SWTrans ja' cuida disso).
   * "scoped" tambem desliga a animacao do root (ver 07-transitions.css), pra
   * sidebar/cabecalho ficarem parados e so' o elemento nomeado se mover. */
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[sw-trans-style], [sw-trans-name]');
    if (!trigger) return;
    const style = trigger.getAttribute('sw-trans-style');
    if (style) setStyle(style);
    const name = trigger.getAttribute('sw-trans-name');
    if (name) {
      const target = document.querySelector(trigger.getAttribute('sw-trans-target') || 'main');
      if (target) target.style.viewTransitionName = `sw-${name}`;
    }
  });

  const store = (direction) => {
    try { window.sessionStorage.setItem(storageKey, normalize(direction)); }
    catch (_) { /* Storage can be unavailable in restricted browsing modes. */ }
  };

  const takeStored = () => {
    try {
      const direction = normalize(window.sessionStorage.getItem(storageKey));
      window.sessionStorage.removeItem(storageKey);
      return direction;
    } catch (_) { return 'neutral'; }
  };

  const isReload = () => {
    const navigationEntry = window.performance?.getEntriesByType?.('navigation')?.[0];
    return navigationEntry?.type === 'reload';
  };

  const resolveInbound = () => {
    const stored = takeStored();
    if (isReload()) return 'neutral';
    const activated = classify(window.navigation?.activation);
    return activated === 'neutral' ? stored : activated;
  };

  const setTransitionType = (transition, direction) => {
    if (!transition?.types || direction === 'neutral') return;
    transition.types.add(`sw-${direction}`);
  };

  apply(resolveInbound());

  window.addEventListener('pageswap', (event) => {
    const direction = apply(classify(event.activation));
    store(direction);
    setTransitionType(event.viewTransition, direction);
  });

  window.addEventListener('pagereveal', (event) => {
    const direction = apply(resolveInbound());
    setTransitionType(event.viewTransition, direction);
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) apply(resolveInbound());
  });
})(window, document);
