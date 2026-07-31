/**
 * SW Framework Documentation Header Component
 * Sandro Web Solutions | Nill Ecosystem
 */
(function () {
  'use strict';

  function initHeader() {
    // Caminho absoluto — ver sidebar.js para o motivo (evita duplicar "pages/pages/"
    // depois que a navegação via AJAX troca a URL com pushState). Calculado a partir
    // de "/pages/" no caminho atual em vez de assumir "/docs/" fixo: funciona tanto
    // servido com o servidor Node de teste (.../docs/pages/x.html) quanto pelo Apache,
    // onde "docs/" já é a raiz do site (.../pages/x.html, sem o segmento "docs").
    const path = window.location.pathname;
    const pagesIndex = path.indexOf('/pages/');
    const root = pagesIndex !== -1 ? path.slice(0, pagesIndex + 1) : (path.slice(0, path.lastIndexOf('/') + 1) || '/');

    const headerHtml = `
      <nav class="docs-nav" aria-label="Documentação principal" style="display:flex; align-items:center; justify-space-between; width:100%;">
        <div style="display:flex; align-items:center; gap:1.6rem;">
          <button class="menu-toggle" id="doc-menu-btn" aria-label="Alternar Menu Lateral">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>

          <a href="${root}index.html" class="doc-brand-title" style="display:flex; align-items:center; gap:1rem; text-decoration:none; color:var(--sw-txt-bas);">
            <img src="${root}images/logo.png" alt="SW Framework" style="height:3.2rem; width:auto; object-fit:contain;">
            <span style="font-family:'Outfit',sans-serif; font-weight:800; font-size:1.6rem;">SW Framework Docs</span>
          </a>
        </div>

        <div style="display:flex; align-items:center; gap:1.6rem;">
          <span class="bp-badge" style="font-size:1.1rem;">
            v1.0.0
          </span>
          <button class="d-col" id="doc-theme-btn" type="button" aria-label="Alternar Tema Claro/Escuro" style="padding:0.6rem 1.4rem; display:inline-flex; align-items:center; gap:0.6rem; font-size:1.2rem; cursor:pointer;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            <span>Tema</span>
          </button>
        </div>
      </nav>
    `;

    if (!document.querySelector('link[rel~="icon"]')) {
      const favicon = document.createElement('link');
      favicon.rel = 'icon';
      favicon.type = 'image/png';
      favicon.href = `${root}images/logo.png`;
      document.head.appendChild(favicon);
    }

    let top = document.querySelector('.doc-top');
    if (!top) {
      top = document.createElement('header');
      top.className = 'doc-top';
      document.body.insertBefore(top, document.body.firstChild);
    }
    top.innerHTML = headerHtml;

    let backdrop = document.querySelector('.doc-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'doc-backdrop';
      document.body.appendChild(backdrop);
    }

    const menuBtn = document.getElementById('doc-menu-btn');
    const toggleMenu = () => {
      const aside = document.querySelector('.doc-aside');
      const active = aside?.classList.toggle('is-active');
      backdrop?.classList.toggle('is-active', active);
    };

    menuBtn?.addEventListener('click', toggleMenu);
    backdrop?.addEventListener('click', toggleMenu);

    const themeBtn = document.getElementById('doc-theme-btn');
    themeBtn?.addEventListener('click', () => {
      if (window.SW && window.SW.Day) {
        window.SW.Day.toggle();
      } else {
        const current = document.documentElement.getAttribute('sw-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('sw-theme', next);
        try { window.localStorage.setItem('sw-theme', next); } catch (_) {}
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
  } else {
    initHeader();
  }
})();
