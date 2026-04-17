# Catálogo de Cenários de Teste

## Backlog priorizado

| Test ID | Prioridade | Módulo | Tipo | Objetivo | Entrada | Resultado esperado | Risco coberto |
|---|---|---|---|---|---|---|---|
| UT-API-001 | P0 | `src/services/api.ts` | UT | Validar geração de querystring sem campos vazios | Filtros com `undefined`, `null`, `''`, valores válidos | Query inclui apenas campos válidos | Requisição com parâmetros inválidos |
| UT-API-002 | P0 | `src/services/api.ts` | UT | Validar `encodeURIComponent` em IDs de rota | `cpd`, `ko`, `pathway` com espaços/símbolos | URL final codificada corretamente | 404 por rota malformada |
| UT-API-003 | P0 | `src/services/api.ts` | UT | Validar tratamento de erro HTTP em `fetchJson` | `response.ok = false`, body com texto | `Error` com texto do body | Falha silenciosa de backend |
| UT-API-004 | P0 | `src/services/api.ts` | UT | Validar fallback de erro sem body | `response.ok = false`, body vazio, status 500 | `Error` contém `Request failed: 500` | Diagnóstico pobre em erro |
| UT-API-005 | P0 | `src/services/api.ts` | UT | Validar payload e headers de `executeGuidedQuery` | `queryId` + payload de filtros | POST com `Content-Type: application/json` e body serializado | Payload incorreto no guided |
| UT-API-006 | P0 | `src/services/api.ts` | UT | Validar export CSV | Mock de `getCompounds` com 2 linhas | CSV com header, aspas e colunas esperadas | Export inconsistente para usuário |
| UT-API-007 | P0 | `src/services/api.ts` | UT | Validar export JSON | Mock de `getCompounds` | JSON identado e completo | Export truncado/inválido |
| UT-UTIL-001 | P0 | `src/utils/basePath.ts` | UT | Validar `normalizeBasePath` para raiz | `undefined`, `null`, `'/'`, `''` | Retorno `'/'` | Base path quebrando navegação |
| UT-UTIL-002 | P0 | `src/utils/basePath.ts` | UT | Validar normalização de barras | `'biorempp'`, `'/biorempp/'`, `'///biorempp///'` | Retorno `'/biorempp/'` | URLs duplicadas/inválidas |
| UT-UTIL-003 | P0 | `src/utils/basePath.ts` | UT | Validar `stripBasePath` | pathname com e sem base | Retorno correto da rota sem base | Parse de rota incorreto |
| UT-UTIL-004 | P0 | `src/utils/basePath.ts` | UT | Validar `withBasePath` | path relativo/absoluto com base custom | URL final consistente e sem duplicação | Endpoint errado por concatenação |
| UT-UTIL-005 | P0 | `src/utils/compoundFilters.ts` | UT | Validar filtro composto | lista de compounds + múltiplos filtros | Apenas registros aderentes retornam | Resultados incorretos em listagem |
| UT-UTIL-006 | P0 | `src/utils/compoundFilters.ts` | UT | Validar metadata de filtros | compounds com classes/genes/pathways repetidos | conjuntos únicos ordenados | Facetas inconsistentes |
| UT-UTIL-007 | P0 | `src/utils/toxicityEndpointGroups.ts` | UT | Validar agrupamento por domínio | endpoints conhecidos de grupos distintos | Facets geradas por grupo correto | Heatmap com classificação errada |
| UT-UTIL-008 | P0 | `src/utils/toxicityEndpointGroups.ts` | UT | Validar ordenação de endpoints | endpoints conhecidos + desconhecidos | conhecidos por ordem fixa, desconhecidos por nome | Leitura visual inconsistente |
| UT-UTIL-009 | P0 | `src/utils/compoundOverviewAdapters.ts` | UT | Validar mapeamento de risco | buckets `high/medium/low/unknown` | scores e labels corretos | Interpretação errada de risco |
| UT-UTIL-010 | P0 | `src/utils/pathwayOverviewAdapters.ts` | UT | Validar fallback de cor em donut | ec_class não mapeada | cor padrão `Other` | Gráfico inconsistente |
| UT-CONFIG-001 | P0 | `src/config/guidedQueryRecipes.ts` | UT | Validar carregamento de YAML válido | catálogo mínimo válido | objeto normalizado com campos obrigatórios | quebra da página guided |
| UT-CONFIG-002 | P0 | `src/config/guidedQueryRecipes.ts` | UT | Validar erro de schema inválido | bloco faltando `sqlite` ou `python` | exceção com path específico | diagnóstico difícil em config |
| UT-CONFIG-003 | P0 | `src/config/downloadCatalog.ts` | UT | Validar item de download obrigatório | item sem `id`/`url`/`source` | erro explícito de validação | home quebrada por config inválida |
| UT-CONFIG-004 | P0 | `src/config/databaseMetricsCatalog.ts` | UT | Validar parse e fallback numérico | JSON com números inválidos | fallback aplicado sem crash | métricas quebrando render |
| CT-GUIDED-001 | P1 | `GuidedAnalysisPage` | CT | Validar carga inicial de catálogo | mock `getGuidedCatalog` sucesso | query inicial selecionada e filtros default aplicados | tela vazia no primeiro carregamento |
| CT-GUIDED-002 | P1 | `GuidedAnalysisPage` | CT | Validar serialização para options | alteração de filtros string/boolean | chamada de options com payload esperado | options incompatíveis |
| CT-GUIDED-003 | P1 | `GuidedAnalysisPage` | CT | Validar serialização para execute | range + toggle + search | chamada de execute com filtros esperados | execução errada da query |
| CT-GUIDED-004 | P1 | `GuidedAnalysisPage` | CT | Validar invalidação de `dependent_select` | option atual removida em refresh | valor muda para primeira option válida | estado inválido persistente |
| CT-GUIDED-005 | P1 | `VisualizationRendererRegistry` | CT | Validar roteamento por tipo de visualização | lista com `horizontal_bar`, `scatter`, `heatmap`, `boxplot`, tipo desconhecido | renderer correto ou fallback textual | visualização incorreta |
| CT-GUIDED-006 | P1 | `GuidedResultTable` | CT | Validar click condicional em linha | tabela com/sem `row_click_field` válido | apenas linhas válidas disparam callback | navegação indevida |
| CT-GUIDED-007 | P1 | `GuidedFiltersBar` | CT | Validar reset de filtros | valores preenchidos + ação reset | callback reset acionado e estado limpo | filtros antigos contaminando resultado |
| CT-PAG-001 | P1 | `Pagination` | CT | Validar limite inferior | `currentPage=1` | botão anterior desabilitado | paginação negativa |
| CT-PAG-002 | P1 | `Pagination` | CT | Validar limite superior | `currentPage=totalPages` | botão próximo desabilitado | paginação fora do total |
| CT-PAG-003 | P1 | `Pagination` | CT | Validar elipses | totalPages > 5 em páginas intermediárias | render de primeira/última + elipses | navegação truncada |
| CT-PAG-004 | P1 | `Pagination` | CT | Validar callback de página | clique em botão numérico | `onPageChange` com página correta | mudança de página incorreta |
| CT-APP-001 | P1 | `App.tsx` | CT | Validar alias legado | navegação para `/visualizations` | redireciona para `/guided-analysis` | links legados quebrados |
| CT-APP-002 | P1 | `App.tsx` | CT | Validar parse de gene | rota `/genes/k00001` | `ko` normalizado para uppercase | deep link inconsistente |
| CT-APP-003 | P1 | `App.tsx` | CT | Validar parse de compound | rota com ID codificado | `cpd` decodificado e uppercase | detalhamento não abre |
| CT-APP-004 | P1 | `App.tsx` | CT | Validar parse pathway com source | rota `/pathways/detail/hadeg/foo` | `source=HADEG`, pathway correto | detalhamento errado |
| CT-APP-005 | P1 | `App.tsx` | CT | Validar comportamento com `basePath` | app sob subpath custom | rotas e navegação funcionam com base | deploy sob subpath quebrado |
| CT-HEAT-001 | P1 | `PathwayToxicityHeatmap` | CT | Validar ordenação por média de toxicidade | matrix com valores distintos | linhas ordenadas desc por média | leitura de risco enganosa |
| CT-HEAT-002 | P1 | `GuidedToxicityHeatmapMatrix` | CT | Validar fallback sem dados | matrix vazia | mensagem de "No data" | erro de render |
| CT-EXP-001 | P2 | `CompoundExplorer` | CT | Validar sequência metadata + dados | mocks de metadados e compounds | render de filtros + tabela paginada | UX quebrada em exploração |
| CT-EXP-002 | P2 | `ToxicityExplorer` | CT | Validar encadeamento endpoint -> labels | endpoint default e labels dinâmicos | labels atualizam com endpoint | filtros dependentes quebrados |
| CT-EXP-003 | P2 | `GeneDetail` | CT | Validar tabs com cargas sob demanda | troca para `overview` e `metadata` | cada aba dispara carga correta | overhead e dados incorretos |
| CT-EXP-004 | P2 | `CompoundDetail` | CT | Validar paginação de genes e metadata lazy | troca de aba + mudança de página | carregamento e paginação estáveis | inconsistência em detalhes |

## Cobertura mínima de arranque
- Primeira onda (obrigatória): todos os casos `P0` + `CT-PAG-*` + `CT-APP-001`.
- Segunda onda: `CT-GUIDED-*` completos.
- Terceira onda: `CT-EXP-*` conforme fase 3 do roadmap.
