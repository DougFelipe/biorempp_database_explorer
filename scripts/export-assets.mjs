import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createGzip } from 'node:zlib';
import { finished } from 'node:stream/promises';
import Database from 'better-sqlite3';

const ASSET_VERSION = 'v0.0.2';

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

async function hashFile(filePath) {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);
  stream.on('data', (chunk) => hash.update(chunk));
  await finished(stream);
  return hash.digest('hex');
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
  const koNodes = db
    .prepare(`
      SELECT DISTINCT ko AS id, ko AS label, 'ko' AS type
      FROM integrated_table
      WHERE ko IS NOT NULL
      ORDER BY ko ASC
    `)
    .all();

  const geneNodes = db
    .prepare(`
      SELECT DISTINCT genesymbol AS id, genesymbol AS label, 'gene' AS type
      FROM integrated_table
      WHERE genesymbol IS NOT NULL
      ORDER BY genesymbol ASC
    `)
    .all();

  const compoundNodes = db
    .prepare(`
      SELECT DISTINCT cpd AS id, COALESCE(compoundname, cpd) AS label, 'compound' AS type
      FROM compound_summary
      WHERE cpd IS NOT NULL
      ORDER BY cpd ASC
    `)
    .all();

  const pathwayNodes = db
    .prepare(`
      SELECT DISTINCT pathway AS id, pathway AS label, 'pathway' AS type
      FROM pathway_summary
      WHERE pathway IS NOT NULL
      ORDER BY pathway ASC
    `)
    .all();

  const koToGene = db
    .prepare(`
      SELECT DISTINCT ko AS source, genesymbol AS target, 'ko_to_gene' AS kind
      FROM integrated_table
      WHERE ko IS NOT NULL
        AND genesymbol IS NOT NULL
      ORDER BY ko ASC, genesymbol ASC
    `)
    .all();

  const geneToCompound = db
    .prepare(`
      SELECT genesymbol AS source, cpd AS target, 'gene_to_compound' AS kind
      FROM compound_gene_map
      ORDER BY genesymbol ASC, cpd ASC
    `)
    .all();

  const compoundToPathway = db
    .prepare(`
      SELECT cpd AS source, pathway AS target, 'compound_to_pathway' AS kind
      FROM compound_pathway_map
      ORDER BY cpd ASC, pathway ASC
    `)
    .all();

  return {
    nodes: [...koNodes, ...geneNodes, ...compoundNodes, ...pathwayNodes],
    edges: [...koToGene, ...geneToCompound, ...compoundToPathway],
  };
}

function buildSankeyData(db) {
  return db
    .prepare(`
      SELECT
        it.ko AS ko,
        it.cpd AS cpd,
        te.endpoint AS endpoint,
        te.label AS label,
        te.value AS value
      FROM integrated_table it
      JOIN toxicity_endpoint te
        ON te.cpd = it.cpd
      WHERE it.ko IS NOT NULL
        AND it.cpd IS NOT NULL
        AND te.endpoint IS NOT NULL
      GROUP BY it.ko, it.cpd, te.endpoint
      ORDER BY it.ko ASC, it.cpd ASC, te.endpoint ASC
    `)
    .all();
}

function mapIntegratedRow(row) {
  return {
    id: row.id,
    ko: row.ko,
    genesymbol: row.genesymbol,
    genename: row.genename,
    enzyme_activity: row.enzyme_activity,
    ec: row.ec,
    reaction: row.reaction,
    cpd: row.cpd,
    compoundname: row.compoundname,
    compoundclass: row.compoundclass,
    reference_ag: row.reference_ag,
    pathway_hadeg: row.pathway_hadeg,
    pathway_kegg: row.pathway_kegg,
    compound_pathway: row.compound_pathway,
    smiles: row.smiles,
    chebi: row.chebi,
    toxicity_labels: parseJsonObject(row.toxicity_labels),
    toxicity_values: parseJsonObject(row.toxicity_values),
    created_at: row.created_at,
  };
}

