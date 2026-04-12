import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import Database from 'better-sqlite3';
import { createGuidedEngine } from './guided/engine.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const PORT = Number(process.env.PORT || (process.env.NODE_ENV === 'production' ? 3000 : 3101));
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || path.join(projectRoot, 'data', 'biorempp.sqlite');

if (!fs.existsSync(SQLITE_DB_PATH)) {
  throw new Error(`SQLite database not found at ${SQLITE_DB_PATH}. Run "npm run ingest:sqlite" first.`);
}

const db = new Database(SQLITE_DB_PATH, {
  readonly: true,
  fileMustExist: true,
});

const REQUIRED_RUNTIME_TABLES = [
  'compound_summary',
  'gene_summary',
  'pathway_summary',
  'toxicity_endpoint',
  'compound_gene_map',
  'compound_pathway_map',
  'compound_reference_map',
  'compound_metadata',
  'compound_gene_card',
  'compound_pathway_card',
  'compound_ko_pathway_rel',
  'compound_ko_overview',
];

const availableTables = new Set(
  db
    .prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
    `)
    .all()
    .map((row) => row.name)
);
const missingTables = REQUIRED_RUNTIME_TABLES.filter((tableName) => !availableTables.has(tableName));
if (missingTables.length > 0) {
  throw new Error(
    `SQLite runtime profile is invalid. Missing required tables: ${missingTables.join(', ')}. Run "npm run ingest:sqlite".`
  );
}

const hasCompoundMetadataTable = Boolean(
  db
    .prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = 'compound_metadata'
      LIMIT 1
    `)
    .get()
);

const app = express();
app.use(express.json());

const guidedEngine = createGuidedEngine({ db, projectRoot });
guidedEngine.getCatalogResponse();

function parsePositiveInt(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getPagination(query) {
  const page = Math.max(1, parsePositiveInt(query.page, 1));
  const pageSize = Math.min(200, Math.max(1, parsePositiveInt(query.pageSize, 50)));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

function parseOverviewLimit(value, fallback, max = 50) {
  return Math.min(max, Math.max(1, parsePositiveInt(value, fallback)));
}

function deriveRiskBucket(label) {
  const normalized = (label || '').toLowerCase().trim();
  if (!normalized) {
    return 'unknown';
  }
  if (normalized.includes('high toxicity') || normalized.includes('low safety')) {
    return 'high_risk';
  }
  if (normalized.includes('medium toxicity') || normalized.includes('medium safety')) {
    return 'medium_risk';
  }
  if (normalized.includes('low toxicity') || normalized.includes('high safety')) {
    return 'low_risk';
  }
  return 'unknown';
}

function likeValue(value) {
  return `%${value}%`;
}

function toPaginatedResponse(data, total, page, pageSize) {
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

function parseJsonObject(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    return {};
  }
  return {};
}

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return [];
  }
  return [];
}

function isMissingToken(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized === '' || normalized === '-' || normalized === 'NA' || normalized === 'N/A' || normalized === 'NULL';
}

function parseStringTokens(value, options = { allowCommaSplit: true }) {
  if (value === undefined || value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((token) => !isMissingToken(token));
  }

  const raw = String(value).trim();
  if (isMissingToken(raw)) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item).trim())
        .filter((token) => !isMissingToken(token));
    }
  } catch {
    // fall through to delimiter split
  }

  const delimiter = options.allowCommaSplit ? /[;,]/ : /[;]/;
  return raw
    .split(delimiter)
    .map((token) => token.trim().replace(/^"|"$/g, ''))
    .filter((token) => !isMissingToken(token));
}

function readDistinctStrings(sql, params = []) {
  const rows = db.prepare(sql).all(...params);
  return rows
    .map((row) => row.value)
    .filter((value) => value !== null && value !== undefined && value !== '');
}

function createEmptyCompoundMetadata(cpd) {
  return {
    identifiers: {
      cpd,
      compound_name: null,
      compound_class: null,
      ko_ids: [],
      gene_symbols: [],
      gene_names: [],
      chebi_id: null,
      smiles: null,
    },
    functional_annotation: {
      enzyme_activity: [],
      ec_numbers: [],
      pathways_hadeg: [],
      pathways_kegg: [],
      compound_pathway_class: [],
      reaction_count: 0,
    },
    chemical_information: {
      compound_name: null,
      compound_class: null,
      smiles: null,
      chebi: null,
    },
    data_sources: [],
    provenance: {
      version: 'unknown',
      last_updated: null,
      pipeline: 'BioRemPP Database Generator',
    },
    cross_references: {
      kegg_compound_id: cpd,
      chebi: null,
      ec_numbers: [],
      reaction_count: 0,
    },
    data_quality: {
      ko_format_valid: false,
      cpd_format_valid: /^C\d{5}$/.test(cpd),
      completeness_pct: 0,
      cross_references_coverage: '0/4',
    },
  };
}

app.get('/api/guided/catalog', (_req, res, next) => {
  try {
    res.json(guidedEngine.getCatalogResponse());
  } catch (error) {
    next(error);
  }
});

function handleGuidedRouteError(error, res, next) {
  if (!(error instanceof Error)) {
    next(error);
    return;
  }

  if (error.message.includes('not found')) {
    res.status(404).json({ error: error.message });
    return;
  }

  if (error.message.includes('Unsupported') || error.message.includes('Unknown') || error.message.includes('invalid')) {
    res.status(400).json({ error: error.message });
    return;
  }

  next(error);
}

app.get('/api/guided/queries/:id/options', (req, res, next) => {
  try {
    const rawFilters = {};
    for (const [key, value] of Object.entries(req.query || {})) {
      if (Array.isArray(value)) {
        rawFilters[key] = value[0];
      } else {
        rawFilters[key] = value;
      }
    }
    res.json(guidedEngine.getQueryOptions(req.params.id, rawFilters));
  } catch (error) {
    handleGuidedRouteError(error, res, next);
  }
});

app.post('/api/guided/queries/:id/execute', (req, res, next) => {
  try {
    res.json(guidedEngine.executeQuery(req.params.id, req.body || {}));
  } catch (error) {
    handleGuidedRouteError(error, res, next);
  }
});

