import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const configRoot = path.join(projectRoot, 'config', 'guided-analysis');
const catalogPath = path.join(configRoot, 'catalog.yaml');
const queriesDir = path.join(configRoot, 'queries');
const outputDir = path.join(projectRoot, 'server', 'generated', 'guided');
const outputPath = path.join(outputDir, 'catalog.json');

const VALID_FILTER_TYPES = new Set(['select', 'number_range', 'search', 'dependent_select', 'toggle']);
const VALID_PROVIDER_TYPES = new Set(['meta_endpoint', 'static', 'query_derived']);
const VALID_VIS_TYPES = new Set(['horizontal_bar', 'scatter_quadrant', 'heatmap_matrix', 'table']);
const VALID_COLUMN_TYPES = new Set(['text', 'number', 'compound_link']);

function fail(message) {
  throw new Error(`guided-config: ${message}`);
}

function readYaml(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`missing file: ${path.relative(projectRoot, filePath)}`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    return parseYaml(content);
  } catch (error) {
    fail(`invalid yaml in ${path.relative(projectRoot, filePath)}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertObject(value, context) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${context} must be an object`);
  }
}

function assertString(value, context) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`${context} must be a non-empty string`);
  }
}

function assertArray(value, context) {
  if (!Array.isArray(value)) {
    fail(`${context} must be an array`);
  }
}

function normalizeFilter(filter, queryId, idx) {
  assertObject(filter, `queries/${queryId}.yaml filters[${idx}]`);
  assertString(filter.id, `queries/${queryId}.yaml filters[${idx}].id`);
  assertString(filter.type, `queries/${queryId}.yaml filters[${idx}].type`);
  assertString(filter.label, `queries/${queryId}.yaml filters[${idx}].label`);

  if (!VALID_FILTER_TYPES.has(filter.type)) {
    fail(`queries/${queryId}.yaml filters[${idx}].type invalid: ${filter.type}`);
  }

  const normalized = {
    id: filter.id,
    type: filter.type,
    label: filter.label,
    placeholder: typeof filter.placeholder === 'string' ? filter.placeholder : undefined,
    depends_on: typeof filter.depends_on === 'string' ? filter.depends_on : undefined,
    min: typeof filter.min === 'number' ? filter.min : undefined,
    max: typeof filter.max === 'number' ? filter.max : undefined,
    step: typeof filter.step === 'number' ? filter.step : undefined,
  };

  if (filter.provider !== undefined) {
    assertObject(filter.provider, `queries/${queryId}.yaml filters[${idx}].provider`);
    assertString(filter.provider.type, `queries/${queryId}.yaml filters[${idx}].provider.type`);
    if (!VALID_PROVIDER_TYPES.has(filter.provider.type)) {
      fail(`queries/${queryId}.yaml filters[${idx}].provider.type invalid: ${filter.provider.type}`);
    }

    const provider = {
      type: filter.provider.type,
      endpoint: undefined,
      source: undefined,
      include_mean_option: Boolean(filter.provider.include_mean_option),
      mean_option_label:
        typeof filter.provider.mean_option_label === 'string'
          ? filter.provider.mean_option_label
          : undefined,
      options: undefined,
    };

    if (provider.type === 'meta_endpoint') {
      assertString(filter.provider.endpoint, `queries/${queryId}.yaml filters[${idx}].provider.endpoint`);
      provider.endpoint = filter.provider.endpoint;
    }

    if (provider.type === 'query_derived') {
      assertString(filter.provider.source, `queries/${queryId}.yaml filters[${idx}].provider.source`);
      provider.source = filter.provider.source;
    }

    if (provider.type === 'static') {
      assertArray(filter.provider.options, `queries/${queryId}.yaml filters[${idx}].provider.options`);
      provider.options = filter.provider.options.map((option, optionIdx) => {
        assertObject(option, `queries/${queryId}.yaml filters[${idx}].provider.options[${optionIdx}]`);
        assertString(option.value, `queries/${queryId}.yaml filters[${idx}].provider.options[${optionIdx}].value`);
        assertString(option.label, `queries/${queryId}.yaml filters[${idx}].provider.options[${optionIdx}].label`);
        return {
          value: option.value,
          label: option.label,
        };
      });
    }

    normalized.provider = provider;
  }

  return normalized;
}