function createFullWriter(absolutePath) {
  const gzip = createGzip({ level: 9 });
  const destination = createWriteStream(absolutePath);
  gzip.pipe(destination);
  return {
    gzip,
    destination,
    hasItems: false,
  };
}

function writeFullRow(writer, row) {
  const chunk = JSON.stringify(row);
  if (writer.hasItems) {
    writer.gzip.write(',');
  } else {
    writer.hasItems = true;
  }
  writer.gzip.write(chunk);
}

async function finalizeFullWriter(writer) {
  writer.gzip.write(']');
  writer.gzip.end();
  await Promise.all([finished(writer.destination), finished(writer.gzip)]);
}

function getCounts(db) {
  const single = (sql) => db.prepare(sql).get().total;

  return {
    integrated_rows: single('SELECT COUNT(*) AS total FROM integrated_table'),
    compounds: single('SELECT COUNT(*) AS total FROM compound_summary'),
    genes: single('SELECT COUNT(*) AS total FROM gene_summary'),
    pathways: single('SELECT COUNT(*) AS total FROM pathway_summary'),
    toxicity_rows: single('SELECT COUNT(*) AS total FROM toxicity_endpoint'),
    toxicity_compounds: single('SELECT COUNT(DISTINCT cpd) AS total FROM toxicity_endpoint'),
    toxicity_endpoints: single('SELECT COUNT(DISTINCT endpoint) AS total FROM toxicity_endpoint'),
    invalid_ko: single(`
      SELECT COUNT(*) AS total
      FROM integrated_table
      WHERE ko IS NOT NULL
        AND ko NOT GLOB 'K[0-9][0-9][0-9][0-9][0-9]'
    `),
    invalid_cpd: single(`
      SELECT COUNT(*) AS total
      FROM integrated_table
      WHERE cpd IS NOT NULL
        AND cpd NOT GLOB 'C[0-9][0-9][0-9][0-9][0-9]'
    `),
  };
}