app.get('/api/compounds', (req, res, next) => {
  try {
    const { page, pageSize, offset } = getPagination(req.query);
    const where = [];
    const params = [];

    if (req.query.compoundclass) {
      where.push('cs.compoundclass = ?');
      params.push(String(req.query.compoundclass));
    }
    if (req.query.reference_ag) {
      where.push(`
        EXISTS (
          SELECT 1
          FROM compound_reference_map crm
          WHERE crm.cpd = cs.cpd
            AND crm.reference_ag = ?
        )
      `);
      params.push(String(req.query.reference_ag));
    }
    if (req.query.pathway) {
      if (req.query.pathway_source) {
        where.push(`
          EXISTS (
            SELECT 1
            FROM compound_pathway_card cpc
            WHERE cpc.cpd = cs.cpd
              AND cpc.source = ?
              AND cpc.pathway = ?
          )
        `);
        params.push(String(req.query.pathway_source), String(req.query.pathway));
      } else {
        where.push(`
          EXISTS (
            SELECT 1
            FROM compound_pathway_card cpc
            WHERE cpc.cpd = cs.cpd
              AND cpc.pathway = ?
          )
        `);
        params.push(String(req.query.pathway));
      }
    } else if (req.query.pathway_source) {
      where.push(`
        EXISTS (
          SELECT 1
          FROM compound_pathway_card cpc
          WHERE cpc.cpd = cs.cpd
            AND cpc.source = ?
        )
      `);
      params.push(String(req.query.pathway_source));
    }
    if (req.query.gene) {
      where.push(`
        EXISTS (
          SELECT 1
          FROM compound_gene_map cgm
          WHERE cgm.cpd = cs.cpd
            AND cgm.genesymbol = ?
        )
      `);
      params.push(String(req.query.gene));
    }

    const koCountMin = parseNumber(req.query.ko_count_min);
    if (koCountMin !== undefined) {
      where.push('cs.ko_count >= ?');
      params.push(koCountMin);
    }
    const koCountMax = parseNumber(req.query.ko_count_max);
    if (koCountMax !== undefined) {
      where.push('cs.ko_count <= ?');
      params.push(koCountMax);
    }

    const geneCountMin = parseNumber(req.query.gene_count_min);
    if (geneCountMin !== undefined) {
      where.push('cs.gene_count >= ?');
      params.push(geneCountMin);
    }
    const geneCountMax = parseNumber(req.query.gene_count_max);
    if (geneCountMax !== undefined) {
      where.push('cs.gene_count <= ?');
      params.push(geneCountMax);
    }

    if (req.query.search) {
      const search = likeValue(String(req.query.search));
      where.push('(cs.compoundname LIKE ? COLLATE NOCASE OR cs.cpd LIKE ? COLLATE NOCASE)');
      params.push(search, search);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const total = db
      .prepare(`SELECT COUNT(*) AS total FROM compound_summary cs ${whereSql}`)
      .get(...params).total;

    const rows = db
      .prepare(`
        SELECT
          cs.cpd,
          cs.compoundname,
          cs.compoundclass,
          cs.reference_ag,
          cs.reference_count,
          cs.ko_count,
          cs.gene_count,
          cs.pathway_count,
          cs.toxicity_risk_mean,
          cs.high_risk_endpoint_count,
          cs.toxicity_scores,
          cs.smiles,
          cs.genes,
          cs.pathways,
          cs.updated_at
        FROM compound_summary cs
        ${whereSql}
        ORDER BY cs.gene_count DESC, cs.cpd ASC
        LIMIT ? OFFSET ?
      `)
      .all(...params, pageSize, offset)
      .map((row) => ({
        ...row,
        toxicity_scores: parseJsonObject(row.toxicity_scores),
        genes: parseJsonArray(row.genes),
        pathways: parseJsonArray(row.pathways),
      }));

    res.json(toPaginatedResponse(rows, total, page, pageSize));
  } catch (error) {
    next(error);
  }
});

app.get('/api/compounds/:cpd', (req, res, next) => {
  try {
    const row = db
      .prepare(`
        SELECT
          cpd,
          compoundname,
          compoundclass,
          reference_ag,
          reference_count,
          ko_count,
          gene_count,
          pathway_count,
          toxicity_risk_mean,
          high_risk_endpoint_count,
          toxicity_scores,
          smiles,
          genes,
          pathways,
          updated_at
        FROM compound_summary
        WHERE cpd = ?
        LIMIT 1
      `)
      .get(req.params.cpd);

    if (!row) {
      res.json(null);
      return;
    }

    res.json({
      ...row,
      toxicity_scores: parseJsonObject(row.toxicity_scores),
      genes: parseJsonArray(row.genes),
      pathways: parseJsonArray(row.pathways),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/compounds/:cpd/overview', (req, res, next) => {
  try {
    const cpd = req.params.cpd;
    const topKo = parseOverviewLimit(req.query.top_ko, 10);
    const topPathways = parseOverviewLimit(req.query.top_pathways, 10);

    const summary = db
      .prepare(
        `
          SELECT
            cpd,
            compoundname,
            compoundclass,
            reference_count,
            ko_count,
            gene_count,
            pathway_count,
            toxicity_risk_mean,
            high_risk_endpoint_count
          FROM compound_summary
          WHERE cpd = ?
          LIMIT 1
        `
      )
      .get(cpd);

    if (!summary) {
      res.status(404).json({ error: `Compound ${cpd} not found` });
      return;
    }

    const koBar = db
      .prepare(
        `
          SELECT
            ko,
            relation_count_total AS count,
            relation_count_hadeg,
            relation_count_kegg
          FROM compound_ko_overview
          WHERE cpd = ?
            AND relation_count_total > 0
          ORDER BY relation_count_total DESC, relation_count_hadeg DESC, relation_count_kegg DESC, ko ASC
          LIMIT ?
        `
      )
      .all(cpd, topKo);

    const pathwaysTopKegg = db
      .prepare(
        `
          SELECT
            source,
            pathway,
            supporting_rows
          FROM compound_pathway_card
          WHERE cpd = ?
            AND source = 'KEGG'
          ORDER BY supporting_rows DESC, pathway ASC
          LIMIT ?
        `
      )
      .all(cpd, topPathways);

    const pathwaysTopHadeg = db
      .prepare(
        `
          SELECT
            source,
            pathway,
            supporting_rows
          FROM compound_pathway_card
          WHERE cpd = ?
            AND source = 'HADEG'
          ORDER BY supporting_rows DESC, pathway ASC
          LIMIT ?
        `
      )
      .all(cpd, topPathways);

    const pathwaysAll = db
      .prepare(
        `
          SELECT
            source,
            pathway,
            supporting_rows
          FROM compound_pathway_card
          WHERE cpd = ?
            AND source IN ('KEGG', 'HADEG')
          ORDER BY source ASC, pathway ASC
        `
      )
      .all(cpd);

    const toxicityHeatmap = db
      .prepare(
        `
          SELECT
            endpoint,
            label,
            value
          FROM toxicity_endpoint
          WHERE cpd = ?
          ORDER BY endpoint ASC
        `
      )
      .all(cpd)
      .map((row) => ({
        ...row,
        risk_bucket: deriveRiskBucket(row.label),
      }));

    const pathwayScoreByName = new Map();
    for (const row of pathwaysAll) {
      const current = pathwayScoreByName.get(row.pathway) ?? 0;
      pathwayScoreByName.set(row.pathway, Math.max(current, Number(row.supporting_rows) || 0));
    }

    const selectedPathways = [...pathwayScoreByName.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, topPathways)
      .map(([pathway]) => pathway);

    const sourcePriority = ['KEGG', 'HADEG'];
    const sources = [...new Set(pathwaysAll.map((row) => row.source))].sort((a, b) => {
      const ai = sourcePriority.indexOf(a);
      const bi = sourcePriority.indexOf(b);
      if (ai !== -1 && bi !== -1) {
        return ai - bi;
      }
      if (ai !== -1) {
        return -1;
      }
      if (bi !== -1) {
        return 1;
      }
      return a.localeCompare(b);
    });

    const pathwayCellMap = new Map(
      pathwaysAll
        .filter((row) => selectedPathways.includes(row.pathway))
        .map((row) => [`${row.source}|${row.pathway}`, row])
    );

    const pathwayCoverageCells = [];
    for (const source of sources) {
      for (const pathway of selectedPathways) {
        const key = `${source}|${pathway}`;
        const row = pathwayCellMap.get(key);
        pathwayCoverageCells.push({
          source,
          pathway,
          present: row ? 1 : 0,
          weight: row ? Number(row.supporting_rows) || 0 : 0,
        });
      }
    }

    res.json({
      cpd,
      limits: {
        top_ko: topKo,
        top_pathways: topPathways,
      },
      summary,
      ko_bar: koBar.map((row) => ({
        ko: row.ko,
        count: Number(row.count) || 0,
        relation_count_hadeg: Number(row.relation_count_hadeg) || 0,
        relation_count_kegg: Number(row.relation_count_kegg) || 0,
      })),
      pathways_top_kegg: pathwaysTopKegg.map((row) => ({
        source: row.source,
        pathway: row.pathway,
        supporting_rows: Number(row.supporting_rows) || 0,
      })),
      pathways_top_hadeg: pathwaysTopHadeg.map((row) => ({
        source: row.source,
        pathway: row.pathway,
        supporting_rows: Number(row.supporting_rows) || 0,
      })),
      pathway_coverage: {
        sources,
        pathways: selectedPathways,
        cells: pathwayCoverageCells,
      },
      metric_basis: {
        ko_bar: 'distinct(cpd,ko,source,pathway)',
        pathways_top_kegg: 'distinct(cpd,ko,source,pathway)',
        pathways_top_hadeg: 'distinct(cpd,ko,source,pathway)',
        pathway_coverage_weight: 'distinct(cpd,ko,source,pathway)',
      },
      toxicity_heatmap: toxicityHeatmap.map((row) => ({
        endpoint: row.endpoint,
        label: row.label,
        value: row.value === null ? null : Number(row.value),
        risk_bucket: row.risk_bucket,
      })),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/compounds/:cpd/metadata', (req, res, next) => {
  try {
    const cpd = req.params.cpd;
    const emptyMetadata = createEmptyCompoundMetadata(cpd);

    if (!hasCompoundMetadataTable) {
      res.json(emptyMetadata);
      return;
    }

    const row = db
      .prepare(`
        SELECT metadata_json
        FROM compound_metadata
        WHERE cpd = ?
        LIMIT 1
      `)
      .get(cpd);

    if (!row?.metadata_json) {
      res.json(emptyMetadata);
      return;
    }

    const parsed = parseJsonObject(row.metadata_json);
    res.json({
      ...emptyMetadata,
      ...parsed,
      identifiers: {
        ...emptyMetadata.identifiers,
        ...(parsed.identifiers && typeof parsed.identifiers === 'object' ? parsed.identifiers : {}),
        cpd,
      },
      functional_annotation: {
        ...emptyMetadata.functional_annotation,
        ...(parsed.functional_annotation && typeof parsed.functional_annotation === 'object'
          ? parsed.functional_annotation
          : {}),
      },
      chemical_information: {
        ...emptyMetadata.chemical_information,
        ...(parsed.chemical_information && typeof parsed.chemical_information === 'object'
          ? parsed.chemical_information
          : {}),
      },
      provenance: {
        ...emptyMetadata.provenance,
        ...(parsed.provenance && typeof parsed.provenance === 'object' ? parsed.provenance : {}),
      },
      cross_references: {
        ...emptyMetadata.cross_references,
        ...(parsed.cross_references && typeof parsed.cross_references === 'object'
          ? parsed.cross_references
          : {}),
      },
      data_quality: {
        ...emptyMetadata.data_quality,
        ...(parsed.data_quality && typeof parsed.data_quality === 'object' ? parsed.data_quality : {}),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/compounds/:cpd/genes', (req, res, next) => {
  try {
    const { page, pageSize, offset } = getPagination(req.query);
    const where = ['cpd = ?'];
    const params = [req.params.cpd];

    if (req.query.search) {
      const search = likeValue(String(req.query.search));
      where.push(`
        (
          ko LIKE ? COLLATE NOCASE
          OR genesymbol LIKE ? COLLATE NOCASE
          OR genename LIKE ? COLLATE NOCASE
          OR enzyme_activity LIKE ? COLLATE NOCASE
          OR ec LIKE ? COLLATE NOCASE
        )
      `);
      params.push(search, search, search, search, search);
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const total = db
      .prepare(`SELECT COUNT(*) AS total FROM compound_gene_card ${whereSql}`)
      .get(...params).total;

    const rows = db
      .prepare(`
        SELECT
          cpd,
          ko,
          genesymbol,
          genename,
          enzyme_activity,
          ec,
          reaction_descriptions,
          supporting_rows,
          updated_at
        FROM compound_gene_card
        ${whereSql}
        ORDER BY supporting_rows DESC, genesymbol ASC, ko ASC
        LIMIT ? OFFSET ?
      `)
      .all(...params, pageSize, offset)
      .map((row) => {
        const reactionDescriptions = parseJsonArray(row.reaction_descriptions);
        return {
          ...row,
          reaction_descriptions: reactionDescriptions.slice(0, 10),
          reaction_descriptions_total: reactionDescriptions.length,
        };
      });

    res.json(toPaginatedResponse(rows, total, page, pageSize));
  } catch (error) {
    next(error);
  }
});

app.get('/api/compounds/:cpd/pathways', (req, res, next) => {
  try {
    const { page, pageSize, offset } = getPagination(req.query);
    const where = ['cpd = ?'];
    const params = [req.params.cpd];

    if (req.query.source) {
      where.push('source = ?');
      params.push(String(req.query.source));
    }
    if (req.query.search) {
      where.push('pathway LIKE ? COLLATE NOCASE');
      params.push(likeValue(String(req.query.search)));
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const total = db
      .prepare(`SELECT COUNT(*) AS total FROM compound_pathway_card ${whereSql}`)
      .get(...params).total;

    const rows = db
      .prepare(`
        SELECT
          cpd,
          source,
          pathway,
          supporting_rows,
          updated_at
        FROM compound_pathway_card
        ${whereSql}
        ORDER BY source ASC, pathway ASC
        LIMIT ? OFFSET ?
      `)
      .all(...params, pageSize, offset);

    res.json(toPaginatedResponse(rows, total, page, pageSize));
  } catch (error) {
    next(error);
  }
});

app.get('/api/compounds/:cpd/toxicity-profile', (req, res, next) => {
  try {
    const { page, pageSize, offset } = getPagination(req.query);
    const where = ['cpd = ?'];
    const params = [req.params.cpd];

    if (req.query.endpoint) {
      where.push('endpoint = ?');
      params.push(String(req.query.endpoint));
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const total = db
      .prepare(`SELECT COUNT(*) AS total FROM toxicity_endpoint ${whereSql}`)
      .get(...params).total;

    const rows = db
      .prepare(`
        SELECT
          cpd,
          compoundname,
          compoundclass,
          endpoint,
          label,
          value,
          updated_at
        FROM toxicity_endpoint
        ${whereSql}
        ORDER BY endpoint ASC
        LIMIT ? OFFSET ?
      `)
      .all(...params, pageSize, offset);

    res.json(toPaginatedResponse(rows, total, page, pageSize));
  } catch (error) {
    next(error);
  }
});

app.get('/api/genes/:ko', (req, res, next) => {
  try {
    const ko = String(req.params.ko || '').trim().toUpperCase();
    if (!ko) {
      res.status(400).json({ error: 'Missing required parameter: ko' });
      return;
    }

    const gene = db
      .prepare(`
        SELECT
          ko,
          genesymbol,
          genename,
          compound_count,
          pathway_count,
          enzyme_activities,
          updated_at
        FROM gene_summary
        WHERE ko = ?
      `)
      .get(ko);

    if (!gene) {
      res.status(404).json({ error: `Gene "${ko}" not found` });
      return;
    }

    const compoundClassCount = db
      .prepare(`
        SELECT COUNT(DISTINCT cs.compoundclass) AS total
        FROM compound_gene_card cgc
        JOIN compound_summary cs
          ON cs.cpd = cgc.cpd
        WHERE cgc.ko = ?
          AND cs.compoundclass IS NOT NULL
          AND TRIM(cs.compoundclass) <> ''
      `)
      .get(ko).total;

    const referenceAgencyCount = db
      .prepare(`
        SELECT COUNT(DISTINCT crm.reference_ag) AS total
        FROM compound_reference_map crm
        JOIN (
          SELECT DISTINCT cpd
          FROM compound_gene_card
          WHERE ko = ?
        ) cpd_scope
          ON cpd_scope.cpd = crm.cpd
      `)
      .get(ko).total;

    const toxicityCounts = db
      .prepare(`
        SELECT
          COUNT(*) AS total_compounds,
          SUM(CASE WHEN cs.toxicity_risk_mean IS NOT NULL THEN 1 ELSE 0 END) AS with_toxicity
        FROM (
          SELECT DISTINCT cpd
          FROM compound_gene_card
          WHERE ko = ?
        ) cpd_scope
        JOIN compound_summary cs
          ON cs.cpd = cpd_scope.cpd
      `)
      .get(ko);

    const toxicityCoveragePct =
      toxicityCounts.total_compounds > 0
        ? Math.round((toxicityCounts.with_toxicity / toxicityCounts.total_compounds) * 100)
        : null;

    res.json({
      ko: gene.ko,
      genesymbol: gene.genesymbol,
      genename: gene.genename,
      compound_count: gene.compound_count,
      pathway_count: gene.pathway_count,
      enzyme_activities: parseJsonArray(gene.enzyme_activities),
      compound_class_count: compoundClassCount,
      reference_agency_count: referenceAgencyCount,
      toxicity_coverage_pct: toxicityCoveragePct,
      updated_at: gene.updated_at,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/genes/:ko/overview', (req, res, next) => {
  try {
    const ko = String(req.params.ko || '').trim().toUpperCase();
    if (!ko) {
      res.status(400).json({ error: 'Missing required parameter: ko' });
      return;
    }

    const exists = db.prepare('SELECT 1 FROM gene_summary WHERE ko = ? LIMIT 1').get(ko);
    if (!exists) {
      res.status(404).json({ error: `Gene "${ko}" not found` });
      return;
    }

    const linkedCompoundsTotal = db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM (
          SELECT DISTINCT cpd
          FROM compound_gene_card
          WHERE ko = ?
        )
      `)
      .get(ko).total;

    const endpoints = readDistinctStrings(`
      SELECT DISTINCT endpoint AS value
      FROM toxicity_endpoint
      ORDER BY endpoint ASC
    `);

    const toxicityRows = db
      .prepare(`
        SELECT
          te.cpd,
          te.endpoint,
          te.label,
          te.value,
          cs.compoundname
        FROM toxicity_endpoint te
        JOIN (
          SELECT DISTINCT cpd
          FROM compound_gene_card
          WHERE ko = ?
        ) cpd_scope
          ON cpd_scope.cpd = te.cpd
        LEFT JOIN compound_summary cs
          ON cs.cpd = te.cpd
        ORDER BY COALESCE(cs.compoundname, te.cpd) ASC, te.cpd ASC, te.endpoint ASC
      `)
      .all(ko);

    const compoundsWithToxicity = new Map();
    for (const row of toxicityRows) {
      const cpd = String(row.cpd || '').trim();
      if (!cpd) {
        continue;
      }
      if (!compoundsWithToxicity.has(cpd)) {
        compoundsWithToxicity.set(cpd, {
          cpd,
          compoundname: row.compoundname || null,
        });
      }
    }

    const compounds = [...compoundsWithToxicity.values()];
    const toxicityCompounds = compounds.length;
    const excludedNoToxicity = Math.max(0, linkedCompoundsTotal - toxicityCompounds);
    const toxicityCoveragePct =
      linkedCompoundsTotal > 0 ? Math.round((toxicityCompounds / linkedCompoundsTotal) * 100) : null;

    res.json({
      ko,
      summary: {
        linked_compounds_total: linkedCompoundsTotal,
        toxicity_compounds: toxicityCompounds,
        excluded_no_toxicity: excludedNoToxicity,
        endpoint_count: endpoints.length,
        toxicity_coverage_pct: toxicityCoveragePct,
      },
      toxicity_matrix: {
        compounds,
        endpoints,
        cells: toxicityRows.map((row) => ({
          cpd: row.cpd,
          endpoint: row.endpoint,
          label: row.label,
          value: row.value === null ? null : Number(row.value),
          risk_bucket: deriveRiskBucket(row.label),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/genes/:ko/compounds', (req, res, next) => {
  try {
    const ko = String(req.params.ko || '').trim().toUpperCase();
    if (!ko) {
      res.status(400).json({ error: 'Missing required parameter: ko' });
      return;
    }

    const exists = db.prepare('SELECT 1 FROM gene_summary WHERE ko = ? LIMIT 1').get(ko);
    if (!exists) {
      res.status(404).json({ error: `Gene "${ko}" not found` });
      return;
    }

    const { page, pageSize, offset } = getPagination(req.query);

    const total = db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM (
          SELECT DISTINCT cpd
          FROM compound_gene_card
          WHERE ko = ?
        )
      `)
      .get(ko).total;

    const rows = db
      .prepare(`
        SELECT
          cs.cpd,
          cs.compoundname,
          cs.compoundclass,
          cs.reference_ag,
          cs.reference_count,
          cs.ko_count,
          cs.gene_count,
          cs.pathway_count,
          cs.toxicity_risk_mean,
          cs.high_risk_endpoint_count,
          cs.smiles,
          cs.updated_at
        FROM compound_summary cs
        JOIN (
          SELECT DISTINCT cpd
          FROM compound_gene_card
          WHERE ko = ?
        ) cpd_scope
          ON cpd_scope.cpd = cs.cpd
        ORDER BY COALESCE(cs.compoundname, cs.cpd) ASC, cs.cpd ASC
        LIMIT ? OFFSET ?
      `)
      .all(ko, pageSize, offset);

    res.json(toPaginatedResponse(rows, total, page, pageSize));
  } catch (error) {
    next(error);
  }
});

app.get('/api/genes/:ko/metadata', (req, res, next) => {
  try {
    const ko = String(req.params.ko || '').trim().toUpperCase();
    if (!ko) {
      res.status(400).json({ error: 'Missing required parameter: ko' });
      return;
    }

    const gene = db
      .prepare(`
        SELECT
          ko,
          genesymbol,
          genename,
          compound_count,
          pathway_count,
          updated_at
        FROM gene_summary
        WHERE ko = ?
      `)
      .get(ko);

    if (!gene) {
      res.status(404).json({ error: `Gene "${ko}" not found` });
      return;
    }

    const compounds = db
      .prepare(`
        SELECT
          cs.cpd,
          cs.compoundname,
          cs.compoundclass,
          cs.smiles,
          cs.toxicity_risk_mean
        FROM compound_summary cs
        JOIN (
          SELECT DISTINCT cpd
          FROM compound_gene_card
          WHERE ko = ?
        ) cpd_scope
          ON cpd_scope.cpd = cs.cpd
      `)
      .all(ko);

    const compoundClassSet = new Set();
    const smilesSet = new Set();
    const smilesMap = new Map();
    let toxicityWithCoverage = 0;

    for (const compound of compounds) {
      const compoundClass = String(compound.compoundclass || '').trim();
      if (!isMissingToken(compoundClass)) {
        compoundClassSet.add(compoundClass);
      }

      const smiles = String(compound.smiles || '').trim();
      if (!isMissingToken(smiles)) {
        smilesSet.add(smiles);
        if (!smilesMap.has(smiles)) {
          smilesMap.set(smiles, String(compound.compoundname || '').trim() || null);
        }
      }

      if (compound.toxicity_risk_mean !== null && compound.toxicity_risk_mean !== undefined) {
        toxicityWithCoverage += 1;
      }
    }

    const toxicityCoveragePct =
      compounds.length > 0 ? Math.round((toxicityWithCoverage / compounds.length) * 100) : null;

    const pathwayBySource = db
      .prepare(`
        SELECT
          source,
          COUNT(DISTINCT pathway) AS pathway_count
        FROM compound_ko_pathway_rel
        WHERE ko = ?
        GROUP BY source
      `)
      .all(ko);

    const pathwaysBySource = {
      HADEG: 0,
      KEGG: 0,
      COMPOUND_PATHWAY: 0,
    };
    for (const row of pathwayBySource) {
      const source = String(row.source || '').trim();
      if (source in pathwaysBySource) {
        pathwaysBySource[source] = row.pathway_count;
      }
    }

    const referenceAgencyCount = db
      .prepare(`
        SELECT COUNT(DISTINCT crm.reference_ag) AS total
        FROM compound_reference_map crm
        JOIN (
          SELECT DISTINCT cpd
          FROM compound_gene_card
          WHERE ko = ?
        ) cpd_scope
          ON cpd_scope.cpd = crm.cpd
      `)
      .get(ko).total;

    const metadataRows = db
      .prepare(`
        SELECT cm.metadata_json
        FROM compound_metadata cm
        JOIN (
          SELECT DISTINCT cpd
          FROM compound_gene_card
          WHERE ko = ?
        ) cpd_scope
          ON cpd_scope.cpd = cm.cpd
      `)
      .all(ko);

    const chebiSet = new Set();
    const chebiMap = new Map();
    for (const row of metadataRows) {
      const payload = parseJsonObject(row.metadata_json);
      const chebi = String(
        payload?.cross_references?.chebi || payload?.identifiers?.chebi_id || ''
      ).trim();
      if (!isMissingToken(chebi)) {
        chebiSet.add(chebi);
        const compoundName = String(
          payload?.identifiers?.compound_name || payload?.chemical_information?.compound_name || ''
        ).trim();
        if (!chebiMap.has(chebi)) {
          chebiMap.set(chebi, compoundName || null);
        }
      }
    }

    const cardRows = db
      .prepare(`
        SELECT
          enzyme_activity,
          ec,
          reactions,
          reaction_descriptions
        FROM compound_gene_card
        WHERE ko = ?
      `)
      .all(ko);

    const enzymeActivitySet = new Set();
    const ecSet = new Set();
    const reactionIdSet = new Set();
    const reactionDescriptionMap = new Map();

    for (const row of cardRows) {
      const enzymeActivity = String(row.enzyme_activity || '').trim();
      if (!isMissingToken(enzymeActivity)) {
        enzymeActivitySet.add(enzymeActivity);
      }

      for (const token of parseStringTokens(row.ec)) {
        ecSet.add(token);
      }

      const reactionIds = parseStringTokens(row.reactions);
      const reactionDescriptions = parseStringTokens(row.reaction_descriptions, { allowCommaSplit: false });

      for (const token of reactionIds) {
        reactionIdSet.add(token);
      }

      if (reactionIds.length > 0 && reactionDescriptions.length > 0) {
        if (reactionIds.length === reactionDescriptions.length) {
          for (let i = 0; i < reactionIds.length; i += 1) {
            const id = reactionIds[i];
            const description = reactionDescriptions[i];
            if (!reactionDescriptionMap.has(id)) {
              reactionDescriptionMap.set(id, description);
            }
          }
        } else if (reactionDescriptions.length === 1) {
          const description = reactionDescriptions[0];
          for (const id of reactionIds) {
            if (!reactionDescriptionMap.has(id)) {
              reactionDescriptionMap.set(id, description);
            }
          }
        }
      }
    }

    const dataSources = [
      { name: 'BioRemPP', role: 'Core KO-gene-compound mapping', color: 'green' },
    ];
    if (pathwaysBySource.HADEG > 0) {
      dataSources.push({ name: 'HADEG', role: 'Hydrocarbon degradation pathways', color: 'blue' });
    }
    if (pathwaysBySource.KEGG > 0) {
      dataSources.push({ name: 'KEGG', role: 'Metabolic pathway annotation', color: 'purple' });
    }
    if (toxicityWithCoverage > 0) {
      dataSources.push({ name: 'ToxCSM', role: 'Toxicity prediction for linked compounds', color: 'orange' });
    }

    const sortedChebi = [...chebiSet].sort((a, b) => a.localeCompare(b));
    const sortedSmiles = [...smilesSet].sort((a, b) => a.localeCompare(b));
    const sortedReactions = [...reactionIdSet].sort((a, b) => a.localeCompare(b));
    const sortedEc = [...ecSet].sort((a, b) => a.localeCompare(b));

    res.json({
      identifiers: {
        ko: gene.ko,
        gene_symbol: gene.genesymbol,
        gene_name: gene.genename,
        kegg_ko_id: gene.ko,
        ec_numbers: sortedEc,
        chebi_ids: sortedChebi,
        smiles: sortedSmiles,
        reaction_ids: sortedReactions,
        chebi_items: sortedChebi.map((id) => ({
          id,
          compound_name: chebiMap.get(id) || null,
        })),
        smiles_items: sortedSmiles.map((value) => ({
          value,
          compound_name: smilesMap.get(value) || null,
        })),
        reaction_items: sortedReactions.map((id) => ({
          id,
          description: reactionDescriptionMap.get(id) || null,
        })),
      },
      data_sources: dataSources,
      quantitative_overview: {
        linked_compounds: compounds.length,
        compound_classes: compoundClassSet.size,
        pathway_annotations: gene.pathway_count,
        pathways_hadeg: pathwaysBySource.HADEG,
        pathways_kegg: pathwaysBySource.KEGG,
        pathways_compound_pathway: pathwaysBySource.COMPOUND_PATHWAY,
        ec_count: ecSet.size,
        enzyme_activity_count: enzymeActivitySet.size,
        reference_agencies: referenceAgencyCount,
        toxicity_coverage_pct: toxicityCoveragePct,
        reaction_id_count: sortedReactions.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/genes', (req, res, next) => {
  try {
    const { page, pageSize, offset } = getPagination(req.query);
    const where = [];
    const params = [];

    if (req.query.genesymbol) {
      where.push('genesymbol = ?');
      params.push(String(req.query.genesymbol));
    }

    const compoundMin = parseNumber(req.query.compound_count_min);
    if (compoundMin !== undefined) {
      where.push('compound_count >= ?');
      params.push(compoundMin);
    }

    const compoundMax = parseNumber(req.query.compound_count_max);
    if (compoundMax !== undefined) {
      where.push('compound_count <= ?');
      params.push(compoundMax);
    }

    if (req.query.search) {
      const search = likeValue(String(req.query.search));
      where.push('(genesymbol LIKE ? COLLATE NOCASE OR genename LIKE ? COLLATE NOCASE OR ko LIKE ? COLLATE NOCASE)');
      params.push(search, search, search);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const total = db
      .prepare(`SELECT COUNT(*) AS total FROM gene_summary ${whereSql}`)
      .get(...params).total;

    const rows = db
      .prepare(`
        SELECT
          ko,
          genesymbol,
          genename,
          compound_count,
          pathway_count,
          enzyme_activities,
          updated_at
        FROM gene_summary
        ${whereSql}
        ORDER BY compound_count DESC, ko ASC
        LIMIT ? OFFSET ?
      `)
      .all(...params, pageSize, offset)
      .map((row) => ({
        ...row,
        enzyme_activities: parseJsonArray(row.enzyme_activities),
      }));

    res.json(toPaginatedResponse(rows, total, page, pageSize));
  } catch (error) {
    next(error);
  }
});

app.get('/api/compound-classes', (req, res, next) => {
  try {
    const { page, pageSize, offset } = getPagination(req.query);
    const where = ['cs.compoundclass IS NOT NULL', "TRIM(cs.compoundclass) <> ''"];
    const params = [];

    if (req.query.search) {
      where.push('cs.compoundclass LIKE ? COLLATE NOCASE');
      params.push(likeValue(String(req.query.search)));
    }

    const whereSql = `WHERE ${where.join(' AND ')}`;
    const total = db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM (
          SELECT cs.compoundclass
          FROM compound_summary cs
          ${whereSql}
          GROUP BY cs.compoundclass
        )
      `)
      .get(...params).total;

    const rows = db
      .prepare(`
        SELECT
          cs.compoundclass,
          COUNT(DISTINCT cs.cpd) AS compound_count,
          COUNT(DISTINCT cgc.ko) AS ko_count,
          COUNT(DISTINCT cgc.genesymbol) AS gene_count,
          COUNT(DISTINCT CASE WHEN cpc.pathway IS NOT NULL AND cpc.source IS NOT NULL THEN cpc.source || '|' || cpc.pathway END) AS pathway_count,
          MAX(cs.updated_at) AS updated_at
        FROM compound_summary cs
        LEFT JOIN compound_gene_card cgc
          ON cgc.cpd = cs.cpd
        LEFT JOIN compound_pathway_card cpc
          ON cpc.cpd = cs.cpd
        ${whereSql}
        GROUP BY cs.compoundclass
        ORDER BY compound_count DESC, cs.compoundclass ASC
        LIMIT ? OFFSET ?
      `)
      .all(...params, pageSize, offset);

    res.json(toPaginatedResponse(rows, total, page, pageSize));
  } catch (error) {
    next(error);
  }
});

app.get('/api/compound-classes/detail/overview', (req, res, next) => {
  try {
    const compoundclass = String(req.query.compoundclass || '').trim();
    if (!compoundclass) {
      res.status(400).json({ error: 'Missing required query parameter: compoundclass' });
      return;
    }

    const compounds = db
      .prepare(`
        SELECT
          cs.cpd,
          cs.compoundname
        FROM compound_summary cs
        WHERE cs.compoundclass = ?
        ORDER BY COALESCE(cs.compoundname, cs.cpd) ASC, cs.cpd ASC
      `)
      .all(compoundclass);

    if (compounds.length === 0) {
      res.status(404).json({ error: `Compound class "${compoundclass}" not found` });
      return;
    }

    const geneRows = db
      .prepare(`
        SELECT DISTINCT
          cgc.cpd,
          cgc.ko,
          cgc.genesymbol,
          cgc.ec
        FROM compound_gene_card cgc
        JOIN compound_summary cs
          ON cs.cpd = cgc.cpd
        WHERE cs.compoundclass = ?
      `)
      .all(compoundclass);

    const pathwayRows = db
      .prepare(`
        SELECT DISTINCT
          cpc.source,
          cpc.pathway
        FROM compound_pathway_card cpc
        JOIN compound_summary cs
          ON cs.cpd = cpc.cpd
        WHERE cs.compoundclass = ?
      `)
      .all(compoundclass);

    const koSet = new Set(geneRows.map((row) => row.ko).filter(Boolean));
    const geneSet = new Set(
      geneRows.map((row) => String(row.genesymbol || '').trim()).filter((value) => value.length > 0)
    );

    const koToCompounds = new Map();
    for (const row of geneRows) {
      const ko = String(row.ko || '').trim();
      const cpd = String(row.cpd || '').trim();
      if (!ko || !cpd) {
        continue;
      }
      if (!koToCompounds.has(ko)) {
        koToCompounds.set(ko, new Set());
      }
      koToCompounds.get(ko).add(cpd);
    }

    const koDistribution = [...koToCompounds.entries()]
      .map(([ko, compounds]) => ({
        ko,
        count: compounds.size,
      }))
      .sort((a, b) => b.count - a.count || a.ko.localeCompare(b.ko))
      .slice(0, 10);

    const geneToCompounds = new Map();
    for (const row of geneRows) {
      const gene = String(row.genesymbol || '').trim();
      const cpd = String(row.cpd || '').trim();
      if (!cpd || !gene) {
        continue;
      }
      if (!geneToCompounds.has(gene)) {
        geneToCompounds.set(gene, new Set());
      }
      geneToCompounds.get(gene).add(cpd);
    }

    const geneDistribution = [...geneToCompounds.entries()]
      .map(([gene, compounds]) => ({
        gene,
        count: compounds.size,
      }))
      .sort((a, b) => b.count - a.count || a.gene.localeCompare(b.gene))
      .slice(0, 10);

    const ecTokenSet = new Set();
    for (const row of geneRows) {
      const rawEc = String(row.ec || '').trim();
      if (!rawEc) {
        continue;
      }
      for (const token of rawEc.split(/[;,]/)) {
        const ec = token.trim();
        if (ec && ec !== '-') {
          ecTokenSet.add(ec);
        }
      }
    }

    const ecClassCount = new Map();
    for (const ec of ecTokenSet) {
      const match = /^([1-9])\./.exec(ec);
      const key = match ? `${match[1]}.x.x.x` : 'Other';
      ecClassCount.set(key, (ecClassCount.get(key) || 0) + 1);
    }

    const ecClassOrder = ['1.x.x.x', '2.x.x.x', '3.x.x.x', '4.x.x.x', '5.x.x.x', '6.x.x.x', '7.x.x.x', 'Other'];
    const ecClassDistribution = [...ecClassCount.entries()]
      .map(([ecClass, count]) => ({ ec_class: ecClass, count }))
      .sort((a, b) => {
        const ai = ecClassOrder.indexOf(a.ec_class);
        const bi = ecClassOrder.indexOf(b.ec_class);
        if (ai !== -1 && bi !== -1) {
          return ai - bi;
        }
        if (ai !== -1) {
          return -1;
        }
        if (bi !== -1) {
          return 1;
        }
        return a.ec_class.localeCompare(b.ec_class);
      });

    const pathwaySet = new Set(
      pathwayRows
        .map((row) => {
          const source = String(row.source || '').trim();
          const pathway = String(row.pathway || '').trim();
          if (!source || !pathway) {
            return null;
          }
          return `${source}|${pathway}`;
        })
        .filter(Boolean)
    );

    const sourceSet = new Set(
      pathwayRows.map((row) => String(row.source || '').trim()).filter((value) => value.length > 0)
    );

    const endpoints = readDistinctStrings(`
      SELECT DISTINCT endpoint AS value
      FROM toxicity_endpoint
      ORDER BY endpoint ASC
    `);

    const toxicityRows = db
      .prepare(`
        SELECT
          te.cpd,
          te.endpoint,
          te.label,
          te.value
        FROM toxicity_endpoint te
        JOIN compound_summary cs
          ON cs.cpd = te.cpd
        WHERE cs.compoundclass = ?
        ORDER BY te.cpd ASC, te.endpoint ASC
      `)
      .all(compoundclass);

    const compoundsWithToxicity = new Set(toxicityRows.map((row) => row.cpd).filter(Boolean));
    const toxicityCoveragePct =
      compounds.length > 0 ? Math.round((compoundsWithToxicity.size / compounds.length) * 100) : null;

    res.json({
      compoundclass,
      summary: {
        compoundclass,
        ko_count: koSet.size,
        gene_count: geneSet.size,
        compound_count: compounds.length,
        reaction_ec_count: ecTokenSet.size,
        pathway_count: pathwaySet.size,
        source_count: sourceSet.size,
        toxicity_coverage_pct: toxicityCoveragePct,
      },
      ko_distribution: koDistribution,
      gene_distribution: geneDistribution,
      ec_class_distribution: ecClassDistribution,
      toxicity_matrix: {
        compounds: compounds.map((row) => ({
          cpd: row.cpd,
          compoundname: row.compoundname || null,
        })),
        endpoints,
        cells: toxicityRows.map((row) => ({
          cpd: row.cpd,
          endpoint: row.endpoint,
          label: row.label,
          value: row.value === null ? null : Number(row.value),
          risk_bucket: deriveRiskBucket(row.label),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/pathways/detail/overview', (req, res, next) => {
  try {
    const pathway = String(req.query.pathway || '').trim();
    if (!pathway) {
      res.status(400).json({ error: 'Missing required query parameter: pathway' });
      return;
    }

    const sourceRaw = String(req.query.source || '').trim().toUpperCase();
    const useSourceFilter = sourceRaw !== '' && sourceRaw !== 'ALL';

    const availableSources = readDistinctStrings(
      `
        SELECT DISTINCT source AS value
        FROM compound_pathway_card
        WHERE pathway = ?
        ORDER BY source ASC
      `,
      [pathway]
    );

    if (availableSources.length === 0) {
      res.status(404).json({ error: `Pathway "${pathway}" not found` });
      return;
    }

    if (useSourceFilter && !availableSources.includes(sourceRaw)) {
      res.status(404).json({ error: `Pathway "${pathway}" not found for source "${sourceRaw}"` });
      return;
    }

    const sourceWhere = useSourceFilter ? ' AND source = ?' : '';
    const sourceParams = useSourceFilter ? [sourceRaw] : [];

    const compounds = db
      .prepare(
        `
          SELECT DISTINCT
            cpc.cpd,
            cs.compoundname
          FROM compound_pathway_card cpc
          LEFT JOIN compound_summary cs
            ON cs.cpd = cpc.cpd
          WHERE cpc.pathway = ?${sourceWhere}
          ORDER BY COALESCE(cs.compoundname, cpc.cpd) ASC, cpc.cpd ASC
        `
      )
      .all(pathway, ...sourceParams);

    const relations = db
      .prepare(
        `
          SELECT DISTINCT
            cpd,
            ko,
            source
          FROM compound_ko_pathway_rel
          WHERE pathway = ?${sourceWhere}
        `
      )
      .all(pathway, ...sourceParams);

    const geneRows = db
      .prepare(
        `
          SELECT DISTINCT
            cgc.cpd,
            cgc.ko,
            cgc.genesymbol,
            cgc.ec
          FROM compound_gene_card cgc
          JOIN compound_ko_pathway_rel rel
            ON rel.cpd = cgc.cpd
           AND rel.ko = cgc.ko
          WHERE rel.pathway = ?${useSourceFilter ? ' AND rel.source = ?' : ''}
        `
      )
      .all(pathway, ...sourceParams);

    const koSet = new Set(relations.map((row) => row.ko).filter(Boolean));
    const geneSet = new Set(
      geneRows.map((row) => String(row.genesymbol || '').trim()).filter((value) => value.length > 0)
    );

    const koToCompounds = new Map();
    for (const row of relations) {
      const ko = String(row.ko || '').trim();
      const cpd = String(row.cpd || '').trim();
      if (!ko || !cpd) {
        continue;
      }
      if (!koToCompounds.has(ko)) {
        koToCompounds.set(ko, new Set());
      }
      koToCompounds.get(ko).add(cpd);
    }

    const koDistribution = [...koToCompounds.entries()]
      .map(([ko, compounds]) => ({
        ko,
        count: compounds.size,
      }))
      .sort((a, b) => b.count - a.count || a.ko.localeCompare(b.ko))
      .slice(0, 10);

    const geneToCompounds = new Map();
    for (const row of geneRows) {
      const gene = String(row.genesymbol || '').trim();
      const cpd = String(row.cpd || '').trim();
      if (!cpd || !gene) {
        continue;
      }
      if (!geneToCompounds.has(gene)) {
        geneToCompounds.set(gene, new Set());
      }
      geneToCompounds.get(gene).add(cpd);
    }

    const geneDistribution = [...geneToCompounds.entries()]
      .map(([gene, compounds]) => ({
        gene,
        count: compounds.size,
      }))
      .sort((a, b) => b.count - a.count || a.gene.localeCompare(b.gene))
      .slice(0, 10);

    const ecTokenSet = new Set();
    for (const row of geneRows) {
      const rawEc = String(row.ec || '').trim();
      if (!rawEc) {
        continue;
      }
      for (const token of rawEc.split(/[;,]/)) {
        const ec = token.trim();
        if (ec && ec !== '-') {
          ecTokenSet.add(ec);
        }
      }
    }

    const ecClassCount = new Map();
    for (const ec of ecTokenSet) {
      const match = /^([1-9])\./.exec(ec);
      const key = match ? `${match[1]}.x.x.x` : 'Other';
      ecClassCount.set(key, (ecClassCount.get(key) || 0) + 1);
    }

    const ecClassOrder = ['1.x.x.x', '2.x.x.x', '3.x.x.x', '4.x.x.x', '5.x.x.x', '6.x.x.x', '7.x.x.x', 'Other'];
    const ecClassDistribution = [...ecClassCount.entries()]
      .map(([ecClass, count]) => ({ ec_class: ecClass, count }))
      .sort((a, b) => {
        const ai = ecClassOrder.indexOf(a.ec_class);
        const bi = ecClassOrder.indexOf(b.ec_class);
        if (ai !== -1 && bi !== -1) {
          return ai - bi;
        }
        if (ai !== -1) {
          return -1;
        }
        if (bi !== -1) {
          return 1;
        }
        return a.ec_class.localeCompare(b.ec_class);
      });

    let koOverlapPct = null;
    if (!useSourceFilter && availableSources.includes('KEGG') && availableSources.includes('HADEG')) {
      const keggKos = new Set(
        relations
          .filter((row) => row.source === 'KEGG')
          .map((row) => row.ko)
          .filter(Boolean)
      );
      const hadegKos = new Set(
        relations
          .filter((row) => row.source === 'HADEG')
          .map((row) => row.ko)
          .filter(Boolean)
      );
      const union = new Set([...keggKos, ...hadegKos]);
      if (union.size > 0) {
        const intersection = [...keggKos].filter((ko) => hadegKos.has(ko)).length;
        koOverlapPct = Math.round((intersection / union.size) * 100);
      }
    }

    const endpoints = readDistinctStrings(`
      SELECT DISTINCT endpoint AS value
      FROM toxicity_endpoint
      ORDER BY endpoint ASC
    `);

    const toxicityRows = db
      .prepare(
        `
          SELECT
            te.cpd,
            te.endpoint,
            te.label,
            te.value
          FROM toxicity_endpoint te
          JOIN (
            SELECT DISTINCT cpd
            FROM compound_pathway_card
            WHERE pathway = ?${sourceWhere}
          ) cpd_scope
            ON cpd_scope.cpd = te.cpd
          ORDER BY te.cpd ASC, te.endpoint ASC
        `
      )
      .all(pathway, ...sourceParams);

    res.json({
      pathway,
      available_sources: availableSources,
      selected_source: useSourceFilter ? sourceRaw : 'ALL',
      summary: {
        pathway,
        selected_source: useSourceFilter ? sourceRaw : 'ALL',
        ko_count: koSet.size,
        gene_count: geneSet.size,
        compound_count: compounds.length,
        reaction_ec_count: ecTokenSet.size,
        source_count: useSourceFilter ? 1 : availableSources.length,
        ko_overlap_pct: koOverlapPct,
      },
      ko_distribution: koDistribution,
      gene_distribution: geneDistribution,
      ec_class_distribution: ecClassDistribution,
      toxicity_matrix: {
        compounds: compounds.map((row) => ({
          cpd: row.cpd,
          compoundname: row.compoundname || null,
        })),
        endpoints,
        cells: toxicityRows.map((row) => ({
          cpd: row.cpd,
          endpoint: row.endpoint,
          label: row.label,
          value: row.value === null ? null : Number(row.value),
          risk_bucket: deriveRiskBucket(row.label),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/pathways', (req, res, next) => {
  try {
    const { page, pageSize, offset } = getPagination(req.query);
    const where = [];
    const params = [];

    if (req.query.source) {
      where.push('source = ?');
      params.push(String(req.query.source));
    }

    if (req.query.search) {
      where.push('pathway LIKE ? COLLATE NOCASE');
      params.push(likeValue(String(req.query.search)));
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const total = db
      .prepare(`SELECT COUNT(*) AS total FROM pathway_summary ${whereSql}`)
      .get(...params).total;

    const rows = db
      .prepare(`
        SELECT
          pathway,
          source,
          compound_count,
          gene_count,
          updated_at
        FROM pathway_summary
        ${whereSql}
        ORDER BY compound_count DESC, pathway ASC
        LIMIT ? OFFSET ?
      `)
      .all(...params, pageSize, offset);

    res.json(toPaginatedResponse(rows, total, page, pageSize));
  } catch (error) {
    next(error);
  }
});

app.get('/api/toxicity', (req, res, next) => {
  try {
    const { page, pageSize, offset } = getPagination(req.query);
    const where = [];
    const params = [];

    if (req.query.endpoint) {
      where.push('endpoint = ?');
      params.push(String(req.query.endpoint));
    }

    if (req.query.label) {
      where.push('label = ?');
      params.push(String(req.query.label));
    }

    if (req.query.compoundclass) {
      where.push('compoundclass = ?');
      params.push(String(req.query.compoundclass));
    }

    const valueMin = parseNumber(req.query.value_min);
    if (valueMin !== undefined) {
      where.push('value >= ?');
      params.push(valueMin);
    }

    const valueMax = parseNumber(req.query.value_max);
    if (valueMax !== undefined) {
      where.push('value <= ?');
      params.push(valueMax);
    }

    if (req.query.search) {
      const search = likeValue(String(req.query.search));
      where.push('(compoundname LIKE ? COLLATE NOCASE OR cpd LIKE ? COLLATE NOCASE)');
      params.push(search, search);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const total = db
      .prepare(`SELECT COUNT(*) AS total FROM toxicity_endpoint ${whereSql}`)
      .get(...params).total;

    const rows = db
      .prepare(`
        SELECT
          cpd,
          compoundname,
          compoundclass,
          endpoint,
          label,
          value,
          updated_at
        FROM toxicity_endpoint
        ${whereSql}
        ORDER BY (value IS NULL) ASC, value DESC, compoundname ASC, cpd ASC
        LIMIT ? OFFSET ?
      `)
      .all(...params, pageSize, offset);

    res.json(toPaginatedResponse(rows, total, page, pageSize));
  } catch (error) {
    next(error);
  }
});

app.get('/api/meta/compound-classes', (_req, res, next) => {
  try {
    const values = readDistinctStrings(`
      SELECT DISTINCT compoundclass AS value
      FROM compound_summary
      WHERE compoundclass IS NOT NULL
      ORDER BY compoundclass
    `);
    res.json(values);
  } catch (error) {
    next(error);
  }
});

app.get('/api/meta/reference-ags', (_req, res, next) => {
  try {
    const values = readDistinctStrings(`
      SELECT DISTINCT reference_ag AS value
      FROM compound_reference_map
      WHERE reference_ag IS NOT NULL
      ORDER BY reference_ag
    `);
    res.json(values);
  } catch (error) {
    next(error);
  }
});

app.get('/api/meta/genes', (_req, res, next) => {
  try {
    const values = readDistinctStrings(`
      SELECT DISTINCT genesymbol AS value
      FROM gene_summary
      WHERE genesymbol IS NOT NULL
      ORDER BY genesymbol
    `);
    res.json(values);
  } catch (error) {
    next(error);
  }
});

app.get('/api/meta/pathways', (_req, res, next) => {
  try {
    const values = readDistinctStrings(`
      SELECT DISTINCT pathway AS value
      FROM pathway_summary
      WHERE pathway IS NOT NULL
      ORDER BY pathway
    `);
    res.json(values);
  } catch (error) {
    next(error);
  }
});

app.get('/api/meta/pathways/grouped', (_req, res, next) => {
  try {
    const rows = db
      .prepare(`
        SELECT pathway, source
        FROM pathway_summary
        WHERE pathway IS NOT NULL
          AND source IN ('HADEG', 'KEGG')
        ORDER BY source ASC, pathway ASC
      `)
      .all();
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/meta/toxicity/endpoints', (_req, res, next) => {
  try {
    const values = readDistinctStrings(`
      SELECT DISTINCT endpoint AS value
      FROM toxicity_endpoint
      WHERE endpoint IS NOT NULL
      ORDER BY endpoint
    `);
    res.json(values);
  } catch (error) {
    next(error);
  }
});

app.get('/api/meta/toxicity/labels', (req, res, next) => {
  try {
    const params = [];
    let where = 'label IS NOT NULL';
    if (req.query.endpoint) {
      where += ' AND endpoint = ?';
      params.push(String(req.query.endpoint));
    }
    const values = readDistinctStrings(
      `
        SELECT DISTINCT label AS value
        FROM toxicity_endpoint
        WHERE ${where}
        ORDER BY label
      `,
      params
    );
    res.json(values);
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

const distPath = path.join(projectRoot, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    error: error instanceof Error ? error.message : 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`BioRemPP monolith listening on http://0.0.0.0:${PORT}`);
  console.log(`SQLite DB: ${SQLITE_DB_PATH}`);
});
