# SW Framework — Complementar

`sw.compl.min.js` reúne tudo que é opcional num arquivo só — nenhuma parte exige as
outras, mas todas exigem o pacote **1-principal** carregado antes:

- Efeitos nativos leves (scramble, tilt 3D, marquee, magnetismo) — vem do sw-fx.
- Transição suave entre páginas — vem do sw-mpa.
- Motor de animação avançado com GSAP embutido — a maior parte do peso do arquivo.

`sw.compl.min.css` é obrigatório se você usar `sw-marquee` ou `sw-scrub` do sw-fx —
sem ele os dois ficam sem efeito nenhum (o JS só cria a estrutura/estado, quem desenha
a animação é esse CSS). Os demais efeitos do sw-fx (scramble, split, tilt, magnetismo,
typewriter) funcionam só com o JS.

Backend PHP ainda não está aqui — vem num pacote próprio quando estiver pronto.
