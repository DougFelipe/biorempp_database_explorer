import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const dbPath = process.env.SQLITE_DB_PATH || path.join(projectRoot, 'data', 'biorempp.sqlite');
const maxDbBytes = Number(process.env.MAX_DB_BYTES || 32 * 1024 * 1024);

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

function main() {
  assert(fs.existsSync(dbPath), `SQLite database not found at ${dbPath}`);

  const dbBytes = fs.statSync(dbPath).size;

  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    validateLeanSchema(db);
  } finally {
    db.close();
  }

  console.log(`DB size: ${dbBytes} bytes (${humanBytes(dbBytes)})`);
  console.log(`DB limit: ${maxDbBytes} bytes (${humanBytes(maxDbBytes)})`);

  assert(dbBytes <= maxDbBytes, `DB size exceeded limit: ${humanBytes(dbBytes)} > ${humanBytes(maxDbBytes)}`);

  console.log('Lean runtime DB footprint check passed.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
