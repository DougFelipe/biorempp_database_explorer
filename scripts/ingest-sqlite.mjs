import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const KO_PATTERN = /^K\d{5}$/;
const CPD_PATTERN = /^C\d{5}$/;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'data', 'raw');
const defaultDbPath = path.join(projectRoot, 'data', 'biorempp.sqlite');
const DATASET_FILES = {
  biorempp: 'biorempp_database_v1.1.0.csv',
  hadeg: 'hadeg_db.csv',
  kegg: 'kegg_degradation_db.csv',
  toxcsm: 'toxcsm_db.csv',
};

const SOURCE_DETAILS = {
  BioRemPP: {
    name: 'BioRemPP',
    role: 'Core compound-gene mapping',
    color: 'green',
  },
  HADEG: {
    name: 'HADEG',
    role: 'Hydrocarbon degradation pathways',
    color: 'blue',
  },
  KEGG: {
    name: 'KEGG',
    role: 'Metabolic pathway annotation',
    color: 'purple',
  },
  ToxCSM: {
    name: 'ToxCSM',
    role: 'Toxicity prediction (31 endpoints)',
    color: 'orange',
  },
};

function extractVersionFromFilename(fileName) {
  const match = fileName.match(/v(\d+(?:\.\d+)*)/i);
  if (!match) {
    return 'unknown';
  }
  return `v${match[1]}`;
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

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

function isHighRiskLabel(label) {
  return typeof label === 'string' && label.trim().toLowerCase() === 'high toxicity';
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
      reaction_description: safeString(row.reaction_description),
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

function buildSummaries(
  bioremppRows,
  hadegByKo,
  keggByKo,
  toxByCpd,
  metadataContext = { version: 'unknown', generatedAt: now() }
) {
  const compoundAcc = new Map();
  const geneAcc = new Map();
  const pathwayAcc = new Map();
  const geneCardAcc = new Map();
  const koPathwayRelAcc = new Map();
  const pathwayKoSupportAcc = new Map();
  const koOverviewAcc = new Map();

  function ensureKoOverview(cpd, ko) {
    const key = `${cpd}|${ko}`;
    if (!koOverviewAcc.has(key)) {
      koOverviewAcc.set(key, {
        cpd,
        ko,
        hadegPathways: new Set(),
        keggPathways: new Set(),
      });
    }
    return koOverviewAcc.get(key);
  }

  function addKoPathwayRelation(cpd, ko, source, pathway) {
    if (!pathway) {
      return;
    }

    const relKey = `${cpd}|${ko}|${source}|${pathway}`;
    if (!koPathwayRelAcc.has(relKey)) {
      koPathwayRelAcc.set(relKey, { cpd, ko, source, pathway });
    }

    if (source === 'HADEG' || source === 'KEGG') {
      const overview = ensureKoOverview(cpd, ko);
      if (source === 'HADEG') {
        overview.hadegPathways.add(pathway);
      } else if (source === 'KEGG') {
        overview.keggPathways.add(pathway);
      }
    }

    const cardKey = `${cpd}|${source}|${pathway}`;
    if (!pathwayKoSupportAcc.has(cardKey)) {
      pathwayKoSupportAcc.set(cardKey, {
        cpd,
        source,
        pathway,
        koSet: new Set(),
      });
    }
    pathwayKoSupportAcc.get(cardKey).koSet.add(ko);
  }

  for (const row of bioremppRows) {
    if (!compoundAcc.has(row.cpd)) {
      compoundAcc.set(row.cpd, {
        cpd: row.cpd,
        compoundname: row.compoundname,
        compoundclass: row.compoundclass,
        referenceSet: new Set(),
        koSet: new Set(),
        geneSet: new Set(),
        geneNameSet: new Set(),
        enzymeActivitySet: new Set(),
        ecSet: new Set(),
        reactionSet: new Set(),
        pathwayCountSet: new Set(),
        pathwayFilterSet: new Set(),
        pathwayHadegSet: new Set(),
        pathwayKeggSet: new Set(),
        compoundPathwayClassSet: new Set(),
        sourceSet: new Set(['BioRemPP']),
      });
    }

    const compound = compoundAcc.get(row.cpd);
    ensureKoOverview(row.cpd, row.ko);

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
    if (row.genename) {
      compound.geneNameSet.add(row.genename);
    }
    if (row.enzyme_activity) {
      compound.enzymeActivitySet.add(row.enzyme_activity);
    }
    if (row.ec) {
      compound.ecSet.add(row.ec);
    }
    if (row.reaction) {
      compound.reactionSet.add(row.reaction);
    }

    const hadegMatches = hadegByKo.get(row.ko) ?? [];
    const keggMatches = keggByKo.get(row.ko) ?? [];
    if (hadegMatches.length > 0) {
      compound.sourceSet.add('HADEG');
    }
    if (keggMatches.length > 0) {
      compound.sourceSet.add('KEGG');
    }

    const geneCardKey = [
      row.cpd,
      row.ko,
      row.genesymbol ?? '',
      row.genename ?? '',
      row.enzyme_activity ?? '',
      row.ec ?? '',
    ].join('|');

    if (!geneCardAcc.has(geneCardKey)) {
      geneCardAcc.set(geneCardKey, {
        cpd: row.cpd,
        ko: row.ko,
        genesymbol: row.genesymbol ?? '',
        genename: row.genename ?? '',
        enzyme_activity: row.enzyme_activity ?? '',
        ec: row.ec ?? '',
        reactionSet: new Set(),
        reactionDescriptionSet: new Set(),
        supporting_rows: 0,
      });
    }

    const geneCard = geneCardAcc.get(geneCardKey);
    geneCard.supporting_rows += 1;
    if (row.reaction) {
      geneCard.reactionSet.add(row.reaction);
    }
    if (row.reaction_description) {
      geneCard.reactionDescriptionSet.add(row.reaction_description);
    }

    for (const hadeg of hadegMatches) {
      if (hadeg.pathway_hadeg) {
        compound.pathwayCountSet.add(`HADEG|${hadeg.pathway_hadeg}`);
        compound.pathwayFilterSet.add(hadeg.pathway_hadeg);
        compound.pathwayHadegSet.add(hadeg.pathway_hadeg);
        addKoPathwayRelation(row.cpd, row.ko, 'HADEG', hadeg.pathway_hadeg);
      }
      if (hadeg.compound_pathway) {
        compound.pathwayCountSet.add(`COMPOUND_PATHWAY|${hadeg.compound_pathway}`);
        compound.pathwayFilterSet.add(hadeg.compound_pathway);
        compound.compoundPathwayClassSet.add(hadeg.compound_pathway);
        addKoPathwayRelation(row.cpd, row.ko, 'COMPOUND_PATHWAY', hadeg.compound_pathway);
      }
    }

    for (const kegg of keggMatches) {
      if (kegg.pathway_kegg) {
        compound.pathwayCountSet.add(`KEGG|${kegg.pathway_kegg}`);
        compound.pathwayFilterSet.add(kegg.pathway_kegg);
        compound.pathwayKeggSet.add(kegg.pathway_kegg);
        addKoPathwayRelation(row.cpd, row.ko, 'KEGG', kegg.pathway_kegg);
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
  const compoundMetadataRows = [];

  for (const compound of compoundAcc.values()) {
    const tox = toxByCpd.get(compound.cpd);
    const toxicityEndpointEntries = tox
      ? [...tox.endpoint_map.values()].sort((a, b) => a.endpoint.localeCompare(b.endpoint))
      : [];

    const toxicityScores = toxicityEndpointEntries.reduce((acc, entry) => {
      acc[entry.endpoint] =
        typeof entry.value === 'number' && Number.isFinite(entry.value) ? entry.value : null;
      return acc;
    }, {});

    const numericToxicityValues = toxicityEndpointEntries
      .map((entry) => entry.value)
      .filter((value) => typeof value === 'number' && Number.isFinite(value));

    const toxicityRiskMean =
      numericToxicityValues.length > 0
        ? Number(
            (
              numericToxicityValues.reduce((sum, value) => sum + value, 0) /
              numericToxicityValues.length
            ).toFixed(6)
          )
        : null;
    const highRiskEndpointCount = toxicityEndpointEntries.filter((entry) =>
      isHighRiskLabel(entry.label)
    ).length;

    const referenceList = [...compound.referenceSet].sort();
    const referenceCount = referenceList.length;
    const koIds = sortedUnique([...compound.koSet]);
    const geneSymbols = sortedUnique([...compound.geneSet]);
    const geneNames = sortedUnique([...compound.geneNameSet]);
    const enzymeActivities = sortedUnique([...compound.enzymeActivitySet]);
    const ecNumbers = sortedUnique([...compound.ecSet]);
    const pathways = sortedUnique([...compound.pathwayFilterSet]);
    const pathwaysHadeg = sortedUnique([...compound.pathwayHadegSet]);
    const pathwaysKegg = sortedUnique([...compound.pathwayKeggSet]);
    const compoundPathwayClasses = sortedUnique([...compound.compoundPathwayClassSet]);
    const reactionCount = compound.reactionSet.size;
    const chebiId = tox?.chebi ?? null;
    const smiles = tox?.smiles ?? null;

    if (tox) {
      compound.sourceSet.add('ToxCSM');
    }

    const dataSources = ['BioRemPP', 'HADEG', 'KEGG', 'ToxCSM']
      .filter((sourceName) => compound.sourceSet.has(sourceName))
      .map((sourceName) => SOURCE_DETAILS[sourceName]);

    const completenessChecks = [
      Boolean(compound.cpd),
      Boolean(compound.compoundname),
      Boolean(compound.compoundclass),
      koIds.length > 0,
      geneSymbols.length > 0,
      Boolean(chebiId),
      Boolean(smiles),
    ];

    const completenessFilled = completenessChecks.filter(Boolean).length;
    const completenessPct = Number(
      ((completenessFilled / completenessChecks.length) * 100).toFixed(2)
    );

    const crossReferenceChecks = [
      Boolean(compound.cpd),
      Boolean(chebiId),
      ecNumbers.length > 0,
      reactionCount > 0,
    ];
    const crossReferenceCovered = crossReferenceChecks.filter(Boolean).length;

    const metadata = {
      identifiers: {
        cpd: compound.cpd,
        compound_name: compound.compoundname ?? null,
        compound_class: compound.compoundclass ?? null,
        ko_ids: koIds,
        gene_symbols: geneSymbols,
        gene_names: geneNames,
        chebi_id: chebiId,
        smiles,
      },
      functional_annotation: {
        enzyme_activity: enzymeActivities,
        ec_numbers: ecNumbers,
        pathways_hadeg: pathwaysHadeg,
        pathways_kegg: pathwaysKegg,
        compound_pathway_class: compoundPathwayClasses,
        reaction_count: reactionCount,
      },
      chemical_information: {
        compound_name: compound.compoundname ?? null,
        compound_class: compound.compoundclass ?? null,
        smiles,
        chebi: chebiId,
      },
      data_sources: dataSources,
      provenance: {
        version: metadataContext.version,
        last_updated: metadataContext.generatedAt,
        pipeline: 'BioRemPP Database Generator',
      },
      cross_references: {
        kegg_compound_id: compound.cpd,
        chebi: chebiId,
        ec_numbers: ecNumbers,
        reaction_count: reactionCount,
      },
      data_quality: {
        ko_format_valid: koIds.every((koId) => KO_PATTERN.test(koId)),
        cpd_format_valid: CPD_PATTERN.test(compound.cpd),
        completeness_pct: completenessPct,
        cross_references_coverage: `${crossReferenceCovered}/${crossReferenceChecks.length}`,
      },
    };

    for (const genesymbol of geneSymbols) {
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
      reference_count: referenceCount,
      ko_count: koIds.length,
      gene_count: geneSymbols.length,
      pathway_count: compound.pathwayCountSet.size,
      toxicity_risk_mean: toxicityRiskMean,
      high_risk_endpoint_count: highRiskEndpointCount,
      toxicity_scores: JSON.stringify(toxicityScores),
      smiles,
      genes: JSON.stringify(geneSymbols),
      pathways: JSON.stringify(pathways),
    });

    compoundMetadataRows.push({
      cpd: compound.cpd,
      metadata_json: JSON.stringify(metadata),
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
  const compoundGeneCardRows = [];
  const compoundPathwayCardRows = [];
  const compoundKoPathwayRelRows = [];
  const compoundKoOverviewRows = [];

  for (const card of geneCardAcc.values()) {
    compoundGeneCardRows.push({
      cpd: card.cpd,
      ko: card.ko,
      genesymbol: card.genesymbol,
      genename: card.genename,
      enzyme_activity: card.enzyme_activity,
      ec: card.ec,
      reactions: JSON.stringify([...card.reactionSet].sort()),
      reaction_descriptions: JSON.stringify([...card.reactionDescriptionSet].sort()),
      supporting_rows: card.supporting_rows,
    });
  }

  for (const pathwayCard of pathwayKoSupportAcc.values()) {
    compoundPathwayCardRows.push({
      cpd: pathwayCard.cpd,
      source: pathwayCard.source,
      pathway: pathwayCard.pathway,
      supporting_rows: pathwayCard.koSet.size,
    });
  }

  for (const relation of koPathwayRelAcc.values()) {
    compoundKoPathwayRelRows.push({
      cpd: relation.cpd,
      ko: relation.ko,
      source: relation.source,
      pathway: relation.pathway,
    });
  }

  for (const overview of koOverviewAcc.values()) {
    const relationCountHadeg = overview.hadegPathways.size;
    const relationCountKegg = overview.keggPathways.size;
    compoundKoOverviewRows.push({
      cpd: overview.cpd,
      ko: overview.ko,
      relation_count_total: relationCountHadeg + relationCountKegg,
      relation_count_hadeg: relationCountHadeg,
      relation_count_kegg: relationCountKegg,
    });
  }

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
    compoundMetadataRows,
    geneRows,
    pathwayRows,
    toxicityEndpointRows,
    compoundGeneCardRows,
    compoundPathwayCardRows,
    compoundKoPathwayRelRows,
    compoundKoOverviewRows,
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

    CREATE TABLE compound_summary (
      cpd TEXT PRIMARY KEY CHECK (cpd GLOB 'C[0-9][0-9][0-9][0-9][0-9]'),
      compoundname TEXT,
      compoundclass TEXT,
      reference_ag TEXT,
      reference_count INTEGER NOT NULL DEFAULT 0,
      ko_count INTEGER NOT NULL DEFAULT 0,
      gene_count INTEGER NOT NULL DEFAULT 0,
      pathway_count INTEGER NOT NULL DEFAULT 0,
      toxicity_risk_mean REAL,
      high_risk_endpoint_count INTEGER NOT NULL DEFAULT 0,
      toxicity_scores TEXT NOT NULL DEFAULT '{}',
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

    CREATE TABLE compound_metadata (
      cpd TEXT PRIMARY KEY CHECK (cpd GLOB 'C[0-9][0-9][0-9][0-9][0-9]'),
      metadata_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE compound_gene_card (
      cpd TEXT NOT NULL CHECK (cpd GLOB 'C[0-9][0-9][0-9][0-9][0-9]'),
      ko TEXT NOT NULL DEFAULT '',
      genesymbol TEXT NOT NULL DEFAULT '',
      genename TEXT NOT NULL DEFAULT '',
      enzyme_activity TEXT NOT NULL DEFAULT '',
      ec TEXT NOT NULL DEFAULT '',
      reactions TEXT NOT NULL DEFAULT '[]',
      reaction_descriptions TEXT NOT NULL DEFAULT '[]',
      supporting_rows INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (cpd, ko, genesymbol, genename, enzyme_activity, ec)
    );

    CREATE TABLE compound_pathway_card (
      cpd TEXT NOT NULL CHECK (cpd GLOB 'C[0-9][0-9][0-9][0-9][0-9]'),
      source TEXT NOT NULL,
      pathway TEXT NOT NULL,
      supporting_rows INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (cpd, source, pathway)
    );

    CREATE TABLE compound_ko_pathway_rel (
      cpd TEXT NOT NULL CHECK (cpd GLOB 'C[0-9][0-9][0-9][0-9][0-9]'),
      ko TEXT NOT NULL CHECK (ko GLOB 'K[0-9][0-9][0-9][0-9][0-9]'),
      source TEXT NOT NULL,
      pathway TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (cpd, ko, source, pathway)
    );

    CREATE TABLE compound_ko_overview (
      cpd TEXT NOT NULL CHECK (cpd GLOB 'C[0-9][0-9][0-9][0-9][0-9]'),
      ko TEXT NOT NULL CHECK (ko GLOB 'K[0-9][0-9][0-9][0-9][0-9]'),
      relation_count_total INTEGER NOT NULL DEFAULT 0,
      relation_count_hadeg INTEGER NOT NULL DEFAULT 0,
      relation_count_kegg INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (cpd, ko)
    );
  `);
}

function createIndexes(db) {
  db.exec(`
    CREATE INDEX idx_compound_summary_class ON compound_summary(compoundclass);
    CREATE INDEX idx_compound_summary_reference ON compound_summary(reference_ag);
    CREATE INDEX idx_compound_summary_reference_count ON compound_summary(reference_count);
    CREATE INDEX idx_compound_summary_toxicity_risk_mean ON compound_summary(toxicity_risk_mean);
    CREATE INDEX idx_compound_summary_high_risk_endpoint_count ON compound_summary(high_risk_endpoint_count);
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

    CREATE INDEX idx_compound_gene_card_cpd ON compound_gene_card(cpd);
    CREATE INDEX idx_compound_gene_card_symbol ON compound_gene_card(genesymbol);
    CREATE INDEX idx_compound_gene_card_ko ON compound_gene_card(ko);

    CREATE INDEX idx_compound_pathway_card_cpd ON compound_pathway_card(cpd);
    CREATE INDEX idx_compound_pathway_card_source ON compound_pathway_card(source);
    CREATE INDEX idx_compound_pathway_card_pathway ON compound_pathway_card(pathway);

    CREATE INDEX idx_compound_ko_pathway_rel_cpd ON compound_ko_pathway_rel(cpd);
    CREATE INDEX idx_compound_ko_pathway_rel_ko ON compound_ko_pathway_rel(ko);
    CREATE INDEX idx_compound_ko_pathway_rel_source_pathway ON compound_ko_pathway_rel(source, pathway);

    CREATE INDEX idx_compound_ko_overview_cpd ON compound_ko_overview(cpd);
    CREATE INDEX idx_compound_ko_overview_ko ON compound_ko_overview(ko);
    CREATE INDEX idx_compound_ko_overview_total ON compound_ko_overview(relation_count_total);
  `);
}

function ingestToSqlite(db, summaries) {
  const insertCompound = db.prepare(`
    INSERT INTO compound_summary (
      cpd, compoundname, compoundclass, reference_ag, reference_count, ko_count, gene_count,
      pathway_count, toxicity_risk_mean, high_risk_endpoint_count, toxicity_scores, smiles, genes, pathways
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

  const insertCompoundMetadata = db.prepare(`
    INSERT INTO compound_metadata (cpd, metadata_json) VALUES (?, ?)
  `);

  const insertCompoundGeneCard = db.prepare(`
    INSERT INTO compound_gene_card (
      cpd, ko, genesymbol, genename, enzyme_activity, ec, reactions, reaction_descriptions, supporting_rows
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCompoundPathwayCard = db.prepare(`
    INSERT INTO compound_pathway_card (
      cpd, source, pathway, supporting_rows
    ) VALUES (?, ?, ?, ?)
  `);

  const insertCompoundKoPathwayRel = db.prepare(`
    INSERT INTO compound_ko_pathway_rel (
      cpd, ko, source, pathway
    ) VALUES (?, ?, ?, ?)
  `);

  const insertCompoundKoOverview = db.prepare(`
    INSERT INTO compound_ko_overview (
      cpd, ko, relation_count_total, relation_count_hadeg, relation_count_kegg
    ) VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    for (const row of summaries.compoundRows) {
      insertCompound.run(
        row.cpd,
        row.compoundname,
        row.compoundclass,
        row.reference_ag,
        row.reference_count,
        row.ko_count,
        row.gene_count,
        row.pathway_count,
        row.toxicity_risk_mean,
        row.high_risk_endpoint_count,
        row.toxicity_scores,
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

    for (const row of summaries.compoundMetadataRows) {
      insertCompoundMetadata.run(row.cpd, row.metadata_json);
    }

    for (const row of summaries.compoundGeneCardRows) {
      insertCompoundGeneCard.run(
        row.cpd,
        row.ko,
        row.genesymbol,
        row.genename,
        row.enzyme_activity,
        row.ec,
        row.reactions,
        row.reaction_descriptions,
        row.supporting_rows
      );
    }

    for (const row of summaries.compoundPathwayCardRows) {
      insertCompoundPathwayCard.run(
        row.cpd,
        row.source,
        row.pathway,
        row.supporting_rows
      );
    }

    for (const row of summaries.compoundKoPathwayRelRows) {
      insertCompoundKoPathwayRel.run(
        row.cpd,
        row.ko,
        row.source,
        row.pathway
      );
    }

    for (const row of summaries.compoundKoOverviewRows) {
      insertCompoundKoOverview.run(
        row.cpd,
        row.ko,
        row.relation_count_total,
        row.relation_count_hadeg,
        row.relation_count_kegg
      );
    }
  });

  transaction();

  return {
    compoundInserted: summaries.compoundRows.length,
    geneInserted: summaries.geneRows.length,
    pathwayInserted: summaries.pathwayRows.length,
    toxicityInserted: summaries.toxicityEndpointRows.length,
    compoundGeneInserted: summaries.compoundGeneRows.length,
    compoundPathwayInserted: summaries.compoundPathwayRows.length,
    compoundReferenceInserted: summaries.compoundReferenceRows.length,
    compoundMetadataInserted: summaries.compoundMetadataRows.length,
    compoundGeneCardInserted: summaries.compoundGeneCardRows.length,
    compoundPathwayCardInserted: summaries.compoundPathwayCardRows.length,
    compoundKoPathwayRelInserted: summaries.compoundKoPathwayRelRows.length,
    compoundKoOverviewInserted: summaries.compoundKoOverviewRows.length,
  };
}

function validateDatabase(db) {
  const tableCount = (tableName) =>
    db.prepare(`SELECT COUNT(*) AS total FROM ${tableName}`).get().total;

  const invalidKo = db
    .prepare(`
      SELECT SUM(total) AS total
      FROM (
        SELECT COUNT(*) AS total
        FROM gene_summary
        WHERE ko NOT GLOB 'K[0-9][0-9][0-9][0-9][0-9]'
        UNION ALL
        SELECT COUNT(*) AS total
        FROM compound_gene_card
        WHERE ko != ''
          AND ko NOT GLOB 'K[0-9][0-9][0-9][0-9][0-9]'
        UNION ALL
        SELECT COUNT(*) AS total
        FROM compound_ko_pathway_rel
        WHERE ko NOT GLOB 'K[0-9][0-9][0-9][0-9][0-9]'
        UNION ALL
        SELECT COUNT(*) AS total
        FROM compound_ko_overview
        WHERE ko NOT GLOB 'K[0-9][0-9][0-9][0-9][0-9]'
      )
    `)
    .get().total ?? 0;

  const invalidCpd = db
    .prepare(`
      SELECT SUM(total) AS total
      FROM (
        SELECT COUNT(*) AS total
        FROM compound_summary
        WHERE cpd NOT GLOB 'C[0-9][0-9][0-9][0-9][0-9]'
        UNION ALL
        SELECT COUNT(*) AS total
        FROM toxicity_endpoint
        WHERE cpd NOT GLOB 'C[0-9][0-9][0-9][0-9][0-9]'
        UNION ALL
        SELECT COUNT(*) AS total
        FROM compound_gene_map
        WHERE cpd NOT GLOB 'C[0-9][0-9][0-9][0-9][0-9]'
        UNION ALL
        SELECT COUNT(*) AS total
        FROM compound_pathway_map
        WHERE cpd NOT GLOB 'C[0-9][0-9][0-9][0-9][0-9]'
        UNION ALL
        SELECT COUNT(*) AS total
        FROM compound_reference_map
        WHERE cpd NOT GLOB 'C[0-9][0-9][0-9][0-9][0-9]'
        UNION ALL
        SELECT COUNT(*) AS total
        FROM compound_metadata
        WHERE cpd NOT GLOB 'C[0-9][0-9][0-9][0-9][0-9]'
        UNION ALL
        SELECT COUNT(*) AS total
        FROM compound_gene_card
        WHERE cpd NOT GLOB 'C[0-9][0-9][0-9][0-9][0-9]'
        UNION ALL
        SELECT COUNT(*) AS total
        FROM compound_pathway_card
        WHERE cpd NOT GLOB 'C[0-9][0-9][0-9][0-9][0-9]'
        UNION ALL
        SELECT COUNT(*) AS total
        FROM compound_ko_pathway_rel
        WHERE cpd NOT GLOB 'C[0-9][0-9][0-9][0-9][0-9]'
        UNION ALL
        SELECT COUNT(*) AS total
        FROM compound_ko_overview
        WHERE cpd NOT GLOB 'C[0-9][0-9][0-9][0-9][0-9]'
      )
    `)
    .get().total ?? 0;

  const compoundsWithToxicity = db
    .prepare('SELECT COUNT(DISTINCT cpd) AS total FROM toxicity_endpoint')
    .get().total;

  const pathwayCountMismatches = db
    .prepare(`
      SELECT COUNT(*) AS total
      FROM compound_summary cs
      WHERE cs.pathway_count != (
        SELECT COUNT(*)
        FROM compound_pathway_card cpc
        WHERE cpc.cpd = cs.cpd
      )
    `)
    .get().total;

  const koOverviewCountMismatches = db
    .prepare(`
      SELECT COUNT(*) AS total
      FROM compound_ko_overview cko
      WHERE cko.relation_count_total != cko.relation_count_hadeg + cko.relation_count_kegg
        OR cko.relation_count_hadeg != (
          SELECT COUNT(*)
          FROM compound_ko_pathway_rel rel
          WHERE rel.cpd = cko.cpd
            AND rel.ko = cko.ko
            AND rel.source = 'HADEG'
        )
        OR cko.relation_count_kegg != (
          SELECT COUNT(*)
          FROM compound_ko_pathway_rel rel
          WHERE rel.cpd = cko.cpd
            AND rel.ko = cko.ko
            AND rel.source = 'KEGG'
        )
    `)
    .get().total;

  const pathwaySupportAboveKoCount = db
    .prepare(`
      SELECT COUNT(*) AS total
      FROM compound_pathway_card cpc
      JOIN compound_summary cs ON cs.cpd = cpc.cpd
      WHERE cpc.source IN ('HADEG', 'KEGG')
        AND cpc.supporting_rows > cs.ko_count
    `)
    .get().total;

  return {
    compounds: tableCount('compound_summary'),
    genes: tableCount('gene_summary'),
    pathways: tableCount('pathway_summary'),
    toxicityEndpoints: tableCount('toxicity_endpoint'),
    compoundGeneMap: tableCount('compound_gene_map'),
    compoundPathwayMap: tableCount('compound_pathway_map'),
    compoundReferenceMap: tableCount('compound_reference_map'),
    compoundMetadata: tableCount('compound_metadata'),
    compoundGeneCard: tableCount('compound_gene_card'),
    compoundPathwayCard: tableCount('compound_pathway_card'),
    compoundKoPathwayRel: tableCount('compound_ko_pathway_rel'),
    compoundKoOverview: tableCount('compound_ko_overview'),
    invalidKo,
    invalidCpd,
    compoundsWithToxicity,
    pathwayCountMismatches,
    koOverviewCountMismatches,
    pathwaySupportAboveKoCount,
  };
}

async function main() {
  const runStartedAt = Date.now();
  const dbPath = process.env.SQLITE_DB_PATH || defaultDbPath;
  const generatedAt = now();

  console.log(`SQLite ingestion started at ${generatedAt}`);
  console.log(`Target DB: ${dbPath}`);

  const readStartedAt = Date.now();
  const raw = {
    biorempp: await readCsvFile(path.join(dataDir, DATASET_FILES.biorempp)),
    hadeg: await readCsvFile(path.join(dataDir, DATASET_FILES.hadeg)),
    kegg: await readCsvFile(path.join(dataDir, DATASET_FILES.kegg)),
    toxcsm: await readCsvFile(path.join(dataDir, DATASET_FILES.toxcsm)),
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
  const summaries = buildSummaries(
    bioremppRows,
    hadegByKo,
    keggByKo,
    toxByCpd,
    {
      version: extractVersionFromFilename(DATASET_FILES.biorempp),
      generatedAt,
    }
  );
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
    const inserted = ingestToSqlite(db, summaries);
    printStep(
      '6/8',
      `Data inserted (compounds=${inserted.compoundInserted}, genes=${inserted.geneInserted}, pathways=${inserted.pathwayInserted}, toxicity=${inserted.toxicityInserted}, ko_rel=${inserted.compoundKoPathwayRelInserted}, ko_overview=${inserted.compoundKoOverviewInserted})`,
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
    console.log(`- compound_summary rows: ${checks.compounds}`);
    console.log(`- gene_summary rows: ${checks.genes}`);
    console.log(`- pathway_summary rows: ${checks.pathways}`);
    console.log(`- toxicity_endpoint rows: ${checks.toxicityEndpoints}`);
    console.log(`- compound_gene_map rows: ${checks.compoundGeneMap}`);
    console.log(`- compound_pathway_map rows: ${checks.compoundPathwayMap}`);
    console.log(`- compound_reference_map rows: ${checks.compoundReferenceMap}`);
    console.log(`- compound_metadata rows: ${checks.compoundMetadata}`);
    console.log(`- compound_gene_card rows: ${checks.compoundGeneCard}`);
    console.log(`- compound_pathway_card rows: ${checks.compoundPathwayCard}`);
    console.log(`- compound_ko_pathway_rel rows: ${checks.compoundKoPathwayRel}`);
    console.log(`- compound_ko_overview rows: ${checks.compoundKoOverview}`);
    console.log(`- compounds with toxicity: ${checks.compoundsWithToxicity}`);
    console.log(`- pathway_count mismatches vs compound_pathway_card: ${checks.pathwayCountMismatches}`);
    console.log(`- ko_overview mismatches vs relation table: ${checks.koOverviewCountMismatches}`);
    console.log(`- pathway supports above ko_count (HADEG/KEGG): ${checks.pathwaySupportAboveKoCount}`);
    console.log(`- invalid ko across runtime tables: ${checks.invalidKo}`);
    console.log(`- invalid cpd across runtime tables: ${checks.invalidCpd}`);
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
