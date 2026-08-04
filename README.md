# SW Framework

**Framework web nativo, modular e sem dependências — CSS + JS puros, recursos modernos da plataforma (View Transitions API, Navigation API, IntersectionObserver) com fallback seguro para quem não suporta.**

**🔗 Documentação ao vivo e catálogo interativo: [sw.sanweb.com.br](https://sw.sanweb.com.br)**

> ✅ **Status: `1.0.0`.** Testado (18 testes unitários + 65 testes de navegador em Chromium/Firefox/WebKit). Este README descreve honestamente o que já funciona e o que está pendente — nada aqui promete mais do que o código realmente entrega.

---

## Por que o SW existe

Depois de três anos evoluindo projetos separados (Ydra, Y2, Smooll, FXCore, laboratório de View Transitions), o SW Framework unifica tudo num único repositório mestre: **zero dependências de runtime, JavaScript vanilla, CSS modular com tokens HSL, e melhorias progressivas nativas** em vez de reimplementar o que o navegador já oferece.

## Recursos

- **CSS modular** (`01-tokens` → `15-sw2-navbar`) — `sw.min.css` reúne núcleo + efeitos + transições num arquivo só, ~365KB minificado. Customização inteira do tema via variáveis CSS (`--sw-h-pri`, `--sw-pri`, `--sw-bg`, etc.) — mudar a hue primária recalcula botões, cards, navbars, badges e sombras automaticamente.
- **Grid atômico de 12 colunas**, mobile-first, sem `!important`.
- **56 presets de motion** catalogados: 15 entradas, 7 reveals de scroll, 11 loops, 9 microinterações de hover, 14 presets de scroll mount/unmount — todos respeitando `prefers-reduced-motion`.
- **`SW-Core`** — orquestrador com `MutationObserver`, reinicialização agrupada por frame, registro de módulos e `SW.config()`.
- **`SW-Day`** — alternância de tema claro/escuro persistida em `localStorage`, presente em toda página.
- **`SW-Trans`** — transições de página nativas via View Transitions API (SPA e MPA), morphing declarativo, scroll reveal via `IntersectionObserver`, overlay de carregamento opcional. Homologado em Chromium, Firefox e WebKit (ver limites abaixo).
- **`SW-AJAX`** — trocas dinâmicas de conteúdo restritas à mesma origem por padrão, com timeout, validação e sanitização de fragmentos (proteção contra XSS).
- **`SW-FX`** — 7 efeitos nativos sem GSAP: scramble, typewriter, split text (palavras/caracteres), scroll scrub, marquee, tilt 3D e magnetismo. Todos desligam automaticamente com `prefers-reduced-motion` e em ponteiros touch (quando aplicável).
- **Componentes de UI**: modal, alerta/toast, painel (drawer), lightbox, tabela pesquisável/ordenável por teclado, `<select>` e validação de formulário como melhoria progressiva de controles nativos, máscaras de entrada (CPF, CNPJ, telefone, CEP, data — formatação apenas, não substitui validação de domínio no backend).
- **`SWCode`** — realce de sintaxe zero-dependência (JS/TS, CSS, HTML, JSON, PHP, Bash), 5 temas, numeração de linha, copiar em 1 clique. **Já homologado.**

## Instalação

### Opção 1: Via npm (Front-End)
```bash
npm install @sanweb/sw-framework
```
```html
<link rel="stylesheet" href="node_modules/@sanweb/sw-framework/dist/sw.min.css">
<script src="node_modules/@sanweb/sw-framework/dist/sw.min.js" defer></script>
```

### Opção 2: Via Link Direto / CDN
```html
<link rel="stylesheet" href="https://sw.sanweb.com.br/dist/sw.min.css">
<script src="https://sw.sanweb.com.br/dist/sw.min.js" defer></script>
```

### Opção 3: SWMVC Starter Kit (Full-Stack PHP 8.3 + MySQL)
Para utilizar o framework completo com Back-End PHP, Painel Admin, RBAC e Banco de Dados:
- **Download Direto (.ZIP)**: [sw.sanweb.com.br/dist/swmvc-starter-kit.zip](https://sw.sanweb.com.br/dist/swmvc-starter-kit.zip)
- **Documentação SWMVC**: [sw.sanweb.com.br/pages/swmvc.html](https://sw.sanweb.com.br/pages/swmvc.html)
```bash
# Executar instalador automatizado CLI
php install.php
```

## Uso rápido

```html
<button class="sw-btn sw-btn-outline" sw-modal="#exemplo">Abrir modal</button>

<div id="exemplo" class="sw-modal">
  <h2>Título</h2>
  <p>Conteúdo do modal — foco e ESC já funcionam.</p>
</div>
```

```html
<!-- scroll reveal nativo, sem framework de animação -->
<article sw-scr="up">Aparece ao entrar na tela.</article>

<!-- efeito de texto nativo (SW-FX) -->
<h1 sw-scramble>Passe o mouse ou dê foco aqui</h1>
```

Documentação completa e catálogo interativo: [sw.sanweb.com.br](https://sw.sanweb.com.br) — ou `docs/index.html` servido localmente (ver abaixo).

## Rodando localmente

```bash
npm run build   # gera dist/
npm run serve   # sobe um servidor estático zero-dependência em http://127.0.0.1:4173/docs/index.html
```

`tests/static-server.js` é o mesmo servidor usado pelos testes Playwright (`npm run test:browser`) — serve
só a pasta `docs/`, sem dependências externas.

## Testes

```bash
npm test            # 18 testes unitários (node --test)
npm run test:browser # suíte Playwright — Chromium 375/768/1280px, Firefox e WebKit 1280px
npm run verify        # roda tudo: testes unitários + build + testes de navegador
```

## Suporte de navegador

| Motor | Cobertura testada | Observação |
|---|---|---|
| Chromium | 375px, 768px, 1280px | Transições MPA completas (avanço + retorno) |
| Firefox | 1280px desktop | Navegação/direção funcionam; sem opt-in de transição MPA nesta versão do motor |
| WebKit (Playwright) | 1280px desktop | Transições MPA completas; **não substitui teste em Safari real** |

Mobile físico e versões anteriores de navegador ainda não fazem parte da matriz homologada. Toda funcionalidade principal (não-animada) funciona sem JavaScript ou com `prefers-reduced-motion` ativo — a animação é a camada opcional, nunca um requisito.

## Filosofia

1. **Zero dependência de runtime.** O que o navegador já resolve, o SW não reimplementa.
2. **Melhoria progressiva de verdade.** Conteúdo e funcionalidade principal existem sem JavaScript; animação e interação avançada são camadas opcionais.
3. **Segurança por padrão.** AJAX restrito à mesma origem, sanitização de fragmentos, zero `innerHTML` de conteúdo não confiável.
4. **Acessibilidade não é extra.** Teclado, foco, ARIA e `prefers-reduced-motion` são contrato do Core, não responsabilidade de quem usa.
5. **Honestidade de versão.** A documentação distingue o que está pronto, parcial e planejado — nunca apresenta algo como pronto sem ter sido testado de verdade.

## Limites conhecidos

- Cobertura de navegador é desktop-only nesta versão (ver tabela acima).
- `SW-FX` não depende de GSAP — por isso não inclui efeitos que exigem timeline complexa (parallax avançado, cursor customizado dedicado, SVG draw, video scrub dedicado). Os 7 efeitos nativos existentes cobrem os casos mais comuns.
- Máscaras de formulário formatam e limitam entrada; não validam regra de negócio (dígito verificador de CPF/CNPJ, etc.) — isso continua responsabilidade do backend.
- Build não usa minificador externo; a compactação é feita com segurança básica própria, mantendo zero dependências.
- Backend PHP ainda não está incluso — a versão em desenvolvimento faz CRUD recarregando página; está sendo reescrita com JS/AJAX antes de virar um pacote próprio.

## Licença

[MIT](LICENSE) — Sandro Web Solutions.
