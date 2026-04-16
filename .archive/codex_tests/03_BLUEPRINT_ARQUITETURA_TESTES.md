# Blueprint de Arquitetura de Testes

## Stack alvo
- Runner: `Vitest`
- UI/componentes: `@testing-library/react`
- Ambiente DOM: `jsdom`
- Simulação de rede: mocks de `fetch` (sem chamadas reais)
- Escopo desta fase: **unitário + integração leve** (sem E2E)

## Organização de arquivos
- Padrão de localização:
  - `src/**/__tests__/*.test.ts`
  - `src/**/__tests__/*.test.tsx`
- Organização por domínio, não por tipo de teste isolado:
  - `services`, `utils`, `config`, `components`.
- Evitar pasta única global de testes para reduzir acoplamento e facilitar ownership.

## Convenção de IDs de teste
- `UT-API-*`: unitários da camada `services/api`.
- `UT-UTIL-*`: unitários de utilitários e adapters.
- `UT-CONFIG-*`: unitários de parse/normalização de configs.
- `CT-GUIDED-*`: componentes do Guided Analysis.
- `CT-APP-*`: comportamento de roteamento/navegação.
- `CT-PAG-*`: componente de paginação.
- `CT-EXP-*`: explorers/details.

## Estratégia de mock e isolamento
- Camada `services`:
  - mock explícito de `global.fetch`.
  - validação de URL final, querystring, headers, payload e tratamento de erro.
- Camada `config`:
  - testar validações e normalização com entradas válidas e inválidas.
  - validar mensagens de erro úteis para diagnóstico.
- Camada `components`:
  - mockar apenas fronteiras externas (API/services).
  - manter regra interna real de estado e renderização.
- Evitar mocks excessivos de utilitários internos para não mascarar regressão real.

## Regras por tipo de teste

### Unitário (UT)
- Foco em função pura, transformação, parse, serialização e validação.
- Sem renderização de UI quando não houver necessidade de DOM.
- Cobrir:
  - caminhos felizes;
  - bordas de entrada;
  - fallback;
  - erros esperados.

### Integração leve de componente (CT)
- Foco em comportamento observável:
  - loading/error/success;
  - transições de estado;
  - paginação e callbacks;
  - seleção condicional e navegação.
- Mock de services na borda, mantendo componente real.
- Não usar snapshot massivo como critério principal de qualidade.

## Padrão de interfaces de teste (entrega documental)

### Classes de prioridade
- Todo caso de teste deve referenciar uma classe `P0-P3` do documento `02_*`.

### Contrato de evidência
- Cada execução relevante deve gerar evidência mínima:
  - comando executado;
  - resultado (pass/fail);
  - data;
  - referência de fase/gate.
- Evidências são registradas na matriz de compliance (`06_*`).

### Definição de gate de cobertura
- Gate 1: `>= 40%` global + módulos `P0` obrigatórios cobertos.
- Gate 2: `>= 60%` global + estabilidade de `P1` crítico.
- Gate 3: `>= 75%` global + suíte de regressão mínima de `P0/P1`.

## Princípios operacionais
- Escrever primeiro testes de baixo custo e alto impacto (`P0`).
- Evitar testes frágeis acoplados a implementação interna sem valor funcional.
- Preferir assertivas de contrato e comportamento observável.
- Tratar warnings de `exhaustive-deps` como risco explícito de stale state em CT.

## Fora de escopo nesta fase
- E2E com browser real.
- Testes de performance de frontend.
- Snapshot visual como principal mecanismo de regressão.
