---
title: HADEG Database Schema
description: Formal specification of the HADEG (Hydrocarbon Aerobic Degradation Genes) Database schema - 4-column structure for gene-pathway relationships in hydrocarbon degradation
keywords:
  - HADEG
  - database schema
  - hydrocarbon degradation
  - KEGG orthology
  - bioremediation genes
  - alkane degradation
  - aromatic degradation
  - CSV format
author: BioRemPP Development Team
version: 1.0.0
last_updated: 2026-01-17
---

# HADEG Database Schema

> **Formal specification of the HADEG Database v1.0.0 schema**

This document provides a comprehensive technical specification of the HADEG (Hydrocarbon Aerobic Degradation Genes) Database schema, designed for bioinformatics researchers studying hydrocarbon biodegradation pathways.

---

## Overview

The HADEG Database uses a **flat, denormalized schema** optimized for gene-pathway relationship queries. The schema consists of a single table with **4 columns** representing gene-KO-pathway associations for hydrocarbon aerobic degradation.

**Design rationale:**

- **Simplicity** — Single tidy table structure facilitates direct import into R, Python, and spreadsheet tools
- **Pathway-centric** — Organized by degradation pathways for functional analysis
- **Interoperability** — Standard CSV format ensures compatibility with bioinformatics pipelines
- **KEGG integration** — KO identifiers enable cross-referencing with KEGG databases

---

## Schema Definition

### Table: HADEG Database v1.0.0

**Primary format:** CSV (Comma-Separated Values)

**Rows:** 867 (as of v1.0.0)

**Columns:** 4

**Character encoding:** UTF-8

**Field delimiter:** Semicolon (`;`)

**Text qualifier:** Double quote (`"`)

**Header row:** Yes (column names in first row)

---

## Column Specifications

| # | Column Name | Data Type | Nullable | Controlled Vocabulary | Example Value |
|---|-------------|-----------|----------|----------------------|---------------|
| 1 | `Gene` | Character | No | Gene symbol | `alkB` |
| 2 | `ko` | Character | No | KEGG Orthology ID | `K00496` |
| 3 | `Pathway` | Character | No | Pathway name | `A_Terminal/biterminal_oxidation` |
| 4 | `compound_pathway` | Character | No | Compound class | `Alkanes` |

**Data completeness:** 100% — Zero missing values across all fields

---

## Column 1: `Gene`

**Column name:** `Gene`

**Data type:** Character (string)

**Format:** Standard gene nomenclature (free text)

**Example:** `ahpC`, `ahpF`, `alkB`, `alkH`

**Controlled vocabulary:** No — Free text, but standardized during curation

**Uniqueness:** Not unique — 323 unique genes, some appear in multiple pathways

**Purpose:** Identifies the gene symbol associated with hydrocarbon degradation function

**Naming conventions:**

- Short gene abbreviations (lowercase typical for microbial genes)
- May include alphanumeric suffixes (e.g., `alkB1`, `alkB2`)
- Organism-agnostic naming

**Validation rules:**

- ✅ Must be non-empty string
- ✅ Should follow standard gene nomenclature conventions

**Cardinality:** 323 unique genes in v1.0.0

---

## Column 2: `ko`

**Column name:** `ko`

**Data type:** Character (string)

**Format:** KEGG Orthology identifier

**Pattern:** `K#####` (capital K followed by exactly 5 digits)

**Example:** `K24119`, `K03386`, `K00496`

**Controlled vocabulary:** Yes — Values must exist in KEGG Orthology database

**Uniqueness:** Not unique — 337 unique KO entries, some appear in multiple pathways

**Purpose:** Links genes to functional orthologs in KEGG for cross-database integration

**Cross-references:**

- KEGG Orthology database: `https://www.kegg.jp/entry/K#####`
- KEGG Pathway maps
- BioRemPP Database (via `ko` column)

**Validation rules:**

- ✅ Must match regex: `^K\d{5}$`
- ✅ Must exist in KEGG Orthology database
- ✅ Case-sensitive (uppercase K required)

**Cardinality:** 337 unique KO entries in v1.0.0

---

## Column 3: `Pathway`

**Column name:** `Pathway`

**Data type:** Character (string)

**Format:** Pathway name (free text with prefixes)

**Example:** `A_Finnerty_pathway`, `A_Terminal/biterminal_oxidation`, `AR_benzoate`

**Controlled vocabulary:** Partially — 71 standardized pathway names

**Uniqueness:** Not unique — Multiple genes belong to each pathway

**Purpose:** Categorizes genes by their metabolic pathway in hydrocarbon degradation

**Pathway naming conventions:**

- Prefix indicates compound class: `A_` (Alkanes), `AR_` (Aromatics), `AE_` (Alkenes)
- Underscore separates pathway components
- Mixed case for readability

**Top pathways by gene count:**

| Pathway | Gene Count | Compound Class |
|---------|------------|----------------|
| `A_Terminal/biterminal_oxidation` | 45+ | Alkanes |
| `A_Finnerty_pathway` | 30+ | Alkanes |
| `AR_benzoate` | 25+ | Aromatics |
| `AR_catechol` | 20+ | Aromatics |

**Validation rules:**

- ✅ Must be non-empty string
- ✅ Should match one of 71 documented pathways

