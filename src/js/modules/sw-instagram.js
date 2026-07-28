/* SW Framework Instagram — Galeria de posts do Instagram
   Modos: feed via proxy PHP (automático), JSON estático, embed oficial por URL, demo local.
   Uso: <div sw-instagram sw-instagram-user="sanweb.dev"></div> */
(function () {
  'use strict';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fmt(n) {
    n = parseInt(n, 10) || 0;
    if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace('.0', '')}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}K`;
    return n;
  }
  function code(url) {
    const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
  }
  function loadEmbedScript() {
    if (window.instgrm?.Embeds) { window.instgrm.Embeds.process(); return; }
    if (window._swInstaLoading) return;
    window._swInstaLoading = true;
    const s = document.createElement('script');
    s.src = 'https://www.instagram.com/embed.js';
    s.async = true;
    document.body.appendChild(s);
  }

  // ── Dados demo para documentação ──
  const DEMO_DATA = {
    user: 'sanweb.dev',
    name: 'SanWeb • Design & Dev',
    avatar: '',
    followers: 2480,
    posts: [
      { url: 'https://www.instagram.com/p/demo1/', image: '', caption: '🚀 Novo projeto entregue! Landing page moderna com animações suaves e design responsivo. #webdesign #frontend', likes: 187, comments: 24, is_video: false },
      { url: 'https://www.instagram.com/p/demo2/', image: '', caption: '🎨 Paleta de cores do novo projeto. Cada detalhe importa no design. #uidesign #cores', likes: 312, comments: 41, is_video: false },
      { url: 'https://www.instagram.com/reel/demo3/', image: '', caption: '⚡ Antes vs Depois — redesign completo de e-commerce #antesedepois #redesign', likes: 543, comments: 67, is_video: true },
      { url: 'https://www.instagram.com/p/demo4/', image: '', caption: '📱 Mobile first, sempre. 85% do tráfego brasileiro é mobile. #mobilefirst', likes: 276, comments: 33, is_video: false },
      { url: 'https://www.instagram.com/p/demo5/', image: '', caption: '💡 Dica: contraste e hierarquia visual são mais importantes que cores bonitas. #dicadedesign', likes: 198, comments: 19, is_video: false },
      { url: 'https://www.instagram.com/reel/demo6/', image: '', caption: '🔥 Dashboard admin com dark mode. O cliente amou! #dashboard #darkmode', likes: 421, comments: 55, is_video: true },
      { url: 'https://www.instagram.com/p/demo7/', image: '', caption: '✨ Micro-interações que fazem diferença na UX #microinteracoes #ux', likes: 167, comments: 21, is_video: false },
      { url: 'https://www.instagram.com/p/demo8/', image: '', caption: '🏆 Case de sucesso: +340% de conversão com novo design #case #conversao', likes: 389, comments: 48, is_video: false },
      { url: 'https://www.instagram.com/p/demo9/', image: '', caption: '🌐 Site institucional clean e moderno. Menos é mais. #minimalismo #design', likes: 245, comments: 31, is_video: false },
    ]
  };

  // Gradientes para simular imagens no modo demo
  const DEMO_GRADIENTS = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
    'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    'linear-gradient(135deg, #f5576c 0%, #ff6a00 100%)',
  ];

  class SWInstagramInst {
    constructor(el) {
      this.el = el;
      this.cols = parseInt(el.getAttribute('sw-instagram-cols'), 10) || 3;
      this.gap = el.getAttribute('sw-instagram-gap') || '.4rem';
      this.limit = parseInt(el.getAttribute('sw-instagram-limit'), 10) || 12;
      el.style.setProperty('--sw-instagram-cols', this.cols);
      el.style.setProperty('--sw-instagram-gap', this.gap);

      const user = el.getAttribute('sw-instagram-user');
      const jsonUrl = el.getAttribute('sw-instagram-json');
      const proxy = el.getAttribute('sw-instagram-proxy') || '/dist/sw-instagram.php';
      const isDemo = el.hasAttribute('sw-instagram-demo');

      // ── Modo demo (para documentação) ──
      if (isDemo) {
        el.classList.add('sw-instagram-grid');
        const demoUser = user || DEMO_DATA.user;
        const data = { ...DEMO_DATA, user: demoUser };
        setTimeout(() => this._renderFeed(data, true), 300);
        return;
      }

      // ── Modo feed (proxy PHP ou JSON) ──
      if (user || jsonUrl) {
        this._proxy = jsonUrl ? null : proxy;
        el.classList.add('sw-instagram-grid');
        this._showSkeletons();
        const src = jsonUrl ? jsonUrl : `${proxy}?user=${encodeURIComponent(user)}&limit=${this.limit}`;
        fetch(src)
          .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
          .then((data) => this._renderFeed(data))
          .catch((e) => this._renderError(`Erro ao carregar: ${e.message}`));
        return;
      }

      // ── Modo embed (URLs individuais) ──
      this.urls = (el.getAttribute('sw-instagram-urls') || el.getAttribute('sw-instagram-url') || '').split(',').map((u) => u.trim()).filter(Boolean);
      this.mode = el.getAttribute('sw-instagram-mode') || 'embed';

      if (!this.urls.length) {
        el.innerHTML = '<p class="sw-text-mut" style="padding:1rem">Nenhuma URL configurada.</p>';
        return;
      }

      el.classList.add('sw-instagram-grid');

      if (this.mode === 'iframe') {
        el.innerHTML = this.urls.map((url) => {
          const c = code(url);
          return c ? `<div class="sw-instagram-it is-iframe"><iframe src="https://www.instagram.com/p/${c}/embed/" scrolling="no" frameborder="0" allowtransparency="true" loading="lazy" title="Post Instagram"></iframe></div>` : '';
        }).join('');
      } else {
        el.innerHTML = this.urls.map((url) => `<div class="sw-instagram-it"><blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14" style="min-width:unset!important;max-width:100%!important;width:100%!important;margin:0!important"></blockquote></div>`).join('');
        loadEmbedScript();
      }
    }

    _showSkeletons() {
      this.el.innerHTML = Array(Math.min(this.limit, 9)).fill(0).map(() => '<div class="sw-instagram-it"><div class="sw-instagram-skl"></div></div>').join('');
    }

    _renderFeed(data, isDemo = false) {
      if (data.error || !data.posts?.length) { this._renderError(data.error); return; }
      const posts = data.posts.slice(0, this.limit);
      let html = '<div class="sw-instagram-feed">';
      if (data.user) {
        const ig = `https://instagram.com/${data.user}`;
        const avatarSrc = isDemo ? '' : this._imgUrl(data.avatar);
        const avatarEl = avatarSrc
          ? `<img class="sw-instagram-avatar" src="${avatarSrc}" alt="@${data.user}" loading="lazy">`
          : `<div class="sw-instagram-avatar" style="display:flex;align-items:center;justify-content:center;color:#fff;font-size:2rem;font-weight:700">${data.user.charAt(0).toUpperCase()}</div>`;
        html += `<div class="sw-instagram-hdr">${avatarEl}<div class="sw-instagram-hdr-info"><span class="sw-instagram-uname">@${data.user}</span>${data.name && data.name !== data.user ? `<span class="sw-instagram-fullname">${esc(data.name)}</span>` : ''}${data.followers ? `<span class="sw-instagram-fol">${fmt(data.followers)} seguidores</span>` : ''}</div><a class="sw-instagram-hdr-lnk" href="${ig}" target="_blank" rel="noopener noreferrer" title="Ver no Instagram">↗</a></div>`;
      }
      html += '<div class="sw-instagram-cards">';
      posts.forEach((p, i) => {
        const cap = esc(p.caption || '');
        const img = isDemo ? '' : this._imgUrl(p.image || p.thumb || '');
        const imgEl = img
          ? `<img src="${img}" alt="${cap.substring(0, 80)}" loading="lazy" onerror="this.style.display='none'">`
          : `<div style="width:100%;height:100%;${isDemo ? `background:${DEMO_GRADIENTS[i % DEMO_GRADIENTS.length]};` : 'background:var(--sw-bg-sec,#16161a);'}display:flex;align-items:center;justify-content:center"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg></div>`;
        html += `<a class="sw-instagram-it is-card" href="${p.url}" target="_blank" rel="noopener noreferrer"><div class="sw-instagram-img">${imgEl}<div class="sw-instagram-ovl">${cap ? `<p class="sw-instagram-cap">${cap}</p>` : ''}<div class="sw-instagram-stats">${p.likes ? `<span>♥ ${fmt(p.likes)}</span>` : ''}${p.comments ? `<span>💬 ${fmt(p.comments)}</span>` : ''}</div></div>${p.is_video ? '<div class="sw-instagram-vid">▶</div>' : ''}</div></a>`;
      });
      html += '</div></div>';
      this.el.innerHTML = html;
    }

    _renderError(msg = 'Não foi possível carregar o feed.') {
      this.el.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3.2rem 1.6rem;background:var(--sw-bg-sec,#16161a);border-radius:var(--sw-r-g,8px);border:1px dashed var(--sw-bor,#2a2a32)"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--sw-txt-mut,#94a3b8)" stroke-width="1.5" style="margin-bottom:.8rem"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><line x1="21.5" y1="2.5" x2="2.5" y2="21.5" stroke-dasharray="3 2"/></svg><p style="color:var(--sw-txt-mut,#94a3b8);margin:0;font-size:1.3rem">${esc(msg)}</p><p style="color:var(--sw-txt-mut,#64748b);margin:.6rem 0 0;font-size:1.15rem">Verifique se <code>sw-instagram.php</code> está acessível no servidor.</p></div>`;
    }

    _imgUrl(src) {
      if (!src) return '';
      if (src.startsWith('?img=') && this._proxy) return this._proxy + src;
      return src;
    }
  }

  class SWInstagram {
    static initAll(root = document) {
      (root.querySelectorAll ? root : document).querySelectorAll('[sw-instagram]').forEach((el) => {
        if (el._swInstagram) return;
        el._swInstagram = new SWInstagramInst(el);
      });
    }
  }

  // Exportação global
  window.SWInstagram = SWInstagram;
  if (window.SW?.register) window.SW.register('SWInstagram', SWInstagram);
  if (window.SW) window.SW.Instagram = SWInstagram;
})();