function normalizeSummaryCard(card, queryId, idx) {
  assertObject(card, `queries/${queryId}.yaml summary_cards[${idx}]`);
  assertString(card.id, `queries/${queryId}.yaml summary_cards[${idx}].id`);
  assertString(card.label, `queries/${queryId}.yaml summary_cards[${idx}].label`);
  assertString(card.value_key, `queries/${queryId}.yaml summary_cards[${idx}].value_key`);
  return {
    id: card.id,
    label: card.label,
    value_key: card.value_key,
    hint: typeof card.hint === 'string' ? card.hint : undefined,
  };
}

function normalizeVisualization(vis, queryId, idx) {
  assertObject(vis, `queries/${queryId}.yaml visualizations[${idx}]`);
  assertString(vis.id, `queries/${queryId}.yaml visualizations[${idx}].id`);
  assertString(vis.type, `queries/${queryId}.yaml visualizations[${idx}].type`);
  assertString(vis.title, `queries/${queryId}.yaml visualizations[${idx}].title`);
  assertString(vis.data_key, `queries/${queryId}.yaml visualizations[${idx}].data_key`);
  if (!VALID_VIS_TYPES.has(vis.type)) {
    fail(`queries/${queryId}.yaml visualizations[${idx}].type invalid: ${vis.type}`);
  }

  return {
    id: vis.id,
    type: vis.type,
    title: vis.title,
    subtitle: typeof vis.subtitle === 'string' ? vis.subtitle : undefined,
    data_key: vis.data_key,
  };
}

function normalizeTable(table, queryId) {
  assertObject(table, `queries/${queryId}.yaml table`);
  assertString(table.id, `queries/${queryId}.yaml table.id`);
  assertString(table.title, `queries/${queryId}.yaml table.title`);
  assertArray(table.columns, `queries/${queryId}.yaml table.columns`);

  const columns = table.columns.map((column, idx) => {
    assertObject(column, `queries/${queryId}.yaml table.columns[${idx}]`);
    assertString(column.id, `queries/${queryId}.yaml table.columns[${idx}].id`);
    assertString(column.label, `queries/${queryId}.yaml table.columns[${idx}].label`);
    const type = typeof column.type === 'string' ? column.type : 'text';
    if (!VALID_COLUMN_TYPES.has(type)) {
      fail(`queries/${queryId}.yaml table.columns[${idx}].type invalid: ${type}`);
    }
    return {
      id: column.id,
      label: column.label,
      type,
    };
  });

  return {
    id: table.id,
    title: table.title,
    subtitle: typeof table.subtitle === 'string' ? table.subtitle : undefined,
    row_click_field: typeof table.row_click_field === 'string' ? table.row_click_field : undefined,
    empty_message: typeof table.empty_message === 'string' ? table.empty_message : undefined,
    columns,
  };
}

function normalizeInsight(insight, queryId, idx) {
  assertObject(insight, `queries/${queryId}.yaml insights[${idx}]`);
  assertString(insight.id, `queries/${queryId}.yaml insights[${idx}].id`);
  assertString(insight.text, `queries/${queryId}.yaml insights[${idx}].text`);
  return {
    id: insight.id,
    text: insight.text,
  };
}

