import executiveSummaryRaw from '../data/databases_metadatas/executive_summary.json?raw';
import basicStatisticsRaw from '../data/databases_metadatas/basic_statistics.json?raw';
import databaseMetadataRaw from '../data/databases_metadatas/database_metadata.json?raw';
import compoundStatisticsRaw from '../data/databases_metadatas/compound_statistics.json?raw';
import geneStatisticsRaw from '../data/databases_metadatas/gene_statistics.json?raw';
import koStatisticsRaw from '../data/databases_metadatas/ko_statistics.json?raw';
import enzymeStatisticsRaw from '../data/databases_metadatas/enzyme_statistics.json?raw';
import type {
  ColumnCompletenessItem,
  DatabaseMetricsCatalog,
  DatabaseSchemaSnapshot,
  NamedCountItem,
} from '../types/frontConfig';

function parseJsonObject(raw: string, source: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('root must be an object');
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Invalid metrics JSON in ${source}: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

function toNamedCountList(input: unknown, limit = 5): NamedCountItem[] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return [];
  }
  return Object.entries(input as Record<string, unknown>)
    .map(([name, rawCount]) => ({ name, count: toNumber(rawCount) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function toPairedNamedCountList(names: unknown, counts: unknown, limit = 5): NamedCountItem[] {
  if (!Array.isArray(names) || !Array.isArray(counts)) {
    return [];
  }
  const size = Math.min(names.length, counts.length, limit);
  const output: NamedCountItem[] = [];
  for (let index = 0; index < size; index += 1) {
    const name = String(names[index] ?? '').trim();
    if (!name) {
      continue;
    }
    output.push({ name, count: toNumber(counts[index]) });
  }
  return output;
}

function buildSchemaSnapshots(): DatabaseSchemaSnapshot[] {
  return [
    {
      id: 'biorempp',
      database: 'BioRemPP',
      version: 'v1.0.0 schema doc',
      rows: 10869,
      columns: 8,
      focus: 'Compound-gene-enzyme-agency relationships for bioremediation',
      join_key: 'ko (primary integration key)',
      source_doc: 'src/data/database_schemas/biorempp-schema.md',
      core_columns: ['ko', 'cpd', 'referenceAG', 'compoundclass', 'compoundname', 'genesymbol', 'genename', 'enzyme_activity'],
    },
    {
      id: 'hadeg',
      database: 'HADEG',
      version: 'v1.0.0 schema doc',
      rows: 867,
      columns: 4,
      focus: 'Hydrocarbon aerobic degradation gene-pathway relationships',
      join_key: 'ko',
      source_doc: 'src/data/database_schemas/hadeg-schema.md',
      core_columns: ['Gene', 'ko', 'Pathway', 'compound_pathway'],
    },
    {
      id: 'kegg',
      database: 'KEGG Degradation',
      version: 'v1.0.0 schema doc',
      rows: 855,
      columns: 3,
      focus: 'Xenobiotic/pollutant degradation pathways',
      join_key: 'ko',
      source_doc: 'src/data/database_schemas/kegg-schema.md',
      core_columns: ['ko', 'pathname', 'genesymbol'],
    },
    {
      id: 'toxcsm',
      database: 'ToxCSM',
      version: 'v1.0.0 schema doc',
      rows: 370,
      columns: 66,
      focus: 'Toxicological predictions across 31 endpoints',
      join_key: 'cpd (compound key)',
      source_doc: 'src/data/database_schemas/toxcsm-schema.md',
      core_columns: ['SMILES', 'cpd', 'ChEBI', 'compoundname', '31 label_*', '31 value_*'],
    },
  ];
}

function buildMetricsCatalog(): DatabaseMetricsCatalog {
  const executiveSummary = parseJsonObject(executiveSummaryRaw, 'executive_summary.json');
  const basicStatistics = parseJsonObject(basicStatisticsRaw, 'basic_statistics.json');
  const databaseMetadata = parseJsonObject(databaseMetadataRaw, 'database_metadata.json');
  const compoundStatistics = parseJsonObject(compoundStatisticsRaw, 'compound_statistics.json');
  const geneStatistics = parseJsonObject(geneStatisticsRaw, 'gene_statistics.json');
  const koStatistics = parseJsonObject(koStatisticsRaw, 'ko_statistics.json');
  const enzymeStatistics = parseJsonObject(enzymeStatisticsRaw, 'enzyme_statistics.json');

  const overview = (executiveSummary.overview as Record<string, unknown>) || {};
  const highlights = (executiveSummary.highlights as Record<string, unknown>) || {};
  const coverage = (executiveSummary.coverage as Record<string, unknown>) || {};
  const missingValues = (basicStatistics.missing_values as Record<string, unknown>) || {};
  const completeness = ((databaseMetadata.data_quality as Record<string, unknown>)?.completeness || {}) as Record<string, unknown>;
  const linkMatch = (databaseMetadata.link_match as Record<string, unknown>) || {};
  const linkCoverage = (linkMatch.coverage as Record<string, unknown>) || {};
  const linkCoverageKo = (linkCoverage.kos as Record<string, unknown>) || {};
  const linkCoverageCpd = (linkCoverage.cpds as Record<string, unknown>) || {};
  const rowShapes = (linkMatch.row_shapes as Record<string, unknown>) || {};
  const reactionCoverage = (linkMatch.reaction_description as Record<string, unknown>) || {};
  const databaseInfo = (databaseMetadata.database_info as Record<string, unknown>) || {};

  const columnCompleteness: ColumnCompletenessItem[] = Object.entries(completeness)
    .map(([column, rawPct]) => {
      const pct = toNumber(rawPct, 0);
      const missing = toNumber(missingValues[column], 0);
      return {
        column,
        completeness_pct: pct,
        missing_count: missing,
      };
    })
    .sort((a, b) => a.completeness_pct - b.completeness_pct || a.column.localeCompare(b.column));

  const topGenes = toPairedNamedCountList(
    (geneStatistics.top_20_genesymbols as Record<string, unknown>)?.symbols,
    (geneStatistics.top_20_genesymbols as Record<string, unknown>)?.frequencies
  );

  const topKos = toPairedNamedCountList(
    (koStatistics.top_20_ko as Record<string, unknown>)?.ko_ids,
    (koStatistics.top_20_ko as Record<string, unknown>)?.frequencies
  );

  const topEnzymes = toPairedNamedCountList(
    (enzymeStatistics.top_30_enzymes as Record<string, unknown>)?.enzyme_names,
    (enzymeStatistics.top_30_enzymes as Record<string, unknown>)?.frequencies
  );

  return {
    metrics_source_label: 'Metrics source: databases_metadatas (BioRemPP v1.1.0)',
    schema_reference_label: 'Schema reference: database_schemas docs (v1.0.0 spec snapshot)',
    database_name: String(databaseInfo.name || 'BioRemPP Database'),
    database_version: String(databaseInfo.version || 'v1.1.0'),
    generation_date: String(databaseInfo.generation_date || '-'),
    core_metrics: [
      { id: 'entries', label: 'Total Entries', value: formatInteger(toNumber(overview.total_entries)) },
      { id: 'compounds', label: 'Unique Compounds', value: formatInteger(toNumber(overview.unique_compounds)) },
      { id: 'ko', label: 'Unique KO Entries', value: formatInteger(toNumber(overview.unique_ko_entries)) },
      { id: 'genes', label: 'Mapped Gene Symbols', value: formatInteger(toNumber(coverage.gene_symbols_mapped)) },
      { id: 'enzymes', label: 'Enzyme Activities', value: formatInteger(toNumber(overview.unique_enzyme_activities)) },
      { id: 'classes', label: 'Compound Classes', value: formatInteger(toNumber(overview.unique_compound_classes)) },
      { id: 'agencies', label: 'Regulatory Agencies', value: formatInteger(toNumber(coverage.environmental_agencies)) },
      { id: 'columns', label: 'Columns (v1.1.0 metrics)', value: formatInteger(toNumber(basicStatistics.total_columns)) },
    ],
    highlight_metrics: [
      {
        id: 'top-class',
        label: 'Most Represented Class',
        value: String(highlights.most_represented_class || '-'),
        hint: `${formatInteger(toNumber(highlights.compounds_in_top_class))} compounds`,
      },
      {
        id: 'top-enzyme',
        label: 'Most Frequent Enzyme',
        value: String(highlights.most_frequent_enzyme || '-'),
        hint: `${formatInteger(toNumber(highlights.enzyme_frequency))} records`,
      },
      {
        id: 'version',
        label: 'Database Version',
        value: String(databaseInfo.version || 'v1.1.0'),
        hint: `Generated ${String(databaseInfo.generation_date || '-')}`,
      },
    ],
    top_compound_classes: toNamedCountList(compoundStatistics.compounds_per_class),
    top_agencies: toNamedCountList(compoundStatistics.compounds_per_agency),
    top_genes: topGenes,
    top_kos: topKos,
    top_enzymes: topEnzymes,
    column_completeness: columnCompleteness,
    link_match: {
      ko_total: toNumber(linkCoverageKo.total_in_database),
      ko_matched: toNumber(linkCoverageKo.matched_count),
      ko_unmatched: toNumber(linkCoverageKo.unmatched_count),
      cpd_total: toNumber(linkCoverageCpd.total_in_database),
      cpd_matched: toNumber(linkCoverageCpd.matched_count),
      cpd_unmatched: toNumber(linkCoverageCpd.unmatched_count),
    },
    row_shapes: {
      dense: toNumber(rowShapes.dense),
      ec_only: toNumber(rowShapes.ec_only),
      reaction_only: toNumber(rowShapes.reaction_only),
      both_na: toNumber(rowShapes.both_na),
    },
    reaction_coverage: {
      with_reaction_rows: toNumber(reactionCoverage.with_reaction_rows),
      with_reaction_description_rows: toNumber(reactionCoverage.with_reaction_description_rows),
      unmatched_reaction_id_count: toNumber(reactionCoverage.unmatched_reaction_id_count),
    },
    schemas: buildSchemaSnapshots(),
  };
}

export const DATABASE_METRICS_CATALOG = buildMetricsCatalog();

export function getCompletenessBadgeColor(completenessPct: number) {
  if (completenessPct >= 99.9) {
    return 'bg-green-100 text-green-800';
  }
  if (completenessPct >= 98) {
    return 'bg-amber-100 text-amber-800';
  }
  return 'bg-rose-100 text-rose-800';
}

export function formatCompleteness(completenessPct: number) {
  return formatPercent(completenessPct, completenessPct % 1 === 0 ? 0 : 2);
}
