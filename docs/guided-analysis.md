# Guided Analysis (Declarative + SQL-first)

## Overview

Guided Analysis now runs from declarative YAML files compiled into server-side JSON and executed by a backend engine over SQLite.

- Config source: `config/guided-analysis/`
- Compiled output: `server/generated/guided/catalog.json` (generated, not versioned)
- Compiler: `scripts/compile-guided-config.mjs`
- Runtime API:
  - `GET /api/guided/catalog`
  - `GET /api/guided/queries/:id/options`
  - `POST /api/guided/queries/:id/execute`

## Add a New Use Case

1. Create a query file in `config/guided-analysis/queries/uc-*.yaml`.
2. Add its `id` to `config/guided-analysis/catalog.yaml` under `query_order`.
3. Reuse an existing executor by setting `executor` in YAML:
   - `uc_ranked_metric`
   - `uc_risk_potential_scatter`
4. If needed, add a new executor in `server/guided/engine.mjs` and register it in `EXECUTOR_REGISTRY`.
5. Choose visualization types supported by frontend registry:
   - `horizontal_bar`
   - `scatter_quadrant`
   - `heatmap_matrix` (prepared for future UCs)
6. Run:
   - `npm run compile:guided`
   - `npm run typecheck`
   - `npm run build`

## Use Case Description Block (Required)

Each query YAML must define a `use_case_description` block consumed by the UI accordion:

- `scientific_question` (required string)
- `description` (required string)
- `visual_elements` (optional array of `{ title, description }`)
- `interpretation` (required array of short statements)

Editorial guidance for `interpretation`:

- Prefer exploratory/inferential language (e.g., hypothesis generation, analytical indication).
- Avoid causal or confirmatory claims without experimental support.
- Keep statements concise, explicit, and scoped to the current filtered context.

## Methods Modal Block (Required)

Each query YAML must define a `methods_modal` block used by the `View Methods` modal in Guided Analysis:

- `button_label` (required string)
- `title` (required string)
- `introduction` (required string)
- `steps` (required array with at least one item)
- each step: `title` (required), `description` (required), `bullets` (optional `string[]`)
- `footer_note` (optional string)

This content is declarative and static per use case (not execution-dependent).

## Filter Safety Model

YAML is declarative only. SQL is never built from arbitrary YAML fragments.

- Dataset-level filter whitelist is enforced in backend engine.
- Unknown filter ids are rejected.
- Operators are typed by filter type (`select`, `number_range`, `toggle`, etc.).

## Notes

- Guided execution is backend-first and read-only.
- Existing APIs outside Guided remain unchanged.
- The frontend shell is query-agnostic and driven by catalog + execution contract.
