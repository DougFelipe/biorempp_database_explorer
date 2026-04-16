# Database Schemas

Formal specifications of all database schemas integrated into BioRemPP. Each schema document provides comprehensive technical details including column definitions, validation rules, cardinality, and usage examples.

---

## Quick Navigation

| Database | Rows | Columns | Focus | Schema Document |
|----------|------|---------|-------|-----------------|
| **BioRemPP** | 10,869 | 8 | Compound-gene-enzyme-agency relationships | [biorempp-schema.md](biorempp-schema.md) |
| **HADEG** | 867 | 4 | Hydrocarbon aerobic degradation genes | [hadeg-schema.md](hadeg-schema.md) |
| **KEGG** | 855 | 3 | Xenobiotic/pollutant degradation pathways | [kegg-schema.md](kegg-schema.md) |
| **ToxCSM** | 370 | 66 | Toxicological predictions (31 endpoints) | [toxcsm-schema.md](toxcsm-schema.md) |

---

## Overview

- **Formal specifications** — Column types, formats, patterns, and controlled vocabularies
- **Validation rules** — Regex patterns, cardinality constraints, completeness requirements
- **Cross-references** — Foreign key relationships and integration points between databases
- **Usage examples** — Code snippets for loading and querying each database in R and Python

---

## Database Summaries

### BioRemPP Database

**[Full Schema Specification →](biorempp-schema.md)**

**Schema:** 8-column flat structure  
**Primary focus:** Bioremediation-specific compound-gene relationships  
**Key features:**

- Links KO identifiers to environmental pollutants
- Includes regulatory agency classifications (IARC, EPA, ATSDR, etc.)
- 383 unique compounds, 1,420 unique gene names
- 12 compound classes, 205 enzyme activity terms

**Core columns:** `ko`, `cpd`, `referenceAG`, `compoundclass`, `compoundname`, `genesymbol`, `genename`, `enzyme_activity`

**Join key:** `ko` (KEGG Orthology ID)

---

### HADEG Database

**[Full Schema Specification →](hadeg-schema.md)**

**Schema:** 4-column flat structure  
**Primary focus:** Hydrocarbon aerobic degradation pathways  
**Key features:**

- Gene-pathway mappings for alkane, aromatic, and alkene degradation
- 323 unique genes, 337 unique KO entries
- 71 degradation pathways, 5 compound classes (Alkanes, Aromatics, BTEX, etc.)

**Core columns:** `Gene`, `ko`, `Pathway`, `compound_pathway`

**Join key:** `ko` (KEGG Orthology ID)

---

### KEGG Degradation Database

**[Full Schema Specification →](kegg-schema.md)**

**Schema:** 3-column minimal structure  
**Primary focus:** KEGG-sourced xenobiotic/pollutant degradation pathways  
**Key features:**

- Metabolism and degradation pathway annotations
- 517 unique KO entries, 513 unique gene symbols
- 20 curated pathways (Naphthalene, Toluene, Dioxin, Styrene, etc.)

**Core columns:** `ko`, `pathname`, `genesymbol`

**Join key:** `ko` (KEGG Orthology ID)

---

### ToxCSM Database

**[Full Schema Specification →](toxcsm-schema.md)**

**Schema:** 66-column wide structure  
**Primary focus:** Computational toxicological predictions  
**Key features:**

- 31 toxicological endpoints with dual columns (label + value)
- Categories: Ecotoxicity, Human Health, Genotoxicity, Nuclear Receptors, Stress Response, Cardiotoxicity
- SMILES, KEGG Compound, and ChEBI identifiers
- Label classifications: High/Medium/Low Safety, Low/Medium/High Toxicity

**Core columns:** `SMILES`, `cpd`, `ChEBI`, `compoundname` + 62 toxicity columns  

**Join key:** `cpd` (KEGG Compound ID, not `ko`!)

---

## Common File Format

All databases share consistent formatting:

| Property | Value |
|----------|-------|
| **File format** | CSV (Comma-Separated Values) |
| **Field delimiter** | Semicolon (`;`) |
| **Encoding** | UTF-8 |
| **Header row** | Yes (column names in first row) |
| **Text qualifier** | Double quote (`"`) |
| **Completeness** | 100% (zero missing values) |

---

## Integration Architecture

### Join Relationships

```
User KO Annotations
         ↓
    ┌────┴────┐
    ↓         ↓         ↓
BioRemPP   HADEG   KEGG Degradation  (Join on: ko)
    ↓
    cpd
    ↓
  ToxCSM                            (Join on: cpd)
```

**Key integration points:**

- **BioRemPP, HADEG, KEGG** → Join on `ko` (KO identifier)
- **ToxCSM** → Join on `cpd` (Compound ID from BioRemPP)

**Critical difference:** ToxCSM uses compound identifiers, not KO identifiers

---

## What Each Schema Document Contains

All schema documents follow a standardized structure:

### 1. **Overview**

- Design rationale
- Schema format (rows, columns, encoding)
- Primary purpose

### 2. **Column Specifications**

- Summary table with all columns
- Detailed specification for each column:
  - Data type, format, pattern
  - Controlled vocabulary status
  - Uniqueness, cardinality
  - Validation rules, cross-references

### 3. **Schema Constraints**

- Primary keys (conceptual)
- Foreign key relationships
- Cardinality rules (many-to-many, many-to-one)

### 4. **Data Quality Specifications**

- Completeness verification
- Consistency checks
- Accuracy and provenance

### 5. **Usage Examples**

- Loading database in R and Python
- Common query patterns
- Result verification

---

## Using Schema Documentation

### For Data Integration

1. **Identify join keys** — Check which columns enable cross-database joins
2. **Validate formats** — Use regex patterns to verify identifier formats
3. **Check cardinality** — Understand one-to-many and many-to-many relationships

### For Quality Assurance

1. **Verify completeness** — Run `colSums(is.na(db))` checks
2. **Validate identifiers** — Use regex patterns: `^K\\d{5}$` for KO, `^C\\d{5}$` for compounds
3. **Check controlled vocabularies** — Ensure categorical fields match documented values

### For Tool Development

1. **Define data models** — Use column specifications to create data classes
2. **Implement validation** — Use regex patterns and cardinality rules
3. **Generate documentation** — Reference schema specs in API docs

---

## Related Documentation

- **[Data Sources](../methods/data-sources.md)** — Database provenance and scientific context
- **[Mapping Strategy](../methods/mapping-strategy.md)** — Integration logic and join strategies
- **[Internal Validation](../validation/internal-validation.md)** — Schema validation tests

---

## Accessing the Databases

**File location:** `data/databases/`

- `biorempp_db.csv`
- `hadeg_db.csv`
- `kegg_degradation_db.csv`
- `toxcsm_db.csv`

**Repository:** [https://github.com/BioRemPP/biorempp_web](https://github.com/BioRemPP/biorempp_web)

---

## Questions?

**GitHub Issues:** [https://github.com/BioRemPP/biorempp_db/issues](https://github.com/BioRemPP/biorempp_db/issues)  
**Email:** biorempp@gmail.com
