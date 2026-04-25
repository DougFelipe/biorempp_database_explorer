# P2 Incremental Delivery Plan for Guided Analysis and Visualization

## Objetivo
Decompor a P2 em fases pequenas, sequenciais e validaveis para reduzir risco funcional na camada de Guided Analysis e visualizacao cientifica. Esta modelagem assume que P0 e P1 ja estao concluidades o suficiente para suportar hooks compartilhados, shells de UI, estado assincrono, tabs/dialogs e testes unitarios.

## Estado atual que justifica a divisao em fases
- `GuidedAnalysisPage.tsx` ainda concentra catalog loading, query selection, filter defaults, dependent options, execute flow, pagination, refresh state e composition da tela.
- `VisualizationRendererRegistry.tsx` ainda usa branching imperativo por tipo de visualizacao.
- `RiskPotentialScatterChart.tsx` ainda mistura constantes, escalas, ticks, thresholds, legendas e renderizacao SVG no mesmo arquivo.
- `ToxicityHeatmapOverview.tsx` e `PathwayToxicityHeatmap.tsx` ainda usam wrappers visuais locais, sem uma camada compartilhada de visualizacao.
- O smoke de `/guided-analysis` ja existe, mas ainda nao ha testes de comportamento real da tela guided.

## Invariantes obrigatorios desta onda
- Nao alterar semantica de `src/config/guided-query-recipes.yaml`.
- Nao alterar shape do catalogo retornado por `getGuidedCatalog`.
- Nao alterar payload ou contrato de `executeGuidedQuery`.
- Nao alterar ids de queries, filtros, labels tecnicos ou nomes usados pelo backend.
- Manter o modelo atual de rendering SVG-like; separar responsabilidades sem trocar engine de visualizacao.
- Manter `src/services/api.ts` como barrel de compatibilidade durante toda a P2.

## Estrutura alvo ao final da P2
- `src/features/guided-analysis/api.ts`
- `src/features/guided-analysis/types.ts`
- `src/features/guided-analysis/hooks/*`
- `src/features/guided-analysis/components/*`
- `src/features/guided-analysis/charts/*`
- `src/shared/visualization/*`

## Fase P2-A: Domain Extraction and Compatibility
### Objetivo
Mover a superficie de Guided Analysis para um dominio proprio sem alterar contratos publicos nem comportamento da tela.

### Entregas
- Criar `src/features/guided-analysis/api.ts` com:
  - `getGuidedCatalog`
  - `getGuidedQueryOptions`
  - `executeGuidedQuery`
- Criar `src/features/guided-analysis/types.ts` como barrel inicial sobre `src/types/guided.ts`.
- Ajustar `src/services/api.ts` para reexportar a superficie guided a partir do dominio novo.
- Nao mover ainda a UI da tela nem reescrever componentes visuais.

### Criterios de aceite
- `GuidedAnalysisPage.tsx` continua funcionando sem mudanca de props ou payload.
- Imports antigos via `src/services/api.ts` continuam validos.
- Nenhuma quebra em `src/types/guided.ts` ou nos consumidores atuais.

### Gate para avancar
- `typecheck`, `test:run` e `build:web` verdes.
- Smoke de `/guided-analysis` permanece verde.

## Fase P2-B: State and Orchestration Split
### Objetivo
Transformar `GuidedAnalysisPage.tsx` em container fino, removendo a logica inline de serializacao, options dependentes e execucao.

### Entregas
- Criar hooks em `src/features/guided-analysis/hooks/*`:
  - `useGuidedCatalog`
  - `useGuidedQuerySelection`
  - `useGuidedFilterState`
  - `useGuidedQueryOptions`
  - `useGuidedExecution`
- Extrair utilitarios hoje inline:
  - default values por tipo de filtro
  - serializacao para options
  - serializacao para execute
  - validacao de selected option contra options dependentes
  - page size derivado da query
- Refatorar `GuidedAnalysisPage.tsx` para depender desses hooks e deixar apenas composicao de layout e wiring entre componentes.

### Componentes que devem surgir nesta fase
- `GuidedAnalysisLayout`
- `GuidedQueryHeader`
- `GuidedExecutionMeta`
- `GuidedStatusBanner`
- `GuidedFiltersPanel`
- `GuidedResultsSection`
- `GuidedDialogs`

### Decisoes de implementacao
- Reaproveitar os componentes ja existentes como base interna:
  - `QuerySelectorPanel`
  - `GuidedFiltersBar`
  - `GuidedSummaryCards`
  - `GuidedInsightPanel`
  - `GuidedResultTable`
  - `UseCaseDescriptionAccordion`
  - `UseCaseMethodsModal`
  - `UseCaseQueryRecipesModal`
- Nao renomear filtros, queries ou props de backend.
- Nao introduzir state library global.

### Criterios de aceite
- `GuidedAnalysisPage.tsx` deixa de concentrar serializacao, options validation, execute flow e composition pesada ao mesmo tempo.
- Cada hook encapsula um aspecto unico do fluxo guided.
- Refresh incremental e estados de erro parcial continuam funcionando.

### Gate para avancar
- Testes unitarios cobrindo:
  - troca de query
  - reset de filtros
  - carregamento de options dependentes
  - paginacao de execute
  - refresh incremental

