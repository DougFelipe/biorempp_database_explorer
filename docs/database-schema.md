# Estrutura do Banco de Dados — BioRemPP Explorer

> Arquivo: `data/biorempp.sqlite`  
> Gerado por: `npm run ingest:sqlite`  
> Fontes integradas: BioRemPP v1.1.0, HADEG, KEGG, ToxCSM

---

## Visão Geral

O banco é um SQLite somente-leitura em tempo de execução, construído a partir de quatro arquivos CSV localizados em `data/raw/`. Ele consolida dados de biorremediação (compostos, genes/KOs, vias metabólicas) com predições de toxicidade de 31 endpoints. A ingestão valida, normaliza e cruza os dados antes de gravá-los, garantindo que cada tabela seja derivável e consistente com as fontes originais.

### Fontes de dados

| Fonte | Papel | Arquivo CSV |
|-------|-------|-------------|
| **BioRemPP** | Mapeamento central composto–gene | `biorempp_database_v1.1.0.csv` |
| **HADEG** | Vias de degradação de hidrocarbonetos | `hadeg_db.csv` |
| **KEGG** | Anotação de vias metabólicas | `kegg_degradation_db.csv` |
| **ToxCSM** | Predição de toxicidade (31 endpoints) | `toxcsm_db.csv` |

### Estatísticas gerais

| Entidade | Quantidade |
|----------|-----------|
| Compostos (`compound_summary`) | 384 |
| Genes/KOs (`gene_summary`) | 1.543 |
| Vias metabólicas (`pathway_summary`) | 66 |
| Registros de toxicidade (`toxicity_endpoint`) | 11.470 |
| Relações composto–gene (`compound_gene_map`) | 3.399 |
| Relações composto–via (`compound_pathway_map`) | 1.531 |
| Relações composto–agência referência (`compound_reference_map`) | 806 |
| Cards detalhados composto–gene (`compound_gene_card`) | 12.664 |
| Cards detalhados composto–via (`compound_pathway_card`) | 1.531 |
| Relações KO–via por composto (`compound_ko_pathway_rel`) | 3.747 |
| Visão geral KO por composto (`compound_ko_overview`) | 3.422 |

---

## Diagrama de Relacionamentos

```
compound_summary (cpd PK)
  │
  ├──► compound_gene_map (cpd, genesymbol)
  │         └──► gene_summary (ko PK, genesymbol)
  │
  ├──► compound_pathway_map (cpd, pathway)
  │         └──► pathway_summary (pathway, source PK)
  │
  ├──► compound_reference_map (cpd, reference_ag)
  │
  ├──► compound_metadata (cpd PK) — JSON blob com metadados extras
  │
  ├──► toxicity_endpoint (cpd, endpoint PK)
  │
  ├──► compound_gene_card (cpd, ko, genesymbol, genename, ec PK) — visão desnormalizada
  │
  ├──► compound_pathway_card (cpd, source, pathway PK) — visão desnormalizada
  │
  ├──► compound_ko_overview (cpd, ko PK) — contagem de suporte por fonte
  │
  └──► compound_ko_pathway_rel (cpd, ko, source, pathway PK) — relação 4-dimensional
```

> **Nota sobre chaves estrangeiras:** O SQLite não aplica `FOREIGN KEY` em modo `readonly`. As relações acima são semânticas e garantidas pelo script de ingestão, não pelo motor do banco.

---

## Tabelas — Referência Detalhada

### 1. `compound_summary`

**Papel:** Tabela principal de compostos. Agrega contagens e métricas calculadas durante a ingestão. É o ponto de entrada para navegação e filtragem de compostos na UI.

**Cardinalidade:** 384 linhas (uma por composto KEGG único)

| Coluna | Tipo | PK | Descrição |
|--------|------|----|-----------|
| `cpd` | TEXT | ✓ | Identificador KEGG do composto (ex.: `C00084`) |
| `compoundname` | TEXT | | Nome comum do composto (ex.: `Acetaldehyde`) |
| `compoundclass` | TEXT | | Classe química (ver lista abaixo) |
| `reference_ag` | TEXT | | Agências regulatórias que listam o composto, separadas por `;` |
| `reference_count` | INTEGER | | Número de agências referenciando o composto |
| `ko_count` | INTEGER | | Quantidade de KOs associados |
| `gene_count` | INTEGER | | Quantidade de genes únicos associados |
| `pathway_count` | INTEGER | | Quantidade de vias metabólicas associadas |
| `toxicity_risk_mean` | REAL | | Média dos 31 scores de toxicidade (0–1) |
| `high_risk_endpoint_count` | INTEGER | | Número de endpoints com score > 0.5 |
| `toxicity_scores` | TEXT | | JSON com os 31 scores individuais (ex.: `{"avian": 0.01, ...}`) |
| `smiles` | TEXT | | Representação SMILES da estrutura molecular |
| `genes` | TEXT | | JSON array com símbolos dos genes associados |
| `pathways` | TEXT | | JSON array com nomes das vias associadas |
| `updated_at` | TEXT | | Timestamp da ingestão |

