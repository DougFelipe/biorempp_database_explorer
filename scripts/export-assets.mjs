import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';

const ASSET_VERSION = 'v0.0.2';
const KO_GLOB = "K[0-9][0-9][0-9][0-9][0-9]";
const CPD_GLOB = "C[0-9][0-9][0-9][0-9][0-9]";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const defaultDbPath = path.join(projectRoot, 'data', 'biorempp.sqlite');
const defaultAssetsPath = path.join(projectRoot, 'data', 'assets', ASSET_VERSION);

function now() {
  return new Date().toISOString();
}

function normalizeAssetPath(filePath) {
  return filePath.replaceAll('\\', '/');
}

function parseJsonObject(value) {
  if (!value) {
    return {};
  }
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return {};
  }
  return {};
}

function parseJsonArray(value) {
  if (!value) {
    return [];
  }
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

function toUniqueSorted(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

async function writeJsonAsset(rootPath, relativePath, data) {
  const absolutePath = path.join(rootPath, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });

  const content = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(absolutePath, content, 'utf8');

  return {
    path: normalizeAssetPath(relativePath),
    bytes: Buffer.byteLength(content, 'utf8'),
    sha256: createHash('sha256').update(content, 'utf8').digest('hex'),
  };
}

function buildNetworkGraph(db) {
  const koRows = db
    .prepare(`
      SELECT DISTINCT ko
      FROM gene_summary
      WHERE ko IS NOT NULL
      ORDER BY ko ASC
    `)
    .all();

  const geneRows = db
    .prepare(`
      SELECT DISTINCT genesymbol
      FROM compound_gene_map
      WHERE genesymbol IS NOT NULL
      ORDER BY genesymbol ASC
    `)
    .all();

  const compoundRows = db
    .prepare(`
      SELECT cpd, COALESCE(compoundname, cpd) AS label
      FROM compound_summary
      WHERE cpd IS NOT NULL
      ORDER BY cpd ASC
    `)
    .all();

  const pathwayRows = db
    .prepare(`
      SELECT DISTINCT pathway
      FROM pathway_summary
      WHERE pathway IS NOT NULL
      ORDER BY pathway ASC
    `)
    .all();

  const koToGeneRows = db
    .prepare(`
      SELECT DISTINCT ko AS source, genesymbol AS target
      FROM compound_gene_card
      WHERE ko IS NOT NULL
        AND ko != ''
        AND genesymbol IS NOT NULL
        AND genesymbol != ''
      ORDER BY ko ASC, genesymbol ASC
    `)
    .all();

  const geneToCompoundRows = db
    .prepare(`
      SELECT genesymbol AS source, cpd AS target
      FROM compound_gene_map
      ORDER BY genesymbol ASC, cpd ASC
    `)
    .all();

  const compoundToPathwayRows = db
    .prepare(`
      SELECT cpd AS source, pathway AS target
      FROM compound_pathway_map
      ORDER BY cpd ASC, pathway ASC
    `)
    .all();

  return {
    nodes: [
      ...koRows.map((row) => ({ id: row.ko, label: row.ko, type: 'ko' })),
      ...geneRows.map((row) => ({ id: row.genesymbol, label: row.genesymbol, type: 'gene' })),
      ...compoundRows.map((row) => ({ id: row.cpd, label: row.label, type: 'compound' })),
      ...pathwayRows.map((row) => ({ id: row.pathway, label: row.pathway, type: 'pathway' })),
    ],
    edges: [
      ...koToGeneRows.map((row) => ({ source: row.source, target: row.target, kind: 'ko_to_gene' })),
      ...geneToCompoundRows.map((row) => ({
        source: row.source,
        target: row.target,
        kind: 'gene_to_compound',
      })),
      ...compoundToPathwayRows.map((row) => ({
        source: row.source,
        target: row.target,
        kind: 'compound_to_pathway',
      })),
    ],
  };
}

function buildSankeyData(db) {
  const koToCompound = db
    .prepare(`
      SELECT
        ko,
        cpd,
        COUNT(*) AS value
      FROM compound_gene_card
      WHERE ko IS NOT NULL
        AND ko != ''
      GROUP BY ko, cpd
      ORDER BY ko ASC, cpd ASC
    `)
    .all();

  const compoundToToxicity = db
    .prepare(`
      SELECT
        cpd,
        endpoint,
        COUNT(*) AS value
      FROM toxicity_endpoint
      WHERE cpd IS NOT NULL
        AND endpoint IS NOT NULL
      GROUP BY cpd, endpoint
      ORDER BY cpd ASC, endpoint ASC
    `)
    .all();

  const compoundLabels = new Map(
    db
      .prepare(`
        SELECT cpd, COALESCE(compoundname, cpd) AS label
        FROM compound_summary
        ORDER BY cpd ASC
      `)
      .all()
      .map((row) => [row.cpd, row.label])
  );

  const nodesById = new Map();
  const links = [];

  for (const row of koToCompound) {
    const koId = `ko:${row.ko}`;
    const compoundId = `compound:${row.cpd}`;

    if (!nodesById.has(koId)) {
      nodesById.set(koId, { id: koId, label: row.ko, type: 'ko' });
    }
    if (!nodesById.has(compoundId)) {
      nodesById.set(compoundId, {
        id: compoundId,
        label: compoundLabels.get(row.cpd) ?? row.cpd,
        type: 'compound',
      });
    }

    links.push({
      source: koId,
      target: compoundId,
      value: Number(row.value) || 1,
      kind: 'ko_to_compound',
    });
  }

  for (const row of compoundToToxicity) {
    const compoundId = `compound:${row.cpd}`;
    const endpointId = `toxicity:${row.endpoint}`;

    if (!nodesById.has(compoundId)) {
      nodesById.set(compoundId, {
        id: compoundId,
        label: compoundLabels.get(row.cpd) ?? row.cpd,
        type: 'compound',
      });
    }
    if (!nodesById.has(endpointId)) {
      nodesById.set(endpointId, { id: endpointId, label: row.endpoint, type: 'toxicity' });
    }

    links.push({
      source: compoundId,
      target: endpointId,
      value: Number(row.value) || 1,
      kind: 'compound_to_toxicity',
    });
  }

  return {
    nodes: [...nodesById.values()],
    links,
  };
}

function getCounts(db) {
  const scalar = (sql) => db.prepare(sql).get().total;

  const invalidKo = db
    .prepare(`
      SELECT SUM(total) AS total
      FROM (
        SELECT COUNT(*) AS total FROM gene_summary WHERE ko NOT GLOB '${KO_GLOB}'
        UNION ALL
        SELECT COUNT(*) AS total
        FROM compound_gene_card
        WHERE ko != ''
          AND ko NOT GLOB '${KO_GLOB}'
      )
    `)
    .get().total ?? 0;

  const invalidCpd = db
    .prepare(`
      SELECT SUM(total) AS total
      FROM (
        SELECT COUNT(*) AS total FROM compound_summary WHERE cpd NOT GLOB '${CPD_GLOB}'
        UNION ALL
        SELECT COUNT(*) AS total FROM toxicity_endpoint WHERE cpd NOT GLOB '${CPD_GLOB}'
        UNION ALL
        SELECT COUNT(*) AS total FROM compound_gene_map WHERE cpd NOT GLOB '${CPD_GLOB}'
        UNION ALL
        SELECT COUNT(*) AS total FROM compound_pathway_map WHERE cpd NOT GLOB '${CPD_GLOB}'
        UNION ALL
        SELECT COUNT(*) AS total FROM compound_reference_map WHERE cpd NOT GLOB '${CPD_GLOB}'
        UNION ALL
        SELECT COUNT(*) AS total FROM compound_metadata WHERE cpd NOT GLOB '${CPD_GLOB}'
        UNION ALL
        SELECT COUNT(*) AS total FROM compound_gene_card WHERE cpd NOT GLOB '${CPD_GLOB}'
        UNION ALL
        SELECT COUNT(*) AS total FROM compound_pathway_card WHERE cpd NOT GLOB '${CPD_GLOB}'
      )
    `)
    .get().total ?? 0;

  return {
    compounds: scalar('SELECT COUNT(*) AS total FROM compound_summary'),
    genes: scalar('SELECT COUNT(*) AS total FROM gene_summary'),
    pathways: scalar('SELECT COUNT(*) AS total FROM pathway_summary'),
    toxicity_rows: scalar('SELECT COUNT(*) AS total FROM toxicity_endpoint'),
    toxicity_compounds: scalar('SELECT COUNT(DISTINCT cpd) AS total FROM toxicity_endpoint'),
    toxicity_endpoints: scalar('SELECT COUNT(DISTINCT endpoint) AS total FROM toxicity_endpoint'),
    invalid_ko: invalidKo,
    invalid_cpd: invalidCpd,
  };
}

async function main() {
  const dbPath = process.env.SQLITE_DB_PATH || defaultDbPath;
  const assetsPath = process.env.ASSET_OUTPUT_DIR || defaultAssetsPath;
  const startedAt = Date.now();

  if (process.argv.includes('--with-full')) {
    console.warn('Warning: "--with-full" is deprecated in lean runtime and will be ignored.');
  }

  console.log(`Asset export started at ${now()}`);
  console.log(`Source DB: ${dbPath}`);
  console.log(`Target assets: ${assetsPath}`);

  await fs.rm(assetsPath, { recursive: true, force: true });
  await fs.mkdir(assetsPath, { recursive: true });

  const db = new Database(dbPath, {
    readonly: true,
    fileMustExist: true,
  });

  try {
    const assetEntries = [];

    const compoundSummary = db
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
        ORDER BY gene_count DESC, cpd ASC
      `)
      .all()
      .map((row) => ({
        ...row,
        toxicity_scores: parseJsonObject(row.toxicity_scores),
        genes: parseJsonArray(row.genes),
        pathways: parseJsonArray(row.pathways),
      }));
    assetEntries.push(await writeJsonAsset(assetsPath, 'compound_summary.json', compoundSummary));
    console.log(`[1/7] compound_summary.json exported (${compoundSummary.length} rows)`);

    const geneSummary = db
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
        ORDER BY compound_count DESC, ko ASC
      `)
      .all()
      .map((row) => ({
        ...row,
        enzyme_activities: parseJsonArray(row.enzyme_activities),
      }));
    assetEntries.push(await writeJsonAsset(assetsPath, 'gene_summary.json', geneSummary));
    console.log(`[2/7] gene_summary.json exported (${geneSummary.length} rows)`);

    const pathwaySummary = db
      .prepare(`
        SELECT
          pathway,
          source,
          compound_count,
          gene_count,
          updated_at
        FROM pathway_summary
        ORDER BY compound_count DESC, pathway ASC, source ASC
      `)
      .all();
    assetEntries.push(await writeJsonAsset(assetsPath, 'pathway_summary.json', pathwaySummary));
    console.log(`[3/7] pathway_summary.json exported (${pathwaySummary.length} rows)`);

    const toxicityMatrix = db
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
        ORDER BY cpd ASC, endpoint ASC
      `)
      .all();
    assetEntries.push(await writeJsonAsset(assetsPath, 'toxicity_matrix.json', toxicityMatrix));
    console.log(`[4/7] toxicity_matrix.json exported (${toxicityMatrix.length} rows)`);

    const networkGraph = buildNetworkGraph(db);
    assetEntries.push(await writeJsonAsset(assetsPath, 'network_graph.json', networkGraph));
    console.log(
      `[5/7] network_graph.json exported (${networkGraph.nodes.length} nodes, ${networkGraph.edges.length} edges)`
    );

    const sankeyData = buildSankeyData(db);
    assetEntries.push(await writeJsonAsset(assetsPath, 'sankey_data.json', sankeyData));
    console.log(
      `[6/7] sankey_data.json exported (${sankeyData.nodes.length} nodes, ${sankeyData.links.length} links)`
    );

    const counts = getCounts(db);
    const manifest = {
      version: ASSET_VERSION,
      generated_at: now(),
      source_db: normalizeAssetPath(path.relative(projectRoot, dbPath)),
      runtime_profile: 'lean',
      include_integrated_full: false,
      counts,
      assets: assetEntries,
      toxicity_risk_mean: {
        source: 'derived',
        formula: 'mean(value_*)',
        missing_policy: 'null',
      },
      phases: {
        phase_1: ['CompoundRankingBarChart', 'CompoundPathwayHeatmap'],
        phase_2: ['NetworkGraph', 'SankeyFlow', 'ToxicityRadar'],
      },
      dimensions: {
        compound_classes: toUniqueSorted(compoundSummary, 'compoundclass'),
        pathway_sources: toUniqueSorted(pathwaySummary, 'source'),
      },
    };

    await writeJsonAsset(assetsPath, 'manifest.json', manifest);
    console.log('[7/7] manifest.json exported');

    const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(2);
    console.log('');
    console.log('Asset export summary:');
    console.log(`- compounds: ${counts.compounds}`);
    console.log(`- toxicity compounds: ${counts.toxicity_compounds}`);
    console.log(`- toxicity endpoints: ${counts.toxicity_endpoints}`);
    console.log(`- invalid ko: ${counts.invalid_ko}`);
    console.log(`- invalid cpd: ${counts.invalid_cpd}`);
    console.log(`Completed at ${now()} in ${elapsedSeconds}s`);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error('');
  console.error('Asset export failed.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