**Cardinality:** 71 unique pathways in v1.0.0

---

## Column 4: `compound_pathway`

**Column name:** `compound_pathway`

**Data type:** Character (string)

**Format:** Compound class (controlled vocabulary)

**Example:** `Alkanes`, `Alkenes`, `Aromatics`, `Cycloalkanes`, `BTEX`

**Controlled vocabulary:** Yes — Exactly 5 compound classes

**Uniqueness:** Not unique — Multiple genes/pathways belong to each class

**Purpose:** High-level classification of hydrocarbon type targeted by the degradation pathway

**Valid compound classes:**

| Class | Description | Gene Count | Example Pathways |
|-------|-------------|------------|------------------|
| `Alkanes` | Linear and branched alkanes | 350+ | Terminal oxidation, Finnerty |
| `Aromatics` | Single-ring aromatic compounds | 250+ | Benzoate, Catechol |
| `Alkenes` | Unsaturated hydrocarbons | 100+ | Propene, Styrene |
| `Cycloalkanes` | Cyclic hydrocarbons | 80+ | Cyclohexane |
| `BTEX` | Benzene, Toluene, Ethylbenzene, Xylene | 80+ | Toluene degradation |

**Validation rules:**

- ✅ Must be non-empty string
- ✅ Must match one of 5 valid compound classes exactly

**Cardinality:** 5 unique compound classes in v1.0.0

---

## Schema Constraints and Relationships

### Primary Key

**None defined** — Database uses a flat structure without explicit primary key

**Conceptual primary key:** Combination of (`Gene`, `ko`, `Pathway`) approximates uniqueness

---

### Foreign Key Relationships

**Conceptual foreign keys (not enforced):**

- `ko` → KEGG Orthology database
- `ko` → BioRemPP Database (for compound-gene integration)

**Cross-table joins:**

Users can join HADEG Database with:

- **BioRemPP Database** — via `ko` column (gene-compound relationships)
- **KEGG Orthology** — via `ko` column
- **KEGG Pathway** — via `ko` (requires additional mapping)

---

### Cardinality Relationships

#### Gene-to-Pathway

**Many-to-Many** — One gene can participate in multiple pathways, and one pathway contains multiple genes

**Example:**

- `alkB` → 5 different pathways
- `A_Terminal/biterminal_oxidation` → 45+ genes

#### Pathway-to-Compound Class

**Many-to-One** — Each pathway belongs to exactly one compound class

---

## Data Quality Specifications

### Completeness

**100% field completeness** — Zero missing values across all 4 columns

**Verification:**

```r
db <- read.csv("data/databases/hadeg_db.csv", sep=";")
colSums(is.na(db))  # Should return all zeros
```

---

### Consistency

**Identifier format consistency:**

- All `ko` values match `^K\d{5}$`
- All `compound_pathway` values match one of 5 valid classes

**Verification:**

```r
# Verify KO ID format
all(grepl("^K\\\\d{5}$", db$ko))  # Should return TRUE

# Verify compound classes
valid_classes <- c("Alkanes", "Alkenes", "Aromatics", "Cycloalkanes", "BTEX")
all(db$compound_pathway %in% valid_classes)  # Should return TRUE
```

---

### Accuracy

**Data provenance:**

- `Gene` — Curated from literature and KEGG annotations
- `ko` — Sourced from KEGG Orthology database
- `Pathway` — Expert curation based on biochemical pathways
- `compound_pathway` — Manual classification

**Source:** HADEG database (Hydrocarbon Aerobic Degradation Genes)

---

## Usage Examples

### Loading the Database

=== "R"

    ```r
    # Load database
    library(readr)
    db <- read_delim("data/databases/hadeg_db.csv", delim=";")
    
    # Inspect schema
    str(db)
    # tibble [867 × 4]
    #  $ Gene             : chr  "ahpC" "ahpF" "alkB" ...
    #  $ ko               : chr  "K24119" "K03386" "K03387" ...
    #  $ Pathway          : chr  "A_Finnerty_pathway" ...
    #  $ compound_pathway : chr  "Alkanes" "Alkenes" ...
    ```

=== "Python"

    ```python
    import pandas as pd
    
    # Load database
    db = pd.read_csv("data/databases/hadeg_db.csv", sep=";")
   
    # Inspect schema
    db.info()
    # <class 'pandas.core.frame.DataFrame'>
    # RangeIndex: 867 entries, 0 to 866
    # Data columns (total 4 columns):
    #  #   Column            Non-Null Count  Dtype 
    # ---  ------            --------------  ----- 
    #  0   Gene              867 non-null    object
    #  1   ko                867 non-null    object
    #  2   Pathway           867 non-null    object
    #  3   compound_pathway  867 non-null    object
    ```

---

### Common Queries

```r
# Find all genes in alkane degradation
alkane_genes <- db[db$compound_pathway == "Alkanes", ]

# Find pathways for a specific gene
alkB_pathways <- unique(db[db$Gene == "alkB", "Pathway"])

# Count genes per compound class
table(db$compound_pathway)
```

---

## Questions?

**GitHub Issues:** [https://github.com/BioRemPP/biorempp_db/issues](https://github.com/BioRemPP/biorempp_db/issues)  
**Email:** biorempp@gmail.com
