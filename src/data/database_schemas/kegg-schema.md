---
title: KEGG Degradation Database Schema
description: Formal specification of the KEGG Degradation Database schema - 3-column structure for gene-pathway relationships in xenobiotic/pollutant degradation from KEGG
keywords:
  - KEGG
  - database schema
  - xenobiotic degradation
  - KEGG orthology
  - bioremediation
  - aromatic degradation
  - naphthalene
  - cytochrome P450
author: BioRemPP Development Team
version: 1.0.0
last_updated: 2026-01-17
---

# KEGG Degradation Database Schema

> **Formal specification of the KEGG Degradation Database v1.0.0 schema**

This document provides a comprehensive technical specification of the KEGG Degradation Database schema, containing genes involved in xenobiotic and pollutant degradation pathways extracted from KEGG.

---

## Overview

The KEGG Degradation Database uses a **flat, denormalized schema** optimized for gene-pathway queries. The schema consists of a single table with **3 columns** representing KO-pathway-genesymbol associations for degradation pathways.

**Design rationale:**

- **Simplicity** — Minimal 3-column structure for focused pathway analysis
- **KEGG-sourced** — All data extracted from official KEGG pathways
- **Interoperability** — Standard CSV format ensures compatibility with bioinformatics pipelines
- **Cross-reference ready** — KO identifiers enable integration with BioRemPP and HADEG databases

---

## Schema Definition

### Table: KEGG Degradation Database v1.0.0

**Primary format:** CSV (Comma-Separated Values)

**Rows:** 855 (as of v1.0.0)

**Columns:** 3

**Character encoding:** UTF-8

**Field delimiter:** Semicolon (`;`)

**Text qualifier:** Double quote (`"`)

**Header row:** Yes (column names in first row)

---

## Column Specifications

| # | Column Name | Data Type | Nullable | Controlled Vocabulary | Example Value |
|---|-------------|-----------|----------|----------------------|---------------|
| 1 | `ko` | Character | No | KEGG Orthology ID | `K00001` |
| 2 | `pathname` | Character | No | Pathway name | `Naphthalene` |
| 3 | `genesymbol` | Character | No | Gene symbol | `E1.1.1.1` |

**Data completeness:** 100% — Zero missing values across all fields

---

## Column 1: `ko`

**Column name:** `ko`

**Data type:** Character (string)

**Format:** KEGG Orthology identifier

**Pattern:** `K#####` (capital K followed by exactly 5 digits)

**Example:** `K00001`, `K00002`, `K00022`

**Controlled vocabulary:** Yes — Values must exist in KEGG Orthology database

**Uniqueness:** Not unique — 517 unique KO entries, some appear in multiple pathways

**Purpose:** Links genes to functional orthologs in KEGG for cross-database integration

**Cross-references:**

- KEGG Orthology database: `https://www.kegg.jp/entry/K#####`
- KEGG Pathway maps
- BioRemPP Database (via `ko` column)
- HADEG Database (via `ko` column)

**Validation rules:**

- ✅ Must match regex: `^K\d{5}$`
- ✅ Must exist in KEGG Orthology database
- ✅ Case-sensitive (uppercase K required)

**Cardinality:** 517 unique KO entries in v1.0.0

---

## Column 2: `pathname`

**Column name:** `pathname`

**Data type:** Character (string)

**Format:** Pathway name (human-readable)

**Example:** `Naphthalene`, `Cytochrome P450`, `Aromatic`, `Chloroalkane`

**Controlled vocabulary:** Partially — 20 standardized pathway names

**Uniqueness:** Not unique — Multiple genes belong to each pathway

**Purpose:** Categorizes genes by their KEGG degradation pathway

**Valid pathway names:**

| Pathway | Description |
|---------|-------------|
| `Naphthalene` | Naphthalene degradation  |
| `Cytochrome P450` | Cytochrome P450 metabolism |
| `Aromatic` | General aromatic degradation |
| `Benzoate` | Benzoate degradation (map00362) |
| `Aminobenzoate` | Aminobenzoate degradation |
| `Chloroalkane` | Chloroalkane/chloroalkene degradation |
| `Chlorocyclohexane` | Chlorocyclohexane/chlorobenzene |
| `Toluene` | Toluene degradation |
| `Xylene` | Xylene degradation |
| `Styrene` | Styrene degradation |
| `Fluorobenzoate` | Fluorobenzoate degradation |
| `Dioxin` | Dioxin degradation |
| `Nitrotoluene` | Nitrotoluene degradation |
| `Ethylbenzene` | Ethylbenzene degradation |
| `Caprolactam` | Caprolactam degradation |
| `Atrazine` | Atrazine degradation |
| `Bisphenol` | Bisphenol degradation |
| `Polycyclic` | Polycyclic aromatic degradation |
| `Furfural` | Furfural degradation |

