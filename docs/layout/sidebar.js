/**
 * SW Framework Documentation Sidebar & Dynamic Content Swap Component
 * Sandro Web Solutions | Nill Ecosystem
 */
(function () {
  'use strict';

  function initSidebar() {
    const isPage = window.location.pathname.includes('/pages/');
    const root = isPage ? '../' : '';
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    const icons = {
      dash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
      cfg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
      grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
      color: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 0 0 20z"/></svg>`,
      font: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>`,
      space: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 3H3v18h18z"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>`,
      btn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="8" rx="4"/></svg>`,
      badge: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
      prog: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`,
      skel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10"/><path d="M7 12h6"/></svg>`,
      card: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
      tbl: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>`,
      form: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
      tool: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
      modal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>`,
      panel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/></svg>`,
      alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
      lbx: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
      motion: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
      trans: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>`,
      fx: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
      layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
      sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
    };

    const sidebarHtml = `
      <div class="sidebar-identity">
        <a href="${root}index.html" class="sidebar-logo" data-doc-link>
          <span class="sidebar-brand-mark">SW</span>
          <span class="sidebar-brand-title">
            SW Framework
            <small>v0.1.0-alpha.1</small>
          </span>
        </a>
      </div>

      <!-- INÍCIO -->
      <div class="nav-group is-open" data-group="ini">
        <div class="nav-group-title">INÍCIO <span>▼</span></div>
        <div class="nav-group-content">
          <a href="${root}index.html" class="nav-it ${currentPath === 'index.html' ? 'is-active is-act' : ''}" data-doc-link data-page="index">
            ${icons.dash} <span>Dashboard</span>
          </a>
          <a href="${root}pages/componentes.html" class="nav-it ${currentPath === 'componentes.html' ? 'is-active is-act' : ''}" data-doc-link data-page="componentes">
            ${icons.layers} <span>Componentes</span>
          </a>
          <a href="${root}pages/config.html" class="nav-it ${currentPath === 'config.html' ? 'is-active is-act' : ''}" data-doc-link data-page="config">
            ${icons.cfg} <span>Configuração</span>
          </a>
        </div>
      </div>

      <!-- FOUNDATION -->
      <div class="nav-group is-open" data-group="fou">
        <div class="nav-group-title">FOUNDATION <span>▼</span></div>
        <div class="nav-group-content">
          <a href="${root}pages/layout_grid.html" class="nav-it ${currentPath === 'layout_grid.html' ? 'is-active is-act' : ''}" data-doc-link data-page="layout_grid">
            ${icons.grid} <span>Layout & Grid</span>
          </a>
          <a href="${root}pages/cores.html" class="nav-it ${currentPath === 'cores.html' ? 'is-active is-act' : ''}" data-doc-link data-page="cores">
            ${icons.color} <span>Cores HSL</span>
          </a>
          <a href="${root}pages/tipografia.html" class="nav-it ${currentPath === 'tipografia.html' ? 'is-active is-act' : ''}" data-doc-link data-page="tipografia">
            ${icons.font} <span>Tipografia</span>
          </a>
          <a href="${root}pages/espacamento.html" class="nav-it ${currentPath === 'espacamento.html' ? 'is-active is-act' : ''}" data-doc-link data-page="espacamento">
            ${icons.space} <span>Espaçamento</span>
          </a>
        </div>
      </div>

      <!-- COMPONENTES & ELEMENTOS SW -->
      <div class="nav-group is-open" data-group="com">
        <div class="nav-group-title">COMPONENTES SW <span>▼</span></div>
        <div class="nav-group-content">
          <a href="${root}pages/btn.html" class="nav-it ${currentPath === 'btn.html' ? 'is-active is-act' : ''}" data-doc-link data-page="btn">
            ${icons.btn} <span>Botões</span>
          </a>
          <a href="${root}pages/badge.html" class="nav-it ${currentPath === 'badge.html' ? 'is-active is-act' : ''}" data-doc-link data-page="badge">
            ${icons.badge} <span>Badges</span>
          </a>
          <a href="${root}pages/cards.html" class="nav-it ${currentPath === 'cards.html' ? 'is-active is-act' : ''}" data-doc-link data-page="cards">
            ${icons.card} <span>Cards & Painéis</span>
          </a>
          <a href="${root}pages/tabela.html" class="nav-it ${currentPath === 'tabela.html' ? 'is-active is-act' : ''}" data-doc-link data-page="tabela">
            ${icons.tbl} <span>Tabela</span>
          </a>
          <a href="${root}pages/forms.html" class="nav-it ${currentPath === 'forms.html' ? 'is-active is-act' : ''}" data-doc-link data-page="forms">
            ${icons.form} <span>Formulários</span>
          </a>
          <a href="${root}pages/utilitarios.html" class="nav-it ${currentPath === 'utilitarios.html' ? 'is-active is-act' : ''}" data-doc-link data-page="utilitarios">
            ${icons.tool} <span>Utilitários CSS</span>
          </a>
          <a href="${root}pages/icones.html" class="nav-it ${currentPath === 'icones.html' ? 'is-active is-act' : ''}" data-doc-link data-page="icones">
            ${icons.badge} <span>Ícones</span>
          </a>
        </div>
      </div>

      <!-- INTERFACE JS -->
      <div class="nav-group is-open" data-group="ljs">
        <div class="nav-group-title">INTERFACE JS <span>▼</span></div>
        <div class="nav-group-content">
          <a href="${root}pages/modal.html" class="nav-it ${currentPath === 'modal.html' ? 'is-active is-act' : ''}" data-doc-link data-page="modal">
            ${icons.modal} <span>Modal Acessível</span>
          </a>
          <a href="${root}pages/panel.html" class="nav-it ${currentPath === 'panel.html' ? 'is-active is-act' : ''}" data-doc-link data-page="panel">
            ${icons.panel} <span>Panel (Drawer)</span>
          </a>
          <a href="${root}pages/lightbox.html" class="nav-it ${currentPath === 'lightbox.html' ? 'is-active is-act' : ''}" data-doc-link data-page="lightbox">
            ${icons.lbx} <span>Lightbox</span>
          </a>
          <a href="${root}pages/select.html" class="nav-it ${currentPath === 'select.html' ? 'is-active is-act' : ''}" data-doc-link data-page="select">
            ${icons.form} <span>Select</span>
          </a>
        </div>
      </div>

      <!-- ANIMAÇÕES & MOTION -->
      <div class="nav-group is-open" data-group="fx">
        <div class="nav-group-title">ANIMAÇÕES & SW-FX <span>▼</span></div>
        <div class="nav-group-content">
          <a href="${root}pages/animacoes.html" class="nav-it ${currentPath === 'animacoes.html' ? 'is-active is-act' : ''}" data-doc-link data-page="animacoes">
            ${icons.motion} <span>40 Presets Motion</span>
          </a>
          <a href="${root}pages/transitions.html" class="nav-it ${currentPath === 'transitions.html' ? 'is-active is-act' : ''}" data-doc-link data-page="transitions">
            ${icons.trans} <span>Transições MPA & Morphing</span>
          </a>
          <a href="${root}pages/sw-fx.html" class="nav-it ${currentPath === 'sw-fx.html' ? 'is-active is-act' : ''}" data-doc-link data-page="sw-fx">
            ${icons.fx} <span>SW-FX Avançado</span>
          </a>
        </div>
      </div>

      <!-- SW MÓDULOS -->
      <div class="nav-group is-open" data-group="mod">
        <div class="nav-group-title">SW MÓDULOS <span>▼</span></div>
        <div class="nav-group-content">
          <a href="${root}pages/swcode.html" class="nav-it ${currentPath === 'swcode.html' ? 'is-active is-act' : ''}" data-doc-link data-page="swcode">
            ${icons.tool} <span>SWCode (Syntax)</span>
          </a>
          <a href="${root}pages/swday.html" class="nav-it ${currentPath === 'swday.html' ? 'is-active is-act' : ''}" data-doc-link data-page="swday">
            ${icons.sun} <span>SWDay (Tema)</span>
          </a>
          <a href="${root}pages/swajax.html" class="nav-it ${currentPath === 'swajax.html' ? 'is-active is-act' : ''}" data-doc-link data-page="swajax">
            ${icons.prog} <span>SWAjax</span>
          </a>
          <a href="${root}pages/swalert.html" class="nav-it ${currentPath === 'swalert.html' ? 'is-active is-act' : ''}" data-doc-link data-page="swalert">
            ${icons.alert} <span>SWAlert</span>
          </a>
        </div>
      </div>
    `;

    let aside = document.querySelector('.doc-aside');
    if (!aside) {
      aside = document.createElement('aside');
      aside.className = 'doc-aside';
      const shell = document.querySelector('.doc-shell') || document.body;
      shell.insertBefore(aside, shell.firstChild);
    }
    aside.innerHTML = sidebarHtml;

    // Accordion toggle
    aside.querySelectorAll('.nav-group-title').forEach((title) => {
      title.addEventListener('click', (e) => {
        e.preventDefault();
        const group = title.parentElement;
        group.classList.toggle('is-open');
      });
    });

    // Content swapping via fetch AJAX with fallback to standard navigation
    async function loadDocPage(url, pushState = true) {
      const main = document.querySelector('.doc-main');
      if (!main) {
        window.location.href = url;
        return;
      }

      try {
        const response = await fetch(url);
        if (!response.ok) {
          window.location.href = url;
          return;
        }
        const htmlText = await response.text();
        const doc = new DOMParser().parseFromString(htmlText, 'text/html');
        const newMain = doc.querySelector('.doc-main');
        if (!newMain) {
          window.location.href = url;
          return;
        }

        const title = doc.title || document.title;

        const updateDom = () => {
          main.innerHTML = newMain.innerHTML;
          document.title = title;

          // Re-initialize SW modules on new content
          if (window.SW) {
            if (typeof window.SW.initAll === 'function') window.SW.initAll(main);
            if (typeof window.SW.init === 'function') window.SW.init(main);
            if (window.SW.Code && typeof window.SW.Code.initAll === 'function') window.SW.Code.initAll(main);
            if (window.SW.Fx && typeof window.SW.Fx.reset === 'function') window.SW.Fx.reset(main);
          }
        };

        if (window.SW && window.SW.Trans && typeof window.SW.Trans.run === 'function') {
          window.SW.Trans.run(updateDom);
        } else {
          updateDom();
        }

        if (pushState) {
          history.pushState({ url }, '', url);
        }

        // Update sidebar active state
        const newPath = url.split('/').pop() || 'index.html';
        aside.querySelectorAll('.nav-it').forEach((item) => {
          const itemHref = item.getAttribute('href') || '';
          const itemPath = itemHref.split('/').pop();
          if (itemPath === newPath) {
            item.classList.add('is-active', 'is-act');
          } else {
            item.classList.remove('is-active', 'is-act');
          }
        });

        window.scrollTo({ top: 0, behavior: 'instant' });

        // Close mobile drawer if open
        const backdrop = document.querySelector('.doc-backdrop');
        aside.classList.remove('is-active');
        backdrop?.classList.remove('is-active');

      } catch (err) {
        window.location.href = url;
      }
    }

    // Intercept clicks on documentation links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('.doc-aside a[href], a[data-doc-link]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('javascript:')) {
        return;
      }

      if (href.endsWith('.html') || href.includes('.html#')) {
        e.preventDefault();
        loadDocPage(href, true);
      }
    });

    window.addEventListener('popstate', (e) => {
      if (e.state?.url) {
        loadDocPage(e.state.url, false);
      } else {
        loadDocPage(window.location.href, false);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebar);
  } else {
    initSidebar();
  }
})();