**Classes de compostos disponíveis:**

| Classe | Compostos |
|--------|-----------|
| Aromatic | 76 |
| Nitrogen-containing | 68 |
| Polyaromatic | 65 |
| Aliphatic | 63 |
| Chlorinated | 54 |
| Metal | 22 |
| Inorganic | 13 |
| Organophosphorus | 11 |
| Sulfur-containing | 5 |
| Halogenated | 4 |
| Organometallic | 2 |
| Organosulfur | 1 |

**Índices:**

```sql
idx_compound_summary_class              ON (compoundclass)
idx_compound_summary_reference          ON (reference_ag)
idx_compound_summary_reference_count    ON (reference_count)
idx_compound_summary_toxicity_risk_mean ON (toxicity_risk_mean)
idx_compound_summary_high_risk_endpoint_count ON (high_risk_endpoint_count)
idx_compound_summary_ko_count           ON (ko_count)
idx_compound_summary_gene_count         ON (gene_count)
```

---

### 2. `gene_summary`

**Papel:** Tabela principal de genes/KOs. Cada linha representa um KO (KEGG Orthology) com seu símbolo e nome de gene, além de contagens derivadas.

**Cardinalidade:** 1.543 linhas

| Coluna | Tipo | PK | Descrição |
|--------|------|----|-----------|
| `ko` | TEXT | ✓ | Identificador KO (ex.: `K00001`) |
| `genesymbol` | TEXT | | Símbolo do gene (ex.: `E1.1.1.1`, `ADH1`) |
| `genename` | TEXT | | Nome completo do gene (ex.: `alcohol dehydrogenase`) |
| `compound_count` | INTEGER | | Número de compostos que ativam este gene |
| `pathway_count` | INTEGER | | Número de vias em que este gene participa |
| `enzyme_activities` | TEXT | | JSON array com atividades enzimáticas (ex.: `["dehydrogenase"]`) |
| `updated_at` | TEXT | | Timestamp da ingestão |

**Índices:**

```sql
idx_gene_summary_symbol         ON (genesymbol)
idx_gene_summary_compound_count ON (compound_count)
```

---

### 3. `pathway_summary`

**Papel:** Tabela de vias metabólicas. A chave é composta por `(pathway, source)` porque o mesmo nome de via pode existir em HADEG e KEGG com compostos diferentes.

**Cardinalidade:** 66 linhas (47 HADEG + 19 KEGG)

| Coluna | Tipo | PK | Descrição |
|--------|------|----|-----------|
| `pathway` | TEXT | ✓ | Nome da via (ex.: `Aromatic`, `Naphthalene`) |
| `source` | TEXT | ✓ | Banco de origem: `HADEG` ou `KEGG` |
| `compound_count` | INTEGER | | Número de compostos nesta via |
| `gene_count` | INTEGER | | Número de genes/KOs envolvidos nesta via |
| `updated_at` | TEXT | | Timestamp da ingestão |

**Índices:**

```sql
idx_pathway_summary_source ON (source)
```

---

### 4. `toxicity_endpoint`

**Papel:** Tabela normalizada de predições de toxicidade. Cada linha representa um score de um endpoint específico para um composto. Derivada inteiramente do ToxCSM.

**Cardinalidade:** 11.470 linhas (≈ 370 compostos × 31 endpoints)

| Coluna | Tipo | PK | Descrição |
|--------|------|----|-----------|
| `cpd` | TEXT | ✓ | Identificador KEGG do composto |
| `endpoint` | TEXT | ✓ | Nome do endpoint de toxicidade (ver lista abaixo) |
| `compoundname` | TEXT | | Nome do composto (desnormalizado para queries rápidas) |
| `compoundclass` | TEXT | | Classe do composto (desnormalizado) |
| `label` | TEXT | | Classificação qualitativa: `High Safety`, `Low Safety`, `High Risk` |
| `value` | REAL | | Score numérico de probabilidade (0.0–1.0) |
| `updated_at` | TEXT | | Timestamp da ingestão |

**Os 31 endpoints de toxicidade:**

