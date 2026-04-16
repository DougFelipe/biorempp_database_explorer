# Baseline Atual de Testes (`src`)

## Contexto do baseline
- Data de referência: **16/04/2026**.
- Escopo de inspeção: `src` (frontend React + TypeScript).
- Objetivo: registrar estado atual antes do roadmap de implementação de testes.

## Estado atual confirmado
- Não foram encontrados arquivos `*.test.*` ou `*.spec.*` em `src`.
- Não há framework de testes instalado no projeto neste momento:
  - `vitest`: ausente
  - `jest`: ausente
  - `@testing-library/react`: ausente
  - `playwright`: ausente

## Baseline técnico observado
- `npm run typecheck`: **OK**.
- `npm run lint`: **OK com 13 warnings**.
- Todos os warnings são `react-hooks/exhaustive-deps`, concentrados em componentes com carregamento assíncrono e múltiplos `useEffect`.

## Hotspots por criticidade estrutural
- `src/services/api.ts`  
  Camada de contrato frontend-backend, serialização de query, tratamento de erro HTTP e exportação CSV/JSON.
- `src/App.tsx`  
  Roteamento manual com parsing de path, alias legado (`/visualizations`) e lógica de `basePath`.
- `src/components/GuidedAnalysisPage.tsx`  
  Fluxo mais complexo de estado assíncrono (catálogo, filtros, opções dependentes, execução, paginação e recuperação de erro).
- Explorers e details assíncronos  
  `Compound/Gene/Pathway/Toxicity/CompoundClass` com padrão repetido de `useEffect`, paginação e carregamento de dados.
- Adapters e config loaders  
  `src/utils/*` e `src/config/*` com transformação de dados e parse de YAML/JSON usado em runtime.

## Pontos críticos identificados
- Roteamento manual sem biblioteca dedicada:
  - parse de rota e normalização podem quebrar deep-linking.
  - comportamento sensível a `basePath` e aliases.
- Serialização/deserialização de filtros no guided:
  - risco de payload inconsistente entre options/execute.
  - risco de estado inválido em `dependent_select`.
- Cancelamento parcial de requests assíncronas:
  - padrão de `cancelled` existe em algumas telas, mas não é homogêneo em todo fluxo.
  - risco de atualização de estado tardia (stale state/race condition).
- Dependência direta de config YAML/JSON em runtime frontend:
  - falhas de validação podem quebrar renderização sem fallback suficiente.

## Impacto do baseline para priorização
- Prioridade inicial deve iniciar por **P0** (contrato e transformação), pois dá estabilidade global.
- Em seguida avançar para **P1** (guided + roteamento + componentes assíncronos críticos).
- O baseline atual já indica ganho rápido ao testar regras puras de utilitários/configs antes de escalar para UI.