**Validation rules:**

- ✅ Must be non-empty string
- ✅ Should match one of 20 documented pathways

**Cardinality:** 20 unique pathways in v1.0.0

---

## Column 3: `genesymbol`

**Column name:** `genesymbol`

**Data type:** Character (string)

**Format:** Standard gene nomenclature (free text)

**Example:** `E1.1.1.1`, `AKR1A1`, `HADH`, `nahAc`

**Controlled vocabulary:** No — Free text, sourced from KEGG KO annotations

**Uniqueness:** Not unique — 513 unique symbols, some shared across pathways

**Purpose:** Provides short gene abbreviation for the associated KO group

**Naming conventions:**

- EC number format for enzymes (e.g., `E1.1.1.1`)
- HUGO nomenclature for human genes (e.g., `AKR1A1`)
- Organism-specific symbols for microbial genes (e.g., `nahAc`)

**Validation rules:**

- ✅ Must be non-empty string
- ✅ Should correspond to KEGG KO annotation

**Cardinality:** 513 unique gene symbols in v1.0.0

---

## Schema Constraints and Relationships

### Primary Key

**None defined** — Database uses a flat structure without explicit primary key

**Conceptual primary key:** Combination of (`ko`, `pathname`) approximates uniqueness

---

### Foreign Key Relationships

**Conceptual foreign keys (not enforced):**

- `ko` → KEGG Orthology database
- `ko` → BioRemPP Database
- `ko` → HADEG Database

**Cross-table joins:**

Users can join KEGG Degradation Database with:

- **BioRemPP Database** — via `ko` column (compound-gene relationships)
- **HADEG Database** — via `ko` column (pathway details)
- **KEGG Orthology** — via `ko` column

---

### Cardinality Relationships

#### KO-to-Pathway

**Many-to-Many** — One KO can participate in multiple pathways, and one pathway contains multiple KOs

**Example:**

- `K00001` → 3 different pathways
- `Naphthalene` → 50+ KO entries

---

## Data Quality Specifications

### Completeness

**100% field completeness** — Zero missing values across all 3 columns

**Verification:**

```r
db <- read.csv("data/databases/kegg_degradation_db.csv", sep=";")
colSums(is.na(db))  # Should return all zeros
```

---

### Consistency

**Identifier format consistency:**

- All `ko` values match `^K\d{5}$`

**Verification:**

```r
# Verify KO ID format
all(grepl("^K\\\\d{5}$", db$ko))  # Should return TRUE
```

---

### Accuracy

**Data provenance:**

- `ko` — Sourced from KEGG Orthology database
- `pathname` — Extracted from KEGG Pathway database
- `genesymbol` — Sourced from KEGG KO annotations

**Source:** KEGG Pathway Database — Metabolism → Xenobiotics biodegradation and metabolism

---

## Usage Examples

### Loading the Database

=== "R"

    ```r
    # Load database
    library(readr)
    db <- read_delim("data/databases/kegg_degradation_db.csv", delim=";")
    
    # Inspect schema
    str(db)
    # tibble [855 × 3]
    #  $ ko         : chr  "K00001" "K00002" "K00022" ...
    #  $ pathname   : chr  "Naphthalene" "Cytochrome P450" ...
    #  $ genesymbol : chr  "E1.1.1.1" "AKR1A1" ...
    ```

=== "Python"

    ```python
    import pandas as pd
    
    # Load database
    db = pd.read_csv("data/databases/kegg_degradation_db.csv", sep=";")
   
    # Inspect schema
    db.info()
    # <class 'pandas.core.frame.DataFrame'>
    # RangeIndex: 855 entries, 0 to 854
    # Data columns (total 3 columns):
    #  #   Column      Non-Null Count  Dtype 
    # ---  ------      --------------  ----- 
    #  0   ko          855 non-null    object
    #  1   pathname    855 non-null    object
    #  2   genesymbol  855 non-null    object
    ```

---

### Common Queries

```r
# Find all genes in naphthalene degradation
naphthalene_genes <- db[db$pathname == "Naphthalene", ]

# Count genes per pathway
table(db$pathname)

# Find pathways for a specific KO
ko_pathways <- unique(db[db$ko == "K00001", "pathname"])
```

---

## Questions?

**GitHub Issues:** [https://github.com/BioRemPP/biorempp_db/issues](https://github.com/BioRemPP/biorempp_db/issues)  
**Email:** biorempp@gmail.com
