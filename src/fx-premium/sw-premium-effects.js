// Dicionario de Efeitos Pre-programados do SW Premium (portado do Smooll)
const SWPremiumEffects = {
  // -- Fades --
  "fade-up":      { y: 80, opacity: 0 },
  "fade-down":    { y: -80, opacity: 0 },
  "fade-left":    { x: 80, opacity: 0 },
  "fade-right":   { x: -80, opacity: 0 },
  "fade-in":      { opacity: 0 },

  // -- Zooms --
  "zoom-in":      { scale: 0.6, opacity: 0 },
  "zoom-out":     { scale: 1.4, opacity: 0 },

  // -- Flips (3D) --
  "flip-left":    { rotationY: -90, opacity: 0 },
  "flip-right":   { rotationY: 90,  opacity: 0 },
  "flip-up":      { rotationX: -90, opacity: 0 },
  "flip-down":    { rotationX: 90,  opacity: 0 },

  // -- Rotate --
  "rotate-in":      { rotation: -180, opacity: 0, transformOrigin: "center" },
  "rotate-in-cw":   { rotation:  180, opacity: 0, transformOrigin: "center" },

  // -- Skew --
  "skew-left":    { skewX: -20, x: -60, opacity: 0 },
  "skew-right":   { skewX:  20, x:  60, opacity: 0 },

  // -- Elastico / Bounce --
  "bounce-in":    { scale: 0.3, opacity: 0 },
  "elastic-up":   { y: 100, opacity: 0 },

  // -- Clip / Reveal --
  "reveal":        { clipPath: "inset(100% 0 0 0)" },
  "reveal-left":   { clipPath: "inset(0 100% 0 0)" },
  "reveal-right":  { clipPath: "inset(0 0 0 100%)" },
  "reveal-center": { clipPath: "inset(0 50% 0 50%)" },

  // -- Blur --
  "blur-in":      { filter: "blur(20px)", opacity: 0 },
  "blur-up":      { filter: "blur(20px)", y: 40, opacity: 0 },

  // -- Diagonais --
  "fade-up-left":  { x:  60, y: 60, opacity: 0 },
  "fade-up-right": { x: -60, y: 60, opacity: 0 },

  // -- Zoom + Blur (moderno) --
  "zoom-blur":    { scale: 0.85, filter: "blur(12px)", opacity: 0 },

  // -- Drop (queda com back.out) --
  "drop":         { y: -80, scale: 0.95, opacity: 0 },

  // -- Stretch -- reveal por escala --
  "stretch-x":    { scaleX: 0, opacity: 0, transformOrigin: "left center" },
  "stretch-y":    { scaleY: 0, opacity: 0, transformOrigin: "top center" },
};
