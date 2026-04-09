import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const dbPath = process.env.SQLITE_DB_PATH || path.join(projectRoot, 'data', 'biorempp.sqlite');
const assetsPath =
  process.env.ASSET_OUTPUT_DIR || path.join(projectRoot, 'data', 'assets', 'v0.0.2');
const maxDbBytes = Number(process.env.MAX_DB_BYTES || 32 * 1024 * 1024);
const maxAssetsBytes = Number(process.env.MAX_ASSETS_BYTES || 16 * 1024 * 1024);

function humanBytes(value) {
  const units = ['B', 'KiB', 'MiB', 'GiB'];
  let current = value;
  let unit = 0;
  while (current >= 1024 && unit < units.length - 1) {
    current /= 1024;
    unit += 1;
  }
  return `${current.toFixed(2)} ${units[unit]}`;
}

function dirSize(target) {
  if (!fs.existsSync(target)) {
    return 0;
  }
  const stat = fs.statSync(target);
  if (!stat.isDirectory()) {
    return stat.size;
  }
  let total = 0;
  for (const item of fs.readdirSync(target, { withFileTypes: true })) {
    total += dirSize(path.join(target, item.name));
  }
  return total;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateLeanSchema(database) {
  const hasIntegratedTable = Boolean(
    database
      .prepare(`
        SELECT 1
        FROM sqlite_master
        WHERE type = 'table' AND name = 'integrated_table'
        LIMIT 1
      `)
      .get()
  );

  const integratedIndexCount =
    database
      .prepare(`
        SELECT COUNT(*) AS total
        FROM sqlite_master
        WHERE type = 'index'
          AND name LIKE 'idx_integrated_%'
      `)
      .get().total ?? 0;

  assert(!hasIntegratedTable, 'integrated_table should not exist in lean runtime DB.');
  assert(integratedIndexCount === 0, 'idx_integrated_* indexes should not exist in lean runtime DB.');

  const requiredTables = [
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
    database
      .prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
      `)
      .all()
      .map((row) => row.name)
  );

  const missingTables = requiredTables.filter((tableName) => !availableTables.has(tableName));
  assert(
    missingTables.length === 0,
    `Missing required lean tables: ${missingTables.join(', ')}`
  );
}

function validateLeanAssets() {
  const integratedIndexPath = path.join(assetsPath, 'integrated_table.index.json');
  const integratedShardDir = path.join(assetsPath, 'integrated_table.by_compound');

  assert(!fs.existsSync(integratedIndexPath), 'integrated_table.index.json should not be generated in lean assets.');
  assert(!fs.existsSync(integratedShardDir), 'integrated_table.by_compound should not be generated in lean assets.');
}

function main() {
  assert(fs.existsSync(dbPath), `SQLite database not found at ${dbPath}`);
  assert(fs.existsSync(assetsPath), `Assets directory not found at ${assetsPath}`);

  const dbBytes = fs.statSync(dbPath).size;
  const assetsBytes = dirSize(assetsPath);

  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    validateLeanSchema(db);
  } finally {
    db.close();
  }
  validateLeanAssets();

  console.log(`DB size: ${dbBytes} bytes (${humanBytes(dbBytes)})`);
  console.log(`Assets size: ${assetsBytes} bytes (${humanBytes(assetsBytes)})`);
  console.log(`DB limit: ${maxDbBytes} bytes (${humanBytes(maxDbBytes)})`);
  console.log(`Assets limit: ${maxAssetsBytes} bytes (${humanBytes(maxAssetsBytes)})`);

  assert(dbBytes <= maxDbBytes, `DB size exceeded limit: ${humanBytes(dbBytes)} > ${humanBytes(maxDbBytes)}`);
  assert(
    assetsBytes <= maxAssetsBytes,
    `Assets size exceeded limit: ${humanBytes(assetsBytes)} > ${humanBytes(maxAssetsBytes)}`
  );

  console.log('Lean runtime footprint check passed.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