async function main() {
  const includeFull = process.argv.includes('--with-full');
  const dbPath = process.env.SQLITE_DB_PATH || defaultDbPath;
  const assetsPath = process.env.ASSET_OUTPUT_DIR || defaultAssetsPath;
  const startedAt = Date.now();

  console.log(`Asset export started at ${now()}`);
  console.log(`Source DB: ${dbPath}`);
  console.log(`Target assets: ${assetsPath}`);
  console.log(`Include full integrated archive: ${includeFull ? 'yes' : 'no'}`);

  await fs.rm(assetsPath, { recursive: true, force: true });
  await fs.mkdir(path.join(assetsPath, 'integrated_table.by_compound'), { recursive: true });

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
          ko_count,
          gene_count,
          pathway_count,
          toxicity_score,
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
        genes: parseJsonArray(row.genes),
        pathways: parseJsonArray(row.pathways),
      }));

    assetEntries.push(await writeJsonAsset(assetsPath, 'compound_summary.json', compoundSummary));
    console.log(`[1/8] compound_summary.json exported (${compoundSummary.length} rows)`);

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
    console.log(`[2/8] gene_summary.json exported (${geneSummary.length} rows)`);

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
    console.log(`[3/8] pathway_summary.json exported (${pathwaySummary.length} rows)`);

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
    console.log(`[4/8] toxicity_matrix.json exported (${toxicityMatrix.length} rows)`);

    const networkGraph = buildNetworkGraph(db);
    assetEntries.push(await writeJsonAsset(assetsPath, 'network_graph.json', networkGraph));
    console.log(
      `[5/8] network_graph.json exported (${networkGraph.nodes.length} nodes, ${networkGraph.edges.length} edges)`
    );

    const sankeyData = buildSankeyData(db);
    assetEntries.push(await writeJsonAsset(assetsPath, 'sankey_data.json', sankeyData));
    console.log(`[6/8] sankey_data.json exported (${sankeyData.length} rows)`);

    const compounds = db
      .prepare(`
        SELECT cpd, compoundname
        FROM compound_summary
        ORDER BY cpd ASC
      `)
      .all();

    const selectIntegratedByCompound = db.prepare(`
      SELECT
        id,
        ko,
        genesymbol,
        genename,
        enzyme_activity,
        ec,
        reaction,
        cpd,
        compoundname,
        compoundclass,
        reference_ag,
        pathway_hadeg,
        pathway_kegg,
        compound_pathway,
        smiles,
        chebi,
        toxicity_labels,
        toxicity_values,
        created_at
      FROM integrated_table
      WHERE cpd = ?
      ORDER BY genesymbol ASC, ko ASC, id ASC
    `);

    const integratedIndex = [];
    let shardRowCount = 0;
    let fullWriter = null;
    let fullFileRelativePath = null;

    if (includeFull) {
      fullFileRelativePath = 'integrated_table.full.json.gz';
      const fullAbsolutePath = path.join(assetsPath, fullFileRelativePath);
      fullWriter = createFullWriter(fullAbsolutePath);
      fullWriter.gzip.write('[');
    }

    for (const compound of compounds) {
      const rows = selectIntegratedByCompound.all(compound.cpd).map(mapIntegratedRow);
      const relativePath = normalizeAssetPath(
        path.join('integrated_table.by_compound', `${compound.cpd}.json`)
      );
      const writeResult = await writeJsonAsset(assetsPath, relativePath, rows);
      shardRowCount += rows.length;

      integratedIndex.push({
        cpd: compound.cpd,
        compoundname: compound.compoundname,
        row_count: rows.length,
        file: relativePath,
      });

      if (fullWriter) {
        for (const row of rows) {
          writeFullRow(fullWriter, row);
        }
      }

      if (rows.length > 0) {
        assetEntries.push({
          path: writeResult.path,
          bytes: writeResult.bytes,
          sha256: writeResult.sha256,
          shard: true,
        });
      }
    }

    if (fullWriter) {
      await finalizeFullWriter(fullWriter);
      const fullAbsolutePath = path.join(assetsPath, fullFileRelativePath);
      const fullStat = await fs.stat(fullAbsolutePath);
      assetEntries.push({
        path: fullFileRelativePath,
        bytes: fullStat.size,
        sha256: await hashFile(fullAbsolutePath),
      });
    }

    assetEntries.push(await writeJsonAsset(assetsPath, 'integrated_table.index.json', integratedIndex));
    console.log(
      `[7/8] integrated table shards exported (${integratedIndex.length} compounds, ${shardRowCount} rows)`
    );

    const counts = getCounts(db);
    const manifest = {
      version: ASSET_VERSION,
      generated_at: now(),
      source_db: normalizeAssetPath(path.relative(projectRoot, dbPath)),
      include_integrated_full: includeFull,
      counts: {
        ...counts,
        integrated_shards: integratedIndex.length,
      },
      assets: assetEntries
        .filter((entry) => !entry.shard)
        .map(({ shard, ...entry }) => entry),
      integrated_shards: {
        index_file: 'integrated_table.index.json',
        directory: 'integrated_table.by_compound',
        count: integratedIndex.length,
      },
      phases: {
        phase_1: ['CompoundRankingBarChart', 'PrioritizationScatter', 'CompoundPathwayHeatmap'],
        phase_2: ['NetworkGraph', 'SankeyFlow', 'ToxicityRadar'],
      },
    };

    await writeJsonAsset(assetsPath, 'manifest.json', manifest);
    console.log('[8/8] manifest.json exported');

    const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(2);
    console.log('');
    console.log('Asset export summary:');
    console.log(`- compounds: ${counts.compounds}`);
    console.log(`- toxicity compounds: ${counts.toxicity_compounds}`);
    console.log(`- toxicity endpoints: ${counts.toxicity_endpoints}`);
    console.log(`- integrated rows: ${counts.integrated_rows}`);
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
