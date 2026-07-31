# SW Framework

**Framework web nativo, modular e sem dependências — CSS + JS puros, recursos modernos da plataforma (View Transitions API, Navigation API, IntersectionObserver) com fallback seguro para quem não suporta.**

> ⚠️ **Status: `0.1.0-alpha.1`.** Em desenvolvimento ativo, ainda não recomendado para produção. Este README descreve honestamente o que já funciona e o que está pendente — nada aqui promete mais do que o código realmente entrega.

---

## Por que o SW existe

Depois de três anos evoluindo projetos separados (Ydra, Y2, Smooll, FXCore, laboratório de View Transitions), o SW Framework unifica tudo num único repositório mestre: **zero dependências de runtime, JavaScript vanilla, CSS modular com tokens HSL, e melhorias progressivas nativas** em vez de reimplementar o que o navegador já oferece.

## Recursos

- **CSS modular** (`01-tokens` → `08-utilities`) — ~80KB não minificado, ~35KB minificado. Customização inteira do tema via variáveis CSS (`--sw-h-pri`, `--sw-pri`, `--sw-bg`, etc.) — mudar a hue primária recalcula botões, cards, navbars, badges e sombras automaticamente.
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

Ainda não publicado em nenhum registro (npm, CDN). Por enquanto, use os bundles gerados em `dist/`:

```html
<link rel="stylesheet" href="dist/sw.min.css">
<script src="dist/sw.min.js" defer></script>
<!-- opcional: efeitos SW-FX (scramble, typewriter, tilt, etc.) -->
<script src="dist/sw-fx.min.js" defer></script>
<!-- opcional: transições nativas entre páginas (MPA) -->
<script src="dist/sw-mpa.min.js"></script>
```

```bash
git clone <repositório>
cd sw
npm install        # só instala o Playwright, usado para testes
npm run build       # gera os 8 bundles em dist/
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

Documentação completa e catálogo interativo: `docs/index.html` (servir localmente, ver abaixo).

## Rodando localmente

Navegação normal do dia a dia: `npm run build` para gerar `dist/`, depois abrir `https://sw.san/index.html` pelo servidor local padrão do Nill (Apache, via `nill.ps1 iniciar`) — o projeto já está registrado nesse mecanismo (`.env` com `LOCAL_HOST=sw.san`, `LOCAL_PUBLIC_PATH=docs`).

```bash
npm run build   # gera dist/
```

O projeto também tem um servidor estático zero-dependência próprio (`tests/static-server.js`), usado exclusivamente pelos testes Playwright (`npm run test:browser`), não para navegação manual:

```bash
npm run serve   # sobe o servidor de teste em http://127.0.0.1:4173/docs/index.html
```

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
5. **Honestidade de versão.** `0.1.0-alpha.1` significa alpha — a documentação distingue o que está pronto, parcial e planejado.

## Limites conhecidos (alpha)

- Cobertura de navegador é desktop-only nesta versão (ver tabela acima).
- `SW-FX` não depende de GSAP — por isso não inclui efeitos que exigem timeline complexa (parallax avançado, cursor customizado dedicado, SVG draw, video scrub dedicado). Os 7 efeitos nativos existentes cobrem os casos mais comuns.
- Máscaras de formulário formatam e limitam entrada; não validam regra de negócio (dígito verificador de CPF/CNPJ, etc.) — isso continua responsabilidade do backend.
- Build não usa minificador externo; a compactação é feita com segurança básica própria, mantendo zero dependências.

## Licença

[MIT](LICENSE) — Sandro Web Solutions.
