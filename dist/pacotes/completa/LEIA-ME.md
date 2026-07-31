# SW Framework

`sw.min.css` + `sw.min.js` = tudo que roda no navegador num arquivo só: núcleo
(84 componentes, tema claro/escuro, ícones, modal, dropdown, navbar, sidebar,
formulários...) + efeitos (scramble, tilt 3D, marquee, magnetismo), transição
suave entre páginas e o motor de animação avançado com GSAP embutido.

## Instalação

```html
<link rel="stylesheet" href="sw.min.css">
<script src="sw.min.js" defer></script>
```

`sw.config.css` é opcional — um ponto de partida pra personalizar cores, fontes e
bordas (carregue por último, depois do sw.min.css). A pasta `fonts/` (ícones em
fonte) deve ficar ao lado do CSS/JS. Precisa do SVG de algum ícone específico? A
galeria completa fica hospedada em sw.sanweb.com.br — não vem junto neste pacote.

Backend PHP ainda não está aqui — vem num pacote próprio quando estiver pronto.
