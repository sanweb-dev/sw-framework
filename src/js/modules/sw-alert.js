/* SW Framework Alert — portado do Y2Alert (y2.sanweb.com.br), CSS injetado em runtime */
(function () {
  'use strict';

  class SWAlert {
    static _boxes = {};
    static _cssReady = false;

    static _css() {
      if (SWAlert._cssReady) return;
      SWAlert._cssReady = true;
      const s = document.createElement('style');
      s.id = '_sw-alert-css';
      s.textContent = `
.sw-alert-box{position:fixed;z-index:999999;display:flex;flex-direction:column;gap:1.2rem;pointer-events:none;width:min(42rem,calc(100vw - 3.2rem))}
.sw-alert-box.tl{top:2rem;left:2rem}.sw-alert-box.tc{top:2rem;left:50%;transform:translateX(-50%)}
.sw-alert-box.tr{top:2rem;right:2rem}.sw-alert-box.bl{bottom:2rem;left:2rem}
.sw-alert-box.bc{bottom:2rem;left:50%;transform:translateX(-50%)}.sw-alert-box.br{bottom:2rem;right:2rem}
.sw-alert-box.cl{top:50%;left:2rem;transform:translateY(-50%)}.sw-alert-box.cc{top:50%;left:50%;transform:translate(-50%,-50%)}.sw-alert-box.cr{top:50%;right:2rem;transform:translateY(-50%)}
.sw-alert{position:relative;display:flex;align-items:center;min-height:6.4rem;padding:1.4rem 2.4rem 1.4rem 6.2rem;border-radius:.8rem;border:1px solid transparent;pointer-events:all;cursor:pointer;font-family:var(--sw-f-san);font-size:1.7rem;font-weight:500;line-height:1.4;color:#fff;background:rgba(20,20,20,.75);backdrop-filter:blur(1.2rem);-webkit-backdrop-filter:blur(1.2rem);box-shadow:0 1.2rem 4rem rgba(0,0,0,.5);text-shadow:0.1rem 0.1rem 0.3rem rgba(0,0,0,.5);animation:_swAlrIn .4s cubic-bezier(0.2, 0.8, 0.4, 1.05);transition:all 0.4s cubic-bezier(0.4, 0, 0.2, 1)}
.sw-alert.is-out{opacity:0;transform:translateX(20px) scale(0.95);filter:blur(4px)}
@keyframes _swAlrIn{from{opacity:0;transform:translateX(40px);filter:blur(10px)}to{opacity:1;transform:none;filter:none}}
.sw-alert-ico{position:absolute;left:1.6rem;top:50%;transform:translateY(-50%);width:3.2rem;height:3.2rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:2.8rem;filter:drop-shadow(0 2px 6px rgba(0,0,0,.4))}
.sw-alert-body{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}.sw-alert-ttl{font-weight:700;margin-bottom:.2rem;font-size:1.4rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.9}
.sw-alert-msg{opacity:1;font-weight:400}
.sw-alert-cls{position:absolute;right:1rem;top:50%;transform:translateY(-50%);width:3.2rem;height:3.2rem;display:flex;align-items:center;justify-content:center;opacity:0.3;font-size:2.4rem;line-height:1;background:none;border:0;cursor:pointer;color:inherit;transition:all .2s;border-radius:50%}
.sw-alert-cls:hover{opacity:1;background:rgba(255,255,255,0.1)}
.sw-alert-bar{position:absolute;bottom:0;left:.8rem;right:.8rem;height:3px;border-radius:99px;opacity:0.6;animation:_swBar linear forwards}
@keyframes _swBar{from{width:calc(100% - 1.6rem)}to{width:0%}}
.sw-alert.ok{border-color:rgba(0,255,100,0.35);color:#e0ffe0}.sw-alert.ok .sw-alert-bar{background:#00ff64}
.sw-alert.err{border-color:rgba(255,50,50,0.35);color:#ffe0e0}.sw-alert.err .sw-alert-bar{background:#ff3232}
.sw-alert.ale{border-color:rgba(255,180,0,0.35);color:#fff5e0}.sw-alert.ale .sw-alert-bar{background:#ffb400}
.sw-alert.inf{border-color:rgba(0,180,255,0.35);color:#e0f5ff}.sw-alert.inf .sw-alert-bar{background:#00b4ff}
.sw-alert.drk{border-color:rgba(255,255,255,0.15);color:#f5f5f5}.sw-alert.drk .sw-alert-bar{background:#fff}
/* Confirmação — estilo SweetAlert2 */
.sw-cfm-ovl{position:fixed!important;inset:0!important;z-index:9999999!important;background:rgba(0,0,0,.6)!important;backdrop-filter:blur(4px)!important;-webkit-backdrop-filter:blur(4px)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:2rem!important;opacity:0!important;transition:opacity .25s ease!important;pointer-events:none!important}
.sw-cfm-ovl.is-act{opacity:1!important;pointer-events:auto!important}
.sw-cfm{font-family:var(--sw-f-hd)!important;display:flex!important;flex-direction:column!important;align-items:center!important;background:var(--sw-sur)!important;border:1px solid var(--sw-bor)!important;border-radius:var(--sw-r-g)!important;width:min(40rem,94vw)!important;box-shadow:0 2.5rem 6rem rgba(0,0,0,.45)!important;overflow:hidden!important;text-align:center!important;transform:scale(.72) translateY(28px)!important;opacity:0!important;transition:transform .38s cubic-bezier(.34,1.4,.64,1),opacity .3s ease!important}
.sw-cfm-ovl.is-act .sw-cfm{transform:scale(1) translateY(0)!important;opacity:1!important}
.sw-cfm-hdr{width:100%!important;padding:3.2rem 2.4rem 1.2rem!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:.8rem!important}
.sw-cfm-ico-wrap{width:7rem!important;height:7rem!important;border-radius:50%!important;background:linear-gradient(135deg,#fbbf24,#f97316)!important;display:flex!important;align-items:center!important;justify-content:center!important;box-shadow:0 .8rem 2.8rem rgba(249,115,22,.5)!important;animation:_swCfmPop .5s cubic-bezier(.34,1.6,.64,1) .1s both!important}
.sw-cfm-ico-wrap i{font-size:3.2rem!important;color:#fff!important;line-height:1!important}
@keyframes _swCfmPop{from{transform:scale(0) rotate(-15deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}
.sw-cfm-ttl{font-family:var(--sw-f-hd)!important;font-size:2rem!important;font-weight:800!important;color:var(--sw-txt)!important;margin:0!important;line-height:1.2!important}
.sw-cfm-bdy{width:100%!important;padding:0 3.2rem 0!important}
.sw-cfm-txt{font-family:var(--sw-f-san)!important;font-size:1.5rem!important;font-weight:400!important;color:var(--sw-txt-mut)!important;line-height:1.7!important;margin:0!important}
.sw-cfm-act{width:100%!important;display:flex!important;flex-direction:row-reverse!important;gap:1rem!important;justify-content:center!important;padding:1.6rem 2.4rem 2.4rem!important}
.sw-cfm-act button{font-family:var(--sw-f-san)!important;padding:1.1rem 2.8rem!important;border:none!important;cursor:pointer!important;font-size:1.5rem!important;font-weight:700!important;border-radius:var(--sw-r-m)!important;transition:transform .2s ease,box-shadow .2s ease,filter .2s ease!important;position:relative!important;overflow:hidden!important;letter-spacing:.01em!important}
.sw-cfm-act button::before{content:''!important;position:absolute!important;top:0!important;left:-100%!important;width:100%!important;height:100%!important;background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent)!important;transition:left .4s ease!important}
.sw-cfm-act button:hover::before{left:100%!important}
.sw-cfm-act button:active{transform:scale(.97)!important}
.sw-cfm-act .is-ok{background:linear-gradient(135deg,#3ecf6a,#28a745)!important;color:#fff!important;box-shadow:0 4px 14px rgba(40,167,69,.4)!important}.sw-cfm-act .is-ok:hover{filter:brightness(1.08)!important;transform:translateY(-2px)!important;box-shadow:0 6px 20px rgba(40,167,69,.5)!important}
.sw-cfm-act .is-no{background:var(--sw-bg-)!important;color:var(--sw-txt-mut)!important;border:1.5px solid var(--sw-bor)!important}.sw-cfm-act .is-no:hover{background:var(--sw-neu-3)!important;transform:translateY(-2px)!important}`;
      document.head.appendChild(s);
    }

    static _getBox(pos) {
      SWAlert._css();
      const p = pos || 'tr';
      if (!SWAlert._boxes[p]) {
        const box = document.createElement('div');
        box.className = `sw-alert-box ${p}`;
        box.setAttribute('aria-live', 'polite');
        box.setAttribute('aria-atomic', 'false');
        document.body.appendChild(box);
        SWAlert._boxes[p] = box;
      }
      return SWAlert._boxes[p];
    }

    static _show(type, msg, title, dur, pos) {
      const duration = dur === undefined || dur === null ? 4000 : Number(dur) || 0;
      const box = SWAlert._getBox(pos);

      const icos = {
        ok: 'swi-check-circle',
        err: 'swi-error-circle',
        ale: 'swi-alarm-exclamation',
        inf: 'swi-info-circle',
        drk: 'swi-diamond',
      };

      const el = document.createElement('div');
      el.className = `sw-alert ${type}`;
      el.setAttribute('role', 'alert');

      const icoClass = icos[type];
      if (icoClass) {
        const icoEl = document.createElement('i');
        icoEl.className = `sw-alert-ico ${icoClass}`;
        el.appendChild(icoEl);
      } else {
        el.style.paddingLeft = '2.4rem';
      }

      const bodyEl = document.createElement('div');
      bodyEl.className = 'sw-alert-body';

      if (title) {
        const ttlEl = document.createElement('div');
        ttlEl.className = 'sw-alert-ttl';
        ttlEl.textContent = title;
        bodyEl.appendChild(ttlEl);
      }

      const message = document.createElement('div');
      message.className = 'sw-alert-msg';
      message.textContent = String(msg ?? '');
      bodyEl.appendChild(message);

      if (duration > 0) {
        const barEl = document.createElement('div');
        barEl.className = 'sw-alert-bar';
        barEl.style.animationDuration = `${duration}ms`;
        bodyEl.appendChild(barEl);
      }

      const clsBtn = document.createElement('button');
      clsBtn.type = 'button';
      clsBtn.className = 'sw-alert-cls';
      clsBtn.setAttribute('aria-label', 'Fechar');
      const clsIco = document.createElement('i');
      clsIco.className = 'swi-cross';
      clsBtn.appendChild(clsIco);

      el.appendChild(bodyEl);
      el.appendChild(clsBtn);

      const dismiss = () => {
        el.classList.add('is-out');
        window.setTimeout(() => el.remove(), 400);
      };

      clsBtn.addEventListener('click', (e) => { e.stopPropagation(); dismiss(); });
      el.addEventListener('click', dismiss);
      if (duration > 0) window.setTimeout(dismiss, duration);

      box.appendChild(el);
      return el;
    }

    // API principal
    static ok(msg, dur, pos, title) { return SWAlert._show('ok', msg, title, dur, pos); }
    static err(msg, dur, pos, title) { return SWAlert._show('err', msg, title, dur, pos); }
    static ale(msg, dur, pos, title) { return SWAlert._show('ale', msg, title, dur, pos); }
    static inf(msg, dur, pos, title) { return SWAlert._show('inf', msg, title, dur, pos); }
    static drk(msg, dur, pos, title) { return SWAlert._show('drk', msg, title, dur, pos); }

    // Aliases PT-BR
    static sucesso(msg, dur, pos) { return SWAlert.ok(msg, dur, pos); }
    static erro(msg, dur, pos) { return SWAlert.err(msg, dur, pos); }
    static alerta(msg, dur, pos) { return SWAlert.ale(msg, dur, pos); }
    static info(msg, dur, pos) { return SWAlert.inf(msg, dur, pos); }

    // Caixa de confirmação — dialog modal com focus trap e ESC
    static confirmar(msg, cb, title, icon) {
      SWAlert._css();
      const ovl = document.createElement('div');
      ovl.className = 'sw-cfm-ovl';
      ovl.setAttribute('role', 'dialog');
      ovl.setAttribute('aria-modal', 'true');
      ovl.setAttribute('aria-labelledby', 'sw-cfm-ttl-' + Date.now());

      const icoClass = icon || 'swi-help-circle';

      const cfm = document.createElement('div'); cfm.className = 'sw-cfm';
      const hdr = document.createElement('div'); hdr.className = 'sw-cfm-hdr';
      const icoWrap = document.createElement('div'); icoWrap.className = 'sw-cfm-ico-wrap';
      const icoEl = document.createElement('i'); icoEl.className = icoClass;
      const ttlEl = document.createElement('div'); ttlEl.className = 'sw-cfm-ttl';
      const bdy = document.createElement('div'); bdy.className = 'sw-cfm-bdy';
      const txt = document.createElement('p'); txt.className = 'sw-cfm-txt';
      const act = document.createElement('div'); act.className = 'sw-cfm-act';
      const btnNo = document.createElement('button'); btnNo.type = 'button'; btnNo.className = 'is-no'; btnNo.textContent = 'Cancelar';
      const btnOk = document.createElement('button'); btnOk.type = 'button'; btnOk.className = 'is-ok'; btnOk.textContent = 'Confirmar';

      icoWrap.appendChild(icoEl);
      ttlEl.textContent = title || 'Confirmação';
      txt.textContent = String(msg ?? '');

      hdr.append(icoWrap, ttlEl);
      bdy.appendChild(txt);
      act.append(btnNo, btnOk);
      cfm.append(hdr, bdy, act);
      ovl.appendChild(cfm);

      document.body.appendChild(ovl);
      document.body.style.overflow = 'hidden';
      window.setTimeout(() => ovl.classList.add('is-act'), 10);

      const focusables = [btnOk, btnNo];
      const trapFocus = (e) => {
        if (e.key !== 'Tab') return;
        const idx = focusables.indexOf(document.activeElement);
        e.preventDefault();
        const next = e.shiftKey ? (idx <= 0 ? focusables.length - 1 : idx - 1) : (idx === focusables.length - 1 ? 0 : idx + 1);
        focusables[next]?.focus();
      };

      const cleanup = (res) => {
        ovl.classList.remove('is-act');
        ovl.addEventListener('transitionend', () => {
          ovl.remove();
          document.body.style.overflow = '';
          document.removeEventListener('keydown', escFn);
          document.removeEventListener('keydown', trapFocus);
          if (typeof cb === 'function') cb(res);
        }, { once: true });
      };

      btnOk.addEventListener('click', () => cleanup(true));
      btnNo.addEventListener('click', () => cleanup(false));
      ovl.addEventListener('click', (e) => { if (e.target === ovl) cleanup(false); });

      const escFn = (e) => { if (e.key === 'Escape') cleanup(false); };
      document.addEventListener('keydown', escFn);
      document.addEventListener('keydown', trapFocus);
      window.setTimeout(() => btnOk.focus(), 100);
    }

    // Inicialização por atributo — [sw-toast="ok|err|ale|inf|drk"]
    static initAll(root) {
      const scope = root || document;
      (scope.querySelectorAll ? scope.querySelectorAll('[sw-toast]') : []).forEach((btn) => {
        if (btn._swAlertBound) return;
        btn._swAlertBound = true;
        btn.addEventListener('click', () => {
          SWAlert._show(
            btn.getAttribute('sw-toast') || 'inf',
            btn.getAttribute('sw-toast-msg') || 'Mensagem',
            btn.getAttribute('sw-toast-title') || '',
            parseInt(btn.getAttribute('sw-toast-dur'), 10) || 4000,
            btn.getAttribute('sw-toast-pos') || 'tr'
          );
        });
      });
    }
  }

  window.SW?.register('SWAlert', SWAlert);
  if (window.SW) window.SW.Alert = SWAlert;
  window.SWAlert = SWAlert;
})();
