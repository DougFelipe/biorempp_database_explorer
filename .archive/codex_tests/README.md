# Suite de Documentação de Testes (`src`)

## Escopo
- Esta suíte cobre **somente** o diretório `src`.
- Não inclui `server`, `scripts`, `config` fora do consumo do frontend e não inclui E2E nesta fase.

## Objetivo
- Definir uma base documental única para implementação de testes.
- Priorizar por risco arquitetural e impacto funcional.
- Padronizar linguagem de execução, rastreabilidade e compliance técnico.

## Ordem de leitura recomendada
1. `01_BASELINE_ATUAL.md`  
   Contexto técnico observado hoje e riscos já presentes.
2. `02_CLASSES_PRIORIDADE_E_RISCO.md`  
   Taxonomia `P0-P3` e matriz por módulo.
3. `03_BLUEPRINT_ARQUITETURA_TESTES.md`  
   Stack alvo, organização de testes e padrões de interface.
4. `04_CATALOGO_TESTES.md`  
   Backlog de cenários com ID, objetivo e risco coberto.
5. `05_ROADMAP_IMPLEMENTACAO.md`  
   Fases de entrega e gates progressivos.
6. `06_COMPLIANCE_TRACEABILIDADE.md`  
   Matriz requisito-risco-teste-evidência e critérios de aceite.

## Glossário rápido
- `P0`: crítico para contrato de dados e regras centrais; quebra gera regressão de alto impacto.
- `P1`: fluxo crítico de UI com estado assíncrono; risco alto de regressão funcional.
- `P2`: fluxo funcional relevante de exploração/detalhe; risco moderado.
- `P3`: componente apresentacional; risco baixo.
- `UT`: teste unitário (função/comportamento isolado).
- `CT`: teste de componente/integrado leve (UI + estado + mocks).
- `Gate`: critério mínimo obrigatório para avanço de fase (cobertura + estabilidade + evidência).

## Premissas consolidadas
- Idioma oficial da suíte: **PT-BR**.
- Estratégia confirmada: **unitários + integração leve**.
- Compliance alvo: **qualidade de software** (não regulatório formal nesta fase).
- Entrega documental sem alteração de API pública do produto.

## Public APIs / Interfaces / Types
- **Sem mudança de API pública do produto** nesta entrega.
- O padrão de interfaces de teste está definido em `03_BLUEPRINT_ARQUITETURA_TESTES.md`, cobrindo:
  - convenção de IDs de teste;
  - classes de prioridade `P0-P3`;
  - contrato de evidência para compliance;
  - definição de gates de cobertura por fase.

## Test Plan da própria suíte documental
- Verificar existência dos 7 arquivos em `.archive/codex_tests`.
- Validar se cada documento contém as seções obrigatórias previstas no plano.
- Conferir consistência cruzada entre:
  - prioridades em `02_*`;
  - cenários em `04_*`;
  - fases e gates em `05_*`;
  - rastreabilidade em `06_*`.
- Revisar se todos os hotspots do baseline aparecem no catálogo e no roadmap.

## Assumptions
- Escopo restrito a `src` (sem `server` nesta suíte inicial).
- Compliance focado em qualidade de software.
- Sem E2E nesta fase inicial.
