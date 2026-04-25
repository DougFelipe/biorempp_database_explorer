# P2 Visual Regression Checklist

## Objetivo
Checklist manual para validar a camada de Guided Analysis apos as fases P2-A ate P2-E, cobrindo consistencia visual, estados de UX e responsividade basica antes de seguir para novas mudancas de interface.

## Rotas alvo
- `/guided-analysis`

## Viewports recomendados
- Desktop: `1440x900`
- Tablet: `1024x768`
- Mobile: `390x844`

## Guided Analysis page
- [ ] Header principal renderiza titulo, descricao e metadados de execucao sem sobreposicao.
- [ ] Sidebar de queries permanece navegavel e destaca a query ativa.
- [ ] Filtros mantem alinhamento em desktop, quebram corretamente em tablet e empilham em mobile.
- [ ] Banner de erro parcial de options nao desloca o layout de forma abrupta.
- [ ] Estado de loading inicial usa card centralizado e legivel.
- [ ] Estado de refresh incremental mantem resultados anteriores visiveis.
- [ ] Estado de erro de execute fica visivel sem quebrar o shell da pagina.

## Dialogs
- [ ] Accordion de use case abre e fecha sem salto visual grosseiro.
- [ ] Modal de methods centraliza corretamente em desktop e continua utilizavel em mobile.
- [ ] Modal de query recipes permite leitura horizontal dos blocos de codigo sem overflow quebrado.
- [ ] Botoes de fechar continuam visiveis em todos os breakpoints.

## Scatter
- [ ] Card do scatter mantem titulo, subtitulo e legenda alinhados.
- [ ] Eixos, thresholds e labels de quadrante continuam legiveis em desktop e tablet.
- [ ] Em mobile o SVG nao vaza horizontalmente para fora do card.
- [ ] Empty state do scatter usa shell compartilhado e nao colapsa o espaco vertical.

## Heatmaps
- [ ] Heatmap guided usa legenda compartilhada com contraste aceitavel.
- [ ] Sticky headers continuam alinhados durante scroll vertical e horizontal.
- [ ] Labels rotacionadas dos endpoints permanecem legiveis sem sobreposicao severa.
- [ ] Empty state do heatmap guided usa shell compartilhado.

## Acessibilidade minima
- [ ] Banners de erro usam anuncio perceptivel.
- [ ] Loading states usam anuncio nao intrusivo.
- [ ] Dialogs expostos com papel semantico de `dialog`.
- [ ] Accordion exposto com `aria-expanded` coerente.
- [ ] Seletor de query comunica estado ativo.

## Gate de encerramento
- [ ] `npm run typecheck`
- [ ] `npm run test:run`
- [ ] `npm run build:web`
- [ ] Validacao visual manual concluida em desktop, tablet e mobile.
