---
title: ToxCSM Database Schema
description: Formal specification of the ToxCSM Database schema - 66-column structure for toxicological predictions of environmental compounds
keywords:
  - ToxCSM
  - database schema
  - toxicology
  - QSAR predictions
  - environmental toxicity
  - ecotoxicity
  - SMILES
  - ChEBI
  - hERG inhibition
author: BioRemPP Development Team
version: 1.0.0
last_updated: 2026-01-17
---

# ToxCSM Database Schema

> **Formal specification of the ToxCSM Database v1.0.0 schema**

This document provides a comprehensive technical specification of the ToxCSM (Toxicity Computational Structural Model) Database schema, containing computational toxicological predictions for environmental compounds.

---

## Overview

The ToxCSM Database uses a **wide-format schema** optimized for multi-endpoint toxicological analysis. The schema consists of a single table with **66 columns** representing compound identifiers, structural information, and 31 toxicological endpoint predictions (both labels and numeric values).

**Design rationale:**

- **Comprehensive** — 31 toxicological endpoints with both categorical labels and numeric scores
- **Multi-database integration** — KEGG, ChEBI, and SMILES identifiers enable cross-referencing
- **Risk assessment** — Categories (High Safety, Medium Safety, Low Safety, etc.) enable rapid risk classification

---

## Schema Definition

### Table: ToxCSM Database v1.0.0

**Primary format:** CSV (Comma-Separated Values)

**Rows:** 370 (as of v1.0.0)

**Columns:** 66

**Character encoding:** UTF-8

**Field delimiter:** Semicolon (`;`)

**Text qualifier:** Double quote (`"`)

**Header row:** Yes (column names in first row)

---

## Column Organization

The 66 columns are organized into three categories:

### 1. Compound Identifiers (4 columns)

| # | Column Name | Data Type | Description |
|---|-------------|-----------|-------------|
| 1 | `SMILES` | Character | Simplified Molecular Input Line Entry System |
| 2 | `cpd` | Character | KEGG Compound ID |
| 3 | `ChEBI` | Character | Chemical Entities of Biological Interest ID |
| 4 | `compoundname` | Character | Human-readable compound name |

### 2. Toxicity Labels (31 columns)

Categorical predictions with 6 possible values: `High Safety`, `Medium Safety`, `Low Safety`, `Low Toxicity`, `Medium Toxicity`, `High Toxicity`

### 3. Toxicity Values (31 columns)

Numeric scores (0.0 - 1.0) representing prediction confidence/probability

---

## Identifier Columns

### Column 1: `SMILES`

**Column name:** `SMILES`

**Data type:** Character (string)

**Format:** SMILES notation (Simplified Molecular Input Line Entry System)

**Example:** `[Ni+2]`, `C[C@@H](Oc1ccc(Cl)cc1Cl)C(=O)O`

**Controlled vocabulary:** No — Chemical structure notation

**Uniqueness:** Unique — 370 unique SMILES (one per compound)

**Purpose:** Machine-readable molecular structure representation for cheminformatics

**Validation rules:**

- ✅ Must be valid SMILES notation
- ✅ Must be non-empty string

**Cardinality:** 370 unique SMILES in v1.0.0

---

### Column 2: `cpd`

**Column name:** `cpd`

**Data type:** Character (string)

**Format:** KEGG Compound identifier

**Pattern:** `C#####` (capital C followed by exactly 5 digits)

**Example:** `C19609`, `C19610`, `C20685`

**Controlled vocabulary:** Yes — Values must exist in KEGG Compound database

**Uniqueness:** Unique — 370 unique compound IDs

**Purpose:** Links to KEGG Compound database for cross-reference

**Cross-references:**

- KEGG Compound database: `https://www.kegg.jp/entry/C#####`
- BioRemPP Database (via `cpd` column)

**Validation rules:**

- ✅ Must match regex: `^C\d{5}$`
- ✅ Must exist in KEGG Compound database

**Cardinality:** 370 unique compounds in v1.0.0

---

### Column 3: `ChEBI`

**Column name:** `ChEBI`

**Data type:** Character (string)

**Format:** ChEBI identifier

**Pattern:** `CHEBI:#####` (CHEBI prefix followed by numeric ID)

**Example:** `CHEBI:29035`, `CHEBI:49786`, `CHEBI:75288`

**Controlled vocabulary:** Yes — Values must exist in ChEBI database

**Uniqueness:** Unique — 370 unique ChEBI IDs