| Categoria | Endpoints |
|-----------|-----------|
| **Ecotoxicidade** | `avian`, `crustacean`, `fathead_minnow`, `honey_bee`, `t._pyriformis` |
| **Biodegradabilidade** | `biodegradation` |
| **Irritação/Corrosão** | `eye_corrosion`, `eye_irritation`, `skin_sensitisation`, `respiratory_disease` |
| **Genotoxicidade** | `genomic_ames_mutagenesis`, `genomic_carcinogenesis`, `genomic_micronucleus` |
| **Cardiotoxicidade** | `herg_i_inhibitor`, `herg_ii_inhibitor` |
| **Hepatotoxicidade** | `liver_injury_i`, `liver_injury_ii` |
| **Receptores nucleares (NR)** | `nr_ahr`, `nr_ar`, `nr_ar_lbd`, `nr_aromatase`, `nr_er`, `nr_er_lbd`, `nr_gr`, `nr_ppar_gamma`, `nr_tr` |
| **Vias de sinalização (SR)** | `sr_are`, `sr_atad5`, `sr_hse`, `sr_mmp`, `sr_p53` |

**Índices:**

```sql
idx_toxicity_endpoint_endpoint      ON (endpoint)
idx_toxicity_endpoint_label         ON (label)
idx_toxicity_endpoint_value         ON (value)
idx_toxicity_endpoint_compoundclass ON (compoundclass)
idx_toxicity_endpoint_compoundname  ON (compoundname)
```

---

### 5. `compound_gene_map`

**Papel:** Tabela de junção simples composto–gene. Usada para queries de relacionamento direto sem necessidade dos detalhes da `compound_gene_card`.

**Cardinalidade:** 3.399 linhas

| Coluna | Tipo | PK | Descrição |
|--------|------|----|-----------|
| `cpd` | TEXT | ✓ | Identificador KEGG do composto |
| `genesymbol` | TEXT | ✓ | Símbolo do gene |

**Índices:**

```sql
idx_compound_gene_map_cpd  ON (cpd)
idx_compound_gene_map_gene ON (genesymbol)
```

---

### 6. `compound_pathway_map`

**Papel:** Tabela de junção simples composto–via. Análoga à `compound_gene_map` para vias.

**Cardinalidade:** 1.531 linhas

| Coluna | Tipo | PK | Descrição |
|--------|------|----|-----------|
| `cpd` | TEXT | ✓ | Identificador KEGG do composto |
| `pathway` | TEXT | ✓ | Nome da via metabólica |

**Índices:**

```sql
idx_compound_pathway_map_cpd     ON (cpd)
idx_compound_pathway_map_pathway ON (pathway)
```

---

### 7. `compound_reference_map`

**Papel:** Mapeamento entre compostos e agências regulatórias que os listam como poluentes prioritários.

**Cardinalidade:** 806 linhas

| Coluna | Tipo | PK | Descrição |
|--------|------|----|-----------|
| `cpd` | TEXT | ✓ | Identificador KEGG do composto |
| `reference_ag` | TEXT | ✓ | Código da agência regulatória |

**Agências disponíveis:** `ATSDR`, `CONAMA`, `EPA`, `EPC`, `IARC1`, `IARC2A`, `IARC2B`, `PSL`, `WFD`

**Índices:**

```sql
idx_compound_reference_map_cpd       ON (cpd)
idx_compound_reference_map_reference ON (reference_ag)
```

---

### 8. `compound_metadata`

**Papel:** Armazena metadados adicionais de cada composto em formato JSON. Usado para informações que não se encaixam nas colunas estruturadas de `compound_summary`.

**Cardinalidade:** 384 linhas (uma por composto)

| Coluna | Tipo | PK | Descrição |
|--------|------|----|-----------|
| `cpd` | TEXT | ✓ | Identificador KEGG do composto |
| `metadata_json` | TEXT | | Blob JSON com metadados extras (`{}` se ausente) |
| `updated_at` | TEXT | | Timestamp da ingestão |

---

### 9. `compound_gene_card`

**Papel:** Visão desnormalizada e enriquecida da relação composto–gene. Inclui detalhes enzimáticos, número EC, reações KEGG e suas descrições. Usada para renderizar os "cards" de gene na página de detalhes de um composto.

**Cardinalidade:** 12.664 linhas

| Coluna | Tipo | PK | Descrição |
|--------|------|----|-----------|
| `cpd` | TEXT | ✓ | Identificador KEGG do composto |
| `ko` | TEXT | ✓ | Identificador KO |
| `genesymbol` | TEXT | ✓ | Símbolo do gene |
| `genename` | TEXT | ✓ | Nome completo do gene |
| `enzyme_activity` | TEXT | ✓ | Tipo de atividade enzimática (ex.: `dehydrogenase`) |
| `ec` | TEXT | ✓ | Número EC da enzima (ex.: `1.1.1.1`) |
| `reactions` | TEXT | | JSON array com IDs de reações KEGG (ex.: `["R00623", ...]`) |
| `reaction_descriptions` | TEXT | | JSON array com descrições das reações |
| `supporting_rows` | INTEGER | | Número de linhas fonte que suportam esta relação |
| `updated_at` | TEXT | | Timestamp da ingestão |

**Índices:**