## Fase P2-C: Shared Visualization Foundation
### Objetivo
Criar uma camada visual compartilhada para charts e heatmaps antes de mexer no registry e no scatter.

### Entregas
- Criar `src/shared/visualization/*` com:
  - `VisualizationCardShell`
  - `VisualizationEmptyState`
  - `VisualizationErrorState`
  - `ChartLegend`
  - `HeatmapLegend`
  - `ChartTooltip` ou wrapper equivalente
- Promover/adaptar componentes atuais para essa camada:
  - `src/components/charts/ChartCard.tsx`
  - `src/components/charts/ChartLegend.tsx`
- Padronizar `ToxicityHeatmapOverview.tsx`, `PathwayToxicityHeatmap.tsx` e `GuidedToxicityHeatmapMatrix.tsx` para usarem os shells novos sem alterar calculo de dados.

### Decisoes de implementacao
- Nao mudar os adapters de dados nesta fase.
- Nao reescrever o markup das matrizes alem do necessario para compartilhar shell, legendas e estados vazios.
- Priorizar consistencia visual, estados empty/error e titulos/subtitulos tecnicos.

### Criterios de aceite
- Heatmaps e chart cards passam a compartilhar o mesmo shell visual.
- Legendas deixam de ser implementadas de formas divergentes entre overview, guided e pathway.
- Estados vazios e de erro ficam consistentes entre visualizacoes.

### Gate para avancar
- Testes unitarios para empty/error states dos wrappers compartilhados.
- Nenhuma regressao visual grosseira em desktop para Guided Analysis e detail heatmaps.

## Fase P2-D: Registry and Scatter Decomposition
### Objetivo
Separar a camada de renderizacao por tipo e desmontar o scatter monolitico em blocos previsiveis.

### Entregas
- Refatorar `VisualizationRendererRegistry.tsx` para registry declarativo por tipo.
- Criar em `src/features/guided-analysis/charts/*`:
  - modulo de dimensoes
  - modulo de calculo de escalas e ticks
  - `ScatterThresholdOverlay`
  - legend helper
  - renderer de pontos
- Reduzir `RiskPotentialScatterChart.tsx` a compositor do grafico.

### Decisoes de implementacao
- O registry deve mapear `visualization.type` para renderer dedicado, sem `if`/`switch` crescente espalhado.
- O scatter deve continuar aceitando:
  - `points`
  - `xThreshold`
  - `yThreshold`
  - `xScaleMode`
  - `yMetricLabel`
  - `onSelectCompound`
- Nao alterar nomes de campos como `gene_count`, `pathway_count`, `y_value`, `compoundclass`.

### Criterios de aceite
- `VisualizationRendererRegistry.tsx` vira extensivel sem branching monolitico.
- `RiskPotentialScatterChart.tsx` deixa de conter simultaneamente constantes, layout, calculo e event handling.
- Thresholds, quadrantes, clique em ponto e legenda continuam semanticamente identicos.

### Gate para avancar
- Testes cobrindo:
  - renderer por tipo
  - fallback para tipo nao registrado
  - scatter thresholds
  - clique em ponto
  - empty state do scatter

## Fase P2-E: Hardening, UX and Test Completion
### Objetivo
Fechar a P2 com cobertura de comportamento, acessibilidade minima e checklist visual.

### Entregas
- Completar a malha de testes de Guided Analysis:
  - troca de query
  - reset de filtros
  - options dependentes
  - abrir/fechar dialogs
  - execution loading
  - erro parcial
  - registry por tipo
  - heatmap/scatter empty states
- Revisar estados de UX:
  - catalog loading
  - execute loading inicial
  - refresh incremental
  - erro de catalogo
  - erro de execute
  - erro parcial de options
- Rodar checklist visual em desktop, tablet e mobile para:
  - `/guided-analysis`
  - scatter
  - heatmaps
  - dialogs methods/query recipes

### Criterios de aceite
- `GuidedAnalysisPage.tsx` fica fina e previsivel.
- Visualizacoes guided usam shell e estados compartilhados.
- O registry e o scatter ficam modulares e extensivos.
- Nenhum contrato de YAML, endpoint ou payload e alterado.

## Ordem recomendada de implementacao
1. P2-A Domain Extraction and Compatibility
2. P2-B State and Orchestration Split
3. P2-C Shared Visualization Foundation
4. P2-D Registry and Scatter Decomposition
5. P2-E Hardening, UX and Test Completion

## Test plan consolidado
- Baseline obrigatoria em toda subfase:
  - `npm run typecheck`
  - `npm run test:run`
  - `npm run build:web`
- Cobertura minima por dominio:
  - `App.test.tsx` mantendo smoke de `/guided-analysis`
  - novos testes da pagina guided real
  - testes de wrappers compartilhados em `src/shared/visualization`
  - testes de registry e scatter em `src/features/guided-analysis/charts` ou `src/tests/unit/components`

## Dependencias e pre-condicoes
- P0 concluida para shell, feedback states e primitives.
- P1 concluida para explorers, detail shells, hooks assincronos e lazy loading.
- Nenhuma fase da P2 deve comecar pelo scatter antes da extracao de dominio e de estado da pagina.

## Fora de escopo
- Reescrita do backend guided.
- Troca do motor de visualizacao.
- Introducao de state library global.
- Replanejamento de rotas ou migracao para React Router.
