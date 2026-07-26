/**
 * SW Framework Documentation Sidebar & Dynamic Content Swap Component
 * Sandro Web Solutions | Nill Ecosystem
 */
(function () {
  'use strict';

  function initSidebar() {
    // Caminho absoluto (não relativo) — a navegação troca a URL via pushState sem
    // recarregar a página, então um href relativo passaria a ser resolvido a partir
    // da nova URL a cada clique, duplicando segmentos como "pages/pages/". Calculado
    // a partir de "/pages/" no caminho atual em vez de assumir "/docs/" fixo: funciona
    // tanto no servidor Node de teste (.../docs/pages/x.html) quanto no Apache, onde
    // "docs/" já é a raiz do site (.../pages/x.html, sem o segmento "docs").
    const path = window.location.pathname;
    const pagesIndex = path.indexOf('/pages/');
    const root = pagesIndex !== -1 ? path.slice(0, pagesIndex + 1) : (path.slice(0, path.lastIndexOf('/') + 1) || '/');
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    const iconPaths = {
      dash: "Hardware/dashboard-one",
      cfg: "Base/setting-config",
      grid: "Edit/grid-four",
      color: "Operate/color-filter",
      font: "Edit/font-size",
      space: "Measurement/ruler",
      btn: "Operate/click",
      badge: "Abstract/badge",
      card: "Money/bank-card-one",
      tbl: "Office/excel",
      form: "Office/clipboard",
      tool: "Base/tool",
      modal: "Build/application",
      panel: "Edit/layout-four",
      lbx: "Edit/picture-one",
      motion: "Arrows/play-once",
      trans: "Arrows/switch",
      fx: "Edit/flashlamp",
      layers: "Edit/layers",
      sun: "Weather/sun",
      avt: "Peoples/user",
      chip: "Base/tag",
      brc: "Arrows/arrow-right",
      div: "Character/minus",
      prg: "Base/loading",
      skl: "Abstract/round-mask",
      stp: "Charts/ranking-list",
      tml: "Time/big-clock",
      prog: "Abstract/circular-connection",
      alert: "Safe/alarm"
    };

    const sidebarHtml = `
      <div class="sidebar-identity">
        <a href="${root}index.html" class="sidebar-logo" data-doc-link>
          <img src="${root}images/logo.png" alt="SW Framework" class="sidebar-brand-mark">
          <span class="sidebar-brand-title">
            Framework
            <small>v0.1.0-alpha.1</small>
          </span>
        </a>
      </div>

      <!-- INÍCIO -->
      <div class="nav-group is-open" data-group="ini">
        <div class="nav-group-title">INÍCIO <span>▼</span></div>
        <div class="nav-group-content">
          <a href="${root}index.html" class="nav-it ${currentPath === 'index.html' ? 'is-active is-act' : ''}" data-doc-link data-page="index">
            <span sw-icon="${iconPaths.dash}"></span> <span>Dashboard</span>
          </a>
          <a href="${root}pages/componentes.html" class="nav-it ${currentPath === 'componentes.html' ? 'is-active is-act' : ''}" data-doc-link data-page="componentes">
            <span sw-icon="${iconPaths.layers}"></span> <span>Componentes</span>
          </a>
          <a href="${root}pages/config.html" class="nav-it ${currentPath === 'config.html' ? 'is-active is-act' : ''}" data-doc-link data-page="config">
            <span sw-icon="${iconPaths.cfg}"></span> <span>Configuração</span>
          </a>
        </div>
      </div>

      <!-- FOUNDATION -->
      <div class="nav-group is-open" data-group="fou">
        <div class="nav-group-title">FOUNDATION <span>▼</span></div>
        <div class="nav-group-content">
          <a href="${root}pages/layout_grid.html" class="nav-it ${currentPath === 'layout_grid.html' ? 'is-active is-act' : ''}" data-doc-link data-page="layout_grid">
            <span sw-icon="${iconPaths.grid}"></span> <span>Layout & Grid</span>
          </a>
          <a href="${root}pages/cores.html" class="nav-it ${currentPath === 'cores.html' ? 'is-active is-act' : ''}" data-doc-link data-page="cores">
            <span sw-icon="${iconPaths.color}"></span> <span>Cores HSL</span>
          </a>
          <a href="${root}pages/tipografia.html" class="nav-it ${currentPath === 'tipografia.html' ? 'is-active is-act' : ''}" data-doc-link data-page="tipografia">
            <span sw-icon="${iconPaths.font}"></span> <span>Tipografia</span>
          </a>
          <a href="${root}pages/espacamento.html" class="nav-it ${currentPath === 'espacamento.html' ? 'is-active is-act' : ''}" data-doc-link data-page="espacamento">
            <span sw-icon="${iconPaths.space}"></span> <span>Espaçamento</span>
          </a>
        </div>
      </div>

      <!-- COMPONENTES & ELEMENTOS SW -->
      <div class="nav-group is-open" data-group="com">
        <div class="nav-group-title">COMPONENTES SW <span>▼</span></div>
        <div class="nav-group-content">
          <a href="${root}pages/btn.html" class="nav-it ${currentPath === 'btn.html' ? 'is-active is-act' : ''}" data-doc-link data-page="btn">
            <span sw-icon="${iconPaths.btn}"></span> <span>Botões</span>
          </a>
          <a href="${root}pages/badge.html" class="nav-it ${currentPath === 'badge.html' ? 'is-active is-act' : ''}" data-doc-link data-page="badge">
            <span sw-icon="${iconPaths.badge}"></span> <span>Badges</span>
          </a>
          <a href="${root}pages/cards.html" class="nav-it ${currentPath === 'cards.html' ? 'is-active is-act' : ''}" data-doc-link data-page="cards">
            <span sw-icon="${iconPaths.card}"></span> <span>Cards & Painéis</span>
          </a>
          <a href="${root}pages/tabela.html" class="nav-it ${currentPath === 'tabela.html' ? 'is-active is-act' : ''}" data-doc-link data-page="tabela">
            <span sw-icon="${iconPaths.tbl}"></span> <span>Tabela</span>
          </a>
          <a href="${root}pages/avatar.html" class="nav-it ${currentPath === 'avatar.html' ? 'is-active is-act' : ''}" data-doc-link data-page="avatar">
            <span sw-icon="${iconPaths.avt}"></span> <span>Avatar</span>
          </a>
          <a href="${root}pages/chip.html" class="nav-it ${currentPath === 'chip.html' ? 'is-active is-act' : ''}" data-doc-link data-page="chip">
            <span sw-icon="${iconPaths.chip}"></span> <span>Chip</span>
          </a>
          <a href="${root}pages/breadcrumb.html" class="nav-it ${currentPath === 'breadcrumb.html' ? 'is-active is-act' : ''}" data-doc-link data-page="breadcrumb">
            <span sw-icon="${iconPaths.brc}"></span> <span>Breadcrumb</span>
          </a>
          <a href="${root}pages/divider.html" class="nav-it ${currentPath === 'divider.html' ? 'is-active is-act' : ''}" data-doc-link data-page="divider">
            <span sw-icon="${iconPaths.div}"></span> <span>Divider</span>
          </a>
          <a href="${root}pages/progress.html" class="nav-it ${currentPath === 'progress.html' ? 'is-active is-act' : ''}" data-doc-link data-page="progress">
            <span sw-icon="${iconPaths.prg}"></span> <span>Progress</span>
          </a>
          <a href="${root}pages/skeleton.html" class="nav-it ${currentPath === 'skeleton.html' ? 'is-active is-act' : ''}" data-doc-link data-page="skeleton">
            <span sw-icon="${iconPaths.skl}"></span> <span>Skeleton</span>
          </a>
          <a href="${root}pages/stepper.html" class="nav-it ${currentPath === 'stepper.html' ? 'is-active is-act' : ''}" data-doc-link data-page="stepper">
            <span sw-icon="${iconPaths.stp}"></span> <span>Stepper</span>
          </a>
          <a href="${root}pages/timeline.html" class="nav-it ${currentPath === 'timeline.html' ? 'is-active is-act' : ''}" data-doc-link data-page="timeline">
            <span sw-icon="${iconPaths.tml}"></span> <span>Timeline</span>
          </a>
          <a href="${root}pages/forms.html" class="nav-it ${currentPath === 'forms.html' ? 'is-active is-act' : ''}" data-doc-link data-page="forms">
            <span sw-icon="${iconPaths.form}"></span> <span>Formulários</span>
          </a>
          <a href="${root}pages/utilitarios.html" class="nav-it ${currentPath === 'utilitarios.html' ? 'is-active is-act' : ''}" data-doc-link data-page="utilitarios">
            <span sw-icon="${iconPaths.tool}"></span> <span>Utilitários CSS</span>
          </a>
          <a href="${root}pages/icones.html" class="nav-it ${currentPath === 'icones.html' ? 'is-active is-act' : ''}" data-doc-link data-page="icones">
            <span sw-icon="${iconPaths.badge}"></span> <span>Ícones</span>
          </a>
        </div>
      </div>

      <!-- INTERFACE JS -->
      <div class="nav-group is-open" data-group="ljs">
        <div class="nav-group-title">INTERFACE JS <span>▼</span></div>
        <div class="nav-group-content">
          <a href="${root}pages/modal.html" class="nav-it ${currentPath === 'modal.html' ? 'is-active is-act' : ''}" data-doc-link data-page="modal">
            <span sw-icon="${iconPaths.modal}"></span> <span>Modal Acessível</span>
          </a>
          <a href="${root}pages/panel.html" class="nav-it ${currentPath === 'panel.html' ? 'is-active is-act' : ''}" data-doc-link data-page="panel">
            <span sw-icon="${iconPaths.panel}"></span> <span>Panel (Drawer)</span>
          </a>
          <a href="${root}pages/lightbox.html" class="nav-it ${currentPath === 'lightbox.html' ? 'is-active is-act' : ''}" data-doc-link data-page="lightbox">
            <span sw-icon="${iconPaths.lbx}"></span> <span>Lightbox</span>
          </a>
          <a href="${root}pages/select.html" class="nav-it ${currentPath === 'select.html' ? 'is-active is-act' : ''}" data-doc-link data-page="select">
            <span sw-icon="${iconPaths.form}"></span> <span>Select</span>
          </a>
        </div>
      </div>

      <!-- ANIMAÇÕES & MOTION -->
      <div class="nav-group is-open" data-group="fx">
        <div class="nav-group-title">ANIMAÇÕES & SW-FX <span>▼</span></div>
        <div class="nav-group-content">
          <a href="${root}pages/animacoes.html" class="nav-it ${currentPath === 'animacoes.html' ? 'is-active is-act' : ''}" data-doc-link data-page="animacoes">
            <span sw-icon="${iconPaths.motion}"></span> <span>40 Presets Motion</span>
          </a>
          <a href="${root}pages/transitions.html" class="nav-it ${currentPath === 'transitions.html' ? 'is-active is-act' : ''}" data-doc-link data-page="transitions">
            <span sw-icon="${iconPaths.trans}"></span> <span>Transições MPA & Morphing</span>
          </a>
          <a href="${root}pages/sw-fx.html" class="nav-it ${currentPath === 'sw-fx.html' ? 'is-active is-act' : ''}" data-doc-link data-page="sw-fx">
            <span sw-icon="${iconPaths.fx}"></span> <span>SW-FX Avançado</span>
          </a>
        </div>
      </div>

      <!-- SW MÓDULOS -->
      <div class="nav-group is-open" data-group="mod">
        <div class="nav-group-title">SW MÓDULOS <span>▼</span></div>
        <div class="nav-group-content">
          <a href="${root}pages/swcode.html" class="nav-it ${currentPath === 'swcode.html' ? 'is-active is-act' : ''}" data-doc-link data-page="swcode">
            <span sw-icon="${iconPaths.tool}"></span> <span>SWCode (Syntax)</span>
          </a>
          <a href="${root}pages/swday.html" class="nav-it ${currentPath === 'swday.html' ? 'is-active is-act' : ''}" data-doc-link data-page="swday">
            <span sw-icon="${iconPaths.sun}"></span> <span>SWDay (Tema)</span>
          </a>
          <a href="${root}pages/swajax.html" class="nav-it ${currentPath === 'swajax.html' ? 'is-active is-act' : ''}" data-doc-link data-page="swajax">
            <span sw-icon="${iconPaths.prog}"></span> <span>SWAjax</span>
          </a>
          <a href="${root}pages/swalert.html" class="nav-it ${currentPath === 'swalert.html' ? 'is-active is-act' : ''}" data-doc-link data-page="swalert">
            <span sw-icon="${iconPaths.alert}"></span> <span>SWAlert</span>
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
    window.SW?.Icon?.initAll(aside);

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

        // Páginas individuais costumam ter <style> próprio no <head> (ex.: componentes.html,
        // btn.html, tipografia.html) — a troca via AJAX só substitui o <main>, então sem isto
        // o CSS da página só aparecia depois de um F5 (recarga completa do <head>).
        const newStyles = Array.from(doc.head.querySelectorAll('style'));

        // Algumas páginas (ex.: cores.html) montam o próprio conteúdo via <script> inline,
        // muitas vezes fora do <main>. Um <script> inserido via innerHTML fica inerte —
        // sem isto, a troca via AJAX carregava a página sem o conteúdo gerado por JS.
        // Exclui <script type="text/plain"> — usado pelo SWCode pra guardar amostras de
        // código como texto inerte (não são JS de verdade e quebrariam ao ser executados).
        const executableTypes = new Set(['', 'text/javascript', 'application/javascript', 'module']);
        const newScripts = Array.from(doc.querySelectorAll('script:not([src])'))
          .filter((script) => executableTypes.has(script.type));

        const updateDom = () => {
          document.head.querySelectorAll('style[data-doc-page-style]').forEach((el) => el.remove());
          newStyles.forEach((style) => {
            const clone = style.cloneNode(true);
            clone.setAttribute('data-doc-page-style', '');
            document.head.appendChild(clone);
          });

          main.innerHTML = newMain.innerHTML;
          document.title = title;

          // Re-initialize SW modules on new content
          if (window.SW) {
            if (typeof window.SW.initAll === 'function') window.SW.initAll(main);
            if (typeof window.SW.init === 'function') window.SW.init(main);
            if (window.SW.Code && typeof window.SW.Code.initAll === 'function') window.SW.Code.initAll(main);
            if (window.SW.Fx && typeof window.SW.Fx.reset === 'function') window.SW.Fx.reset(main);
            if (window.SW.Icon && typeof window.SW.Icon.initAll === 'function') window.SW.Icon.initAll(main);
          }

          newScripts.forEach((script) => {
            const clone = document.createElement('script');
            clone.textContent = script.textContent;
            document.body.appendChild(clone);
            clone.remove();
          });
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
