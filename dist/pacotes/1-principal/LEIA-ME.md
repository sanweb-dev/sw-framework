# SW Framework — Principal

Núcleo obrigatório: 84 componentes, tema claro/escuro, ícones e os módulos de interface
(modal, dropdown, navbar, sidebar, formulários...). É o que praticamente todo projeto usa.

## Instalação

```html
<link rel="stylesheet" href="sw.min.css">
<script src="sw.min.js" defer></script>
```

`sw.config.css` é opcional — um ponto de partida pra personalizar cores, fontes e bordas
(carregue por último, depois do sw.min.css). A pasta `fonts/` (ícones em fonte) deve
ficar ao lado do CSS/JS. Precisa do SVG de algum ícone específico? A galeria completa
fica hospedada em sw.sanweb.com.br — não vem junto neste pacote.
