import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const KO_PATTERN = /^K\d{5}$/;
const CPD_PATTERN = /^C\d{5}$/;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'src', 'data');
const defaultDbPath = path.join(projectRoot, 'data', 'biorempp.sqlite');

function normalizeHeader(value) {
  return value.replace(/^\uFEFF/, '').trim().toLowerCase();
}

function normalizeCell(value) {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function parseCsv(content, delimiter = ';') {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (char === '"') {
      if (inQuotes && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && content[index + 1] === '\n') {
        index += 1;
      }
      row.push(field);
      field = '';
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell.length > 0)) {
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((cells) => {
    const record = {};
    for (let i = 0; i < headers.length; i += 1) {
      record[headers[i]] = normalizeCell(cells[i] ?? '');
    }
    return record;
  });
}

async function readCsvFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return parseCsv(content, ';');
}

function parseNumeric(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const normalized = String(value).replace(',', '.').trim();
  if (normalized === '') {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeString(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

function buildMapByKey(rows, key) {
  const grouped = new Map();
  for (const row of rows) {
    const rowKey = safeString(row[key]);
    if (!rowKey) {
      continue;
    }

    if (!grouped.has(rowKey)) {
      grouped.set(rowKey, []);
    }
    grouped.get(rowKey).push(row);
  }
  return grouped;
}

function buildValidatedDatasets(raw) {
  const rejected = {
    biorempp: 0,
    hadeg: 0,
    kegg: 0,
    toxcsm: 0,
  };

  const bioremppRows = [];
  for (const row of raw.biorempp) {
    const ko = safeString(row.ko);
    const cpd = safeString(row.cpd);
    if (!ko || !cpd || !KO_PATTERN.test(ko) || !CPD_PATTERN.test(cpd)) {
      rejected.biorempp += 1;
      continue;
    }

    bioremppRows.push({
      ko,
      cpd,
      compoundclass: safeString(row.compoundclass),
      ec: safeString(row.ec),
      reaction: safeString(row.reaction),
      reference_ag: safeString(row.referenceag ?? row.reference_ag),
      compoundname: safeString(row.compoundname),
      genesymbol: safeString(row.genesymbol),
      genename: safeString(row.genename),
      enzyme_activity: safeString(row.enzyme_activity),
    });
  }

  const hadegRows = [];
  for (const row of raw.hadeg) {
    const ko = safeString(row.ko);
    if (!ko || !KO_PATTERN.test(ko)) {
      rejected.hadeg += 1;
      continue;
    }

    hadegRows.push({
      ko,
      pathway_hadeg: safeString(row.pathway),
      compound_pathway: safeString(row.compound_pathway),
    });
  }

  const keggRows = [];
  for (const row of raw.kegg) {
    const ko = safeString(row.ko);
    if (!ko || !KO_PATTERN.test(ko)) {
      rejected.kegg += 1;
      continue;
    }

    keggRows.push({
      ko,
      pathway_kegg: safeString(row.pathname),
    });
  }

  const toxByCpd = new Map();
  const endpointUniverse = new Set();

  for (const row of raw.toxcsm) {
    const cpd = safeString(row.cpd);
    if (!cpd || !CPD_PATTERN.test(cpd)) {
      rejected.toxcsm += 1;
      continue;
    }

    if (!toxByCpd.has(cpd)) {
      toxByCpd.set(cpd, {
        cpd,
        smiles: safeString(row.smiles),
        chebi: safeString(row.chebi),
        compoundname: safeString(row.compoundname),
        toxicity_labels: {},
        toxicity_values: {},
        endpoint_map: new Map(),
      });
    }

    const toxEntry = toxByCpd.get(cpd);
    if (!toxEntry.smiles) {
      toxEntry.smiles = safeString(row.smiles);
    }
    if (!toxEntry.chebi) {
      toxEntry.chebi = safeString(row.chebi);
    }
    if (!toxEntry.compoundname) {
      toxEntry.compoundname = safeString(row.compoundname);
    }

    const touchedEndpoints = new Set();
    for (const [key, value] of Object.entries(row)) {
      if (key.startsWith('label_')) {
        const endpoint = key.slice(6);
        endpointUniverse.add(endpoint);
        touchedEndpoints.add(endpoint);
        toxEntry.toxicity_labels[key] = safeString(value);
      } else if (key.startsWith('value_')) {
        const endpoint = key.slice(6);
        endpointUniverse.add(endpoint);
        touchedEndpoints.add(endpoint);
        toxEntry.toxicity_values[key] = parseNumeric(value);
      }
    }

    for (const endpoint of touchedEndpoints) {
      const labelKey = `label_${endpoint}`;
      const valueKey = `value_${endpoint}`;
      toxEntry.endpoint_map.set(endpoint, {
        endpoint,
        label: toxEntry.toxicity_labels[labelKey] ?? null,
        value: toxEntry.toxicity_values[valueKey] ?? null,
      });
    }
  }

  return {
    bioremppRows,
    hadegRows,
    keggRows,
    toxByCpd,
    endpointUniverse,
    rejected,
  };
}

function buildSummaries(bioremppRows, hadegByKo, keggByKo, toxByCpd) {
  const compoundAcc = new Map();
  const geneAcc = new Map();
  const pathwayAcc = new Map();

  for (const row of bioremppRows) {
    if (!compoundAcc.has(row.cpd)) {
      compoundAcc.set(row.cpd, {
        cpd: row.cpd,
        compoundname: row.compoundname,
        compoundclass: row.compoundclass,
        referenceSet: new Set(),
        koSet: new Set(),
        geneSet: new Set(),
        pathwayCountSet: new Set(),
        pathwayFilterSet: new Set(),
      });
    }

    const compound = compoundAcc.get(row.cpd);
    if (!compound.compoundname) {
      compound.compoundname = row.compoundname;
    }
    if (!compound.compoundclass) {
      compound.compoundclass = row.compoundclass;
    }
    if (row.reference_ag) {
      compound.referenceSet.add(row.reference_ag);
    }
    compound.koSet.add(row.ko);
    if (row.genesymbol) {
      compound.geneSet.add(row.genesymbol);
    }

    const hadegMatches = hadegByKo.get(row.ko) ?? [];
    const keggMatches = keggByKo.get(row.ko) ?? [];

    for (const hadeg of hadegMatches) {
      if (hadeg.pathway_hadeg) {
        compound.pathwayCountSet.add(hadeg.pathway_hadeg);
        compound.pathwayFilterSet.add(hadeg.pathway_hadeg);
      }
      if (hadeg.compound_pathway) {
        compound.pathwayFilterSet.add(hadeg.compound_pathway);
      }
    }

    for (const kegg of keggMatches) {
      if (kegg.pathway_kegg) {
        compound.pathwayCountSet.add(kegg.pathway_kegg);
        compound.pathwayFilterSet.add(kegg.pathway_kegg);
      }
    }

    if (!geneAcc.has(row.ko)) {
      geneAcc.set(row.ko, {
        ko: row.ko,
        genesymbol: row.genesymbol,
        genename: row.genename,
        cpdSet: new Set(),
        pathwaySet: new Set(),
        enzymeSet: new Set(),
      });
    }

    const gene = geneAcc.get(row.ko);
    if (!gene.genesymbol) {
      gene.genesymbol = row.genesymbol;
    }
    if (!gene.genename) {
      gene.genename = row.genename;
    }
    gene.cpdSet.add(row.cpd);
    if (row.enzyme_activity) {
      gene.enzymeSet.add(row.enzyme_activity);
    }

    for (const hadeg of hadegMatches) {
      if (hadeg.pathway_hadeg) {
        gene.pathwaySet.add(hadeg.pathway_hadeg);
        const key = `HADEG|${hadeg.pathway_hadeg}`;
        if (!pathwayAcc.has(key)) {
          pathwayAcc.set(key, {
            pathway: hadeg.pathway_hadeg,
            source: 'HADEG',
            cpdSet: new Set(),
            geneSet: new Set(),
          });
        }
        const pathway = pathwayAcc.get(key);
        pathway.cpdSet.add(row.cpd);
        if (row.genesymbol) {
          pathway.geneSet.add(row.genesymbol);
        }
      }
    }

    for (const kegg of keggMatches) {
      if (kegg.pathway_kegg) {
        gene.pathwaySet.add(kegg.pathway_kegg);
        const key = `KEGG|${kegg.pathway_kegg}`;
        if (!pathwayAcc.has(key)) {
          pathwayAcc.set(key, {
            pathway: kegg.pathway_kegg,
            source: 'KEGG',
            cpdSet: new Set(),
            geneSet: new Set(),
          });
        }
        const pathway = pathwayAcc.get(key);
        pathway.cpdSet.add(row.cpd);
        if (row.genesymbol) {
          pathway.geneSet.add(row.genesymbol);
        }
      }
    }
  }

  const compoundRows = [];
  const compoundGeneRows = [];
  const compoundPathwayRows = [];
  const compoundReferenceRows = [];

  for (const compound of compoundAcc.values()) {
    const tox = toxByCpd.get(compound.cpd);
    const numericToxicityValues = tox
      ? Object.values(tox.toxicity_values).filter(
          (value) => typeof value === 'number' && Number.isFinite(value)
        )
      : [];

    const toxicityScore =
      numericToxicityValues.length > 0
        ? Number(
            (
              numericToxicityValues.reduce((sum, value) => sum + value, 0) /
              numericToxicityValues.length
            ).toFixed(6)
          )
        : 0;

    const referenceList = [...compound.referenceSet].sort();
    const genes = [...compound.geneSet].sort();
    const pathways = [...compound.pathwayFilterSet].sort();

    for (const genesymbol of genes) {
      compoundGeneRows.push({
        cpd: compound.cpd,
        genesymbol,
      });
    }

    for (const pathway of pathways) {
      compoundPathwayRows.push({
        cpd: compound.cpd,
        pathway,
      });
    }

    for (const referenceAg of referenceList) {
      compoundReferenceRows.push({
        cpd: compound.cpd,
        reference_ag: referenceAg,
      });
    }

    compoundRows.push({
      cpd: compound.cpd,
      compoundname: compound.compoundname,
      compoundclass: compound.compoundclass,
      reference_ag: referenceList.join('; ') || null,
      ko_count: compound.koSet.size,
      gene_count: genes.length,
      pathway_count: compound.pathwayCountSet.size,
      toxicity_score: toxicityScore,
      smiles: tox?.smiles ?? null,
      genes: JSON.stringify(genes),
      pathways: JSON.stringify(pathways),
    });
  }

  const geneRows = [];
  for (const gene of geneAcc.values()) {
    geneRows.push({
      ko: gene.ko,
      genesymbol: gene.genesymbol,
      genename: gene.genename,
      compound_count: gene.cpdSet.size,
      pathway_count: gene.pathwaySet.size,
      enzyme_activities: JSON.stringify([...gene.enzymeSet].sort()),
    });
  }

  const pathwayRows = [];
  for (const pathway of pathwayAcc.values()) {
    pathwayRows.push({
      pathway: pathway.pathway,
      source: pathway.source,
      compound_count: pathway.cpdSet.size,
      gene_count: pathway.geneSet.size,
    });
  }

  const toxicityEndpointRows = [];
  for (const compound of compoundAcc.values()) {
    const tox = toxByCpd.get(compound.cpd);
    if (!tox) {
      continue;
    }

    for (const endpointRecord of tox.endpoint_map.values()) {
      toxicityEndpointRows.push({
        cpd: compound.cpd,
        compoundname: compound.compoundname ?? tox.compoundname ?? null,
        compoundclass: compound.compoundclass ?? null,
        endpoint: endpointRecord.endpoint,
        label: endpointRecord.label ?? null,
        value: endpointRecord.value,
      });
    }
  }

  return {
    compoundRows,
    compoundGeneRows,
    compoundPathwayRows,
    compoundReferenceRows,
    geneRows,
    pathwayRows,
    toxicityEndpointRows,
  };
}

function now() {
  return new Date().toISOString();
}

function elapsedMs(startedAt) {
  return Date.now() - startedAt;
}

function printStep(step, message, startedAt) {
  const elapsed = (elapsedMs(startedAt) / 1000).toFixed(2);
  console.log(`[${step}] ${message} (${elapsed}s)`);
}

function createSchema(db) {
  db.exec(`
    PRAGMA journal_mode = DELETE;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = OFF;

    CREATE TABLE integrated_table (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ko TEXT CHECK (ko IS NULL OR ko GLOB 'K[0-9][0-9][0-9][0-9][0-9]'),
      genesymbol TEXT,
      genename TEXT,
      enzyme_activity TEXT,
      ec TEXT,
      reaction TEXT,
      cpd TEXT CHECK (cpd IS NULL OR cpd GLOB 'C[0-9][0-9][0-9][0-9][0-9]'),
      compoundname TEXT,
      compoundclass TEXT,
      reference_ag TEXT,
      pathway_hadeg TEXT,
      pathway_kegg TEXT,
      compound_pathway TEXT,
      smiles TEXT,
      chebi TEXT,
      toxicity_labels TEXT NOT NULL DEFAULT '{}',
      toxicity_values TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE compound_summary (
      cpd TEXT PRIMARY KEY CHECK (cpd GLOB 'C[0-9][0-9][0-9][0-9][0-9]'),
      compoundname TEXT,
      compoundclass TEXT,
      reference_ag TEXT,
      ko_count INTEGER NOT NULL DEFAULT 0,
      gene_count INTEGER NOT NULL DEFAULT 0,
      pathway_count INTEGER NOT NULL DEFAULT 0,
      toxicity_score REAL NOT NULL DEFAULT 0,
      smiles TEXT,
      genes TEXT NOT NULL DEFAULT '[]',
      pathways TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE gene_summary (
      ko TEXT PRIMARY KEY CHECK (ko GLOB 'K[0-9][0-9][0-9][0-9][0-9]'),
      genesymbol TEXT,
      genename TEXT,
      compound_count INTEGER NOT NULL DEFAULT 0,
      pathway_count INTEGER NOT NULL DEFAULT 0,
      enzyme_activities TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE pathway_summary (
      pathway TEXT NOT NULL,
      source TEXT NOT NULL,
      compound_count INTEGER NOT NULL DEFAULT 0,
      gene_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (pathway, source)
    );

    CREATE TABLE toxicity_endpoint (
      cpd TEXT NOT NULL CHECK (cpd GLOB 'C[0-9][0-9][0-9][0-9][0-9]'),
      compoundname TEXT,
      compoundclass TEXT,
      endpoint TEXT NOT NULL,
      label TEXT,
      value REAL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (cpd, endpoint)
    );

    CREATE TABLE compound_gene_map (
      cpd TEXT NOT NULL,
      genesymbol TEXT NOT NULL,
      PRIMARY KEY (cpd, genesymbol)
    );

    CREATE TABLE compound_pathway_map (
      cpd TEXT NOT NULL,
      pathway TEXT NOT NULL,
      PRIMARY KEY (cpd, pathway)
    );

    CREATE TABLE compound_reference_map (
      cpd TEXT NOT NULL,
      reference_ag TEXT NOT NULL,
      PRIMARY KEY (cpd, reference_ag)
    );
  `);
}

function createIndexes(db) {
  db.exec(`
    CREATE INDEX idx_integrated_ko ON integrated_table(ko);
    CREATE INDEX idx_integrated_cpd ON integrated_table(cpd);
    CREATE INDEX idx_integrated_compoundclass ON integrated_table(compoundclass);
    CREATE INDEX idx_integrated_genesymbol ON integrated_table(genesymbol);
    CREATE INDEX idx_integrated_pathway_hadeg ON integrated_table(pathway_hadeg);
    CREATE INDEX idx_integrated_pathway_kegg ON integrated_table(pathway_kegg);
    CREATE INDEX idx_integrated_compound_pathway ON integrated_table(compound_pathway);
    CREATE INDEX idx_integrated_compoundname ON integrated_table(compoundname);

    CREATE INDEX idx_compound_summary_class ON compound_summary(compoundclass);
    CREATE INDEX idx_compound_summary_reference ON compound_summary(reference_ag);
    CREATE INDEX idx_compound_summary_toxicity ON compound_summary(toxicity_score);
    CREATE INDEX idx_compound_summary_ko_count ON compound_summary(ko_count);
    CREATE INDEX idx_compound_summary_gene_count ON compound_summary(gene_count);

    CREATE INDEX idx_gene_summary_symbol ON gene_summary(genesymbol);
    CREATE INDEX idx_gene_summary_compound_count ON gene_summary(compound_count);

    CREATE INDEX idx_pathway_summary_source ON pathway_summary(source);

    CREATE INDEX idx_toxicity_endpoint_endpoint ON toxicity_endpoint(endpoint);
    CREATE INDEX idx_toxicity_endpoint_label ON toxicity_endpoint(label);
    CREATE INDEX idx_toxicity_endpoint_value ON toxicity_endpoint(value);
    CREATE INDEX idx_toxicity_endpoint_compoundclass ON toxicity_endpoint(compoundclass);
    CREATE INDEX idx_toxicity_endpoint_compoundname ON toxicity_endpoint(compoundname);

    CREATE INDEX idx_compound_gene_map_gene ON compound_gene_map(genesymbol);
    CREATE INDEX idx_compound_gene_map_cpd ON compound_gene_map(cpd);
    CREATE INDEX idx_compound_pathway_map_pathway ON compound_pathway_map(pathway);
    CREATE INDEX idx_compound_pathway_map_cpd ON compound_pathway_map(cpd);
    CREATE INDEX idx_compound_reference_map_reference ON compound_reference_map(reference_ag);
    CREATE INDEX idx_compound_reference_map_cpd ON compound_reference_map(cpd);
  `);
}

function ingestToSqlite(db, bioremppRows, hadegByKo, keggByKo, toxByCpd, summaries) {
  const insertIntegrated = db.prepare(`
    INSERT INTO integrated_table (
      ko, genesymbol, genename, enzyme_activity, ec, reaction,
      cpd, compoundname, compoundclass, reference_ag,
      pathway_hadeg, pathway_kegg, compound_pathway,
      smiles, chebi, toxicity_labels, toxicity_values
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCompound = db.prepare(`
    INSERT INTO compound_summary (
      cpd, compoundname, compoundclass, reference_ag, ko_count, gene_count,
      pathway_count, toxicity_score, smiles, genes, pathways
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertGene = db.prepare(`
    INSERT INTO gene_summary (
      ko, genesymbol, genename, compound_count, pathway_count, enzyme_activities
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertPathway = db.prepare(`
    INSERT INTO pathway_summary (
      pathway, source, compound_count, gene_count
    ) VALUES (?, ?, ?, ?)
  `);

  const insertToxicity = db.prepare(`
    INSERT INTO toxicity_endpoint (
      cpd, compoundname, compoundclass, endpoint, label, value
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertCompoundGene = db.prepare(`
    INSERT INTO compound_gene_map (cpd, genesymbol) VALUES (?, ?)
  `);

  const insertCompoundPathway = db.prepare(`
    INSERT INTO compound_pathway_map (cpd, pathway) VALUES (?, ?)
  `);

  const insertCompoundReference = db.prepare(`
    INSERT INTO compound_reference_map (cpd, reference_ag) VALUES (?, ?)
  `);

  let integratedInserted = 0;

  const transaction = db.transaction(() => {
    for (const row of bioremppRows) {
      const hadegMatches = hadegByKo.get(row.ko) ?? [null];
      const keggMatches = keggByKo.get(row.ko) ?? [null];
      const tox = toxByCpd.get(row.cpd);
      const toxicityLabels = JSON.stringify(tox?.toxicity_labels ?? {});
      const toxicityValues = JSON.stringify(tox?.toxicity_values ?? {});

      for (const hadeg of hadegMatches) {
        for (const kegg of keggMatches) {
          insertIntegrated.run(
            row.ko,
            row.genesymbol,
            row.genename,
            row.enzyme_activity,
            row.ec,
            row.reaction,
            row.cpd,
            row.compoundname ?? tox?.compoundname ?? null,
            row.compoundclass,
            row.reference_ag,
            hadeg?.pathway_hadeg ?? null,
            kegg?.pathway_kegg ?? null,
            hadeg?.compound_pathway ?? null,
            tox?.smiles ?? null,
            tox?.chebi ?? null,
            toxicityLabels,
            toxicityValues
          );
          integratedInserted += 1;
        }
      }
    }

    for (const row of summaries.compoundRows) {
      insertCompound.run(
        row.cpd,
        row.compoundname,
        row.compoundclass,
        row.reference_ag,
        row.ko_count,
        row.gene_count,
        row.pathway_count,
        row.toxicity_score,
        row.smiles,
        row.genes,
        row.pathways
      );
    }

    for (const row of summaries.geneRows) {
      insertGene.run(
        row.ko,
        row.genesymbol,
        row.genename,
        row.compound_count,
        row.pathway_count,
        row.enzyme_activities
      );
    }

    for (const row of summaries.pathwayRows) {
      insertPathway.run(
        row.pathway,
        row.source,
        row.compound_count,
        row.gene_count
      );
    }

    for (const row of summaries.toxicityEndpointRows) {
      insertToxicity.run(
        row.cpd,
        row.compoundname,
        row.compoundclass,
        row.endpoint,
        row.label,
        row.value
      );
    }

    for (const row of summaries.compoundGeneRows) {
      insertCompoundGene.run(row.cpd, row.genesymbol);
    }

    for (const row of summaries.compoundPathwayRows) {
      insertCompoundPathway.run(row.cpd, row.pathway);
    }

    for (const row of summaries.compoundReferenceRows) {
      insertCompoundReference.run(row.cpd, row.reference_ag);
    }
  });

  transaction();

  return {
    integratedInserted,
    compoundInserted: summaries.compoundRows.length,
    geneInserted: summaries.geneRows.length,
    pathwayInserted: summaries.pathwayRows.length,
    toxicityInserted: summaries.toxicityEndpointRows.length,
    compoundGeneInserted: summaries.compoundGeneRows.length,
    compoundPathwayInserted: summaries.compoundPathwayRows.length,
    compoundReferenceInserted: summaries.compoundReferenceRows.length,
  };
}

function validateDatabase(db) {
  const tableCount = (tableName) =>
    db.prepare(`SELECT COUNT(*) AS total FROM ${tableName}`).get().total;

  const invalidKo = db
    .prepare(`
      SELECT COUNT(*) AS total
      FROM integrated_table
      WHERE ko IS NOT NULL
        AND ko NOT GLOB 'K[0-9][0-9][0-9][0-9][0-9]'
    `)
    .get().total;

  const invalidCpd = db
    .prepare(`
      SELECT COUNT(*) AS total
      FROM integrated_table
      WHERE cpd IS NOT NULL
        AND cpd NOT GLOB 'C[0-9][0-9][0-9][0-9][0-9]'
    `)
    .get().total;

  const compoundsWithToxicity = db
    .prepare('SELECT COUNT(DISTINCT cpd) AS total FROM toxicity_endpoint')
    .get().total;

  return {
    integrated: tableCount('integrated_table'),
    compounds: tableCount('compound_summary'),
    genes: tableCount('gene_summary'),
    pathways: tableCount('pathway_summary'),
    toxicityEndpoints: tableCount('toxicity_endpoint'),
    compoundGeneMap: tableCount('compound_gene_map'),
    compoundPathwayMap: tableCount('compound_pathway_map'),
    compoundReferenceMap: tableCount('compound_reference_map'),
    invalidKo,
    invalidCpd,
    compoundsWithToxicity,
  };
}

async function main() {
  const runStartedAt = Date.now();
  const dbPath = process.env.SQLITE_DB_PATH || defaultDbPath;

  console.log(`SQLite ingestion started at ${now()}`);
  console.log(`Target DB: ${dbPath}`);

  const readStartedAt = Date.now();
  const raw = {
    biorempp: await readCsvFile(path.join(dataDir, 'biorempp_database_v1.1.0.csv')),
    hadeg: await readCsvFile(path.join(dataDir, 'hadeg_db.csv')),
    kegg: await readCsvFile(path.join(dataDir, 'kegg_degradation_db.csv')),
    toxcsm: await readCsvFile(path.join(dataDir, 'toxcsm_db.csv')),
  };
  printStep('1/8', 'CSV files loaded', readStartedAt);

  const validationStartedAt = Date.now();
  const {
    bioremppRows,
    hadegRows,
    keggRows,
    toxByCpd,
    endpointUniverse,
    rejected,
  } = buildValidatedDatasets(raw);
  printStep('2/8', 'Datasets validated and normalized', validationStartedAt);

  const mapStartedAt = Date.now();
  const hadegByKo = buildMapByKey(hadegRows, 'ko');
  const keggByKo = buildMapByKey(keggRows, 'ko');
  printStep('3/8', 'Join maps created', mapStartedAt);

  const summaryStartedAt = Date.now();
  const summaries = buildSummaries(bioremppRows, hadegByKo, keggByKo, toxByCpd);
  printStep('4/8', 'Summary and map tables computed', summaryStartedAt);

  const dbSetupStartedAt = Date.now();
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.rm(dbPath, { force: true });
  await fs.rm(`${dbPath}-shm`, { force: true });
  await fs.rm(`${dbPath}-wal`, { force: true });
  const db = new Database(dbPath);
  createSchema(db);
  printStep('5/8', 'SQLite schema created', dbSetupStartedAt);

  try {
    const ingestStartedAt = Date.now();
    const inserted = ingestToSqlite(db, bioremppRows, hadegByKo, keggByKo, toxByCpd, summaries);
    printStep(
      '6/8',
      `Data inserted (integrated=${inserted.integratedInserted}, compounds=${inserted.compoundInserted}, genes=${inserted.geneInserted}, pathways=${inserted.pathwayInserted}, toxicity=${inserted.toxicityInserted})`,
      ingestStartedAt
    );

    const indexStartedAt = Date.now();
    createIndexes(db);
    printStep('7/8', 'Indexes created', indexStartedAt);

    const checkStartedAt = Date.now();
    const checks = validateDatabase(db);
    printStep('8/8', 'Consistency checks completed', checkStartedAt);

    console.log('');
    console.log('Validation report:');
    console.log(`- BioRemPP rejected rows: ${rejected.biorempp}`);
    console.log(`- HADEG rejected rows: ${rejected.hadeg}`);
    console.log(`- KEGG rejected rows: ${rejected.kegg}`);
    console.log(`- ToxCSM rejected rows: ${rejected.toxcsm}`);
    console.log(`- Toxicity endpoints discovered: ${endpointUniverse.size}`);
    console.log(`- integrated_table rows: ${checks.integrated}`);
    console.log(`- compound_summary rows: ${checks.compounds}`);
    console.log(`- gene_summary rows: ${checks.genes}`);
    console.log(`- pathway_summary rows: ${checks.pathways}`);
    console.log(`- toxicity_endpoint rows: ${checks.toxicityEndpoints}`);
    console.log(`- compound_gene_map rows: ${checks.compoundGeneMap}`);
    console.log(`- compound_pathway_map rows: ${checks.compoundPathwayMap}`);
    console.log(`- compound_reference_map rows: ${checks.compoundReferenceMap}`);
    console.log(`- compounds with toxicity: ${checks.compoundsWithToxicity}`);
    console.log(`- invalid ko in integrated_table: ${checks.invalidKo}`);
    console.log(`- invalid cpd in integrated_table: ${checks.invalidCpd}`);
    console.log('');
    console.log(`Completed at ${now()} in ${(elapsedMs(runStartedAt) / 1000).toFixed(2)}s`);
  } finally {
    db.close();
    await fs.rm(`${dbPath}-shm`, { force: true });
    await fs.rm(`${dbPath}-wal`, { force: true });
  }
}

main().catch((error) => {
  console.error('');
  console.error('SQLite ingestion failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