**Purpose:** Links to ChEBI (Chemical Entities of Biological Interest) database

**Cross-references:**

- ChEBI database: `https://www.ebi.ac.uk/chebi/searchId.do?chebiId=CHEBI:#####`

**Cardinality:** 370 unique ChEBI IDs in v1.0.0

---

### Column 4: `compoundname`

**Column name:** `compoundname`

**Data type:** Character (string)

**Format:** Free text (chemical nomenclature)

**Example:** `Nickel(2+)`, `Manganese(2+)`, `(R)-(2,4-Dichlorophenoxy)propanoic acid`

**Controlled vocabulary:** No — Free text from KEGG

**Uniqueness:** Unique — 370 unique names

**Purpose:** Human-readable compound name for display and search

**Cardinality:** 370 unique names in v1.0.0

---

## Toxicity Endpoint Columns

### Label Columns (Categorical)

All label columns use a 6-level categorical scale:

| Category | Interpretation |
|----------|---------------|
| `High Safety` | Minimal toxicity concern |
| `Medium Safety` | Low toxicity concern |
| `Low Safety` | Moderate toxicity concern |
| `Low Toxicity` | Moderate toxicity observed |
| `Medium Toxicity` | Significant toxicity |
| `High Toxicity` | Severe toxicity concern |

### Toxicological Endpoints (31 total)

| Endpoint Category | Endpoint | Label Column | Value Column | Samples | Source |
|-------------------|----------|--------------|--------------|---------|--------|
| **Environmental** | | | | | |
| | Avian | `label_Avian` | `value_Avian` | 591 (501/90) | Zhang et al., 2015 |
| | Biodegradation | `label_Biodegradation` | `value_Biodegradation` | 1592 (1007/585) | Cheng et al., 2012 |
| | Crustacean | `label_Crustacean` | `value_Crustacean` | 1020 (487/533) | Cao et al., 2018 |
| | Fathead Minnow | `label_Fathead_Minnow` | `value_Fathead_Minnow` | 554 (188/366) | Fei-xiong et al., 2010 |
| | Honey Bee | `label_Honey_Bee` | `value_Honey_Bee` | 195 (96/99) | Fei-xiong et al., 2010 |
| | T. Pyriformis | `label_T._Pyriformis` | `value_T._Pyriformis` | 1571 (354/1217) | Cheng et al., 2011 |
| **Genomic** | | | | | |
| | AMES Mutagenesis | `label_Genomic_AMES_Mutagenesis` | `value_Genomic_AMES_Mutagenesis` | 8102 (3470/4632) | Xu et al., 2012 |
| | Carcinogenesis | `label_Genomic_Carcinogenesis` | `value_Genomic_Carcinogenesis` | 278 (220/58) | Li et al., 2015 |
| | Micronucleus | `label_Genomic_Micronucleus` | `value_Genomic_Micronucleus` | 641 (377/264) | Fan et al., 2018 |
| **Organic** | | | | | |
| | Eye Corrosion | `label_Eye_Corrosion` | `value_Eye_Corrosion` | 2299 (1412/887) | Wang et al., 2017 |
| | Eye Irritation | `label_Eye_Irritation` | `value_Eye_Irritation` | 5220 (1346/3874) | Wang et al., 2017 |
| | hERG I Inhibitor | `label_hERG_I_Inhibitor` | `value_hERG_I_Inhibitor` | 368 (289/79) | Marchese et al., 2011 |
| | hERG II Inhibitor | `label_hERG_II_Inhibitor` | `value_hERG_II_Inhibitor` | 806 (373/433) | Wang et al., 2012 |
| | Liver Injury I | `label_Liver_Injury_I` | `value_Liver_Injury_I` | 515 (277/238) | Fourches et al., 2010 |
| | Liver Injury II | `label_Liver_Injury_II` | `value_Liver_Injury_II` | 960 (670/290) | Mulliner et al., 2016 |
| | Respiratory Disease | `label_Respiratory_Disease` | `value_Respiratory_Disease` | 2529 (1089/1440) | Wang et al., 2021 |
| | Skin Sensitisation | `label_Skin_Sensitisation` | `value_Skin_Sensitisation` | 404 (130/274) | Alves et al, 2015 |
| **Nuclear Response** | | | | | |
| | NR-AhR | `label_NR_AhR` | `value_NR_AhR` | 6876 (6088/788) | Huang et al., 2016 |
| | NR-AR | `label_NR_AR` | `value_NR_AR` | 7583 (7307/276) | Huang et al., 2016 |
| | NR-AR-LBD | `label_NR_AR_LBD` | `value_NR_AR_LBD` | 6922 (6698/224) | Huang et al., 2016 |
| | NR-Aromatase | `label_NR_Aromatase` | `value_NR_Aromatase` | 5961 (5664/297) | Huang et al., 2016 |
| | NR-ER | `label_NR_ER` | `value_NR_ER` | 6437 (5725/712) | Huang et al., 2016 |
| | NR-ER-LBD | `label_NR_ER_LBD` | `value_NR_ER_LBD` | 7133 (6813/320) | Huang et al., 2016 |
| | NR-GR | `label_NR_GR` | `value_NR_GR` | 6055 (5454/601) | Sun et al., 2019 |
| | NR-PPAR-gamma | `label_NR_PPAR_gamma` | `value_NR_PPAR_gamma` | 6602 (6418/184) | Huang et al., 2016 |
| | NR-TR | `label_NR_TR` | `value_NR_TR` | 5372 (4999/373) | Sun et al., 2019 |
| **Stress Response** | | | | | |
| | SR-ARE | `label_SR_ARE` | `value_SR_ARE` | 5956 (5014/942) | Huang et al., 2016 |
| | SR-ATAD5 | `label_SR_ATAD5` | `value_SR_ATAD5` | 7251 (6999/252) | Huang et al., 2016 |
| | SR-HSE | `label_SR_HSE` | `value_SR_HSE` | 6613 (6257/356) | Huang et al., 2016 |
| | SR-MMP | `label_SR_MMP` | `value_SR_MMP` | 6094 (5163/931) | Huang et al., 2016 |
| | SR-p53 | `label_SR_p53` | `value_SR_p53` | 7112 (6686/426) | Huang et al., 2016 |