function normalizeQuery(rawQuery, sourcePath) {
  assertObject(rawQuery, sourcePath);

  assertString(rawQuery.id, `${sourcePath}.id`);
  assertString(rawQuery.category, `${sourcePath}.category`);
  assertString(rawQuery.title, `${sourcePath}.title`);
  assertString(rawQuery.question, `${sourcePath}.question`);
  assertString(rawQuery.description, `${sourcePath}.description`);
  assertString(rawQuery.dataset, `${sourcePath}.dataset`);
  assertString(rawQuery.executor, `${sourcePath}.executor`);

  const queryId = rawQuery.id;

  const filters = Array.isArray(rawQuery.filters)
    ? rawQuery.filters.map((filter, idx) => normalizeFilter(filter, queryId, idx))
    : [];
  const filterIds = new Set(filters.map((filter) => filter.id));
  if (filterIds.size !== filters.length) {
    fail(`queries/${queryId}.yaml has duplicated filter ids`);
  }

  const summaryCards = Array.isArray(rawQuery.summary_cards)
    ? rawQuery.summary_cards.map((card, idx) => normalizeSummaryCard(card, queryId, idx))
    : [];

  const visualizations = Array.isArray(rawQuery.visualizations)
    ? rawQuery.visualizations.map((vis, idx) => normalizeVisualization(vis, queryId, idx))
    : [];

  const table = rawQuery.table ? normalizeTable(rawQuery.table, queryId) : null;
  const insights = Array.isArray(rawQuery.insights)
    ? rawQuery.insights.map((insight, idx) => normalizeInsight(insight, queryId, idx))
    : [];

  return {
    id: queryId,
    category: rawQuery.category,
    title: rawQuery.title,
    question: rawQuery.question,
    description: rawQuery.description,
    dataset: rawQuery.dataset,
    executor: rawQuery.executor,
    defaults: rawQuery.defaults && typeof rawQuery.defaults === 'object' ? rawQuery.defaults : {},
    executor_config:
      rawQuery.executor_config && typeof rawQuery.executor_config === 'object' ? rawQuery.executor_config : {},
    filters,
    summary_cards: summaryCards,
    visualizations,
    table,
    insights,
  };
}

function main() {
  const catalog = readYaml(catalogPath);
  assertObject(catalog, 'catalog.yaml');
  assertString(catalog.version, 'catalog.yaml version');
  assertString(catalog.title, 'catalog.yaml title');
  assertArray(catalog.categories, 'catalog.yaml categories');
  assertArray(catalog.query_order, 'catalog.yaml query_order');

  const categories = catalog.categories.map((category, idx) => {
    assertObject(category, `catalog.yaml categories[${idx}]`);
    assertString(category.id, `catalog.yaml categories[${idx}].id`);
    assertString(category.label, `catalog.yaml categories[${idx}].label`);
    return {
      id: category.id,
      label: category.label,
    };
  });

  const queryFiles = fs
    .readdirSync(queriesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(ya?ml)$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  if (queryFiles.length === 0) {
    fail('no query yaml files found in config/guided-analysis/queries');
  }

  const queryMap = new Map();
  for (const fileName of queryFiles) {
    const filePath = path.join(queriesDir, fileName);
    const rawQuery = readYaml(filePath);
    const normalized = normalizeQuery(rawQuery, `queries/${fileName}`);
    if (queryMap.has(normalized.id)) {
      fail(`duplicated query id: ${normalized.id}`);
    }
    queryMap.set(normalized.id, normalized);
  }

  const orderedQueries = catalog.query_order.map((queryId, idx) => {
    assertString(queryId, `catalog.yaml query_order[${idx}]`);
    const query = queryMap.get(queryId);
    if (!query) {
      fail(`catalog query_order references missing query id: ${queryId}`);
    }
    return query;
  });

  const knownCategoryIds = new Set(categories.map((category) => category.id));
  for (const query of orderedQueries) {
    if (!knownCategoryIds.has(query.category)) {
      fail(`query ${query.id} references unknown category: ${query.category}`);
    }
  }

  if (orderedQueries.length !== queryMap.size) {
    const missing = [...queryMap.keys()].filter((queryId) => !catalog.query_order.includes(queryId));
    fail(`catalog query_order is missing queries: ${missing.join(', ')}`);
  }

  const output = {
    version: catalog.version,
    title: catalog.title,
    categories,
    queries: orderedQueries,
    generated_at: new Date().toISOString(),
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  console.log(
    `guided-config: compiled ${orderedQueries.length} queries to ${path.relative(projectRoot, outputPath)}`
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
