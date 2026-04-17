# Compliance e Traceabilidade de Testes

## Objetivo
- Garantir rastreabilidade clara entre requisito, risco, testes implementados e evidência de execução.
- Suportar governança técnica por fase com critérios objetivos.

## Template fixo de matriz (obrigatório)

| Requirement ID | Risk Class | Module | Test IDs | Execution Evidence | Status | Owner |
|---|---|---|---|---|---|---|
| REQ-P0-API-CONTRACT | P0 | `src/services/api.ts` | `UT-API-001..007` | Link/registro da execução + data | Planned/In Progress/Done | Frontend |
| REQ-P0-BASEPATH | P0 | `src/utils/basePath.ts` | `UT-UTIL-001..004` | Link/registro da execução + data | Planned/In Progress/Done | Frontend |
| REQ-P0-FILTERS | P0 | `src/utils/compoundFilters.ts` | `UT-UTIL-005..006` | Link/registro da execução + data | Planned/In Progress/Done | Frontend |
| REQ-P0-TOX-GROUPING | P0 | `src/utils/toxicityEndpointGroups.ts` | `UT-UTIL-007..008` | Link/registro da execução + data | Planned/In Progress/Done | Frontend |
| REQ-P0-ADAPTERS | P0 | `src/utils/*adapters.ts` | `UT-UTIL-009..010` | Link/registro da execução + data | Planned/In Progress/Done | Frontend |
| REQ-P0-CONFIG-GUIDED | P0 | `src/config/guidedQueryRecipes.ts` | `UT-CONFIG-001..002` | Link/registro da execução + data | Planned/In Progress/Done | Frontend |
| REQ-P0-CONFIG-DOWNLOAD | P0 | `src/config/downloadCatalog.ts` | `UT-CONFIG-003` | Link/registro da execução + data | Planned/In Progress/Done | Frontend |
| REQ-P0-CONFIG-METRICS | P0 | `src/config/databaseMetricsCatalog.ts` | `UT-CONFIG-004` | Link/registro da execução + data | Planned/In Progress/Done | Frontend |
| REQ-P1-ROUTING | P1 | `src/App.tsx` | `CT-APP-001..005` | Link/registro da execução + data | Planned/In Progress/Done | Frontend |
| REQ-P1-GUIDED-FLOW | P1 | `GuidedAnalysisPage` e registry/filtros/tabela | `CT-GUIDED-001..007` | Link/registro da execução + data | Planned/In Progress/Done | Frontend |
| REQ-P1-PAGINATION | P1 | `src/components/Pagination.tsx` | `CT-PAG-001..004` | Link/registro da execução + data | Planned/In Progress/Done | Frontend |
| REQ-P2-EXPLORERS-DETAILS | P2 | Explorers/Details | `CT-EXP-001..004` | Link/registro da execução + data | Planned/In Progress/Done | Frontend |

## Critérios de aceite de compliance
- Nenhum item `P0` sem teste mapeado na matriz.
- Nenhum gate aprovado sem evidência de execução anexada.
- Cobertura e rastreabilidade revisadas ao final de cada fase.

## Contrato de evidência
- Evidência mínima por execução:
  - comando executado;
  - resultado (pass/fail);
  - data;
  - fase/gate associado;
  - referência do commit/pipeline quando aplicável.
- Formatos aceitos:
  - log do CI;
  - relatório de cobertura;
  - output consolidado de execução local versionado em artefato.

## Registro de riscos conhecidos e mitigação

| Risco | Impacto | Evidência atual | Mitigação planejada |
|---|---|---|---|
| Warnings de `react-hooks/exhaustive-deps` (13 ocorrências) | Pode gerar stale state/race em fluxos assíncronos | `npm run lint` com warnings em explorers/details | Cobrir fluxos assíncronos com CT e revisar dependências críticas |
| Roteamento manual em `App.tsx` | Regressão de deep-link e alias legado | Parsing custom + alias `/visualizations` | CT-APP específicos para parsing/alias/basePath |
| Serialização de filtros guided | Execução com payload inconsistente | Lógica separada options/execute | UT/CT dedicados em guided com cenários de borda |
| Dependência de YAML/JSON em runtime frontend | Erro de configuração derruba tela | Parsers com validação parcial | UT-CONFIG com casos inválidos e mensagens diagnósticas |

## Governança por fase
- Ao fechar cada fase do roadmap:
  1. Atualizar coluna `Status` dos requisitos impactados.
  2. Atualizar `Execution Evidence`.
  3. Confirmar gate aplicável (`Gate 1`, `Gate 2`, `Gate 3`).
  4. Registrar pendências e bloqueios remanescentes.

## Observações de escopo
- Esta trilha cobre compliance técnico de qualidade de software em `src`.
- Não substitui auditoria regulatória formal.
