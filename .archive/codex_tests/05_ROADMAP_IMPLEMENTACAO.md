# Roadmap de Implementação de Testes

## Estratégia geral
- Sequenciamento por risco: `P0 -> P1 -> P2/P3`.
- Entrega incremental com gates de cobertura progressivos.
- Cada fase fecha com evidência registrada em compliance.

## Fase 0 - Bootstrap e primeiros P0 pequenos
### Objetivo
- Instalar e configurar infraestrutura de testes.
- Validar pipeline básico com primeiros testes unitários de baixo custo.

### Entregáveis
- Configuração de `Vitest` + `Testing Library` + `jsdom`.
- Scripts de teste no `package.json`.
- Testes iniciais:
  - `src/utils/basePath.ts`
  - funções simples de adapters (`riskBucket*`, mapeamentos básicos).

### Critério de saída (DoD fase)
- Testes executando localmente e em CI.
- Casos iniciais `P0` verdes.
- `lint` e `typecheck` verdes.
- Evidência registrada em `06_COMPLIANCE_TRACEABILIDADE.md`.

## Fase 1 - Fechamento de P0 (núcleo de contrato e transformação)
### Objetivo
- Blindar contratos de dados, parse/validação e transformações centrais.

### Entregáveis
- UT completos para:
  - `src/services/api.ts`
  - `src/utils/compoundFilters.ts`
  - `src/utils/toxicityEndpointGroups.ts`
  - `src/utils/*adapters.ts`
  - `src/config/guidedQueryRecipes.ts`
  - `src/config/downloadCatalog.ts`
  - `src/config/databaseMetricsCatalog.ts`

### Critério de saída (DoD fase)
- Todos os itens `P0` mapeados no catálogo com execução verde.
- Sem regressão de contrato crítico.
- Evidências atualizadas por requisito.

## Fase 2 - P1 (guided + roteamento + assíncrono crítico)
### Objetivo
- Estabilizar os fluxos de maior risco funcional da UI.

### Entregáveis
- CT para:
  - `App.tsx` (roteamento e alias)
  - `GuidedAnalysisPage`
  - `VisualizationRendererRegistry`
  - `GuidedFiltersBar`
  - `GuidedResultTable`
  - `GuidedToxicityHeatmapMatrix`
  - `PathwayToxicityHeatmap`
  - `Pagination`

### Critério de saída (DoD fase)
- Fluxos críticos guided e roteamento estáveis.
- Casos de paginação e estados de erro/carga cobertos.
- Evidências associadas aos requisitos `P1`.

## Fase 3 - P2/P3 + hardening
### Objetivo
- Expandir cobertura para fluxos de exploração e detalhes.
- Consolidar suíte de regressão mínima contínua.

### Entregáveis
- CT de explorers/details:
  - `Compound/Gene/Pathway/Toxicity/CompoundClass` (listagem + detalhe).
- CT de componentes `P3` essenciais.
- Refino de cenários de borda e confiabilidade de mocks.

### Critério de saída (DoD fase)
- Suíte mínima de regressão `P0/P1` fixada.
- `P2` crítico coberto conforme catálogo.
- Matriz de compliance atualizada e revisada.

## Gates progressivos de cobertura
- **Gate 1**
  - Cobertura global mínima: `>= 40%`.
  - Obrigatório: módulos `P0` já com casos executáveis e verdes.
- **Gate 2**
  - Cobertura global mínima: `>= 60%`.
  - Obrigatório: estabilidade dos fluxos `P1` críticos (guided + roteamento + paginação).
- **Gate 3**
  - Cobertura global mínima: `>= 75%`.
  - Obrigatório: suíte de regressão mínima `P0/P1` definida e em execução contínua.

## DoD transversal (todas as fases)
- Testes verdes no escopo da fase.
- `npm run lint` e `npm run typecheck` verdes.
- Evidências de execução e status por requisito atualizados.
- Sem item `P0` sem mapeamento de teste.