```sql
idx_compound_gene_card_cpd    ON (cpd)
idx_compound_gene_card_symbol ON (genesymbol)
idx_compound_gene_card_ko     ON (ko)
```

---

### 10. `compound_pathway_card`

**Papel:** Visão desnormalizada da relação composto–via, incluindo a fonte (HADEG/KEGG) e o número de linhas de suporte.

**Cardinalidade:** 1.531 linhas

| Coluna | Tipo | PK | Descrição |
|--------|------|----|-----------|
| `cpd` | TEXT | ✓ | Identificador KEGG do composto |
| `source` | TEXT | ✓ | Banco de origem: `HADEG` ou `KEGG` |
| `pathway` | TEXT | ✓ | Nome da via |
| `supporting_rows` | INTEGER | | Número de linhas fonte que suportam esta relação |
| `updated_at` | TEXT | | Timestamp da ingestão |

**Índices:**

```sql
idx_compound_pathway_card_cpd     ON (cpd)
idx_compound_pathway_card_source  ON (source)
idx_compound_pathway_card_pathway ON (pathway)
```

---

### 11. `compound_ko_overview`

**Papel:** Sumariza quantas vezes um par `(cpd, ko)` aparece nas fontes, com discriminação por banco (HADEG vs KEGG). Útil para visualizações de cobertura e heatmaps.

**Cardinalidade:** 3.422 linhas

| Coluna | Tipo | PK | Descrição |
|--------|------|----|-----------|
| `cpd` | TEXT | ✓ | Identificador KEGG do composto |
| `ko` | TEXT | ✓ | Identificador KO |
| `relation_count_total` | INTEGER | | Total de relações suportadas por todas as fontes |
| `relation_count_hadeg` | INTEGER | | Relações provenientes do HADEG |
| `relation_count_kegg` | INTEGER | | Relações provenientes do KEGG |
| `updated_at` | TEXT | | Timestamp da ingestão |

**Índices:**

```sql
idx_compound_ko_overview_cpd   ON (cpd)
idx_compound_ko_overview_ko    ON (ko)
idx_compound_ko_overview_total ON (relation_count_total)
```

---

### 12. `compound_ko_pathway_rel`

**Papel:** Tabela de fatos de quatro dimensões: relaciona um composto a um KO, em uma via específica, proveniente de uma fonte específica. É a tabela mais granular do banco e a base para análises cruzadas.

**Cardinalidade:** 3.747 linhas

| Coluna | Tipo | PK | Descrição |
|--------|------|----|-----------|
| `cpd` | TEXT | ✓ | Identificador KEGG do composto |
| `ko` | TEXT | ✓ | Identificador KO |
| `source` | TEXT | ✓ | Banco de origem: `HADEG` ou `KEGG` |
| `pathway` | TEXT | ✓ | Nome da via metabólica |
| `updated_at` | TEXT | | Timestamp da ingestão |

**Índices:**

```sql
idx_compound_ko_pathway_rel_cpd           ON (cpd)
idx_compound_ko_pathway_rel_ko            ON (ko)
idx_compound_ko_pathway_rel_source_pathway ON (source, pathway)
```

---

## Padrões de Design do Schema

### Chave primária composta vs. surrogate key
Todas as tabelas usam chaves primárias compostas de colunas de negócio (sem `id` autoincremental). Isso garante unicidade semântica desde a ingestão e simplifica joins sem a necessidade de resolver surrogate keys.

### Desnormalização controlada
As tabelas `compound_gene_card` e `compound_pathway_card` repetem colunas presentes em `gene_summary` e `pathway_summary` (como `genename`, `enzyme_activity`). Isso é intencional: evita joins custosos nas queries de detalhes de composto, que são as mais frequentes na UI.

### JSON como coluna
Colunas como `toxicity_scores`, `genes`, `pathways`, `reactions` e `metadata_json` armazenam arrays/objetos JSON em `TEXT`. Isso é adequado para SQLite porque:
- Os dados são consumidos no frontend sem transformações intermediárias;
- Evita a criação de tabelas de junção adicionais para dados que só são lidos em bloco;
- A `toxicity_endpoint` normalizada existe em paralelo para queries que precisam filtrar por endpoint individual.

### Timestamps de auditoria
Todas as tabelas possuem `updated_at TEXT DEFAULT datetime('now')`, registrando o momento da ingestão. Não há atualização incremental — o banco é sempre regenerado integralmente.

### Estratégia de indexação
Os índices cobrem:
- Todas as colunas de filtro expostas pela API (classe, agência, contagens, scores);
- Todas as colunas usadas em JOINs frequentes (`cpd`, `ko`, `genesymbol`, `pathway`);
- Colunas de ordenação (`relation_count_total`, `compound_count`, `value`).

Não há índices em `updated_at` (nunca filtrado) nem em colunas JSON (não suportado nativamente).