---

## Value Columns (Numeric)

All value columns contain:

- **Data type:** float64
- **Range:** 0.0 - 1.0
- **Interpretation:** Higher values indicate stronger prediction confidence
- **Usage:** Threshold-based classification, ranking, quantitative risk assessment

---

## Schema Constraints and Relationships

### Primary Key

**Conceptual primary key:** `cpd` (KEGG Compound ID) — unique per row

---

### Foreign Key Relationships

**Conceptual foreign keys:**

- `cpd` → KEGG Compound database
- `cpd` → BioRemPP Database
- `ChEBI` → ChEBI database

---

## Data Quality Specifications

### Completeness

**100% field completeness** — Zero missing values across all 66 columns

### Verification

```r
db <- read.csv("data/databases/toxcsm_db.csv", sep=";")
colSums(is.na(db))  # Should return all zeros
```

---

### Data Provenance

- **SMILES, cpd, compoundname** — From KEGG Compound database
- **ChEBI** — Cross-reference to ChEBI database
- **Toxicity predictions** — Generated by ToxCSM QSAR models

**Source:** ToxCSM (Toxicity Computational Structural Model) web server predictions

---

## Usage Examples

### Loading the Database

=== "R"

    ```r
    library(readr)
    db <- read_delim("data/databases/toxcsm_db.csv", delim=";")
    
    # View identifier columns
    head(db[, c("cpd", "compoundname", "ChEBI")])
    
    # View ecotoxicity labels
    head(db[, c("compoundname", "label_Avian", "label_Crustacean")])
    ```

=== "Python"

    ```python
    import pandas as pd
    
    db = pd.read_csv("data/databases/toxcsm_db.csv", sep=";")
    
    # Filter high toxicity compounds
    high_tox = db[db['label_hERG_I_Inhibitor'] == 'High Toxicity']
    
    # Get average toxicity scores
    value_cols = [c for c in db.columns if c.startswith('value_')]
    db[value_cols].mean()
    ```

---

### Common Queries

```r
# Find compounds with high cardiotoxicity risk
high_herg <- db[db$label_hERG_I_Inhibitor == "High Toxicity", ]

# Get all ecotoxicity labels for a compound
compound <- db[db$compoundname == "Benzene", 
               grep("label_", names(db))]

# Rank compounds by biodegradation
ranked <- db[order(-db$value_Biodegradation), 
             c("compoundname", "value_Biodegradation")]
```

---

## Questions?

**GitHub Issues:** [https://github.com/BioRemPP/biorempp_db/issues](https://github.com/BioRemPP/biorempp_db/issues)  
**Email:** biorempp@gmail.com
