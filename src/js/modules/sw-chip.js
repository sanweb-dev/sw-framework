/* SW Framework Chip — [sw-chip] removível via .sw-chip-x */
(function () {
  'use strict';

  let bound = false;

  const SWChip = {
    initAll() {
      if (bound) return;
      bound = true;
      document.addEventListener('click', (event) => {
        const trigger = event.target.closest('.sw-chip-x');
        if (!trigger) return;
        const chip = trigger.closest('[sw-chip]');
        if (!chip) return;
        SW.emit(chip, 'sw:chip:remove', {});
        if (SW.Utils.reducedMotion()) {
          chip.remove();
          return;
        }
        chip.classList.add('is-leaving');
        window.setTimeout(() => chip.remove(), 250);
      });
    }
  };

  window.SW?.register('SWChip', SWChip);
  if (window.SW) window.SW.Chip = SWChip;
})();
