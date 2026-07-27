/* SW Framework Instagram — <div sw-instagram sw-instagram-user="..." sw-instagram-proxy="/instagram.php" sw-instagram-cols="3" sw-instagram-limit="12">
   ou modo legado: sw-instagram-urls="url1,url2" sw-instagram-mode="embed|iframe" */
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

      if (user || jsonUrl) {
        this._proxy = jsonUrl ? null : proxy;
        el.classList.add('sw-instagram-grid');
        this._showSkeletons();
        const src = jsonUrl ? jsonUrl : `${proxy}?user=${encodeURIComponent(user)}&limit=${this.limit}`;
        fetch(src)
          .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
          .then((data) => this._renderFeed(data))
          .catch(() => this._renderError());
        return;
      }

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

    _renderFeed(data) {
      if (data.error || !data.posts?.length) { this._renderError(data.error); return; }
      const posts = data.posts.slice(0, this.limit);
      let html = '<div class="sw-instagram-feed">';
      if (data.user) {
        const ig = `https://instagram.com/${data.user}`;
        const avatarSrc = this._imgUrl(data.avatar);
        html += `<div class="sw-instagram-hdr">${avatarSrc ? `<img class="sw-instagram-avatar" src="${avatarSrc}" alt="@${data.user}" loading="lazy">` : ''}<div class="sw-instagram-hdr-info"><span class="sw-instagram-uname">@${data.user}</span>${data.name && data.name !== data.user ? `<span class="sw-instagram-fullname">${esc(data.name)}</span>` : ''}${data.followers ? `<span class="sw-instagram-fol">${fmt(data.followers)} seguidores</span>` : ''}</div><a class="sw-instagram-hdr-lnk" href="${ig}" target="_blank" rel="noopener noreferrer" title="Ver no Instagram"><i class="swi swi-link-external"></i></a></div>`;
      }
      html += '<div class="sw-instagram-cards">';
      posts.forEach((p) => {
        const cap = esc(p.caption || '');
        const img = this._imgUrl(p.image || p.thumb || '');
        html += `<a class="sw-instagram-it is-card" href="${p.url}" target="_blank" rel="noopener noreferrer"><div class="sw-instagram-img"><img src="${img}" alt="${cap.substring(0, 80)}" loading="lazy" onerror="this.style.display='none'"><div class="sw-instagram-ovl">${cap ? `<p class="sw-instagram-cap">${cap}</p>` : ''}<div class="sw-instagram-stats">${p.likes ? `<span>♥ ${fmt(p.likes)}</span>` : ''}${p.comments ? `<span>💬 ${fmt(p.comments)}</span>` : ''}</div></div>${p.is_video ? '<div class="sw-instagram-vid">▶</div>' : ''}</div></a>`;
      });
      html += '</div></div>';
      this.el.innerHTML = html;
    }

    _renderError(msg = 'Não foi possível carregar o feed.') {
      this.el.innerHTML = `<p class="sw-text-mut" style="padding:1rem;grid-column:1/-1;text-align:center">${esc(msg)}</p>`;
    }

    _imgUrl(src) {
      if (!src) return '';
      if (src.startsWith('?img=') && this._proxy) return this._proxy + src;
      return src;
    }
  }

  class SWInstagram {
    static initAll(root = document) {
      SW.$('[sw-instagram]', root).forEach((el) => {
        if (el._swInstagram) return;
        el._swInstagram = new SWInstagramInst(el);
      });
    }
  }

  window.SW?.register('SWInstagram', SWInstagram);
  if (window.SW) window.SW.Instagram = SWInstagram;
})();
