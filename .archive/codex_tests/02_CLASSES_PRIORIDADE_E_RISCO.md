# Classes de Prioridade e Risco

## Definição das classes
- `P0`  
  Contrato de dados e regras centrais. Falha aqui compromete múltiplas telas e decisões de negócio.
- `P1`  
  Fluxos críticos de UI com estado assíncrono, serialização e paginação.
- `P2`  
  Fluxos de exploração/detalhe e UX funcional (alto uso, mas risco de impacto mais localizado).
- `P3`  
  Componentes predominantemente apresentacionais, com pouca regra.

## Critérios de classificação
- **Severidade funcional**: impacto no uso principal da aplicação.
- **Acoplamento**: quantos módulos dependem da lógica.
- **Probabilidade de regressão**: presença de estado assíncrono, parsing, serialização, cálculos.
- **Custo de detecção tardia**: quanto custa descobrir o bug apenas em produção.

## Matriz de priorização por módulo

| Prioridade | Módulo | Tipo de risco principal | Motivação de priorização | Tipo de teste inicial |
|---|---|---|---|---|
| P0 | `src/services/api.ts` | Contrato HTTP / serialização | Camada central de dados do frontend; erro afeta toda a navegação | UT |
| P0 | `src/utils/basePath.ts` | Normalização de URL | Base de roteamento e construção de endpoint | UT |
| P0 | `src/utils/compoundFilters.ts` | Regras de filtro | Regras funcionais de busca/filtro local e metadata | UT |
| P0 | `src/utils/toxicityEndpointGroups.ts` | Agrupamento/ordenação | Base para heatmaps e leitura de toxicidade | UT |
| P0 | `src/utils/compoundOverviewAdapters.ts` | Transformação de dados | Mapeia payload para gráficos e labels de risco | UT |
| P0 | `src/utils/pathwayOverviewAdapters.ts` | Transformação de dados | Mapeia distribuição para gráficos e cores | UT |
| P0 | `src/config/guidedQueryRecipes.ts` | Parse e validação de YAML | Quebra em runtime impacta Guided Analysis | UT |
| P0 | `src/config/downloadCatalog.ts` | Parse e validação de YAML | Home/Downloads dependem de catálogo válido | UT |
| P0 | `src/config/databaseMetricsCatalog.ts` | Parse/normalização de métricas | Painéis de métricas dependem de conversões consistentes | UT |
| P1 | `src/App.tsx` (roteamento manual) | Deep-link / navegação | Parsing de rotas + alias legado + basePath | CT |
| P1 | `GuidedAnalysisPage` | Estado assíncrono complexo | Múltiplos efeitos dependentes e execução de query | CT |
| P1 | `VisualizationRendererRegistry` | Seleção de renderer | Risco de exibição incorreta ou fallback quebrado | CT |
| P1 | `GuidedFiltersBar` | Serialização de inputs | Regras de range/select/toggle e reset | CT |
| P1 | `GuidedResultTable` | Paginação/click behavior | Regras de clique condicional e render de células | CT |
| P1 | `RiskPotentialScatterChart` | Cálculo visual e thresholds | Conversão de escala e comportamento de seleção | CT |
| P1 | `GuidedToxicityHeatmapMatrix` | Ordenação e fallback | Montagem matricial dinâmica por endpoints | CT |
| P1 | `PathwayToxicityHeatmap` | Ordenação por toxicidade | Regras de sorting e fallback de dados | CT |
| P1 | `Pagination` | Navegação paginada | Limites, elipses e callbacks | CT |
| P2 | `CompoundExplorer` | Filtro/paginação assíncrona | Fluxo frequente com metadados e export | CT |
| P2 | `GeneExplorer` | Filtro/paginação assíncrona | Fluxo de consulta com busca e ranges | CT |
| P2 | `PathwayExplorer` | Fonte/consulta assíncrona | Seleção por source e busca | CT |
| P2 | `ToxicityExplorer` | Encadeamento assíncrono | Endpoint -> labels -> resultados | CT |
| P2 | `CompoundClassExplorer` | Busca/paginação | Lista agregada por classe | CT |
| P2 | `CompoundDetail` | Tabs + cargas paralelas | Contexto + genes + metadata sob demanda | CT |
| P2 | `GeneDetail` | Tabs + overview assíncrono | Multi-load + tabela clicável + metadata | CT |
| P2 | `PathwayDetail` | Carga overview + gráficos | Fluxo de detalhe com fonte opcional | CT |
| P2 | `CompoundClassDetail` | Carga overview + gráficos | Fluxo agregado por classe | CT |
| P3 | `ChartCard` | Render simples | Wrapper visual sem regra de negócio | CT |
| P3 | `ChartLegend` | Render simples | Legenda estática baseada em props | CT |
| P3 | `GuidedInsightPanel` | Render simples | Render condicional de insights | CT |
| P3 | `GuidedSummaryCards` | Render simples | Render de cards com fallback | CT |

## Ordem prática de ataque
1. P0 completo (núcleo de contrato e transformação).
2. P1 mínimo viável (guided + roteamento + paginação).
3. P2 por fluxo de maior uso (Compound/Gene primeiro).
4. P3 somente para fechamento de regressão visual funcional.
